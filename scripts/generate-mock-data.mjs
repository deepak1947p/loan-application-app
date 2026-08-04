import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const stageTargets = [
  ['Pending for Submission', 91],
  ['Lead Submitted', 87],
  ['Dedupe Pass', 82],
  ['Decision Trigger Initiate', 78],
  ['Decision Approved', 73],
  ['Offer Accepted', 68],
  ['KYC Approved', 61],
  ['Mandate Registered', 56],
  ['Agreement Signed', 49],
  ['Disbursement Initiated', 43],
  ['Disbursement', 36],
];
const firstNames = [
  'Aarav',
  'Aditi',
  'Aditya',
  'Ananya',
  'Arjun',
  'Avni',
  'Dev',
  'Diya',
  'Ishaan',
  'Ishita',
  'Kabir',
  'Kavya',
  'Manish',
  'Meera',
  'Neha',
  'Nikhil',
  'Priya',
  'Rahul',
  'Rohan',
  'Sanya',
  'Siddharth',
  'Tanvi',
  'Vihaan',
  'Zoya',
];
const lastNames = [
  'Agarwal',
  'Banerjee',
  'Bhat',
  'Chauhan',
  'Deshmukh',
  'Gupta',
  'Iyer',
  'Jain',
  'Joshi',
  'Kapoor',
  'Khanna',
  'Kulkarni',
  'Malhotra',
  'Mehta',
  'Menon',
  'Nair',
  'Patel',
  'Rao',
  'Shah',
  'Sharma',
  'Singh',
  'Verma',
  'Yadav',
];
const businesses = [
  'Aarohan',
  'BharatNest',
  'BluePeak',
  'CredoraX',
  'Finverge',
  'NexaWare',
  'NiroGenix',
  'Pragati',
  'Tatsam',
  'Vridhi',
  'YantraGrid',
  'Zentora',
];
const suffixes = [
  'Enterprises',
  'Foods',
  'Health',
  'Industries',
  'Labs',
  'Mobility',
  'Retail',
  'Solutions',
  'Systems',
  'Tech',
  'Ventures',
];
const loanTypes = ['Personal', 'Business', 'Home'];
const statuses = ['Pending', 'Under Review', 'Approved', 'Rejected'];
const assignees = [
  'Rahul Menon',
  'Neha Iyer',
  'Vikram Singh',
  'Asha Kulkarni',
  'Karan Mehta',
  'Sonal Desai',
];
const remarks = [
  'Documents received and queued for review',
  'Income verification in progress',
  'Bank statement analysis completed',
  'GST returns requested',
  'Credit assessment is underway',
  'Property verification scheduled',
  'Application meets initial policy checks',
  'Additional business proof requested',
  'Customer follow-up completed',
  'Final operations review pending',
];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'db.json');
const frontendOutput = resolve(root, 'public', 'data', 'db.json');
const records = [];
let sequence = 1;

for (const [workflowStage, count] of stageTargets) {
  for (let index = 0; index < count; index++, sequence++) {
    const isBusiness = sequence % 3 === 1;
    const applicantName = isBusiness
      ? `${businesses[sequence % businesses.length]} ${suffixes[(sequence * 3) % suffixes.length]}`
      : `${firstNames[sequence % firstNames.length]} ${lastNames[(sequence * 5) % lastNames.length]}`;
    const dayOffset = (sequence * 7) % 540;
    const date = new Date(Date.UTC(2026, 7, 1));
    date.setUTCDate(date.getUTCDate() - dayOffset);
    const loanType = loanTypes[sequence % loanTypes.length];
    const baseAmount = loanType === 'Home' ? 1800000 : loanType === 'Business' ? 500000 : 100000;
    records.push({
      id: `LA-2026-${String(sequence).padStart(6, '0')}`,
      applicantName,
      loanType,
      amount: baseAmount + ((sequence * 137000) % (loanType === 'Home' ? 7500000 : 3000000)),
      workflowStage,
      status:
        workflowStage === 'Pending for Submission'
          ? 'Pending'
          : ['Decision Approved', 'Offer Accepted', 'KYC Approved'].includes(workflowStage)
            ? 'Approved'
            : statuses[sequence % statuses.length],
      appliedDate: date.toISOString().slice(0, 10),
      creditScore: 560 + ((sequence * 17) % 281),
      assignedTo: assignees[(sequence * 3) % assignees.length],
      remarks: remarks[(sequence * 7) % remarks.length],
    });
  }
}

const actualCounts = Object.fromEntries(
  stageTargets.map(([stage]) => [
    stage,
    records.filter((record) => record.workflowStage === stage).length,
  ]),
);
if (records.length !== stageTargets.reduce((sum, [, count]) => sum + count, 0))
  throw new Error('Generated total does not match stage targets.');
if (
  new Set(Object.values(actualCounts)).size !== stageTargets.length ||
  Object.values(actualCounts).some((count) => count < 1 || count >= 100)
)
  throw new Error('Workflow counts must be unique and between 1 and 99.');
if (new Set(records.map((record) => record.id)).size !== records.length)
  throw new Error('Generated application IDs must be unique.');

const database = {
  applications: records,
  users: [
    {
      id: 'credit-manager-demo',
      email: 'dmi.credit.manager@demo.com',
      password: 'Credit@2026',
      role: 'CREDIT_MANAGER',
      displayName: 'Credit Manager',
    },
    {
      id: 'customer-demo',
      email: 'dmi.customer@demo.com',
      password: 'Customer@2026',
      role: 'CUSTOMER',
      displayName: 'DMI Customer',
    },
  ],
  customerDocuments: [],
};
await writeFile(output, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
await mkdir(dirname(frontendOutput), { recursive: true });
await writeFile(
  frontendOutput,
  `${JSON.stringify({ applications: records, customerDocuments: [] }, null, 2)}\n`,
  'utf8',
);
console.log(`Generated ${records.length} records at ${output}`);
console.log(`Generated password-free frontend data at ${frontendOutput}`);
console.table(actualCounts);
