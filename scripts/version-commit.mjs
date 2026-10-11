import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

try {
  const file = process.argv[2];
  if (!file) throw new Error('Falta el archivo de mensaje del commit.');
  const original = readFileSync(file, 'utf8');
  const message = execFileSync('git', ['stripspace', '--strip-comments'], { input: original, encoding: 'utf8' }).trim();
  if (message !== '.') process.exit(0);

  // Read the current branch, not a counter that an aborted commit could consume.
  const head = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD'], { encoding: 'utf8' });
  if (head.status !== 0 && head.status !== 1) throw new Error('No se pudo leer HEAD del repositorio.');
  const history = head.status === 0 ? git('log', '--first-parent', '--format=%s') : '';
  const previous = history.split('\n').map(subject => subject.match(/^version (\d+)\.(\d+) \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4}$/)).find(Boolean);
  const version = previous ? `${BigInt(previous[1])}.${BigInt(previous[2]) + 1n}` : '1.0';

  // Honor Git's committer date and timezone, including GIT_COMMITTER_DATE.
  const identity = git('var', 'GIT_COMMITTER_IDENT').trim().match(/ (\d+) ([+-]\d{4})$/);
  if (!identity) throw new Error('No se pudo obtener la fecha del autor del commit.');
  const [, seconds, zone] = identity;
  const offset = (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3))) * (zone[0] === '-' ? -1 : 1);
  const date = new Date(Number(seconds) * 1000 + offset * 60000).toISOString().slice(0, 19).replace('T', ' ');
  writeFileSync(file, `version ${version} ${date} ${zone}\n`);
} catch (error) {
  console.error(`No se pudo generar el mensaje de versión: ${error.message}`);
  process.exitCode = 1;
}
