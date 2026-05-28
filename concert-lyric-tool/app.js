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
      audioFiles: [],
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

  // Add audio filename to project's audio list
  addAudioToProject(projectId, filename) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;
    if (!project.audioFiles) project.audioFiles = [];
    if (!project.audioFiles.includes(filename)) {
      project.audioFiles.push(filename);
      this.save();
    }
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
globalThis.ProjectStore = ProjectStore;
globalThis.store = store;

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

// ========== Project Management ==========
document.getElementById('btnManageProjects').addEventListener('click', () => {
  renderProjectList();
});

function renderProjectList() {
  const projects = store.getAllProjects();
  if (projects.length === 0) {
    modal.open('项目管理', '<div class="empty-state">暂无项目</div>', '<button onclick="modal.close()">关闭</button>');
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

// ========== UI Refresh ==========
function refreshUI() {
  // Reset audio state on project switch
  currentSongIndex = -1;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    document.getElementById('btnPlayPause').textContent = '▶';
  }
  document.getElementById('seekBar').value = 0;

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

  // Restore audio list from project data
  renderAudioList(project);

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

function renderAudioList(project) {
  const container = document.getElementById('audioList');
  if (!project.audioFiles || project.audioFiles.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无音频文件</div>';
    return;
  }
  let html = '';
  project.audioFiles.forEach(name => {
    const isCurrent = audio.src && name === document.getElementById('currentSongName').textContent.replace('🎵 ', '');
    html += `<div class="audio-item${isCurrent ? ' current' : ''}">
      <span class="name">${escapeHtml(name)}</span>
      <span class="dur">--:--</span>
    </div>`;
  });
  container.innerHTML = html;
}

// ========== Playlist Parser ==========
function parsePlaylist(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map(line => {
    let title = line.replace(/^\d+\s*[\.\-\、\)]\s*/, '');
    title = title.replace(/^\d{1,2}\s+/, '');
    return title.trim() || line;
  });
}

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

document.addEventListener('click', function(e) {
  if (e.target.id === 'btnStep1Next') {
    document.querySelectorAll('#parsedResult input').forEach(input => {
      const idx = parseInt(input.dataset.idx);
      if (idx >= 0) parsedSongs[idx] = input.value.trim();
    });
    parsedSongs = parsedSongs.filter(s => s.length > 0);
    if (parsedSongs.length === 0) { alert('没有有效的歌曲'); return; }
    // Proceed to Step 2 within modal (two-column layout)
    renderImportStep2();
  }
});

// ========== Import Step 2: Lyrics Search (Modal Two-Column) ==========
let lyricsResults = [];
let currentLyricIdx = -1;

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

  searchAllLyrics();
}

function cancelImport() {
  document.getElementById('modalContent').classList.remove('modal-wide');
  modal.close();
}

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

function showImportLyrics(idx) {
  currentLyricIdx = idx;
  const result = lyricsResults[idx];
  const title = parsedSongs[idx];
  const project = store.getCurrentProject();

  document.querySelectorAll('.lyrics-result-item').forEach(el => el.style.background = '');
  const row = document.querySelector(`.lyrics-result-item[data-idx="${idx}"]`);
  if (row) row.style.background = 'rgba(233,69,96,0.15)';

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

function finishImportStep2() {
  const project = store.getCurrentProject();
  if (!project) return;

  // Only add songs to project for new imports, not re-imports of existing songs
  if (!window._isReimport) {
    store.addSongsToProject(project.id, parsedSongs);
  }
  window._isReimport = false;

  const savedSongs = store.getCurrentProject().songs;
  const offset = savedSongs.length - parsedSongs.length;
  lyricsResults.forEach((result, i) => {
    if (!result) return;
    const song = savedSongs[offset + i];
    if (!song) return;
    const updates = {
      lyrics_status: result.status === 'not_found' ? 'not_found' : 'confirmed',
      lyrics_plain: result.lyricsText || '',
      lyrics_lrc: result.status === 'synced' ? (result.lyricsText || '') : '',
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

function openImportForSong(songId) {
  const project = store.getCurrentProject();
  const song = project.songs.find(s => s.id === songId);
  if (!song) return;
  window._isReimport = true;
  parsedSongs = [song.title];
  renderImportStep2();
}

// ========== Export Button ==========
document.getElementById('btnExport').addEventListener('click', () => {
  const project = store.getCurrentProject();
  if (!project) { alert('请先选择项目'); return; }
  exportLrc(project);
});

// ========== Audio Player ==========
const audio = document.getElementById('audioPlayer');
let isPlaying = false;
let currentSpeed = 1;
let currentSongIndex = -1;

document.getElementById('audioFileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  audio.src = url;
  audio.playbackRate = currentSpeed;
  document.getElementById('seekBar').value = 0;
  document.getElementById('seekBar').max = 0;
  document.getElementById('currentSongName').textContent = '🎵 ' + file.name;

  addAudioToList(file.name, '--:--');

  const project = store.getCurrentProject();
  if (project) {
    store.updateProject(project.id, { mp3_name: file.name });
    store.addAudioToProject(project.id, file.name);
  }
  currentSongIndex = -1;
  updateMarkButton();
  document.getElementById('btnPlayPause').disabled = false;
});

document.getElementById('btnAddAudio').addEventListener('click', () => {
  document.getElementById('audioFileInput').click();
});

function addAudioToList(name, duration) {
  const list = document.getElementById('audioList');
  const empty = list.querySelector('.empty-state');
  if (empty) list.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'audio-item current';
  list.querySelectorAll('.audio-item').forEach(el => el.classList.remove('current'));
  item.innerHTML = `<span class="name">${escapeHtml(name)}</span><span class="dur">${duration}</span><span class="audio-del" style="cursor:pointer;color:#ef9a9a;font-size:14px;">✕</span>`;
  item.querySelector('.audio-del').addEventListener('click', function(e) {
    e.stopPropagation();
    item.remove();
    if (list.querySelectorAll('.audio-item').length === 0) {
      list.innerHTML = '<div class="empty-state">暂无音频文件</div>';
    }
    // If this was the current audio, reset player
    if (audio.src && item.classList.contains('current')) {
      audio.pause();
      audio.src = '';
      document.getElementById('currentSongName').textContent = '未加载音频';
      document.getElementById('btnPlayPause').textContent = '▶';
      isPlaying = false;
    }
  });
  item.addEventListener('click', function() {
    list.querySelectorAll('.audio-item').forEach(el => el.classList.remove('current'));
    this.classList.add('current');
  });
  list.appendChild(item);
}

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

audio.addEventListener('timeupdate', () => {
  const current = formatTime(audio.currentTime);
  const total = formatTime(audio.duration || 0);
  document.getElementById('timeDisplay').textContent = `${current} / ${total}`;
  document.getElementById('seekBar').value = audio.currentTime || 0;
  updateLyricsHighlight(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  document.getElementById('seekBar').max = audio.duration || 0;
});

document.getElementById('seekBar').addEventListener('input', function() {
  const seekTime = parseFloat(this.value);
  audio.currentTime = seekTime;
});

document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentSpeed = parseFloat(this.dataset.speed);
    audio.playbackRate = currentSpeed;
  });
});

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

// ========== Song Marking ==========
document.getElementById('btnMark').addEventListener('click', markNextSong);

function markNextSong() {
  const project = store.getCurrentProject();
  if (!project || project.songs.length === 0) return;
  if (!audio.src) { alert('请先加载音频文件'); return; }

  const nextIdx = project.songs.findIndex(s => s.start_time === 0);
  if (nextIdx === -1) {
    alert('所有歌曲已标记完成！');
    return;
  }

  const song = project.songs[nextIdx];
  const currentTime = audio.currentTime;

  const userTitle = prompt(`标记第 ${song.id} 首歌：
当前播放时间：${formatTime(currentTime)}
歌名：${song.title}

如需修改歌名，请直接编辑后确定：`, song.title);

  if (userTitle === null) return;

  const finalTitle = userTitle.trim() || song.title;

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

// ========== Lyrics Preview ==========
let currentLyricLines = [];

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

  document.getElementById('lyricsHeader').textContent = `歌词预览 - ${currentSong.title}`;
}

function updateLyricsHighlight(currentTime) {
  if (currentLyricLines.length === 0) return;

  let activeIdx = -1;
  let nearestTime = -1;
  for (let i = 0; i < currentLyricLines.length; i++) {
    const line = currentLyricLines[i];
    if (line.time >= 0 && currentTime >= line.time && line.time > nearestTime) {
      activeIdx = i;
      nearestTime = line.time;
    }
  }

  document.querySelectorAll('.lyric-line').forEach(el => el.classList.remove('active'));
  if (activeIdx >= 0) {
    const activeEl = document.querySelector(`.lyric-line[data-idx="${activeIdx}"]`);
    if (activeEl) activeEl.classList.add('active');
  }
}

document.addEventListener('click', function(e) {
  const row = e.target.closest('.song-row');
  if (!row) return;
  const songId = parseInt(row.dataset.songId);
  const project = store.getCurrentProject();
  if (!project) return;
  const idx = project.songs.findIndex(s => s.id === songId);
  if (idx >= 0) {
    currentSongIndex = idx;
    updateLyricsPreview();
    document.querySelectorAll('.song-row').forEach(r => r.classList.remove('current'));
    row.classList.add('current');
  }
});

// Initialize: load current project on page refresh
refreshUI();
