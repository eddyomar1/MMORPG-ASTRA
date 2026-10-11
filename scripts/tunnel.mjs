import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe estar entre 1 y 65535.');
const origin = `http://127.0.0.1:${port}`;
try {
  const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok || !(await response.json()).ok) throw new Error('Respuesta inválida');
} catch {
  console.error(`El juego no responde en ${origin}. Ejecuta npm run play en otra terminal.`);
  process.exit(1);
}
const localBinary = fileURLToPath(new URL('../.local/bin/cloudflared', import.meta.url));
const binary = process.env.CLOUDFLARED_PATH || (existsSync(localBinary) ? localBinary : 'cloudflared');
console.log('Publicando el juego mediante un túnel temporal. Comparte el enlace https://…trycloudflare.com que aparecerá abajo.');
console.log('Ctrl+C cierra el acceso público; el servidor del juego sigue activo en su propia terminal.');
const child = spawn(binary, ['tunnel', '--no-autoupdate', '--url', origin], { stdio: 'inherit' });
child.on('error', error => { console.error(`No se pudo ejecutar cloudflared: ${error.message}. Instálalo o define CLOUDFLARED_PATH.`); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
