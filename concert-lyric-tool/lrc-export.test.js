import { describe, it, expect, beforeAll } from 'vitest';
import { loadVanillaJs } from './test-utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeAll(() => {
  // lrc-export references document.createElement — jsdom provides it
  loadVanillaJs(path.join(__dirname, 'lrc-export.js'));
});

describe('sanitizeFilename', () => {
  it('should replace invalid characters with underscores', () => {
    expect(sanitizeFilename('冲动的惩罚')).toBe('冲动的惩罚');
    expect(sanitizeFilename('file:name')).toBe('file_name');
    expect(sanitizeFilename('a<b>c"d/e\\f|g?h*i')).toBe('a_b_c_d_e_f_g_h_i');
  });

  it('should trim whitespace', () => {
    expect(sanitizeFilename('  test  ')).toBe('test');
  });

  it('should handle empty string', () => {
    expect(sanitizeFilename('')).toBe('');
  });
});

describe('offsetLrcTimestamps', () => {
  it('should offset all timestamps by given seconds', () => {
    const lrc = '[00:01.00]第一句\n[00:04.50]第二句';
    const result = offsetLrcTimestamps(lrc, 300);
    expect(result).toBe('[05:01.00]第一句\n[05:04.50]第二句');
  });

  it('should handle centiseconds with 3 digits', () => {
    const lrc = '[00:01.123]test';
    const result = offsetLrcTimestamps(lrc, 0);
    // 1.123 → 1.123 → formatted as 01.12 (truncated to 2 digits)
    expect(result).toMatch(/^\[\d{2}:\d{2}\.\d{2}\]/);
  });

  it('should handle colon separator (mm:ss:cs)', () => {
    const lrc = '[00:01:50]test';
    const result = offsetLrcTimestamps(lrc, 60);
    expect(result).toBe('[01:01.50]test');
  });

  it('should preserve lines without timestamps', () => {
    const lrc = '[00:01.00]verse\n\n[00:05.00]chorus';
    const result = offsetLrcTimestamps(lrc, 0);
    expect(result).toBe('[00:01.00]verse\n\n[00:05.00]chorus');
  });

  it('should handle empty string', () => {
    expect(offsetLrcTimestamps('', 10)).toBe('');
  });

  it('should handle large offsets (hours)', () => {
    const lrc = '[00:00.00]start';
    const result = offsetLrcTimestamps(lrc, 3720); // 1h 2min
    expect(result).toBe('[62:00.00]start');
  });
});
