# Buzz Comic

AI-powered manga/comic generation and publishing platform built with Next.js 16, Prisma, and BullMQ.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, standalone output)
- **Database**: MySQL (Xserver) / SQLite (local dev)
- **ORM**: Prisma 7
- **Auth**: NextAuth v5 (beta)
- **Queue**: BullMQ + Redis
- **Image processing**: Sharp, FFMPEG
- **AI**: FLUX.2 via fal.ai

---

## Local Development Setup

### Prerequisites

- Node.js 22+
- npm 10+
- (optional) Redis for BullMQ worker

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd buzz-comic-main

# 2. Install dependencies
npm ci

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# 5. (Optional) Seed the database
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string (production) or SQLite path (dev) |
| `NEXTAUTH_URL` | Yes | Full URL of the app, e.g. `https://yourdomain.xserver.jp` |
| `NEXTAUTH_SECRET` | Yes | Random secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as NEXTAUTH_URL (exposed to browser) |
| `GOOGLE_CLIENT_ID` | OAuth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth | Google OAuth client secret |
| `GOOGLE_SHEETS_ID` | Sheets | Google Spreadsheet ID for content management |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Sheets | Service account JSON (base64 or raw) |
| `FAL_API_KEY` | AI | fal.ai API key for FLUX.2 image generation |
| `REDIS_URL` | Worker | Redis connection URL for BullMQ (`redis://localhost:6379`) |
| `PORT` | Prod | HTTP port (default: `3000`) |
| `HOSTNAME` | Prod | Bind address (default: `0.0.0.0`) |

---

## Available Scripts

```bash
npm run dev          # Start local dev server (hot reload)
npm run build        # Production build
npm run start        # Start Next.js production server
npm run start:prod   # Start standalone server (for Xserver / Docker)
npm run lint         # Run ESLint
npm run deploy       # Build locally and deploy to Xserver via rsync + SSH
npm run db:seed      # Seed database with initial data
npm run worker       # Start BullMQ background worker
```

---

## Deployment (Xserver)

### First-time Xserver Setup

```bash
# Copy and run setup script on the remote server
ssh -p 10022 xs997058@sv16424.xserver.jp "bash -s" < scripts/setup-xserver.sh
```

The script will:
1. Verify / install Node.js 22 via nvm
2. Install PM2 globally
3. Create the application directory `/home/xs997058/buzz-comic/`
4. Create a PM2 `ecosystem.config.js`
5. Print MySQL setup commands
6. Create a `.env.example` template

After the setup script runs:

```bash
# 1. Create MySQL database via Xserver panel or SSH
# 2. Fill in /home/xs997058/buzz-comic/.env
# 3. Deploy
npm run deploy
```

### Automatic Deployment (GitHub Actions)

Push to `main` triggers `.github/workflows/deploy.yml`:
1. Checks out the repo
2. Installs Node.js 22 and runs `npm ci`
3. Runs `npm run build`
4. Transfers `.next/standalone/`, `.next/static/`, and `public/` via rsync
5. Runs `prisma migrate deploy` on the server
6. Restarts the PM2 process (`buzz-comic`)

### Manual Deployment

```bash
# Uses SSH key at ~/.ssh/xserver_deploy by default
npm run deploy

# Or use a custom SSH key path
SSH_KEY_PATH=~/.ssh/my_key npm run deploy
```

---

## GitHub Actions Secrets

Add the following secrets in your GitHub repository under **Settings > Secrets and variables > Actions**:

| Secret Name | Value |
|-------------|-------|
| `XSERVER_SSH_KEY` | Contents of `~/.ssh/xserver_deploy` (the private key) |
| `NEXTAUTH_URL` | `https://yourdomain.xserver.jp` |
| `NEXTAUTH_SECRET` | Output of `openssl rand -base64 32` |
| `DATABASE_URL` | `mysql://buzz_user:PASSWORD@localhost:3306/buzz_comic` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.xserver.jp` |

Optional secrets (needed if those features are enabled):

| Secret Name | Value |
|-------------|-------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_SHEETS_ID` | Google Spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account JSON |
| `FAL_API_KEY` | fal.ai API key |
| `REDIS_URL` | Redis connection URL |

---

## Docker (Optional)

```bash
# Build image
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://yourdomain.xserver.jp \
  -t buzz-comic .

# Run container
docker run -p 3000:3000 --env-file .env buzz-comic
```

---

## Items Requiring Confirmation Before Go-Live

The following require decisions or external setup before the app can be fully functional in production:

| Item | Status | Notes |
|------|--------|-------|
| **FLUX.2 (fal.ai) API key** | Needs setup | Sign up at https://fal.ai, generate API key, set `FAL_API_KEY` |
| **Google OAuth** | Needs setup | Create OAuth 2.0 credentials in Google Cloud Console; add the production domain to authorized redirect URIs |
| **Google Sheets integration** | Needs setup | Create service account, share the target sheet with the service account email, set `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_ID` |
| **Pricing / plans** | Needs decision | Subscription pricing and plan tiers have not been finalized |
| **Domain / SSL** | Needs setup | Configure the Xserver domain and obtain SSL certificate |
| **Redis on Xserver** | Needs setup | BullMQ requires a Redis instance; verify availability on the Xserver plan or provision a separate Redis service |
| **MySQL credentials** | Needs setup | Create the database and user on Xserver, update `.env` and GitHub secret `DATABASE_URL` |
| **NEXTAUTH_SECRET** | Needs setup | Generate and set as GitHub secret before first deploy |
| **Upload storage** | Needs decision | `/public/uploads/` and `/public/videos/` are excluded from git and rsync to avoid overwriting user files; a persistent storage or CDN strategy is recommended for production |
