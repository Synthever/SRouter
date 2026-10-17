//! Persistence behind the custom-provider routes: the `providers` rows a user
//! registers over HTTP, read and written as a whole.
//!
//! Node keeps one row per connection and rebuilds the whole registry after every
//! write (`loadSavedProvidersFromDB`). The Rust build does the same on boot and
//! after each write, so the read here returns every custom row and the caller
//! re-registers them.

use serde_json::{Map, Value};
use uuid::Uuid;

use crate::clock::now_ms;
use crate::constants;
use crate::error::APIError;
use crate::infrastructure::database::AppDatabase;
use crate::infrastructure::database::row::{integer, optional_text, text};

/// One user-registered provider row. `credentials` is carried whole so it can be
/// re-read without touching a secret column. `prefix` is the user-facing model
/// prefix, read from and written to the `alias` column the schema shares with
/// Node.
#[derive(Clone, Debug)]
pub struct CustomProviderRow {
    pub id: String,
    pub name: String,
    pub prefix: Option<String>,
    pub category: String,
    pub protocol: String,
    pub base_url: String,
    pub enabled: bool,
}

/// The fields `POST /v1/providers` accepts for a custom provider. The wire name
/// of the model prefix is `prefix`; `alias` is still accepted as a legacy key.
#[derive(Clone, Debug)]
pub struct NewCustomProvider {
    pub name: String,
    pub prefix: Option<String>,
    pub protocol: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub custom_headers: Vec<(String, String)>,
}

/// Lists every root custom provider: a row whose category is `custom_provider`,
/// whose `id` equals `provider_id` (child API-key rows point their `provider_id`
/// at the root row), and whose id is not a seed marker. Newest first, like Node's
/// catalog.
pub async fn list_custom_providers(
    database: &AppDatabase,
) -> Result<Vec<CustomProviderRow>, APIError> {
    let Some(pool) = database.sqlite_pool() else {
        return Ok(Vec::new());
    };

    let rows = sqlx::query(
        "SELECT id, name, alias, category, protocol, base_url, enabled, meta \
         FROM providers \
         WHERE category = 'custom_provider' AND (provider_id = '' OR id = provider_id) \
         ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::could_not_read_provider_connections(&error),
        )
    })?;

    let mut providers = Vec::with_capacity(rows.len());
    for row in &rows {
        // A seed row tagged in meta is a driver, not a user provider.
        if is_seed_row(optional_text(row, "meta")?.as_deref()) {
            continue;
        }

        providers.push(CustomProviderRow {
            id: text(row, "id")?,
            name: text(row, "name")?,
            // The column keeps the Node name; the field is the model prefix.
            prefix: optional_text(row, "alias")?,
            category: text(row, "category")?,
            protocol: text(row, "protocol")?,
            base_url: optional_text(row, "base_url")?.unwrap_or_default(),
            enabled: integer(row, "enabled")? != 0,
        });
    }

    Ok(providers)
}

/// Reads one custom provider by its internal id.
pub async fn find_custom_provider(
    database: &AppDatabase,
    id: &str,
) -> Result<Option<CustomProviderRow>, APIError> {
    Ok(list_custom_providers(database)
        .await?
        .into_iter()
        .find(|provider| provider.id == id))
}

/// Reads one custom provider connection row (root or child) by its connection id,
/// so `POST /v1/providers/connections/verify` can probe any key in the pool.
pub async fn find_custom_connection_row(
    database: &AppDatabase,
    connection_id: &str,
) -> Result<Option<CustomProviderRow>, APIError> {
    let Some(pool) = database.sqlite_pool() else {
        return Ok(None);
    };

    let row = sqlx::query(
        "SELECT id, name, alias, category, protocol, base_url, enabled, meta \
         FROM providers \
         WHERE id = ? AND category = 'custom_provider'",
    )
    .bind(connection_id)
    .fetch_optional(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::could_not_read_provider_connections(&error),
        )
    })?;

    let Some(row) = row else {
        return Ok(None);
    };
    if is_seed_row(optional_text(&row, "meta")?.as_deref()) {
        return Ok(None);
    }

    Ok(Some(CustomProviderRow {
        id: text(&row, "id")?,
        name: text(&row, "name")?,
        prefix: optional_text(&row, "alias")?,
        category: text(&row, "category")?,
        protocol: text(&row, "protocol")?,
        base_url: optional_text(&row, "base_url")?.unwrap_or_default(),
        enabled: integer(&row, "enabled")? != 0,
    }))
}

/// Inserts one custom provider. The caller supplies the id (a UUID generated
/// when the request carried none), matching Node's immutable internal id.
pub async fn create_custom_provider(
    database: &AppDatabase,
    id: &str,
    provider: &NewCustomProvider,
) -> Result<(), APIError> {
    let pool = database.sqlite_required(constants::database::PROVIDERS_UNSUPPORTED)?;

    let credentials = credentials_json(provider);
    let meta = meta_json(provider);

    sqlx::query(
        "INSERT INTO providers \
         (id, provider_id, name, alias, category, protocol, base_url, enabled, credentials, meta, created_at) \
         VALUES (?, ?, ?, ?, 'custom_provider', ?, ?, 1, ?, ?, ?) \
         ON CONFLICT(id) DO UPDATE SET \
           name = excluded.name, alias = excluded.alias, protocol = excluded.protocol, \
           base_url = excluded.base_url, credentials = excluded.credentials, meta = excluded.meta",
    )
    .bind(id)
    .bind(id)
    .bind(&provider.name)
    .bind(provider.prefix.as_deref())
    .bind(&provider.protocol)
    .bind(&provider.base_url)
    .bind(credentials.to_string())
    .bind(meta.to_string())
    .bind(now_ms())
    .execute(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::with_context("store the custom provider", error),
        )
    })?;

    // Propagate shared fields (alias, protocol, base_url, meta) to any child key
    // rows belonging to this provider so all connections stay consistent.
    sqlx::query(
        "UPDATE providers SET alias = ?, protocol = ?, base_url = ?, meta = ? \
         WHERE provider_id = ? AND id != ?",
    )
    .bind(provider.prefix.as_deref())
    .bind(&provider.protocol)
    .bind(&provider.base_url)
    .bind(meta.to_string())
    .bind(id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::with_context("update custom provider connections", error),
        )
    })?;

    Ok(())
}

/// Appends one or more API key connections to an existing custom provider inside
/// a single transaction. If the root row (`id == provider_id`) currently holds
/// no API key (e.g. its key was cleared), the first key populates the root row
/// and any remaining keys are inserted as child connection rows.
pub async fn add_custom_provider_connections(
    database: &AppDatabase,
    row: &CustomProviderRow,
    label_prefix: Option<&str>,
    prefix_override: Option<&str>,
    api_keys: &[String],
) -> Result<usize, APIError> {
    let pool = database.sqlite_required(constants::database::PROVIDERS_UNSUPPORTED)?;
    let mut transaction = pool.begin().await.map_err(|error| {
        APIError::new(
            500,
            constants::database::could_not_start_provider_update(&error),
        )
    })?;

    let effective_prefix = prefix_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| row.prefix.clone());

    if effective_prefix != row.prefix {
        sqlx::query("UPDATE providers SET alias = ? WHERE provider_id = ?")
            .bind(effective_prefix.as_deref())
            .bind(&row.id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| {
                APIError::new(
                    500,
                    constants::database::with_context("update custom provider prefix", error),
                )
            })?;
    }

    let root_row = sqlx::query(
        "SELECT credentials, meta FROM providers WHERE id = ? AND category = 'custom_provider'",
    )
    .bind(&row.id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::with_context("read custom provider root row", error),
        )
    })?;

    let (root_has_key, meta_raw) = match root_row {
        Some(ref r) => {
            let creds_str = text(r, "credentials").unwrap_or_default();
            let parsed =
                crate::infrastructure::database::providers::credentials::load_custom_credentials;
            let _ = parsed;
            let has_key = serde_json::from_str::<Value>(&creds_str)
                .ok()
                .and_then(|v| {
                    v.get("api_key")
                        .or_else(|| v.get("apiKey"))
                        .and_then(Value::as_str)
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .map(|_| true)
                })
                .unwrap_or(false);
            let meta = optional_text(r, "meta")?.unwrap_or_else(|| "{}".to_owned());
            (has_key, meta)
        }
        None => (false, "{}".to_owned()),
    };

    let existing_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM providers WHERE provider_id = ? AND category = 'custom_provider'",
    )
    .bind(&row.id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::could_not_read_provider_connections(&error),
        )
    })?;

    let base_label = label_prefix
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(&row.name);
    let batch_len = api_keys.len();
    let base_ts = now_ms();
    let mut keys_iter = api_keys.iter().enumerate();
    let mut added = 0usize;

    if !root_has_key && let Some((_idx, first_key)) = keys_iter.next() {
        let mut credentials = Map::new();
        credentials.insert("api_key".to_owned(), Value::String(first_key.clone()));
        let root_meta = with_key_hint(&meta_raw, first_key);

        sqlx::query(
            "UPDATE providers SET alias = ?, credentials = ?, meta = ?, enabled = 1 WHERE id = ?",
        )
        .bind(effective_prefix.as_deref())
        .bind(Value::Object(credentials).to_string())
        .bind(&root_meta)
        .bind(&row.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| {
            APIError::new(
                500,
                constants::database::with_context("update custom provider root key", error),
            )
        })?;
        added += 1;
    }

    let start_number = usize::try_from(existing_count.max(0)).unwrap_or(0);
    for (idx, api_key) in keys_iter {
        let connection_id = Uuid::new_v4().to_string();
        let mut credentials = Map::new();
        credentials.insert("api_key".to_owned(), Value::String(api_key.clone()));
        let sequence = if root_has_key {
            start_number + idx + 1
        } else {
            start_number + idx
        };
        let conn_name = connection_label(base_label, sequence, batch_len, api_key);
        let child_meta = with_key_hint(&meta_raw, api_key);

        sqlx::query(
            "INSERT INTO providers \
             (id, provider_id, name, alias, category, protocol, base_url, enabled, credentials, meta, created_at) \
             VALUES (?, ?, ?, ?, 'custom_provider', ?, ?, 1, ?, ?, ?)",
        )
        .bind(&connection_id)
        .bind(&row.id)
        .bind(&conn_name)
        .bind(effective_prefix.as_deref())
        .bind(&row.protocol)
        .bind(&row.base_url)
        .bind(Value::Object(credentials).to_string())
        .bind(&child_meta)
        .bind(base_ts + i64::try_from(idx).unwrap_or(0) + 1)
        .execute(&mut *transaction)
        .await
        .map_err(|error| {
            APIError::new(
                500,
                constants::database::with_context("insert custom provider connection", error),
            )
        })?;
        added += 1;
    }

    transaction.commit().await.map_err(|error| {
        APIError::new(
            500,
            constants::database::could_not_commit_provider_update(&error),
        )
    })?;

    Ok(added)
}

/// Formats a connection label with a non-sensitive masked key hint when adding
/// multiple keys or appending to a pool. Never includes the full secret.
fn connection_label(base_label: &str, sequence: usize, batch_len: usize, api_key: &str) -> String {
    let numbered = if batch_len > 1 || sequence > 1 {
        format!("{base_label} #{sequence}")
    } else {
        base_label.to_owned()
    };
    match mask_api_key(api_key) {
        Some(masked) => format!("{numbered} ({masked})"),
        None => numbered,
    }
}

fn with_key_hint(meta_raw: &str, api_key: &str) -> String {
    let mut map = serde_json::from_str::<Value>(meta_raw)
        .ok()
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();
    if let Some(hint) = mask_api_key(api_key) {
        map.insert("api_key_Hint".to_owned(), Value::String(hint));
    } else {
        map.remove("api_key_Hint");
    }
    Value::Object(map).to_string()
}

fn mask_api_key(api_key: &str) -> Option<String> {
    let trimmed = api_key.trim();
    let chars: Vec<char> = trimmed.chars().collect();
    if chars.len() < 10 {
        return None;
    }
    let prefix: String = chars[..3].iter().collect();
    let suffix: String = chars[chars.len() - 4..].iter().collect();
    Some(format!("{prefix}...{suffix}"))
}

/// Deletes one custom provider and all of its child API-key connection rows plus
/// its model overrides. Returns whether the custom provider existed, so the
/// route can answer `404`.
pub async fn delete_custom_provider(database: &AppDatabase, id: &str) -> Result<bool, APIError> {
    let pool = database.sqlite_required(constants::database::PROVIDERS_UNSUPPORTED)?;

    let affected = sqlx::query(
        "DELETE FROM providers \
         WHERE (id = ? OR provider_id = ?) AND category = 'custom_provider'",
    )
    .bind(id)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| {
        APIError::new(
            500,
            constants::database::with_context("delete the custom provider", error),
        )
    })?
    .rows_affected();

    if affected > 0 {
        let _ = sqlx::query("DELETE FROM provider_model_overrides WHERE provider_id = ?")
            .bind(id)
            .execute(&pool)
            .await;
    }

    Ok(affected > 0)
}

/// The credential blob: the API key (Node's only accepted secret) plus any
/// custom headers, under the same keys the Node build writes.
fn credentials_json(provider: &NewCustomProvider) -> Value {
    let mut credentials = Map::new();
    if let Some(api_key) = provider
        .api_key
        .as_deref()
        .filter(|key| !key.trim().is_empty())
    {
        credentials.insert("api_key".to_owned(), Value::String(api_key.to_owned()));
    }

    Value::Object(credentials)
}

/// The meta blob: `custom_headers` and `api_key_Hint`, when present.
fn meta_json(provider: &NewCustomProvider) -> Value {
    let mut meta = Map::new();
    if !provider.custom_headers.is_empty() {
        let headers: Map<String, Value> = provider
            .custom_headers
            .iter()
            .map(|(name, value)| (name.clone(), Value::String(value.clone())))
            .collect();
        meta.insert("custom_headers".to_owned(), Value::Object(headers));
    }
    if let Some(hint) = provider.api_key.as_deref().and_then(mask_api_key) {
        meta.insert("api_key_Hint".to_owned(), Value::String(hint));
    }

    Value::Object(meta)
}

/// Node tags seed rows with `meta.provider_specific_data.__seed__ = "true"`.
fn is_seed_row(meta: Option<&str>) -> bool {
    let Some(parsed) = meta.and_then(|raw| serde_json::from_str::<Value>(raw).ok()) else {
        return false;
    };

    parsed
        .get("provider_specific_data")
        .and_then(|data| data.get("__seed__"))
        .and_then(Value::as_str)
        == Some("true")
}

#[cfg(test)]
mod tests {
    use super::{NewCustomProvider, credentials_json, mask_api_key, meta_json};

    fn provider() -> NewCustomProvider {
        NewCustomProvider {
            name: "My Gateway".to_owned(),
            prefix: Some("mine".to_owned()),
            protocol: "openai".to_owned(),
            base_url: "https://example.com/v1".to_owned(),
            api_key: Some("sk-test".to_owned()),
            custom_headers: vec![],
        }
    }

    #[test]
    fn writes_the_api_key_under_the_node_key_name() {
        let credentials = credentials_json(&provider());

        assert_eq!(credentials["api_key"], "sk-test");
    }

    #[test]
    fn omits_an_empty_api_key() {
        let mut provider = provider();
        provider.api_key = Some("   ".to_owned());

        assert!(credentials_json(&provider).as_object().unwrap().is_empty());
    }

    #[test]
    fn writes_custom_headers_under_meta() {
        let mut provider = provider();
        provider.custom_headers = vec![("X-Tenant".to_owned(), "acme".to_owned())];

        assert_eq!(meta_json(&provider)["custom_headers"]["X-Tenant"], "acme");
    }

    #[test]
    fn masks_long_api_keys_without_leaking_middle_chars() {
        assert_eq!(
            mask_api_key("sk-proj-1234567890abcd").as_deref(),
            Some("sk-...abcd")
        );
        assert!(mask_api_key("short").is_none());
    }
}
