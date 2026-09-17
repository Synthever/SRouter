import { randomUUID } from "node:crypto";
import { CLINE_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

export interface ClineExecutorOptions extends OpenAIExecutorOptions {}

export class ClineExecutor extends OpenAIExecutor {
    constructor(options: ClineExecutorOptions = {}) {
        super({
            ...options,
            id: options.id ?? "cline",
            name: options.name ?? "Cline",
            alias: options.alias ?? "cline",
            baseUrl: options.baseUrl ?? CLINE_BASE_URL,
            additionalHeaders: {
                "User-Agent": "Cline/3.0.62",
                "HTTP-Referer": "https://cline.bot",
                "X-Title": "Cline",
                "X-IS-MULTIROOT": "false",
                "X-CLIENT-TYPE": "cline-sdk",
                "X-CLIENT-VERSION": "3.0.62",
                "X-PLATFORM": "cli",
                "X-PLATFORM-VERSION": "3.0.62",
                "X-CORE-VERSION": "0.0.83",
                "X-Task-ID": randomUUID()
            }
        });
    }
}
