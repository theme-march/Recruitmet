import { queryOptions } from "@tanstack/react-query";

type CandidateRow = {
  id: string;
  fileNo: string;
  candidateNo: string;
  name: string;
  phone: string;
  passportNumber: string;
  passportExpiry: string | null;
  district: string;
  age: number | null;
  profession: string;
  company: string;
  agent: string;
  country: string;
  currentStage: string;
  status: string;
  visaNumber: string | null;
  visaStatus: string | null;
  medicalResult: string | null;
  totalPaid: number;
  totalPackage: number;
  balanceDue: number;
  officerName: string;
  officeName: string;
  updatedAt: string;
};

type CountryAgentItem = {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  status: string;
  totalCandidates: number;
  activeCount: number;
  completedCount: number;
  totalPaid: number;
};

export type CountryCandidatesResponse = {
  data: CandidateRow[];
  countryAgents?: CountryAgentItem[];
  stats: {
    totalCandidates: number;
    inMedical: number;
    inVisa: number;
    inManpower: number;
    inFlight: number;
    inHold: number;
    totalDeposited: number;
  };
  filters: {
    officers: Array<{ id: string; name: string }>;
    agents: Array<{ id: string; name: string; code: string }>;
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};


export type CountryCandidateFilters = {
  search?: string;
  stage?: string;
  status?: string;
  officer?: string;
  agent?: string;
  page?: number;
  pageSize?: number;
};

// Shared by the page and sidebar intent-prefetch; identical keys deduplicate requests.
export function countryCandidatesQueryOptions(country: string, filters: CountryCandidateFilters = {}) {
  const { search = "", stage = "all", status = "all", officer = "", agent = "", page = 1, pageSize = 20 } = filters;
  return queryOptions({
    queryKey: ["country-candidates", country, search, stage, status, officer, agent, page, pageSize] as const,
    staleTime: 30_000,
    queryFn: async ({ signal }): Promise<CountryCandidatesResponse> => {
      const params = new URLSearchParams({ country, search, stage, status, officer, agent, page: String(page), pageSize: String(pageSize) });
      const response = await fetch(`/api/country-candidates?${params}`, { signal });
      if (!response.ok) throw new Error("Could not load candidates. Please try again.");
      return response.json();
    },
  });
}

