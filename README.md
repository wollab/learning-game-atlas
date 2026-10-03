---
status: working
updated: 2026-10-03
purpose: Independent production code and publishing instructions
---

# Learning Game Atlas

Thai-first reference catalogue and prototype builder. Astro/React/TypeScript static pages publish at `https://wollab.github.io/learning-game-atlas/`. This directory alone is the independent public repository. The parent workspace is never pushed.

`npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run dev`.

`node scripts/import-kb.mjs` imports the canonical 250-game/50-card/12-activity/reviewed-bridge exports from the original local KB. `src/data/atlas.json` preserves the complete import. `public-atlas.json` removes repeated internal fields for public rendering without changing evidence. The admin editor loads the complete snapshot separately.

## Publishing and revisions

`main` triggers `.github/workflows/pages.yml`. Type/data/security checks and the build must pass before Pages deployment. A failed build cannot replace the last successful Pages release. Website settings live in `src/data/site.json`; the authenticated server commits validated saves with a required base file SHA. Concurrent updates return conflict and preserve browser drafts. Revert creates a new commit from a chosen settings revision. Admin shows actual workflow status.

## Authentication

The separate Vercel project root is `auth-service/`; deploy only that subdirectory. GitHub OAuth App callback is `https://learning-game-atlas-auth.vercel.app/api/callback` when that alias is assigned. Required server environment variables: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, a random `SESSION_SECRET` of at least 32 characters, and `AUTH_ORIGIN` equal to the deployed service origin. Set `site.authEndpoint` only to a verified service origin.

OAuth state and PKCE verifier are held in an encrypted HttpOnly cookie. The access token is exchanged server-side, encrypted into a short one-hour session, and never exposed as plaintext to frontend code. The opaque session exists only in browser memory. Every operation rechecks actual GitHub repository write permission. Repository/path scope is fixed on the server. No tokens go to localStorage, public configuration or URLs. Without configured credentials, login/save controls remain disabled and health reports the exact missing fields.

## Sourced knowledge revisions

Knowledge facts remain owned by the local KB. The editor writes immutable sourced proposals under `src/data/proposals/` with dataset/record revision, source URL, locator and read scope. It does not overwrite published facts. `node scripts/review-proposal.mjs proposal.json review.json` validates revision compatibility and produces a concrete before/after review packet. The canonical KB owner then merges accepted facts in their original source (including the original workbook for WH), regenerates exports and runs `import-kb.mjs`. Commit the verified new snapshot to publish. Conflicting revisions fail closed.

This is an explicit source-merge step; neither localStorage nor a proposal commit establishes that a KB fact has been accepted or published. No automatic two-way synchronization is installed.

## Sources and limits

Skills describe opportunities and conditions from game rules, not measured learner scores. Publisher minutes are displayed separately from observed session fields. Unknown classifications remain null. BGG has one edition-verified snapshot with unknown exact votes/statistics date and 249 unknown records at the initial release. Original Wizard Hat artwork and metadata are retained; box art remains Phase 2.

## UX refresh / SDJ supplement — 2026-10-03
Warm off-white/charcoal theme follows Meta Learning with larger local Bai Jamjuree typography (body18px/control16px/secondary14px). Skill and mechanism labels are English; Thai explanation/search aliases remain. Comparison uses checkboxes and compact selection; WH uses original images grouped by family/category with list view.
Data now renders250 canonical +33 SDJ2015–2025 award records, with collection filter. Organizer timing and existing WoL interpretation are explicitly separate from publisher duration and reviewed skill bridges. Award badges link official source/category/year. Approved external cover URL support is implemented; no approved covers exist in current source, so fallback is expected. No BGG/Amazon scrape/token or external image downloads.

