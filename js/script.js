let audioMap = new Map();
let audioContext = null;
let masterGain = null;
let currentInstrument = "windsong_lyre";

/* ---------------- 转调/调式 ---------------- */
const modeMap = {
  "Ionian（自然大调）": {},
  "Dorian（多利亚调式）": { "3": false, "7": false },
  "Phrygian（弗里几亚调式）": { "2": false, "3": false, "6": false, "7": false },
  "Lydian（利底亚调式）": { "4": true },
  "Mixolydian（混合利底亚调式）": { "7": false },
  "Aeolian（自然小调）": { "3": false, "6": false, "7": false },
  "Locrian（洛克利亚调式）": { "2": false, "3": false, "5": false, "6": false, "7": false }
};
let currentMode = "Ionian（自然大调）";
let transpose = 0;

/* ---------------- 自动演奏 ---------------- */
let stopped = false;
let bpm = 60;
// 60BPM基准：全/二/四/八/十六/三二/六四分
const delay = [4000, 2000, 1000, 500, 250, 125, 62.5, 31.25];
let newDelay = [...delay];

/* ---------------- 音频初始化/加载 ---------------- */
function initAudio() {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(audioContext.destination);

    const volumeSlider = document.getElementById('volume');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        if (masterGain) masterGain.gain.value = e.target.value / 100;
      });
    }
  } catch (e) {
    console.error('音频上下文初始化失败:', e);
    alert('您的浏览器不支持 Web Audio API，部分功能可能无法正常使用。');
  }
}

// 首次交互时解锁音频
function unlockAudio() {
  if (audioContext && audioContext.state !== 'running') {
    audioContext.resume().catch(()=>{});
  }
}
document.addEventListener('click', unlockAudio, { once: true, passive: true });
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

function loadAudio(instrumentId) {
  const noteMap = instrumentConfig.noteMap;
  const totalNotes = Object.keys(noteMap).length;
  let loaded = 0;

  onLoad(instrumentId);

  for (let key in noteMap) {
    const basePath = instrumentConfig.getAudioBasePath(instrumentId);
    const noteFile = instrumentConfig.getNoteFile(key);
    const url = basePath + noteFile;

    fetch(url)
      .then(r => r.arrayBuffer())
      .then(data => {
        if (!audioContext) return;
        audioContext.decodeAudioData(data, buffer => {
          audioMap.set(key, buffer);
          loaded++;
          onLoadProgress(instrumentId, loaded, totalNotes);
          if (loaded === totalNotes) onLoadComplete(instrumentId);
        }).catch(err => {
          console.error('音频解码失败:', err);
          loaded++;
        });
      })
      .catch(err => {
        console.error('音频加载失败:', err);
        loaded++;
      });
  }
}

/* ---------------- 播放/转调 ---------------- */
function getNoteIdByKey(key) {
  const noteKeys = Object.keys(instrumentConfig.noteMap);
  const idx = noteKeys.findIndex(k => k === key);
  return ((idx % 7) + 1).toString(); // 1~7
}
function getModeOffset(noteId) {
  return noteId in modeMap[currentMode] ? (modeMap[currentMode][noteId] ? 1 : -1) : 0;
}
function playNote(key) {
  if (!audioContext) return;
  const buffer = audioMap.get(key);
  if (!buffer) return;

  const detune = (getModeOffset(getNoteIdByKey(key)) + transpose) * 100;

  const src = audioContext.createBufferSource();
  src.buffer = buffer;
  if (src.detune) src.detune.value = detune; // 兼容不支持 detune 的旧实现
  src.connect(masterGain);
  src.start();

  const keyEl = document.getElementById(key);
  if (keyEl) {
    keyEl.classList.add('key-press');
    setTimeout(() => keyEl.classList.remove('key-press'), 300);
  }
}

/* ---------------- 自动演奏核心 ---------------- */
function updateBpm(newBpm) {
  const safeBpm = Math.max(30, Math.min(240, parseInt(newBpm) || 60));
  const mul = 60 / safeBpm;
  for (let i in delay) newDelay[i] = delay[i] * mul;
}

// 统一全角符号并清理空白
function normalizeSheet(str) {
  if (!str) return "";
  return str
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/｜/g, '|')
    .replace(/\s+/g, '') // 去所有空白
    .toLowerCase();
}

const validKeys = Object.keys(instrumentConfig.noteMap);
function isValidKey(ch) { return validKeys.includes(ch); }

// 解析 |n+++ 形式（允许 | 前后有空白，n 为 0~7）
function getNewDelayTime(s, i) {
  i++; // 跳过 '|'
  // 容错：越界直接按八分音符
  if (i >= s.length) return [newDelay[3], i];

  let idx = parseInt(s[i]);
  if (Number.isNaN(idx) || idx < 0 || idx >= delay.length) idx = 3;
  let t = newDelay[idx];
  i++;

  while (i < s.length && s[i] === '+') { t += newDelay[idx]; i++; }
  return [t, i];
}

function playSheet(s, i = 0) {
  if (i >= s.length || stopped) {
    stopped = false;
    newDelay = [...delay];
    return;
  }

  let delayTime = newDelay[3];
  const ch = s[i];

  if (ch === '(') {
    // 和弦：直到 ')'
    i++;
    while (i < s.length && s[i] !== ')') {
      if (isValidKey(s[i])) playNote(s[i]);
      i++;
    }
    if (i < s.length && s[i] === ')') i++;
  } else if (ch === '|') {
    const group = getNewDelayTime(s, i);
    delayTime = group[0];
    i = group[1];
  } else {
    if (isValidKey(ch)) playNote(ch);
    i++;
  }

  setTimeout(playSheet, delayTime, s, i);
}

/* ---------------- 自动演奏控制 ---------------- */
function startMusic() {
  unlockAudio(); // 确保已解锁
  stopped = false;

  const bpmInput = document.getElementById('bpm');
  const sheetInput = document.getElementById('textareaInput');

  bpm = parseInt(bpmInput && bpmInput.value) || 60;
  updateBpm(bpm);

  const sheet = normalizeSheet(sheetInput && sheetInput.value);
  if (!sheet) {
    alert("请输入乐谱（例：q w e a s d |3+，和弦用(qwe)）");
    return;
  }
  // 至少包含一个有效键
  if (!/[qwertyuasdfghjzxcvbnm]/.test(sheet)) {
    alert("未检测到有效音符键（qwerty…/asdfg…/zxcvb…）");
    return;
  }
  playSheet(sheet, 0);
}
function pauseMusic() { stopped = true; }
function clearMusic() { stopped = true; const t = document.getElementById('textareaInput'); if (t) t.value = ""; }

/* ---------------- UI 绑定/面板 ---------------- */
function selectMode(node) {
  currentMode = node.innerText;
  const span = document.getElementById('modeText');
  if (span) span.innerText = currentMode;
  toggleModeDropdown();
}
function toggleModeDropdown() {
  const items = document.getElementById('modeItems');
  if (items) items.style.display = items.style.display === 'block' ? 'none' : 'block';
}
function toggleDropdown(el) {
  const items = el.querySelector('.combo-items');
  if (items) items.style.display = items.style.display === 'block' ? 'none' : 'block';
}
function selectInstrument(instrumentId, instrumentName) {
  const label = document.getElementById('instruments');
  if (label) label.textContent = instrumentName;
  const dd = document.querySelector('.combo-items'); if (dd) dd.style.display = 'none';
  currentInstrument = instrumentId;
  loadAudio(instrumentId);

  const inst = instrumentConfig.getInstrumentInfo(instrumentId);
  document.documentElement.style.setProperty('--note-color', inst.color);
  document.documentElement.style.setProperty('--background-color-hover1', inst.bg1);
  document.documentElement.style.setProperty('--background-color-hover2', inst.bg2);
  document.documentElement.style.setProperty('--animation-color', inst.bg2);
}
function showPanel(panelId) {
  document.querySelectorAll('.control-panel').forEach(p => p.style.display = 'none');
  const target = document.getElementById(`${panelId}-panel`);
  if (target) target.style.display = 'block';
}

/* ---------------- 页面初始化 ---------------- */
function init() {
  setTimeout(() => {
    const ld = document.getElementById('loadDiv');
    if (ld) ld.style.display = 'none';
  }, 1500);

  initAudio();
  loadAudio(currentInstrument);

  // 鼠标/触摸
  document.querySelectorAll('.key').forEach(btn => {
    let pressed = false;
    btn.addEventListener('mousedown', () => {
      if (!pressed) { pressed = true; playNote(btn.id); setTimeout(()=>pressed=false, 100); }
    });
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!pressed) { pressed = true; playNote(btn.id); setTimeout(()=>pressed=false, 100); }
    }, { passive: false });
  });

  // 键盘
  const down = new Set();
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (validKeys.includes(k) && !down.has(k)) {
      down.add(k);
      playNote(k);
    }
  });
  document.addEventListener('keyup', (e) => down.delete(e.key.toLowerCase()));
}

// 输入框：半音偏移
document.addEventListener('DOMContentLoaded', () => {
  const tr = document.getElementById('transpose-num');
  if (tr) tr.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    transpose = Math.max(-12, Math.min(12, isNaN(v) ? 0 : v));
  });

  // 自动演奏按钮
  document.querySelectorAll('.music-control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'start') startMusic();
      else if (action === 'pause') pauseMusic();
      else if (action === 'clear') clearMusic();
    });
  });
});

window.addEventListener('load', init);

/* ---------------- 加载提示 ---------------- */
function onLoad(instrumentId) {
  const loadDiv = document.getElementById("loadDiv");
  const inst = instrumentConfig.getInstrumentInfo(instrumentId);
  if (loadDiv) loadDiv.innerHTML = `正在加载【${inst.name}】...`;
}
function onLoadProgress(instrumentId, loaded, total) {
  const loadDiv = document.getElementById("loadDiv");
  const inst = instrumentConfig.getInstrumentInfo(instrumentId);
  if (loadDiv) loadDiv.innerHTML = `正在加载【${inst.name}】... ${loaded} / ${total}`;
}
function onLoadComplete(instrumentId) {
  const loadDiv = document.getElementById("loadDiv");
  const inst = instrumentConfig.getInstrumentInfo(instrumentId);
  if (loadDiv) {
    loadDiv.innerHTML = `【${inst.name}】加载完成`;
    setTimeout(() => { loadDiv.style.display = 'none'; }, 1000);
  }
}
// 打开弹窗
function openModal() {
  document.getElementById("autoPlayModal").style.display = "flex";
}
// 关闭弹窗
function closeModal() {
  document.getElementById("autoPlayModal").style.display = "none";
}

// 点击背景关闭
window.addEventListener('click', function(e) {
  const modal = document.getElementById("autoPlayModal");
  if (e.target === modal) closeModal();
});

// 防止输入框触发琴键
document.addEventListener('keydown', function(e) {
  const modal = document.getElementById("autoPlayModal");
  const textarea = document.getElementById("textareaInput");
  if (modal.style.display === "flex" && document.activeElement === textarea) {
    e.stopPropagation(); // 阻止事件继续冒泡到琴键
  }
}, true);
// 打开/关闭转调弹窗
function openTransposeModal() {
  document.getElementById("transposeModal").style.display = "flex";
}
function closeTransposeModal() {
  document.getElementById("transposeModal").style.display = "none";
}

// 应用转调设置
function applyTranspose() {
  const input = document.getElementById("transpose-num");
  const modeSel = document.getElementById("modeSelect");

  // 半音偏移
  const v = parseInt(input.value);
  transpose = Math.max(-12, Math.min(12, isNaN(v) ? 0 : v));

  // 调式
  currentMode = modeSel.value;

  alert(`已应用: 转调=${transpose}半音, 调式=${currentMode}`);
  closeTransposeModal();
}

// 点击遮罩层关闭
window.addEventListener('click', function(e) {
  const modal = document.getElementById("transposeModal");
  if (e.target === modal) closeTransposeModal();
});
