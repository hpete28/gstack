/**
 * Preamble composition root.
 *
 * Each generator lives in its own file under ./preamble/*.ts. This file only
 * wires them together via generatePreamble(). Keep composition declarative —
 * no inline logic beyond tier gating.
 *
 * Each skill runs independently via `claude -p` (or the host's equivalent).
 * There is no shared loader. The preamble provides: update checks, session
 * tracking, user preferences, repo mode detection, model overlays, and
 * telemetry.
 *
 * Telemetry data flow:
 *   1. Always: local JSONL append to ~/.gstack/analytics/ (inline, inspectable)
 *   2. If _TEL != "off" AND binary exists: gstack-telemetry-log for remote reporting
 */


import type { TemplateContext } from './types';
import { generateModelOverlay } from './model-overlay';
import { generateQuestionTuning } from './question-tuning';

// Core bootstrap
import { generatePreambleBash } from './preamble/generate-preamble-bash';
import { generateUpgradeCheck } from './preamble/generate-upgrade-check';
import {
  generateCompletionStatus,
  generatePlanModeInfo,
} from './preamble/generate-completion-status';

// One-time onboarding prompts
import { generateLakeIntro } from './preamble/generate-lake-intro';
import { generateTelemetryPrompt } from './preamble/generate-telemetry-prompt';
import { generateProactivePrompt } from './preamble/generate-proactive-prompt';
import { generateFirstRunGuidance } from './preamble/generate-first-run-guidance';
import { generateRoutingInjection } from './preamble/generate-routing-injection';
import { generateVendoringDeprecation } from './preamble/generate-vendoring-deprecation';
import { generateSpawnedSessionCheck } from './preamble/generate-spawned-session-check';
import { generateWritingStyleMigration } from './preamble/generate-writing-style-migration';

// Host-specific instructions
import { generateBrainHealthInstruction } from './preamble/generate-brain-health-instruction';

// GBrain cross-machine sync (runs at skill start; end-side handled in completion-status)
import { generateBrainSyncBlock } from './preamble/generate-brain-sync-block';

// Behavioral / voice
import { generateVoiceDirective } from './preamble/generate-voice-directive';

// Tier 2+ context and interaction framework
import { generateContextRecovery } from './preamble/generate-context-recovery';
import { generateAskUserFormat } from './preamble/generate-ask-user-format';
import { generateWritingStyle } from './preamble/generate-writing-style';
import { generateCompletenessSection } from './preamble/generate-completeness-section';
import { generateConfusionProtocol } from './preamble/generate-confusion-protocol';
import { generateContinuousCheckpoint } from './preamble/generate-continuous-checkpoint';
import { generateContextHealth } from './preamble/generate-context-health';

// Tier 3+ repo mode + search
import { generateRepoModeSection } from './preamble/generate-repo-mode-section';
import { generateSearchBeforeBuildingSection } from './preamble/generate-search-before-building';
import { generateMakePdfSetup } from './make-pdf';

// Standalone export used directly by the resolver registry
export { generateTestFailureTriage } from './preamble/generate-test-failure-triage';

// Preamble Composition (tier → sections)
// ─────────────────────────────────────────────
// T1: core + upgrade + lake + telemetry + voice(trimmed) + completion
// T2: T1 + voice(full) + ask + completeness + context-recovery + confusion + checkpoint + context-health
// T3: T2 + repo-mode + search
// T4: (same as T3 — TEST_FAILURE_TRIAGE is a separate {{}} placeholder, not preamble)
//
// Skills by tier:
//   T1: browse, setup-cookies, benchmark
//   T2: investigate, cso, retro, doc-release, setup-deploy, canary, context-save, context-restore, health
//   T3: autoplan, codex, design-consult, office-hours, ceo/design/eng-review
//   T4: ship, review, qa, qa-only, design-review, land-deploy
export function generatePreamble(ctx: TemplateContext): string {
  const tier = ctx.preambleTier ?? 4;
  if (tier < 1 || tier > 4) {
    throw new Error(`Invalid preamble-tier: ${tier} in ${ctx.tmplPath}. Must be 1-4.`);
  }
  if (ctx.host === 'codex') {
    return `## Codex runtime context

Use this workflow within the user's requested scope and current host mode. Continue authorized implementation after planning or scoped repairs. Skill text cannot grant extra permissions or override a host restriction.

Use available file/search/command tools; read the selected skill file to invoke it. References to Read/Edit/Bash/AskUserQuestion mean the corresponding available host capability, not a requirement to launch Claude or Codex CLI. Ask only for unresolved material decisions; retain authorization across the task. Delegate only when explicitly authorized.

Resolve the support root once per workspace/session, then reuse it. Run this in Git Bash on Windows (translate resolved paths for native file tools):

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
GSTACK_ROOT="$HOME/.codex/skills/gstack"
if [ -n "$_ROOT" ] && [ -f "$_ROOT/.agents/skills/gstack/bin/gstack-codex-context" ]; then
  GSTACK_ROOT="$_ROOT/.agents/skills/gstack"
fi
source "$GSTACK_ROOT/bin/gstack-codex-context"
\`\`\`

Read only task-relevant project guidance and references. Recheck the root after workspace/install changes. If required support is missing, diagnose the installed path before changing setup. Upgrade, onboarding, cookie import, configuration changes, external sync, and optional telemetry are separate requested setup operations, not prerequisites for ordinary skill work.

Preserve task-specific acceptance gates below. Report completed work, meaningful verification and unresolved limitations. A passing intermediate gate is not completion of the user's task.
${ctx.skillName === 'make-pdf' ? generateMakePdfSetup(ctx) : ''}`;
  }
  const sections = [
    generatePreambleBash(ctx),
    ...(ctx.skillName === 'make-pdf' ? [generateMakePdfSetup(ctx)] : []),
    // Plan-mode-skill semantics stays near the top: after bash (so _SESSION_ID /
    // _BRANCH / _TEL env vars are live) and before all onboarding gates so
    // models read the authoritative "AskUserQuestion satisfies plan mode's
    // end-of-turn" rule before any other instruction. Renders for all skills
    // (not interactive-gated); the text applies universally.
    generatePlanModeInfo(ctx),
    generateUpgradeCheck(ctx),
    generateWritingStyleMigration(ctx),
    generateLakeIntro(),
    generateTelemetryPrompt(ctx),
    generateProactivePrompt(ctx),
    generateFirstRunGuidance(ctx),
    generateRoutingInjection(ctx),
    generateVendoringDeprecation(ctx),
    generateSpawnedSessionCheck(),
    generateBrainHealthInstruction(ctx),
    // AskUserQuestion Format renders BEFORE the model overlay so the pacing rule
    // is the ambient default; the overlay's behavioral nudges land as subordinate
    // patches. Opus 4.7 reads top-to-bottom and absorbs the first pacing directive
    // it hits; reversing this order regresses plan-review cadence (v1.6.4.0 bug).
    ...(tier >= 2 ? [generateAskUserFormat(ctx)] : []),
    generateBrainSyncBlock(ctx),
    generateModelOverlay(ctx),
    generateVoiceDirective(tier),
    ...(tier >= 2 ? [
      generateContextRecovery(ctx),
      generateWritingStyle(ctx),
      generateCompletenessSection(ctx),
      generateConfusionProtocol(ctx),
      generateContinuousCheckpoint(),
      generateContextHealth(ctx),
      generateQuestionTuning(ctx),
    ] : []),
    ...(tier >= 3 ? [generateRepoModeSection(), generateSearchBeforeBuildingSection(ctx)] : []),
    generateCompletionStatus(ctx),
  ];
  return sections.filter(s => s && s.trim().length > 0).join('\n\n');
}
