'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { VoiceInput } from '@/components/VoiceInput';

type Post = {
  id: string;
  title: string;
  body?: string;
  seoSlug: string;
  viewCount?: number;
  community?: { id: string; slug: string; name: string };
};

type SearchResponse = {
  data: Post[];
  nextCursor: string | null;
  searchType?: string;
};

// Basic Manglish → Malayalam transliteration map for common patterns.
// Converts romanised Malayalam (e.g. "veedu", "ente") to script before searching.
const MANGLISH_MAP: [RegExp, string][] = [
  [/thiru/gi, 'തിരു'], [/tha/gi, 'ത'], [/thi/gi, 'തി'], [/thu/gi, 'തു'], [/the/gi, 'തെ'], [/tho/gi, 'തൊ'],
  [/sha/gi, 'ശ'], [/shi/gi, 'ശി'], [/shu/gi, 'ശു'], [/sh/gi, 'ശ'],
  [/cha/gi, 'ച'], [/chi/gi, 'ചി'], [/chu/gi, 'ചു'], [/ch/gi, 'ച'],
  [/nna/gi, 'ന്ന'], [/nn/gi, 'ന്ന'],
  [/aa/gi, 'ആ'], [/ee/gi, 'ഈ'], [/oo/gi, 'ഊ'],
  [/veedu/gi, 'വീട്'], [/veetu/gi, 'വീട്'], [/loan/gi, 'ലോൺ'],
  [/ente/gi, 'എന്റെ'], [/njan/gi, 'ഞാൻ'], [/njaan/gi, 'ഞാൻ'],
  [/ka/gi, 'ക'], [/ki/gi, 'കി'], [/ku/gi, 'കു'], [/ke/gi, 'കെ'], [/ko/gi, 'കൊ'],
  [/pa/gi, 'പ'], [/pi/gi, 'പി'], [/pu/gi, 'പു'],
  [/ma/gi, 'മ'], [/mi/gi, 'മി'], [/mu/gi, 'മു'],
  [/na/gi, 'ന'], [/ni/gi, 'നി'], [/nu/gi, 'നു'],
  [/va/gi, 'വ'], [/vi/gi, 'വി'], [/vu/gi, 'വ'],
  [/la/gi, 'ല'], [/li/gi, 'ലി'], [/lu/gi, 'ലു'],
  [/ra/gi, 'ര'], [/ri/gi, 'രി'], [/ru/gi, 'രു'],
];

function hasMalayalam(text: string) {
  return /[ഀ-ൿ]/.test(text);
}

// Returns original query + transliterated variant (if input is Manglish).
function buildSearchQuery(input: string): string {
  if (hasMalayalam(input) || input.trim().length < 3) return input;
  let ml = input;
  for (const [pat, rep] of MANGLISH_MAP) ml = ml.replace(pat, rep);
  // If transliteration changed something meaningful, search both
  if (ml !== input && ml.length > 2) return `${input} ${ml}`;
  return input;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  const handleSearch = async (q: string, off = 0) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const expanded = buildSearchQuery(q);
      const params = new URLSearchParams({ q: expanded, limit: String(limit), cursor: String(off) });
      const data = await apiFetch<SearchResponse>(`/api/v1/search?${params}`);
      setResults(data.data);
      setTotal(data.data.length + off);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query) {
      handleSearch(query, 0);
      setOffset(0);
    }
  }, [query]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-malayalam mb-4 text-3xl font-bold text-[var(--text)]">തിരയുക</h1>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchInput, 0); setOffset(0); }} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search questions (Malayalam or Manglish)..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-4 py-2 text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[var(--primary)] px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <VoiceInput
            onTranscript={(text) => setSearchInput(text)}
            language="ml-IN"
            placeholder="Click mic to search by voice"
          />
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {results.length === 0 && !loading && query && !error && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-muted)]">No results found for "{query}"</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Try different keywords or check Malayalam spelling</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Found {total} result{total !== 1 ? 's' : ''} for "{query}"
          </p>
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {results.map((post) => (
              <div key={post.id} className="border-b border-[var(--border)] last:border-0">
                <Link href={`/q/${post.seoSlug}`} className="block p-4 hover:bg-[var(--surface-2)]">
                  <h3 className="font-medium text-[var(--text)] hover:text-[var(--primary)]">{post.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{post.body}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {post.community && (
                      <span className="text-[var(--text-secondary)]">{post.community.name}</span>
                    )}
                    {post.viewCount != null && <span>{post.viewCount} views</span>}
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {total > limit && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => { setOffset(Math.max(0, offset - limit)); handleSearch(query, Math.max(0, offset - limit)); }}
                disabled={offset === 0}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                Previous
              </button>
              <span className="flex items-center px-4 py-2 text-sm text-[var(--text-muted)]">
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => { setOffset(offset + limit); handleSearch(query, offset + limit); }}
                disabled={offset + limit >= total}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!query && !loading && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Enter a search query to get started</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Search in Malayalam or Manglish</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<h1 className="font-malayalam mb-4 text-3xl font-bold text-[var(--text)]">തിരയുക</h1>}>
      <SearchPageContent />
    </Suspense>
  );
}
