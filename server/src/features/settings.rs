//! `/v1/settings` read and mutation routes, plus the `/v1/admin/system` facts.

use std::collections::BTreeMap;

use axum::body::Bytes;
use axum::extract::State;
use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::Serialize;
use serde_json::Value;

use crate::constants;
use crate::error::APIError;
use crate::infrastructure::database::AppDatabase;
use crate::infrastructure::database::settings::{
    get_require_api_key, set_require_api_key, set_setting,
};
use crate::state::AppState;

/// Read router for `/v1/settings`. Protected by API-key auth.
pub fn create_settings_read_router() -> Router<AppState> {
    Router::new().route("/settings", get(get_settings))
}

/// Mutation router for `/v1/settings`. Protected by admin session and CSRF guard.
pub fn create_settings_management_router() -> Router<AppState> {
    Router::new().route("/settings", patch(update_settings).post(update_settings))
}

/// Read router for `/v1/admin/system`, the facts the settings screen prints.
/// Mounted under the admin-session guard: the API-key guard would hand the
/// database path to any key holder.
pub fn create_system_router() -> Router<AppState> {
    Router::new().route("/admin/system", get(get_system))
}

#[derive(Serialize, specta::Type)]
pub struct SettingsResponse {
    pub require_api_key: bool,
}

/// `GET /v1/admin/system`. The version is the crate's, so a rebuild is what
/// changes it.
#[derive(Serialize, specta::Type)]
pub struct SystemResponse {
    pub version: &'static str,
    pub database_path: String,
    #[specta(type = specta_typescript::Number)]
    pub schema_version: i64,
}

/// Fields accepted by `PATCH`/`POST /v1/settings`, as the client builds them.
/// Derives only `specta::Type` (like `AdminLoginInput`): the hand-written parser
/// stays the authority, and the derive exists so the client's body cannot drift
/// from the shape this same struct is parsed into.
#[derive(Debug, Default, specta::Type)]
pub struct UpdateSettingsInput {
    #[specta(optional)]
    pub require_api_key: Option<bool>,
    /// String-valued settings rows, mirroring Node's `UpdateSettingsSchema`
    /// (`z.record(z.string())`). A `BTreeMap` keeps the write order stable.
    #[specta(optional)]
    pub settings: Option<BTreeMap<String, String>>,
}

async fn get_settings(State(state): State<AppState>) -> Result<Json<SettingsResponse>, APIError> {
    let require_api_key = if let Some(database) = state.database.as_ref() {
        get_require_api_key(database).await?
    } else {
        state
            .security
            .api_keys
            .require_api_key()
            .await
            .unwrap_or(false)
    };

    Ok(Json(SettingsResponse { require_api_key }))
}

async fn get_system(State(state): State<AppState>) -> Result<Json<SystemResponse>, APIError> {
    let database = state
        .database
        .as_ref()
        .ok_or_else(|| APIError::new(500, constants::settings::SYSTEM_DATABASE_REQUIRED))?;
    let Some(pool) = database.sqlite_pool() else {
        return Err(APIError::new(
            500,
            constants::settings::SYSTEM_DATABASE_REQUIRED,
        ));
    };

    // Read from the file itself, not from `SCHEMA_VERSION`: an operator looking
    // at this screen is asking what the gateway opened, not what it expects.
    let schema_version: i64 = sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(&pool)
        .await
        .map_err(|error| {
            APIError::new(
                500,
                constants::database::with_context(
                    constants::database::context::READ_SCHEMA_VERSION.to_owned(),
                    error,
                ),
            )
        })?;

    Ok(Json(SystemResponse {
        version: env!("CARGO_PKG_VERSION"),
        database_path: state.config.database_path.display().to_string(),
        schema_version,
    }))
}

async fn update_settings(
    State(state): State<AppState>,
    body: Bytes,
) -> Result<Json<SettingsResponse>, APIError> {
    let input = parse_update_settings_payload(&body)?;
    let database = require_database(&state)?;

    if let Some(required) = input.require_api_key {
        set_require_api_key(database, required).await?;
        state.security.api_keys.invalidate_cache();
    }
    if let Some(settings) = &input.settings {
        for (key, value) in settings {
            set_setting(database, key, value).await?;
        }
    }

    let require_api_key = get_require_api_key(database).await?;

    Ok(Json(SettingsResponse { require_api_key }))
}

fn require_database(state: &AppState) -> Result<&AppDatabase, APIError> {
    state
        .database
        .as_ref()
        .ok_or_else(|| APIError::new(500, constants::settings::DATABASE_REQUIRED))
}

fn parse_update_settings_payload(body: &[u8]) -> Result<UpdateSettingsInput, APIError> {
    if body.is_empty() {
        return Err(APIError::new(400, constants::settings::INVALID_PAYLOAD));
    }

    let value: Value = serde_json::from_slice(body)
        .map_err(|_| APIError::new(400, constants::settings::INVALID_PAYLOAD))?;

    let object = value
        .as_object()
        .ok_or_else(|| APIError::new(400, constants::settings::INVALID_PAYLOAD))?;

    let mut input = UpdateSettingsInput::default();
    let invalid = || APIError::new(400, constants::settings::INVALID_PAYLOAD);

    if let Some(val) = object.get("require_api_key") {
        let b = val.as_bool().ok_or_else(invalid)?;
        input.require_api_key = Some(b);
    }
    if let Some(val) = object.get("settings") {
        // Node validates `settings` as `z.record(z.string())`: an object whose
        // values are all strings. Anything else is a 400, and every string
        // entry is written as its own row.
        let map = val.as_object().ok_or_else(invalid)?;
        let mut settings = BTreeMap::new();
        for (key, item) in map {
            let value = item.as_str().ok_or_else(invalid)?;
            settings.insert(key.clone(), value.to_owned());
        }
        input.settings = Some(settings);
    }

    Ok(input)
}
