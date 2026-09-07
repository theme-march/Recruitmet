import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isExtensionError, installExtensionErrorGuard } from "../src/lib/browser-extension-errors.ts";

const extensionStack = { stack: "TypeError: Cannot read properties of undefined (reading 'M_ID')\n    at Y (chrome-extension://example/executors/200.js:1:761)\n    at E (chrome-extension://example/executors/200.js:1:1442)" };

test("recognizes extension script sources and extension-only rejection stacks", () => {
  assert.equal(isExtensionError("chrome-extension://example/executors/200.js", {}), true);
  assert.equal(isExtensionError("", extensionStack), true);
  assert.equal(isExtensionError("", { stack: "Y@moz-extension://example/script.js:1:10" }), true);
});

test("does not hide app errors, hydration errors, unknown sources or mixed stacks", () => {
  for (const error of [new Error("M_ID"), new Error("Hydration failed because bis_skin_checked"), "chrome-extension://example", { stack: "Error: chrome-extension://example" }, null]) {
    assert.equal(isExtensionError("", error), false);
  }
  assert.equal(isExtensionError("http://localhost:3000/app.js", extensionStack), false);
  assert.equal(isExtensionError("", { stack: `${extensionStack.stack}\n    at app (http://localhost:3000/app.js:1:20)` }), false);
  assert.equal(isExtensionError("", { get stack() { throw new Error("Unreadable"); } }), false);
});

test("blocks extension overlay events only, retains default reporting, and cleans up listeners", () => {
  const target = new EventTarget();
  const originalWarn = console.warn;
  let warnings = 0;
  console.warn = () => { warnings++; };
  let overlayEvents = 0;
  const cleanup = installExtensionErrorGuard(target as unknown as Window);
  const overlay = () => { overlayEvents++; };
  target.addEventListener("error", overlay);
  target.addEventListener("unhandledrejection", overlay);
  const emit = (type: string, properties: Record<string, unknown>) => {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(properties)) Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  };
  try {
    emit("error", { filename: "chrome-extension://example/executors/200.js", error: extensionStack });
    emit("unhandledrejection", { reason: extensionStack });
    assert.equal(overlayEvents, 0);
    assert.equal(warnings, 1);
    emit("error", { filename: "http://localhost:3000/app.js", error: new Error("M_ID") });
    emit("unhandledrejection", { reason: new Error("Hydration failed because") });
    assert.equal(overlayEvents, 2);
    cleanup();
    emit("unhandledrejection", { reason: extensionStack });
    assert.equal(overlayEvents, 3);
  } finally { cleanup(); console.warn = originalWarn; }
});

test("guard runs at startup in development only, without patching console.error", () => {
  const startup = readFileSync(new URL("../src/instrumentation-client.ts", import.meta.url), "utf8");
  const providers = readFileSync(new URL("../src/components/layout/providers.tsx", import.meta.url), "utf8");
  assert.match(startup, /process.env.NODE_ENV === "development"/);
  assert.match(startup, /installExtensionErrorGuard\(browser\)/);
  assert.doesNotMatch(providers, /console.error\s*=|stopImmediatePropagation|M_ID/);
});
