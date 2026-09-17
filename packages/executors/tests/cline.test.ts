import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { ChatCompletionRequest } from "@srouter/types";
import { ClineExecutor } from "../src/cline.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test("Cline sends hosted API headers and keeps the provider/model namespace", async () => {
    let requestUrl = "";
    let requestHeaders: Headers | undefined;
    let requestBody: Record<string, unknown> | undefined;

    globalThis.fetch = async (input, init) => {
        requestUrl = String(input);
        requestHeaders = new Headers(init?.headers);
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({ id: "chatcmpl_test", choices: [] });
    };

    const request: ChatCompletionRequest = {
        model: "cline/deepseek/deepseek-v4.1-flash",
        messages: [{ role: "user", content: "Reply with exactly OK" }]
    };

    await new ClineExecutor({ apiKey: "cline_fixture_key" }).chatCompletion(request);

    assert.equal(requestUrl, "https://api.cline.bot/api/v1/chat/completions");
    assert.equal(requestHeaders?.get("authorization"), "Bearer cline_fixture_key");
    assert.equal(requestHeaders?.get("user-agent"), "Cline/3.0.62");
    assert.equal(requestHeaders?.get("x-client-type"), "cline-sdk");
    assert.equal(requestHeaders?.get("x-client-version"), "3.0.62");
    assert.equal(requestHeaders?.get("http-referer"), "https://cline.bot");
    assert.match(requestHeaders?.get("x-task-id") ?? "", /^[0-9a-f-]{36}$/);
    assert.equal(requestBody?.model, "deepseek/deepseek-v4.1-flash");
    assert.equal(requestBody?.stream, false);
});
