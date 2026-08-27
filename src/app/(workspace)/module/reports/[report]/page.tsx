import { KsaEventsReportPage } from "@/components/ksa-events-report-page";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ report: string }>;
}) {
  const { report } = await params;
  const isDaily = report.toLowerCase().includes("daily");

  return <KsaEventsReportPage type={isDaily ? "daily" : "total"} />;
}

