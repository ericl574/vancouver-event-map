# VanEvent — Vercel Deployment Guide

## Vercel Settings

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

## Required Environment Variables

Add these in the Vercel dashboard under **Project → Settings → Environment Variables**.
Set them for **Production**, **Preview**, and **Development** environments.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |
| `VITE_MAPBOX_TOKEN` | Your Mapbox public access token |

**Never commit `.env.local` or any env file to git.**

## HTTPS Requirement

Browser geolocation (`navigator.geolocation`) requires a **secure origin**:
- `https://` on any domain ✅
- `http://localhost` in local dev ✅
- Plain `http://` on an IP address ❌ (geolocation will be silently denied)

Vercel deployments are always HTTPS, which fixes the geolocation issue.

## Deploy Steps

1. Push this repo to GitHub (`main` branch).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the GitHub repo.
3. Vercel auto-detects Vite. Confirm the settings above.
4. Add the three environment variables listed above.
5. Click **Deploy**.
6. Your live URL will be `https://<project-name>.vercel.app`.

## Local Development

```bash
cp .env.local.example .env.local   # fill in your keys
npm install
npm run dev
```
