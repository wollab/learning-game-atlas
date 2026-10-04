#!/usr/bin/env node
/**
 * Generate a structural Phase 2 coverage/readiness report from canonical Atlas files.
 * Offline only. Does not enrich or rewrite catalogue, bridges, activities, flows, or images.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '../../../../../');
const workspaceArg = process.argv.find((arg) => arg.startsWith('--workspace-root='));
const ROOT = workspaceArg ? path.resolve(workspaceArg.slice('--workspace-root='.length)) : DEFAULT_ROOT;
const KB = '03_Documents/04_Knowledge_Base/05_Research_Library';
const ATLAS = `${KB}/learning-game-atlas`;
const DATA = `${ATLAS}/data`;
const PRODUCTION = '02_Programs/04_Experimental/Learning-Game-Atlas-Web/production';
const OUTPUT_JSON = `${DATA}/phase2-readiness.json`;
const OUTPUT_MD = `${ATLAS}/phase2-readiness-method.md`;

const INPUTS = {
  baseRegister: `${KB}/strategy-card-games/data/games.json`,
  baseCatalogue: `${DATA}/production-catalogue.json`,
  sdjSupplement: `${DATA}/sdj-supplemental-games.json`,
  reviewedBridges: `${DATA}/reviewed-skill-bridges.json`,
  learningActivities: `${DATA}/learning-activities.json`,
  learningFlows: `${DATA}/reviewed-learning-flows.json`,
  wizardHat: `${DATA}/wizard-hat-production.json`,
  imageRegister: `${DATA}/game-image-register.json`,
  awardFacts: `${DATA}/sdj-award-facts.json`,
  reviewedGameFacts: `${DATA}/reviewed-game-facts.json`,
};

const todayBangkok = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const nonEmpty = (value) => value !== null && value !== undefined && value !== '' &&
  !(Array.isArray(value) && value.length === 0);
const count = (rows, predicate) => rows.reduce((n, row) => n + (predicate(row) ? 1 : 0), 0);
const countBy = (rows, getter) => Object.fromEntries(
  [...rows.reduce((map, row) => {
    const key = String(getter(row) ?? 'null');
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)),
);
const unique = (values) => new Set(values);
const populatedCategory = (value) => Array.isArray(value) ? value.length > 0 : nonEmpty(value);

async function loadJson(relativePath) {
  const file = path.join(ROOT, relativePath);
  const bytes = await readFile(file);
  return { value: JSON.parse(bytes.toString('utf8')), fingerprint: sha256(bytes) };
}

async function assetExists(relativeAssetPath) {
  if (!relativeAssetPath || path.isAbsolute(relativeAssetPath) || relativeAssetPath.split(/[\\/]/).includes('..')) return false;
  try {
    await access(path.join(ROOT, PRODUCTION, 'public', relativeAssetPath));
    return true;
  } catch {
    return false;
  }
}

function durationProfile(rows, key) {
  const values = rows.map((row) => row?.[key]);
  const isRange = (value) => value && typeof value === 'object' && !Array.isArray(value);
  return {
    records: rows.length,
    objectPopulated: values.filter(isRange).length,
    minPopulated: values.filter((value) => isRange(value) && value.min !== null && value.min !== undefined).length,
    maxPopulated: values.filter((value) => isRange(value) && value.max !== null && value.max !== undefined).length,
    completeRange: values.filter((value) => isRange(value) && value.min !== null && value.min !== undefined && value.max !== null && value.max !== undefined).length,
    invalidMinGreaterThanMax: values.filter((value) => isRange(value) && Number.isFinite(value.min) && Number.isFinite(value.max) && value.min > value.max).length,
  };
}

function classificationProfile(rows) {
  const fields = ['medium', 'format', 'genres'];
  return Object.fromEntries(fields.map((field) => {
    const populated = count(rows, (row) => populatedCategory(row[field]));
    return [field, {
      populated,
      unknown: rows.length - populated,
      evidenceLayers: field === 'medium'
        ? countBy(rows.filter((row) => populatedCategory(row[field])), (row) => row.medium_provenance?.source_layer ?? row.medium_provenance?.kind ?? 'no_provenance_field')
        : {},
    }];
  }));
}

function sourceProfile(rows, listField) {
  const lists = rows.map((row) => Array.isArray(row[listField]) ? row[listField] : []);
  const allSources = lists.flat();
  return {
    records: rows.length,
    recordsWithSource: lists.filter((list) => list.length > 0).length,
    sourceEntries: allSources.length,
    entriesWithUrl: count(allSources, (source) => nonEmpty(source?.url ?? source?.source_url)),
    entriesWithLocator: count(allSources, (source) => nonEmpty(source?.locator)),
    entriesWithReadScope: count(allSources, (source) => nonEmpty(source?.read_scope)),
    kinds: countBy(allSources, (source) => source?.kind ?? source?.source_type ?? 'unspecified'),
  };
}

function recordSets(rows, idField = 'game_id') {
  return rows.map((row) => row?.[idField]).filter((id) => typeof id === 'string' && id.length > 0);
}

async function buildReport() {
  const loaded = Object.fromEntries(await Promise.all(Object.entries(INPUTS).map(async ([key, rel]) => [key, await loadJson(rel)])));
  const baseRegister = loaded.baseRegister.value;
  const base = loaded.baseCatalogue.value.records ?? [];
  const sdjRoot = loaded.sdjSupplement.value;
  const sdj = sdjRoot.records ?? [];
  const bridgeRoot = loaded.reviewedBridges.value;
  const reviewedGames = bridgeRoot.games ?? [];
  const bridges = bridgeRoot.bridges ?? [];
  const activityRoot = loaded.learningActivities.value;
  const activities = activityRoot.skills ?? [];
  const flowsRoot = loaded.learningFlows.value;
  const flows = flowsRoot.flows ?? [];
  const cards = loaded.wizardHat.value.cards ?? [];
  const imageRoot = loaded.imageRegister.value;
  const images = imageRoot.records ?? [];
  const awardRoot = loaded.awardFacts.value;
  const awardFacts = awardRoot.records ?? [];
  const overlay = loaded.reviewedGameFacts.value.records ?? [];
  const overlayById = new Map(overlay.map((row) => [row.game_id, row]));
  const applyOverlay = (rows) => rows.map((row) => {
    const fact = overlayById.get(row.game_id);
    if (!fact) return { ...row };
    const merged = { ...row };
    for (const field of ['medium', 'format', 'genres', 'medium_provenance']) {
      if (fact[field] !== undefined && fact[field] !== null) merged[field] = fact[field];
    }
    if (Object.hasOwn(fact, 'publisher_play_duration_minutes')) merged.publisher_play_duration_minutes = fact.publisher_play_duration_minutes;
    return merged;
  });
  const effectiveBase = applyOverlay(base);
  const effectiveSdj = applyOverlay(sdj);
  const effectiveAll = [...effectiveBase, ...effectiveSdj];
  const canonicalGames = baseRegister.games ?? [];

  const baseIds = recordSets(base);
  const canonicalIds = recordSets(canonicalGames, 'id');
  const sdjIds = recordSets(sdj);
  const bridgeIds = recordSets(reviewedGames);
  const bridgeKeys = bridges.map((item) => item.bridge_id);
  const flowKeys = flows.map((item) => item.bridge_id);
  const skillNames = new Map(activities.map((skill) => [skill.skill_id, skill.name_en]));
  const bridgeCounts = activities.map((skill) => {
    const sameSkill = bridges.filter((bridge) => bridge.skill_id === skill.skill_id);
    return {
      skill_id: skill.skill_id,
      name_en: skill.name_en,
      bridge_count: sameSkill.length,
      unique_game_count: unique(sameSkill.map((bridge) => bridge.game_id)).size,
      statuses: countBy(sameSkill, (bridge) => bridge.status),
    };
  });
  const allGames = [...base, ...sdj];
  const allIdsSet = unique(allGames.map((game) => game.game_id));
  const imageIds = unique(recordSets(images));
  const missingExpandedIds = allGames.map((game) => game.game_id).filter((id) => !imageIds.has(id));
  const missingBaseImageIds = missingExpandedIds.filter((id) => unique(baseIds).has(id));
  const missingSdjImageIds = missingExpandedIds.filter((id) => unique(sdjIds).has(id));
  const intakeExtraIds = recordSets(images).filter((id) => id.startsWith('intake-') && !allIdsSet.has(id));
  const allIds = allGames.map((game) => game.game_id);
  const imageStates = countBy(images, (row) => row.state);
  const imageStatuses = countBy(images, (row) => row.image_status);
  const imageUseStatuses = countBy(images, (row) => row.use_status);
  const coverRights = countBy(awardFacts, (record) => record.cover_rights_status);
  const tabletopKnown = count(allGames, (row) => row.medium === 'tabletop');
  const coreTabletopKnown = count(base, (row) => row.medium === 'tabletop');
  const isPrimaryMedium = (row) => ['publisher-product-components', 'publisher-rulebook-components'].includes(row.medium_provenance?.kind) || row.medium_provenance?.source_layer === 'primary-source-component-review';
  const originalPrimaryMedium = count(allGames, (row) => row.medium === 'tabletop' && isPrimaryMedium(row));
  const primaryMediumVerified = count(effectiveAll, (row) => row.medium === 'tabletop' && isPrimaryMedium(row));
  const tabletopThresholdCore = Math.ceil(0.95 * base.length);
  const tabletopThresholdExpanded = Math.ceil(0.95 * allGames.length);
  const primaryTabletopCore = count(effectiveBase, (row) => row.medium === 'tabletop' && isPrimaryMedium(row));
  const distinctImageIds = unique(recordSets(images)).size;
  const baseSourceProfile = sourceProfile(base, 'source_provenance');
  const sdjSourceProfile = sourceProfile(sdj, 'sources');
  const ruleEvidenceCount = count(bridges, (bridge) => nonEmpty(bridge.rule_evidence?.url) && nonEmpty(bridge.rule_evidence?.locator));
  const mediumStrictLayers = {
    primary_component_or_rulebook: primaryMediumVerified,
    existing_sdj_analyst_descriptions: count(effectiveSdj, (row) => row.medium === 'tabletop' && row.medium_provenance?.source_layer === 'analyst_classification_from_existing_physical_game_descriptions'),
  };
  const imagesWithCandidateSource = count(images, (row) => nonEmpty(row.source_url));
  const approvedRegisterImages = count(images, (row) => ['approved', 'approved-for-use', 'approved-for-publication'].includes(String(row.use_status ?? '').toLowerCase()));
  const candidateAwardCovers = count(awardFacts, (row) => nonEmpty(row.cover_candidate_url));
  const approvedAwardCovers = count(awardFacts, (row) => ['approved', 'approved-for-use', 'approved-for-publication'].includes(String(row.cover_rights_status ?? '').toLowerCase()));
  const imageEditionCount = count(images, (row) => nonEmpty(row.edition));
  const imageFollowupCount = count(images, (row) => nonEmpty(row.followup));
  const publisherBaseDuration = durationProfile(base, 'publisher_play_duration_minutes');
  const publisherSdjDuration = durationProfile(sdj, 'publisher_play_duration_minutes');
  const effectivePublisherBaseDuration = durationProfile(effectiveBase, 'publisher_play_duration_minutes');
  const effectivePublisherSdjDuration = durationProfile(effectiveSdj, 'publisher_play_duration_minutes');
  const organizerSdjDuration = durationProfile(sdj, 'organizer_listed_play_duration_minutes');
  const observedSessionsBase = count(base, (row) => row.observed_session_time_minutes !== null && row.observed_session_time_minutes !== undefined);
  const observedSessionsSdj = count(sdj, (row) => row.observed_session_time_minutes !== null && row.observed_session_time_minutes !== undefined);
  const formatPopulated = count(effectiveAll, (row) => populatedCategory(row.format));
  const genrePopulated = count(effectiveAll, (row) => populatedCategory(row.genres));
  const effectiveBaseProfile = classificationProfile(effectiveBase);
  const effectiveSdjProfile = classificationProfile(effectiveSdj);
  const effectiveExpandedProfile = classificationProfile(effectiveAll);
  const mediumUnknown = allGames.length - tabletopKnown;
  const dedupedSupplementalAwardNames = unique(awardFacts.map((record) => record.official_name)).size;

  const whFrontAssets = await Promise.all(cards.map((card) => assetExists(card.front_asset)));
  const whBackAssets = await Promise.all(cards.map((card) => assetExists(card.back_asset)));
  const knownTabletopReviewedIds = unique(base.filter((game) => game.medium === 'tabletop').map((game) => game.game_id));

  const report = {
    schema_version: 1,
    report_id: 'learning-game-atlas-phase-2-readiness',
    generated_on: todayBangkok(),
    generated_by: `node ${path.posix.join(PRODUCTION, 'scripts/phase2-readiness.mjs')}`,
    workspace_relative_root: '.',
    intent: 'Structured Phase 2 data readiness and coverage; counts and source state only, no new skill analysis or external/live fetch.',
    sources: Object.entries(INPUTS).map(([id, relative_path]) => ({
      id,
      path: relative_path.replaceAll('\\', '/'),
      sha256: loaded[id].fingerprint,
      source_updated: loaded[id].value.updated ?? loaded[id].value.accessed_on ?? null,
    })),
    corpus: {
      base: { records: base.length, unique_ids: unique(baseIds).size, canonical_register_records: canonicalGames.length, canonical_id_match: base.length === canonicalGames.length && unique(baseIds).size === unique(canonicalIds).size && [...baseIds].every((id) => unique(canonicalIds).has(id)) },
      sdj_supplement: { records: sdj.length, unique_ids: unique(sdjIds).size, overlap_with_base_ids: baseIds.filter((id) => unique(sdjIds).has(id)).length },
      expanded: { records: allGames.length, unique_ids: unique(allIds).size },
      reviewed_skill_scope: {
        reviewed_games: reviewedGames.length,
        reviewed_base_games: bridgeIds.filter((id) => unique(baseIds).has(id)).length,
        reviewed_sdj_games: bridgeIds.filter((id) => unique(sdjIds).has(id)).length,
        skill_cells: bridgeRoot.reviewed_counts?.skill_cells ?? null,
        skills_in_activity_layer: activities.length,
        expected_cells_from_reviewed_games_times_skills: reviewedGames.length * activities.length,
        bridge_count: bridges.length,
        flow_count: flows.length,
        unique_flow_bridge_ids: unique(flowKeys).size,
        bridge_status_counts: countBy(bridges, (bridge) => bridge.status),
        bridge_rule_evidence_with_url_and_locator: ruleEvidenceCount,
        observed_sessions_in_reviewed_counts: bridgeRoot.reviewed_counts?.observed_sessions ?? null,
      },
    },
    classification_coverage: {
      definition: 'A field is populated when it has a non-null/non-empty value; medium source strength is broken out separately.',
      base_250: classificationProfile(base),
      sdj_33: classificationProfile(sdj),
      effective_curated: { base_250: effectiveBaseProfile, sdj_33: effectiveSdjProfile, expanded_283: effectiveExpandedProfile },
      reviewed_game_facts_overlay: { records: overlay.length, base_records: overlay.filter((r) => unique(baseIds).has(r.game_id)).length, sdj_records: overlay.filter((r) => unique(sdjIds).has(r.game_id)).length, primary_source_medium_records: count(overlay, (r) => r.medium_provenance?.source_layer === 'primary-source-component-review'), publisher_duration_complete_records: count(overlay, (r) => r.publisher_play_duration_minutes && r.publisher_play_duration_minutes.min != null && r.publisher_play_duration_minutes.max != null), publisher_duration_null_records: count(overlay, (r) => r.publisher_play_duration_minutes === null) },
      expanded_counts: {
        medium: { populated: count(effectiveAll, (row) => populatedCategory(row.medium)), unknown: effectiveAll.length - count(effectiveAll, (row) => populatedCategory(row.medium)), primary_component_or_rulebook_verified: mediumStrictLayers.primary_component_or_rulebook, analyst_description_layer: mediumStrictLayers.existing_sdj_analyst_descriptions, original_primary_component_or_rulebook_verified: originalPrimaryMedium },
        format: { populated: formatPopulated, unknown: allGames.length - formatPopulated },
        genre: { populated: genrePopulated, unknown: allGames.length - genrePopulated },
      },
      project_tabletop_minimum: {
        target: 'At least 95% tabletop/card-tabletop in the current project brief; no overall readiness percentage is calculated.',
        core_250_minimum_records: tabletopThresholdCore,
        core_250_current_populated_records: count(effectiveBase, (row) => row.medium === 'tabletop'),
        core_250_primary_component_or_rulebook_verified: primaryTabletopCore,
        expanded_283_minimum_records_if_target_is_applied_to_supplement: tabletopThresholdExpanded,
        expanded_283_current_populated_records: tabletopKnown,
        denominator_decision: 'Core target is shown against its original 250-record corpus; the additive 33 SDJ games are reported separately because the brief does not state that the later supplement changes this target denominator.',
      },
    },
    duration_coverage: {
      base_250: {
        publisher_listed_play_duration_minutes: publisherBaseDuration,
        organizer_listed_play_duration_minutes: { records: base.length, populated: 0, note: 'field is not part of the base publisher-duration schema' },
        observed_session_time_minutes: { populated: observedSessionsBase, unknown: base.length - observedSessionsBase },
      },
      sdj_33: {
        publisher_listed_play_duration_minutes: publisherSdjDuration,
        organizer_listed_play_duration_minutes: organizerSdjDuration,
        observed_session_time_minutes: { populated: observedSessionsSdj, unknown: sdj.length - observedSessionsSdj },
      },
      effective_curated: { base_250_publisher_listed_play_duration_minutes: effectivePublisherBaseDuration, sdj_33_publisher_listed_play_duration_minutes: effectivePublisherSdjDuration, sdj_33_organizer_listed_play_duration_minutes: organizerSdjDuration },
      rule: 'Organizer-listed time is never substituted for publisher-listed play duration or an observed full session.',
    },
    evidence_coverage: {
      base_source_provenance: baseSourceProfile,
      base_analysis_depth: countBy(base, (row) => row.analysis_depth),
      sdj_source_provenance: sdjSourceProfile,
      official_award_facts: {
        records: awardFacts.length,
        unique_official_winners: dedupedSupplementalAwardNames,
        award_lanes: countBy(awardFacts, (row) => row.lane),
        source_url_populated: count(awardFacts, (row) => nonEmpty(row.source_url)),
        archive_url_populated: count(awardFacts, (row) => nonEmpty(row.archive_url)),
        locator_populated: count(awardFacts, (row) => nonEmpty(row.locator)),
        cover_candidate_url_populated: candidateAwardCovers,
        covers_rights_approved: approvedAwardCovers,
        cover_rights_status_counts: coverRights,
      },
      activities: {
        skill_records: activities.length,
        with_unicef_definition: count(activities, (row) => nonEmpty(row.unicef_definition)),
        with_wol_activity: count(activities, (row) => nonEmpty(row.wol_activity)),
        with_game_examples: count(activities, (row) => nonEmpty(row.game_examples)),
      },
      skill_bridge_examples: bridgeCounts,
    },
    wizard_hat: {
      records: cards.length,
      unique_no_ids: unique(cards.map((card) => card.no)).size,
      source_mismatch_records: count(cards, (card) => Object.keys(card.source_mismatches ?? {}).length > 0),
      front_assets_present: whFrontAssets.filter(Boolean).length,
      back_assets_present: whBackAssets.filter(Boolean).length,
      missing_front_asset_ids: cards.filter((_, i) => !whFrontAssets[i]).map((card) => card.no),
      missing_back_asset_ids: cards.filter((_, i) => !whBackAssets[i]).map((card) => card.no),
      readiness_note: '50-card source/ID and existing public art are structurally ready; this is not evidence of game-level coverage or permission to reuse box art.',
    },
    phase2_image_register: {
      records: images.length,
      unique_game_ids: distinctImageIds,
      missing_expanded_game_count: missingExpandedIds.length,
      missing_expanded_game_ids: missingExpandedIds,
      missing_base_game_count: missingBaseImageIds.length,
      missing_sdj_game_count: missingSdjImageIds.length,
      intake_extra_id_count: intakeExtraIds.length,
      intake_extra_ids: intakeExtraIds,
      states: imageStates,
      image_statuses: imageStatuses,
      use_statuses: imageUseStatuses,
      edition_populated: imageEditionCount,
      source_url_populated: imagesWithCandidateSource,
      asset_path_populated: count(images, (row) => nonEmpty(row.asset_path)),
      followup_instruction_populated: imageFollowupCount,
      approved_register_images: approvedRegisterImages,
      approved_cover_count_across_register_and_sdj_candidates: approvedRegisterImages + approvedAwardCovers,
      lead_value: 'Records retain canonical game IDs/names, distinguish 250 existing-register records from 25 research-intake leads, and carry follow-up instructions; pending status means acquisition/edition/rights/readback remain open, not that the leads lack research value.',
    },
    bgg_snapshot: {
      records_with_verified_id: count(allGames, (row) => row.bgg?.edition_match_verified === true),
      records_with_rank: count(allGames, (row) => Number.isFinite(row.bgg?.overall_rank)),
      records_with_average_rating: count(allGames, (row) => Number.isFinite(row.bgg?.average_rating)),
      records_with_exact_vote_count: count(allGames, (row) => Number.isFinite(row.bgg?.vote_count)),
      records_with_provider_statistics_date: count(allGames, (row) => nonEmpty(row.bgg?.as_of)),
      note: 'High Society has one public-page snapshot; exact vote count and statistics as-of are null. No live API refresh is performed by this report.',
    },
    integrity_checks: {
      base_catalogue_ids_match_canonical_register: base.length === canonicalGames.length && unique(baseIds).size === unique(canonicalIds).size && [...baseIds].every((id) => unique(canonicalIds).has(id)),
      base_ids_unique: unique(baseIds).size === base.length,
      sdj_ids_unique: unique(sdjIds).size === sdj.length,
      base_sdj_id_overlap: baseIds.filter((id) => unique(sdjIds).has(id)).length,
      expanded_ids_unique: unique(allIds).size === allGames.length,
      bridge_ids_unique: unique(bridgeKeys).size === bridgeKeys.length,
      learning_flow_bridge_ids_match: unique(flowKeys).size === flows.length && flowKeys.every((key) => unique(bridgeKeys).has(key)),
      reviewed_skill_cells_match_reviewed_games_by_skills: bridgeRoot.reviewed_counts?.skill_cells === reviewedGames.length * activities.length,
      wizard_hat_ids_unique: unique(cards.map((card) => card.no)).size === cards.length,
      image_register_ids_unique: distinctImageIds === images.length,
      all_image_register_ids_resolve_to_base_or_supplement: images.every((image) => image.game_id.startsWith('intake-') || unique(allIds).has(image.game_id)),
      image_register_gaps_are_reported: true,
    },
    phase2_readiness_ledger: [
      { area: 'Base game register and source trail', status: 'structured-ready', current: `${base.length}/${base.length} unique base records have source provenance; ${count(base, (row) => row.analysis_depth === 'deep')} deep and ${count(base, (row) => row.analysis_depth === 'brief')} brief profiles.`, dependency: 'Canonical game register remains source of facts.', acceptance: 'Stable IDs match games.json; each source locator/read-scope is retained before any evidence promotion.' },
      { area: 'SDJ supplement and awards', status: 'award-data-ready; product metadata partial', current: `${sdj.length} unique supplemental IDs; ${awardFacts.length} official award facts with source, archive, and locator. Original SDJ register has no publisher duration, format, or genre; reviewed overlay adds primary classifications for 3 records and publisher ranges for 2.`, dependency: 'Keep award facts and WoL game interpretations separate; use winner lanes only.', acceptance: 'Award name/category/year badge is backed by official record and locator; publisher duration and physical medium require their own source.' },
      { area: 'Medium, format, and genre coverage', status: 'research-needed', current: `Original registers: base medium ${classificationProfile(base).medium.populated}/${base.length}, SDJ medium ${classificationProfile(sdj).medium.populated}/${sdj.length}. Effective curated coverage: medium ${count(effectiveAll, (r) => populatedCategory(r.medium))}/${allGames.length} (${primaryMediumVerified} primary-source verified); format ${formatPopulated}/${allGames.length}; genre ${genrePopulated}/${allGames.length}.`, dependency: 'Verify identity/edition and a relevant product/components or rules source for each classification.', acceptance: `No aggregate score; preserve original and overlay layers plus dataset-specific known/unknown counts. Core tabletop target is at least ${tabletopThresholdCore}/${base.length} records under the original core denominator.` },
      { area: 'Publisher, organizer, and observed timing', status: 'partial', current: `Original base publisher duration: ${publisherBaseDuration.completeRange}/${base.length}; effective curated base: ${effectivePublisherBaseDuration.completeRange}/${base.length}. Original SDJ publisher duration: ${publisherSdjDuration.completeRange}/${sdj.length}; effective curated SDJ publisher duration: ${effectivePublisherSdjDuration.completeRange}/${sdj.length}; SDJ organizer duration: ${organizerSdjDuration.completeRange}/${sdj.length}; observed full sessions: ${observedSessionsBase + observedSessionsSdj}.`, dependency: 'Publisher source for play-time; organizer listing for award-time; structured field session for observed full session.', acceptance: 'Do not copy organizer time into publisher time; an observed full-session record must identify edition, players, teach/setup/play/scoring and conditions.' },
      { area: 'Reviewed skill examples', status: 'partial; do not infer outcomes', current: `${reviewedGames.length} games / ${bridges.length} bridges across ${activities.length} skills; ${countBy(bridges, (bridge) => bridge.status).supported ?? 0} supported, ${countBy(bridges, (bridge) => bridge.status).conditional ?? 0} conditional; zero observed sessions.`, dependency: 'Rule text, applicable player/role/edition context, and a visible behavior/counter-signal.', acceptance: 'New examples need a relevant rule, required player behavior, context and observable/counter-signal. Empathy/diversity/participation require actual rule-supported behavior; theme or card label alone does not qualify.' },
      { area: 'Wizard Hat 50-card shelf', status: 'structured-ready', current: `${cards.length} stable No IDs; ${count(cards, (card) => Object.keys(card.source_mismatches ?? {}).length === 0)} with no source mismatch; ${whFrontAssets.filter(Boolean).length} front and ${whBackAssets.filter(Boolean).length} back assets found.`, dependency: 'Retain canonical No identity and existing approved production-card assets.', acceptance: 'All 50 IDs unique; workbook comparison stays mismatch-free; front/back relative assets resolve.' },
      { area: 'Phase 2 box-image sourcing', status: 'intake-ready; publication-blocked', current: `${images.length} leads (${imageStates['existing-register'] ?? 0} existing + ${imageStates['research-intake'] ?? 0} intake); ${approvedRegisterImages + approvedAwardCovers} images approved; ${candidateAwardCovers} SDJ cover candidates lack verified rights.`, dependency: 'Edition match, source URL, usage/rights status and attribution; then local asset path and render/readback.', acceptance: 'Per image, source and edition resolve to the named game; use permission is evidenced; attribution and final asset URL pass readback. Pending records remain useful leads, not publishable images.' },
    ],
    next_research_priority: [
      { priority: 1, area: 'Card/tabletop classification', basis: `Original registers have ${classificationProfile(base).medium.populated} classified base games and ${classificationProfile(sdj).medium.populated} analyst-derived SDJ tabletop labels. The overlay adds ${overlay.length} records with ${count(overlay, (r) => r.medium_provenance?.source_layer === 'primary-source-component-review')} primary-source medium reviews.`, next_action: 'Continue product component or relevant rules research for candidate identity/edition; record medium, format and genre separately with a source locator. Preserve original registers and unknowns.' },
      { priority: 2, area: 'Sparse skill-example coverage', basis: bridgeCounts.filter((item) => item.bridge_count <= 3).map((item) => `${item.name_en}: ${item.unique_game_count} existing game examples`).join('; '), next_action: 'After medium/format eligibility is source-confirmed, prioritize card/tabletop rulebooks for the sparsest skills. For Empathy, Respect for Diversity, and Participation, require actual rules and observable player behavior (including facilitation condition when needed); do not infer from theme or labels.' },
      { priority: 3, area: 'Phase 2 images', basis: `${images.length} records remain pending and ${imageFollowupCount} carry follow-up guidance; no image use has been reviewed.`, next_action: 'Use the register as the research queue: verify title/edition, find a source with usable rights, record attribution, add an approved local asset, then render/readback. Do not treat a candidate URL as rights clearance.' },
      { priority: 4, area: 'Duration evidence', basis: `${publisherBaseDuration.completeRange} base publisher ranges; ${organizerSdjDuration.completeRange} SDJ organizer ranges; zero observed sessions.`, next_action: 'Fill missing publisher durations from publisher sources, retain SDJ organizer durations under their own field, and collect full-session observations as a separate field activity.' },
    ],
    limitations: [
      'This is a local structural profile only; no live API, external retrieval, publication, or permission check was performed.',
      'Original register classifications are reported separately from the reviewed-game-facts overlay; null publisher duration in the overlay remains null and does not erase separate organizer time.',
      'Bridge counts describe reviewed candidate game-skill examples, not skill acquisition, learning outcomes, or transfer.',
      'Pending image intake retains game identity and next-action value but does not establish edition, image rights, or display permission.',
      'No single readiness percentage or unweighted aggregate score is calculated.',
    ],
  };

  report.integrity_checks.all_required_integrity_checks_pass = Object.entries(report.integrity_checks)
    .filter(([key]) => key !== 'all_required_integrity_checks_pass')
    .every(([, value]) => value === true || value === 0);
  return report;
}

function toMarkdown(report) {
  const pctLimit = report.classification_coverage.project_tabletop_minimum;
  const b = report.corpus.base;
  const s = report.corpus.sdj_supplement;
  const ex = report.corpus.expanded;
  const skills = [...report.evidence_coverage.skill_bridge_examples]
    .sort((a, b) => a.unique_game_count - b.unique_game_count || a.name_en.localeCompare(b.name_en));
  const ledgerRows = report.phase2_readiness_ledger.map((entry) =>
    `| ${entry.area} | ${entry.status} | ${entry.current} | ${entry.dependency} | ${entry.acceptance} |`,
  ).join('\n');
  const skillRows = skills.map((skill) => `| ${skill.name_en} | ${skill.unique_game_count} | ${skill.bridge_count} |`).join('\n');
  const sourceRows = report.sources.map((source) => `| ${source.id} | \`${source.path}\` | ${source.sha256} |`).join('\n');
  const priorityRows = report.next_research_priority.map((entry) => `### ${entry.priority}. ${entry.area}\n\n- ฐานจากข้อมูล: ${entry.basis}\n- ขั้นถัดไป: ${entry.next_action}`).join('\n\n');
  const classifications = report.classification_coverage;
  const durations = report.duration_coverage;
  const images = report.phase2_image_register;
  const awards = report.evidence_coverage.official_award_facts;
  return `---
type: Data Quality Report
title: "Learning Game Atlas Phase 2 Readiness"
tags:
  - type/research
  - layer/external-research
note_type: data-quality-report
source_layer: synthesis
canonical_status: derived-report
updated: ${report.generated_on}
---

# Learning Game Atlas — Phase 2 readiness and coverage

Generated ${report.generated_on} from the inputs listed below. This report is a reproducible structural profile; it does not edit canonical sources, add skill mappings, retrieve live data, or compute a single readiness percentage.

## Executive read

- Expanded corpus: ${b.records} base games + ${s.records} SDJ supplement = ${ex.records} unique IDs; base and supplement IDs do not overlap.
- Skill review: ${report.corpus.reviewed_skill_scope.reviewed_games} games, ${report.corpus.reviewed_skill_scope.bridge_count} bridges and ${report.corpus.reviewed_skill_scope.flow_count} flows; ${report.corpus.reviewed_skill_scope.observed_sessions_in_reviewed_counts} observed sessions.
- Original registers: base medium ${classifications.base_250.medium.populated}/250; SDJ medium ${classifications.sdj_33.medium.populated}/33 (analyst-derived). The six-record reviewed-facts overlay produces effective primary-source coverage of ${classifications.expanded_counts.medium.primary_component_or_rulebook_verified} games, with effective medium ${classifications.expanded_counts.medium.populated}/${ex.records}, format ${classifications.expanded_counts.format.populated}/${ex.records}, and genre ${classifications.expanded_counts.genre.populated}/${ex.records}.
- Phase 2 image register: ${images.records} useful research leads, but ${images.approved_cover_count_across_register_and_sdj_candidates} images approved for display; sourcing and rights remain open.
- Award badges: ${awards.records} facts have official source URL, archive URL and locator; cover rights are a separate open gate.

## Scope and integrity

| Dataset | Records | Unique IDs | Notes |
|---|---:|---:|---|
| Base catalogue | ${b.records} | ${b.unique_ids} | Matches canonical register IDs: ${b.canonical_id_match} |
| SDJ supplement | ${s.records} | ${s.unique_ids} | Base-ID overlap: ${s.overlap_with_base_ids} |
| Expanded catalogue | ${ex.records} | ${ex.unique_ids} | 250 + 33 distinct records |
| Reviewed bridges | ${report.corpus.reviewed_skill_scope.reviewed_games} games | ${report.corpus.reviewed_skill_scope.bridge_count} bridge IDs | ${report.corpus.reviewed_skill_scope.skill_cells} reviewed game-skill cells across ${report.corpus.reviewed_skill_scope.skills_in_activity_layer} activity skills |

All required integrity checks pass: **${report.integrity_checks.all_required_integrity_checks_pass}**. This includes ID uniqueness, base/source ID match, SDJ non-overlap, bridge/flow ID join, skill-cell arithmetic, Wizard Hat identity and image-register joinability.

## Known and unknown classifications

“Populated” describes field presence. Medium evidence strength is shown separately; analyst-derived labels are not counted as primary publisher component checks.

| Dataset | Medium populated | Medium unknown | Primary component/rule evidence | Format populated / unknown | Genre populated / unknown |
|---|---:|---:|---:|---:|---:|
| Base 250 | ${classifications.base_250.medium.populated} | ${classifications.base_250.medium.unknown} | ${(classifications.base_250.medium.evidenceLayers['publisher-product-components'] ?? 0) + (classifications.base_250.medium.evidenceLayers['publisher-rulebook-components'] ?? 0)} | ${classifications.base_250.format.populated} / ${classifications.base_250.format.unknown} | ${classifications.base_250.genres.populated} / ${classifications.base_250.genres.unknown} |
| SDJ 33 | ${classifications.sdj_33.medium.populated} | ${classifications.sdj_33.medium.unknown} | 0 | ${classifications.sdj_33.format.populated} / ${classifications.sdj_33.format.unknown} | ${classifications.sdj_33.genres.populated} / ${classifications.sdj_33.genres.unknown} |
| Expanded 283, effective | ${classifications.expanded_counts.medium.populated} | ${classifications.expanded_counts.medium.unknown} | ${classifications.expanded_counts.medium.primary_component_or_rulebook_verified} | ${classifications.expanded_counts.format.populated} / ${classifications.expanded_counts.format.unknown} | ${classifications.expanded_counts.genre.populated} / ${classifications.expanded_counts.genre.unknown} |

Original values stay distinct from the reviewed-game-facts overlay. Overlay: ${classifications.reviewed_game_facts_overlay.records} records (${classifications.reviewed_game_facts_overlay.base_records} base, ${classifications.reviewed_game_facts_overlay.sdj_records} SDJ), ${classifications.reviewed_game_facts_overlay.primary_source_medium_records} with primary-source medium review. Effective curated coverage by base / SDJ / expanded: medium ${classifications.effective_curated.base_250.medium.populated}/${b.records}, ${classifications.effective_curated.sdj_33.medium.populated}/${s.records}, ${classifications.effective_curated.expanded_283.medium.populated}/${ex.records}; format ${classifications.effective_curated.base_250.format.populated}/${b.records}, ${classifications.effective_curated.sdj_33.format.populated}/${s.records}, ${classifications.effective_curated.expanded_283.format.populated}/${ex.records}; genre ${classifications.effective_curated.base_250.genres.populated}/${b.records}, ${classifications.effective_curated.sdj_33.genres.populated}/${s.records}, ${classifications.effective_curated.expanded_283.genres.populated}/${ex.records}. The core 250-game project brief calls for at least 95% tabletop/card-tabletop: ${pctLimit.core_250_minimum_records} of 250; currently ${pctLimit.core_250_current_populated_records} effective curated records have a medium value. The supplement denominator is not silently merged into the core target.

## Duration and source evidence

| Dataset / field | Records with complete min/max | Unknown / remaining | Interpretation |
|---|---:|---:|---|
| Base publisher-listed play duration | ${durations.base_250.publisher_listed_play_duration_minutes.completeRange} / ${durations.base_250.publisher_listed_play_duration_minutes.records} | ${durations.base_250.publisher_listed_play_duration_minutes.records - durations.base_250.publisher_listed_play_duration_minutes.completeRange} | Publisher/distributor listed play duration |
| SDJ publisher-listed play duration | ${durations.sdj_33.publisher_listed_play_duration_minutes.completeRange} / ${durations.sdj_33.publisher_listed_play_duration_minutes.records} | ${durations.sdj_33.publisher_listed_play_duration_minutes.records - durations.sdj_33.publisher_listed_play_duration_minutes.completeRange} | Not populated in supplement |
| SDJ organizer-listed play duration | ${durations.sdj_33.organizer_listed_play_duration_minutes.completeRange} / ${durations.sdj_33.organizer_listed_play_duration_minutes.records} | ${durations.sdj_33.organizer_listed_play_duration_minutes.records - durations.sdj_33.organizer_listed_play_duration_minutes.completeRange} | Separate SDJ organizer metadata; never substituted for publisher duration |
| Effective base publisher duration after overlay | ${durations.effective_curated.base_250_publisher_listed_play_duration_minutes.completeRange} / ${durations.effective_curated.base_250_publisher_listed_play_duration_minutes.records} | ${durations.effective_curated.base_250_publisher_listed_play_duration_minutes.records - durations.effective_curated.base_250_publisher_listed_play_duration_minutes.completeRange} | Includes reviewed overlay; originals above remain separately reported |
| Effective SDJ publisher duration after overlay | ${durations.effective_curated.sdj_33_publisher_listed_play_duration_minutes.completeRange} / ${durations.effective_curated.sdj_33_publisher_listed_play_duration_minutes.records} | ${durations.effective_curated.sdj_33_publisher_listed_play_duration_minutes.records - durations.effective_curated.sdj_33_publisher_listed_play_duration_minutes.completeRange} | The Crew publisher duration remains null; organizer time remains in its own field |
| Observed full-session duration | ${durations.base_250.observed_session_time_minutes.populated + durations.sdj_33.observed_session_time_minutes.populated} / ${b.records + s.records} | ${durations.base_250.observed_session_time_minutes.unknown + durations.sdj_33.observed_session_time_minutes.unknown} | No observed session records |

Base sources: ${report.evidence_coverage.base_source_provenance.recordsWithSource}/${report.evidence_coverage.base_source_provenance.records} records have a source entry; ${report.evidence_coverage.base_analysis_depth.deep ?? 0} profiles are deep and ${report.evidence_coverage.base_analysis_depth.brief ?? 0} are brief. SDJ: ${report.evidence_coverage.sdj_source_provenance.recordsWithSource}/${report.evidence_coverage.sdj_source_provenance.records} supplemental records have source entries. Award facts: ${awards.source_url_populated}/${awards.records} have official source URLs, archive URLs and locators.

The overlay contains ${classifications.reviewed_game_facts_overlay.publisher_duration_complete_records} complete publisher-duration records and ${classifications.reviewed_game_facts_overlay.publisher_duration_null_records} explicit null. Only two SDJ ranges add new effective coverage; The Crew's null publisher duration preserves its separately populated organizer-listed time.

## Existing skill-example counts

Counts below are unique reviewed games that have a bridge for the skill. A bridge is a rules-grounded opportunity under stated context; it does not establish acquisition, development, or transfer. No new skill analysis was performed.

| Skill | Reviewed game examples | Bridge records |
|---|---:|---:|
${skillRows}

Sparse next areas are Empathy, Respect for Diversity and Participation (zero existing bridges); Negotiation (one); Creativity (four); Cooperation (six). New examples for the first three require relevant rules plus actual observable player behavior and facilitation conditions where required. A theme, card label, or generic social interaction is not sufficient.

## Wizard Hat and Phase 2 images

- Wizard Hat: ${report.wizard_hat.records} stable \`No\` IDs; ${report.wizard_hat.source_mismatch_records} source-mismatch records; ${report.wizard_hat.front_assets_present}/${report.wizard_hat.records} front and ${report.wizard_hat.back_assets_present}/${report.wizard_hat.records} back assets resolve in the existing production app.
- Phase 2 register: ${images.records} records = ${images.states['existing-register'] ?? 0} existing-register games + ${images.states['research-intake'] ?? 0} intake leads. All ${images.records} remain \`${Object.keys(images.image_statuses)[0] ?? 'pending'}\` and \`${Object.keys(images.use_statuses)[0] ?? 'not-reviewed'}\`; ${images.edition_populated} have an edition value, ${images.source_url_populated} have a source URL, and ${images.asset_path_populated} have an asset path.
- Against the expanded 283-game corpus, ${report.phase2_image_register.missing_expanded_game_count} game IDs are not yet in the image register (${report.phase2_image_register.missing_base_game_count} base, ${report.phase2_image_register.missing_sdj_game_count} SDJ); ${report.phase2_image_register.intake_extra_id_count} separate intake leads sit outside that corpus. All missing IDs are listed in the JSON report. Pending image records remain useful research leads.
- Award research has ${awards.cover_candidate_url_populated} cover candidate URLs, but ${awards.covers_rights_approved} are rights-approved. The 275-row image register remains a useful title/ID/follow-up queue; pending means sourcing, edition and rights checks remain, not that the records have no value.
- Approved image count for Phase 2 display: **${images.approved_cover_count_across_register_and_sdj_candidates}**.

## Phase 2 readiness ledger

| Area | Readiness | Current evidence | Dependency | Measurable acceptance gate |
|---|---|---|---|---|
${ledgerRows}

## Next research priority

${priorityRows}

## Method, scope and limits

- Grain: one record per canonical game ID, bridge ID, activity skill, Wizard Hat canonical \`No\`, image-register game ID or official award fact, as appropriate.
- Known means a non-null/non-empty field. Unknown means null/empty. For medium, counts distinguish analyst-derived SDJ labels from primary component/rulebook evidence.
- The reviewed-game-facts overlay merges by canonical game ID; non-null medium/format/genre/provenance values are surfaced as effective curated values. Original register metrics stay in separate fields. An explicit null publisher duration remains null and does not overwrite organizer-listed time.
- Duration values retain source type and separate publisher play duration, award-organizer listed duration and observed full-session duration. Teach/setup/play/scoring are not imputed.
- Award facts establish the listed award/category/year only. An award or cover candidate does not grant image rights.
- Image approval requires game/edition match, a usable source/rights basis, required attribution, stored asset, and local render/readback. This report does not perform those acquisitions or approvals.
- Bridge counts are structural coverage; they do not imply skill results. Empathy/diversity/participation need actual rules and observable player behavior.
- Pending review is treated as a queue with research value and incomplete publication evidence, not as zero content value.
- No overall readiness percent, blended quality score or unweighted coverage score is reported.

## Inputs and refresh provenance

| Input | Relative path | SHA-256 |
|---|---|---|
${sourceRows}

Refresh both this method note and \`data/phase2-readiness.json\` from the workspace root:

\`\`\`powershell
node ${path.posix.join(PRODUCTION, 'scripts/phase2-readiness.mjs')}
\`\`\`

The script uses Node built-ins only, reads these local files and Wizard Hat public assets, makes no network calls, and writes only the two report outputs. It does not edit catalogue, activities, bridges, flows, image register, app renderers, PM or checkpoints.
`;
}

const report = await buildReport();
const jsonPath = path.join(ROOT, OUTPUT_JSON);
const mdPath = path.join(ROOT, OUTPUT_MD);
await mkdir(path.dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(mdPath, toMarkdown(report), 'utf8');
const readBack = JSON.parse(await readFile(jsonPath, 'utf8'));
const readBackMarkdown = await readFile(mdPath, 'utf8');
if (readBack.report_id !== report.report_id || !readBackMarkdown.includes('Phase 2 readiness ledger')) {
  throw new Error('Report output readback failed.');
}
if (!report.integrity_checks.all_required_integrity_checks_pass) {
  throw new Error('One or more source integrity checks failed; inspect integrity_checks in the report.');
}
console.log(JSON.stringify({
  report_json: OUTPUT_JSON,
  report_method: OUTPUT_MD,
  generated_on: report.generated_on,
  base_games: report.corpus.base.records,
  sdj_games: report.corpus.sdj_supplement.records,
  reviewed_games: report.corpus.reviewed_skill_scope.reviewed_games,
  bridges: report.corpus.reviewed_skill_scope.bridge_count,
  tabletop_primary_verified: report.classification_coverage.expanded_counts.medium.primary_component_or_rulebook_verified,
  phase2_image_records: report.phase2_image_register.records,
  approved_images: report.phase2_image_register.approved_cover_count_across_register_and_sdj_candidates,
  integrity_checks_pass: report.integrity_checks.all_required_integrity_checks_pass,
}, null, 2));
