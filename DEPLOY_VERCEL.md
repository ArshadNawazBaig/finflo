# FinFlo on Vercel

The repository deploys as one Vercel project: the Vite build is served from
`public`, and `/api/*` is handled by `api/index.js`. MongoDB Atlas, Cloudinary,
email, payment and notification providers remain external services.

## Import

1. Dismiss the automatic two-directory import suggestion.
2. Add New > Project > import `ArshadNawazBaig/finflo`.
3. Select the repository root (`./`), framework **Other**, and branch `main`.
4. Leave build overrides unset: `vercel.json` supplies `npm ci --include=dev`,
   `npm run build:vercel`, and output directory `public`. Use Node.js **22.x**.
5. Use a Pro project for commercial production use and precise cron schedules.
6. Add the environment variables below before deploying. Start with a separate
   test database and sandbox provider credentials; do not connect previews to
   the production database.
7. Keep **Enable access to System Environment Variables** enabled. The backend
   uses Vercel's environment marker to disable persistent listeners and to
   restrict cron execution to Production.

The Vercel build automatically selects HTTP event polling and signed direct
uploads, and uses same-origin `/api` requests. Do not configure a Railway URL
in `VITE_BACKEND_URL`. Normal `npm run build` and local development retain
Socket.IO and traditional multipart uploads.

## Environment variables

Enter values in Vercel Project Settings > Environment Variables. Mark private
values Sensitive. Environment files are ignored by Git and Vercel uploads.
Never prefix a password, signing key or private API credential with `VITE_`.

| Name | Value/source |
| --- | --- |
| `NODE_ENV` | `production` |
| `TZ` | `Asia/Karachi` |
| `MONGO_URI` | Atlas connection string for the selected environment; transactions require a replica set |
| `JWT_SECRET` | Existing strong secret, at least 32 characters |
| `REFRESH_TOKEN_SECRET` | Preserve the existing value if configured; otherwise the JWT secret is used |
| `ENCRYPTION_KEY` | Preserve the exact existing production value when using existing encrypted data |
| `CLIENT_URL` | Final frontend origin, e.g. `https://app.finflo.org` |
| `BACKEND_URL` | Same origin for the combined deployment |
| `CRON_SECRET` | New random value of at least 32 characters |
| `VERCEL_CRON_ENABLED` | `false` during testing and while Railway still runs scheduled jobs |
| `RUN_CRON` | `false`; Vercel also disables in-process scheduling unconditionally |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Existing Cloudinary account settings |
| `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | Existing server OAuth client IDs |
| `VITE_GOOGLE_WEB_CLIENT_ID` | Public web OAuth client ID, needed at build time |
| `VITE_GOOGLE_ANDROID_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | Existing public client IDs if used by the native app |

Also transfer the existing variables for enabled integrations: Stripe keys,
webhook secret and price IDs; SMTP or Resend; sender email/name; Raast/Alfalah;
Telnyx; FCM; and Sentry. See `apps/server/.env.example` and the variable names
in the local server environment file. Preserve multiline `FCM_PRIVATE_KEY`
formatting. Do not copy Vercel-generated OIDC tokens or a local `PORT` value.

Set production credentials only in the Production environment. After changing
an environment variable, redeploy. Atlas must allow the deployment's network
access; use the narrowest network configuration supported by your hosting plan.

## Verify before moving traffic

1. Open `/api/health`: expect `status: ok`, `db: 1`, and `jobs.enabled: false`.
2. Test user/member login, Google login, refresh after page reload, logout and
   session revocation using test accounts.
3. Test a loan document upload larger than 4.5 MB (but within its 5 MB limit),
   multiple attachments, a voice message, CSV import and OCR. Files upload
   directly to Cloudinary. Original server-side file and ownership limits remain.
4. Use two authenticated browsers to check chat edits/deletes, notifications,
   typing, presence and branding updates. Polling runs every five seconds while
   the tab is visible, with retry backoff and a 24-hour event retention window.
5. Confirm user/tenant data is isolated, and test the financial workflows against
   test data. Confirm Stripe webhook signature verification in test mode.
6. Add `finflo.org` and `app.finflo.org` in Settings > Domains. Update Google
   authorized origins and any provider webhook URLs before switching traffic.

## Activate scheduled jobs

The 16 schedules are checked into `vercel.json`. Pakistan schedules are
converted to UTC; the legacy customer reminder keeps its original midnight UTC
schedule. Monthly distribution ticks daily at 22:00 UTC and only executes on
the first Pakistan calendar day. Cron routes require the `CRON_SECRET` bearer
header. Preview deployments cannot execute them.

1. Back up the production database and confirm its existing encryption key.
2. Disable scheduled jobs on Railway (`RUN_CRON=false`) and restart that service.
   Wait for any already-running jobs to finish before the handover. Switch away
   from a scheduled execution window to avoid running that day's job twice.
3. On Vercel Production, set `VERCEL_CRON_ENABLED=true` and redeploy.
4. Verify runs in Vercel's Cron Jobs/logs and `/api/health` after their scheduled
   times. A healthy deployment with cron disabled does not prove jobs ran.
5. Retire the old service only after the new app and scheduled jobs are verified.

Each job claims a unique `{job}:{calendar-date}` record in MongoDB `cronruns`.
Repeated invocations cannot replay that job for the day. Failed or interrupted
runs are visible in health and are **not automatically retried**: some existing
jobs perform multiple financial writes, so a crash can leave partial work.
Reconcile the affected records before an operator authorizes any recovery.
Do not delete a run record just to retry it. Functions have a 300-second budget;
if a workload outgrows this, split it into durable batches before increasing volume.

## Rollback

Disable Vercel cron first. Wait for active jobs to finish, revert traffic to the
previous service, and only then re-enable its scheduler. Review the day's run
records before resuming to avoid duplicate processing. Deployment rollback must
not change `ENCRYPTION_KEY` or restore an outdated database over live writes.

## References

For a local packaging check after linking a test project, run
`vercel build --prod --standalone`, then
`node scripts/smoke-vercel-bundle.js`. The smoke test uses a disposable MongoDB
replica set and dummy integration keys, never your production database.

- [Vercel Functions](https://vercel.com/docs/functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel function limits](https://vercel.com/docs/functions/limitations)
- [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Cloudinary signed uploads](https://cloudinary.com/documentation/upload_images)
