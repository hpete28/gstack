import { test, expect } from 'bun:test';
import { mkdtempSync, readdirSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generatePreamble } from '../scripts/resolvers/preamble';
import { HOST_PATHS } from '../scripts/resolvers/types';

test('Codex entrypoint supplies bounded context without onboarding or model assumptions', () => {
  const text = generatePreamble({ skillName: 'review', tmplPath: 'review/SKILL.md.tmpl', host: 'codex', paths: HOST_PATHS.codex, preambleTier: 4 });
  expect(text.length).toBeLessThan(4000);
  expect(text).toContain('gstack-codex-context');
  expect(text).not.toContain('MODEL_OVERLAY: claude');
  expect(text).not.toContain('gstack-update-check');
});

test('context helper reads settings and supports spaces without writing state', () => {
  const work = mkdtempSync(join(tmpdir(), 'gstack context '));
  const root = resolve(import.meta.dir, '..');
  const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
  try {
    const state = join(work, '.gstack');
    mkdirSync(state);
    const config = 'telemetry: off\nproactive: false\nskill_prefix: true\n';
    writeFileSync(join(state, 'config.yaml'), config);
    const run = spawnSync(bash, ['-c', 'export GSTACK_ROOT="$1"; source "$1/bin/gstack-codex-context"; printf "%s|%s|%s|%s" "$_TEL" "$_PROACTIVE" "$_SKILL_PREFIX" "$GSTACK_BIN"', 'test', root.replaceAll('\\', '/')], { cwd: work, env: { ...process.env, HOME: work, GSTACK_HOME: state, GSTACK_STATE_ROOT: state, CLAUDE_PLUGIN_DATA: '' }, encoding: 'utf-8', timeout: 15000 });
    expect(run.status).toBe(0);
    expect(run.stdout).toStartWith('off|false|true|');
    expect(readFileSync(join(state, 'config.yaml'), 'utf-8')).toBe(config);
    expect(readdirSync(state)).toEqual(['config.yaml']);
    expect(readdirSync(work)).toEqual(['.gstack']);
  } finally { rmSync(work, { recursive: true, force: true }); }
}, 20000);
