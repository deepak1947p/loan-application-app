export const LOAN_TYPES = ['Personal', 'Business', 'Home'] as const;
export const LOAN_STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected'] as const;
export const WORKFLOW_STAGES = [
  'Pending for Submission',
  'Lead Submitted',
  'Dedupe Pass',
  'Decision Trigger Initiate',
  'Decision Approved',
  'Offer Accepted',
  'KYC Approved',
  'Mandate Registered',
  'Agreement Signed',
  'Disbursement Initiated',
  'Disbursement',
] as const;
export type LoanType = (typeof LOAN_TYPES)[number];
export type ApplicationStatus = (typeof LOAN_STATUSES)[number];
export type LoanStatus = ApplicationStatus;
export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
export type SortOption = 'date-desc' | 'date-asc' | 'amount-asc' | 'amount-desc';
export interface LoanApplication {
  id: string;
  applicantName: string;
  loanType: LoanType;
  amount: number;
  workflowStage: WorkflowStage;
  status: LoanStatus;
  appliedDate: string;
  creditScore: number;
  assignedTo: string;
  remarks: string;
}
export interface LoanFilters {
  search: string;
  applicationId?: string;
  status: LoanStatus | 'All';
  loanType: LoanType | 'All';
  minAmount?: number | null;
  maxAmount?: number | null;
  sort: SortOption;
  fromDate?: string;
  toDate?: string;
}
export interface LoanSummary {
  total: number;
  pipeline: number;
  approvalRate: number;
  counts: Record<LoanStatus, number>;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApplicationQuery {
  page: number;
  pageSize: number;
  workflowStage?: WorkflowStage;
  status?: ApplicationStatus;
  loanType?: LoanType;
  search?: string;
  applicationId?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  sortField?: 'amount' | 'appliedDate';
  sortDirection?: 'asc' | 'desc';
}

export interface ApplicationSummary {
  total: number;
  byWorkflowStage: Record<WorkflowStage, number>;
}
