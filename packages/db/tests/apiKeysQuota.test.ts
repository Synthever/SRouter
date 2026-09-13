import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../src/db.js";
import {
    createAPIKeyDB,
    releaseAPIKeyQuotaDB,
    reserveAPIKeyQuotaDB,
    settleAPIKeyQuotaDB
} from "../src/apiKeys.js";

test("API key quota reservations are atomic and settle to actual usage", async () => {
    const key = await createAPIKeyDB({ name: "quota", quota_limit: 100 });
    const [first, second] = await Promise.all([
        reserveAPIKeyQuotaDB(key.id, 75),
        reserveAPIKeyQuotaDB(key.id, 75)
    ]);

    assert.deepEqual([first, second].sort(), [false, true]);

    await settleAPIKeyQuotaDB(key.id, 75, 20);
    const settled = (await db
        .prepare("SELECT usage_tokens FROM api_keys WHERE id = ?")
        .get(key.id)) as {
        usage_tokens: number;
    };
    assert.equal(settled.usage_tokens, 20);

    await reserveAPIKeyQuotaDB(key.id, 80);
    await releaseAPIKeyQuotaDB(key.id, 80);
    const released = (await db
        .prepare("SELECT usage_tokens FROM api_keys WHERE id = ?")
        .get(key.id)) as {
        usage_tokens: number;
    };
    assert.equal(released.usage_tokens, 20);
    await db.prepare("DELETE FROM api_keys WHERE id = ?").run(key.id);
});
