# Status Report: Thai Learning Platform

## Current State

### ✅ Completed

1. **Project Setup & Modern UI**
   - App runs locally on Vite + React with hot module replacement
   - Modern, mobile-friendly design system (Vanilla CSS, glassmorphism, responsive sidebar)
   - Drag-and-drop tiles powered by `@dnd-kit` for native touch support and smooth animations

2. **Data Extraction (Scraping) & Media Integration**
   - Node.js script parsed the legacy website's menu system (`tree_nodes.js`) and extracted **all exercises** (Units 1–54)
   - Old relative paths for images (`pix/...`) and sounds (`snd/...`) converted to absolute, working URLs
   - Lesson PDFs included in the content index (`content.json`)

3. **Dynamic App Structure**
   - Sidebar loads all extracted content packages with collapsible unit sections
   - Clicking "Lesson PDF" opens the native PDF directly in the app
   - Clicking an exercise opens the dynamic drag-and-drop module with working Thai symbols and audio playback

4. **Answer Validation**
   - "Check" button verifies all drag-and-drop assignments against the solution data
   - Correct answers highlighted in green with ✓, incorrect in red with ✕ and shake animation
   - Score display (X/Y correct) and "Try Again" button for retries
   - Full success state with 🎉 celebration

5. **Progress Tracking System**
   - Completed exercises automatically saved to `localStorage`
   - ✅ badges shown next to completed exercises in the sidebar
   - Per-unit progress bars and badges (e.g., `2/4`)
   - Overall progress bar at top of sidebar (`Progress: X / 206`)
   - **Export**: Base64-encoded progress code with copy-to-clipboard
   - **Import**: Paste code to restore progress on another device
   - **Link Sharing**: URL hash `#p=<base64>` for shareable progress links
   - **Reset**: Double-click confirmation to clear all progress

6. **Configurable Exercise Descriptions**
   - `exercises.json` allows setting a `defaultDescription` and per-exercise overrides
   - Description shown as the instruction hint above each drag-and-drop exercise
   - 206 exercises registered in the configuration file

7. **Docker Deployment & Hosting**
   - Multi-stage Dockerfile: Node 20 Alpine (build) → Nginx Alpine (serve), ~30MB image
   - Docker Compose with Traefik reverse proxy integration (shared-network, TLS labels)
   - Nginx config with SPA routing (`try_files` fallback), gzip compression, and static asset caching
   - **Media proxy** (`/media/` → `http://davidpi.totddns.com:42852/`) solves mixed content (HTTPS site loading HTTP resources)
   - `.dockerignore` excludes `node_modules`, `dist`, `.git` from build context
   - Live at **https://thai.srv1114667.hstgr.cloud**

8. **Git & CI**
   - Repository: [github.com/ewdob/ThaiLearningPlatform](https://github.com/ewdob/ThaiLearningPlatform) (private)
   - Deploy workflow: `git pull` → `docker compose up -d --build` on VPS

---

## Architecture Overview

| File | Purpose |
|---|---|
| `src/App.jsx` | Main app shell, routing, exercise config resolution |
| `src/components/DndExercise.jsx` | Drag-and-drop exercise with validation |
| `src/components/Sidebar.jsx` | Navigation, progress display, export/import panel |
| `src/hooks/useProgress.js` | Progress hook (localStorage, Base64, URL hash) |
| `src/assets/content.json` | Scraped exercise data (units, pages, media URLs via `/media/` proxy) |
| `exercises.json` | Configurable exercise descriptions |
| `src/index.css` | Complete design system (~900 lines) |
| `scrape.mjs` | Content extraction script |
| `Dockerfile` | Multi-stage production build |
| `docker-compose.yml` | Traefik-integrated container config |
| `nginx.conf` | SPA routing + media reverse proxy |

---

## Deployment Architecture

```
Browser (HTTPS)
  ↓
Traefik (port 443, TLS via Let's Encrypt)
  ↓
thailearning container (Nginx, port 80)
  ├── /           → static React app from /dist
  └── /media/*    → proxy to http://davidpi.totddns.com:42852/*
```

**VPS:** Hostinger KVM, Ubuntu 24.04 (`72.60.33.10`)
**Path on VPS:** `/docker/thailearning/`
**Network:** `shared-network` (shared with Traefik, n8n, Gitea)

---

## How to Run

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173/ in your browser.

### Production (VPS)

```bash
ssh root@72.60.33.10
cd /docker/thailearning
git pull
docker compose up -d --build
```
