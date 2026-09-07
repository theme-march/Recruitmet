import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AllCandidatesListPage } from "@/components/modules/all-candidates-list-page";
import { CountryCandidatesListPage } from "@/components/modules/country-candidates-list-page";
import { CreateWorkCallPage } from "@/components/modules/create-work-call-page";
import { OfficerDashboardPage } from "@/components/modules/officer-dashboard-page";
import { InterviewListPage } from "@/components/modules/interview-list-page";
import { WorksDemandsPage } from "@/components/modules/works-demands-page";
import { AgentsPage } from "@/components/modules/agents-page";
import { PaymentCollectionPage } from "@/components/modules/payment-collection-page";
import { DubaiDocumentsPage } from "@/components/modules/dubai-documents-page";
import { CountryManagementPage } from "@/components/modules/country-management-page";
import { TutorialLibraryPage } from "@/components/modules/tutorial-library-page";
import { KsaPassportPage } from "@/components/ksa/ksa-passport-page";
import { KsaMedicalPage } from "@/components/ksa/ksa-medical-page";
import { KsaMofaPage } from "@/components/ksa/ksa-mofa-page";
import { KsaTakamulPage } from "@/components/ksa/ksa-takamul-page";
import { KsaBioFingerPage } from "@/components/ksa/ksa-bio-finger-page";
import { KsaPoliceClearancePage } from "@/components/ksa/ksa-police-clearance-page";
import { KsaFirstPaymentPage } from "@/components/ksa/ksa-first-payment-page";
import { KsaPreConfirmPage } from "@/components/ksa/ksa-pre-confirm-page";
import { KsaVisaStampingPage } from "@/components/ksa/ksa-visa-stamping-page";
import { KsaVisaHoldPage } from "@/components/ksa/ksa-visa-hold-page";
import { KsaSecondPaymentPage } from "@/components/ksa/ksa-second-payment-page";
import { KsaHoldFilePage } from "@/components/ksa/ksa-hold-file-page";
import { KsaManpowerPage } from "@/components/ksa/ksa-manpower-page";
import { KsaReadyFlightPage } from "@/components/ksa/ksa-ready-flight-page";
import { KsaFlightPage } from "@/components/ksa/ksa-flight-page";
import { KsaReturnedFilesPage } from "@/components/ksa/ksa-returned-files-page";

export async function ModulePage({ moduleId, initialTab }: { moduleId: string; initialTab: string }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { can } = await import("@/lib/authorization");
  const permissionModule = /interview/i.test(initialTab) ? "registration" : moduleId;
  if (!await can(session, permissionModule, /^(Create|Add|New)\b/.test(initialTab) ? "create" : "read")) {
    return <section style={{ padding: 32 }}><h1>Access not granted</h1><p>Your role does not have access to this work. Ask your Super Administrator to update your role.</p></section>;
  }

  // Keep authorization at the page boundary. Next.js retains the current page
  // during navigation until this server work and the destination code are ready.
  return renderModuleContent(moduleId, initialTab, session.user.name);
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






