# Deploying to Koyeb (Free Tier)

## One-time setup

### 1. Push to GitHub
Make sure your repo is on GitHub (public or private both work).

```bash
git add .
git commit -m "Add Koyeb deployment config"
git push
```

### 2. Create Koyeb account
Go to https://koyeb.com — sign up free, no credit card needed.

### 3. Create a new App
- Click **Create App** → **Deploy from GitHub**
- Connect your GitHub account and select this repo
- Branch: `main`

### 4. Configure the service
Koyeb will auto-detect Node.js. Set these manually:

| Setting | Value |
|---|---|
| Build command | `npm run build:prod` |
| Run command | `npm start` |
| Port | `3000` |

### 5. Set environment variables
In Koyeb dashboard → Environment Variables, add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | *(any long random string, e.g. 64 chars)* |
| `ADMIN_PASSWORD` | *(your chosen superadmin password)* |

> If you have your `login_credentials_master.csv` and want real users, copy its contents into an env var or use the Koyeb Secrets feature to mount it as a file. Otherwise the default `superadmin` user is created with `ADMIN_PASSWORD`.

### 6. Custom domain
- In Koyeb dashboard → Domains → Add custom domain
- Add a CNAME record at your DNS provider:
  ```
  CNAME  @  <your-app>.koyeb.app
  ```
  or for a subdomain:
  ```
  CNAME  assets  <your-app>.koyeb.app
  ```

### 7. Deploy
Click **Deploy**. First build takes ~3 minutes. Watch the logs for:
```
[init] No CSV found. Default superadmin created.
Kalike Unified Workspace server running at http://localhost:8000
```

Then visit your Koyeb URL and log in with:
- **User ID**: `superadmin`
- **Password**: whatever you set as `ADMIN_PASSWORD`

## ⚠️ SQLite persistence warning
Koyeb's free tier does **not** guarantee persistent disk across restarts.
The DB is rebuilt from seed JSON on every deploy (`npm run build:prod` runs `db:init`).
This means:
- Asset/grant data from `real_assets.json` and `grants.json` → always present
- Any data added via the UI → lost on restart/redeploy

**For permanent data persistence**, upgrade to Koyeb's paid tier (persistent volume) or migrate to Oracle Cloud Always Free (true VM with persistent disk).
