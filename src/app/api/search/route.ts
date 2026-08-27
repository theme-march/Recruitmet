import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);

  const leads = await prisma.workCall.findMany({
    where: {
      OR: [
        { leadNo: { contains: q } },
        { fullName: { contains: q } },
        { phone: { contains: q } },
      ],
    },
    take: 20,
  });

  return Response.json(
    leads.map((x) => ({
      id: x.id,
      fileNo: x.leadNo,
      name: x.fullName,
      phone: x.phone,
      passport: null,
      country: x.country ?? "—",
      stage: x.status,
      status: x.status,
    }))
  );
}

