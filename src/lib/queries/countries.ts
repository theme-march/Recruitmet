import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";

export type CountryRecord = {
  id: string; name: string; code: string; flag?: string | null; currency: string; timezone: string;
  phoneCode: string | null; workflowType: string; active: boolean; candidateCount: number;
  workflow?: Array<{ id: string; code: string; name: string; sortOrder: number; active: boolean; terminal?: boolean }>;
  createdAt: string; updatedAt: string;
};
export const countriesKey = ["countries"] as const;
export const countryStatusKey = ["country-status"] as const;
const message = (error: unknown, fallback: string) => typeof error === "string" ? error : error && typeof error === "object" && "message" in error ? String(error.message) : fallback;

export const countriesQueryOptions = () => queryOptions({
  queryKey: countriesKey,
  queryFn: async ({ signal }): Promise<CountryRecord[]> => {
    const response = await fetch("/api/countries", { signal, cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.success) throw new Error(message(body.error, "Failed to load countries."));
    return body.data;
  },
  staleTime: 30_000,
});

export function countryStatusMutationOptions(client: QueryClient) {
  return mutationOptions({
    mutationKey: countryStatusKey,
    mutationFn: async (input: { id: string; active: boolean }): Promise<Partial<CountryRecord>> => {
      const response = await fetch("/api/countries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(message(body.error, "Failed to update country status."));
      return body.data;
    },
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: countriesKey });
      const previous = client.getQueryData<CountryRecord[]>(countriesKey)?.find(c => c.id === input.id);
      client.setQueryData<CountryRecord[]>(countriesKey, rows => rows?.map(c => c.id === input.id ? { ...c, active: input.active } : c));
      return { previous };
    },
    onSuccess: (saved, input) => {
      // PATCH returns a country record without aggregated counts/workflow.
      // Merge it into the cached row instead of replacing the full list.
      client.setQueryData<CountryRecord[]>(countriesKey, rows => rows?.map(c => c.id === input.id ? { ...c, ...saved } : c));
    },
    onError: (_error, input, context) => {
      // Roll back only this row; another country's concurrent save stays intact.
      if (context?.previous) client.setQueryData<CountryRecord[]>(countriesKey, rows => rows?.map(c => c.id === input.id ? context.previous! : c));
    },
    onSettled: async () => {
      // Refetch once the final pending toggle settles. Cached rows remain visible.
      if (client.isMutating({ mutationKey: countryStatusKey }) === 1) {
        await Promise.all([client.invalidateQueries({ queryKey: countriesKey }), client.invalidateQueries({ queryKey: ["nav-counts"] })]);
      }
    },
  });
}
