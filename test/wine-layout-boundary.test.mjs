import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("wine marketing layout leaves document scrolling to the root layout", () => {
  const layout = source("../src/app/wine/layout.jsx");
  assert.match(layout, /return children;/);
  assert.doesNotMatch(layout, /className|overflow-hidden|100dvh/);
});

test("guest wine routes retain their fixed tablet shell and per-list metadata", () => {
  const layout = source("../src/app/wine/[slug]/layout.jsx");
  for (const token of ["fixed", "inset-0", "h-[100dvh]", "w-screen", "overflow-hidden", "bg-[#00140e]"]) {
    assert.ok(layout.includes(token), `Guest shell retains ${token}`);
  }
  assert.match(layout, /overscrollBehavior: "none"/);
  assert.match(layout, /WebkitOverflowScrolling: "touch"/);
  assert.match(layout, /manifest: `\/wine\/\$\{slug\}\/manifest.webmanifest`/);
});
