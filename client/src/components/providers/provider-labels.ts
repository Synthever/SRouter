import type { ProviderProtocol } from "@/api/types"

/** Protocol labels for the driver badge and the detail header. Keyed by the
 * union, so a protocol added in Rust fails to compile here until it is named. */
export const PROTOCOL_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Custom",
} satisfies Record<ProviderProtocol, string>

/** The API's category keys are not display strings: `api_key` would read as
 * "Api key" under a capitalization transform, so each one is spelled here. */
export function categoryLabel(category: string) {
  switch (category) {
    case "oauth":
      return "OAuth"
    case "api_key":
      return "API key"
    case "free_tier":
      return "Free tier"
    case "custom_provider":
      return "Custom"
    default:
      return category.replaceAll("_", " ")
  }
}
