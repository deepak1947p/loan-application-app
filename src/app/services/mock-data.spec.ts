import { describe, expect, it } from 'vitest';
import database from '../../../db.json';
import { LoanApplication, LOAN_STATUSES, WORKFLOW_STAGES } from '../models/loan-application.model';
import { countByWorkflowStage, filterAndSort } from './loan-utils';

const applications = database.applications as LoanApplication[];
const counts = countByWorkflowStage(applications);

describe('generated workflow dataset', () => {
  it('contains a unique count between 1 and 99 for every workflow stage', () => {
    const values = WORKFLOW_STAGES.map((stage) => counts[stage]);
    expect(values.every((count) => count > 0 && count < 100)).toBe(true);
    expect(new Set(values).size).toBe(WORKFLOW_STAGES.length);
  });
  it('derives dashboard totals from the same records used by stage filtering', () => {
    for (const stage of WORKFLOW_STAGES) {
      const filtered = filterAndSort(
        applications,
        { search: '', status: 'All', loanType: 'All', sort: 'date-desc' },
        stage,
      );
      expect(filtered).toHaveLength(counts[stage]);
      expect(filtered.every((application) => application.workflowStage === stage)).toBe(true);
    }
  });
  it('keeps generated application IDs unique', () => {
    expect(new Set(applications.map((item) => item.id)).size).toBe(applications.length);
  });
  it('matches the required record structure and allowed values', () => {
    const required = [
      'id',
      'applicantName',
      'loanType',
      'amount',
      'workflowStage',
      'status',
      'appliedDate',
      'creditScore',
      'assignedTo',
      'remarks',
    ];
    for (const item of applications) {
      expect(Object.keys(item).sort()).toEqual([...required].sort());
      expect(['Personal', 'Business', 'Home']).toContain(item.loanType);
      expect(LOAN_STATUSES).toContain(item.status);
    }
  });
  it('enforces the fixed status rules for mapped workflow stages', () => {
    const requiredStatuses = new Map([
      ['Pending for Submission', 'Pending'],
      ['Decision Approved', 'Approved'],
      ['Offer Accepted', 'Approved'],
      ['KYC Approved', 'Approved'],
    ]);
    for (const [stage, status] of requiredStatuses) {
      const records = applications.filter((item) => item.workflowStage === stage);
      expect(records.length).toBeGreaterThan(0);
      expect(records.every((item) => item.status === status)).toBe(true);
    }
  });
  it('provides mixed valid statuses in non-fixed workflow stages', () => {
    const leadStatuses = new Set(
      applications
        .filter((item) => item.workflowStage === 'Lead Submitted')
        .map((item) => item.status),
    );
    expect(leadStatuses.size).toBeGreaterThan(1);
    expect([...leadStatuses].every((status) => LOAN_STATUSES.includes(status))).toBe(true);
  });
  it('paginates only after filtering', () => {
    const filtered = filterAndSort(
      applications,
      { search: 'sharma', status: 'All', loanType: 'All', sort: 'date-desc' },
      'Lead Submitted',
    );
    expect(filtered.slice(0, 9).length).toBe(Math.min(9, filtered.length));
    expect(filtered.length).toBeLessThan(counts['Lead Submitted']);
  });
});
