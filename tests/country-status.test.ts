import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { countriesKey, countriesQueryOptions, countryStatusMutationOptions, type CountryRecord } from "../src/lib/queries/countries.ts";

const rows: CountryRecord[] = [
  { id: "a", name: "Dubai", code: "AE", currency: "AED", timezone: "Asia/Dubai", phoneCode: null, workflowType: "DUBAI", active: true, candidateCount: 3, createdAt: "", updatedAt: "", workflow: [] },
  { id: "b", name: "Oman", code: "OM", currency: "OMR", timezone: "Asia/Muscat", phoneCode: null, workflowType: "GENERAL", active: true, candidateCount: 1, createdAt: "", updatedAt: "" },
];
test("country toggle updates the shared sidebar/table cache without replacing data with loading", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(countriesKey, rows);
  const options = countryStatusMutationOptions(client);
  const observer = new QueryObserver(client, countriesQueryOptions());
  const stop = observer.subscribe(() => {});
  const originalFetch = globalThis.fetch;
  let release!: (value: Response) => void;
  globalThis.fetch = async (_url, init) => init?.method === "PATCH" ? new Promise<Response>(resolve => { release = resolve; }) : Response.json({ success: true, data: [{ ...rows[0], active: false }, rows[1]] });
  try {
    const mutation = client.getMutationCache().build(client, options);
    const saving = mutation.execute({ id: "a", active: false });
    // onMutate cancels in-flight queries before applying the row update.
    for (let i = 0; i < 10 && !release; i++) await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(client.getQueryData<CountryRecord[]>(countriesKey)?.[0].active, false);
    assert.equal(observer.getCurrentResult().isPending, false);
    assert.equal(client.getQueryData<CountryRecord[]>(countriesKey)?.[1], rows[1]);
    release(Response.json({ success: true, data: { id: "a", active: false } }));
    await saving;
    assert.equal(observer.getCurrentResult().isPending, false);
    assert.equal(client.getQueryData<CountryRecord[]>(countriesKey)?.[0].candidateCount, 3);
  } finally { stop(); client.clear(); globalThis.fetch = originalFetch; }
});
test("failed toggle rolls back only its row and keeps another row's change", async () => {
  const client = new QueryClient();
  client.setQueryData(countriesKey, rows);
  const originalFetch = globalThis.fetch;
  let rejectSave!: (reason: Error) => void;
  globalThis.fetch = async () => new Promise<Response>((_resolve, reject) => { rejectSave = reject; });
  try {
    const mutation = client.getMutationCache().build(client, countryStatusMutationOptions(client));
    const saving = mutation.execute({ id: "a", active: false });
    const rejected = assert.rejects(saving, /Save failed/);
    for (let i = 0; i < 10 && !rejectSave; i++) await new Promise(resolve => setTimeout(resolve, 0));
    client.setQueryData<CountryRecord[]>(countriesKey, data => data!.map(c => c.id === "b" ? { ...c, active: false } : c));
    rejectSave(new Error("Save failed"));
    await rejected;
    const current = client.getQueryData<CountryRecord[]>(countriesKey)!;
    assert.equal(current[0].active, true);
    assert.equal(current[1].active, false);
  } finally { client.clear(); globalThis.fetch = originalFetch; }
});
test("toggle does not reset page loading or navigate/reload the document", () => {
  const source = readFileSync(new URL("../src/components/modules/country-management-page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setLoading|location\.reload|router\.refresh/);
  assert.match(source, /countryQuery\.isPending/);
  assert.match(source, /pendingClicks\.current\.has/);
  assert.match(source, /aria-busy=/);
});
