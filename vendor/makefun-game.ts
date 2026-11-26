// This repository keeps the competition's kit copy of the dossier builder in
// starter/vendor/makefun-game.ts, untouched. Re-export it here so the hand-in
// program keeps the conventional import path while still using the very same
// bytes the grader rebuilds the dossier with.

export { buildDossier, DOSSIER_SCHEMA, DOSSIER_MAX_BYTES, DOSSIER_MAX_IMAGES, INDEX_HTML, INDEX_HTML_MAX_BYTES, GAME_PATH_MAX_BYTES, SOURCE_EXTENSIONS, DossierError, classifyGamePath, isSourcePath, readGameTree, htmlFacts, importMapOf, isRelativeRef, isRelativeSpecifier, resolveGamePath, importMapMatch, mappedSpecifier, sourceImports, importOrder, canonicalJson } from '../starter/vendor/makefun-game.ts';
