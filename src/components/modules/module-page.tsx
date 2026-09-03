import dynamic from "next/dynamic";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ComponentSkeleton } from "@/components/layout/component-skeleton";

// Dynamic on-demand loading for components (Code-splitting & streaming)
const CreateWorkCallPage = dynamic(
  () => import("@/components/modules/create-work-call-page").then((mod) => mod.CreateWorkCallPage),
  { loading: () => <ComponentSkeleton /> }
);

import { AllCandidatesListPage } from "@/components/modules/all-candidates-list-page";
import { CountryCandidatesListPage } from "@/components/modules/country-candidates-list-page";

const WorkCallListPage = dynamic(
  () => import("@/components/modules/work-call-list-page").then((mod) => mod.WorkCallListPage),
  { loading: () => <ComponentSkeleton /> }
);

const OfficerDashboardPage = dynamic(
  () => import("@/components/modules/officer-dashboard-page").then((mod) => mod.OfficerDashboardPage),
  { loading: () => <ComponentSkeleton /> }
);

const InterviewListPage = dynamic(
  () => import("@/components/modules/interview-list-page").then((mod) => mod.InterviewListPage),
  { loading: () => <ComponentSkeleton /> }
);

const WorksDemandsPage = dynamic(
  () => import("@/components/modules/works-demands-page").then((mod) => mod.WorksDemandsPage),
  { loading: () => <ComponentSkeleton /> }
);

const AgentsPage = dynamic(
  () => import("@/components/modules/agents-page").then((mod) => mod.AgentsPage),
  { loading: () => <ComponentSkeleton /> }
);

const PaymentCollectionPage = dynamic(
  () => import("@/components/modules/payment-collection-page").then((mod) => mod.PaymentCollectionPage),
  { loading: () => <ComponentSkeleton /> }
);

const DubaiDocumentsPage = dynamic(
  () => import("@/components/modules/dubai-documents-page").then((mod) => mod.DubaiDocumentsPage),
  { loading: () => <ComponentSkeleton /> }
);

const CountryManagementPage = dynamic(
  () => import("@/components/modules/country-management-page").then((mod) => mod.CountryManagementPage),
  { loading: () => <ComponentSkeleton /> }
);

const TutorialLibraryPage = dynamic(
  () => import("@/components/modules/tutorial-library-page").then((mod) => mod.TutorialLibraryPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaPassportPage = dynamic(
  () => import("@/components/ksa/ksa-passport-page").then((mod) => mod.KsaPassportPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaMedicalPage = dynamic(
  () => import("@/components/ksa/ksa-medical-page").then((mod) => mod.KsaMedicalPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaMofaPage = dynamic(
  () => import("@/components/ksa/ksa-mofa-page").then((mod) => mod.KsaMofaPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaTakamulPage = dynamic(
  () => import("@/components/ksa/ksa-takamul-page").then((mod) => mod.KsaTakamulPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaBioFingerPage = dynamic(
  () => import("@/components/ksa/ksa-bio-finger-page").then((mod) => mod.KsaBioFingerPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaPoliceClearancePage = dynamic(
  () => import("@/components/ksa/ksa-police-clearance-page").then((mod) => mod.KsaPoliceClearancePage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaFirstPaymentPage = dynamic(
  () => import("@/components/ksa/ksa-first-payment-page").then((mod) => mod.KsaFirstPaymentPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaPreConfirmPage = dynamic(
  () => import("@/components/ksa/ksa-pre-confirm-page").then((mod) => mod.KsaPreConfirmPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaVisaStampingPage = dynamic(
  () => import("@/components/ksa/ksa-visa-stamping-page").then((mod) => mod.KsaVisaStampingPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaVisaHoldPage = dynamic(
  () => import("@/components/ksa/ksa-visa-hold-page").then((mod) => mod.KsaVisaHoldPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaSecondPaymentPage = dynamic(
  () => import("@/components/ksa/ksa-second-payment-page").then((mod) => mod.KsaSecondPaymentPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaHoldFilePage = dynamic(
  () => import("@/components/ksa/ksa-hold-file-page").then((mod) => mod.KsaHoldFilePage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaManpowerPage = dynamic(
  () => import("@/components/ksa/ksa-manpower-page").then((mod) => mod.KsaManpowerPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaReadyFlightPage = dynamic(
  () => import("@/components/ksa/ksa-ready-flight-page").then((mod) => mod.KsaReadyFlightPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaFlightPage = dynamic(
  () => import("@/components/ksa/ksa-flight-page").then((mod) => mod.KsaFlightPage),
  { loading: () => <ComponentSkeleton /> }
);

const KsaReturnedFilesPage = dynamic(
  () => import("@/components/ksa/ksa-returned-files-page").then((mod) => mod.KsaReturnedFilesPage),
  { loading: () => <ComponentSkeleton /> }
);

const ModuleView = dynamic(
  () => import("@/components/modules/module-view").then((mod) => mod.ModuleView),
  { loading: () => <ComponentSkeleton /> }
);

export async function ModulePage({ moduleId, initialTab }: { moduleId: string; initialTab: string }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Suspense fallback={<ComponentSkeleton />}>
      {renderModuleContent(moduleId, initialTab, session.user.name)}
    </Suspense>
  );
}

function renderModuleContent(moduleId: string, initialTab: string, officerName: string) {
  // Call Center / Candidates module routes
  if (moduleId === "call-center" || moduleId === "candidates") {
    if (initialTab === "Create Candidate" || initialTab === "Create Work Call") return <CreateWorkCallPage officerName={officerName} />;
    if (initialTab === "Candidate List" || initialTab === "Candidates List" || initialTab === "All Candidates" || initialTab === "Work Call List") return <AllCandidatesListPage />;
    if (initialTab === "Officer Dashboard") return <OfficerDashboardPage />;
    if (initialTab === "Registration & interviews" || initialTab === "Registration & Interviews") return <InterviewListPage />;
    return <AllCandidatesListPage />;
  }

  // Office & Vendor module routes
  if (moduleId === "office-vendor" || moduleId === "partners") {
    if (initialTab === "Works & Demands") return <WorksDemandsPage />;
  }

  // Agents & Channel Partners module routes
  if (moduleId === "agents" || moduleId === "agent") {
    return <AgentsPage />;
  }

  // Payment Collection module routes
  if (moduleId === "payment-collection" || (moduleId === "accounts" && initialTab === "Payment Collect")) {
    return <PaymentCollectionPage />;
  }

  // Document module routes
  if (moduleId === "document" || moduleId === "documents") {
    return <DubaiDocumentsPage />;
  }

  // Country Setup / Destination Countries module route
  if (moduleId === "country-setup") {
    return <CountryManagementPage />;
  }

  // Tutorials module routes
  if (moduleId === "tutorials") {
    return <TutorialLibraryPage mode={initialTab === "Tutorial Categories" ? "categories" : "tutorials"} />;
  }

  // Country stage pages (Saudi Arabia, Dubai, Other Country)
  if (moduleId === "ksa" || moduleId === "dubai" || moduleId === "other-country") {
    const countryName = moduleId === "ksa" ? "Saudi Arabia" : moduleId === "dubai" ? "Dubai" : "Other Country";

    if (
      !initialTab ||
      initialTab === "Candidates List" ||
      initialTab === "Candidate Processing List" ||
      initialTab === "Passport List"
    ) {
      return <CountryCandidatesListPage country={countryName} />;
    }

    if (initialTab === "Passport Entry") {
      return <KsaPassportPage mode="entry" country={countryName} />;
    }
    if (initialTab === "Medical") {
      return <KsaMedicalPage country={countryName} />;
    }
    if (initialTab === "Mofa" || initialTab === "MOFA") {
      return <KsaMofaPage country={countryName} />;
    }
    if (initialTab === "Takamul") {
      return <KsaTakamulPage country={countryName} />;
    }
    if (initialTab === "KSA Bio Finger" || initialTab === "Bio Finger") {
      return <KsaBioFingerPage country={countryName} />;
    }
    if (initialTab === "Police Clarence" || initialTab === "Police Clearance") {
      return <KsaPoliceClearancePage country={countryName} />;
    }
    if (initialTab === "First Payment") {
      return <KsaFirstPaymentPage country={countryName} />;
    }
    if (initialTab === "Approval Application") {
      return <KsaPreConfirmPage country={countryName} title={`${countryName} Approval Application`} stage="Approval Application" />;
    }
    if (initialTab === "Pre Confirm File") {
      return <KsaPreConfirmPage country={countryName} title={`${countryName} Pre Confirm File`} stage="Pre Confirm File" />;
    }
    if (initialTab === "Confirm File") {
      return <KsaPreConfirmPage country={countryName} title={`${countryName} Confirm File`} stage="Confirm File" />;
    }
    if (initialTab === "E-Visa Stumping" || initialTab === "E-Visa Stamping") {
      return <KsaVisaStampingPage country={countryName} title={`${countryName} Visa Stamping`} />;
    }
    if (initialTab === "Visa Done") {
      return <KsaVisaStampingPage country={countryName} title={`${countryName} Visa Done`} initialStatus="Done" />;
    }
    if (initialTab === "E-Visa Hold") {
      return <KsaVisaHoldPage country={countryName} title={`${countryName} Visa Hold`} />;
    }
    if (initialTab === "Hold File" || initialTab === "Hold Files") {
      return <KsaHoldFilePage country={countryName} />;
    }
    if (initialTab === "Pending Second Payment" || initialTab === "Second Payment") {
      return <KsaSecondPaymentPage country={countryName} title={`${countryName} Second Payment`} />;
    }
    if (initialTab === "Manpower") {
      return <KsaManpowerPage country={countryName} />;
    }
    if (initialTab === "Ready For Flight" || initialTab === "Ready to Flight") {
      return <KsaReadyFlightPage country={countryName} />;
    }
    if (initialTab === "Flight") {
      return <KsaFlightPage country={countryName} />;
    }
    if (initialTab === "Return File" || initialTab === "Returned File") {
      return <KsaReturnedFilesPage country={countryName} />;
    }
  }

  // Dynamic Country modules (e.g. Oman, Romania, Qatar, Kuwait, Malaysia, etc.)
  const dynamicCountryName = moduleId.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  return <CountryCandidatesListPage country={dynamicCountryName} />;
}






