import { chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
try {
  const root = git('rev-parse', '--show-toplevel');
  let configured = '';
  try { configured = git('config', '--get', 'core.hooksPath'); } catch { /* Default hooks directory. */ }
  if (configured && configured !== '.githooks') throw new Error(`Ya hay hooks configurados en ${configured}. Integra commit-msg allí antes de cambiar la configuración.`);
  if (!configured && existsSync(resolve(root, git('rev-parse', '--git-path', 'hooks/commit-msg')))) {
    throw new Error('Ya existe un hook commit-msg local. Integra ambos hooks antes de activar .githooks.');
  }
  chmodSync(resolve(root, '.githooks/commit-msg'), 0o755);
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
  console.log('Hook local activado. git commit -m "." genera versión, fecha y hora.');
} catch (error) {
  console.error(`No se pudieron activar los hooks: ${error.message}`);
  process.exitCode = 1;
}
