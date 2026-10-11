export const BANNERS = {
  crimson: { name: 'Brasa', color: '#8B2635', emblem: '◆' },
  sun: { name: 'Sol', color: '#E3BE45', emblem: '☀' },
  forest: { name: 'Bosque', color: '#245C40', emblem: '♣' },
  ember: { name: 'Ámbar', color: '#D97732', emblem: '▲' },
  ash: { name: 'Hoja', color: '#79B84A', emblem: '❧' },
} as const;
export type BannerId = keyof typeof BANNERS;
export const BANNER_IDS = Object.keys(BANNERS) as BannerId[];
export const isBanner = (value: unknown): value is BannerId => typeof value === 'string' && Object.hasOwn(BANNERS, value);
export const bannerFromColor = (color: unknown): BannerId => BANNER_IDS.find(id => typeof color === 'string' && BANNERS[id].color.toLowerCase() === color.toLowerCase()) ?? 'crimson';
export const SAFE_ZONE_Z = 5;
export const isSafeZone = (position: { z: number }) => position.z >= SAFE_ZONE_Z;
export const PVP_DAMAGE_MULTIPLIER = 1;
export const SHOP_RADIUS = 3;
export const HOUSES = BANNER_IDS.map((bannerId, index) => {
  const [x, z] = [[-12, 18], [12, 14], [-14, 10], [12, 26], [-12, 27]][index];
  return { id: `house-${bannerId}`, bannerId, x, z, width: 6, depth: 5.2, radius: 3.5, shop: { x, z: z + 4.2 } };
});
export const houseFor = (bannerId: BannerId) => HOUSES.find(h => h.bannerId === bannerId)!;
export type TargetRef = { type: 'enemy' | 'player'; id: string };
export function parseTarget(value: unknown): TargetRef | undefined {
  // Compatibility for old creature identifiers; never infer a player from a string.
  if (typeof value === 'string' && value.length > 0 && value.length <= 128) return { type: 'enemy', id: value };
  if (!value || typeof value !== 'object') return;
  const { type, id } = value as Record<string, unknown>;
  if ((type === 'enemy' || type === 'player') && typeof id === 'string' && id.length > 0 && id.length <= 128) return { type, id };
}
export const sameTarget = (a?: TargetRef, b?: TargetRef) => !!a && !!b && a.type === b.type && a.id === b.id;
