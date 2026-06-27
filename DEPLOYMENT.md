# Deploying This App To Vercel with Supabase

This Next.js application has been migrated from local JSON/MySQL storage to PostgreSQL on Supabase via Prisma.

## Project Settings on Vercel

If deploying from the GitHub repo root, set Vercel's **Root Directory** to:

```text
todo-next
```

**Framework Preset:** Next.js

**Build Command:**
To ensure your database schema is pushed to Supabase during deployment, set the build command to:
```text
npx prisma db push && npm run build
```

**Install Command:**
```text
npm install
```

## Required Environment Variables

You must add the following environment variable in your Vercel Project Settings under **Settings -> Environment Variables**:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.liykoignyksydygunslj.supabase.co:5432/postgres
```

Make sure to replace `YOUR_PASSWORD` with the password of your Supabase database. Note that if your password contains special characters (like `@`), they must be URL-encoded (e.g., `@` becomes `%40`).

## Local Development vs Production

- **Vercel Runtime:** The Vercel runtime environment fully supports IPv6 routing, meaning it will connect directly to your Supabase host `db.liykoignyksydygunslj.supabase.co` on the default port `5432` without issues.
- **Local Development:** If your local development environment does not support IPv6 routing, direct connection might fail. If so, enable Supabase Connection Pooling (Supavisor) in the Supabase Dashboard, and use the pooler connection string (port 6543 or 5432 with pooler host).
