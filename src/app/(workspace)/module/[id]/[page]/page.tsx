import { ModulePage } from "@/components/modules/module-page";
import { getModule, getModuleItemBySlug } from "@/lib/modules";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string; page: string }> }) {
  const { id, page } = await params;
  const module = getModule(id);
  const item = getModuleItemBySlug(id, page);
  if (!module || !item) notFound();
  return <ModulePage moduleId={module.id} initialTab={item.label} />;
}
