export type Requirement={type:string;reference:string;required:boolean};
export type WorkflowFacts={verifiedDocuments:number;paidPayments:number;approvals:number};
export function unmetRequirements(requirements:Requirement[],facts:WorkflowFacts){return requirements.filter(r=>r.required).filter(r=>r.type==="DOCUMENT"?facts.verifiedDocuments<1:r.type==="PAYMENT"?facts.paidPayments<1:r.type==="APPROVAL"?facts.approvals<1:false).map(r=>r.reference)}
export function isTerminalStatus(status:string){return ["COMPLETED","RETURNED","EXPIRED","ARCHIVED"].includes(status)}
