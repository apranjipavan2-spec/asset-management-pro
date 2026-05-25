# Kalike Asset Management - Startup Guide

Quick start the asset management app with one click!

---

## 🚀 Quick Start (3 Methods)

### Method 1: Batch File (Recommended for Windows Users)

**Double-click**: `START_APP.bat`

This will:
1. ✅ Check dependencies
2. ✅ Start Express API (port 3000)
3. ✅ Start Vite dev server (port 5173)
4. ✅ Display startup logs
5. ⚠️ You'll need to manually open `http://localhost:5173` in your browser

---

### Method 2: Batch File with Auto-Browser

**Double-click**: `START_APP_AUTO_BROWSER.bat`

This will:
1. ✅ Check dependencies
2. ✅ Start Express API (port 3000)
3. ✅ Start Vite dev server (port 5173)
4. ✅ **Automatically open browser** to `http://localhost:5173` (after 8 seconds)
5. ✅ Display startup logs

**Recommended choice!** ⭐

---

### Method 3: PowerShell Script

**Right-click** → **Run with PowerShell**: `START_APP.ps1`

Or from PowerShell:
```powershell
.\START_APP.ps1
```

This will:
1. ✅ Check dependencies
2. ✅ Start Express API (port 3000)
3. ✅ Start Vite dev server (port 5173)
4. ✅ **Automatically open browser** to `http://localhost:5173` (after 8 seconds)
5. ✅ Colored output for better readability

---

### Method 4: Manual Command Line

If you prefer using the terminal:

```bash
# From project directory
npm run dev:full

# Then open browser manually
# http://localhost:5173
```

---

## 📋 What Happens When You Start

### Servers Running
- **Express API**: http://localhost:3000
  - Handles all `/api/*` requests
  - Serves from `server.js`
  - Uses SQLite database

- **Vite Dev Server**: http://localhost:5173
  - Hot-reload frontend code
  - Proxies `/api` → `localhost:3000`
  - Serves from `src/main.js`

### Logs You'll See
```
[security] JWT_SECRET not set — using public dev fallback...
Kalike Unified Workspace server running at http://localhost:3000

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**This is normal.** The security warning is expected for development.

---

## 🔐 First Login

**Default Test Credentials**:
- **User ID**: `admin` (or any user in the database)
- **Password**: Run `npm run db:restore-employee-passwords` first if needed
- **Role**: Select from the login screen

See `login_credentials_master.csv` (gitignored) for actual test users.

---

## ⚙️ Startup Checklist

- [ ] `node` and `npm` are installed (`node -v` and `npm -v`)
- [ ] You're in the Kalike Asset directory
- [ ] `node_modules` exists (batch file auto-installs if missing)
- [ ] Ports 3000 and 5173 are available
- [ ] `.env` file exists (optional, defaults are fine for dev)

---

## 🐛 Troubleshooting

### Browser doesn't open automatically
- **Method 2 (auto-browser)** opens after 8 seconds. Wait a bit.
- If it doesn't work, manually visit: `http://localhost:5173`
- Check browser firewall/security settings

### "npm: command not found"
- Install Node.js from https://nodejs.org/ (v18+)
- Restart your terminal
- Try again

### Port 3000 or 5173 already in use
```bash
# Kill the process using the port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different ports
PORT=3001 npm run dev:full
```

### "node_modules not found" error
- The batch file auto-installs dependencies
- Or manually: `npm install`

### Database initialization fails
```bash
# Rebuild the database
npm run db:init

# Restore employee passwords (optional)
npm run db:restore-employee-passwords
```

### Vite not compiling
- Check `src/main.js` syntax
- Vite dev server auto-recovers (save the file to retry)
- Check browser console for errors (F12)

### Cannot connect to API
- Verify Express is running (look for "server running at" message)
- Check `/api/login` endpoint is responding
- Verify CORS is enabled
- Try `curl http://localhost:3000/api/login` from terminal

---

## 📁 Project Structure at Startup

```
Kalike/Asset/
├── server.js              (Express API)
├── src/
│   ├── main.js           (Vite entry point)
│   ├── pages/            (35 page modules)
│   ├── css/              (Tailwind styles)
│   └── mock/             (Database + fixtures)
├── db.sqlite             (SQLite database)
├── .codegraph/           (CodeGraph index)
└── node_modules/         (Dependencies)
```

---

## 🎮 Using the App

### Login Page
1. Select role: **Employee**, **Manager**, or **Admin**
2. Enter user ID
3. Enter password
4. Click "Authenticate"

### After Login
- **Employee Portal**: View and request assets
- **Asset Administrator**: Manage registry, transfers, maintenance
- **Finance Dashboard**: Depreciation, grants, asset ledger
- **HR/Manager**: Team management, audit logs

---

## ⏹️ Stopping the Servers

### Method 1: Terminal
- Press **Ctrl+C** in the terminal
- Confirms: "Terminate batch job (Y/N)?" → type `Y` → Enter

### Method 2: Task Manager
1. Press **Ctrl+Shift+Esc**
2. Find **node.exe** processes
3. Right-click → End Task

---

## 📝 Environment Configuration

### .env File (Optional)
Create `.env` in project root for custom configuration:

```env
# JWT secret (REQUIRED in production)
JWT_SECRET=your-secret-key-here

# Server port (default 3000)
PORT=3000

# Audit log retention (default 90 days)
AUDIT_RETENTION_DAYS=90
```

For development, defaults are fine.

---

## 🔗 Useful Links

| Link | Purpose |
|------|---------|
| http://localhost:5173 | The app |
| http://localhost:3000/api/audit | Audit logs |
| http://localhost:3000/api/assets | Asset registry API |
| `F12` in browser | Developer console (errors, logs) |

---

## 📊 Development Features Ready

- ✅ Hot-reload (save → instant update)
- ✅ CodeGraph indexing (code exploration)
- ✅ SQLite database (local, persists)
- ✅ Validation (zod schemas)
- ✅ Authentication (JWT + bcrypt)
- ✅ Audit logging (all actions tracked)

---

## 🎯 Next Steps

1. **Run**: Double-click `START_APP_AUTO_BROWSER.bat`
2. **Wait**: 8-10 seconds for servers to start
3. **Login**: Use test credentials
4. **Explore**: Navigate the asset management interface
5. **Code**: Make changes → auto-reloaded in browser
6. **Debug**: Press F12 to open developer console

---

## 💡 Tips

- **Hot-reload**: Changes to `src/` auto-appear in browser
- **Database**: Changes to `server.js` require server restart
- **CodeGraph**: Already indexed; ask Claude questions about code
- **Logs**: Check browser console (F12) and terminal for errors

---

## ❓ Need Help?

- Check CLAUDE.md for architecture
- See VERIFICATION_REPORT.md for recent changes
- Review CODEGRAPH_INSTALLATION_LOG.md for code indexing
- Open issue if something is broken

---

**That's it!** You're ready to start. Double-click `START_APP_AUTO_BROWSER.bat` and you're live in 10 seconds. 🎉
