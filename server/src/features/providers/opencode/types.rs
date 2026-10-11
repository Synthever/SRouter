//! OpenCode Zen provider types, constants, and metadata.
//!
//! Provenance, independent of `packages/*`:
//! - `https://opencode.ai/docs/zen/` identifies OpenCode Zen, documents its API
//!   endpoints, and lists the model names and ids offered through Zen.
//! - `https://opencode.ai/zen/v1/models` is the provider's live public model
//!   catalog. The ten ids in `OPENCODE_ZEN_MODELS` were checked against this
//!   endpoint and the docs table on 2026-10-11; the seed is an intentional
//!   subset, not a snapshot of every model returned by the endpoint.
//!   Deliberately excluded from the seed: `jev-1.13-free` (served on
//!   `/v1/systemone`, not chat completions), the `muse-spark-*-contributor-free`
//!   pair (served on `/v1/responses`), and the paid tiers — none of them are
//!   routable through the OpenAI-protocol executor. `mimo-v2.5-free` was
//!   dropped: the docs table still lists it, but the live endpoint no longer
//!   returns it.
//! - `https://opencode.ai/zen` is the provider's product page and web URL.
//! - `docs/api-v1-contract.md` and the `apps/api` route/controller/tests are
//!   the allowed sources for SRouter-facing metadata and compatibility behavior;
//!   provider-specific catalog facts above come from OpenCode's own sources.

use crate::features::providers::model::{ModelDefinition, ProviderMetadata, ProviderProtocol};

pub const OPENCODE_ZEN_BASE_URL: &str = "https://opencode.ai/zen/v1";

/// Registry lookup keys: the base id plus the legacy `opencode` alias and the
/// user-facing `zen` alias.
pub const OPENCODE_ZEN_KEYS: &[&str] = &["opencode_zen", "opencode", "zen"];

pub const OPENCODE_ZEN_MODELS: &[ModelDefinition] = &[
    ModelDefinition {
        id: "space-bunny-free",
        name: "Space Bunny Free",
    },
    ModelDefinition {
        id: "nemotron-3.5-lightning-free",
        name: "Nemotron 3.5 Lightning Free",
    },
    ModelDefinition {
        id: "nemotron-3-ultra-free",
        name: "Nemotron 3 Ultra Free",
    },
    ModelDefinition {
        id: "mimo-v2.6-flash-free",
        name: "MiMo-V2.6-Flash Free",
    },
    ModelDefinition {
        id: "big-pickle",
        name: "Big Pickle",
    },
    ModelDefinition {
        id: "longcat-2.5-preview-free",
        name: "LongCat 2.5 Preview Free",
    },
    ModelDefinition {
        id: "exo-free",
        name: "Exo Free",
    },
    ModelDefinition {
        id: "step-5-preview-free",
        name: "Step 5 Preview Free",
    },
    ModelDefinition {
        id: "ling-3.0-flash-fin-free",
        name: "Ling 3.0 Flash Fin Free",
    },
    ModelDefinition {
        id: "ling-3.1-flash-free",
        name: "Ling 3.1 Flash Free",
    },
];

/// The `opencode` legacy alias resolves to this provider's registered base id.
pub const OPENCODE_ZEN_PROVIDER: ProviderMetadata = ProviderMetadata {
    id: "opencode_zen",
    name: "OpenCode Zen",
    category: "free_tier",
    protocol: ProviderProtocol::OpenAI,
    base_url: OPENCODE_ZEN_BASE_URL,
    web_url: "https://opencode.ai/zen",
    alias: "zen",
    requires_api_key: false,
    requires_oauth: false,
    supports_custom_url: true,
    status_message: "Free Tier Ready (Unlimited)",
};
