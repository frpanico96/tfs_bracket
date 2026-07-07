const STARTGG_API_KEY = import.meta.env.VITE_STARTGG_API_KEY;
const STARTGG_API = "https://api.start.gg/gql/alpha";

const FALLBACK_GAMES = [
  "Street Fighter 6", "Tekken 8", "Guilty Gear Strive", "Mortal Kombat 1",
  "Dragon Ball FighterZ", "Garou: Mark of the Wolves", "The King of Fighters XV",
  "The King of Fighters '98", "Samurai Shodown", "BlazBlue Centralfiction",
  "Under Night In-Birth II Sys:Celes", "SoulCalibur VI", "Virtua Fighter 5 R.E.V.O.",
  "Ultimate Marvel vs. Capcom 3", "Street Fighter III: 3rd Strike",
  "Capcom vs. SNK 2", "Super Smash Bros. Ultimate", "Super Smash Bros. Melee",
  "Granblue Fantasy Versus: Rising", "2XKO", "MultiVersus", "Brawlhalla",
  "Rivals of Aether II", "Them's Fightin' Herds",
];

async function queryStartGG(query) {
  const res = await fetch(STARTGG_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STARTGG_API_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`start.gg returned ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "start.gg query error");
  return json.data;
}

export async function searchGames(term) {
  if (!STARTGG_API_KEY) {
    const q = term.toLowerCase();
    return FALLBACK_GAMES
      .filter((name) => name.toLowerCase().includes(q))
      .map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, image: null }));
  }

  try {
    const data = await queryStartGG(`
      {
        videogames(query: { perPage: 20, sortBy: "name", filter: { name: "${term}" } }) {
          nodes {
            id
            name
            displayName
            slug
            images(type: "primary") { url }
          }
        }
      }
    `);
    return (data.videogames?.nodes || []).map((g) => ({
      id: g.slug || String(g.id),
      name: g.displayName || g.name,
      image: g.images?.[0]?.url || null,
    }));
  } catch (err) {
    console.warn("start.gg search failed, using local fallback:", err.message);
    const q = term.toLowerCase();
    return FALLBACK_GAMES
      .filter((name) => name.toLowerCase().includes(q))
      .map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, image: null }));
  }
}
