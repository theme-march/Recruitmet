// Database bootstrapping is an explicit seed operation, never a login side effect.
import { countryModule } from "@/lib/permission-policy";
export function workflowCountry(request: Request) {
  return new URL(request.url).searchParams.get("country")?.trim() || "Saudi";
}

export function workflowCountryWhere(request: Request) {
  const country = workflowCountry(request);
  if (countryModule(country) === "ksa") return { in: ["Saudi", "Saudi Arabia", "KSA"] };
  if (countryModule(country) === "dubai") return { in: ["Dubai", "UAE", "United Arab Emirates"] };
  if (/^other( country)?$/i.test(country)) {
    return { in: ["Other", "Other Country"] };
  }
  return { equals: country };
}

export function workflowModule(request: Request) {
  return countryModule(workflowCountry(request));
}

