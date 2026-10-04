# Local Admin and OAuth readiness

Current release remains unpublished. This preparation does not deploy, request credentials or contact GitHub/Vercel.

Local workflow:
1. Edit theme/pages/builder and use **เก็บสำเนาการแก้ไข**. Imported settings are validated; invalid files preserve the current edit. Keep the base file SHA in the export.
2. Edit a sourced knowledge record; supply HTTPS source URL, locator and read scope. **ส่งออกข้อเสนอ** includes dataset and record revisions. **ตรวจไฟล์ข้อเสนอและ revision** checks the saved file against the current local snapshot without writing KB.
3. Changed dataset/record revisions stop proposal intake. Do not replace revisions manually to force a match: re-read the current source and prepare a new reviewed proposal. A settings draft with a missing/stale base SHA cannot silently attach to a newer remote revision; export the draft before loading latest settings.
4. Compatible proposal means only schema/revision compatibility. Canonical KB/workbook owner must still review and merge. No skill score or published fact is produced by local checks.

Owner setup gate:
- Create/confirm the GitHub OAuth App and its permitted repository/editor scope. Set the callback to the **actual deployed service origin** plus `/api/callback`; the old example alias is not a confirmed host.
- Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET (random, at least32characters), AUTH_ORIGIN in the provider's server environment. Do not put secrets into public site.json, local exports, chat, logs or checkpoints.
- Run `node auth-service/scripts/check-setup.mjs` in the authorized service environment. It prints names and pass/fail booleans only, never values, and makes no network requests. Missing configuration returns exit1 as an expected gate.
- Deploy auth-service separately only after publication/deployment authorization. Verify health CORS from https://wollab.github.io; configured:true alone is not proof of OAuth callback or access permission.
- Set public site.authEndpoint only after a verified HTTPS Vercel origin exists.

Live acceptance still required after owner configuration: successful OAuth callback; non-editor denied; expiring/tampered sessions denied; settings save with exact base SHA; competing save409 preserves draft; actual Actions status and last good site on failure; revert creates a new commit; sourced proposal compatible/rejected revisions; canonical owner merge followed by regenerated export. Do not represent local tests as these live outcomes.

Offline evidence: tests/phase2-local.test.mjs checks prototype/schema/context flows and Admin export/import/revision conflict roundtrip. tests/security.test.mjs checks session/origin/login/validation boundaries. Setup test fixtures use synthetic dummy strings, not credentials.

Verified local checkpoint — 2026-10-04:
- Focused Phase 2/security suite: 13/13 pass; TypeScript and static build pass (existing font-resolution/chunk-size warnings remain).
- Browser: Cooperation 2 players shows Sky Team, excludes Lunar; 4 players showed Lunar. Completed prototype readiness/playtest questions, local save/reload and actual JSON export verified. Actual settings/proposal download files passed the same import validators; proposal revision compatible and still awaiting canonical review.
- Browser filechooser intake could not be completed (stale backend node); malformed-file and revision-conflict rejection verified at helper level, not an end-to-end UI claim. First step-click intermittently did not change the view when batched after filling; latest separate fill/read/click succeeded, root cause unconfirmed.
- No OAuth service connected; setup checker reports four missing server variables by name. No secret values requested/printed, no deployment or push. Coordinator owns shared checkpoint/PM and SDJ collection integration.
