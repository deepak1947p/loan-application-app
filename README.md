# DMI Finance Loan Operations & Customer KYB Demo

Self-contained Angular 21 standalone application with role-based demo access, a Credit Manager
loan dashboard, and a mobile-first Customer KYB flow. It uses strict TypeScript, SCSS, Reactive
Forms, Signals, RxJS, Router guards, and `HttpClient` without requiring a deployed backend.

## Install and run

Requires Node.js 20.19+, 22.12+, or 24+.

```bash
npm install
npm start
```

Open `http://localhost:4200`. The application loads its data from the bundled
`public/data/db.json` asset. No API server is required.

The deterministic generator recreates the root reference database and the password-free frontend
asset:

```bash
npm run generate:mock-data
```

The legacy `npm run mock:api` and `npm run start:all` commands remain available only as optional
local-development references. They are not used by the frontend or GitHub Pages deployment.

## Frontend mock API architecture

`MockApiService` loads `data/db.json` through Angular `HttpClient`, validates the response, and
caches the base collection with `shareReplay(1)`. Feature services retain asynchronous,
Observable-based API contracts:

- `getApplications(query)` returns `PaginatedResponse<LoanApplication>`;
- `getApplicationSummary()` calculates totals from the complete merged collection;
- `getApplicationById(id)` returns one record;
- `updateApplication(id, changes)` simulates a PATCH;
- Customer document methods simulate GET and POST operations.

The application service applies operations in this order:

1. workflow stage;
2. debounced global search;
3. application ID, status, loan type, and amount range;
4. applied-date range;
5. numeric or date sorting;
6. page calculation and slicing.

Only the requested page is returned to the component. Table totals and total pages come from the
API-shaped response, while dashboard cards are calculated from the full merged dataset. URL-backed
pagination restores the current page and page size after refresh and supports browser Back/Forward.

Mock timing is centralized in `src/app/core/services/mock-api.config.ts`. Normal reads, writes,
login transitions, skeletons, error states, Retry behavior, and request cancellation remain visible
for demonstration purposes.

## Local persistence and reset

The bundled JSON is read-only at runtime. Status changes are saved as compact record overrides in:

```text
dmi-demo-application-overrides-v1
```

Customer document metadata is stored in:

```text
dmi-demo-customer-documents-v1
```

Only metadata is stored; selected file binary contents are never persisted. The **Reset Demo Data**
action in the authenticated user menu clears both keys and reloads the original bundled dataset.

To demonstrate deterministic errors, add one of these query parameters before the hash route:

```text
?mockError=applications
?mockError=summary
?mockError=updates
?mockError=documents
```

Normal usage never fails randomly.

## Demo credentials

| Role           | Username                      | Password        | Route                |
| -------------- | ----------------------------- | --------------- | -------------------- |
| Credit Manager | `dmi.credit.manager@demo.com` | `Credit@2026`   | `/manager/dashboard` |
| Customer       | `dmi.customer@demo.com`       | `Customer@2026` | `/customer/kyb`      |

Credentials are demo-only and are deliberately kept out of the downloadable static JSON asset.
The browser session stores only `email`, `displayName`, and `role` in `sessionStorage`; it never
stores the password. Frontend authentication and route guards are demonstration controls, not a
production security boundary.

## Routes

- `/login` — guests only
- `/manager/dashboard` — `CREDIT_MANAGER`
- `/customer/kyb` — `CUSTOMER`
- `/unauthorized` — authenticated access-denied screen

Hash routing makes direct navigation and refresh reliable on GitHub Pages:

```text
https://deepak1947p.github.io/loan-application-app/#/login
https://deepak1947p.github.io/loan-application-app/#/manager/dashboard
https://deepak1947p.github.io/loan-application-app/#/customer/kyb
```

Pagination parameters remain inside the hash URL, for example
`#/manager/dashboard?page=4&pageSize=10`.

## Tests and production build

```bash
npm test -- --watch=false
npm run build -- --configuration production
```

The browser artifact is generated at:

```text
dist/loan-application-dashboard/browser
```

To verify a repository subpath locally:

```bash
npm run build -- --configuration production --base-href "/loan-application-app/"
```

The generated index then contains `<base href="/loan-application-app/">`, and the data request
resolves to `/loan-application-app/data/db.json`.

## GitHub Pages deployment

`.github/workflows/deploy-pages.yml` installs locked dependencies, runs tests, derives the base href
from the repository name, builds the application, uploads
`dist/loan-application-dashboard/browser`, and deploys using official GitHub Pages actions.

Configure the repository once:

```text
Settings → Pages → Source: GitHub Actions
```

Expected deployment URL:

```text
https://deepak1947p.github.io/loan-application-app/
```

No CORS configuration, Render service, hosted Node process, or external API is required.

## Demo limitations

- Authentication and authorization are frontend demonstrations only.
- Browser-local updates are specific to the current origin and browser profile.
- Clearing site storage removes saved status changes and Customer document metadata.
- Different visitors do not share updates.
- The optional legacy mock server is not part of the GitHub Pages runtime.
