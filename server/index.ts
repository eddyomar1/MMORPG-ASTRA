import { createGameServer } from './app.js';
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto entre 1 y 65535.');
const game = await createGameServer({ port, dbPath: process.env.ASTRA_DB || 'data/astra.sqlite', dev: process.argv.includes('--dev') });
console.log(`\n  ✧ ASTRA · Crónicas del valle\n\n  En este PC: http://localhost:${port}\n  Comparte una dirección de tu red local:\n${game.addresses.map(a => `    ${a}`).join('\n')}\n\n  Hasta 8 jugadores · Ctrl+C guarda y cierra el servidor.\n`);
let closing = false;
const close = async () => { if (closing) return; closing = true; await game.close(); process.exit(0); };
process.on('SIGINT', close); process.on('SIGTERM', close);
