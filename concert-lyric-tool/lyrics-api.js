// ========== LRCLIB API Client ==========
const LRCLIB_BASE = 'https://lrclib.net/api';

async function searchLyrics(trackName, artistName) {
  try {
    // Step 1: Try exact match with artist
    const url1 = `${LRCLIB_BASE}/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
    let res = await fetch(url1);
    if (res.ok) {
      const data = await res.json();
      return parseLrclibResponse(data);
    }

    // Step 2: If 404, try track name only (search API)
    const url2 = `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(trackName)}`;
    res = await fetch(url2);
    if (res.ok) {
      const results = await res.json();
      if (results.length > 0) {
        // Pick the first result
        const detailUrl = `${LRCLIB_BASE}/get?id=${results[0].id}`;
        const detailRes = await fetch(detailUrl);
        if (detailRes.ok) {
          const data = await detailRes.json();
          return parseLrclibResponse(data);
        }
      }
    }

    // Step 3: Nothing found
    return null;
  } catch (e) {
    console.warn('LRCLIB search failed:', trackName, e);
    return null;
  }
}

function parseLrclibResponse(data) {
  return {
    artist: data.artistName || '',
    trackName: data.trackName || '',
    plainLyrics: data.plainLyrics || '',
    syncedLyrics: data.syncedLyrics || '',
    source: 'lrclib',
  };
}
