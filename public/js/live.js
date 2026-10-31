/**
 * Live 9:16 Client Controller — Tiên Điện Tông Chủ Thanh Vân Tông & Ngoại Môn Đệ Tử Quỳ Lễ
 * - Hiển thị 6 Ghế Chân Truyền (Top 6 Bảng Chân Truyền Tu Vi)
 * - Hiển thị 40 Đệ Tử mặc áo trắng viền xanh quỳ hai bên thảm đỏ + thẻ tên người xem
 * - Hiệu ứng người xem bước dọc thảm đỏ lên trước Lư Hương Đồng dâng hương
 * - Giọng đọc ZeroTTS (Mai Chi) + Pháp khí Web Audio
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('obs') === '1') {
    document.body.classList.add('obs-mode');
  }

  // 1. Tự động co giãn khung 1080x1920 vừa khít Stage Wrapper (9:16)
  const stageWrapper = document.getElementById('stageWrapper');
  const stage9x16 = document.getElementById('stage9x16');

  function fitStage() {
    if (!stageWrapper || !stage9x16) return;
    const rect = stageWrapper.getBoundingClientRect();
    const scale = rect.width / 1080;
    stage9x16.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  // 2. Khởi tạo Particle Engine & Audio Engine (ZeroTTS Mai Chi)
  const canvas = document.getElementById('sectCanvas');
  const particles = new window.TempleParticleEngine(canvas);
  const audio = new window.TempleAudioEngine();

  function unlockAudioOnce() {
    audio.ensureContext();
    const btnUnlock = document.getElementById('btnUnlockAudio');
    if (btnUnlock) {
      btnUnlock.textContent = '✅ Âm Thanh Tông Môn Đã Sẵn Sàng';
      btnUnlock.classList.remove('gold');
      btnUnlock.classList.add('active-toggle');
    }
  }
  window.addEventListener('pointerdown', unlockAudioOnce, { once: true });

  // 3. Vẽ các nén nhang đang cháy trong Lư Hương Đỉnh Đồng (x=540, y=895)
  const lampHolder = document.getElementById('lampSticksHolder');
  let renderedStickCount = 0;

  function renderLampSticks(count) {
    const target = Math.max(3, Math.min(27, Number(count) || 9));
    if (target === renderedStickCount && lampHolder.children.length > 0) return;
    renderedStickCount = target;
    lampHolder.innerHTML = '';

    const tips = [];
    for (let i = 0; i < target; i++) {
      const stick = document.createElement('div');
      stick.className = 'lamp-stick';

      const spread = target === 1 ? 0 : (i / (target - 1) - 0.5) * 2;
      const leftPx = 65 + spread * 28 + Math.sin(i * 2.1) * 2;
      const angleDeg = spread * 12 + Math.cos(i * 1.5) * 1.5;
      const heightPx = 76 + (i % 3) * 6;

      stick.style.left = `${leftPx}px`;
      stick.style.height = `${heightPx}px`;
      stick.style.transform = `rotate(${angleDeg}deg)`;

      const ember = document.createElement('div');
      ember.className = 'lamp-ember';
      ember.style.animationDelay = `${(i * 0.15) % 1.1}s`;
      stick.appendChild(ember);
      lampHolder.appendChild(stick);

      const rad = (angleDeg * Math.PI) / 180;
      const tipX = 540 + (leftPx - 65) + Math.sin(rad) * heightPx;
      const tipY = 895 - Math.cos(rad) * heightPx;
      tips.push({ x: tipX, y: tipY });
    }
    particles.setLampTips(tips);
  }

  // 4. Dựng Hàng 6 Ghế Chân Truyền (Top 6 Đệ Tử trên bục gỗ y=1188)
  const VIP_CUSHION_COORDS = [
    { x: 140, y: 1188, rank: 1 },
    { x: 268, y: 1188, rank: 2 },
    { x: 392, y: 1188, rank: 3 },
    { x: 688, y: 1188, rank: 4 },
    { x: 812, y: 1188, rank: 5 },
    { x: 940, y: 1188, rank: 6 }
  ];

  function renderVipCushions(leaderboard = []) {
    const layer = document.getElementById('vipCushionsLayer');
    if (!layer) return;

    layer.innerHTML = VIP_CUSHION_COORDS.map((slot, idx) => {
      const dev = leaderboard[idx];
      if (!dev) return '';
      return `
        <div class="vip-devotee-slot" style="left: ${slot.x}px; top: ${slot.y}px; z-index: ${12 + idx};">
          <img src="/assets/devotee.png" alt="VIP Devotee" class="devotee-sprite" />
          <div class="vip-rank-pill">
            <span class="vip-rank-num">${slot.rank}</span>
            <span class="vip-rank-name">${escapeHtml(shortenName(dev.name, 12))}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Dựng Ngoại Môn 40 Đệ Tử Quỳ Lễ Hai Bên Cầu Đá (5 Hàng x 4 Cột mỗi bên)
  const congregationHall = document.getElementById('congregationHall');
  const HALL_SEAT_COORDS = [];

  (function buildHallGrid() {
    const rows = 5;
    const colsPerSide = 4;
    for (let r = 0; r < rows; r++) {
      const progress = r / (rows - 1); // 0 (xa) -> 1 (gần)
      const y = Math.round(1290 + progress * 355); // 1290 -> 1645
      const scale = +(0.76 + progress * 0.28).toFixed(2);

      // Cánh trái thảm đỏ
      const leftInnerX = Math.round(335 - progress * 48); // mép thảm mở rộng dần
      const leftOuterX = 48;
      for (let c = 0; c < colsPerSide; c++) {
        const t = c / (colsPerSide - 1);
        const x = Math.round(leftOuterX + t * (leftInnerX - leftOuterX));
        HALL_SEAT_COORDS.push({ side: 'L', row: r, col: c, x, y, scale });
      }

      // Cánh phải thảm đỏ
      const rightInnerX = Math.round(745 + progress * 48);
      const rightOuterX = 1032;
      for (let c = 0; c < colsPerSide; c++) {
        const t = c / (colsPerSide - 1);
        const x = Math.round(rightInnerX + t * (rightOuterX - rightInnerX));
        HALL_SEAT_COORDS.push({ side: 'R', row: r, col: c, x, y, scale });
      }
    }
  })();

  let lastRenderedLeaderboardJson = '';

  function renderCongregationHall(leaderboard = []) {
    if (!congregationHall) return;
    // Những người xếp từ hạng 7 trở đi ngồi ở các vị trí đầu tiên cạnh thảm đỏ
    const hallViewers = leaderboard.slice(6);
    const sig = JSON.stringify(hallViewers.map((d) => `${d.name}:${d.tuVi}`));
    if (sig === lastRenderedLeaderboardJson && congregationHall.children.length > 0) return;
    lastRenderedLeaderboardJson = sig;

    // Ưu tiên gắn thẻ tên vào các ghế gần thảm đỏ dễ nhìn nhất
    const labeledSeatIndices = [
      3, 4, 11, 12, 19, 20, 27, 28, 35, 36, 2, 5, 10, 13, 18, 21, 26, 29
    ];
    const seatViewerMap = new Map();
    hallViewers.forEach((viewer, idx) => {
      if (idx < labeledSeatIndices.length) {
        seatViewerMap.set(labeledSeatIndices[idx], viewer);
      }
    });

    congregationHall.innerHTML = HALL_SEAT_COORDS.map((seat, idx) => {
      const viewer = seatViewerMap.get(idx);
      const badgeHtml = viewer
        ? `
          <div class="seat-badge">
            <span class="seat-avatar">${
              viewer.avatar
                ? `<img src="${escapeHtml(viewer.avatar)}" alt="" />`
                : escapeHtml(String(viewer.name || 'P').charAt(0).toUpperCase())
            }</span>
            <span class="seat-username">${escapeHtml(shortenName(viewer.name, 11))}</span>
          </div>
        `
        : '';

      return `
        <div
          class="hall-seat"
          data-seat-idx="${idx}"
          style="left: ${seat.x}px; top: ${seat.y}px; z-index: ${20 + seat.row * 2}; transform: translate(-50%, -100%) scale(${seat.scale});"
        >
          <img
            src="/assets/devotee.png"
            alt="Đệ tử"
            class="devotee-sprite"
            style="animation-delay: ${((idx * 0.27) % 3.5).toFixed(2)}s;"
          />
          ${badgeHtml}
        </div>
      `;
    }).join('');
  }

  // Preload toàn bộ 8 frame nhân vật vào bộ nhớ để chuyển frame mượt 0ms
  const SPRITE_FRAMES = {
    walk1: '/assets/devotee_walk.png',
    walk2: '/assets/devotee_walk_2.png',
    kneelDown: '/assets/devotee_kneel_down.png',
    kneel: '/assets/devotee.png',
    forehead: '/assets/devotee_bow.png',
    bowMid: '/assets/devotee_bow_mid.png',
    prostrate: '/assets/devotee_prostrate.png',
    prostrateDeep: '/assets/devotee_prostrate_deep.png'
  };
  Object.values(SPRITE_FRAMES).forEach((url) => {
    const img = new Image();
    img.src = url;
  });

  function pulseHallBowing() {
    if (!congregationHall) return;
    const seats = congregationHall.querySelectorAll('.hall-seat');
    seats.forEach((el, i) => {
      const img = el.querySelector('.devotee-sprite');
      if (!img) return;
      // Sóng vái lạy: lan từ hàng xa tới hàng gần + từ mép thảm ra biên ngoài.
      // Mỗi hàng 8 chỗ (4 trái + 4 phải), col 0 = gần thảm, col 3 = mép ngoài.
      const row = Math.floor(i / 8);
      const col = i % 4;
      const delay = row * 100 + col * 55;
      setTimeout(() => { img.src = SPRITE_FRAMES.forehead; }, delay);
      setTimeout(() => { img.src = SPRITE_FRAMES.bowMid; }, delay + 140);
      setTimeout(() => { img.src = SPRITE_FRAMES.prostrateDeep; }, delay + 300);
      setTimeout(() => { img.src = SPRITE_FRAMES.bowMid; }, delay + 620);
      setTimeout(() => { img.src = SPRITE_FRAMES.kneel; }, delay + 780);
    });
  }

  // Hook thử nghiệm: mở trang kèm ?wave-test để thấy làn sóng vái lạy lặp lại mỗi 3s
  if (location.search.includes('wave-test') && typeof pulseHallBowing === 'function') {
    pulseHallBowing();
    setInterval(pulseHallBowing, 3000);
  }

  let prostrationTimers = [];
  function clearProstrationTimers() {
    while (prostrationTimers.length > 0) {
      clearTimeout(prostrationTimers.pop());
    }
  }

  // Chuyển đổi tức thời giữa 8 khung hình đã giải mã sẵn trên GPU (KHÔNG BAO GIỜ BỊ MẤT HÌNH)
  function setCentralPose(poseKey) {
    const stack = document.getElementById('centralSpriteStack');
    if (!stack) return;
    const frames = stack.querySelectorAll('.pose-frame');
    frames.forEach((img) => {
      img.classList.toggle('active', img.getAttribute('data-pose') === poseKey);
    });
  }

  function schedulePose(ms, poseKey) {
    prostrationTimers.push(
      setTimeout(() => {
        setCentralPose(poseKey);
      }, ms)
    );
  }

  // Chuỗi 8 khung hình Đảnh lễ Tam Bái mượt mà (Hạ gối -> Chắp tay ngực -> Đưa lên trán -> Nghiêng 45° -> Chống tay -> Lạy sát đất -> Ngẩng lên)
  function playThreeBowsSequence(startDelayMs = 0) {
    schedulePose(startDelayMs, 'kneelDown');
    schedulePose(startDelayMs + 160, 'kneel');

    const bowOffsets = [startDelayMs + 320, startDelayMs + 1820, startDelayMs + 3320];
    bowOffsets.forEach((t0) => {
      schedulePose(t0, 'forehead');            // 1. Chắp tay đưa lên trán
      schedulePose(t0 + 170, 'bowMid');        // 2. Cúi gập lưng 45°
      schedulePose(t0 + 330, 'prostrate');     // 3. Vươn hai tay chống xuống đệm
      schedulePose(t0 + 490, 'prostrateDeep'); // 4. Lạy sát đất (Ngũ thể đầu địa)
      schedulePose(t0 + 860, 'prostrate');     // 5. Bắt đầu nâng đầu lên
      schedulePose(t0 + 1020, 'bowMid');       // 6. Nâng lưng lên góc 45°
      schedulePose(t0 + 1180, 'kneel');        // 7. Ngồi quỳ thẳng lưng
    });

    schedulePose(startDelayMs + 4800, 'forehead');
    schedulePose(startDelayMs + 5350, 'kneel');
  }

  // Hiệu ứng đệ tử ĐỨNG ĐI BỘ từng bước dọc thảm đỏ rồi Hạ gối Quỳ Đảnh Lễ (trên cùng 1 nhân vật, không bao giờ mất hình)
  function animateWalkerOnCarpet(user, avatar, actionLabel, wish) {
    const centralEl = document.getElementById('centralWorshipper');
    if (!centralEl) return;

    clearProstrationTimers();
    updateCentralWorshipper(user, avatar, actionLabel, wish, false);

    // Khởi động bước đi từ cuối thảm đỏ lên chính điện
    centralEl.classList.remove('walking-up');
    void centralEl.offsetWidth;
    centralEl.classList.add('walking-up');

    setCentralPose('walk1');
    for (let step = 1; step <= 10; step++) {
      schedulePose(step * 185, step % 2 === 0 ? 'walk1' : 'walk2');
    }

    // Khi bước tới trước Lư Hương (2.05s): dừng bước, hạ gối quỳ xuống đệm và bắt đầu Đảnh lễ 3 lạy
    prostrationTimers.push(
      setTimeout(() => {
        centralEl.classList.remove('walking-up');
      }, 2100)
    );
    playThreeBowsSequence(2050);
  }

  function updateCentralWorshipper(user, avatar, actionLabel, wish, doThreeBows = true) {
    const nameEl = document.getElementById('centralName');
    const actEl = document.getElementById('centralAction');
    const wishEl = document.getElementById('centralWishBubble');
    const avatarEl = document.getElementById('centralAvatar');
    const beam = document.getElementById('sacredLightBeam');

    if (nameEl) nameEl.textContent = user || 'Đệ Tử Hữu Duyên';
    if (actEl) actEl.textContent = actionLabel || '✨ Dâng linh đăng cầu an';
    if (wishEl) wishEl.textContent = `“${wish || 'Thanh Vân Thanh Vân Tông, cầu bình an cát tường'}”`;

    if (avatarEl) {
      if (avatar) {
        avatarEl.innerHTML = `<img src="${escapeHtml(avatar)}" alt="" />`;
      } else {
        avatarEl.textContent = String(user || '🙏').trim().charAt(0).toUpperCase();
      }
    }

    if (doThreeBows) {
      clearProstrationTimers();
      const centralEl = document.getElementById('centralWorshipper');
      if (centralEl) centralEl.classList.remove('walking-up');
      playThreeBowsSequence(0);
    }
    if (beam) {
      beam.classList.add('intense');
      setTimeout(() => beam.classList.remove('intense'), 4500);
    }

    const haloSys = document.getElementById('buddhaHaloSystem');
    const lotusHand = document.getElementById('lotusHandHalo');
    if (haloSys) {
      haloSys.classList.add('flare');
      setTimeout(() => haloSys.classList.remove('flare'), 3600);
    }
    if (lotusHand) {
      lotusHand.classList.add('flare');
      setTimeout(() => lotusHand.classList.remove('flare'), 3600);
    }
    particles.spawnBellWave(540, 260, 2);

    // Cập nhật dòng thông báo dưới thanh HUD
    const hudName = document.getElementById('devoteeNameLine');
    const hudAct = document.getElementById('devoteeActionTag');
    if (hudName) hudName.textContent = user || 'Đệ Tử';
    if (hudAct) hudAct.textContent = actionLabel || 'Dâng linh đăng';
  }

  // 6. Cập nhật toàn bộ giao diện theo State từ Server
  let hasInitializedRealLeader = false;

  function updateUIState(st) {
    if (!st) return;

    document.getElementById('statLamp').textContent = Number(st.totalLamps || 0).toLocaleString('vi-VN');
    document.getElementById('statTuVi').textContent = Number(st.totalTuVi || 0).toLocaleString('vi-VN');
    document.getElementById('statWoodenFish').textContent = Number(st.cultivateHits || 0).toLocaleString('vi-VN');

    renderLampSticks(st.activeLamps || 0);

    const lb = Array.isArray(st.leaderboard) ? st.leaderboard : [];
    renderVipCushions(lb);
    renderCongregationHall(lb);
    const demoBanner = document.getElementById('demoBanner');
    if (demoBanner) demoBanner.style.display = (st.settings?.autoSim && Array.isArray(st.simDevotees) && st.simDevotees.length > 0) ? 'block' : 'none';

    // Đồng bộ tên Chủ Lễ mặc định theo người dẫn đầu thực tế nếu chưa có sự kiện mới
    if (!hasInitializedRealLeader && lb.length > 0) {
      hasInitializedRealLeader = true;
      const topDev = lb[0];
      updateCentralWorshipper(
        topDev.name,
        topDev.avatar,
        `✨ Tu vi: ${Number(topDev.tuVi).toLocaleString('vi-VN')}`,
        topDev.lastWish || 'Thanh Vân Tông, cầu tu vi tinh tiến',
        false
      );
    }

    // Cập nhật Bảng TẤM LÒNG THÀNH ở góc dưới phải (Top 4)
    const lbList = document.getElementById('leaderboardList');
    if (lbList) {
      lbList.innerHTML = lb
        .slice(0, 4)
        .map(
          (item) => `
          <div class="leader-item">
            <span class="leader-rank">${item.rank}</span>
            <span class="leader-name">${escapeHtml(shortenName(item.name, 14))}</span>
            <span class="leader-tuVi">${Number(item.tuVi).toLocaleString('vi-VN')}</span>
          </div>
        `
        )
        .join('');
    }

    // Trạng thái kết nối TikTok Live
    const liveDot = document.getElementById('liveDot');
    const liveText = document.getElementById('liveStatusText');
    if (st.tiktok?.connected) {
      liveDot.classList.add('connected');
      liveText.textContent = `LIVE @${st.tiktok.username} • ${st.tiktok.viewerCount || 0} mắt`;
    } else if (st.tiktok?.connecting) {
      liveDot.classList.remove('connected');
      liveText.textContent = `Đang kết nối @${st.tiktok.username}...`;
    } else {
      liveDot.classList.remove('connected');
      liveText.textContent = st.settings?.autoSim
        ? 'THANH VÂN TÔNG • CHẾ ĐỘ DEMO'
        : 'THANH VÂN TÔNG • TIÊN ĐIỆN';
    }

    const btnAutoSim = document.getElementById('btnToggleAutoSim');
    if (btnAutoSim && st.settings) {
      btnAutoSim.textContent = st.settings.autoSim
        ? '🤖 Tự động Giả lập Người Xem: ĐANG BẬT'
        : '🤖 Tự động Giả lập Người Xem: TẮT';
      btnAutoSim.classList.toggle('active-toggle', Boolean(st.settings.autoSim));
    }
    if (st.settings) {
      if (typeof st.settings.musicVolume === 'number') {
        audio.setMusicVolume(st.settings.musicVolume);
        const sMus = document.getElementById('sliderMusicVol');
        const vMus = document.getElementById('valMusicVol');
        const pct = Math.round(st.settings.musicVolume * 100);
        if (sMus) sMus.value = String(pct);
        if (vMus) vMus.textContent = `${pct}%`;
      }
      if (typeof st.settings.ttsVolume === 'number') {
        audio.setTtsVolume(st.settings.ttsVolume);
        const sTts = document.getElementById('sliderTtsVol');
        const vTts = document.getElementById('valTtsVol');
        const pct = Math.round(st.settings.ttsVolume * 100);
        if (sTts) sTts.value = String(pct);
        if (vTts) vTts.textContent = `${pct}%`;
      }
    }


    const feed = document.getElementById('eventFeed');
    if (feed && Array.isArray(st.recentEvents)) {
      feed.innerHTML = st.recentEvents
        .slice(0, 8)
        .map((ev) => `<div class="event-feed-item">${formatEventSummary(ev)}</div>`)
        .join('');
    }
  }

  function formatEventSummary(ev) {
    switch (ev.type) {
      case 'lightLamp':
        return `🔥 <strong>${escapeHtml(ev.user)}</strong> dâng ${ev.count} linh đăng (+${ev.tuVi} tu vi)`;
      case 'cultivate':
        return `🪵 <strong>${escapeHtml(ev.user)}</strong> luyện khí ${ev.count} nhịp (+${ev.tuVi} tu vi)`;
      case 'ringBell':
        return `🔔 <strong>${escapeHtml(ev.user)}</strong> thỉnh Chuông tông môn (+${ev.tuVi} tu vi)`;
      case 'sendWish':
        return `🏮 <strong>${escapeHtml(ev.user)}</strong> cầu phúc: “${escapeHtml(ev.wish)}”`;
      case 'offerGift':
      case 'tribulation':
        return `🪷 <strong>${escapeHtml(ev.user)}</strong> dâng <em>${escapeHtml(ev.giftName)}</em> (+${ev.tuVi} tu vi)`;
      case 'drawTechnique':
        return `🎋 <strong>${escapeHtml(ev.user)}</strong> rút được Thẻ số ${ev.technique?.number} (${ev.technique?.grade})`;
      default:
        return `✨ <strong>${escapeHtml(ev.user || 'Đệ tử')}</strong> tương tác`;
    }
  }

  // 7. Xử lý hiệu ứng khi có Nghi Thức mới
  let techniqueTimer = null;
  let grandTimer = null;

  function triggerRitualVisuals(ev) {
    if (!ev) return;

    if (ev.ttsText && ev.type !== 'drawTechnique') {
      audio.enqueueTts(ev.ttsText, { voice: ev.ttsVoice || 'maichi' });
    }

    switch (ev.type) {
      case 'lightLamp': {
        audio.playLampChime();
        particles.spawnLampBurst(540, 895);
        particles.spawnFloatingTuVi(`+${ev.tuVi} Tu Vi`, 540, 860, '#ffe082');
        animateWalkerOnCarpet(ev.user, ev.avatar, `🔥 Dâng ${ev.count} linh đăng (+${ev.tuVi} tu vi)`, ev.wish);
        break;
      }

      case 'cultivate': {
        audio.playWoodenFish();
        pulseHallBowing();
        particles.spawnFloatingTuVi(`+${ev.tuVi} Tu Vi`, 890, 935, '#ffd54f');
        break;
      }

      case 'ringBell': {
        audio.playTempleBell(1.0);
        pulseHallBowing();
        particles.spawnBellWave(540, 510, 4);
        particles.spawnFloatingTuVi(`+${ev.tuVi} Tu Vi`, 190, 935, '#fff3b0');
        updateCentralWorshipper(ev.user, ev.avatar, `🔔 Thỉnh Chuông Tông Môn (+${ev.tuVi} tu vi)`, ev.wish);
        break;
      }

      case 'sendWish': {
        audio.playLampChime();
        spawnSkyLantern(ev.user, ev.wish);
        particles.spawnFloatingTuVi(`+${ev.tuVi} Tu Vi`, 540, 920, '#ffb74d');
        animateWalkerOnCarpet(ev.user, ev.avatar, `🏮 Cầu phúc (+${ev.tuVi} tu vi)`, ev.wish);
        break;
      }

      case 'offerGift': {
        audio.playLampChime();
        audio.playTempleBell(0.85);
        particles.spawnLampBurst(540, 895);
        particles.spawnFloatingTuVi(`+${ev.tuVi} Tu Vi`, 540, 840, '#fff3b0');
        animateWalkerOnCarpet(ev.user, ev.avatar, `🪷 Dâng ${ev.giftName} (+${ev.tuVi} tu vi)`, ev.wish);
        break;
      }

      case 'tribulation': {
        audio.playTempleBell(1.2);
        setTimeout(() => audio.playTempleBell(1.1), 900);
        particles.spawnGrandCeremonyRain();
        pulseHallBowing();
        showGrandCeremonyBanner(ev.user, ev.giftName, ev.tuVi);
        animateWalkerOnCarpet(ev.user, ev.avatar, `🐉 ${ev.giftName} (+${ev.tuVi} tu vi)`, ev.wish);
        break;
      }

      case 'drawTechnique': {
        audio.playTechniqueShake();
        updateCentralWorshipper(
          ev.user,
          ev.avatar,
          `🎋 Đang rút công pháp...`,
          `Đệ tử ${ev.user} đang thành tâm rút công pháp...`,
          false
        );
        // Chỉ hiển thị thẻ Công Pháp đúng thời điểm giọng đọc bắt đầu vang lên!
        audio.enqueueTts(ev.ttsText || '', {
          voice: ev.ttsVoice || 'maichi',
          onStart: () => {
            audio.playLampChime();
            showTechniqueModal(ev.user, ev.technique);
            updateCentralWorshipper(
              ev.user,
              ev.avatar,
              `🎋 Thẻ số ${ev.technique?.number} (${ev.technique?.grade})`,
              ev.technique?.meaning || '',
              true
            );
          },
          onEnd: () => {
            clearTimeout(techniqueTimer);
            techniqueTimer = setTimeout(() => {
              document.getElementById('techniqueModal')?.classList.remove('visible');
            }, 1800);
          }
        });
        break;
      }
    }
  }

  function spawnSkyLantern(user, wish) {
    const layer = document.getElementById('skyLanternsLayer');
    if (!layer) return;
    const lantern = document.createElement('div');
    lantern.className = 'sky-lantern';
    const leftPos = 80 + Math.floor(Math.random() * 640);
    lantern.style.left = `${leftPos}px`;
    lantern.innerHTML = `
      <div class="sky-lantern-user">🙏 ${escapeHtml(user)}</div>
      <div class="sky-lantern-wish">“${escapeHtml(wish)}”</div>
    `;
    layer.appendChild(lantern);
    setTimeout(() => {
      lantern.remove();
    }, 10600);
  }

  function showTechniqueModal(user, technique) {
    if (!technique) return;
    const modal = document.getElementById('techniqueModal');
    document.getElementById('techniqueRankBadge').textContent = technique.rank.toUpperCase();
    document.getElementById('techniqueTitle').textContent = `Thẻ Số ${technique.number} — ${technique.title}`;
    document.getElementById('techniqueDevotee').textContent = `Đệ tử cầu công pháp: ${user}`;
    document.getElementById('techniquePoem').textContent = technique.poem;
    document.getElementById('techniqueMeaning').textContent = `Lời bàn: ${technique.meaning}`;

    modal.classList.add('visible');
    clearTimeout(techniqueTimer);
    techniqueTimer = setTimeout(() => {
      modal.classList.remove('visible');
    }, 15000);
  }

  document.getElementById('techniqueModal')?.addEventListener('click', () => {
    document.getElementById('techniqueModal').classList.remove('visible');
  });

  function showGrandCeremonyBanner(user, giftName, tuVi) {
    const banner = document.getElementById('grandCeremonyBanner');
    document.getElementById('grandTitle').textContent = `🐉 ${giftName.toUpperCase()} 🐉`;
    document.getElementById('grandSub').textContent = `Đại Đệ Tử ${user} • Tu Vi (+${tuVi} tu vi)`;
    banner.classList.add('visible');
    clearTimeout(grandTimer);
    grandTimer = setTimeout(() => {
      banner.classList.remove('visible');
    }, 6800);
  }

  // 8. Kết nối JSON-RPC 2.0 WebSocket & Gửi Lệnh RPC
  let ws = null;
  let rpcId = 1;

  function connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.method === 'sect.state') {
          updateUIState(msg.params);
        } else if (msg.method === 'sect.event') {
          if (msg.params?.state) updateUIState(msg.params.state);
          if (msg.params?.event) triggerRitualVisuals(msg.params.event);
        } else if (msg.method === 'tts.play') {
          if (msg.params?.url) {
            audio.enqueueTts(msg.params.text || 'Nam mô Thanh Vân Tông', {
              voice: msg.params.voice || 'maichi',
              url: msg.params.url
            });
          }
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 2000);
    };
  }
  connectWebSocket();

  async function callRpc(method, params = {}) {
    audio.ensureContext();
    const payload = {
      jsonrpc: '2.0',
      id: rpcId++,
      method,
      params
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
      return;
    }
    const res = await fetch('/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data?.result?.state) updateUIState(data.result.state);
    if (data?.result?.event) triggerRitualVisuals(data.result.event);
    return data;
  }

  function getFormInput() {
    const user = document.getElementById('inputDevoteeName')?.value.trim() || 'Quỳnh_Finn';
    const wish =
      document.getElementById('inputDevoteeWish')?.value.trim() ||
      'Cầu cho gia đình bình an, tài lộc hanh thông';
    return { user, wish };
  }

  // Gắn sự kiện tương tác trực tiếp trên màn hình 9:16 & Thanh HUD dưới đáy
  document.getElementById('lampBurnerZone')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.lightLamp', { user, count: 3, wish });
  });

  document.getElementById('cardLamp')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.lightLamp', { user, count: 3, wish });
  });

  document.getElementById('cardBlessing')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.sendWish', { user, wish });
  });

  document.getElementById('cardLotus')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.offerGift', {
      user,
      giftType: 'lotus',
      coins: 20,
      giftName: 'Đài Linh Thạch',
      wish
    });
  });

  document.getElementById('cultivateDrumStation')?.addEventListener('click', () => {
    const { user } = getFormInput();
    callRpc('sect.cultivate', { user, count: 1 });
  });

  document.getElementById('bellStation')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.ringBell', { user, count: 1, wish, readTts: true });
  });

  document.getElementById('techniqueCylinder')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.drawTechnique', { user, topic: wish });
  });

  // Các nút trên Quick RPC Dock bên phải
  document.getElementById('btnRpcLamp')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.lightLamp', { user, count: 3, wish });
  });

  document.getElementById('btnRpcLantern')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.sendWish', { user, wish });
  });

  document.getElementById('btnRpcWoodenFish')?.addEventListener('click', () => {
    const { user } = getFormInput();
    callRpc('sect.cultivate', { user, count: 5 });
  });

  document.getElementById('btnRpcBell')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.ringBell', { user, count: 1, wish, readTts: true });
  });

  document.getElementById('btnRpcTechnique')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.drawTechnique', { user, topic: wish });
  });

  document.getElementById('btnRpcGiftLotus')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.offerGift', {
      user,
      giftType: 'lotus',
      coins: 20,
      giftName: 'Đài Linh Thạch',
      wish
    });
  });

  document.getElementById('btnRpcGrandCeremony')?.addEventListener('click', () => {
    const { user, wish } = getFormInput();
    callRpc('sect.tribulation', {
      user,
      coins: 299,
      giftName: 'Đại Lễ Lôi Kiếp',
      wish
    });
  });

  document.getElementById('btnConnectTikTok')?.addEventListener('click', () => {
    const username = document.getElementById('inputTikTokUser')?.value.trim();
    if (!username) return;
    callRpc('live.connect', { username });
  });

  let autoSimState = false;
  document.getElementById('btnToggleAutoSim')?.addEventListener('click', () => {
    autoSimState = !autoSimState;
    callRpc('live.setAutoSim', { enabled: autoSimState });
  });

  document.getElementById('btnToggleTts')?.addEventListener('click', (e) => {
    audio.ttsEnabled = !audio.ttsEnabled;
    const btn = e.currentTarget;
    btn.textContent = `🎙️ Giọng Đọc: ${audio.ttsEnabled ? 'BẬT' : 'TẮT'}`;
    btn.classList.toggle('active-toggle', audio.ttsEnabled);
  });

  document.getElementById('btnToggleMusic')?.addEventListener('click', (e) => {
    audio.bgMusicEnabled = !audio.bgMusicEnabled;
    if (audio.bgMusicEnabled) {
      audio.startZenAmbience();
    } else {
      audio.stopZenAmbience();
    }
    const btn = e.currentTarget;
    btn.textContent = `🎵 Nhạc Nền: ${audio.bgMusicEnabled ? 'BẬT' : 'TẮT'}`;
    btn.classList.toggle('active-toggle', audio.bgMusicEnabled);
  });

  // Khởi tạo và gắn sự kiện thanh trượt chỉnh âm lượng Nhạc nền & Giọng đọc
  const sliderMusicVol = document.getElementById('sliderMusicVol');
  const valMusicVol = document.getElementById('valMusicVol');
  if (sliderMusicVol && valMusicVol) {
    const initMusPct = Math.round(audio.bgBaseVolume * 100);
    sliderMusicVol.value = String(initMusPct);
    valMusicVol.textContent = `${initMusPct}%`;
    sliderMusicVol.addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      valMusicVol.textContent = `${pct}%`;
      audio.ensureContext();
      audio.setMusicVolume(pct / 100);
    });
    sliderMusicVol.addEventListener('change', (e) => {
      const pct = Number(e.target.value);
      callRpc('sect.updateSettings', { musicVolume: +(pct / 100).toFixed(2) });
    });
  }

  const sliderTtsVol = document.getElementById('sliderTtsVol');
  const valTtsVol = document.getElementById('valTtsVol');
  if (sliderTtsVol && valTtsVol) {
    const initTtsPct = Math.round(audio.ttsVolume * 100);
    sliderTtsVol.value = String(initTtsPct);
    valTtsVol.textContent = `${initTtsPct}%`;
    sliderTtsVol.addEventListener('input', (e) => {
      const pct = Number(e.target.value);
      valTtsVol.textContent = `${pct}%`;
      audio.setTtsVolume(pct / 100);
    });
    sliderTtsVol.addEventListener('change', (e) => {
      const pct = Number(e.target.value);
      callRpc('sect.updateSettings', { ttsVolume: +(pct / 100).toFixed(2) });
    });
  }

  function shortenName(name, maxLen = 13) {
    const str = String(name || '');
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
