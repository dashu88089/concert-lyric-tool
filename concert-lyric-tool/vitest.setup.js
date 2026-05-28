// Minimal DOM setup for app.js tests
const elementIds = [
  'modalOverlay', 'modalContent', 'modalTitle', 'modalBody', 'modalFooter', 'modalClose',
  'projectName', 'songList', 'lyricsContent', 'lyricsHeader', 'btnMark',
  'currentSongName', 'btnPlayPause', 'timeDisplay', 'audioList',
  'app', 'toolbar', 'appTitle', 'toolbarActions', 'mainContent',
  'leftPanel', 'centerPanel', 'rightPanel', 'playerSection', 'songSection',
  'songTableHeader', 'btnNewProject', 'btnImport', 'btnManageProjects',
  'btnExport', 'btnAddAudio', 'audioFileInput', 'btnPrev', 'btnRewind',
  'btnForward', 'btnNext', 'btnStep1Next', 'btnParsePlaylist',
  'playlistInput', 'parsedResult', 'step1Content', 'seekBar',
];

elementIds.forEach(id => {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
});

// Add audio element
const audioEl = document.createElement('audio');
audioEl.id = 'audioPlayer';
document.body.appendChild(audioEl);

// Add step-indicator structure
const stepIndicator = document.createElement('div');
stepIndicator.className = 'step-indicator';
stepIndicator.id = 'stepIndicator';
document.body.appendChild(stepIndicator);
