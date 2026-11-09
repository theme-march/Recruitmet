export type PassportFieldStatus = "validated" | "extracted" | "needs_review" | "not_found";
export type PassportFieldSource = "mrz" | "viz" | "inferred";

export interface PassportFieldDetail {
  value: string;
  status: PassportFieldStatus;
  source: PassportFieldSource;
  confidence?: number;
  notes?: string;
}

export interface MRZValidationSummary {
  found: boolean;
  docNumberValid: boolean;
  dobValid: boolean;
  expiryValid: boolean;
  compositeValid: boolean;
  rawLines: string[];
}

export interface PassportOCRData {
  passportNo: string;
  givenName: string;
  surname: string;
  fullName: string;
  dob: string;
  issueDate: string;
  expiryDate: string;
  sex: string;
  nationality: string;
  placeOfBirth: string;
  fatherName: string;
  motherName: string;
  spouseName?: string;
  nid: string;
  phone: string;
  address: string;
  alreadyExists: boolean;
  existingCandidateName?: string;
  fields: Record<string, PassportFieldDetail>;
  mrzValidation: MRZValidationSummary;
  rawText?: string;
}
