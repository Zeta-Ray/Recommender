import { NextResponse } from "next/server";

const ANILIST_URL = "https://graphql.anilist.co";

const QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status_in: [CURRENT, PLANNING, COMPLETED]) {
    lists {
      name
      entries {
        status
        progress
        media {
          id
          title { romaji english native }
          episodes
          coverImage { large }
          genres
          averageScore
          siteUrl
        }
      }
    }
  }
}
`;

export async function POST(req: Request) {
  try {
    const { username } = await req.json() as { username?: string };
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { userName: username } }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "AniList error", detail: text }, { status: 502 });
    }

    const json = await res.json();

    // Flatten entries and compute "episodes left" → finish-first
    const lists = json?.data?.MediaListCollection?.lists ?? [];
    const entries = lists.flatMap((l: any) => l.entries ?? []);

    const watching = entries
      .filter((e: any) => e.status === "CURRENT" && e.media)
      .map((e: any) => {
        const total = e.media.episodes ?? null; // null for ongoing
        const progress = e.progress ?? 0;
        const remaining = total ? Math.max(total - progress, 0) : null; // null = unknown/ongoing
        return { ...e, remaining };
      });

    // Sort: known remaining first (ascending), then unknowns (ongoing) by popularity
    watching.sort((a: any, b: any) => {
      if (a.remaining === null && b.remaining === null) {
        return (b.media.averageScore ?? 0) - (a.media.averageScore ?? 0);
      }
      if (a.remaining === null) return 1;
      if (b.remaining === null) return -1;
      return a.remaining - b.remaining;
    });

    // Return top 10 minimal fields
    const result = watching.slice(0, 10).map((e: any) => ({
      id: e.media.id,
      title: e.media.title?.english || e.media.title?.romaji || e.media.title?.native,
      cover: e.media.coverImage?.large,
      episodesTotal: e.media.episodes,
      progress: e.progress ?? 0,
      remaining: e.remaining, // null if unknown
      genres: e.media.genres ?? [],
      score: e.media.averageScore ?? null,
      url: e.media.siteUrl,
    }));

    return NextResponse.json({ username, items: result });
  } catch (err: any) {
    return NextResponse.json({ error: "server error", detail: err?.message }, { status: 500 });
  }
}