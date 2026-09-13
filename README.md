# Resolve — Customer Service Advisor Assistant

Paste a customer's message, get category / urgency / sentiment, and a draft reply grounded in your own knowledge base — with one-tap tone adjustments and an editable FAQ/policy library.

## How it's built

- **Frontend:** React + Vite, styled with Tailwind (loaded via CDN — no CSS build step)
- **Backend:** one Vercel serverless function, `api/claude.js`, which calls the Anthropic API. Your API key lives only on the server — it is never sent to the browser.
- **Storage:** browser `localStorage`. Each device/browser keeps its own knowledge base and case history — nothing is shared between users yet (see "Known limits" below).

## Run it locally

```bash
npm install
cp .env.example .env.local   # paste your Anthropic API key into .env.local
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Note: plain `vite dev` does **not** run the `/api` serverless function, so the AI features (Draft a reply, tone buttons) won't work with `npm run dev` alone. To test those locally too, install the Vercel CLI once (`npm i -g vercel`) and run `vercel dev` instead.

## Deploy to Vercel

1. Push this code to GitHub (see the commands your assistant gave you, or the section below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the `Customer-Service-Resolver` repo.
3. Vercel auto-detects it as a Vite project — leave the build settings on default.
4. **Before** clicking Deploy, add an environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: a key from <https://console.anthropic.com/settings/keys>
5. Click **Deploy**. You'll get a live `*.vercel.app` URL to share with testers.
6. From then on, every `git push` to `main` auto-redeploys.

## Pushing this folder to GitHub

```bash
git remote add origin https://github.com/itsabay00/Customer-Service-Resolver.git
git branch -M main
git add -A
git commit -m "Resolve: CS advisor assistant"
git push -u origin main
```

## Known limits (first version)

- **Not shared across a team yet.** The knowledge base and case history live in each browser's `localStorage`. If five advisors open the link, they each build up their own separate knowledge base. If you want one shared knowledge base for the whole team, that needs a small real database (e.g. Vercel KV or Supabase) instead of `localStorage` — worth doing once you've validated the concept with real users.
- **Real API usage.** Every "Draft a reply" or tone-adjust click is a real Anthropic API call billed to whichever key is set in `ANTHROPIC_API_KEY`. Keep an eye on <https://console.anthropic.com/settings/usage> while testing.
- **Customer data.** Whatever advisors paste into "Customer's message" is sent to the Anthropic API to generate the draft. Keep that in mind if you're testing with real customer messages.
