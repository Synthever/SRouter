import { ATRIA_BASE_URL } from "@srouter/constants";
import type { ModelObject } from "@srouter/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

export interface AtriaExecutorOptions extends OpenAIExecutorOptions {}

export class AtriaExecutor extends OpenAIExecutor {
    constructor(options: AtriaExecutorOptions = {}) {
        super({
            id: options.id ?? "atria",
            name: options.name ?? "Atria",
            alias: options.alias ?? "atria",
            baseUrl: options.baseUrl ?? ATRIA_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }

    override async listModels(): Promise<ModelObject[]> {
        return [{ id: "atria/Atria-Dawn-Preview", object: "model", owned_by: "atria" }];
    }
}
