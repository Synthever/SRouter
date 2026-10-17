//! Generic credential store: the API key or bearer token of a user-registered
//! provider. A custom provider has no dedicated module of its own, so its
//! `providers.credentials` blob is read here.

use serde_json::Value;

use crate::constants;
use crate::error::APIError;
use crate::infrastructure::database::AppDatabase;
use crate::infrastructure::database::row::{optional_text, text};

use super::credential_string;

/// The credential a custom provider signs its upstream request with. Never
/// enters a response or a log line.
#[derive(Clone, Debug, Default)]
pub struct CustomCredentials {
    pub api_key: Option<String>,
    pub access_token: Option<String>,
    /// Extra headers the operator supplied, sent as-is on every request.
    pub custom_headers: Vec<(String, String)>,
}

/// One stored connection candidate for a custom provider, used by the rotator
/// and 429 failover loop.
#[derive(Clone, Debug)]
pub struct CustomCredentialCandidate {
    pub id: String,
    pub credentials: CustomCredentials,
}

impl CustomCredentials {
    /// The token to sign with: the access token when present, else the API key,
    /// mirroring the Node executors' `accessToken || apiKey`.
    pub fn token(&self) -> Option<&str> {
        self.access_token
            .as_deref()
            .or(self.api_key.as_deref())
            .filter(|value| !value.trim().is_empty())
    }
}

/// Loads the credentials of one stored provider row by its internal id.
pub async fn load_custom_credentials(
    database: &AppDatabase,
    id: &str,
) -> Result<Option<CustomCredentials>, APIError> {
    let Some(pool) = database.sqlite_pool() else {
        return Ok(None);
    };

    let row = sqlx::query("SELECT credentials, meta FROM providers WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|error| {
            APIError::new(
                500,
                constants::database::with_context("read custom provider credentials", error),
            )
        })?;

    let Some(row) = row else {
        return Ok(None);
    };

    let raw = text(&row, "credentials")?;
    let meta = optional_text(&row, "meta")?;

    Ok(Some(parse_custom_credentials_with_meta(
        &raw,
        meta.as_deref(),
    )))
}

/// Loads every enabled connection candidate belonging to a custom provider
/// (`provider_id = ?`), newest first, so the executor can rotate across keys and
/// cool down rate-limited ones.
pub async fn load_custom_credential_candidates(
    database: &AppDatabase,
    provider_id: &str,
) -> Result<Vec<CustomCredentialCandidate>, APIError> {
    let Some(pool) = database.sqlite_pool() else {
        return Ok(Vec::new());
    };

    let rows = sqlx::query(
        "SELECT id, credentials, meta FROM providers \
         WHERE provider_id = ? AND enabled = 1 \
         ORDER BY created_at DESC",
    )
    .bind(provider_id)
    .fetch_all(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::with_context("read custom provider credentials", error),
        )
    })?;

    let mut candidates = Vec::with_capacity(rows.len());
    for row in &rows {
        let id = text(row, "id")?;
        let raw = text(row, "credentials")?;
        let meta = optional_text(row, "meta")?;
        let credentials = parse_custom_credentials_with_meta(&raw, meta.as_deref());
        if credentials.token().is_some() {
            candidates.push(CustomCredentialCandidate { id, credentials });
        }
    }

    Ok(candidates)
}

/// Reads one credential blob. The build writes snake_case; the camelCase
/// spellings are accepted too, so a row written by the Node build still reads.
pub fn parse_custom_credentials(raw: &str) -> CustomCredentials {
    let Ok(value) = serde_json::from_str::<Value>(raw) else {
        return CustomCredentials::default();
    };
    let Some(object) = value.as_object() else {
        return CustomCredentials::default();
    };

    CustomCredentials {
        api_key: credential_string(object, &["api_key", "apiKey"]),
        access_token: credential_string(object, &["access_token", "accessToken"]),
        custom_headers: custom_headers(object, &value),
    }
}

fn parse_custom_credentials_with_meta(raw: &str, meta_raw: Option<&str>) -> CustomCredentials {
    let mut credentials = parse_custom_credentials(raw);
    if credentials.custom_headers.is_empty()
        && let Some(meta_value) = meta_raw.and_then(|m| serde_json::from_str::<Value>(m).ok())
        && let Some(meta_headers) = meta_value.get("custom_headers").and_then(Value::as_object)
    {
        credentials.custom_headers = meta_headers
            .iter()
            .filter_map(|(name, val)| val.as_str().map(|v| (name.clone(), v.to_owned())))
            .collect();
    }
    credentials
}

/// Reads the custom headers from the credential blob's `meta.custom_headers`
/// object when it sits there, falling back to a top-level `custom_headers` map.
fn custom_headers(
    credentials: &serde_json::Map<String, Value>,
    whole: &Value,
) -> Vec<(String, String)> {
    let source = credentials.get("custom_headers").or_else(|| {
        whole
            .get("meta")
            .and_then(|meta| meta.get("custom_headers"))
    });

    source
        .and_then(Value::as_object)
        .map(|headers| {
            headers
                .iter()
                .filter_map(|(name, value)| {
                    value.as_str().map(|value| (name.clone(), value.to_owned()))
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::parse_custom_credentials;

    #[test]
    fn reads_snake_and_camel_case_credentials() {
        let snake = parse_custom_credentials(r#"{"api_key":"sk-a"}"#);
        assert_eq!(snake.token(), Some("sk-a"));

        let camel = parse_custom_credentials(r#"{"apiKey":"sk-b"}"#);
        assert_eq!(camel.token(), Some("sk-b"));
    }

    #[test]
    fn access_token_wins_over_api_key() {
        let credentials = parse_custom_credentials(r#"{"api_key":"sk-a","access_token":"tok-b"}"#);
        assert_eq!(credentials.token(), Some("tok-b"));
    }

    #[test]
    fn reads_custom_headers_from_the_meta_object() {
        let credentials = parse_custom_credentials(
            r#"{"api_key":"k","meta":{"custom_headers":{"X-Tenant":"acme"}}}"#,
        );
        assert_eq!(
            credentials.custom_headers,
            vec![("X-Tenant".to_owned(), "acme".to_owned())]
        );
    }
}
