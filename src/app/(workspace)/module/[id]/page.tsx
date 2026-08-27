import { getModule, moduleItemPath } from "@/lib/modules";
import { notFound, redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = getModule(id);
  if (!module?.items[0]) notFound();
  redirect(moduleItemPath(id, module.items[0].label));
}
