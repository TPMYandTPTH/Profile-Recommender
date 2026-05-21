# Profile Recommender

A Vite + React static app. Users supply their own Anthropic API key (stored in
their browser, never on a server), so there is **no backend and no env var to set**.

## Run locally
```powershell
npm install
npm run dev
```
Open the URL it prints. On first use, paste an Anthropic key in the settings panel.

## Deploy to Vercel
1. Push to GitHub (GitHub Desktop).
2. Vercel -> New Project -> import the repo -> Deploy. It auto-detects Vite.
3. That's it - no environment variables needed.

Every `git push` auto-deploys.

## Key handling
Each user pastes their own key; it lives only in that browser's localStorage and
is billed to that user's own Anthropic account. Do not hardcode a key in the code
or commit one to the repo.
