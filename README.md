---
status: working
updated: 2026-10-03
purpose: Independent production code and publishing instructions
---

# Learning Game Atlas

Thai-first reference catalogue and prototype builder. Astro/React/TypeScript static pages publish at `https://wollab.github.io/learning-game-atlas/`. This directory alone is the independent public repository. The parent workspace is never pushed.

`npm ci`, `npm run check`, `npm test`, `npm run build`, `npm run dev`.

`node scripts/import-kb.mjs` imports the active 282-game/50-card/12-activity/reviewed-bridge exports from the original local KB. `src/data/atlas.json` preserves the complete import. `public-atlas.json` removes repeated internal fields for public rendering without changing evidence. The admin editor loads the complete snapshot separately.

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

## Historical UX refresh / SDJ supplement — 2026-10-03
Warm off-white/charcoal theme follows Meta Learning with larger local Bai Jamjuree typography (body18px/control16px/secondary14px). Skill and mechanism labels are English; Thai explanation/search aliases remain. Comparison uses checkboxes and compact selection; WH uses original images grouped by family/category with list view.
Data now renders250 canonical +33 SDJ2015–2025 award records, with collection filter. Organizer timing and existing WoL interpretation are explicitly separate from publisher duration and reviewed skill bridges. Award badges link official source/category/year. Approved external cover URL support is implemented; 37 approved publisher covers are available; other records use a title fallback. No BGG/Amazon scrape/token or external image downloads.



## Historical public static release — 2026-10-04

Active corpus:249 base records +33 SDJ records =282. Matter Matters excluded by owner decision.61 source-reviewed learning games/173 bridges;221 remain in research and can be shown with the catalogue toggle.37 source-approved publisher covers are displayed via external URL. Selected BGG references are imported from local static files; independently reviewed metadata remains separately gated. The wrong-game Bus552 join is withheld from the Perplext BUS record. Admin server login/save remains unavailable until its configured endpoint is deployed; public browsing/search/comparison works without it. Blue/orange theme is stored in site.json.

Chief authorized publication in chat on2026-10-04. Deployment uses the existing isolated GitHub repository and Pages workflow; root Codex-AI remains local. No runtime BGG fetch, sync service or new database.


## Current static release — 2026-10-05

Chief authorized publishing this revision in chat. Active corpus: 249 base +33 SDJ =282 games; 66 reviewed learning profiles and196 sourced bridges. Of those66 profiles,30 have fresh primary-rule reviews,34 retain stored-summary reviews and2 rely on publisher descriptions;216 games remain in research. The catalogue toggle exposes researching games without turning their hypotheses into reviewed recommendations. Skill mappings describe opportunities, not observed development or transfer.

270 exact external cover URLs (269 BGG thumbnails from the pinned2026-10-02 ranking snapshot and1 approved publisher fallback);12 games have title fallback. Images remain externally hosted; failed links use the existing fallback. BGG is the default source and links credit the matching BGG game page. Image availability is not exact-printing verification; live availability of every remote image has not been certified.

Bus keeps stable local ID `pack-bus` but now refers to Splotter Bus BGG552, with fresh Complete Edition base-rule review,3–5players and90minutes. Old Perplext rules and skill claims were discarded.

`scripts/build_bgg_dataset.py` prepares exact-ID batches and extracts all external metadata, including mechanics and exact image nodes. It uses a real attributed cache or approved authenticated API access; no authenticated live BGG collection has been performed. Website reads local static JSON and never calls BGG at runtime. The admin service remains a separate, unavailable configuration lane.

Verification: TypeScript,41Node tests,20Python importer/collector tests and11static routes pass. Font-resolution and chunk-size build warnings remain; font assets are present in the static output. Future game intake/reviews are manual data revisions in the existing pipeline.

## Atlas revision — M1–M4 and owner feedback (2026-10-05)

Static owner-ranking overlay; evidence/player-safe checkbox/range filters; researchinggray/fixedcompare; sharedmedia+alignedtable/labeledwheel; eightcuratedhypotheses andBuilderv3 causalbindings/sourceexport withlegacyreadback. Chief feedback adds collapsed compact 4-color filters, clearer ANY/ALL modes, a UNICEF skills introduction, and a sourced 210×300 BGG cover for Itchy Feet. TypeScript,50 Node tests,11 static routes, and targeted desktop/mobile browser checks pass. Reviewed game analysis remains66/196 bridges. Detailed evidence and remaining research priorities are recorded in the project TASK_STATE and working checkpoint.
