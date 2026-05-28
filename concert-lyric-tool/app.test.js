import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadVanillaJs } from './test-utils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

beforeAll(() => {
  loadVanillaJs(path.join(__dirname, 'app.js'));
});

beforeEach(() => {
  localStorage.clear();
});

// ========== formatTime ==========

describe('formatTime', () => {
  it('should format 0 seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format seconds within a minute', () => {
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(59)).toBe('00:59');
  });

  it('should format exactly one minute', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(185)).toBe('03:05');
  });

  it('should format large values (over an hour)', () => {
    expect(formatTime(3661)).toBe('61:01');
  });

  it('should floor fractional seconds', () => {
    expect(formatTime(1.7)).toBe('00:01');
    expect(formatTime(59.9)).toBe('00:59');
  });
});

// ========== parsePlaylist ==========

describe('parsePlaylist', () => {
  it('should parse "1. 歌名" format', () => {
    const result = parsePlaylist('1. 冲动的惩罚');
    expect(result).toEqual(['冲动的惩罚']);
  });

  it('should parse "01 - 歌名" format', () => {
    const result = parsePlaylist('01 - 披着羊皮的狼');
    expect(result).toEqual(['披着羊皮的狼']);
  });

  it('should parse "01、歌名" format', () => {
    const result = parsePlaylist('01、西海情歌');
    expect(result).toEqual(['西海情歌']);
  });

  it('should parse "1) 歌名" format', () => {
    const result = parsePlaylist('1) 冲动的惩罚');
    expect(result).toEqual(['冲动的惩罚']);
  });

  it('should parse plain song names without number prefix', () => {
    const result = parsePlaylist('冲动的惩罚');
    expect(result).toEqual(['冲动的惩罚']);
  });

  it('should parse multiple lines', () => {
    const text = '1. 冲动的惩罚\n2. 披着羊皮的狼\n3. 西海情歌';
    const result = parsePlaylist(text);
    expect(result).toEqual(['冲动的惩罚', '披着羊皮的狼', '西海情歌']);
  });

  it('should filter empty lines', () => {
    const text = '1. A\n\n2. B\n  \n3. C';
    const result = parsePlaylist(text);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('should trim whitespace from lines', () => {
    const result = parsePlaylist('  1. A  ');
    expect(result).toEqual(['A']);
  });

  it('should return empty array for empty input', () => {
    expect(parsePlaylist('')).toEqual([]);
  });
});

// ========== escapeHtml ==========

describe('escapeHtml', () => {
  it('should pass through normal text', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('should escape &', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('should escape <', () => {
    expect(escapeHtml('a<b')).toBe('a&lt;b');
  });

  it('should escape >', () => {
    expect(escapeHtml('a>b')).toBe('a&gt;b');
  });

  it('should escape "', () => {
    expect(escapeHtml('a"b')).toBe('a&quot;b');
  });

  it('should escape all special characters', () => {
    expect(escapeHtml('<script>"&"></script>')).toBe('&lt;script&gt;&quot;&amp;&quot;&gt;&lt;/script&gt;');
  });
});

// ========== parseLrc ==========

describe('parseLrc', () => {
  it('should return empty array for empty input', () => {
    expect(parseLrc('')).toEqual([]);
    expect(parseLrc(null)).toEqual([]);
    expect(parseLrc(undefined)).toEqual([]);
  });

  it('should parse a single timestamped line', () => {
    const result = parseLrc('[00:01.50]第一句歌词');
    expect(result).toHaveLength(1);
    expect(result[0].time).toBeCloseTo(1.5);
    expect(result[0].text).toBe('第一句歌词');
  });

  it('should parse multiple lines with timestamps', () => {
    const lrc = '[00:01.00]第一句\n[00:05.00]第二句\n[00:10.00]第三句';
    const result = parseLrc(lrc);
    expect(result).toHaveLength(3);
    expect(result[0].time).toBeCloseTo(1);
    expect(result[1].time).toBeCloseTo(5);
    expect(result[2].time).toBeCloseTo(10);
  });

  it('should handle colon separator mm:ss:cs', () => {
    const result = parseLrc('[00:01:50]test');
    expect(result[0].time).toBeCloseTo(1.5);
  });

  it('should handle 3-digit centiseconds (milliseconds)', () => {
    const result = parseLrc('[00:01.500]test');
    expect(result[0].time).toBeCloseTo(1.5);
  });

  it('should skip empty text after timestamp', () => {
    const result = parseLrc('[00:01.00]\n[00:02.00]hello');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('hello');
  });

  it('should include lines without timestamps as plain text', () => {
    const result = parseLrc('纯文本行');
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(-1);
    expect(result[0].text).toBe('纯文本行');
  });

  it('should handle mixed timestamped and plain lines (empty lines skipped)', () => {
    const lrc = '[00:01.00]verse\n\n[00:05.00]chorus\noutro';
    const result = parseLrc(lrc);
    expect(result).toHaveLength(3);
    expect(result[0].text).toBe('verse');
    expect(result[1].text).toBe('chorus');
    expect(result[2].text).toBe('outro');
  });

  it('should trim text after timestamp', () => {
    const result = parseLrc('[00:01.00]  hello  ');
    expect(result[0].text).toBe('hello');
  });
});

// ========== ProjectStore ==========

describe('ProjectStore', () => {
  it('should create a project and set it as current', () => {
    const ps = new ProjectStore();
    const project = ps.createProject('太原站', '刀郎');
    expect(project.name).toBe('太原站');
    expect(project.artist).toBe('刀郎');
    expect(project.songs).toEqual([]);
    expect(ps.currentProjectId).toBe(project.id);
  });

  it('should get the current project', () => {
    const ps = new ProjectStore();
    const project = ps.createProject('测试', '歌手');
    expect(ps.getCurrentProject().id).toBe(project.id);
  });

  it('should return null when no current project', () => {
    const ps = new ProjectStore();
    expect(ps.getCurrentProject()).toBeNull();
  });

  it('should switch to another project', () => {
    const ps = new ProjectStore();
    const p1 = ps.createProject('站1', '歌手');
    const p2 = ps.createProject('站2', '歌手');
    expect(ps.switchToProject(p1.id)).toBe(true);
    expect(ps.currentProjectId).toBe(p1.id);
    expect(ps.getCurrentProject().name).toBe('站1');
  });

  it('should return false when switching to non-existent project', () => {
    const ps = new ProjectStore();
    expect(ps.switchToProject('nonexistent')).toBe(false);
  });

  it('should delete a project', () => {
    const ps = new ProjectStore();
    ps.createProject('站1', '歌手');
    const p2 = ps.createProject('站2', '歌手');
    ps.deleteProject(p2.id);
    expect(ps.getAllProjects()).toHaveLength(1);
    expect(ps.getAllProjects()[0].name).toBe('站1');
  });

  it('should auto-switch when deleting current project', () => {
    const ps = new ProjectStore();
    const p1 = ps.createProject('站1', '歌手');
    ps.createProject('站2', '歌手');
    ps.deleteProject(p1.id);
    expect(ps.currentProjectId).not.toBeNull();
  });

  it('should set currentProjectId to null when deleting last project', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.deleteProject(p.id);
    expect(ps.currentProjectId).toBeNull();
  });

  it('should update project fields', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.updateProject(p.id, { name: '站2', artist: '新歌手' });
    expect(ps.getCurrentProject().name).toBe('站2');
    expect(ps.getCurrentProject().artist).toBe('新歌手');
  });

  it('should return false when updating non-existent project', () => {
    const ps = new ProjectStore();
    expect(ps.updateProject('nope', { name: 'x' })).toBe(false);
  });

  it('should add songs to project', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.addSongsToProject(p.id, ['歌1', '歌2']);
    expect(p.songs).toHaveLength(2);
    expect(p.songs[0].title).toBe('歌1');
    expect(p.songs[0].id).toBe(1);
    expect(p.songs[1].title).toBe('歌2');
    expect(p.songs[1].id).toBe(2);
  });

  it('should auto-increment song IDs', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.addSongsToProject(p.id, ['歌1']);
    ps.addSongsToProject(p.id, ['歌2']);
    expect(p.songs[0].id).toBe(1);
    expect(p.songs[1].id).toBe(2);
  });

  it('should mark song start time', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.addSongsToProject(p.id, ['歌1']);
    const result = ps.markSongTime(p.id, 1, 120.5);
    expect(result).toBe(true);
    expect(p.songs[0].start_time).toBe(120.5);
  });

  it('should return false when marking non-existent song', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    expect(ps.markSongTime(p.id, 999, 10)).toBe(false);
  });

  it('should update song lyrics', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    ps.addSongsToProject(p.id, ['歌1']);
    const result = ps.updateSongLyrics(p.id, 1, {
      lyrics_status: 'confirmed',
      lyrics_plain: 'plain text',
      lyrics_lrc: '[00:01.00]synced',
      lyrics_source: 'lrclib',
    });
    expect(result).toBe(true);
    expect(p.songs[0].lyrics_status).toBe('confirmed');
    expect(p.songs[0].lyrics_plain).toBe('plain text');
  });

  it('should return false when updating non-existent song', () => {
    const ps = new ProjectStore();
    const p = ps.createProject('站1', '歌手');
    expect(ps.updateSongLyrics(p.id, 999, {})).toBe(false);
  });

  it('should persist data to localStorage', () => {
    // First store
    const ps1 = new ProjectStore();
    const p = ps1.createProject('太原站', '刀郎');
    ps1.addSongsToProject(p.id, ['冲动的惩罚']);

    // New store loads the same data
    const ps2 = new ProjectStore();
    expect(ps2.getAllProjects()).toHaveLength(1);
    expect(ps2.getAllProjects()[0].name).toBe('太原站');
    expect(ps2.getCurrentProject().name).toBe('太原站');
  });

  it('should return all projects', () => {
    const ps = new ProjectStore();
    ps.createProject('站1', '歌手');
    ps.createProject('站2', '歌手');
    expect(ps.getAllProjects()).toHaveLength(2);
  });
});
