import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('the Debian setup script is valid Bash and check mode never installs', () => {
  const syntax = spawnSync('bash', ['-n', 'setup-debian.sh'], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);

  const script = readFileSync('setup-debian.sh', 'utf8');
  assert.match(script, /--check/);
  assert.match(script, /setup_\$\{REQUIRED_NODE_MAJOR\}\.x/);
  assert.match(script, /cloudflared-linux-\$\{CF_ARCH\}/);
  assert.match(script, /npm ci/);
  assert.match(script, /npm run build/);
  assert.ok(script.indexOf('if [[ "$CHECK_ONLY" -eq 1 ]]') < script.indexOf('apt-get update'));
});

test('the Windows launchers use WinGet package IDs and support diagnostic mode', () => {
  const script = readFileSync('setup-windows.ps1', 'utf8');
  const launcher = readFileSync('setup-windows.cmd', 'utf8');

  assert.match(script, /param\(\[switch\]\$CheckOnly\)/);
  assert.match(script, /Git\.Git/);
  assert.match(script, /OpenJS\.NodeJS\.LTS/);
  assert.match(script, /Cloudflare\.cloudflared/);
  assert.match(script, /npm\.cmd ci/);
  assert.match(script, /npm\.cmd run build/);
  assert.ok(script.indexOf('if ($CheckOnly)') < script.indexOf("Install-Or-Upgrade 'Git.Git'"));
  assert.match(launcher, /ExecutionPolicy Bypass/);
  assert.match(launcher, /setup-windows\.ps1/);
});

test('PowerShell accepts the Windows setup script when a parser is available', t => {
  const candidates = process.platform === 'win32' ? ['powershell.exe', 'pwsh.exe'] : ['pwsh'];
  const shell = candidates.find(candidate => spawnSync(candidate, ['-NoProfile', '-Command', 'exit 0']).status === 0);
  if (!shell) return t.skip('PowerShell is not installed in this test environment.');

  const parse = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-Command',
    '$tokens=$null;$errors=$null;[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path "setup-windows.ps1"),[ref]$tokens,[ref]$errors)>$null;if($errors.Count){$errors|ForEach-Object{Write-Error $_.Message};exit 1}'],
  { encoding: 'utf8' });
  assert.equal(parse.status, 0, parse.stderr);
});
