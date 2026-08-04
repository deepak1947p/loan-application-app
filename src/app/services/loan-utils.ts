import {
  LoanApplication,
  LoanFilters,
  LoanSummary,
  WorkflowStage,
  LOAN_STATUSES,
  WORKFLOW_STAGES,
} from '../models/loan-application.model';
export function countByWorkflowStage(
  items: readonly LoanApplication[],
): Record<WorkflowStage, number> {
  const counts = Object.fromEntries(WORKFLOW_STAGES.map((stage) => [stage, 0])) as Record<
    WorkflowStage,
    number
  >;
  for (const item of items) counts[item.workflowStage]++;
  return counts;
}
export function summarize(items: readonly LoanApplication[]): LoanSummary {
  const counts = Object.fromEntries(LOAN_STATUSES.map((s) => [s, 0])) as LoanSummary['counts'];
  for (const item of items) counts[item.status]++;
  return {
    total: items.length,
    pipeline: items.reduce((sum, item) => sum + item.amount, 0),
    approvalRate: items.length ? (counts.Approved / items.length) * 100 : 0,
    counts,
  };
}
export function matchesAppliedDateRange(
  appliedDate: string,
  fromDate?: string,
  toDate?: string,
): boolean {
  return (!fromDate || appliedDate >= fromDate) && (!toDate || appliedDate <= toDate);
}
export function filterAndSort(
  items: readonly LoanApplication[],
  filters: LoanFilters,
  workflowStage?: WorkflowStage | null,
): LoanApplication[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const applicationId = (filters.applicationId ?? '').trim().toLocaleLowerCase();
  const amountRangeValid =
    (filters.minAmount == null || filters.minAmount >= 0) &&
    (filters.maxAmount == null || filters.maxAmount >= 0) &&
    (filters.minAmount == null ||
      filters.maxAmount == null ||
      filters.minAmount <= filters.maxAmount);
  return items
    .filter((item) => {
      const searchable = [
        item.applicantName,
        item.id,
        item.loanType,
        item.status,
        item.workflowStage,
        item.assignedTo,
        item.remarks,
        item.appliedDate,
        String(item.amount),
        item.amount.toLocaleString('en-IN'),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        (!workflowStage || item.workflowStage === workflowStage) &&
        (!query || searchable.includes(query)) &&
        (!applicationId || item.id.toLocaleLowerCase().includes(applicationId)) &&
        (filters.status === 'All' || item.status === filters.status) &&
        (filters.loanType === 'All' || item.loanType === filters.loanType) &&
        (!amountRangeValid || filters.minAmount == null || item.amount >= filters.minAmount) &&
        (!amountRangeValid || filters.maxAmount == null || item.amount <= filters.maxAmount) &&
        matchesAppliedDateRange(item.appliedDate, filters.fromDate, filters.toDate)
      );
    })
    .sort((a, b) => {
      if (filters.sort === 'amount-asc') return a.amount - b.amount;
      if (filters.sort === 'amount-desc') return b.amount - a.amount;
      const result = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      return filters.sort === 'date-asc' ? result : -result;
    });
}
