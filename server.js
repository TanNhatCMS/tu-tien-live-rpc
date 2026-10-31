const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent } = require('tiktok-live-connector');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TTS_CACHE_DIR = path.join(DATA_DIR, 'tts-cache');
const STATE_FILE = path.join(DATA_DIR, 'sect-state.json');

fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

// ============================================================================
// 1. BỘ 12 THẺ CÔNG PHÁP THANH VÂN TÔNG (TECHNIQUE DECK)
// ============================================================================
const TECHNIQUE_DECK = [
  { number: 1, grade: 'Phàm', title: 'Thanh Phong Kiếm Quyết', poem: 'Gió xanh lướt qua đỉnh núi cao / Kiếm ý trong lòng chẳng nhiễm trần / Một chiêu chém đứt mây mù mịt / Đường tu bắt đầu tự chính thân.', meaning: 'Công pháp nhập môn, vững gốc, tiến chậm mà chắc.', ttsSummary: 'Thẻ số 1, phẩm Phàm, Thanh Phong Kiếm Quyết. Công pháp nhập môn, vững gốc, tiến chậm mà chắc.' },
  { number: 2, grade: 'Phàm', title: 'Tụ Linh Quyết', poem: 'Hít thở linh khí giữa đêm dài / Tâm tĩnh như hồ chẳng gợn lay / Từng tia linh khí về đan điền / Gốc rễ từ đây mới dựng xây.', meaning: 'Tụ linh căn bản, hợp người mới nhập tông.', ttsSummary: 'Thẻ số 2, phẩm Phàm, Tụ Linh Quyết. Tụ linh căn bản, hợp người mới nhập tông.' },
  { number: 3, grade: 'Phàm', title: 'Hành Vân Bộ', poem: 'Bước chân nhẹ tựa áng mây trôi / Núi cao vực thẳm cũng qua rồi / Thân pháp linh hoạt không vướng bận / Tiến thoái trên đường tự thảnh thơi.', meaning: 'Thân pháp linh hoạt, tránh né tốt, hợp đi xa.', ttsSummary: 'Thẻ số 3, phẩm Phàm, Hành Vân Bộ. Thân pháp linh hoạt, tránh né tốt.' },
  { number: 4, grade: 'Linh', title: 'Lôi Đình Chưởng', poem: 'Tay vung sấm sét rền vang trời / Một chưởng đánh tan bóng tối mờ / Chính khí trong lòng càng thêm vững / Tà ma ngoại đạo phải lui thôi.', meaning: 'Chưởng pháp mạnh, công phạt tốt, cần tâm vững.', ttsSummary: 'Thẻ số 4, phẩm Linh, Lôi Đình Chưởng. Chưởng pháp mạnh, công phạt tốt.' },
  { number: 5, grade: 'Linh', title: 'Băng Tâm Quyết', poem: 'Tâm như băng tuyết giữa mùa đông / Chẳng động, chẳng lay, chẳng hãi hùng / Giữ được tâm này qua gian khó / Đường tu mới vững tựa non sông.', meaning: 'Ổn định tâm cảnh, chống nhiễu loạn khi đột phá.', ttsSummary: 'Thẻ số 5, phẩm Linh, Băng Tâm Quyết. Ổn định tâm cảnh, chống nhiễu loạn.' },
  { number: 6, grade: 'Linh', title: 'Linh Đan Dưỡng Khí', poem: 'Linh đan một viên dưỡng khí thân / Kinh mạch thông suốt, lực thêm gần / Tu luyện chăm chỉ không ngừng nghỉ / Ngày sau ắt sẽ thấy thành phần.', meaning: 'Dưỡng khí, hồi phục, hợp tu luyện dài hơi.', ttsSummary: 'Thẻ số 6, phẩm Linh, Linh Đan Dưỡng Khí. Dưỡng khí, hồi phục, hợp tu luyện dài hơi.' },
  { number: 7, grade: 'Huyền', title: 'Ngự Kiếm Phi Hành', poem: 'Phi kiếm vút bay vượt chín tầng / Gió mây làm bạn, trăng làm thân / Một kiếm ngang trời không vướng bận / Tự do tự tại giữa hồng trần.', meaning: 'Phi hành và kiếm đạo, tốc độ và uy lực đều cao.', ttsSummary: 'Thẻ số 7, phẩm Huyền, Ngự Kiếm Phi Hành. Phi hành và kiếm đạo, tốc độ cao.' },
  { number: 8, grade: 'Huyền', title: 'Huyền Vũ Thuẫn', poem: 'Thuẫn huyền vũ chắn trước thân / Núi lở sông tràn cũng chẳng ngăn / Phòng thủ vững như thành đồng vách / Giữ mình rồi mới tính đường xa.', meaning: 'Phòng thủ mạnh, hợp người đi đầu đội hình.', ttsSummary: 'Thẻ số 8, phẩm Huyền, Huyền Vũ Thuẫn. Phòng thủ mạnh, hợp người đi đầu.' },
  { number: 9, grade: 'Địa', title: 'Cửu Chuyển Kim Đan', poem: 'Chín lần chuyển hóa luyện kim đan / Lửa thiêng nung nấu suốt đêm tàn / Một viên đan thành, thân đổi khác / Cảnh giới từ đây bước sang trang.', meaning: 'Đan đạo cao cấp, đột phá Kim Đan thuận lợi.', ttsSummary: 'Thẻ số 9, phẩm Địa, Cửu Chuyển Kim Đan. Đan đạo cao cấp, đột phá thuận lợi.' },
  { number: 10, grade: 'Địa', title: 'Thiên Lôi Dẫn', poem: 'Dẫn lôi trời xuống luyện thân mình / Đau đớn qua rồi, gân cốt tinh / Ai chịu được sấm trời rèn giũa / Người đó mới xứng bậc anh linh.', meaning: 'Luyện thể bằng lôi, đau nhưng tăng mạnh.', ttsSummary: 'Thẻ số 10, phẩm Địa, Thiên Lôi Dẫn. Luyện thể bằng lôi, tăng mạnh.' },
  { number: 11, grade: 'Thiên', title: 'Vạn Kiếm Quy Tông', poem: 'Vạn kiếm cùng về một tông môn / Kiếm ý thông thiên, khí phá không / Người luyện được chiêu này ắt sẽ / Danh chấn một phương, tiếng vang lừng.', meaning: 'Kiếm đạo thượng thừa, hiếm gặp, uy lực lớn.', ttsSummary: 'Thẻ số 11, phẩm Thiên, Vạn Kiếm Quy Tông. Kiếm đạo thượng thừa, hiếm gặp.' },
  { number: 12, grade: 'Thiên', title: 'Hỗn Nguyên Đạo Kinh', poem: 'Hỗn nguyên một khí sinh vạn vật / Đạo ở trong tâm, chẳng ở lời / Ai ngộ được kinh này một chữ / Đường lên tiên giới rộng thênh thang.', meaning: 'Đạo kinh tối thượng, ngộ tính quyết định tất cả.', ttsSummary: 'Thẻ số 12, phẩm Thiên, Hỗn Nguyên Đạo Kinh. Đạo kinh tối thượng, ngộ tính quyết định.' },
];

// ============================================================================
// 2. ZEROTTS PYTHON WORKER MANAGER (VOICE: MAI CHI)
// ============================================================================
class ZeroTTSManager {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.status = 'starting';
    this.voice = 'maichi';
    this.voices = ['maichi'];
    this.model = 'zeroweight-ai/ZeroTTS';
    this.pending = new Map();
    this.inflight = new Map();
    this.reqCounter = 0;
    this.buffer = '';
    this.startWorker();
  }

  resolvePythonBin() {
    const venvPy = path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(venvPy)) return venvPy;
    return 'python3';
  }

  startWorker() {
    const pyBin = this.resolvePythonBin();
    const scriptPath = path.join(__dirname, 'tts_worker.py');
    console.log(`[ZeroTTS] Khởi chạy worker với ${pyBin} (Giọng mặc định: Mai Chi)...`);

    this.status = 'loading';
    this.proc = spawn(pyBin, [scriptPath], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      let lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        this.handleWorkerLine(line.trim());
      }
    });

    this.proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) console.log(`[ZeroTTS stderr] ${msg}`);
    });

    this.proc.on('exit', (code) => {
      console.warn(`[ZeroTTS] Worker thoát với mã ${code}`);
      this.ready = false;
      this.status = 'stopped';
      for (const [, item] of this.pending) {
        clearTimeout(item.timer);
        item.resolve({ ok: false, error: 'ZeroTTS worker exited' });
      }
      this.pending.clear();
    });
  }

  handleWorkerLine(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'status') {
        this.status = msg.status;
        this.model = msg.model || this.model;
        broadcastNotification('tts.status', this.getStatus());
      } else if (msg.type === 'ready') {
        this.ready = true;
        this.status = 'ready';
        this.voice = msg.voice || 'maichi';
        this.voices = msg.voices || ['maichi'];
        this.model = msg.model || this.model;
        console.log(`[ZeroTTS] Sẵn sàng sau ${msg.loadSec}s! Giọng: ${this.voice} (${this.voices.join(', ')})`);
        broadcastNotification('tts.status', this.getStatus());
      } else if (msg.type === 'result' && msg.id != null) {
        const entry = this.pending.get(msg.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      } else if (msg.type === 'error') {
        console.error('[ZeroTTS Error]', msg.error);
        this.status = 'error';
        broadcastNotification('tts.status', this.getStatus());
      }
    } catch (err) {
      console.log('[ZeroTTS stdout]', line);
    }
  }

  getStatus() {
    return {
      ready: this.ready,
      status: this.status,
      engine: 'ZeroTTS (zeroweight-ai/ZeroTTS)',
      voice: state.settings.ttsVoice || this.voice || 'maichi',
      voices: this.voices,
      model: this.model
    };
  }

  synthesize(text, voiceOverride) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return Promise.resolve({ ok: false, error: 'Empty text' });
    const voice = (voiceOverride || state.settings.ttsVoice || 'maichi').toLowerCase();
    const dedupKey = `${voice}::${cleanText}`;

    if (this.inflight.has(dedupKey)) {
      return this.inflight.get(dedupKey);
    }

    const promise = new Promise((resolve) => {
      if (!this.proc || !this.ready) {
        return resolve({ ok: false, error: `ZeroTTS đang ở trạng thái: ${this.status}` });
      }
      const id = ++this.reqCounter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'ZeroTTS synthesis timeout' });
      }, 30000);

      this.pending.set(id, { resolve, timer });
      const payload = JSON.stringify({ id, text: cleanText, voice }) + '\n';
      this.proc.stdin.write(payload);
    }).finally(() => {
      this.inflight.delete(dedupKey);
    });

    this.inflight.set(dedupKey, promise);
    return promise;
  }
}

// ============================================================================
// 3. TRẠNG THÁI CHÙA ONLINE & BẢNG VÀNG CÔNG ĐỨC
// ============================================================================
const DEFAULT_STATE = {
  totalLamps: 0,
  totalTuVi: 0,
  cultivateHits: 0,
  bellRings: 0,
  lanternCount: 0,
  techniqueCount: 0,
  activeLamps: 0,
  haloIntensity: 0.45,
  offerings: {
    spiritStone: 0,
    pill: 0,
    sword: 0,
    tribulation: 0
  },
  devotees: {},
  recentEvents: [],
  settings: {
    ttsEnabled: true,
    ttsVoice: 'maichi',
    bgMusicEnabled: true,
    sfxEnabled: true,
    smokeDensity: 1.0,
    autoSim: false,
    autoSimIntervalMs: 9500
  },
  tiktok: {
    connected: false,
    connecting: false,
    username: '',
    roomId: null,
    viewerCount: 0,
    lastError: null
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return {
        ...DEFAULT_STATE,
        ...saved,
        devotees: saved.devotees || {},
        offerings: { ...DEFAULT_STATE.offerings, ...(saved.offerings || {}) },
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        tiktok: { ...DEFAULT_STATE.tiktok }
      };
    }
  } catch (e) {
    console.warn('[State] Không đọc được sect-state.json, dùng mặc định:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const toSave = {
      totalLamps: state.totalLamps,
      totalTuVi: state.totalTuVi,
      cultivateHits: state.cultivateHits,
      bellRings: state.bellRings,
      lanternCount: state.lanternCount,
      techniqueCount: state.techniqueCount,
      activeLamps: state.activeLamps,
      offerings: state.offerings,
      devotees: state.devotees,
      settings: state.settings
    };
    fs.promises.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2), 'utf8').catch((e) => {
      console.error('[State] Lỗi lưu file:', e.message);
    });
  }, 1200);
}

function getLeaderboard(limit = 6) {
  return Object.values(state.devotees).filter((d) => !d.isSim)
    .sort((a, b) => b.tuVi - a.tuVi)
    .slice(0, limit)
    .map((d, index) => ({
      rank: index + 1,
      name: d.name,
      uniqueId: d.uniqueId,
      avatar: d.avatar || '',
      tuVi: d.tuVi,
      realm: d.realm || 'Luyện Khí',
      isSim: Boolean(d.isSim),
      lamps: d.lamps || 0,
      lastWish: d.lastWish || ''
    }));
}
// Bộ lọc chặn ký tự lạ (Cuneiform 𒐫, Zalgo, Braille, ký tự spam) & từ ngữ phản cảm
const WEIRD_SPAM_RE = /[\u{12000}-\u{1254F}\uFDFD\u2800-\u28FF\u2580-\u259F]|[\u0300-\u036F]{3,}/u;
const BRACKET_EMOTE_RE = /\[[^\]]{1,24}\]/g;
const ALLOWED_VI_TEXT_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s.,!?]/g;
const ALLOWED_VI_NAME_RE = /[^0-9a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ\s._-]/g;
const VI_LETTER_RE = /[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/g;
const BAD_WORDS_RE = /(đá dái|địt|lồn|cặc|đm|vcl|vl|yamate|i cư|lừa đảo|lừa à|te-le gram|telegram|bố là trùm)/i;

function isBlockedSpamOrToxic(raw) {
  if (!raw) return true;
  const s = String(raw);
  if (WEIRD_SPAM_RE.test(s)) return true;
  if (BAD_WORDS_RE.test(s)) return true;
  return false;
}

function sanitizeUserName(rawName) {
  const normalized = String(rawName || '')
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_NAME_RE, ' ')
    .replace(/(.)\1{3,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26);

  if (!normalized || BAD_WORDS_RE.test(normalized)) {
    return 'Thí Chủ Hữu Duyên';
  }
  const letters = normalized.match(VI_LETTER_RE) || [];
  if (letters.length < 2) {
    return 'Thí Chủ Hữu Duyên';
  }
  return normalized;
}

function sanitizeWishText(rawWish) {
  if (!rawWish) return '';
  const cleaned = String(rawWish)
    .normalize('NFKC')
    .normalize('NFC')
    .replace(BRACKET_EMOTE_RE, ' ')
    .replace(ALLOWED_VI_TEXT_RE, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/(.)\1{2,}/gi, '$1$1')
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?\s-]+|[.,!?\s-]+$/g, '')
    .slice(0, 120);

  if (!cleaned || BAD_WORDS_RE.test(cleaned)) return '';
  const letters = cleaned.match(VI_LETTER_RE) || [];
  if (letters.length < 2) return '';
  return cleaned;
}

function realmForTuVi(tuVi) {
  if (tuVi >= 250000) return 'Độ Kiếp';
  if (tuVi >= 100000) return 'Luyện Hư';
  if (tuVi >= 40000) return 'Hóa Thần';
  if (tuVi >= 15000) return 'Nguyên Anh';
  if (tuVi >= 5000) return 'Kim Đan';
  if (tuVi >= 1000) return 'Trúc Cơ';
  return 'Luyện Khí';
}
function recordDevotee(user, uniqueId, avatar, tuViDelta, lampDelta = 0, giftDelta = 0, wish = '', isSim = false) {
  const displayName = sanitizeUserName(user || uniqueId);
  const cleanWish = sanitizeWishText(wish);
  const key = (uniqueId || displayName).slice(0, 40);
  if (!state.devotees[key]) {
    state.devotees[key] = {
      name: displayName,
      uniqueId: uniqueId || displayName.toLowerCase().replace(/\s+/g, ''),
      avatar: avatar || '',
      tuVi: 0,
      lamps: 0,
      gifts: 0,
      lastWish: '',
      isSim: Boolean(isSim),
      realm: 'Luyện Khí'
    };
  }
  const dev = state.devotees[key];
  if ((uniqueId || '').startsWith('demo_')) dev.isSim = true; else if (isSim) dev.isSim = true;
  dev.name = displayName;
  if (avatar) dev.avatar = avatar;
  dev.tuVi += tuViDelta;
  dev.realm = realmForTuVi(dev.tuVi);
  dev.lamps += lampDelta;
  dev.gifts += giftDelta;
  if (cleanWish) dev.lastWish = cleanWish;

  state.totalTuVi += tuViDelta;
  state.haloIntensity = Math.min(1.0, 0.35 + (state.totalTuVi % 1000) / 1400);
  return dev;
}

function pushEventLog(evt) {
  const entry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt
  };
  state.recentEvents.unshift(entry);
  if (state.recentEvents.length > 35) {
    state.recentEvents.length = 35;
  }
  return entry;
}

function getPublicState() {
  return {
    totalLamps: state.totalLamps,
    totalTuVi: state.totalTuVi,
    cultivateHits: state.cultivateHits,
    bellRings: state.bellRings,
    lanternCount: state.lanternCount,
    techniqueCount: state.techniqueCount,
    activeLamps: state.activeLamps,
    haloIntensity: state.haloIntensity,
    offerings: state.offerings,
    leaderboard: getLeaderboard(24),
    recentEvents: state.recentEvents.slice(0, 15),
    settings: state.settings,
    sectName: process.env.SECT_NAME || 'Thanh Vân Tông',
    simDevotees: Object.values(state.devotees).filter((d) => d.isSim).sort((a, b) => b.tuVi - a.tuVi).slice(0, 12).map((d) => ({ name: d.name, uniqueId: d.uniqueId, avatar: d.avatar || '', tuVi: d.tuVi, realm: d.realm || 'Luyện Khí', lastWish: d.lastWish || '' })),
    tiktok: state.tiktok,
    tts: zeroTts ? zeroTts.getStatus() : { ready: false, status: 'init', voice: 'maichi' }
  };
}

// ============================================================================
// 4. NGHI THỨC TƯƠNG TÁC (RITUAL HANDLERS)
// ============================================================================
const Rituals = {
  lightLamp(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 3));
    const wish = sanitizeWishText(params.wish) || 'Thành tâm dâng linh đăng, cầu tu vi vững chắc';
    const tuVi = count * 5;

    state.totalLamps += count;
    state.activeLamps = Math.min(36, state.activeLamps + count);
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, count, 0, wish);

    const ttsText = params.readTts === false
      ? ''
      : `Tiên đạo hữu duyên. Cảm tạ đệ tử ${devotee.name} đã thành tâm thắp ${count} linh đăng. ${wish}.`;

    const event = pushEventLog({
      type: 'lightLamp',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      tuVi,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  cultivate(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(50, Number(params.count) || 1));
    const tuVi = count;

    state.cultivateHits += count;
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, 0, 0);

    const event = pushEventLog({
      type: 'cultivate',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      tuVi,
      ttsText: params.ttsText || ''
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  ringBell(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(9, Number(params.count) || 1));
    const wish = sanitizeWishText(params.wish) || 'Thỉnh chuông tông môn, đạo tâm sáng tỏ, linh khí quy tụ';
    const tuVi = count * 10;

    state.bellRings += count;
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, 0, 0, wish);

    const ttsText = params.readTts
      ? `Đệ tử ${devotee.name} thỉnh chuông tông môn cầu nguyện: ${wish}.`
      : '';

    const event = pushEventLog({
      type: 'ringBell',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      count,
      tuVi,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  sendWish(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const wish = sanitizeWishText(params.wish) || 'Cầu tu vi tinh tiến, đạo tâm vững vàng, vạn sự hanh thông';
    const tuVi = 10;

    state.lanternCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, 1, 0, wish);

    const ttsText = params.readTts === false
      ? ''
      : `Lời nguyện của đệ tử ${devotee.name}: ${wish}. Đạo tâm vững chắc.`;

    const event = pushEventLog({
      type: 'sendWish',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      wish,
      tuVi,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  offerGift(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const coins = Math.max(1, Number(params.coins) || 10);
    const giftType = ['spiritStone', 'pill', 'sword', 'tribulation'].includes(params.giftType)
      ? params.giftType
      : (coins >= 100 ? 'tribulation' : coins >= 20 ? 'sword' : coins >= 5 ? 'pill' : 'spiritStone');

    const giftLabels = {
      spiritStone: 'Linh Thạch',
      pill: 'Linh Đan',
      sword: 'Phi Kiếm',
      tribulation: 'Đại Lễ Lôi Kiếp'
    };
    const giftName = params.giftName || giftLabels[giftType];
    const tuVi = Math.min(300, Math.max(3, coins * 3));

    state.offerings[giftType] = (state.offerings[giftType] || 0) + 1;
    state.totalLamps += 3;
    state.activeLamps = Math.min(36, state.activeLamps + 3);

    const wish = params.wish || `Dâng ${giftName} lên Tiên Điện`;
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, 3, 1, wish);

    const ttsText = params.readTts === false
      ? ''
      : `Linh khí dồi dào! Cảm tạ đệ tử ${devotee.name} đã phát tâm dâng ${giftName}, tích thêm ${tuVi} điểm tu vi. Nguyện đạo tâm đệ tử vững như bàn thạch, tu vi tinh tiến.`;

    const event = pushEventLog({
      type: giftType === 'tribulation' ? 'tribulation' : 'offerGift',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      giftType,
      giftName,
      coins,
      tuVi,
      wish,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  drawTechnique(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const topic = sanitizeWishText(params.topic) || 'Tu vi, Đạo tâm và Cơ duyên';
    const roll = Math.random();
    const pool = roll < 0.03 ? TECHNIQUE_DECK.filter((t) => t.grade === 'Thiên') : roll < 0.12 ? TECHNIQUE_DECK.filter((t) => t.grade === 'Địa') : roll < 0.30 ? TECHNIQUE_DECK.filter((t) => t.grade === 'Huyền') : roll < 0.60 ? TECHNIQUE_DECK.filter((t) => t.grade === 'Linh') : TECHNIQUE_DECK.filter((t) => t.grade === 'Phàm');
    const fortune = pool[Math.floor(Math.random() * pool.length)];
    const tuVi = 10;

    state.techniqueCount += 1;
    const devotee = recordDevotee(user, uniqueId, avatar, tuVi, 0, 0, `Rút công pháp: Thẻ số ${fortune.number} (${fortune.grade})`);

    const ttsText = params.readTts === false
      ? ''
      : `Đệ tử ${devotee.name} vừa rút được ${fortune.ttsSummary}`;

    const event = pushEventLog({
      type: 'drawTechnique',
      user: devotee.name,
      uniqueId: devotee.uniqueId,
      avatar: devotee.avatar,
      topic,
      technique: fortune,
      tuVi,
      ttsText,
      ttsVoice: state.settings.ttsVoice || 'maichi'
    });

    saveState();
    broadcastNotification('sect.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  tribulation(params = {}) {
    return this.offerGift({
      ...params,
      giftType: 'tribulation',
      coins: Math.max(100, Number(params.coins) || 199),
      giftName: params.giftName || 'Đại Lễ Lôi Kiếp Vạn Trượng'
    });
  },

  updateSettings(params = {}) {
    state.settings = {
      ...state.settings,
      ...params
    };
    if (typeof params.autoSim === 'boolean') {
      configureAutoSim(params.autoSim);
    }
    saveState();
    broadcastNotification('sect.state', getPublicState());
    return getPublicState();
  },

  resetProgress() {
    state.totalLamps = 0;
    state.totalTuVi = 0;
    state.cultivateHits = 0;
    state.bellRings = 0;
    state.lanternCount = 0;
    state.techniqueCount = 0;
    state.activeLamps = 0;
    state.offerings = { spiritStone: 0, pill: 0, sword: 0, tribulation: 0 };
    state.devotees = {};
    state.recentEvents = [];
    saveState();
    broadcastNotification('sect.state', getPublicState());
    return getPublicState();
  }
};

// ============================================================================
// 5. TIKTOK LIVE CONNECTOR & COMMENT PARSER
// ============================================================================
let tiktokConn = null;

const commentCooldownMap = new Map();

function parseViewerComment(commentText, user, uniqueId, avatar) {
  const raw = String(commentText || '').trim();
  if (!raw || isBlockedSpamOrToxic(raw)) return null;
  const cleanWish = sanitizeWishText(raw);
  if (!cleanWish || cleanWish.length < 3) return null;
  const userKey = uniqueId || user || '';
  const now = Date.now();
  if (userKey) {
    const lastTs = commentCooldownMap.get(userKey) || 0;
    if (now - lastTs < 3500) return null;
    commentCooldownMap.set(userKey, now);
    if (commentCooldownMap.size > 600) { const oldestKey = commentCooldownMap.keys().next().value; commentCooldownMap.delete(oldestKey); }
  }
  const cleanUser = sanitizeUserName(user);
  const lower = cleanWish.toLowerCase();
  const has = (...words) => words.some((w) => lower.includes(w));
  if (has('do linh can', 'đo linh căn', 'rut cong phap', 'rút công pháp', 'xin cong phap', 'xin công pháp', 'boi que', 'bói quẻ', 'gieo que', 'gieo quẻ')) return Rituals.drawTechnique({ user: cleanUser, uniqueId, avatar, topic: cleanWish });
  if (has('thinh chuong', 'thỉnh chuông', 'chuong tong mon', 'chuông tông môn')) return Rituals.ringBell({ user: cleanUser, uniqueId, avatar, count: 1, wish: cleanWish, readTts: true });
  if (has('luyen khi', 'luyện khí', 'luyen cong', 'luyện công', 'toa thien', 'tọa thiền', 'thien dinh', 'thiền định')) return Rituals.cultivate({ user: cleanUser, uniqueId, avatar, count: 3 });
  if (has('dang linh dang', 'dâng linh đăng', 'thap linh dang', 'thắp linh đăng', 'dang dang', 'dâng đăng')) return Rituals.lightLamp({ user: cleanUser, uniqueId, avatar, count: 3, wish: cleanWish });
  if (has('cau', 'cầu', 'nguyen', 'nguyện', 'chuc', 'chúc', 'binh an', 'bình an', 'tai loc', 'tài lộc')) return Rituals.sendWish({ user: cleanUser, uniqueId, avatar, wish: cleanWish });
  return Rituals.cultivate({ user: cleanUser, uniqueId, avatar, count: 1 });
}

const giftComboTracker = new Map();

async function resolveTikTokUsername(rawInput) {
  let input = String(rawInput || '').trim();
  if (!input) {
    throw new Error('Vui lòng nhập @username hoặc link TikTok Live cần kết nối');
  }
  if (input.startsWith('http://') || input.startsWith('https://') || input.includes('tiktok.com/')) {
    const urlToFetch = input.startsWith('http') ? input : `https://${input}`;
    const directMatch = urlToFetch.match(/tiktok\.com\/@([^/?#]+)/i);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }
    try {
      const resp = await fetch(urlToFetch, { redirect: 'follow' });
      const finalUrl = resp.url || '';
      const resolvedMatch = finalUrl.match(/tiktok\.com\/@([^/?#]+)/i);
      if (resolvedMatch && resolvedMatch[1]) {
        return resolvedMatch[1];
      }
    } catch (e) {
      console.warn('[TikTok URL Resolve Warning]', e.message);
    }
  }
  return input.replace(/^@/, '').split(/[/?#]/)[0].trim();
}

function extractUserFromEvent(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Thí Chủ';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function connectTikTokLive(usernameOrUrl) {
  const cleanUser = await resolveTikTokUsername(usernameOrUrl);
  if (!cleanUser) {
    throw new Error('Không tìm thấy @username hợp lệ từ dữ liệu nhập vào');
  }

  if (tiktokConn) {
    try {
      await tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }

  state.tiktok = {
    connected: false,
    connecting: true,
    username: cleanUser,
    roomId: null,
    viewerCount: 0,
    lastError: null
  };
  broadcastNotification('sect.state', getPublicState());

  tiktokConn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false
  });

  tiktokConn.on(ControlEvent.CONNECTED, (roomState) => {
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    state.tiktok.lastError = null;
    console.log(`[TikTok Live] Đã kết nối phòng @${cleanUser} (roomId: ${state.tiktok.roomId})`);
    broadcastNotification('sect.state', getPublicState());
  });

  tiktokConn.on(ControlEvent.DISCONNECTED, () => {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    console.log(`[TikTok Live] Đã ngắt kết nối @${cleanUser}`);
    broadcastNotification('sect.state', getPublicState());
  });

  tiktokConn.on(ControlEvent.ERROR, (err) => {
    state.tiktok.lastError = err?.message || String(err);
    console.warn('[TikTok Live Warning]', state.tiktok.lastError);
    broadcastNotification('sect.state', getPublicState());
  });

  tiktokConn.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(data?.total ?? data?.viewerCount ?? 0);
    if (viewerCount > 0) {
      state.tiktok.viewerCount = viewerCount;
      broadcastNotification('sect.viewerCount', { viewerCount });
    }
  });

  tiktokConn.on(WebcastEvent.MEMBER, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    recordDevotee(user, uniqueId, avatar, 1, 0, 0, 'Đã bước vào sơn môn');
    broadcastNotification('sect.state', getPublicState());
  });

  tiktokConn.on(WebcastEvent.CHAT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const commentText = data?.content || data?.comment || '';
    console.log(`[TikTok Chat] ${user}: ${commentText}`);
    parseViewerComment(commentText, user, uniqueId, avatar);
  });

  tiktokConn.on(WebcastEvent.LIKE, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const likeCount = Math.min(15, Math.max(1, Number(data?.count ?? data?.likeCount ?? 1)));
    Rituals.cultivate({ user, uniqueId, avatar, count: likeCount });
  });

  const handleSocialEvent = (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    Rituals.ringBell({
      user,
      uniqueId,
      avatar,
      count: 1,
      wish: 'Hữu duyên tương ngộ nơi sơn môn, cầu tu vi tinh tiến',
      readTts: false
    });
  };
  tiktokConn.on(WebcastEvent.FOLLOW, handleSocialEvent);
  tiktokConn.on(WebcastEvent.SHARE, handleSocialEvent);
  tiktokConn.on(WebcastEvent.SOCIAL, (data) => {
    const action = String(data?.action || '');
    const disp = String(data?.common?.displayText?.displayType || data?.displayType || '').toLowerCase();
    if (action === '1' || action === '3' || disp.includes('follow') || disp.includes('share')) {
      handleSocialEvent(data);
    }
  });

  tiktokConn.on(WebcastEvent.GIFT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const giftId = String(data?.giftId || giftObj?.id || 'rose');
    const groupId = String(data?.groupId || `${uniqueId}_${giftId}`);
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));

    const prevCount = giftComboTracker.get(groupId) || 0;
    if (repeatCount <= prevCount && data?.repeatEnd) {
      giftComboTracker.delete(groupId);
      return;
    }
    const deltaCount = Math.max(1, repeatCount - prevCount);
    giftComboTracker.set(groupId, repeatCount);
    if (giftComboTracker.size > 500) {
      const firstKey = giftComboTracker.keys().next().value;
      giftComboTracker.delete(firstKey);
    }

    const diamondCount = Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1));
    const totalCoins = diamondCount * deltaCount;
    const rawGiftName = giftObj?.name || data?.giftName || giftObj?.describe || 'Hoa Hồng Tâm Thành';
    const displayGiftName = deltaCount > 1 ? `${deltaCount}x ${rawGiftName}` : rawGiftName;

    console.log(`[TikTok Gift] ${user} gửi ${displayGiftName} (${totalCoins} xu)`);

    Rituals.offerGift({
      user,
      uniqueId,
      avatar,
      coins: totalCoins,
      giftName: displayGiftName,
      wish: `Thành tâm dâng ${displayGiftName} kính lễ Tông Chủ`
    });
  });

  try {
    const roomState = await tiktokConn.connect();
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    broadcastNotification('sect.state', getPublicState());
    return state.tiktok;
  } catch (err) {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    state.tiktok.lastError = err?.message || 'Không thể kết nối phòng Live (kiểm tra tài khoản đang phát Live chưa)';
    broadcastNotification('sect.state', getPublicState());
    throw new Error(state.tiktok.lastError);
  }
}

function disconnectTikTokLive() {
  if (tiktokConn) {
    try {
      tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }
  state.tiktok.connected = false;
  state.tiktok.connecting = false;
  state.tiktok.viewerCount = 0;
  broadcastNotification('sect.state', getPublicState());
  return state.tiktok;
}

// ============================================================================
// 6. AUTO-SIMULATION ENGINE (CHẾ ĐỘ TỰ ĐỘNG GIẢ LẬP ĐÔNG NGƯỜI XEM)
// ============================================================================
let autoSimTimer = null;
const SIM_DEVOTEES = [
  { user: 'Vân Phi', uniqueId: 'demo_vanphi', wish: 'Cầu tháng mới đột phá Trúc Cơ, tu vi vững chắc' },
  { user: 'Linh Nhi', uniqueId: 'demo_linhnhi', wish: 'Cầu đạo tâm vững vàng, linh khí dồi dào' },
  { user: 'Trần Kiếm', uniqueId: 'demo_trankiem', wish: 'Cầu kiếm ý tinh tiến, một kiếm phá mây' },
  { user: 'Thanh Hà', uniqueId: 'demo_thanhha', wish: 'Cầu tu luyện thuận lợi, cơ duyên không dứt' },
  { user: 'Đức Thịnh', uniqueId: 'demo_ducthinh', wish: 'Cầu rút được công pháp phẩm Địa trở lên' },
  { user: 'Tâm An', uniqueId: 'demo_taman', wish: 'Cầu tâm tĩnh như nước, không nhiễm bụi trần' },
];

function runSingleSimulationStep() {
  if (state.tiktok.viewerCount > 0) return;
  const pick = SIM_DEVOTEES[Math.floor(Math.random() * SIM_DEVOTEES.length)];
  const roll = Math.random();
  if (roll < 0.30) {
    Rituals.lightLamp({ user: pick.user, uniqueId: pick.uniqueId, count: 3, wish: pick.wish, isSim: true });
  } else if (roll < 0.55) {
    Rituals.sendWish({ user: pick.user, uniqueId: pick.uniqueId, wish: pick.wish, isSim: true });
  } else if (roll < 0.75) {
    Rituals.drawTechnique({ user: pick.user, uniqueId: pick.uniqueId, topic: pick.wish, isSim: true });
  } else if (roll < 0.90) {
    Rituals.offerGift({ user: pick.user, uniqueId: pick.uniqueId, giftType: 'spiritStone', coins: 15, giftName: 'Linh Thạch', isSim: true });
  } else {
    Rituals.ringBell({ user: pick.user, uniqueId: pick.uniqueId, count: 1, wish: pick.wish, readTts: true, isSim: true });
  }
}

function configureAutoSim(enabled) {
  state.settings.autoSim = Boolean(enabled);
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  if (state.settings.autoSim) {
    runSingleSimulationStep();
    autoSimTimer = setInterval(runSingleSimulationStep, state.settings.autoSimIntervalMs || 9500);
  }
}

// ============================================================================
// 7. JSON-RPC 2.0 DISPATCHER
// ============================================================================
async function handleRpcCall(method, params = {}) {
  switch (method) {
    case 'sect.getState':
      return getPublicState();
    case 'sect.lightLamp':
      return Rituals.lightLamp(params);
    case 'sect.cultivate':
      return Rituals.cultivate(params);
    case 'sect.ringBell':
      return Rituals.ringBell(params);
    case 'sect.sendWish':
      return Rituals.sendWish(params);
    case 'sect.offerGift':
      return Rituals.offerGift(params);
    case 'sect.drawTechnique':
      return Rituals.drawTechnique(params);
    case 'sect.tribulation':
      return Rituals.tribulation(params);
    case 'sect.updateSettings':
      return Rituals.updateSettings(params);
    case 'sect.resetProgress':
      return Rituals.resetProgress();
    case 'sect.comment':
      return parseViewerComment(params.comment, params.user, params.uniqueId, params.avatar);
    case 'sect.speak': {
      const res = await zeroTts.synthesize(params.text, params.voice || 'maichi');
      if (res.ok && params.broadcast !== false) {
        broadcastNotification('tts.play', {
          text: params.text,
          voice: res.voice,
          url: res.url
        });
      }
      return res;
    }
    case 'sect.ttsStatus':
      return zeroTts.getStatus();
    case 'live.connect':
      return await connectTikTokLive(params.username);
    case 'live.disconnect':
      return disconnectTikTokLive();
    case 'live.setAutoSim':
      configureAutoSim(Boolean(params.enabled));
      saveState();
      broadcastNotification('sect.state', getPublicState());
      return getPublicState();
    default:
      throw new Error(`Không tìm thấy phương thức JSON-RPC: ${method}`);
  }
}

// ============================================================================
// 8. EXPRESS + WEBSOCKET SERVER
// ============================================================================
const SECT_RPC_TOKEN = process.env.SECT_RPC_TOKEN || '';
const ALLOWED_ORIGINS = (process.env.SECT_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((x) => x.trim()).filter(Boolean);
const app = express();
app.use(cors({ origin: (origin, cb) => { if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true); return cb(new Error('Origin không được phép')); } }));
function requireSectToken(req, res, next) {
  if (!SECT_RPC_TOKEN) return next();
  const token = req.headers['x-sect-token'] || (req.headers.authorization || '').replace(/^Bearer /i, '');
  if (token === SECT_RPC_TOKEN) return next();
  return res.status(401).json({ ok: false, error: 'Thiếu hoặc sai SECT_RPC_TOKEN' });
}
app.use(express.json({ limit: '2mb' }));
app.use('/tts-cache', express.static(TTS_CACHE_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// HTTP JSON-RPC 2.0 Endpoint
app.post('/rpc', requireSectToken, async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (!method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid JSON-RPC Request: thiếu method' }
    });
  }
  try {
    const result = await handleRpcCall(method, params || {});
    res.json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      result
    });
  } catch (err) {
    res.status(200).json({
      jsonrpc: jsonrpc || '2.0',
      id: id ?? null,
      error: { code: -32000, message: err.message || 'Server error' }
    });
  }
});

// ZeroTTS HTTP Endpoint (Mai Chi default)
app.all('/api/tts', requireSectToken, async (req, res) => {
  const text = (req.body?.text || req.query?.text || '').trim();
  const voice = (req.body?.voice || req.query?.voice || state.settings.ttsVoice || 'maichi').trim();
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Thiếu nội dung text cần đọc' });
  }
  const result = await zeroTts.synthesize(text, voice);
  res.json(result);
});

app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastNotification(method, params) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    method,
    params
  });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      jsonrpc: '2.0',
      method: 'sect.state',
      params: getPublicState()
    })
  );

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch (_) {
      return;
    }
    if (!msg || !msg.method) return;
    if (SECT_RPC_TOKEN && msg.method !== 'sect.getState') {
      const token = msg.token || msg.auth || '';
      if (token !== SECT_RPC_TOKEN) { if (msg.id !== undefined) ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32001, message: 'Thiếu hoặc sai SECT_RPC_TOKEN' } })); return; }
    }
    try {
      const result = await handleRpcCall(msg.method, msg.params || {});
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            result
          })
        );
      }
    } catch (err) {
      if (msg.id !== undefined) {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32000, message: err.message || 'RPC Error' }
          })
        );
      }
    }
  });
});

const zeroTts = new ZeroTTSManager();

server.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`🪷 TU TIÊN LIVE RPC — THANH VÂN TÔNG ĐÃ KHỞI ĐỘNG`);
  console.log(`📺 Màn hình Live (9:16 OBS): http://localhost:${PORT}`);
  console.log(`🎛️ Bảng điều khiển RPC Admin: http://localhost:${PORT}/admin`);
  console.log(`🔌 JSON-RPC 2.0 Endpoint   : http://localhost:${PORT}/rpc (ws://localhost:${PORT}/ws)`);
  console.log(`============================================================`);

  // Chỉ tự động kết nối khi có SECT_TIKTOK_USER
  const defaultChannel = process.env.SECT_TIKTOK_USER || state.tiktok?.username || '';
  if (defaultChannel) {
    connectTikTokLive(defaultChannel).catch((err) => {
      console.warn(`[Auto-Connect @${defaultChannel}] Chưa kết nối được ngay:`, err.message);
    });
  }
});
