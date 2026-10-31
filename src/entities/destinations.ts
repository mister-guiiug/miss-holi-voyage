/**
 * Catalogue destinations inspiré de partir.com — sans scrape live (ADR 0013).
 * Miroir du catalogue MCP (`mcp/miss_holi_voyage_mcp/destinations.py`) + code pays ISO
 * pour le drapeau emoji.
 */

export type DestinationTag =
  'plage' | 'culture' | 'nature' | 'famille' | 'budget' | 'direct_eu';

export type Destination = {
  id: string;
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2 — drapeau ; vide pour le hub. */
  countryCode: string;
  region: string;
  months: number[];
  tags: DestinationTag[];
  summary: string;
  sourceUrl: string;
};

export const PARTIR_HUB_URL = 'https://www.partir.com/ou-partir/';

export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'hanoi',
    name: 'Hanoï',
    country: 'Vietnam',
    countryCode: 'VN',
    region: 'Nord',
    months: [10, 11, 12, 1, 2, 3, 4],
    tags: ['culture', 'famille', 'budget'],
    summary: 'Vie locale, marchés, climat doux hors mousson.',
    sourceUrl: 'https://www.partir.com/vietnam/',
  },
  {
    id: 'athenes',
    name: 'Athènes',
    country: 'Grèce',
    countryCode: 'GR',
    region: 'Attique',
    months: [3, 4, 5, 9, 10, 11],
    tags: ['culture', 'famille', 'direct_eu'],
    summary: 'Capitale avant / après la haute saison, flânerie antique.',
    sourceUrl: 'https://www.partir.com/grece/',
  },
  {
    id: 'amazonie',
    name: 'Amazonie',
    country: 'Brésil',
    countryCode: 'BR',
    region: 'Bassin amazonien',
    months: [5, 6, 7, 8, 9],
    tags: ['nature'],
    summary: 'Hautes eaux, immersion faune et communautés riveraines.',
    sourceUrl: 'https://www.partir.com/bresil/',
  },
  {
    id: 'loire-velo',
    name: 'La Loire à vélo',
    country: 'France',
    countryCode: 'FR',
    region: 'Val de Loire',
    months: [4, 5, 6, 7, 8, 9],
    tags: ['nature', 'famille', 'budget', 'direct_eu'],
    summary: 'Châteaux et paysages ligériens à rythme doux.',
    sourceUrl: 'https://www.partir.com/france/',
  },
  {
    id: 'georgie',
    name: 'Géorgie',
    country: 'Géorgie',
    countryCode: 'GE',
    region: 'Caucase',
    months: [5, 6, 7, 8, 9],
    tags: ['culture', 'nature', 'budget'],
    summary: 'Villages de montagne, hospitalité, loin des flux massifs.',
    sourceUrl: 'https://www.partir.com/ou-partir/',
  },
  {
    id: 'allemagne-rando',
    name: 'Randonner en Allemagne',
    country: 'Allemagne',
    countryCode: 'DE',
    region: 'Divers',
    months: [5, 6, 7, 8, 9],
    tags: ['nature', 'famille', 'direct_eu', 'budget'],
    summary: 'Sentiers balisés, forêts et villages hors Alpes saturées.',
    sourceUrl: 'https://www.partir.com/allemagne/',
  },
  {
    id: 'oaxaca',
    name: 'Oaxaca',
    country: 'Mexique',
    countryCode: 'MX',
    region: 'Oaxaca',
    months: [11, 12, 1, 2, 3],
    tags: ['culture', 'famille'],
    summary: 'Marchés, cuisine, artisanat — voyage par les sens.',
    sourceUrl: 'https://www.partir.com/mexique/',
  },
  {
    id: 'rep-dominicaine',
    name: 'République dominicaine',
    country: 'République dominicaine',
    countryCode: 'DO',
    region: 'Caraïbes',
    months: [12, 1, 2, 3, 4],
    tags: ['plage', 'famille', 'nature'],
    summary: 'Soleil d’hiver, littoral et intérieur verdoyant.',
    sourceUrl: 'https://www.partir.com/republique-dominicaine/',
  },
  {
    id: 'lisbonne',
    name: 'Lisbonne',
    country: 'Portugal',
    countryCode: 'PT',
    region: 'Lisbonne',
    months: [3, 4, 5, 6, 9, 10],
    tags: ['culture', 'famille', 'direct_eu', 'budget'],
    summary: 'Ville compacte, tramways, escapades Sintra / océan.',
    sourceUrl: 'https://www.partir.com/portugal/',
  },
  {
    id: 'sicile',
    name: 'Sicile',
    country: 'Italie',
    countryCode: 'IT',
    region: 'Sicile',
    months: [4, 5, 6, 9, 10],
    tags: ['culture', 'plage', 'famille', 'direct_eu'],
    summary: 'Volcans, villages et mer — hub ou roadtrip.',
    sourceUrl: 'https://www.partir.com/italie/',
  },
  {
    id: 'crete',
    name: 'Crète',
    country: 'Grèce',
    countryCode: 'GR',
    region: 'Crète',
    months: [5, 6, 9, 10],
    tags: ['plage', 'famille', 'direct_eu'],
    summary: 'Plages et gorges ; éviter le pic d’août avec jeunes enfants.',
    sourceUrl: 'https://www.partir.com/grece/',
  },
  {
    id: 'maroc-atlas',
    name: 'Atlas et Médina',
    country: 'Maroc',
    countryCode: 'MA',
    region: 'Marrakech / Atlas',
    months: [3, 4, 5, 10, 11],
    tags: ['culture', 'famille', 'budget', 'direct_eu'],
    summary: 'Médinas et villages berbères ; chaleur d’été à éviter.',
    sourceUrl: 'https://www.partir.com/maroc/',
  },
  {
    id: 'japon-printemps',
    name: 'Japon (printemps / automne)',
    country: 'Japon',
    countryCode: 'JP',
    region: 'Honshu',
    months: [3, 4, 5, 10, 11],
    tags: ['culture', 'famille'],
    summary: 'Hanami ou momiji ; rail et rythme urbain dense.',
    sourceUrl: 'https://www.partir.com/japon/',
  },
  {
    id: 'canada-est',
    name: 'Québec et Maritime',
    country: 'Canada',
    countryCode: 'CA',
    region: 'Est',
    months: [6, 7, 8, 9],
    tags: ['nature', 'famille'],
    summary: 'Grands espaces, lacs, été court mais généreux.',
    sourceUrl: 'https://www.partir.com/canada/',
  },
  {
    id: 'islande',
    name: 'Islande',
    country: 'Islande',
    countryCode: 'IS',
    region: 'Île',
    months: [6, 7, 8],
    tags: ['nature'],
    summary: 'Routes et cascades ; budget élevé, peu adapté aux bébés.',
    sourceUrl: 'https://www.partir.com/islande/',
  },
  {
    id: 'senegal',
    name: 'Sénégal',
    country: 'Sénégal',
    countryCode: 'SN',
    region: 'Dakar / Petite Côte',
    months: [11, 12, 1, 2, 3, 4],
    tags: ['plage', 'culture', 'famille', 'direct_eu'],
    summary: 'Saison sèche, vols directs possibles depuis la France.',
    sourceUrl: 'https://www.partir.com/senegal/',
  },
] as const;

/** Drapeau emoji depuis un code ISO alpha-2 (ex. `FR` → 🇫🇷). */
export function flagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    ...[...code].map(c => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}

export function countryCodeForName(country: string): string {
  const needle = country.trim().toLowerCase();
  if (!needle) return '';
  const hit = DESTINATIONS.find(d => d.country.toLowerCase() === needle);
  return hit?.countryCode ?? '';
}

export function proposeDestinations(options?: {
  month?: number | null;
  tags?: readonly string[];
  familyFriendly?: boolean;
  limit?: number;
}): Destination[] {
  const month = options?.month ?? null;
  const wanted = new Set((options?.tags ?? []).map(t => t.toLowerCase()));
  const familyFriendly = options?.familyFriendly ?? false;
  const limit = options?.limit ?? 8;

  const out: Destination[] = [];
  for (const dest of DESTINATIONS) {
    if (month != null && !dest.months.includes(month)) continue;
    if (wanted.size > 0 && !dest.tags.some(t => wanted.has(t))) continue;
    if (familyFriendly && !dest.tags.includes('famille')) continue;
    out.push(dest);
    if (out.length >= limit) break;
  }
  return out;
}
