import type { getSession } from "@/lib/session";
export type AwaitedSession = Awaited<ReturnType<typeof getSession>>;
