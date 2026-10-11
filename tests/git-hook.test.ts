import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, chmodSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function repository() {
  const dir = mkdtempSync(join(tmpdir(), 'astra-hook-test-'));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Hook Test', GIT_AUTHOR_EMAIL: 'hook@example.invalid',
    GIT_COMMITTER_NAME: 'Hook Test', GIT_COMMITTER_EMAIL: 'hook@example.invalid',
    GIT_AUTHOR_DATE: '2026-09-06T12:34:56-04:00', GIT_COMMITTER_DATE: '2026-09-06T12:34:56-04:00' };
  for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_CONFIG_COUNT']) delete (env as Record<string, string | undefined>)[name];
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  git('init', '--initial-branch=main'); git('config', 'commit.gpgsign', 'false');
  mkdirSync(join(dir, '.githooks')); mkdirSync(join(dir, 'scripts'));
  for (const file of ['.githooks/commit-msg', 'scripts/version-commit.mjs', 'scripts/install-git-hooks.mjs']) copyFileSync(resolve(file), join(dir, file));
  chmodSync(join(dir, '.githooks/commit-msg'), 0o755);
  const install = () => execFileSync(process.execPath, ['scripts/install-git-hooks.mjs'], { cwd: dir, env, stdio: 'pipe' });
  install();
  const commit = (message: string) => { git('commit', '--allow-empty', '-m', message); return git('log', '-1', '--format=%s'); };
  return { dir, env, git, commit, install, close: () => rmSync(dir, { recursive: true, force: true }) };
}

test('real commits replace dot, preserve explicit messages and increment versions beyond 1.9', t => {
  const repo = repository(); t.after(repo.close);
  assert.equal(repo.git('config', '--local', '--get', 'core.hooksPath'), '.githooks');
  repo.install(); // Idempotent setup.
  assert.equal(repo.commit('.'), 'version 1.0 2026-09-06 12:34:56 -0400');
  assert.equal(repo.commit('Arreglar cámara'), 'Arreglar cámara');
  assert.equal(repo.commit('.\n\nDescripción explícita'), '.');
  assert.equal(repo.git('log', '-1', '--format=%b'), 'Descripción explícita');
  for (let i = 1; i <= 10; i++) assert.equal(repo.commit('.'), `version 1.${i} 2026-09-06 12:34:56 -0400`);
});

test('legacy dot commits do not consume versions and aborted hook runs leave no counter', t => {
  const repo = repository(); t.after(repo.close);
  repo.git('-c', 'core.hooksPath=/dev/null', 'commit', '--allow-empty', '-m', '.');
  const file = join(repo.dir, 'message.txt');
  for (let i = 0; i < 2; i++) {
    writeFileSync(file, '.\n\n# Comment from editor\n');
    execFileSync(process.execPath, ['scripts/version-commit.mjs', file], { cwd: repo.dir, env: repo.env });
    assert.equal(readFileSync(file, 'utf8'), 'version 1.0 2026-09-06 12:34:56 -0400\n');
  }
  assert.equal(repo.commit('.'), 'version 1.0 2026-09-06 12:34:56 -0400');
});

test('versions follow the current branch and dates honor the Git timezone', t => {
  const repo = repository(); t.after(repo.close);
  repo.commit('.'); repo.git('branch', 'other'); repo.commit('.');
  repo.git('checkout', 'other');
  repo.env.GIT_COMMITTER_DATE = '2026-09-07T01:02:03+05:30';
  assert.equal(repo.commit('.'), 'version 1.1 2026-09-07 01:02:03 +0530');
});

test('installation refuses to overwrite another hooks directory', t => {
  const repo = repository(); t.after(repo.close);
  repo.git('config', '--local', 'core.hooksPath', '.other-hooks');
  const result = spawnSync(process.execPath, ['scripts/install-git-hooks.mjs'], { cwd: repo.dir, env: repo.env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(repo.git('config', '--get', 'core.hooksPath'), '.other-hooks');
});
