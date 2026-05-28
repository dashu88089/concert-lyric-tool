import { describe, it, expect, beforeAll } from 'vitest';
import { loadVanillaJs } from './test-utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeAll(() => {
  loadVanillaJs(path.join(__dirname, 'lyrics-api.js'));
});

describe('parseLrclibResponse', () => {
  it('should parse full response data', () => {
    const data = {
      artistName: '刀郎',
      trackName: '冲动的惩罚',
      plainLyrics: '那夜我喝醉了',
      syncedLyrics: '[00:01.00]那夜我喝醉了',
    };
    const result = parseLrclibResponse(data);
    expect(result.artist).toBe('刀郎');
    expect(result.trackName).toBe('冲动的惩罚');
    expect(result.plainLyrics).toBe('那夜我喝醉了');
    expect(result.syncedLyrics).toBe('[00:01.00]那夜我喝醉了');
    expect(result.source).toBe('lrclib');
  });

  it('should handle missing fields with empty strings', () => {
    const data = {};
    const result = parseLrclibResponse(data);
    expect(result.artist).toBe('');
    expect(result.trackName).toBe('');
    expect(result.plainLyrics).toBe('');
    expect(result.syncedLyrics).toBe('');
    expect(result.source).toBe('lrclib');
  });

  it('should handle null fields', () => {
    const data = {
      artistName: null,
      trackName: undefined,
      plainLyrics: null,
    };
    const result = parseLrclibResponse(data);
    expect(result.artist).toBe('');
    expect(result.trackName).toBe('');
    expect(result.plainLyrics).toBe('');
  });
});

describe('searchLyrics', () => {
  it('should return null on network error', async () => {
    globalThis.fetch = async () => { throw new Error('Network error'); };
    const result = await searchLyrics('冲动的惩罚', '刀郎');
    expect(result).toBeNull();
  });

  it('should return parsed result on exact match', async () => {
    globalThis.fetch = async (url) => {
      if (url.includes('/get?')) {
        return { ok: true, json: async () => ({ artistName: '刀郎', trackName: '冲动的惩罚', plainLyrics: 'lyrics', syncedLyrics: '[00:01.00]lyrics' }) };
      }
      return { ok: false };
    };
    const result = await searchLyrics('冲动的惩罚', '刀郎');
    expect(result).not.toBeNull();
    expect(result.artist).toBe('刀郎');
    expect(result.syncedLyrics).toBe('[00:01.00]lyrics');
  });

  it('should fallback to search API on 404', async () => {
    let callCount = 0;
    globalThis.fetch = async (url) => {
      callCount++;
      if (callCount === 1) return { ok: false };
      if (callCount === 2) return { ok: true, json: async () => [{ id: 123 }] };
      return { ok: true, json: async () => ({ artistName: 'Artist', trackName: 'Song', plainLyrics: 'fallback lyrics' }) };
    };
    const result = await searchLyrics('Unknown Song', 'Artist');
    expect(result).not.toBeNull();
    expect(result.plainLyrics).toBe('fallback lyrics');
    expect(callCount).toBe(3);
  });
});
