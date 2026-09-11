import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const path of ["../src/app/wine/[slug]/page.js", "../src/app/api/wine-menu/[slug]/route.js"]) {
  test(`${path}: active-wine query builds with the installed Supabase client`, () => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    const chain = source.match(/supabase\s*(\.from\("wines"\)[\s\S]*?\.in\("id", batch\))/);
    assert.ok(chain, "Locate the actual production wine query, not a duplicate implementation");
    const client = createClient("https://example.supabase.co", "test-placeholder", {
      global: { fetch: () => { throw new Error("This test must not make network requests"); } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Execute only the checked-in query-builder expression, without awaiting it.
    const query = new Function("supabase", "batch", `return supabase${chain[1]}`)(client, ["wine-id"]);
    assert.equal(query.url.searchParams.get("or"), "(is_active.is.null,is_active.eq.true)");
    assert.equal(query.url.searchParams.get("id"), "in.(wine-id)");
    assert.match(query.url.searchParams.get("select"), /name/);
  });
}
