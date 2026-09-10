# Inference catalog corrections — 2026-09-10

Filter bars now use the flat catalog toolbar variant. Catalog and organization menu scroll areas
reuse the thin theme scrollbar. The menu focus ring is inset so it is not clipped by scrolling.
The organization catalog card itself has no hover-border animation; the reproduced clipping was
the organization switcher item focus ring.

Both inference catalog and bookmark history display the same feedback badge and completion rules.
Loading and query failure are explicit; invalid questionnaire configurations display Unavailable.
The organization catalog loads only the ten visible runs, unique schema versions and one feedback
batch, reusing existing query keys and mutation invalidation.

## Author contract

PredictionRun now persists nullable created_by_name and created_by_email columns, captured from
the authenticated creator before saving. They are immutable profile snapshots, not references to
the current viewer, schema owner or feedback author. Both PredictionRunDto and
PredictionRunCatalogItemDto expose createdByName/createdByEmail. Frontend prefers name, then email,
then Unknown author. Profile changes do not rewrite history. Old rows remain null; no backfill.
The repository's current Hibernate ddl-auto=update adds these nullable columns on startup. An
environment using explicit migrations must add equivalent nullable varchar(255) columns first.

## Verification

- Frontend: 306 tests pass, 69 files; API: 273 tests pass. TypeScript and Docker builds pass.
- Rebuilt frontend and API run locally at localhost:5173; no commit/push/merge performed.
- Created actual inference qa-author-20260910 (#102) through the UI. After reload both catalogs
  show By MLSuite Admin and Feedback: PENDING. Legacy records show Unknown author.
- Catalog #101 shows COMPLETED; intentionally invalid old questionnaire #100 shows Unavailable.
- Visually inspected catalog, history and organization hover screenshots in
  output/playwright/catalog-polish-inferences.png, catalog-polish-history.png and
  catalog-polish-org-hover.png. Menu has three rows, internal 168px viewport and thin scrollbar;
  hover ring fully visible, management link outside scrolling.
- Source size check: 141 changed/new files, none over 300 noncomment lines. Diff check clean.
- Graphify updated with existing parser/empty-node/large visualization warnings.
- vp check is blocked by repository formatting. React Doctor emitted 23 warnings and incomplete
  maintainability analysis, so no score or full lint pass is claimed.

Existing limitation: bookmark history still requests feedback for all runs in one batch; endpoint
maximum is 100. The organization catalog avoids that limit by loading only its visible page.
Browser checks used Chromium; no Firefox/Safari or physical-device certification is claimed.
