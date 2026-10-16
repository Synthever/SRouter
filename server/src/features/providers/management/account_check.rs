//! The account check behind the provider detail view: whether another stored
//! connection already holds the same account, and whether a connection's stored
//! token has already lapsed.
//!
//! Both verdicts come from storage, so the check is instant and never talks to a
//! provider. That also bounds what it can say: an upstream that revoked a token
//! early still reads as [`ACTIVE`] here.

use std::collections::{HashMap, hash_map::Entry};

use crate::infrastructure::database::providers::{ConnectionAccount, ProviderConnection};

/// The connection's stored token has not lapsed.
pub const ACTIVE: &str = "active";
/// The stored token has lapsed; the connection needs a fresh login.
pub const EXPIRED: &str = "expired";
/// The store states no expiry, so storage alone cannot tell. Spelled this way
/// because a bare `unknown` is a hole `tests/bindings.rs` refuses to ship.
pub const UNSTATED: &str = "unstated";

/// The account verdict of one connection.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AccountCheck {
    /// The connection that holds the same account, when another one does.
    pub duplicate_of: Option<String>,
    /// [`ACTIVE`], [`EXPIRED`], or [`UNSTATED`].
    pub health: &'static str,
}

/// Scores every connection of one provider, in the order the caller lists them.
///
/// A duplicate is a connection whose credential names an account another
/// connection of the same provider already named. The first row of an account is
/// the one kept, so the caller lists connections newest first and the surviving
/// row is the one carrying the freshest token.
pub fn check_accounts(
    connections: &[ProviderConnection],
    accounts: &[ConnectionAccount],
    now_ms: i64,
) -> Vec<AccountCheck> {
    let by_id: HashMap<&str, &ConnectionAccount> = accounts
        .iter()
        .map(|account| (account.id.as_str(), account))
        .collect();

    let mut keeper: HashMap<&str, &str> = HashMap::new();
    let mut checks = Vec::with_capacity(connections.len());

    for connection in connections {
        let account = by_id.get(connection.id.as_str()).copied();
        let identity = account.and_then(|account| account.identity.as_deref());
        let duplicate_of = identity.and_then(|identity| match keeper.entry(identity) {
            Entry::Occupied(entry) => Some(entry.get().to_string()),
            Entry::Vacant(entry) => {
                entry.insert(connection.id.as_str());
                None
            }
        });

        checks.push(AccountCheck {
            duplicate_of,
            health: account
                .and_then(|account| account.expires_at)
                .map_or(
                    UNSTATED,
                    |expiry| {
                        if expiry <= now_ms { EXPIRED } else { ACTIVE }
                    },
                ),
        });
    }

    checks
}

#[cfg(test)]
mod tests {
    use super::{ACTIVE, EXPIRED, UNSTATED, check_accounts};
    use crate::infrastructure::database::providers::{ConnectionAccount, ProviderConnection};

    const NOW: i64 = 1_700_000_000_000;

    fn connection(id: &str) -> ProviderConnection {
        ProviderConnection {
            id: id.to_owned(),
            provider_id: "qoder".to_owned(),
            name: format!("Qoder ({id})"),
            alias: None,
            category: "oauth".to_owned(),
            protocol: "openai".to_owned(),
            base_url: None,
            enabled: true,
            created_at: NOW,
        }
    }

    fn account(id: &str, identity: Option<&str>, expires_at: Option<i64>) -> ConnectionAccount {
        ConnectionAccount {
            id: id.to_owned(),
            identity: identity.map(str::to_owned),
            expires_at,
        }
    }

    #[test]
    fn two_rows_of_one_account_flag_the_older_one() {
        let connections = [connection("new"), connection("old")];
        let accounts = [
            account("new", Some("user-1"), Some(NOW + 1000)),
            account("old", Some("user-1"), Some(NOW + 1000)),
        ];

        let checks = check_accounts(&connections, &accounts, NOW);

        assert_eq!(checks[0].duplicate_of, None);
        assert_eq!(checks[1].duplicate_of.as_deref(), Some("new"));
        assert_eq!(checks[0].health, ACTIVE);
    }

    #[test]
    fn distinct_accounts_are_not_duplicates() {
        let connections = [connection("a"), connection("b")];
        let accounts = [
            account("a", Some("user-1"), None),
            account("b", Some("user-2"), None),
        ];

        let checks = check_accounts(&connections, &accounts, NOW);

        assert_eq!(checks[0].duplicate_of, None);
        assert_eq!(checks[1].duplicate_of, None);
    }

    #[test]
    fn a_store_that_names_no_account_reports_no_duplicate() {
        let connections = [connection("a"), connection("b")];
        let accounts = [account("a", None, None), account("b", None, None)];

        let checks = check_accounts(&connections, &accounts, NOW);

        assert_eq!(checks[0].duplicate_of, None);
        assert_eq!(checks[1].duplicate_of, None);
        assert_eq!(checks[0].health, UNSTATED);
    }

    #[test]
    fn a_lapsed_token_reads_as_expired_and_a_live_one_as_active() {
        let connections = [
            connection("expired"),
            connection("live"),
            connection("timeless"),
        ];
        let accounts = [
            account("expired", None, Some(NOW)),
            account("live", None, Some(NOW + 1)),
            account("timeless", None, None),
        ];

        let health: Vec<&str> = check_accounts(&connections, &accounts, NOW)
            .iter()
            .map(|check| check.health)
            .collect();

        assert_eq!(health, [EXPIRED, ACTIVE, UNSTATED]);
    }

    #[test]
    fn a_connection_without_credentials_has_no_verdict() {
        let connections = [connection("orphan")];

        let checks = check_accounts(&connections, &[], NOW);

        assert_eq!(checks.len(), 1);
        assert_eq!(checks[0].duplicate_of, None);
        assert_eq!(checks[0].health, UNSTATED);
    }
}
