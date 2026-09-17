import type { ProviderMetadata } from "./types.js";

export const ATRIA_BASE_URL = "https://api.atria-asi.ai/v1";

export const ATRIA_PROVIDER: ProviderMetadata = {
    id: "atria",
    name: "Atria",
    category: "api_key",
    protocol: "openai",
    base_url: ATRIA_BASE_URL,
    web_url: "https://api.atria-asi.ai/docs",
    alias: "atria",
    requires_api_key: true,
    supports_custom_url: true,
    status_message: "Atria API key missing"
};
