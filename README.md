# DMI Finance Loan Operations & Customer KYB Demo

Angular 21 standalone application with role-based demo access, a Credit Manager loan dashboard, and a mobile-first Customer KYB flow. The application uses strict TypeScript, SCSS, Reactive Forms, Signals, RxJS, Angular Router guards, `HttpClient`, and a local `json-server` REST API.

## Install and run

Requires Node.js 20.19+, 22.12+, or 24+.

```bash
npm install
npm run generate:mock-data
```

Start the API and Angular together (recommended):

```bash
npm start
```

Or use separate terminals:

```bash
npm run mock:api
npm run start:app
```

`npm run start:all` is retained as an alias for `npm start`.

- Angular: `http://localhost:4200`
- Mock API: `http://localhost:3000`
- Development API: `http://localhost:3000`
- Production API: `https://dmi-loan-mock-api.onrender.com`
- API base URLs are configured in `src/environments/environment.ts` and
  `src/environments/environment.production.ts`. Angular replaces the development file during a
  production build.

## Mock REST endpoints

- `GET /applications?_page=1&_per_page=9` — a filtered and sorted application page
- `GET /application-summary` — dynamic complete-dataset workflow totals
- `GET /applications/:id` — one application
- `PATCH /applications/:id` — persist status or other application changes
- `GET /users?email=...` — demo credential lookup
- `POST /customerDocuments` — persist Customer KYB file metadata

`db.json` contains `applications`, `users`, and `customerDocuments`. The deterministic generator recreates the 724 application records and resets submitted Customer documents:

```bash
npm run generate:mock-data
```

Every workflow stage has a unique total below 100. The mock wrapper uses the installed `json-server` 1.x `_page`/`_per_page` format and adds the computed `/application-summary` endpoint.

## Demo credentials

| Role           | Username                      | Password        | Route                |
| -------------- | ----------------------------- | --------------- | -------------------- |
| Credit Manager | `dmi.credit.manager@demo.com` | `Credit@2026`   | `/manager/dashboard` |
| Customer       | `dmi.customer@demo.com`       | `Customer@2026` | `/customer/kyb`      |

Passwords are compared only during the mock API login flow. The active browser session stores only `email`, `displayName`, and `role` in `sessionStorage`; it never stores the password.

> `json-server` and Angular route guards are demonstration tools, not security boundaries. Production authentication and authorization must be implemented and enforced by a secure backend. Production APIs must never expose password records to a browser.

## Data and update behavior

`LoanApplicationService` normalizes the version-specific pagination body into `PaginatedResponse<T>`. `LoanDataService` owns the query state and a cancellable `switchMap` pipeline. The API applies operations in this order:

1. selected workflow stage;
2. debounced global search;
3. application ID, status, loan type, and amount filters;
4. applied-date range;
5. numeric/date sorting;
6. `_page` and `_per_page` pagination.

Only the current page is retained and rendered. Table totals use API pagination metadata, while dashboard cards use `/application-summary`. Page or filter changes cancel obsolete HTTP requests. A successful status PATCH refreshes both the summary and current server page.

Manager pagination is URL-backed, for example `/manager/dashboard?page=4&pageSize=10`. The route is normalized before the first API request, so refresh, bookmarks, and browser Back/Forward restore the correct server page without an initial page-one request. Supported page sizes are `5`, `9`, `10`, and `20`; invalid values fall back to `9`.

The dashboard shows skeletons while `GET /applications` is pending, an API error with Retry when it fails, and a dedicated empty state for an empty collection. A status confirmation sends `PATCH /applications/:id`; local state changes only after success. Failed updates retain the drawer and original data and show a retryable error.

`CustomerDocumentService` sends metadata only. File binary content stays in browser memory. A successful `POST /customerDocuments` stores customer email, document type/number, file name, size, MIME type, and submission time. Submission actions show a disabled/loading state; failures keep the confirmation sheet and form state available for retry.

## Routes and authorization

- `/login` — guests only
- `/manager/dashboard` — `CREDIT_MANAGER`
- `/customer/kyb` — `CUSTOMER`
- `/unauthorized` — authenticated access-denied screen

Functional guards restore a valid minimal session after refresh and enforce role access. Logout uses the shared accessible confirmation dialog before clearing the session.

The application uses Angular hash routing so static GitHub Pages hosting can refresh and open
protected routes without an origin-side SPA fallback. Deployed URLs therefore use this format:

```text
https://deepak1947p.github.io/loan-application-app/#/login
https://deepak1947p.github.io/loan-application-app/#/manager/dashboard
https://deepak1947p.github.io/loan-application-app/#/customer/kyb
```

Pagination and filter query parameters remain supported after the hash route, for example
`#/manager/dashboard?page=4&pageSize=10`.

## Tests and production build

```bash
npm test
npm run build
```

HTTP tests use Angular's `HttpTestingController` for fetch, failure, PATCH, authentication lookup, and Customer document POST behavior. State tests cover retry, empty responses, successful derived-state recalculation, and no local mutation after update failure.

## Production build

Create an optimized Angular build with:

```bash
npm run build -- --configuration production
```

The browser bundle is written to `dist/loan-application-dashboard/browser`. The production build
uses the deployed Render API at `https://dmi-loan-mock-api.onrender.com`.

To simulate a repository subpath locally, build with a representative base href:

```bash
npm run build -- --configuration production --base-href "/loan-application-app/"
```

The generated `dist/loan-application-dashboard/browser/index.html` will then contain
`<base href="/loan-application-app/">`. Static assets use base-relative paths and remain valid under
the repository subpath.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy-pages.yml` installs locked dependencies, runs the test
suite, builds with a base href derived from the GitHub repository name, uploads
`dist/loan-application-dashboard/browser`, and deploys it with the official GitHub Pages actions.

After pushing the workflow, configure the repository once:

```text
Settings → Pages → Source: GitHub Actions
```

The expected frontend URL is:

```text
https://deepak1947p.github.io/loan-application-app/
```

The Render API must allow the GitHub Pages origin through CORS:

```text
https://deepak1947p.github.io
```

The origin does not include the repository path. Verify the deployment by opening `/#/login`,
signing in with each demo role, refreshing the protected hash routes, changing dashboard pages,
and submitting Customer KYB document metadata.

The mock server is intended only for local evaluation. It stores PATCH and document-metadata changes directly in `db.json`, so run `npm run generate:mock-data` to restore the deterministic baseline.

## Mock API limitations

- No real authentication, tokens, authorization, encryption, or audit controls.
- Concurrent edits and database constraints are not modeled.
- Regenerating `db.json` resets PATCH changes and submitted document metadata.
- Render services may need a short warm-up after inactivity; the frontend keeps its loading and
  retry states while waiting for the initial response.
- Mock API writes are not durable production storage. Render redeploys, restarts, or ephemeral
  filesystem resets may discard status changes and submitted document metadata.
- CORS must be configured on the Render API for the GitHub Pages origin. The frontend does not use
  insecure CORS proxies or `no-cors` workarounds.
