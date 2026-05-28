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
