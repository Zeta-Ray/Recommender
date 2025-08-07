"use client";

import { useState } from "react";

type RecItem = {
  id: number;
  title: string;
  cover?: string;
  episodesTotal?: number | null;
  progress: number;
  remaining: number | null;
  genres: string[];
  score: number | null;
  url?: string;
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RecItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFetch() {
    setLoading(true);
    setErr(null);
    setItems(null);
    try {
      const res = await fetch("/api/anilist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Request failed");
      setItems(json.items || []);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Finish-First: What should I watch next?</h1>
      <p className="text-sm opacity-80 mb-4">
        Enter your <b>AniList</b> username. We’ll pull your “Watching” list and sort by episodes left.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="AniList username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          onClick={onFetch}
          disabled={!username || loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Get Next"}
        </button>
      </div>

      {err && <div className="text-red-600 mb-4">{err}</div>}

      {items && (
        <div className="grid gap-3">
          {items.length === 0 && <div>No “Watching” entries found.</div>}
          {items.map((it) => (
            <a
              key={it.id}
              href={it.url}
              target="_blank"
              className="flex gap-3 border rounded p-3 hover:bg-gray-50"
            >
              {it.cover && (
                <img
                  src={it.cover}
                  alt={it.title}
                  className="w-20 h-28 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-semibold">{it.title}</div>
                <div className="text-sm opacity-80">
                  {it.episodesTotal ? (
                    <>Progress: {it.progress}/{it.episodesTotal} (left {it.remaining ?? "?"})</>
                  ) : (
                    <>Progress: {it.progress} (ongoing)</>
                  )}
                </div>
                <div className="text-xs opacity-75 mt-1">{it.genres.join(" • ")}</div>
                {it.score ? <div className="text-xs mt-1">Avg score: {it.score}</div> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
