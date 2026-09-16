import type { ProviderDefinition } from "@srouter/types";

export function getConnectedCount(provider: ProviderDefinition): number {
    if (provider.enabled === false) return 0;
    return provider.status.connectedCount ?? (provider.status.state === "connected" ? 1 : 0);
}

export function isProviderEnabled(provider: ProviderDefinition): boolean {
    return provider.enabled !== false;
}

export function isProviderConnected(provider: ProviderDefinition): boolean {
    return getConnectedCount(provider) > 0;
}

export function getActiveConnectionCount(provider: ProviderDefinition): number {
    return getConnectedCount(provider);
}
