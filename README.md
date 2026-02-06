# Valentine Anagram Game

A cute, mobile-first anagram game built with Next.js (App Router), TypeScript, and Tailwind CSS. The experience is local-only (no backend) and ends with a reveal: **“Will you be my Valentine?”**

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Configuration

Edit `lib/gameConfig.ts` to switch modes or personalize the player name.

Edit `lib/puzzles.ts` to update the anagram list and rewards.

## Word Hunt Dictionary

The word hunt stage downloads a large, common-usage word list at runtime to
validate swiped words (filtered to avoid short interjections). If you need the
experience to work fully offline, swap the dictionary URL in
`lib/wordHunt.ts` for a local file in `public/`.

## Troubleshooting npm install (403 Forbidden)

A `403` from the npm registry typically means your environment is blocked from the public registry or is pointing at a restricted registry/proxy.

Recommended checks:

1. **Confirm registry URL**
   ```bash
   npm config get registry
   ```
   Ensure it points to the registry you’re allowed to use.

2. **Check for `.npmrc` overrides**
   Look for `.npmrc` files in the repo or your home directory that might set a custom registry or auth token.

3. **Verify proxy settings**
   ```bash
   npm config get proxy
   npm config get https-proxy
   ```
   If these are set incorrectly, npm can fail with 403s.

4. **Use an approved registry**
   If your environment requires a private registry, set it explicitly:
   ```bash
   npm config set registry https://your-approved-registry.example.com
   ```

Once `npm install` succeeds, you can run the dev server and capture screenshots as needed.
