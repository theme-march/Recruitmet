import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { countryCandidatesQueryOptions } from "../src/lib/queries/country-candidates.ts";

test("sidebar prefetch is reused by the destination page without another request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ data: [], stats: { totalCandidates: 0 } }));
  const client = new QueryClient();
  try {
    await client.prefetchQuery(countryCandidatesQueryOptions("Dubai"));
    await client.fetchQuery(countryCandidatesQueryOptions("Dubai", {
      search: "", stage: "all", status: "all", officer: "", agent: "", page: 1, pageSize: 20,
    }));
    assert.equal(fetchMock.mock.callCount(), 1);
    await client.fetchQuery(countryCandidatesQueryOptions("Saudi Arabia"));
    assert.equal(fetchMock.mock.callCount(), 2, "a different country must fetch its own records");
    await client.fetchQuery(countryCandidatesQueryOptions("Dubai", { page: 2 }));
    assert.equal(fetchMock.mock.callCount(), 3, "a different page must fetch its own records");
  } finally {
    client.clear();
  }
});

test("failed country requests reject instead of caching an empty successful result", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 500 }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    await assert.rejects(client.fetchQuery(countryCandidatesQueryOptions("Oman")), /Could not load candidates/);
    assert.equal(client.getQueryData(countryCandidatesQueryOptions("Oman").queryKey), undefined);
  } finally {
    client.clear();
  }
});
