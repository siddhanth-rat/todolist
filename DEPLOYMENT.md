# Deploying This App To Vercel

This app is now a Next.js-only app. Do not run the old Express `server.js` for deployment.

## Project Settings

If deploying from the GitHub repo root, set Vercel's Root Directory to:

```text
todo-next
```

Framework preset: Next.js

Build command:

```text
npm run build
```

Install command:

```text
npm install
```

Output directory: leave blank/default.

## Required Environment Variables

Use your Aiven MySQL database for production. Add these in Vercel under:

Project -> Settings -> Environment Variables

Recommended single URL form:

```env
DATABASE_URL=mysql://avnadmin:YOUR_AIVEN_PASSWORD@mysql-todo-123-gradding-a5c3.j.aivencloud.com:25801/defaultdb
MYSQL_SSL=true
```

Alternative separate form:

```env
MYSQL_HOST=mysql-todo-123-gradding-a5c3.j.aivencloud.com
MYSQL_PORT=25801
MYSQL_USER=avnadmin
MYSQL_PASSWORD=YOUR_AIVEN_PASSWORD
MYSQL_DATABASE=defaultdb
MYSQL_SSL=true
```

## Important

The old `Demo html/To do list project/server.js` contains a hardcoded database password. Rotate that password in Aiven before deploying publicly.

Local development without database env vars uses `data/db.json`. Vercel production must use Aiven/MySQL because serverless file writes are not persistent.
