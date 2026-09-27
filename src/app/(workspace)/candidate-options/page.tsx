import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CandidateOptionsAdmin } from "@/components/modules/candidate-options-admin";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Candidate Form Options | Orbit Overseas",
  description: "Configure categories, professions, target companies and statuses for direct candidates",
};

export default async function CandidateOptionsPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const role = toAppRole(session.user.role.name);
  if (role !== "SUPER_ADMIN") redirect("/dashboard");

  const [categories, professions, companies, statuses] = await Promise.all([
    prisma.professionCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.profession.findMany({
      orderBy: { name: "asc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.masterData.findMany({
      where: { type: "DIRECT_FILE_STATUS" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <CandidateOptionsAdmin
      initialCategories={categories.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        active: row.active,
        description: row.description,
        sortOrder: row.sortOrder,
      }))}
      initialProfessions={professions.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        active: row.active,
        description: row.description,
        categoryId: row.categoryId,
        categoryName: row.category.name,
      }))}
      initialCompanies={companies.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        active: ["Active", "ACTIVE"].includes(row.status),
        country: row.country,
      }))}
      initialStatuses={statuses.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        active: row.active,
        description: row.description,
        sortOrder: row.sortOrder,
      }))}
    />
  );
}
