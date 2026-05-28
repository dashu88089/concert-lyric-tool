# 演唱会歌词标记工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure frontend single-page HTML tool for loading concert audio, marking song start times, searching lyrics via LRCLIB, previewing lyrics during playback, and exporting time-offset LRC files.

**Architecture:** Single-page application with three files (HTML + CSS + JS). Audio playback via Web Audio API. Lyrics data from LRCLIB (free, CORS-enabled). Data persistence via localStorage. Export via Blob URL download.

**Tech Stack:** Vanilla JS (no framework), Web Audio API, LRCLIB API, localStorage.

---

## File Structure

```
concert-lyric-tool/
├── index.html         # HTML structure, modal templates, element IDs
├── style.css          # All styles (layout, colors, modals, lyrics)
├── app.js             # Core app logic: project CRUD, audio player, marking, UI binding
├── lyrics-api.js      # LRCLIB API client (search + fetch lyrics)
├── lrc-export.js      # LRC generation with time offset, ZIP download
└── README.md          # Usage instructions
```

---

### Task 1: Project scaffolding — HTML + CSS skeleton

**Files:**
- Create: `concert-lyric-tool/index.html`
- Create: `concert-lyric-tool/style.css`
- Create: `concert-lyric-tool/README.md`

- [ ] **Step 1: Write the HTML skeleton**

Create `index.html` with:
- Three-column layout: left (audio file list), center-top (player), center-bottom (song table with "导入" button per row), right (lyrics pane)
- Top toolbar with project name, buttons for "新建项目", "导入歌单", "项目管理", "导出 LRC"
- Empty modal overlay container for the import dialog (two-step wizard structure)
- Empty modal overlay container for project management
- Audio `<audio>` element (hidden, controlled via JS)
- File input for selecting MP3

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>演唱会歌词标记工具</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <!-- Top Toolbar -->
    <div id="toolbar">
      <span id="appTitle">演唱会歌词标记工具</span>
      <span id="projectName">未选择项目</span>
      <div id="toolbarActions">
        <button id="btnNewProject">新建项目</button>
        <button id="btnImport">导入歌单</button>
        <button id="btnManageProjects">项目管理</button>
        <button id="btnExport">导出 LRC</button>
      </div>
    </div>

    <!-- Main Content: Three Columns -->
    <div id="mainContent">
      <!-- Left: Audio File List -->
      <div id="leftPanel">
        <div class="panel-title">演唱会音频</div>
        <div id="audioList">
          <!-- Dynamically populated -->
          <div class="empty-state">暂无音频文件</div>
        </div>
        <button id="btnAddAudio">＋ 添加音频</button>
        <input type="file" id="audioFileInput" accept="audio/*" hidden>
      </div>

      <!-- Center: Player (top) + Song List (bottom) -->
      <div id="centerPanel">
        <div id="playerSection">
          <div id="currentSongName" class="current-song-label">未加载音频</div>
          <div id="playerControls">
            <button id="btnPrev">⏮</button>
            <button id="btnRewind">◀</button>
            <button id="btnPlayPause">▶</button>
            <button id="btnForward">▶️</button>
            <button id="btnNext">⏭</button>
          </div>
          <div id="timeDisplay">00:00 / 00:00</div>
          <div id="speedControl">
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="0.8">0.8x</button>
            <button class="speed-btn" data-speed="0.6">0.6x</button>
          </div>
          <button id="btnMark">🎵 标记下一首</button>
        </div>

        <div id="songSection">
          <div class="section-title">歌曲列表</div>
          <div id="songTableHeader">
            <span>#</span><span>歌名</span><span>开始时间</span><span>歌词</span><span>操作</span>
          </div>
          <div id="songList"></div>
        </div>
      </div>

      <!-- Right: Lyrics Preview -->
      <div id="rightPanel">
        <!-- Normal lyrics preview -->
        <div id="lyricsNormalView">
          <div id="lyricsHeader">歌词预览</div>
          <div id="lyricsContent">
            <div class="empty-state">暂无歌词</div>
          </div>
        </div>
        <!-- Import mode: search results on right panel -->
        <div id="lyricsImportView" style="display:none;flex-direction:column;height:100%;">
          <div id="importHeader">歌词检索</div>
          <div class="import-scroll">
            <div class="search-progress">
              <div style="display:flex;justify-content:space-between;font-size:13px;color:#888;">
                <span>正在检索歌词...</span>
                <span id="importProgressText">0 / 0</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" id="importProgressFill" style="width:0%"></div></div>
            </div>
            <div id="importResults"></div>
            <div id="importPreviewArea" class="lyrics-preview-area" style="display:none;">
              <div class="preview-toolbar">
                <span id="importPreviewTitle">查看歌词</span>
                <input id="importPreviewArtist" style="width:120px;background:#1a1a2e;border:1px solid #0f3460;color:#e0e0e0;padding:3px 6px;border-radius:3px;font-size:12px;" placeholder="歌手名">
                <button onclick="reSearchImportPreview()" style="font-size:12px;padding:3px 8px;background:#0f3460;border:1px solid #1a508b;border-radius:3px;color:#e0e0e0;">重新搜索</button>
              </div>
              <textarea id="importPreviewText" placeholder="歌词内容，可编辑..."></textarea>
            </div>
            <button id="btnFinishImport" class="import-confirm-btn">确认完成</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Overlay -->
  <div id="modalOverlay" class="modal-overlay hidden">
    <div id="modalContent" class="modal">
      <div id="modalHeader">
        <span id="modalTitle"></span>
        <span id="modalClose">&times;</span>
      </div>
      <div id="modalBody"></div>
      <div id="modalFooter"></div>
    </div>
  </div>

  <!-- Audio element for playback -->
  <audio id="audioPlayer"></audio>

  <script src="lyrics-api.js"></script>
  <script src="lrc-export.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the CSS**

Create `style.css` with the full dark theme:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; background: #1a1a2e; color: #e0e0e0; height: 100vh; overflow: hidden; }
button { cursor: pointer; font-family: inherit; }

/* ========== Top Toolbar ========== */
#toolbar {
  background: #16213e; padding: 8px 16px; display: flex; align-items: center;
  gap: 12px; border-bottom: 1px solid #0f3460; height: 48px;
}
#appTitle { font-size: 15px; font-weight: bold; color: #e94560; }
#projectName { font-size: 13px; color: #888; flex: 1; }
#toolbarActions { display: flex; gap: 6px; }
#toolbarActions button {
  background: #0f3460; color: #e0e0e0; border: 1px solid #1a508b;
  padding: 5px 12px; border-radius: 4px; font-size: 12px;
}
#toolbarActions button:hover { background: #1a508b; }

/* ========== Main Content: Three Columns ========== */
#mainContent { display: flex; height: calc(100vh - 48px); }

/* ===== Left Panel - Audio File List ===== */
#leftPanel {
  width: 220px; min-width: 220px; background: #16213e;
  padding: 12px; display: flex; flex-direction: column; gap: 8px;
  border-right: 1px solid #0f3460;
}
.panel-title { font-size: 12px; color: #888; letter-spacing: 1px; margin-bottom: 4px; }
#audioList { flex: 1; overflow-y: auto; }
.audio-item {
  display: flex; align-items: center; padding: 8px 10px; border-radius: 4px;
  cursor: pointer; font-size: 13px; gap: 6px; margin-bottom: 2px;
}
.audio-item:hover { background: rgba(233,69,96,0.08); }
.audio-item.current { background: rgba(233,69,96,0.15); }
.audio-item .name { flex: 1; color: #e0e0e0; }
.audio-item .dur { font-family: monospace; color: #888; font-size: 11px; }
#btnAddAudio {
  padding: 8px; font-size: 13px; border: 1px dashed #1a508b; border-radius: 4px;
  background: transparent; color: #4fc3f7; text-align: center; margin-top: 4px;
}
#btnAddAudio:hover { background: rgba(79,195,247,0.05); }

/* ===== Center Panel - Player(top) + SongList(bottom) ===== */
#centerPanel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

#playerSection {
  padding: 12px; display: flex; flex-direction: column; gap: 10px;
  border-bottom: 1px solid #0f3460; background: #1a1a2e;
}
.current-song-label { font-size: 13px; color: #888; text-align: center; }

#playerControls { display: flex; gap: 6px; justify-content: center; }
#playerControls button {
  width: 40px; height: 40px; border-radius: 50%; border: none;
  font-size: 18px; background: #0f3460; color: #e0e0e0;
  display: flex; align-items: center; justify-content: center;
}
#playerControls button:hover { background: #1a508b; }
#btnPlayPause { width: 48px; height: 48px; font-size: 22px; background: #e94560; }
#btnPlayPause:hover { background: #ff6b81; }

#timeDisplay { font-family: monospace; font-size: 14px; color: #aaa; text-align: center; }

#speedControl { display: flex; gap: 4px; justify-content: center; }
.speed-btn {
  padding: 4px 10px; font-size: 11px; border-radius: 3px;
  background: #0f3460; color: #888; border: 1px solid transparent;
}
.speed-btn.active { border-color: #e94560; color: #e94560; }
.speed-btn:hover { color: #e0e0e0; }

#btnMark {
  width: 100%; padding: 12px 0; font-size: 15px; font-weight: bold;
  background: #e94560; color: #fff; border: none; border-radius: 8px; letter-spacing: 1px;
}
#btnMark:hover { background: #ff6b81; }
#btnMark:disabled { background: #333; color: #666; cursor: not-allowed; }

/* Song Section */
#songSection { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.section-title {
  font-size: 11px; color: #666; letter-spacing: 1px;
  padding: 6px 12px; background: #0f0f23; border-bottom: 1px solid #0f3460;
}
#songTableHeader {
  display: grid; grid-template-columns: 30px 1fr 70px 60px 50px;
  padding: 6px 12px; font-size: 11px; color: #666; border-bottom: 1px solid #0f3460;
}
#songList { flex: 1; overflow-y: auto; }
.song-row {
  display: grid; grid-template-columns: 30px 1fr 70px 60px 50px;
  padding: 7px 12px; border-bottom: 1px solid #0f3460; font-size: 13px;
  align-items: center; cursor: pointer;
}
.song-row:hover { background: rgba(233,69,96,0.08); }
.song-row.current { background: rgba(233,69,96,0.15); }
.song-row .idx { color: #888; }
.song-row .title { color: #e0e0e0; }
.song-row .time { font-family: monospace; color: #e94560; font-size: 12px; }
.btn-sm {
  font-size: 11px; padding: 2px 8px; background: #0f3460; color: #aaa;
  border: 1px solid #1a508b; border-radius: 3px; cursor: pointer;
}
.btn-sm:hover { color: #fff; }

.status-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.status-badge.confirmed { background: #1b5e20; color: #81c784; }
.status-badge.pending { background: #e65100; color: #ffb74d; }
.status-badge.notfound { background: #b71c1c; color: #ef9a9a; }

.empty-state { padding: 40px; text-align: center; color: #555; font-size: 14px; }

/* Right Panel - Lyrics */
#rightPanel {
  width: 340px; min-width: 340px; background: #0f0f23; border-left: 1px solid #0f3460;
  display: flex; flex-direction: column; overflow: hidden;
}
#lyricsHeader {
  padding: 12px 16px; font-size: 13px; color: #888;
  border-bottom: 1px solid #0f3460;
}
#lyricsContent {
  flex: 1; padding: 16px; overflow-y: auto; line-height: 2;
}
.lyric-line {
  padding: 3px 8px; font-size: 15px; color: #888; border-left: 3px solid transparent;
  transition: all 0.15s;
}
.lyric-line.active {
  color: #fff; font-weight: bold; font-size: 16px;
  border-left-color: #e94560; background: rgba(233,69,96,0.1);
}
.lyric-line .lyric-time { font-family: monospace; font-size: 11px; color: #555; margin-right: 8px; }

/* Right Panel - Import Mode */
#importHeader {
  padding: 12px 16px; font-size: 13px; color: #888;
  border-bottom: 1px solid #0f3460;
}
.import-scroll { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; }
.import-confirm-btn {
  width: 100%; padding: 10px; background: #e94560; border: none; border-radius: 6px;
  color: #fff; font-size: 14px; font-weight: bold; margin-top: 12px; cursor: pointer;
}
.import-confirm-btn:hover { background: #ff6b81; }

/* ========== Modal ========== */
.modal-overlay {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 100;
  justify-content: center; align-items: center;
}
.modal-overlay.active { display: flex; }
#modalContent {
  background: #16213e; border-radius: 10px; min-width: 520px;
  max-width: 700px; max-height: 85vh;
  display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
#modalHeader {
  padding: 14px 20px; border-bottom: 1px solid #0f3460;
  font-size: 15px; font-weight: bold; display: flex;
  justify-content: space-between; align-items: center;
}
#modalClose { cursor: pointer; font-size: 22px; color: #888; }
#modalClose:hover { color: #e94560; }
#modalBody { padding: 20px; overflow-y: auto; flex: 1; max-height: 60vh; }
#modalFooter {
  padding: 12px 20px; border-top: 1px solid #0f3460;
  display: flex; gap: 8px; justify-content: flex-end;
}
#modalFooter button {
  padding: 7px 18px; border-radius: 4px; border: 1px solid #0f3460;
  font-size: 13px; background: #0f3460; color: #e0e0e0;
}
#modalFooter button.primary { background: #e94560; border-color: #e94560; font-weight: bold; }
#modalFooter button:disabled { opacity: 0.4; cursor: not-allowed; }

/* Step Indicator */
.step-indicator { display: flex; gap: 8px; margin-bottom: 20px; align-items: center; }
.step-dot {
  width: 30px; height: 30px; border-radius: 50%; background: #0f3460;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: #888;
}
.step-dot.active { background: #e94560; color: #fff; }
.step-dot.done { background: #1b5e20; color: #81c784; }
.step-line { flex: 1; height: 2px; background: #0f3460; }
.step-line.done { background: #1b5e20; }

/* Import Step 1 */
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; }
.field textarea, .field input {
  width: 100%; background: #1a1a2e; border: 1px solid #0f3460;
  color: #e0e0e0; padding: 8px 10px; border-radius: 4px; font-size: 13px;
  font-family: inherit;
}
.field textarea { height: 200px; resize: vertical; line-height: 1.8; }

.parsed-list { margin-top: 12px; }
.parsed-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-bottom: 1px solid #0f3460; font-size: 13px;
}
.parsed-item .p-idx { color: #888; min-width: 24px; }
.parsed-item .p-title { flex: 1; }
.parsed-item .p-title input {
  background: transparent; border: 1px solid transparent; color: #e0e0e0;
  font-size: 13px; padding: 2px 4px; width: 100%;
}
.parsed-item .p-title input:focus { border-color: #1a508b; outline: none; background: #1a1a2e; border-radius: 2px; }

/* Import Step 2 - Lyrics Search Results */
.search-progress { margin-bottom: 16px; }
.progress-bar { height: 6px; background: #0f3460; border-radius: 3px; overflow: hidden; margin-top: 6px; }
.progress-fill { height: 100%; background: #e94560; border-radius: 3px; transition: width 0.3s; }

.lyrics-result-item {
  display: grid; grid-template-columns: 28px 1fr 80px 60px 60px;
  padding: 8px 10px; border-bottom: 1px solid #0f3460; font-size: 13px;
  align-items: center; gap: 6px;
}
.lyrics-result-item:hover { background: rgba(233,69,96,0.05); }
.lyrics-result-item .lr-idx { color: #888; }
.lyrics-result-item .lr-title { color: #e0e0e0; }
.lyrics-result-item .lr-artist { color: #888; font-size: 12px; }
.lyrics-result-item .lr-status { font-size: 11px; }

.lyrics-preview-area { margin-top: 12px; }
.lyrics-preview-area textarea {
  width: 100%; height: 250px; background: #1a1a2e; border: 1px solid #0f3460;
  color: #e0e0e0; padding: 12px; border-radius: 6px; font-size: 13px;
  font-family: monospace; line-height: 1.8; resize: vertical;
}
.lyrics-preview-area .preview-toolbar {
  display: flex; gap: 6px; margin-bottom: 8px; align-items: center;
}
.lyrics-preview-area .preview-toolbar span { font-size: 13px; color: #888; flex: 1; }
.lyrics-preview-area .preview-toolbar button { font-size: 12px; padding: 4px 10px; }

/* Project Management */
.project-list-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-bottom: 1px solid #0f3460;
  cursor: pointer; font-size: 13px;
}
.project-list-item:hover { background: rgba(233,69,96,0.05); }
.project-list-item .pl-name { flex: 1; color: #e0e0e0; }
.project-list-item .pl-artist { color: #888; font-size: 12px; }
.project-list-item .pl-count { color: #555; font-size: 11px; }
.project-list-item .pl-delete { color: #ef9a9a; cursor: pointer; font-size: 11px; }
.project-list-item .pl-delete:hover { color: #ff5252; }

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #1a508b; }
```

- [ ] **Step 3: Write README.md**

Create a minimal usage guide:

```markdown
# 演唱会歌词标记工具

纯前端单页应用，用于加载演唱会音频、标记每首歌开始时间、检索歌词、导出带时间偏移的 LRC 文件。

## 使用方法

1. 在浏览器中打开 `index.html`
2. 点击"新建项目"，输入演唱会名称和歌手
3. 点击"导入歌单"，粘贴歌单 → 确认 → 检索歌词 → 完成
4. 点击"添加音频"选择 MP3 文件加载
5. 播放音频，每听到下一首歌开始时点击"标记下一首"
6. 标记完成后点击"导出 LRC"

## 技术说明

- 纯前端，零后端依赖
- 数据存储在浏览器 localStorage
- 歌词来源：LRCLIB API（lrclib.net）
```

- [ ] **Step 4: Verify files exist**

Run: `dir concert-lyric-tool\`
Expected: `index.html`, `style.css`, `README.md` listed

- [ ] **Step 5: Commit**

```bash
git add concert-lyric-tool/index.html concert-lyric-tool/style.css concert-lyric-tool/README.md
git commit -m "feat: scaffold project structure with HTML, CSS, and README"
```

---

### Task 2: Data model + localStorage persistence layer

**Files:**
- Create: `concert-lyric-tool/app.js`

This task implements the `ProjectStore` class — the single source of truth for all project data.

- [ ] **Step 1: Write the data model tests (in comments / manual verification)**

Add a comment block at the top of `app.js` documenting the data model shape (from the spec), then implement the store.

- [ ] **Step 2: Implement ProjectStore**

Add to `app.js`:

```javascript
// ========== Data Store ==========
const STORAGE_KEY = 'concert_lyric_projects';

class ProjectStore {
  constructor() {
    this.projects = [];  // Array of { id, name, artist, mp3_name, songs[] }
    this.currentProjectId = null;
    this.load();
  }

  // Load from localStorage
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.projects = data.projects || [];
        this.currentProjectId = data.currentProjectId || null;
      }
    } catch (e) {
      console.warn('Failed to load projects from localStorage:', e);
      this.projects = [];
      this.currentProjectId = null;
    }
  }

  // Save to localStorage
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      projects: this.projects,
      currentProjectId: this.currentProjectId,
    }));
  }

  // Get current project
  getCurrentProject() {
    if (!this.currentProjectId) return null;
    return this.projects.find(p => p.id === this.currentProjectId) || null;
  }

  // Create new project
  createProject(name, artist) {
    const project = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      artist: artist,
      mp3_name: '',
      songs: [],
      createdAt: Date.now(),
    };
    this.projects.push(project);
    this.currentProjectId = project.id;
    this.save();
    return project;
  }

  // Delete project
  deleteProject(id) {
    this.projects = this.projects.filter(p => p.id !== id);
    if (this.currentProjectId === id) {
      this.currentProjectId = this.projects.length > 0 ? this.projects[0].id : null;
    }
    this.save();
  }

  // Get all projects (for management UI)
  getAllProjects() {
    return this.projects;
  }

  // Switch current project
  switchToProject(id) {
    if (this.projects.find(p => p.id === id)) {
      this.currentProjectId = id;
      this.save();
      return true;
    }
    return false;
  }

  // Update project field
  updateProject(id, updates) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return false;
    Object.assign(project, updates);
    this.save();
    return true;
  }

  // Add songs to project
  addSongsToProject(projectId, songTitles) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;
    const startIdx = project.songs.length + 1;
    songTitles.forEach((title, i) => {
      project.songs.push({
        id: startIdx + i,
        title: title,
        artist_override: null,
        start_time: 0,
        lyrics_status: 'pending',
        lyrics_plain: '',
        lyrics_lrc: '',
        lyrics_source: '',
      });
    });
    this.save();
  }

  // Update a song's lyrics data
  updateSongLyrics(projectId, songId, lyricsData) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return false;
    const song = project.songs.find(s => s.id === songId);
    if (!song) return false;
    Object.assign(song, lyricsData);
    this.save();
    return true;
  }

  // Mark song start time
  markSongTime(projectId, songId, startTime) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return false;
    const song = project.songs.find(s => s.id === songId);
    if (!song) return false;
    song.start_time = startTime;
    this.save();
    return true;
  }
}

// Global instance
const store = new ProjectStore();
```

- [ ] **Step 3: Verify the store works**

Open `index.html` in a browser, open DevTools console, run:

```javascript
store.createProject('测试演唱会', '测试歌手');
store.addSongsToProject(store.currentProjectId, ['歌1', '歌2', '歌3']);
console.log(store.getCurrentProject());
```

Expected: Project object appears with 3 songs. localStorage has the data.

- [ ] **Step 4: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add ProjectStore with localStorage persistence"
```

---

### Task 3: New project dialog + project management dialog

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement modal utility functions**

Add to `app.js`:

```javascript
// ========== Modal System ==========
const modal = {
  overlay: document.getElementById('modalOverlay'),
  content: document.getElementById('modalContent'),
  title: document.getElementById('modalTitle'),
  body: document.getElementById('modalBody'),
  footer: document.getElementById('modalFooter'),

  open(title, bodyHTML, footerHTML) {
    this.title.textContent = title;
    this.body.innerHTML = bodyHTML;
    this.footer.innerHTML = footerHTML || '';
    this.overlay.classList.add('active');
  },

  close() {
    this.overlay.classList.remove('active');
  },
};

document.getElementById('modalClose').addEventListener('click', () => modal.close());
modal.overlay.addEventListener('click', (e) => {
  if (e.target === modal.overlay) modal.close();
});
```

- [ ] **Step 2: Implement "New Project" dialog**

Add to `app.js`:

```javascript
// ========== New Project ==========
document.getElementById('btnNewProject').addEventListener('click', () => {
  modal.open('新建项目', `
    <div class="field">
      <label>演唱会名称</label>
      <input id="inputProjName" placeholder="如：2025 巡回演唱会 太原站">
    </div>
    <div class="field">
      <label>歌手（全局默认）</label>
      <input id="inputProjArtist" placeholder="如：刀郎">
    </div>
  `, `
    <button onclick="modal.close()">取消</button>
    <button class="primary" onclick="createProject()">创建</button>
  `);
});

function createProject() {
  const name = document.getElementById('inputProjName').value.trim();
  const artist = document.getElementById('inputProjArtist').value.trim();
  if (!name || !artist) { alert('请填写演唱会名称和歌手'); return; }
  store.createProject(name, artist);
  modal.close();
  refreshUI();
}
```

- [ ] **Step 3: Implement "Project Management" dialog**

Add to `app.js`:

```javascript
// ========== Project Management ==========
document.getElementById('btnManageProjects').addEventListener('click', () => {
  renderProjectList();
});

function renderProjectList() {
  const projects = store.getAllProjects();
  if (projects.length === 0) {
    modal.open('项目管理', '<div class="empty-state">暂无项目</div>', '');
    return;
  }
  let html = '';
  projects.forEach(p => {
    const isCurrent = p.id === store.currentProjectId;
    html += `
      <div class="project-list-item" data-id="${p.id}">
        <span style="color:${isCurrent ? '#e94560' : '#888'}; font-size:16px;">
          ${isCurrent ? '▶' : '○'}
        </span>
        <span class="pl-name">${p.name}</span>
        <span class="pl-artist">${p.artist}</span>
        <span class="pl-count">${p.songs.length} 首</span>
        <span class="pl-delete" onclick="event.stopPropagation(); deleteProject('${p.id}')">删除</span>
      </div>
    `;
  });
  modal.open('项目管理 - 点击切换项目', html, `
    <button onclick="modal.close()">关闭</button>
  `);
  // Click to switch
  document.querySelectorAll('.project-list-item').forEach(el => {
    el.addEventListener('click', function() {
      store.switchToProject(this.dataset.id);
      modal.close();
      refreshUI();
    });
  });
}

function deleteProject(id) {
  if (!confirm('确定删除此项目？此操作不可恢复。')) return;
  store.deleteProject(id);
  renderProjectList();
  refreshUI();
}
```

- [ ] **Step 4: Implement refreshUI**

Add to `app.js`:

```javascript
// ========== UI Refresh ==========
function refreshUI() {
  const project = store.getCurrentProject();
  if (!project) {
    document.getElementById('projectName').textContent = '未选择项目';
    document.getElementById('songList').innerHTML = '<div class="empty-state">请先新建项目</div>';
    document.getElementById('lyricsContent').innerHTML = '<div class="empty-state">暂无歌词</div>';
    document.getElementById('btnMark').disabled = true;
    return;
  }
  document.getElementById('projectName').textContent = `${project.name} - ${project.artist}`;
  document.getElementById('btnMark').disabled = project.songs.length === 0;

  // Render song list
  renderSongList(project);

  // Update lyrics if current song selected
  updateLyricsPreview();
}

function renderSongList(project) {
  const container = document.getElementById('songList');
  if (project.songs.length === 0) {
    container.innerHTML = '<div class="empty-state">请导入歌单</div>';
    return;
  }
  let html = '';
  project.songs.forEach(song => {
    const statusMap = {
      confirmed: '<span class="status-badge confirmed">已确认</span>',
      pending: '<span class="status-badge pending">待确认</span>',
      not_found: '<span class="status-badge notfound">未找到</span>',
      manual: '<span class="status-badge pending">手动</span>',
    };
    const timeStr = song.start_time > 0 ? formatTime(song.start_time) : '--:--';
    const needsImport = song.lyrics_status === 'pending' || song.lyrics_status === 'not_found';
    html += `
      <div class="song-row" data-song-id="${song.id}">
        <span class="idx">${song.id}</span>
        <span class="title">${song.title}</span>
        <span class="time">${timeStr}</span>
        <span class="status">${statusMap[song.lyrics_status] || statusMap.pending}</span>
        <span class="action">${needsImport ? '<button class="btn-sm" onclick="openImportForSong(' + song.id + ')">导入</button>' : ''}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
```

- [ ] **Step 5: Test the dialog flow**

Open `index.html` in browser. Click "新建项目" → fill in name and artist → click "创建".
Expected: Project name appears in toolbar, song list shows "请导入歌单".

Click "项目管理" → see the project listed with "▶" indicator.

- [ ] **Step 6: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add modal system, new project dialog, project management"
```

---

### Task 4: Two-step import dialog — Step 1 (paste + parse playlist)

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement playlist parser**

```javascript
// ========== Playlist Parser ==========
function parsePlaylist(text) {
  // Split by line, trim whitespace, remove empty lines
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Try to extract song names:
  // Support formats: "1. 歌名" / "01 - 歌名" / "01-歌名" / "歌名"
  return lines.map(line => {
    // Remove leading number/pattern: "1. ", "01-", "01 - ", "1、"
    let title = line.replace(/^\d+[\.\-\、\)]\s*/, '');
    // Remove leading "01 " but only if followed by Chinese or letter
    title = title.replace(/^\d{1,2}\s+/, '');
    // If after stripping we got nothing, use the original line
    return title.trim() || line;
  });
}
```

- [ ] **Step 2: Wire up "导入歌单" button to open the two-step import modal**

```javascript
// ========== Import Wizard (Two-Step Modal) ==========
let importStep = 1;
let parsedSongs = [];

document.getElementById('btnImport').addEventListener('click', () => {
  const project = store.getCurrentProject();
  if (!project) { alert('请先新建项目'); return; }
  importStep = 1;
  parsedSongs = [];
  renderImportStep1();
});

function renderImportStep1() {
  const project = store.getCurrentProject();
  modal.open('导入与歌词确认', `
    <div class="step-indicator">
      <div class="step-dot active" id="s1">1</div>
      <div class="step-line" id="sl1"></div>
      <div class="step-dot" id="s2">2</div>
    </div>
    <div id="step1Content">
      <div class="field">
        <label>歌手（全局）：${project.artist}</label>
      </div>
      <div class="field">
        <label>粘贴歌单，每行一首：</label>
        <textarea id="playlistInput" placeholder="1. 冲动的惩罚&#10;2. 披着羊皮的狼&#10;3. 西海情歌&#10;..."></textarea>
      </div>
      <button id="btnParsePlaylist" class="primary" style="padding:6px 16px;background:#e94560;border:none;border-radius:4px;color:#fff;font-size:13px;">解析歌单</button>
      <div id="parsedResult"></div>
    </div>
  `, `
    <button onclick="modal.close()">取消</button>
    <button id="btnStep1Next" class="primary" disabled>下一步</button>
  `);
}

// Parsing logic attached via onclick in runtime
document.addEventListener('click', function(e) {
  if (e.target.id === 'btnParsePlaylist') {
    const text = document.getElementById('playlistInput').value;
    const titles = parsePlaylist(text);
    if (titles.length === 0) { alert('请粘贴歌曲列表'); return; }
    parsedSongs = titles;
    renderParsedResult(titles);
  }
});

function renderParsedResult(titles) {
  let html = '<div class="parsed-list"><h4 style="margin-bottom:8px;font-size:13px;color:#888;">解析结果：共 ' + titles.length + ' 首</h4>';
  titles.forEach((title, i) => {
    html += `
      <div class="parsed-item">
        <span class="p-idx">${i + 1}</span>
        <span class="p-title"><input type="text" value="${escapeHtml(title)}" data-idx="${i}"></span>
      </div>
    `;
  });
  html += '</div>';
  document.getElementById('parsedResult').innerHTML = html;
  document.getElementById('btnStep1Next').disabled = false;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

- [ ] **Step 3: Implement "下一步" — go to Step 2 within modal**

```javascript
document.addEventListener('click', function(e) {
  if (e.target.id === 'btnStep1Next') {
    // Collect current values from editable fields
    document.querySelectorAll('#parsedResult input').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      if (idx >= 0) parsedSongs[idx] = input.value.trim();
    });
    // Filter out empty songs
    parsedSongs = parsedSongs.filter(s => s.length > 0);
    if (parsedSongs.length === 0) { alert('没有有效的歌曲'); return; }
    // Proceed to Step 2 within modal (two-column layout)
    renderImportStep2();
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add import step 1 - paste and parse playlist"
```

---

### Task 5: LRCLIB API client

**Files:**
- Create: `concert-lyric-tool/lyrics-api.js`

- [ ] **Step 1: Implement lyric search function**

```javascript
// ========== LRCLIB API Client ==========
const LRCLIB_BASE = 'https://lrclib.net/api';

async function searchLyrics(trackName, artistName) {
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
```

- [ ] **Step 2: Commit**

```bash
git add concert-lyric-tool/lyrics-api.js
git commit -m "feat: add LRCLIB API client for lyric search"
```

---

### Task 6: Two-step import — Step 2 (lyrics search + confirm within modal)

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement renderImportStep2 with two-column layout**

```javascript
// ========== Import Step 2: Lyrics Search (Modal Two-Column) ==========
let lyricsResults = [];

function renderImportStep2() {
  const project = store.getCurrentProject();
  importStep = 2;
  document.getElementById('modalContent').classList.add('modal-wide');

  let items = '';
  parsedSongs.forEach((title, i) => {
    items += `
      <div class="lyrics-result-item" data-idx="${i}" onclick="showImportLyrics(${i})">
        <span class="lr-idx">${i + 1}</span>
        <span class="lr-title">${escapeHtml(title)}</span>
        <span class="lr-artist" id="lrArtist${i}">—</span>
        <span class="lr-status" id="lrStatus${i}">⏳ 等待</span>
      </div>
    `;
  });

  modal.open('歌词检索', `
    <div class="step-indicator">
      <div class="step-dot done" id="s1">1</div>
      <div class="step-line done"></div>
      <div class="step-dot active">2</div>
    </div>
    <div class="search-progress">
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#888;">
        <span>正在检索歌词...</span>
        <span id="importProgressText">0 / ${parsedSongs.length}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="importProgressFill" style="width:0%"></div></div>
    </div>
    <div style="display:flex;gap:16px;min-height:300px;">
      <div style="flex:1;overflow-y:auto;" id="importResults">${items}</div>
      <div style="flex:1;overflow-y:auto;border-left:1px solid #0f3460;padding-left:16px;" id="importLyricsColumn">
        <div style="color:#555;font-size:13px;padding:60px 0;text-align:center;">点击左侧歌曲查看歌词</div>
      </div>
    </div>
  `, `
    <button onclick="cancelImport()">取消</button>
    <button class="primary" onclick="finishImportStep2()" id="btnFinishImport">完成</button>
  `);

  // Start batch search
  searchAllLyrics();
}

function cancelImport() {
  modal.close();
}
```

- [ ] **Step 2: Implement batch search (populates left column)**

```javascript
async function searchAllLyrics() {
  const project = store.getCurrentProject();
  lyricsResults = [];
  let completed = 0;

  for (let i = 0; i < parsedSongs.length; i++) {
    const title = parsedSongs[i];
    const statusEl = document.getElementById(`lrStatus${i}`);
    const artistEl = document.getElementById(`lrArtist${i}`);

    statusEl.textContent = '⏳ 搜索中...';
    const result = await searchLyrics(title, project.artist);

    if (result) {
      const hasSynced = result.syncedLyrics && result.syncedLyrics.trim().length > 0;
      const hasPlain = result.plainLyrics && result.plainLyrics.trim().length > 0;
      lyricsResults[i] = {
        title, artist: result.artist,
        lyricsText: hasSynced ? result.syncedLyrics : (hasPlain ? result.plainLyrics : ''),
        status: hasSynced ? 'synced' : (hasPlain ? 'plain' : 'not_found'),
      };
      artistEl.textContent = result.artist;
      statusEl.innerHTML = hasSynced ? '✅ 同步' : (hasPlain ? '⚠️ 纯文本' : '❌ 未找到');
    } else {
      lyricsResults[i] = { title, artist: '', lyricsText: '', status: 'not_found' };
      statusEl.innerHTML = '❌ 未找到';
    }

    completed++;
    document.getElementById('importProgressText').textContent = completed + ' / ' + parsedSongs.length;
    document.getElementById('importProgressFill').style.width = (completed / parsedSongs.length * 100) + '%';
  }
}
```

- [ ] **Step 3: Implement lyrics preview in modal right column**

```javascript
let currentLyricIdx = -1;

function showImportLyrics(idx) {
  currentLyricIdx = idx;
  const result = lyricsResults[idx];
  const title = parsedSongs[idx];
  const project = store.getCurrentProject();

  // Highlight selected row
  document.querySelectorAll('.lyrics-result-item').forEach(el => el.style.background = '');
  const row = document.querySelector(`.lyrics-result-item[data-idx="${idx}"]`);
  if (row) row.style.background = 'rgba(233,69,96,0.15)';

  // Fill right column
  document.getElementById('importLyricsColumn').innerHTML = `
    <div style="margin-bottom:8px;">
      <div style="font-size:13px;font-weight:bold;color:#e0e0e0;margin-bottom:4px;">${escapeHtml(title)}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="importPreviewArtist" style="flex:1;background:#1a1a2e;border:1px solid #0f3460;color:#e0e0e0;padding:3px 6px;border-radius:3px;font-size:12px;" value="${escapeHtml(result ? result.artist || project.artist : project.artist)}">
        <button onclick="reSearchLyric()" style="font-size:12px;padding:3px 8px;background:#0f3460;border:1px solid #1a508b;border-radius:3px;color:#e0e0e0;">重新搜索</button>
      </div>
    </div>
    <textarea style="width:100%;min-height:250px;background:#1a1a2e;border:1px solid #0f3460;color:#e0e0e0;padding:12px;border-radius:4px;font-size:13px;font-family:monospace;line-height:1.8;resize:vertical;box-sizing:border-box;">${result && result.lyricsText ? result.lyricsText : '（未找到歌词）'}</textarea>`;
}

async function reSearchLyric() {
  if (currentLyricIdx < 0) return;
  const title = parsedSongs[currentLyricIdx];
  const artist = document.getElementById('importPreviewArtist').value.trim();
  const textarea = document.querySelector('#importLyricsColumn textarea');
  if (!textarea || !artist) { alert('请输入歌手名'); return; }

  textarea.value = '搜索中...';
  const result = await searchLyrics(title, artist);

  if (result) {
    const text = result.syncedLyrics || result.plainLyrics || '';
    lyricsResults[currentLyricIdx] = { title, artist: result.artist, lyricsText: text, status: result.syncedLyrics ? 'synced' : (result.plainLyrics ? 'plain' : 'not_found') };
    textarea.value = text || '（未找到歌词）';
    const statusEl = document.getElementById(`lrStatus${currentLyricIdx}`);
    if (result.syncedLyrics) statusEl.innerHTML = '✅ 同步';
    else if (result.plainLyrics) statusEl.innerHTML = '⚠️ 纯文本';
    else statusEl.innerHTML = '❌ 未找到';
  } else {
    lyricsResults[currentLyricIdx] = { title, artist: '', lyricsText: '', status: 'not_found' };
    textarea.value = '（未找到歌词）';
    document.getElementById(`lrStatus${currentLyricIdx}`).innerHTML = '❌ 未找到';
  }
}
```

- [ ] **Step 4: Implement "完成" — save songs + lyrics, close modal**

```javascript
function finishImportStep2() {
  const project = store.getCurrentProject();
  if (!project) return;

  // Save songs to project
  store.addSongsToProject(project.id, parsedSongs);

  // Update lyrics for each song
  const savedSongs = store.getCurrentProject().songs;
  lyricsResults.forEach((result, i) => {
    if (!result) return;
    const song = savedSongs[i];
    if (!song) return;
    const updates = {
      lyrics_status: result.status === 'not_found' ? 'not_found' : 'confirmed',
      lyrics_plain: result.lyricsText,
      lyrics_lrc: result.lyricsText,
      lyrics_source: result.status === 'synced' ? 'lrclib' : (result.status === 'plain' ? 'lrclib_plain' : ''),
    };
    if (result.artist && result.artist !== project.artist) {
      updates.artist_override = result.artist;
    }
    store.updateSongLyrics(project.id, song.id, updates);
  });

  document.getElementById('modalContent').classList.remove('modal-wide');
  modal.close();
  refreshUI();
}

// Open import for a single song (from "导入" button in song rows)
function openImportForSong(songId) {
  const project = store.getCurrentProject();
  const song = project.songs.find(s => s.id === songId);
  if (!song) return;
  parsedSongs = [song.title];
  renderImportStep2();
}
```

- [ ] **Step 5: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add import step 2 - batch lyric search with two-column modal layout"
```

---

### Task 7: Audio player with playback controls

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement audio player**

```javascript
// ========== Audio Player ==========
const audio = document.getElementById('audioPlayer');
let isPlaying = false;
let currentSpeed = 1;
let currentSongIndex = -1;  // Index into the current project's songs array

// Load audio file
document.getElementById('audioFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  audio.src = url;
  audio.playbackRate = currentSpeed;
  document.getElementById('currentSongName').textContent = '🎵 ' + file.name;

  // Add to audio list
  addAudioToList(file.name, '--:--');

  // Store mp3 name in project
  const project = store.getCurrentProject();
  if (project) {
    store.updateProject(project.id, { mp3_name: file.name });
  }
  // Reset current song index
  currentSongIndex = -1;
  updateMarkButton();

  // Enable play/pause
  document.getElementById('btnPlayPause').disabled = false;
});

document.getElementById('btnAddAudio').addEventListener('click', () => {
  document.getElementById('audioFileInput').click();
});

function addAudioToList(name, duration) {
  const list = document.getElementById('audioList');
  // Remove empty state
  const empty = list.querySelector('.empty-state');
  if (empty) list.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'audio-item current';
  // Remove current from others
  list.querySelectorAll('.audio-item').forEach(el => el.classList.remove('current'));
  item.innerHTML = `<span class="name">${escapeHtml(name)}</span><span class="dur">${duration}</span>`;
  item.addEventListener('click', function() {
    list.querySelectorAll('.audio-item').forEach(el => el.classList.remove('current'));
    this.classList.add('current');
  });
  list.appendChild(item);
}

// Play / Pause
document.getElementById('btnPlayPause').addEventListener('click', togglePlay);
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && !e.target.closest('input,textarea')) {
    e.preventDefault();
    togglePlay();
  }
});

function togglePlay() {
  if (!audio.src) { alert('请先加载音频文件'); return; }
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play();
  }
  isPlaying = !isPlaying;
  document.getElementById('btnPlayPause').textContent = isPlaying ? '⏸' : '▶';
}

// Update time display
audio.addEventListener('timeupdate', () => {
  const current = formatTime(audio.currentTime);
  const total = formatTime(audio.duration || 0);
  document.getElementById('timeDisplay').textContent = `${current} / ${total}`;

  // Update lyrics highlighting
  updateLyricsHighlight(audio.currentTime);
});

// Speed control
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentSpeed = parseFloat(this.dataset.speed);
    audio.playbackRate = currentSpeed;
  });
});
```

- [ ] **Step 2: Implement navigation buttons**

```javascript
// Seek controls
document.getElementById('btnRewind').addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 5);
});
document.getElementById('btnForward').addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
});
document.getElementById('btnPrev').addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 10);
});
document.getElementById('btnNext').addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
});
```

- [ ] **Step 3: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add audio player with playback controls"
```

---

### Task 8: Song marking functionality

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement the mark button logic**

```javascript
// ========== Song Marking ==========
document.getElementById('btnMark').addEventListener('click', markNextSong);

function markNextSong() {
  const project = store.getCurrentProject();
  if (!project || project.songs.length === 0) return;
  if (!audio.src) { alert('请先加载音频文件'); return; }

  // Find next unmarked song (start_time === 0)
  const nextIdx = project.songs.findIndex(s => s.start_time === 0);
  if (nextIdx === -1) {
    alert('所有歌曲已标记完成！');
    return;
  }

  const song = project.songs[nextIdx];
  const currentTime = audio.currentTime;

  // Ask user to confirm the song name
  const userTitle = prompt(`标记第 ${song.id} 首歌：
当前播放时间：${formatTime(currentTime)}
歌名：${song.title}

如需修改歌名，请直接编辑后确定：`, song.title);

  if (userTitle === null) return;  // User cancelled

  const finalTitle = userTitle.trim() || song.title;

  // Update song
  store.markSongTime(project.id, song.id, currentTime);
  if (finalTitle !== song.title) {
    store.updateSongLyrics(project.id, song.id, { title: finalTitle, lyrics_status: 'pending' });
  }

  currentSongIndex = nextIdx;
  refreshUI();
  updateMarkButton();
}

function updateMarkButton() {
  const project = store.getCurrentProject();
  if (!project || project.songs.length === 0) {
    document.getElementById('btnMark').textContent = '🎵 标记下一首';
    document.getElementById('btnMark').disabled = true;
    return;
  }
  const nextIdx = project.songs.findIndex(s => s.start_time === 0);
  if (nextIdx === -1) {
    document.getElementById('btnMark').textContent = '✅ 全部标记完成';
    return;
  }
  document.getElementById('btnMark').textContent = `🎵 标记第 ${nextIdx + 1} 首：${project.songs[nextIdx].title}`;
  document.getElementById('btnMark').disabled = false;
}
```

- [ ] **Step 2: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add song marking with time recording"
```

---

### Task 9: Lyrics preview with line highlighting

**Files:**
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Implement lyrics display and highlight**

```javascript
// ========== Lyrics Preview ==========
let currentLyricLines = [];

// Parse LRC string into array of { time, text }
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const regex = /\[(\d{2}):(\d{2})[\.:](\d{2,3})\](.*)/;

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = parseInt(match[3]);
      const time = minutes * 60 + seconds + centiseconds / (match[3].length === 2 ? 100 : 1000);
      const text = match[4].trim();
      if (text) result.push({ time, text });
    } else if (line.trim()) {
      // Line without timestamp (plain lyrics)
      result.push({ time: -1, text: line.trim() });
    }
  });
  return result;
}

function updateLyricsPreview() {
  const project = store.getCurrentProject();
  if (!project) {
    document.getElementById('lyricsContent').innerHTML = '<div class="empty-state">暂无歌词</div>';
    return;
  }

  // Find the current song (the one being played or last marked)
  const currentSong = currentSongIndex >= 0 && currentSongIndex < project.songs.length
    ? project.songs[currentSongIndex]
    : project.songs.find(s => s.start_time > 0);

  if (!currentSong) {
    document.getElementById('lyricsContent').innerHTML = '<div class="empty-state">标记歌曲后显示歌词</div>';
    return;
  }

  const lyrics = currentSong.lyrics_lrc || currentSong.lyrics_plain;
  if (!lyrics) {
    document.getElementById('lyricsContent').innerHTML = '<div class="empty-state">该歌曲暂无歌词</div>';
    return;
  }

  currentLyricLines = parseLrc(lyrics);
  if (currentLyricLines.length === 0) {
    document.getElementById('lyricsContent').innerHTML = '<div class="empty-state">歌词格式无效</div>';
    return;
  }

  let html = '';
  currentLyricLines.forEach((line, i) => {
    const timeStr = line.time >= 0 ? `[${formatTime(line.time)}]` : '';
    html += `<div class="lyric-line" data-idx="${i}">
      <span class="lyric-time">${timeStr}</span>${escapeHtml(line.text)}
    </div>`;
  });
  document.getElementById('lyricsContent').innerHTML = html;

  // Update header
  document.getElementById('lyricsHeader').textContent = `歌词预览 - ${currentSong.title}`;
}

function updateLyricsHighlight(currentTime) {
  if (currentLyricLines.length === 0) return;

  // Find the active line index
  let activeIdx = -1;
  let nearestTime = -1;
  for (let i = 0; i < currentLyricLines.length; i++) {
    const line = currentLyricLines[i];
    if (line.time >= 0 && currentTime >= line.time && line.time > nearestTime) {
      activeIdx = i;
      nearestTime = line.time;
    }
  }

  // Update DOM
  document.querySelectorAll('.lyric-line').forEach(el => el.classList.remove('active'));
  if (activeIdx >= 0) {
    const activeEl = document.querySelector(`.lyric-line[data-idx="${activeIdx}"]`);
    if (activeEl) activeEl.classList.add('active');
  }
}
```

- [ ] **Step 2: Integrate highlight into song row click (selecting a song to preview)**

```javascript
// Click song row to preview its lyrics
document.addEventListener('click', function(e) {
  const row = e.target.closest('.song-row');
  if (!row) return;
  const songId = parseInt(row.dataset.songId);
  const project = store.getCurrentProject();
  if (!project) return;
  const idx = project.songs.findIndex(s => s.id === songId);
  if (idx >= 0) {
    currentSongIndex = idx;
    // Don't update audio current time, just update the lyrics display
    updateLyricsPreview();
    // Highlight current row
    document.querySelectorAll('.song-row').forEach(r => r.classList.remove('current'));
    row.classList.add('current');
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add concert-lyric-tool/app.js
git commit -m "feat: add lyrics preview with line highlighting"
```

---

### Task 10: LRC export with time offset

**Files:**
- Create: `concert-lyric-tool/lrc-export.js`

- [ ] **Step 1: Implement LRC export logic**

```javascript
// ========== LRC Export ==========
function exportLrc(project) {
  if (!project) { alert('请先选择项目'); return; }

  const songs = project.songs;
  const unmarked = songs.filter(s => s.start_time <= 0);
  const unconfirmed = songs.filter(s => s.lyrics_status === 'pending' || s.lyrics_status === 'not_found');

  if (unmarked.length > 0) {
    if (!confirm(`${unmarked.length} 首歌尚未标记开始时间，是否继续导出？`)) return;
  }
  if (unconfirmed.length > 0) {
    if (!confirm(`${unconfirmed.length} 首歌的歌词尚未确认，是否继续导出？`)) return;
  }

  // Generate LRC content for each song
  const lrcFiles = [];
  songs.forEach(song => {
    if (song.start_time <= 0) return;
    const lyricsText = song.lyrics_lrc || song.lyrics_plain;
    if (!lyricsText) return;

    const offsetLrc = offsetLrcTimestamps(lyricsText, song.start_time);
    const filename = `${String(song.id).padStart(2, '0')} - ${sanitizeFilename(song.title)}.lrc`;
    lrcFiles.push({ filename, content: offsetLrc });
  });

  if (lrcFiles.length === 0) { alert('没有可导出的歌词'); return; }

  // Create a zip-like download (download each file individually)
  // For simplicity, we'll download a combined text file with separators
  // Or use the JSZip approach with a CDN
  downloadAsZip(lrcFiles, project.name);
}

function offsetLrcTimestamps(lrcText, offsetSeconds) {
  const lines = lrcText.split('\n');
  const regex = /\[(\d{2}):(\d{2})[\.:](\d{2,3})\]/;

  return lines.map(line => {
    return line.replace(regex, (match, m, s, cs) => {
      const totalSec = parseInt(m) * 60 + parseInt(s) + parseInt(cs) / (cs.length === 2 ? 100 : 1000) + offsetSeconds;
      const newM = Math.floor(totalSec / 60);
      const newS = Math.floor(totalSec % 60);
      const newCs = Math.floor((totalSec - Math.floor(totalSec)) * 100);
      return `[${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}.${String(newCs).padStart(2, '0')}]`;
    });
  }).join('\n');
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function downloadAsZip(files, projectName) {
  // Use JSZip via CDN to create a real zip
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  script.onload = function() {
    const zip = new JSZip();
    files.forEach(f => zip.file(f.filename, f.content));
    zip.generateAsync({ type: 'blob' }).then(function(content) {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFilename(projectName)}_LRC.zip`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  script.onerror = function() {
    // Fallback: download individually
    files.forEach(f => downloadSingleFile(f.content, f.filename, 'text/plain'));
  };
  document.head.appendChild(script);
}

function downloadSingleFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Wire up export button**

In `app.js`, add:

```javascript
document.getElementById('btnExport').addEventListener('click', () => {
  const project = store.getCurrentProject();
  if (!project) { alert('请先选择项目'); return; }
  exportLrc(project);
});
```

- [ ] **Step 3: Commit**

```bash
git add concert-lyric-tool/lrc-export.js concert-lyric-tool/app.js
git commit -m "feat: add LRC export with time offset and ZIP download"
```

---

### Task 11: Integration testing — manual walkthrough

**Files:**
- No file changes

- [ ] **Step 1: Run through the full workflow**

Open `index.html` in Chrome. Test:

1. **新建项目** — Click "新建项目", fill in name and artist, click "创建"
   Expected: Toolbar shows project name, songs list shows empty state.

2. **导入歌单 Step 1** — Click "导入歌单", paste a list of 3-4 song titles, click "解析歌单"
   Expected: Parsed results show correctly. Click "下一步".

3. **导入歌单 Step 2** — Modal shows two-column layout with progress bar. Wait for batch search to complete, each song shows ✅/⚠️/❌.
   Expected: Results appear in left column. Click a song row → lyrics preview appears in right column. Edit artist name if needed, click "重新搜索". Click "完成".
   Expected: Modal closes. Song list in center shows imported songs with status badges.

4. **加载音频** — Click "添加音频", pick an MP3
   Expected: File name appears, play button becomes active.

5. **标记** — Click play, let it play for a few seconds, click "标记下一首"
   Expected: Prompt shows current time and song name. Confirm. Song list updates with start time.

6. **歌词预览** — Click on a song row in the list
   Expected: Right panel shows lyrics with highlighting as audio plays.

7. **导出** — Click "导出 LRC"
   Expected: ZIP file downloads with `.lrc` files containing offset timestamps.

8. **项目切换** — Click "项目管理", switch to a different project or create a new one
   Expected: UI refreshes with selected project data.

- [ ] **Step 2: Commit any bug fixes**

```bash
git add -A
git commit -m "fix: address integration test issues"
```

---

### Task 12: Cleanup and final polish

**Files:**
- Modify: `concert-lyric-tool/style.css`
- Modify: `concert-lyric-tool/app.js`

- [ ] **Step 1: Polish remaining interactions**

Check and fix:
- Empty states for all views (no project, no songs, no lyrics, no audio)
- Button disabled states (mark button when no project/audio/songs)
- Auto-save trigger whenever data changes
- Window resize behavior (minimum widths for columns)

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: polish and finalize v1"
```
