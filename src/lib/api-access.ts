import "server-only";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { can, requirePermission, requireSuperAdmin, requireFilePermission } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { canonicalModule, countryModule } from "@/lib/permission-policy";
import { prisma } from "@/lib/prisma";
import { toAppRole } from "@/lib/roles";

// Every operational route opts into this boundary; unknown routes fail closed.
// Existing service-level checks remain in place as defence in depth.
export function withApiAccess<C>(route: string, handler: (request: NextRequest, context: C) => Promise<Response>) {
  return async (request: NextRequest, context: C) => {
    try {
      await authorizeApi(route, request);
      let response = await handler(request, context);
      if (route === "nav-counts" && response.ok) {
        const session = await getSession();
        const body = await response.json();
        const entries = await Promise.all(Object.entries(body.data ?? {}).map(async ([key, value]) => [key, await can(session, key, "read") ? value : undefined] as const));
        response = Response.json({ data: Object.fromEntries(entries.filter(([, value]) => value !== undefined)) });
      }
      if (route === "countries" && request.method === "GET" && response.ok) {
        const session = await getSession();
        const body = await response.json();
        body.data = await Promise.all((body.data ?? []).map(async (country: Record<string, unknown>) => ({
          ...country,
          candidateCount: await can(session, countryModule(String(country.name)), "read") ? country.candidateCount : 0,
        })));
        response = Response.json(body);
      }
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) { return errorResponse(error); }
  };
}
export async function authorizeApi(route: string, request: Request) {
  const session = await getSession();
  if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
  const superAdmin = toAppRole(session.user.role.name) === "SUPER_ADMIN";
  if (route.startsWith("admin/")) { requireSuperAdmin(session); return; }
  if (route.startsWith("auth/") || ["me", "nav-counts"].includes(route)) return;
  const url = new URL(request.url);
  const method = request.method;
  const reading = method === "GET" || method === "HEAD";
  // Personal notifications have recipient checks in the handler/service.
  if ((route === "notifications" && reading) || route === "notifications/[id]/read") return;
  if (route === "countries" && reading) return; // Lookup metadata; counts filtered in handler.
  let body: Record<string, unknown> = {};
  if (!reading && request.headers.get("content-type")?.includes("application/json")) {
    try { body = await request.clone().json(); } catch { throw new AppError("INVALID_JSON", "Invalid request body.", 422); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("INVALID_BODY", "Expected an object.", 422);
  }
  if (superAdmin) return;
  if (toAppRole(session.user.role.name) === "AGENT") {
    const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    if (route === "agents/[id]" && reading && session.user.agentId === id) return;
    if (route === "files/[id]" && reading && session.user.agentId) {
      const agent = await prisma.agent.findUnique({ where: { id: session.user.agentId }, select: { name: true, code: true } });
      if (agent && await prisma.processingFile.findFirst({ where: { AND: [{ OR: [{ id }, { fileNo: id }] }, { OR: [{ agent: agent.name }, { agent: agent.code }, { candidate: { source: agent.name } }, { candidate: { source: agent.code } }] }] }, select: { id: true } })) return;
    }
    throw new AppError("FORBIDDEN", "Agent portal access is limited to your own profile.", 403);
  }
  let action = reading ? "read" : method === "DELETE" ? "delete" : method === "POST" ? "create" : "edit";
  let module = "";
  const root = route.split("/")[0];
  const fixed: Record<string, string> = {
    agents: "agents", demands: "office-vendor", "countries": "country-setup",
    "all-candidates": "call-center", candidates: "call-center", "work-calls": "call-center", leads: "call-center", search: "call-center", "officer-dashboard": "call-center",
    interviews: "registration", "interview-schedules": "registration",
    "payment-collection": "payment-collection", payments: "payment-collection",
    "dubai-documents": "document", documents: "document", tutorials: "tutorials",
    flights: "flights", notifications: "notifications", "master-data": "master-data", reports: "reports",
  };
  module = fixed[root] ?? "";
  if (root === "ksa" || root === "dubai") module = countryModule(url.searchParams.get("country") || (root === "ksa" ? "Saudi Arabia" : "Dubai"));
  if (route === "country-candidates") module = countryModule(url.searchParams.get("country") || "Saudi Arabia");
  if (route === "module-data") module = canonicalModule(url.searchParams.get("module") || "call-center");
  if (route === "export") { module = "call-center"; action = "export"; }
  if (root === "imports") { module = "call-center"; action = "import"; }
  if (route.includes("/convert")) {
    action = "edit";
    await requirePermission(session, "call-center", "create");
  }
  if (route.includes("/assessment") || route.includes("/flown") || route.includes("/resend")) action = "edit";
  if (route.includes("/flown")) action = "approve";
  if (route.includes("/follow-ups")) action = reading ? "read" : "edit";
  if (route.includes("/refunds")) action = "refund";
  if (route.includes("/verify")) action = "verify";
  if (route.includes("/download") || (root === "reports" && url.searchParams.get("format") && url.searchParams.get("format") !== "json")) action = "export";
  if (reading && url.searchParams.get("export") === "1") action = "export";
  if (route === "records") {
    module = canonicalModule(String(body.resource ?? ""));
    if (module === "files") {
      const data = body.data as Record<string, unknown> | undefined;
      if (data?.country) await requirePermission(session, countryModule(String(data.country)), "create");
    }
  }
  const intent = String(body.action ?? "");
  if (intent.startsWith("delete-")) action = "delete";
  if (intent.startsWith("create-") || intent.startsWith("add-") || intent.startsWith("upload-")) action = "create";
  if (root === "agents") {
    if (body.enablePortalLogin === true || body.portalPassword || body.portalEmail) requireSuperAdmin(session);
    if (intent === "record-candidate-payment" || body.payoutAmount) await requirePermission(session, "payment-collection", "create");
    if (intent === "update-interview") await requirePermission(session, "registration", "edit");
    if (["link-candidate", "unlink-candidate"].includes(intent)) action = "assign";
  }
  if (root === "files") {
    if (route === "files") {
      module = "files";
      if (!reading && body.country) {
        await requireFilePermission(session, { country: String(body.country) }, "create");
        if (body.assignedToId !== undefined) await requireFilePermission(session, { country: String(body.country) }, "assign");
        return;
      }
    } else {
      const lookup = decodeURIComponent(url.pathname.split("/")[3]);
      const file = await prisma.processingFile.findFirst({ where: { OR: [{ id: lookup }, { fileNo: lookup }] }, select: { country: true } });
      if (route.endsWith("/hold") || route.endsWith("/return") || route.endsWith("/reprocess")) {
        await requirePermission(session, "exceptions", route.split("/").at(-1)!);
        action = "edit";
      }
      if (file) await requireFilePermission(session, file, action);
      else await requirePermission(session, "call-center", action);
      if (intent === "record-payment") await requirePermission(session, "payment-collection", "create");
      if (body.country) await requirePermission(session, countryModule(String(body.country)), "edit");
      if (body.assignedToId !== undefined) {
        if (file) await requireFilePermission(session, file, "assign"); else await requirePermission(session, "call-center", "assign");
      }
      return;
    }
  }
  if (root === "holds") { module = "exceptions"; action = "reprocess"; }
  if (route === "stage-records") {
    const form = await request.clone().formData();
    const lookup = String(form.get("fileLookup") ?? "");
    const file = await prisma.processingFile.findFirst({ where: { OR: [{ fileNo: lookup }, { candidate: { passportNo: lookup } }, { candidate: { phone: lookup } }, { candidate: { candidateNo: lookup } }] }, select: { country: true } });
    if (!file) throw new AppError("NOT_FOUND", "File not found.", 404);
    await requireFilePermission(session, file, "edit");
    const stage = String(form.get("stage") ?? "");
    if (/payment/i.test(stage)) await requirePermission(session, "payment-collection", "create");
    module = countryModule(file.country); action = "create";
  }
  if (!module) throw new AppError("FORBIDDEN", "This operation is not available to your role.", 403);
  if (body.assignedToId !== undefined) await requirePermission(session, module, "assign");
  await requirePermission(session, module, action);
}
