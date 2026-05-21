# Profile Recommender

A Vite + React app with a serverless Claude proxy, ready to run locally and deploy to Vercel.

## Drop in your component
Replace `src/ProfileRecommender.jsx` with your real `profile_recommender__7_.jsx`
(keep its `export default`). If you call Claude from it, point the fetch at
`/api/recommend` so your API key stays on the server.

## Run locally (recommended: vercel dev)
This runs the React app AND the `/api` function together, exactly like production.

```powershell
npm install
npm install -g vercel        # one time, if you don't have the CLI
copy .env.example .env       # then paste your real key into .env
vercel dev
```

Open the URL it prints (usually http://localhost:3000).

> Plain `npm run dev` works too, but it does NOT serve `/api`, so the Claude
> call will fail. Use `vercel dev` when you want the API working.

## Deploy (same as your last project)
1. Put this folder in a new GitHub repo (GitHub Desktop → Add → create repo → publish).
2. Vercel dashboard → New Project → import the repo. It auto-detects Vite. Click Deploy.
3. Vercel → Project → Settings → Environment Variables → add
   `ANTHROPIC_API_KEY` with your key → redeploy.

Every `git push` after that auto-deploys.

## Key safety
`.env` is gitignored — your key is never committed. In production it lives only
in Vercel's env vars. The browser never sees it.
