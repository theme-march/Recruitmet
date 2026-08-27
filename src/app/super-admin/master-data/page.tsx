import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/role-guard";
import { SuperAdminMasterView } from "@/components/super-admin-master-view";

export default async function SuperAdminMasterDataPage() {
  await connection();
  await requireRole("SUPER_ADMIN");

  const [demands, companies, professions] = await Promise.all([
    prisma.demand.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.professionCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <SuperAdminMasterView
      initialDemands={demands.map((d) => ({
        id: d.id,
        demandNo: d.demandNo,
        title: d.title,
        profession: d.profession,
        country: d.country,
        quantity: d.quantity,
        assignedQuantity: d.assignedQuantity,
        companyName: d.company.name,
        status: d.status,
      }))}
      companies={companies.map((c) => ({ id: c.id, name: c.name, country: c.country }))}
      professions={professions.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}

