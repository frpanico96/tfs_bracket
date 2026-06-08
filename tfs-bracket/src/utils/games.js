const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const RAWG_BASE = "https://api.rawg.io/api";

const FALLBACK_GAMES = [
  { id: "sf6", name: "Street Fighter 6", slug: "street-fighter-6", image: null },
  { id: "tekken8", name: "Tekken 8", slug: "tekken-8", image: null },
  { id: "ggst", name: "Guilty Gear Strive", slug: "guilty-gear-strive", image: null },
  { id: "mk1", name: "Mortal Kombat 1", slug: "mortal-kombat-1", image: null },
  { id: "dbfz", name: "Dragon Ball FighterZ", slug: "dragon-ball-fighterz", image: null },
  { id: "sf5", name: "Street Fighter V", slug: "street-fighter-v", image: null },
  { id: "t7", name: "Tekken 7", slug: "tekken-7", image: null },
  { id: "ggacr", name: "Guilty Gear AC+R", slug: "guilty-gear-accent-core-plus-r", image: null },
  { id: "gbvs", name: "Granblue Fantasy Versus", slug: "granblue-fantasy-versus", image: null },
  { id: "uni2", name: "Under Night In-Birth II", slug: "under-night-in-birth-ii-sys-celes", image: null },
  { id: "smashu", name: "Super Smash Bros. Ultimate", slug: "super-smash-bros-ultimate", image: null },
  { id: "kof15", name: "The King of Fighters XV", slug: "the-king-of-fighters-xv", image: null },
  { id: "samsho", name: "Samurai Shodown", slug: "samurai-shodown-2019", image: null },
  { id: "strive", name: "Guilty Gear Strive", slug: "guilty-gear-strive", image: null },
  { id: "bbcfe", name: "BlazBlue Centralfiction", slug: "blazblue-centralfiction", image: null },
  { id: "p4au", name: "Persona 4 Arena Ultimax", slug: "persona-4-arena-ultimax", image: null },
  { id: "sc6", name: "SoulCalibur VI", slug: "soulcalibur-vi", image: null },
  { id: "vsf", name: "Virtua Fighter 5 R.E.V.O.", slug: "virtua-fighter-5-revo", image: null },
  { id: "mvc2", name: "Marvel vs. Capcom 2", slug: "marvel-vs-capcom-2", image: null },
  { id: "sf3s", name: "Street Fighter III: 3rd Strike", slug: "street-fighter-iii-3rd-strike", image: null },
];

let cachedGames = null;

export async function fetchFightingGames() {
  if (cachedGames) return cachedGames;

  if (RAWG_API_KEY) {
    try {
      const res = await fetch(
        `${RAWG_BASE}/games?key=${RAWG_API_KEY}&genres=fighting&page_size=40&ordering=-added`
      );
      if (!res.ok) throw new Error(`RAWG returned ${res.status}`);
      const data = await res.json();
      const games = (data.results || []).map((g) => ({
        id: String(g.id),
        name: g.name,
        slug: g.slug,
        image: g.background_image || null,
      }));
      if (games.length > 0) {
        cachedGames = games;
        return games;
      }
    } catch (err) {
      console.warn("Failed to fetch from RAWG, using fallback list:", err.message);
    }
  }

  cachedGames = FALLBACK_GAMES;
  return FALLBACK_GAMES;
}

export function searchGames(games, query) {
  if (!query.trim()) return games;
  const q = query.toLowerCase();
  return games.filter((g) => g.name.toLowerCase().includes(q));
}
