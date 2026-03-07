interface PexelsPhoto {
  src: {
    large2x: string;
    large: string;
    medium: string;
    landscape: string;
  };
  alt: string;
  width: number;
  height: number;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
}

export interface GroupedStockImages {
  hero: string[];
  secondary: string[];
  atmosphere: string[];
}

export async function searchPexels(
  queries: string[],
  perQuery: number = 5
): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY not set, skipping stock images");
    return [];
  }

  const allUrls: string[] = [];

  await Promise.all(
    queries.slice(0, 3).map(async (query) => {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perQuery}&orientation=landscape`,
          {
            headers: { Authorization: apiKey },
          }
        );

        if (!res.ok) return;

        const data: PexelsResponse = await res.json();
        for (const photo of data.photos) {
          allUrls.push(photo.src.large2x);
        }
      } catch (err) {
        console.error(`Pexels search failed for "${query}":`, err);
      }
    })
  );

  return allUrls;
}

export async function searchPexelsGrouped(
  queries: string[]
): Promise<GroupedStockImages> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("PEXELS_API_KEY not set, skipping stock images");
    return { hero: [], secondary: [], atmosphere: [] };
  }

  const groups: [string[], string[], string[]] = [[], [], []];
  const perQuery = [6, 4, 4]; // more hero candidates

  await Promise.all(
    queries.slice(0, 3).map(async (query, i) => {
      try {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perQuery[i]}&orientation=landscape`,
          {
            headers: { Authorization: apiKey },
          }
        );

        if (!res.ok) return;

        const data: PexelsResponse = await res.json();
        for (const photo of data.photos) {
          // For hero candidates, prefer wider aspect ratios
          if (i === 0 && photo.width / photo.height < 1.2) continue;
          groups[i].push(photo.src.large2x);
        }
      } catch (err) {
        console.error(`Pexels search failed for "${query}":`, err);
      }
    })
  );

  return {
    hero: groups[0],
    secondary: groups[1],
    atmosphere: groups[2],
  };
}
