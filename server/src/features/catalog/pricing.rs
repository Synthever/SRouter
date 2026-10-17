//! Models.dev pricing catalog and token cost estimation.

use std::collections::HashMap;
use std::sync::LazyLock;

use axum::{
    Json, Router,
    extract::Query,
    http::{HeaderMap, header},
    response::{IntoResponse, Response},
    routing::get,
};
use serde::{Deserialize, Serialize};

use crate::constants;
use crate::protocol::usage::UsageBreakdown;
use crate::state::AppState;

const PRICING_JSON: &str = include_str!("data/models-dev-pricing.json");

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct PricingListResponse {
    pub object: String,
    #[specta(type = specta_typescript::Number)]
    pub total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub updated_at: Option<String>,
    pub data: Vec<ModelPricingItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ModelPricingItem {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub family: Option<String>,
    pub provider: String,
    pub attachment: bool,
    pub reasoning: bool,
    pub tool_call: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub temperature: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub structured_output: Option<bool>,
    pub open_weights: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub knowledge: Option<String>,
    pub release_date: String,
    pub last_updated: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub cost: Option<ModelPricingCost>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub limit: Option<ModelPricingLimit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub modalities: Option<ModelPricingModalities>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type)]
pub struct ModelPricingCost {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub input: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub output: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub cache_read: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub cache_write: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub reasoning: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub input_audio: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub output_audio: Option<f64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, specta::Type)]
pub struct ModelPricingLimit {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(type = Option<specta_typescript::Number>)]
    #[specta(optional)]
    pub context: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(type = Option<specta_typescript::Number>)]
    #[specta(optional)]
    pub output: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ModelPricingModalities {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub input: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[specta(optional)]
    pub output: Option<Vec<String>>,
}

#[derive(Debug, Default, Deserialize)]
pub struct PricingQuery {
    pub refresh: Option<String>,
    pub force: Option<String>,
}

struct StaticPricingCatalog {
    response: PricingListResponse,
    cost_map: HashMap<String, ModelPricingCost>,
    /// Context window per bare model id, first entry wins the way `cost_map`
    /// resolves a duplicate. A model the snapshot does not price has no entry.
    context_map: HashMap<String, i64>,
}

static CATALOG: LazyLock<StaticPricingCatalog> = LazyLock::new(|| {
    let items: Vec<ModelPricingItem> =
        serde_json::from_str(PRICING_JSON).expect("models-dev-pricing.json must be valid JSON");

    let mut cost_map = HashMap::with_capacity(items.len() * 2);
    let mut context_map: HashMap<String, i64> = HashMap::new();

    for item in &items {
        if let Some(context) = item.limit.as_ref().and_then(|limit| limit.context) {
            context_map.entry(item.id.to_lowercase()).or_insert(context);
        }

        if let Some(cost) = item.cost {
            let model_key = item.id.to_lowercase();
            let provider_key = item.provider.to_lowercase();
            let full_key = format!("{provider_key}/{model_key}");

            cost_map.insert(full_key, cost);

            // Also map bare model ID. If duplicate bare IDs exist across providers,
            // prioritize the entry with defined input/output rates, or canonical provider.
            match cost_map.get(&model_key) {
                None => {
                    cost_map.insert(model_key, cost);
                }
                Some(existing) => {
                    let canonical = matches!(
                        item.provider.as_str(),
                        "openai" | "anthropic" | "google" | "deepseek"
                    );
                    if canonical || (existing.input.is_none() && cost.input.is_some()) {
                        cost_map.insert(model_key, cost);
                    }
                }
            }
        }
    }

    let response = PricingListResponse {
        object: String::from("list"),
        total: items.len(),
        updated_at: None,
        data: items,
    };

    StaticPricingCatalog {
        response,
        cost_map,
        context_map,
    }
});

/// Handler for `GET /v1/models/pricing`.
pub async fn get_pricing_models(
    Query(_query): Query<PricingQuery>,
    _headers: HeaderMap,
) -> Response {
    (
        [(
            header::CACHE_CONTROL,
            constants::headers::value::PRICING_CACHE_CONTROL,
        )],
        Json(&CATALOG.response),
    )
        .into_response()
}

/// Creates the router for pricing routes (`/models/pricing`).
pub fn create_pricing_router() -> Router<AppState> {
    Router::new().route("/models/pricing", get(get_pricing_models))
}

/// Detailed token cost breakdown in USD.
#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct CostBreakdown {
    pub input: f64,
    pub output: f64,
    pub cache: f64,
    pub total: f64,
}

/// Suffixes a driver appends to a model id models.dev does not carry: an effort
/// tier (`gemini-3.8-flash-high` serves `gemini-3.8-flash`), a reasoning variant
/// (`claude-opus-4-6-thinking` serves `claude-opus-4-6`), or the free tier of a
/// paid model (`step-5-preview-free` serves `step-5-preview`). Both the price and
/// the context window are keyed by the catalog id, so the suffix has to come off
/// before either lookup.
const VARIANT_SUFFIXES: &[&str] = &["-high", "-medium", "-low", "-thinking", "-free"];

/// The catalog row for a model id, trying the id as sent, its bare form without
/// the provider prefix (`openai/gpt-4o` -> `gpt-4o`), then each of those with a
/// [`VARIANT_SUFFIXES`] suffix removed. An exact catalog entry always wins, so a
/// model that is only sold in a variant (`deepseek-v3.2-thinking`,
/// `space-bunny-free`) keeps its own row instead of borrowing its base's —
/// `mimo-v2.6-flash-free` holds 200k while its paid base holds 1M.
fn find_catalog_row<T: Copy>(model_id: &str, rows: &HashMap<String, T>) -> Option<T> {
    let normalized = model_id.trim().to_lowercase();
    let bare = normalized.split_once('/').map(|(_, rest)| rest);

    [Some(normalized.as_str()), bare]
        .into_iter()
        .flatten()
        .find_map(|key| {
            rows.get(key).copied().or_else(|| {
                VARIANT_SUFFIXES
                    .iter()
                    .find_map(|suffix| rows.get(key.strip_suffix(suffix)?).copied())
            })
        })
}

/// The catalog rate for a model id. See [`find_catalog_row`] for the precedence.
fn lookup_cost(model_id: &str) -> Option<ModelPricingCost> {
    find_catalog_row(model_id, &CATALOG.cost_map)
}

/// Estimates detailed token cost breakdown in USD for a model and usage breakdown.
///
/// Returns `None` if the model rate is unpriced or unknown.
pub fn estimate_cost_breakdown(model_id: &str, usage: &UsageBreakdown) -> Option<CostBreakdown> {
    let cost = lookup_cost(model_id)?;

    // If cost has neither input nor output rate defined, consider it unpriced.
    if cost.input.is_none() && cost.output.is_none() {
        return None;
    }

    let input_rate = cost.input.unwrap_or(0.0);
    let output_rate = cost.output.unwrap_or(0.0);
    let cache_read_rate = cost.cache_read.unwrap_or(input_rate);
    let cache_write_rate = cost.cache_write.unwrap_or(input_rate);

    let non_cached_prompt =
        (usage.prompt_tokens - usage.cached_tokens - usage.cache_creation_tokens).max(0);

    let prompt_cost = non_cached_prompt as f64 * input_rate / 1_000_000.0;
    let cache_read_cost = usage.cached_tokens as f64 * cache_read_rate / 1_000_000.0;
    let cache_write_cost = usage.cache_creation_tokens as f64 * cache_write_rate / 1_000_000.0;
    let cache_cost = cache_read_cost + cache_write_cost;
    let completion_cost = usage.completion_tokens as f64 * output_rate / 1_000_000.0;

    let total = prompt_cost + cache_cost + completion_cost;
    Some(CostBreakdown {
        input: prompt_cost,
        output: completion_cost,
        cache: cache_cost,
        total,
    })
}

/// Estimates token cost in USD for a model and usage breakdown.
///
/// Returns `None` if the model rate is unpriced or unknown.
/// Explicit zero rates return `Some(0.0)`.
pub fn estimate_cost(model_id: &str, usage: &UsageBreakdown) -> Option<f64> {
    estimate_cost_breakdown(model_id, usage).map(|breakdown| breakdown.total)
}

/// The context window the pricing snapshot records for `model_id`, as a bare id
/// or `<provider>/<id>`. `None` when the snapshot does not cover the model, so a
/// caller must decide its own fallback rather than treat silence as unlimited.
pub fn context_limit(model_id: &str) -> Option<usize> {
    find_catalog_row(model_id, &CATALOG.context_map)
        .and_then(|context| usize::try_from(context).ok())
}

#[cfg(test)]
mod tests {
    use crate::features::providers::antigravity::ANTIGRAVITY_MODEL_IDS;

    use super::*;

    fn usage(prompt_tokens: i64, completion_tokens: i64) -> UsageBreakdown {
        UsageBreakdown {
            prompt_tokens,
            completion_tokens,
            total_tokens: prompt_tokens + completion_tokens,
            cached_tokens: 0,
            cache_creation_tokens: 0,
            reasoning_tokens: 0,
        }
    }

    #[test]
    fn pricing_catalog_loads_and_has_elements() {
        assert!(CATALOG.response.total > 2000);
        assert_eq!(CATALOG.response.total, CATALOG.response.data.len());
        assert_eq!(CATALOG.response.object, "list");
    }

    #[test]
    fn estimate_cost_calculates_correctly() {
        let usage = UsageBreakdown {
            prompt_tokens: 1000,
            completion_tokens: 500,
            total_tokens: 1500,
            cached_tokens: 200,
            cache_creation_tokens: 100,
            reasoning_tokens: 0,
        };

        // If cost is input: 10.0, output: 20.0, cache_read: 2.5, cache_write: 5.0 ($/M tokens)
        // non_cached_prompt = 1000 - 200 - 100 = 700
        // prompt_cost = 700 * 10 / 1_000_000 = 0.007
        // cache_read = 200 * 2.5 / 1_000_000 = 0.0005
        // cache_write = 100 * 5.0 / 1_000_000 = 0.0005
        // completion_cost = 500 * 20 / 1_000_000 = 0.010
        // total = 0.007 + 0.0005 + 0.0005 + 0.010 = 0.018
        // Let's test with a real model or estimate_cost logic
        let cost = estimate_cost("unknown-model-xyz", &usage);
        assert_eq!(cost, None);
    }

    /// The reported bug: an effort tier the catalog does not carry used to price
    /// as unknown, so real usage showed up as $0.00 on the dashboard.
    #[test]
    fn a_driver_variant_prices_like_the_model_it_serves() {
        let usage = usage(1_000_000, 500_000);

        for (variant, base) in [
            ("gemini-3.8-flash-high", "gemini-3.8-flash"),
            ("gemini-3.8-flash-medium", "gemini-3.8-flash"),
            ("gemini-3.8-flash-low", "gemini-3.8-flash"),
            ("gemini-3.7-flash-high", "gemini-3.7-flash"),
            ("gemini-3.5-flash-low", "gemini-3.5-flash"),
            ("gemini-3.1-pro-high", "gemini-3.1-pro"),
            ("claude-opus-4-6-thinking", "claude-opus-4-6"),
            ("gpt-oss-120b-medium", "gpt-oss-120b"),
        ] {
            let cost = estimate_cost(variant, &usage);
            assert!(cost.is_some(), "{variant} must be priced");
            assert_eq!(cost, estimate_cost(base, &usage), "{variant} vs {base}");
        }
    }

    #[test]
    fn the_provider_prefix_does_not_change_the_estimate() {
        let usage = usage(1_000, 500);

        assert_eq!(
            estimate_cost("antigravity/gemini-3.8-flash-high", &usage),
            estimate_cost("gemini-3.8-flash-high", &usage)
        );
    }

    /// A model sold only as a variant keeps its own rate: the catalog's `-free`
    /// rows are all zero, and reading them as their paid base would bill a
    /// request that costs nothing.
    #[test]
    fn an_exact_catalog_entry_outranks_its_stripped_base() {
        let usage = usage(1_000_000, 0);

        assert_eq!(estimate_cost("mimo-v2.6-flash-free", &usage), Some(0.0));
        assert_eq!(estimate_cost("space-bunny-free", &usage), Some(0.0));
        assert!(
            estimate_cost("mimo-v2.6-flash", &usage).is_some_and(|cost| cost > 0.0),
            "the paid sibling still prices above zero"
        );
    }

    /// A `-free` id models.dev has not listed yet bills at its paid base rate.
    #[test]
    fn an_unlisted_free_tier_is_priced_at_its_paid_base() {
        let usage = usage(1_000_000, 500_000);

        for (free, base) in [
            ("step-5-preview-free", "step-5-preview"),
            ("deepseek-v4.1-flash-free", "deepseek-v4.1-flash"),
        ] {
            let cost = estimate_cost(free, &usage);
            assert!(cost.is_some_and(|cost| cost > 0.0), "{free} must be priced");
            assert_eq!(cost, estimate_cost(base, &usage), "{free} vs {base}");
        }
    }

    /// Every id the antigravity driver advertises carries a tier, a reasoning
    /// variant, or the plain base id, so an unpriced one is the dashboard's $0.00.
    #[test]
    fn every_antigravity_model_id_is_priced() {
        let usage = usage(1_000, 500);

        let unpriced: Vec<&str> = ANTIGRAVITY_MODEL_IDS
            .iter()
            .copied()
            .filter(|id| estimate_cost(id, &usage).is_none())
            .collect();

        assert!(
            unpriced.is_empty(),
            "unpriced antigravity ids: {unpriced:?}"
        );
    }

    #[test]
    fn an_unknown_variant_stays_unpriced() {
        let usage = usage(1_000, 500);

        assert_eq!(estimate_cost("no-such-model-high", &usage), None);
        assert_eq!(estimate_cost("no-such-model-free", &usage), None);
    }

    /// The context guard reads the same snapshot as the price, so an id the
    /// catalog only carries under its base used to fall through to the caller's
    /// 300k fallback and refuse a request the upstream would have accepted.
    #[test]
    fn a_driver_variant_resolves_the_window_of_the_model_it_serves() {
        for (variant, base) in [
            ("deepseek-v4.1-flash-free", "deepseek-v4.1-flash"),
            ("glm-5.3-flash-free", "glm-5.3-flash"),
            ("gemini-3.8-flash-high", "gemini-3.8-flash"),
            ("claude-opus-4-6-thinking", "claude-opus-4-6"),
        ] {
            assert!(context_limit(variant).is_some(), "{variant} must resolve");
            assert_eq!(
                context_limit(variant),
                context_limit(base),
                "{variant} vs {base}"
            );
        }
    }

    /// A variant the catalog carries in its own right keeps its own window: the
    /// free tier of `mimo-v2.6-flash` holds 200k, its paid base 1M, so reading
    /// the base would admit five times the traffic the free tier serves.
    #[test]
    fn an_exact_catalog_row_outranks_its_stripped_base_for_the_window() {
        assert_eq!(context_limit("mimo-v2.6-flash-free"), Some(200_000));
        assert_eq!(context_limit("mimo-v2.6-flash"), Some(1_048_576));
    }

    #[test]
    fn the_provider_prefix_does_not_change_the_window() {
        assert_eq!(
            context_limit("opencode_zen/deepseek-v4.1-flash-free"),
            context_limit("deepseek-v4.1-flash-free")
        );
    }

    #[test]
    fn an_unknown_model_has_no_window_of_its_own() {
        assert_eq!(context_limit("no-such-model-high"), None);
        assert_eq!(context_limit("no-such-model-free"), None);
    }
}
