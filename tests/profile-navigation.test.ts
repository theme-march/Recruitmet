import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { meKey, meQueryOptions, type MeResponse } from "../src/lib/queries/me.ts";

const body: MeResponse = { data: {
  name: "Custom Staff", role: "Interview Operator", roleKey: "CUSTOM",
  home: "/dashboard", office: null, unreadNotifications: 0,
  allowedModules: ["registration"], granularPermissions: { registration: ["read", "create"] },
  permissions: { canManageInterviews: true, canManageDemands: false },
} };

test("page observers and repeated navigation/refetch preserve the sidebar profile envelope", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(body);
  const shell = new QueryObserver(client, meQueryOptions());
  const stopShell = shell.subscribe(() => {});
  try {
    await shell.refetch();
    for (let navigation = 0; navigation < 4; navigation++) {
      const page = new QueryObserver(client, { ...meQueryOptions(), select: (result) => result.data });
      const stopPage = page.subscribe(() => {});
      try {
        await page.refetch();
        await client.invalidateQueries({ queryKey: meKey });
        assert.equal(page.getCurrentResult().data?.roleKey, "CUSTOM");
        assert.deepEqual(shell.getCurrentResult().data, body);
        assert.deepEqual(client.getQueryData(meKey), body);
        assert.equal(shell.getCurrentResult().isPending, false);
      } finally { stopPage(); }
    }
  } finally { stopShell(); client.clear(); globalThis.fetch = originalFetch; }
});

test("temporary or malformed responses retain menus, but revocation and session expiry clear access", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const originalFetch = globalThis.fetch;
  client.setQueryData(meKey, body);
  const shell = new QueryObserver(client, { ...meQueryOptions(), retry: false });
  const stop = shell.subscribe(() => {});
  try {
    for (const fail of [
      async () => { throw new Error("Network unavailable"); },
      async () => new Response("Unavailable", { status: 503 }),
      async () => Response.json({ data: { name: "Incomplete profile" } }),
    ]) {
      globalThis.fetch = fail;
      await shell.refetch();
      assert.equal(shell.getCurrentResult().isError, true);
      assert.deepEqual(shell.getCurrentResult().data, body);
    }
    globalThis.fetch = async () => Response.json({ data: { ...body.data, allowedModules: [], granularPermissions: {}, permissions: {} } });
    await shell.refetch();
    assert.deepEqual(shell.getCurrentResult().data?.data?.allowedModules, []);
    assert.deepEqual(shell.getCurrentResult().data?.data?.granularPermissions, {});
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    await shell.refetch();
    assert.deepEqual(client.getQueryData(meKey), { data: null });
  } finally { stop(); client.clear(); globalThis.fetch = originalFetch; }
});

test("every profile consumer uses the shared query function, never a different cache shape", () => {
  for (const path of ["components/layout/app-shell.tsx", "hooks/use-access.ts", "components/modules/interview-list-page.tsx", "components/modules/works-demands-page.tsx", "components/modules/permissions-matrix.tsx"]) {
    const source = readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
    assert.match(source, /meQueryOptions\(\)/, path);
    assert.doesNotMatch(source, /fetch\(["']\/api\/me["']/, path);
  }
});
