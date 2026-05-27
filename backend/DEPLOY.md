# Backend Deployment Guide (Railway)

This document contains step-by-step instructions to deploy the BlindSpot Express backend to **Railway**.

---

## 1. Prerequisites
Before deploying, make sure you have:
*   A Railway account (linked to GitHub).
*   Your BlindSpot codebase pushed to a GitHub repository.

---

## 2. Step-by-Step Deployment Instructions

### Step 1: Create a Service on Railway
1. Log in to the **Railway Dashboard** and click **New Project**.
2. Select **Deploy from GitHub repo** and select your BlindSpot repository.
3. Once the service is added, Railway will trigger a deploy attempt. *Note: This initial deploy will fail because the root directory and environment variables are not yet configured. That is expected.*

### Step 2: Set the Root Directory
Because the backend sits in the `/backend` subdirectory of a monorepo, we must configure Railway to build and run from there:
1. Click on the newly created backend service block.
2. Go to the **Settings** tab.
3. Under the **General** section, locate the **Root Directory** field.
4. Set it to `/backend` and click **Save** (or press Enter).

Railway will automatically rebuild using `/backend` as the workspace context.

### Step 3: Add Environment Variables
1. Go to the **Variables** tab of the backend service.
2. Click **New Variable** (or use the raw editor) to add the following key-value pairs:

| Variable Name | Description | Example / Source |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Gemini API Auth Key | From your Google AI Studio |
| `SUPABASE_URL` | Supabase Database Endpoint | From your Supabase project settings |
| `SUPABASE_ANON_KEY` | Supabase Public/Anon API Key | From your Supabase project settings |
| `FRONTEND_URL` | Allowed CORS Origins | Set this to your Vercel deployment URL (e.g. `https://blindspot-frontend.vercel.app`) |

*Note: You do not need to set the `PORT` variable. Railway will automatically inject a dynamic `PORT` value which our server binds to via `process.env.PORT`.*

### Step 4: Redeploy
1. Go to the **Deployments** tab.
2. Click **Redeploy** on the latest deployment block or trigger a rebuild by pushing a commit.
3. The build log will show Nixpacks detecting Node.js and starting the server using `npm start`.
4. The deploy log should show:
   ```
   Server successfully started on port <PORT>
   ```

---

## 3. How CORS is Handled
We have configured a dynamic CORS policy in `server.js`:
*   If `FRONTEND_URL` is **not set** (e.g., local development), all origins are allowed.
*   If `FRONTEND_URL` **is set**, only the domains listed in `FRONTEND_URL` (comma-separated if multiple) and local development ports (`http://localhost:5173`) are allowed.
