import { resolve } from 'node:path';
import { App } from '@tinyhttp/app';
import { cors } from '@tinyhttp/cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { createApp } from '../node_modules/json-server/lib/app.js';

const port = Number(process.env.PORT ?? 3000);
const file = resolve(process.cwd(), 'db.json');
const db = new Low(new JSONFile(file), { applications: [], users: [], customerDocuments: [] });
await db.read();

const app = new App();
app.use(cors());
app.get('/application-summary', (_request, response) => {
  const applications = Array.isArray(db.data.applications) ? db.data.applications : [];
  const byWorkflowStage = {};
  for (const application of applications) {
    const stage = application.workflowStage;
    byWorkflowStage[stage] = (byWorkflowStage[stage] ?? 0) + 1;
  }
  response.json({ total: applications.length, byWorkflowStage });
});
app.use(createApp(db));

app.listen(port, () => {
  console.log(`DMI mock API listening at http://localhost:${port}`);
  console.log('Endpoints: /applications, /application-summary, /users, /customerDocuments');
});
