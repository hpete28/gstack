import { describe, expect, test } from 'bun:test';
import { generateBrowseSetup } from '../scripts/resolvers/browse';
import type { TemplateContext } from '../scripts/resolvers/types';

const context: TemplateContext = {
  skillName: 'browse',
  tmplPath: 'browse/SKILL.md.tmpl',
  host: 'codex',
  paths: {
    skillRoot: '~/.codex/skills/gstack',
    localSkillRoot: '.agents/skills/gstack',
    binDir: '~/.codex/skills/gstack/bin',
    browseDir: '$GSTACK_BROWSE',
    designDir: '$GSTACK_DESIGN',
    makePdfDir: '$GSTACK_MAKE_PDF',
  },
};

describe('browse setup resolver on Windows', () => {
  test('routes global skills to the canonical source build before the minimal runtime copy', () => {
    const setup = generateBrowseSetup(context);
    const sourceExe = '$HOME/.gstack/repos/gstack/browse/dist/browse.exe';
    const globalRuntime = '$HOME$GSTACK_BROWSE/browse';

    expect(setup).toContain(sourceExe);
    expect(setup).toContain('browse/dist/browse.exe');
    expect(setup.indexOf(sourceExe)).toBeLessThan(setup.indexOf(globalRuntime));
    expect(setup).toContain('if [ -n "$B" ] && [ -x "$B" ]');
  });
});
