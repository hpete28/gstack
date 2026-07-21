import type { TemplateContext } from './types';

/**
 * {{MAKE_PDF_SETUP}} — emits the shell preamble that resolves $P to the
 * make-pdf binary. Mirrors generateBrowseSetup / generateDesignSetup.
 *
 * $P = make-pdf/dist/pdf.
 *
 * Resolution order:
 *   1. Env override (MAKE_PDF_BIN)
 *   2. Local vendored skill root
 *   3. Host runtime root
 *   4. Official ~/.gstack/repos/gstack source/build tree
 *
 * Windows builds use .exe. The generated shell checks both suffixed and
 * extensionless binaries so the same skill works in Git Bash on every host.
 */
export function generateMakePdfSetup(ctx: TemplateContext): string {
  return `## MAKE-PDF SETUP (run this check BEFORE any make-pdf command)

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
P=""
[ -n "$MAKE_PDF_BIN" ] && [ -x "$MAKE_PDF_BIN" ] && P="$MAKE_PDF_BIN"
[ -z "$P" ] && [ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf" ] && P="$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf"
[ -z "$P" ] && [ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf.exe" ] && P="$_ROOT/${ctx.paths.localSkillRoot}/make-pdf/dist/pdf.exe"
[ -z "$P" ] && [ -n "$GSTACK_ROOT" ] && [ -x "$GSTACK_ROOT/make-pdf/dist/pdf" ] && P="$GSTACK_ROOT/make-pdf/dist/pdf"
[ -z "$P" ] && [ -n "$GSTACK_ROOT" ] && [ -x "$GSTACK_ROOT/make-pdf/dist/pdf.exe" ] && P="$GSTACK_ROOT/make-pdf/dist/pdf.exe"
[ -z "$P" ] && [ -x "$HOME/.gstack/repos/gstack/make-pdf/dist/pdf" ] && P="$HOME/.gstack/repos/gstack/make-pdf/dist/pdf"
[ -z "$P" ] && [ -x "$HOME/.gstack/repos/gstack/make-pdf/dist/pdf.exe" ] && P="$HOME/.gstack/repos/gstack/make-pdf/dist/pdf.exe"
[ -z "$P" ] && [ -n "$GSTACK_MAKE_PDF" ] && [ -x "$HOME${ctx.paths.makePdfDir.replace(/^~/, '')}/pdf" ] && P="$HOME${ctx.paths.makePdfDir.replace(/^~/, '')}/pdf"
[ -z "$P" ] && [ -n "$GSTACK_MAKE_PDF" ] && [ -x "$HOME${ctx.paths.makePdfDir.replace(/^~/, '')}/pdf.exe" ] && P="$HOME${ctx.paths.makePdfDir.replace(/^~/, '')}/pdf.exe"

# The compiled publisher launches the gstack browse daemon. Resolve its Windows
# binary explicitly when the host preamble did not provide GSTACK_BROWSE_BIN.
if [ -z "$GSTACK_BROWSE_BIN" ]; then
  [ -n "$GSTACK_ROOT" ] && [ -x "$GSTACK_ROOT/browse/dist/browse" ] && GSTACK_BROWSE_BIN="$GSTACK_ROOT/browse/dist/browse"
  [ -z "$GSTACK_BROWSE_BIN" ] && [ -n "$GSTACK_ROOT" ] && [ -x "$GSTACK_ROOT/browse/dist/browse.exe" ] && GSTACK_BROWSE_BIN="$GSTACK_ROOT/browse/dist/browse.exe"
  [ -z "$GSTACK_BROWSE_BIN" ] && [ -x "$HOME/.gstack/repos/gstack/browse/dist/browse" ] && GSTACK_BROWSE_BIN="$HOME/.gstack/repos/gstack/browse/dist/browse"
  [ -z "$GSTACK_BROWSE_BIN" ] && [ -x "$HOME/.gstack/repos/gstack/browse/dist/browse.exe" ] && GSTACK_BROWSE_BIN="$HOME/.gstack/repos/gstack/browse/dist/browse.exe"
fi
export GSTACK_BROWSE_BIN

if [ -n "$P" ] && [ -x "$P" ]; then
  echo "MAKE_PDF_READY: $P"
  alias _p_="$P"   # shellcheck alias helper (not exported)
  export P   # available as $P in subsequent blocks within the same skill invocation
else
  echo "MAKE_PDF_NOT_AVAILABLE (run './setup' in the gstack repo to build it)"
fi
\`\`\`

If \`MAKE_PDF_NOT_AVAILABLE\` is printed: tell the user the binary is not
built. Have them run \`./setup\` from the gstack repo, then retry.

If \`MAKE_PDF_READY\` is printed: \`$P\` is the binary path for the rest of
the skill. Use \`$P\` (not an explicit path) so the skill body stays portable.

Core commands:
- \`$P generate <input.md> [output.pdf]\` — render markdown to PDF (80% use case)
- \`$P generate --cover --toc essay.md out.pdf\` — full publication layout
- \`$P generate --watermark DRAFT memo.md draft.pdf\` — diagonal DRAFT watermark
- \`$P preview <input.md>\` — render HTML and open in browser (fast iteration)
- \`$P setup\` — verify browse + Chromium + pdftotext and run a smoke test
- \`$P --help\` — full flag reference

Output contract:
- \`stdout\`: ONLY the output path on success. One line.
- \`stderr\`: progress (\`Rendering HTML... Generating PDF...\`) unless \`--quiet\`.
- Exit 0 success / 1 bad args / 2 render error / 3 Paged.js timeout / 4 browse unavailable.`;
}
