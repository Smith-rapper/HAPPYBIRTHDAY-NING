/* OUR LITTLE UNIVERSE — interactive birthday experience */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'ourLittleUniverseSettingsV1';
  const REASONS_KEY = 'ourLittleUniverseReasonsV1';
  const DEFAULTS = {
    partnerName: 'My Love', nickname: 'คนเก่งของเค้า', senderName: 'คนโปรดของเธอ ♡', birthday: '', relationshipDate: '',
    greeting: 'วันนี้โลกทั้งใบดูสดใสขึ้น เพราะเป็นวันที่คนที่เค้ารักได้เกิดมา',
    story: 'ตั้งแต่วันที่ได้รู้จักกัน โลกธรรมดา ๆ ของเค้าก็มีสีสันขึ้นมา เธอทำให้วันธรรมดากลายเป็นวันที่อยากจดจำ และทำให้คำว่า “ความสุข” มีหน้าตาชัดเจนขึ้นมา',
    letter1: 'สุขสันต์วันเกิดนะคนที่เค้ารักมากที่สุด ♡',
    letter2: 'ขอบคุณที่เกิดมา ขอบคุณที่เป็นเธอ และขอบคุณที่ให้เค้าได้เข้ามาเป็นส่วนหนึ่งในชีวิตของเธอ เค้าไม่รู้ว่าปีต่อ ๆ ไปจะมีอะไรเกิดขึ้นบ้าง แต่เค้าอยากเรียนรู้ เติบโต และสร้างความทรงจำดี ๆ ไปพร้อมกับเธอ',
    letter3: 'ในวันที่เธอเหนื่อย ขอให้รู้ว่ายังมีคนคนหนึ่งที่พร้อมฟัง ในวันที่เธอภูมิใจ เค้าก็อยากเป็นคนแรก ๆ ที่ได้ยินข่าวดี และในวันที่เธอไม่มั่นใจ อย่าลืมว่าเธอมีคุณค่ามากแค่ไหน',
    letter4: 'ขอให้ปีใหม่นี้ของชีวิตเต็มไปด้วยความสุข ความสบายใจ และความรักที่ไม่ทำให้เธอต้องตั้งคำถามกับคุณค่าของตัวเองเลยนะ เค้าจะพยายามดูแลความรักของเราให้ดีขึ้นในทุกวัน',
    finalMessage: 'ขอให้ทุก ๆ วันต่อจากนี้มีเหตุผลให้เธอยิ้มได้เยอะ ๆ และขอให้เธอถูกรักอย่างอ่อนโยนเสมอ',
    secretCode: 'love', secretGift: 'ของขวัญที่ดีที่สุดสำหรับเค้า ไม่ใช่สิ่งของอะไรเลย แต่คือการได้เห็นเธอมีความสุข ได้เห็นเธอเติบโตในแบบที่ต้องการ และได้อยู่ข้าง ๆ เธอในวันที่ดีและวันที่ยาก เค้ารักเธอนะ ♡'
  };
  let settings = loadSettings();
  let toastTimer = null;
  let dbPromise = null;
  let audioContext = null;
  let masterGain = null;
  let musicOscillators = [];
  let uploadedAudioUrl = null;
  let uploadedAudio = null;
  let musicOn = false;
  let countdownTimer = null;
  const particles = [];
  let canvas, ctx, fxFrame = null;

  function loadSettings() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }
  function persistSettings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function showToast(message) {
    const el = $('#toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function openModal(content) {
    $('#modalContent').innerHTML = content;
    $('#modalBackdrop').classList.add('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open'); $('#modalClose').focus();
  }
  function closeModal() {
    $('#modalBackdrop').classList.remove('open'); $('#modalBackdrop').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
  function applySettings() {
    $('#heroName').textContent = settings.partnerName || DEFAULTS.partnerName;
    $('#finalName').textContent = settings.nickname || settings.partnerName || DEFAULTS.nickname;
    $('#heroGreeting').textContent = settings.greeting;
    $('#storyText').textContent = settings.story;
    $('#letterDear').textContent = `ถึง${settings.nickname || 'คนเก่งของเค้า'},`;
    $('#letterP1').textContent = settings.letter1;
    $('#letterP2').textContent = settings.letter2;
    $('#letterP3').textContent = settings.letter3;
    $('#letterP4').textContent = settings.letter4;
    $('#signature').textContent = settings.senderName;
    $('#finalMessage').textContent = settings.finalMessage;
    $('#heroDate').textContent = settings.birthday ? formatBirthdayDate(settings.birthday).toUpperCase() : 'A DAY JUST FOR YOU';
    $('#finale .kicker').textContent = 'THE UNIVERSE IS LUCKY TO HAVE YOU';
    updateCountdown();
    updateTogetherDays();
  }
  function formatBirthdayDate(iso) {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'A DAY JUST FOR YOU';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function getNextBirthday() {
    if (!settings.birthday) return null;
    const born = new Date(`${settings.birthday}T00:00:00`);
    if (Number.isNaN(born.getTime())) return null;
    const now = new Date();
    let next = new Date(now.getFullYear(), born.getMonth(), born.getDate(), 0, 0, 0);
    // Handle February 29 in non-leap years gracefully.
    if (next.getMonth() !== born.getMonth()) next = new Date(now.getFullYear(), born.getMonth() + 1, 0, 0, 0, 0);
    if (next <= now) {
      next = new Date(now.getFullYear() + 1, born.getMonth(), born.getDate(), 0, 0, 0);
      if (next.getMonth() !== born.getMonth()) next = new Date(now.getFullYear() + 1, born.getMonth() + 1, 0, 0, 0, 0);
    }
    return next;
  }
  function updateCountdown() {
    const target = getNextBirthday();
    if (!target) {
      ['days', 'hours', 'minutes', 'seconds'].forEach(id => { $(`#${id}`).textContent = '00'; });
      $('#countdownTitle').textContent = 'ตั้งวันเกิดในเมนูตั้งค่า';
      $('#countdownDescription').textContent = 'ใส่วันเกิดของคนพิเศษ เพื่อเริ่มนับถอยหลังสู่วันสำคัญ';
      return;
    }
    const left = Math.max(0, target.getTime() - Date.now());
    const days = Math.floor(left / 86400000), hours = Math.floor(left % 86400000 / 3600000), minutes = Math.floor(left % 3600000 / 60000), seconds = Math.floor(left % 60000 / 1000);
    $('#days').textContent = String(days).padStart(2, '0');
    $('#hours').textContent = String(hours).padStart(2, '0');
    $('#minutes').textContent = String(minutes).padStart(2, '0');
    $('#seconds').textContent = String(seconds).padStart(2, '0');
    $('#countdownTitle').textContent = days === 0 ? 'ใกล้ถึงวันของเธอแล้วนะ!' : `อีก ${days} วันก็ถึงวันของเธอ`;
    $('#countdownDescription').textContent = 'กำลังนับถอยหลังสู่วันเกิดครั้งถัดไปของคนที่เค้ารัก';
  }
  function updateTogetherDays() {
    if (!settings.relationshipDate) { $('#togetherDays').textContent = '∞'; return; }
    const start = new Date(`${settings.relationshipDate}T00:00:00`);
    if (Number.isNaN(start.getTime())) { $('#togetherDays').textContent = '∞'; return; }
    const days = Math.max(0, Math.floor((new Date() - start) / 86400000));
    $('#togetherDays').textContent = days.toLocaleString('en-US');
  }

  function settingsForm() {
    openModal(`<h2 id="modalTitle">ปรับแต่งจักรวาลของเรา ✦</h2><p class="modal-lead">ใส่ชื่อ วันสำคัญ และข้อความของคุณ เว็บจะเปลี่ยนให้ทันทีหลังบันทึก ข้อมูลข้อความเก็บไว้ในเบราว์เซอร์นี้</p>
      <form id="settingsForm" class="modal-form">
      <div class="form-field"><label for="sPartner">ชื่อแฟน / ชื่อที่อยากให้แสดง</label><input id="sPartner" name="partnerName" maxlength="60" value="${escapeHTML(settings.partnerName)}" required></div>
      <div class="form-field"><label for="sNick">ชื่อเรียกน่ารัก ๆ</label><input id="sNick" name="nickname" maxlength="60" value="${escapeHTML(settings.nickname)}"></div>
      <div class="form-field"><label for="sSender">ลงชื่อจากใคร</label><input id="sSender" name="senderName" maxlength="70" value="${escapeHTML(settings.senderName)}"></div>
      <div class="form-field"><label for="sBirthday">วันเกิดแฟน (ช่วยนับถอยหลัง)</label><input id="sBirthday" name="birthday" type="date" value="${escapeHTML(settings.birthday)}"></div>
      <div class="form-field"><label for="sTogether">วันเริ่มคบกัน (ไม่บังคับ)</label><input id="sTogether" name="relationshipDate" type="date" value="${escapeHTML(settings.relationshipDate)}"></div>
      <div class="form-field"><label for="sCode">รหัสเปิดกล่องลับ</label><input id="sCode" name="secretCode" maxlength="40" value="${escapeHTML(settings.secretCode)}"></div>
      <div class="form-field full"><label for="sGreeting">ข้อความหน้าแรก</label><textarea id="sGreeting" name="greeting" maxlength="350">${escapeHTML(settings.greeting)}</textarea></div>
      <div class="form-field full"><label for="sStory">เรื่องราวของเรา</label><textarea id="sStory" name="story" maxlength="800">${escapeHTML(settings.story)}</textarea></div>
      <div class="form-field full"><label for="sLetter1">จดหมาย — ย่อหน้าแรก</label><textarea name="letter1" maxlength="500">${escapeHTML(settings.letter1)}</textarea></div>
      <div class="form-field full"><label for="sLetter2">จดหมาย — ย่อหน้าที่สอง</label><textarea name="letter2" maxlength="800">${escapeHTML(settings.letter2)}</textarea></div>
      <div class="form-field full"><label for="sLetter3">จดหมาย — ย่อหน้าที่สาม</label><textarea name="letter3" maxlength="800">${escapeHTML(settings.letter3)}</textarea></div>
      <div class="form-field full"><label for="sLetter4">จดหมาย — ย่อหน้าที่สี่</label><textarea name="letter4" maxlength="800">${escapeHTML(settings.letter4)}</textarea></div>
      <div class="form-field full"><label for="sFinal">ข้อความปิดท้ายเว็บ</label><textarea name="finalMessage" maxlength="500">${escapeHTML(settings.finalMessage)}</textarea></div>
      <div class="form-field full"><label for="sSecret">ข้อความพิเศษในกล่องลับ</label><textarea name="secretGift" maxlength="1200">${escapeHTML(settings.secretGift)}</textarea></div>
      <div class="form-field full"><label for="featuredPhotoInput">รูปคู่ / รูปแฟน สำหรับหน้าแรก (เลือกไฟล์รูป)</label><input id="featuredPhotoInput" type="file" accept="image/*"><small style="color:#9f8daa;font-size:10px;line-height:1.7">รูปจะถูกเก็บในเบราว์เซอร์นี้เท่านั้น ถ้าเปิดเว็บในเครื่องอื่นต้องเพิ่มรูปใหม่</small></div>
      <div class="form-field full"><label for="audioInput">เพลงประกอบของเรา (เลือกไฟล์เสียง MP3 / WAV)</label><input id="audioInput" type="file" accept="audio/*"><small style="color:#9f8daa;font-size:10px;line-height:1.7">เพลงเล่นจากไฟล์ที่คุณเลือก ไม่ได้ฝังเพลงที่มีลิขสิทธิ์ไว้ใน ZIP</small></div>
      <div class="form-actions full"><button class="btn btn-primary" type="submit">บันทึกทุกอย่าง ♡</button><button class="btn btn-ghost" type="button" id="resetSettings">คืนค่าเริ่มต้น</button></div>
      </form>`);
    $('#settingsForm').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      for (const key of Object.keys(DEFAULTS)) { const field = event.currentTarget.elements.namedItem(key); if (field && field.value !== undefined) settings[key] = field.value.trim(); }
      settings.partnerName = settings.partnerName || DEFAULTS.partnerName;
      try { persistSettings(); } catch { showToast('พื้นที่เก็บข้อความอาจเต็ม กรุณาลดความยาวข้อความแล้วลองใหม่'); }
      const photo = $('#featuredPhotoInput').files[0];
      const audio = $('#audioInput').files[0];
      if (photo) await saveFeaturedPhoto(photo);
      if (audio) setUploadedAudio(audio);
      applySettings(); closeModal(); showToast('บันทึกข้อความของคุณแล้ว ♡');
    });
    $('#resetSettings').addEventListener('click', () => {
      if (!confirm('ต้องการคืนค่าข้อความเริ่มต้นทั้งหมดหรือไม่?')) return;
      settings = { ...DEFAULTS }; persistSettings(); applySettings(); closeModal(); showToast('คืนค่าเริ่มต้นแล้ว');
    });
  }

  function openReason(title, message) {
    openModal(`<div class="modal-message"><div class="big-emoji">♡</div><p class="kicker">ONE OF A MILLION REASONS</p><h2 id="modalTitle">${escapeHTML(title)}</h2><blockquote>${escapeHTML(message)}</blockquote><p>และนี่ก็เป็นเพียงเหตุผลหนึ่งเท่านั้นนะ เค้ายังมีอีกเป็นล้านเหตุผลที่อยากบอกเธอ</p><button class="btn btn-primary" id="reasonClose">รับหัวใจดวงนี้ไว้ ♡</button></div>`);
    $('#reasonClose').addEventListener('click', () => { closeModal(); burstHearts(30); });
  }
  function getCustomReasons() {
    try { const value = JSON.parse(localStorage.getItem(REASONS_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function saveCustomReasons(list) { localStorage.setItem(REASONS_KEY, JSON.stringify(list)); }
  function renderCustomReasons() {
    const grid = $('#reasonGrid');
    $$('.reason-card.custom-reason', grid).forEach(el => el.remove());
    getCustomReasons().forEach((reason, index) => {
      const button = document.createElement('button'); button.className = 'reason-card custom-reason';
      const number = String(index + 7).padStart(2, '0');
      button.innerHTML = `<span class="reason-number">${number}</span><span class="reason-icon">♡</span><strong></strong><span class="reason-hint">แตะเพื่อเปิดเหตุผล ↗</span>`;
      $('strong', button).textContent = reason.title; button.dataset.title = reason.title; button.dataset.message = reason.message;
      button.addEventListener('click', () => openReason(reason.title, reason.message)); grid.appendChild(button);
    });
  }
  function addReasonForm() {
    openModal(`<h2 id="modalTitle">เพิ่มเหตุผลที่รักเธอ ♡</h2><p class="modal-lead">เขียนเหตุผลของคุณเอง เพิ่มไว้ในเว็บได้เลย</p><form id="reasonForm" class="modal-form"><div class="form-field full"><label for="reasonTitle">หัวข้อสั้น ๆ</label><input id="reasonTitle" maxlength="70" required placeholder="เช่น เธอทำให้เค้ายิ้มได้ทุกวัน"></div><div class="form-field full"><label for="reasonMessage">ข้อความจากหัวใจ</label><textarea id="reasonMessage" maxlength="600" required placeholder="เขียนสิ่งที่อยากบอกกับเธอ..."></textarea></div><div class="form-actions full"><button class="btn btn-primary" type="submit">บันทึกเหตุผล ♡</button></div></form>`);
    $('#reasonForm').addEventListener('submit', event => {
      event.preventDefault(); const title = $('#reasonTitle').value.trim(), message = $('#reasonMessage').value.trim(); if (!title || !message) return;
      const list = getCustomReasons(); list.push({ title, message }); saveCustomReasons(list); renderCustomReasons(); closeModal(); showToast('เพิ่มเหตุผลของคุณแล้ว ♡');
    });
  }

  // IndexedDB stores photos as compressed image blobs, so many memories can be added without bloating localStorage.
  function openPhotoDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB is not supported')); return; }
      const request = indexedDB.open('OurLittleUniversePhotoDB', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('photos')) { const store = db.createObjectStore('photos', { keyPath: 'id' }); store.createIndex('created', 'created'); }
      };
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }
  async function compressImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('ไฟล์นี้ไม่ใช่รูปภาพ');
    if (file.size > 25 * 1024 * 1024) throw new Error('รูปใหญ่เกินไป (สูงสุด 25 MB ต่อรูป)');
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = imageUrl; });
      const maxSide = 1600, scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const c = canvas.getContext('2d'); c.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
      return blob || file;
    } finally { URL.revokeObjectURL(imageUrl); }
  }
  async function saveFeaturedPhoto(file) {
    try {
      const blob = await compressImage(file), db = await openPhotoDB();
      await new Promise((resolve, reject) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put({ id: 'featured', blob, name: file.name, caption: 'รูปโปรดของเรา', created: Date.now() }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      await loadFeaturedPhoto(); showToast('ตั้งรูปหน้าปกแล้ว ♡');
    } catch (error) { showToast(error.message || 'บันทึกรูปไม่สำเร็จ'); }
  }
  async function loadFeaturedPhoto() {
    try {
      const db = await openPhotoDB(); const record = await new Promise((resolve, reject) => { const tx = db.transaction('photos', 'readonly'); const request = tx.objectStore('photos').get('featured'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      if (record && record.blob) { const url = URL.createObjectURL(record.blob); $('#heroPhoto').src = url; $('#storyPhoto').src = url; }
    } catch { /* If storage is unavailable, the included local SVG placeholders still work. */ }
  }
  async function addGalleryPhotos(files) {
    const list = [...files].filter(file => file.type.startsWith('image/'));
    if (!list.length) return;
    const db = await openPhotoDB(); let added = 0;
    for (const file of list) {
      try {
        const blob = await compressImage(file), record = { id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, blob, name: file.name, caption: file.name.replace(/\.[^.]+$/, ''), created: Date.now() };
        await new Promise((resolve, reject) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(record); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); added++;
      } catch (error) { showToast(`${file.name}: ${error.message || 'บันทึกไม่สำเร็จ'}`); }
    }
    await renderGalleryPhotos(); if (added) showToast(`เพิ่มรูปความทรงจำ ${added} รูปแล้ว ♡`);
  }
  async function getGalleryRecords() {
    try {
      const db = await openPhotoDB(); return await new Promise((resolve, reject) => { const tx = db.transaction('photos', 'readonly'); const req = tx.objectStore('photos').getAll(); req.onsuccess = () => resolve(req.result.filter(item => item.id !== 'featured').sort((a,b) => a.created - b.created)); req.onerror = () => reject(req.error); });
    } catch { return []; }
  }
  async function renderGalleryPhotos() {
    const gallery = $('#gallery'); $$('.memory-card.user-memory', gallery).forEach(card => card.remove());
    const records = await getGalleryRecords();
    for (const record of records) {
      const url = URL.createObjectURL(record.blob); const card = document.createElement('button'); card.className = 'memory-card user-memory'; card.dataset.caption = record.caption;
      const img = document.createElement('img'); img.src = url; img.alt = record.caption || 'รูปความทรงจำของเรา';
      const overlay = document.createElement('span'); overlay.className = 'memory-overlay';
      const small = document.createElement('small'); small.textContent = 'YOUR MEMORY';
      const strong = document.createElement('strong'); strong.textContent = record.caption || 'ความทรงจำของเรา';
      const hint = document.createElement('span'); hint.textContent = '♡ เปิดดู / ลบรูป'; overlay.append(small, strong, hint); card.append(img, overlay);
      card.addEventListener('click', () => showMemory(url, record.caption, record.id)); gallery.appendChild(card);
    }
  }
  function showMemory(src, caption, id = null) {
    openModal(`<div class="modal-message"><p class="kicker">A MEMORY TO KEEP</p><h2 id="modalTitle">${escapeHTML(caption || 'ความทรงจำของเรา')}</h2><img class="modal-memory-image" src="${src}" alt="${escapeHTML(caption || 'ความทรงจำ')}"><p>โมเมนต์เล็ก ๆ ที่มีความหมายในใจเสมอ ♡</p>${id ? '<button class="image-remove" id="removeMemory">ลบรูปนี้ออกจากเว็บ</button>' : ''}</div>`);
    if (id) $('#removeMemory').addEventListener('click', async () => {
      if (!confirm('ลบรูปนี้ออกจากเว็บใช่ไหม?')) return;
      try { const db = await openPhotoDB(); await new Promise((resolve, reject) => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); closeModal(); await renderGalleryPhotos(); showToast('ลบรูปแล้ว'); }
      catch { showToast('ลบรูปไม่สำเร็จ'); }
    });
  }

  function giftModal(type) {
    if (type === 'letter') {
      openModal(`<div class="modal-message"><div class="big-emoji">💌</div><p class="kicker">SEALED WITH A KISS</p><h2 id="modalTitle">จดหมายฉบับพิเศษ</h2><blockquote>“${escapeHTML(settings.letter1)}”</blockquote><p>นี่เป็นจดหมายที่เปิดอ่านซ้ำได้ทุกครั้งที่คิดถึงกันนะ กลับไปอ่านฉบับเต็มได้ในหัวข้อจดหมายจากหัวใจ ♡</p><button class="btn btn-primary" id="goToLetter">ไปอ่านจดหมายฉบับเต็ม</button></div>`);
      $('#goToLetter').addEventListener('click', () => { closeModal(); $('#letter').scrollIntoView({ behavior: 'smooth' }); });
    } else if (type === 'date') {
      const coupons = [
        ['คูปองกอดฟรีไม่จำกัด','ใช้ได้ทุกวัน ไม่ต้องมีเหตุผลในการขอกอด'],
        ['คูปองเดตตามใจเธอ','เธอเลือกสถานที่และกิจกรรม เค้าพร้อมไปด้วย'],
        ['คูปองขนมที่เธอชอบ','หนึ่งวันสำหรับตามใจคนเก่งเป็นพิเศษ'],
        ['คูปองวันพักใจ','วันไหนเหนื่อย เราจะพักด้วยกัน ไม่ต้องรีบเก่งก็ได้']
      ]; const item = coupons[Math.floor(Math.random() * coupons.length)];
      openModal(`<div class="modal-message"><div class="big-emoji">🎟️</div><p class="kicker">YOUR SPECIAL COUPON</p><h2 id="modalTitle">${escapeHTML(item[0])}</h2><blockquote>${escapeHTML(item[1])}</blockquote><p>คูปองนี้ไม่มีวันหมดอายุ และใช้ได้กับคนทำเว็บคนนี้คนเดียวเท่านั้นนะ ♡</p><button class="btn btn-primary" id="newCoupon">สุ่มคูปองอีกใบ ↻</button></div>`);
      $('#newCoupon').addEventListener('click', () => giftModal('date'));
    } else if (type === 'wish') {
      openModal(`<div class="modal-message"><div class="big-emoji">🌙</div><p class="kicker">A WISH FROM ME TO YOU</p><h2 id="modalTitle">คำอธิษฐานถึงเธอ</h2><blockquote>ขอให้โลกอ่อนโยนกับเธอ ขอให้เธอภูมิใจในตัวเอง และขอให้มีความสุขในแบบที่เป็นเธอจริง ๆ</blockquote><p>ไม่ว่าความฝันของเธอจะใหญ่แค่ไหน เค้าจะคอยเชียร์เธออยู่ตรงนี้เสมอ</p><button class="btn btn-primary" id="wishBurst">ส่งดาวให้เธอ ✦</button></div>`);
      $('#wishBurst').addEventListener('click', () => { closeModal(); fireworks(90); burstHearts(45); showToast('คำอธิษฐานถูกส่งไปบนฟ้าแล้ว ✨'); });
    } else if (type === 'secret') {
      openModal(`<div class="modal-message"><div class="big-emoji">🔐</div><p class="kicker">A LITTLE SECRET JUST FOR YOU</p><h2 id="modalTitle">กล่องนี้มีรหัสนะ</h2><p>คำใบ้: คำภาษาอังกฤษสั้น ๆ ที่บอกความรู้สึกของเรา ♡</p><form id="secretForm" class="modal-form" style="margin-top:20px"><div class="form-field full"><label for="secretInput">รหัสลับ</label><input id="secretInput" autocomplete="off" placeholder="ใส่รหัสที่นี่" required></div><div class="form-actions full" style="justify-content:center"><button class="btn btn-primary" type="submit">เปิดกล่องลับ ♡</button></div></form></div>`);
      $('#secretForm').addEventListener('submit', event => {
        event.preventDefault(); const value = $('#secretInput').value.trim().toLowerCase();
        if (value === String(settings.secretCode || 'love').trim().toLowerCase()) {
          openModal(`<div class="modal-message"><div class="big-emoji">🎁</div><p class="kicker">YOU UNLOCKED MY HEART</p><h2 id="modalTitle">ความลับของเค้า</h2><blockquote>${escapeHTML(settings.secretGift)}</blockquote><p>กล่องนี้เปิดได้เพราะคนที่เปิดเป็นคนพิเศษที่สุด ♡</p><button class="btn btn-primary" id="secretFireworks">ฉลองกันเลย ✨</button></div>`);
          $('#secretFireworks').addEventListener('click', () => { closeModal(); fireworks(120); });
        } else { showToast('รหัสยังไม่ถูกนะ ลองอีกครั้งได้เลย ♡'); $('#secretInput').value = ''; $('#secretInput').focus(); }
      });
    }
  }

  function downloadLetter() {
    const content = [$('#letterDear').textContent, '', $('#letterP1').textContent, '', $('#letterP2').textContent, '', $('#letterP3').textContent, '', $('#letterP4').textContent, '', 'รักเธอมาก ๆ เสมอและตลอดไป,', settings.senderName].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'birthday-love-letter.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showToast('ดาวน์โหลดจดหมายแล้ว ♡');
  }
  function makeWish() { closeMobileMenu(); fireworks(100); burstHearts(38); showToast('ส่งคำอธิษฐานขึ้นไปบนฟ้าแล้ว ขอให้เป็นจริงนะ ✨'); }
  function blowCandles() {
    const candles = $('.candles'); const button = $('#blowCandles'); const isOut = candles.classList.toggle('out');
    button.innerHTML = isOut ? 'จุดเทียนใหม่อีกครั้ง <span>✧</span>' : 'เป่าเทียนเลย! <span>✧</span>';
    if (isOut) { $('#cakeFeedback').textContent = 'เย้! ขอให้คำอธิษฐานของเธอเป็นจริงทุกข้อเลยนะ ♡'; fireworks(95); burstHearts(30); }
    else { $('#cakeFeedback').textContent = 'เทียนกลับมาติดแล้ว หลับตาขอพรใหม่ได้เลย ♡'; }
  }
  function closeMobileMenu() { $('#mobileNav').classList.remove('open'); }

  function setupAudio() {
    const audio = document.createElement('audio'); audio.loop = true; audio.id = 'customAudio'; audio.preload = 'none'; document.body.appendChild(audio); uploadedAudio = audio;
  }
  function setUploadedAudio(file) {
    if (!file.type.startsWith('audio/')) { showToast('กรุณาเลือกไฟล์เสียง'); return; }
    if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl);
    uploadedAudioUrl = URL.createObjectURL(file); uploadedAudio.src = uploadedAudioUrl; uploadedAudio.load();
    showToast('เพิ่มเพลงประกอบแล้ว กดปุ่ม ♫ เพื่อเล่น');
  }
  async function toggleMusic() {
    if (uploadedAudio && uploadedAudio.src) {
      if (musicOn) { uploadedAudio.pause(); musicOn = false; $('#musicToggle').classList.remove('music-active'); showToast('ปิดเพลงแล้ว'); }
      else { try { await uploadedAudio.play(); musicOn = true; $('#musicToggle').classList.add('music-active'); showToast('กำลังเล่นเพลงของเรา ♫'); } catch { showToast('แตะอีกครั้งเพื่ออนุญาตให้เล่นเพลง'); } }
      return;
    }
    if (!musicOn) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { showToast('เบราว์เซอร์นี้ไม่รองรับเสียงสร้างเอง'); return; }
        if (!audioContext) {
          audioContext = new AC(); masterGain = audioContext.createGain(); masterGain.gain.value = 0.035; masterGain.connect(audioContext.destination);
          // A gentle, original ambient chord — not a recording of a copyrighted song.
          const notes = [261.63, 329.63, 392.00, 493.88];
          notes.forEach((freq, i) => { const osc = audioContext.createOscillator(), gain = audioContext.createGain(); osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = i === 0 ? .8 : .28; osc.connect(gain); gain.connect(masterGain); osc.start(); musicOscillators.push(osc); });
        }
        await audioContext.resume(); masterGain.gain.setTargetAtTime(.035, audioContext.currentTime, .35); musicOn = true; $('#musicToggle').classList.add('music-active'); showToast('เปิดเสียงบรรยากาศนุ่ม ๆ แล้ว ♫');
      } catch { showToast('เปิดเสียงไม่ได้ในเบราว์เซอร์นี้'); }
    } else {
      musicOn = false; $('#musicToggle').classList.remove('music-active');
      if (audioContext && masterGain) masterGain.gain.setTargetAtTime(0, audioContext.currentTime, .15); showToast('ปิดเสียงแล้ว');
    }
  }

  function initCanvas() {
    canvas = $('#fxCanvas'); ctx = canvas.getContext('2d'); resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  }
  function resizeCanvas() { if (!canvas || !ctx) return; const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; canvas.style.width = `${window.innerWidth}px`; canvas.style.height = `${window.innerHeight}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function fireworks(amount = 80) {
    if (!ctx) return;
    const w = window.innerWidth, h = window.innerHeight; const bursts = Math.max(1, Math.ceil(amount / 28));
    for (let b = 0; b < bursts; b++) {
      const x = w * (.17 + Math.random() * .66), y = h * (.12 + Math.random() * .47); const count = Math.min(48, Math.ceil(amount / bursts));
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count, speed = 1.5 + Math.random() * 4.6;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 45 + Math.random() * 28, max: 73, size: 1.4 + Math.random() * 2.4, color: ['#f6a9d0','#f3d69f','#d4b5ff','#fff3f9','#e58ab9'][Math.floor(Math.random()*5)], gravity: .045, kind: 'spark' });
      }
    }
    startFxLoop();
  }
  function burstHearts(amount = 25) {
    if (!ctx) return;
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < amount; i++) particles.push({ x: w * (.18 + Math.random() * .64), y: h * (.4 + Math.random() * .45), vx: (Math.random() - .5) * 2.5, vy: -1.4 - Math.random() * 3.2, life: 80 + Math.random() * 50, max: 130, size: 8 + Math.random() * 10, color: ['#f6a9d0','#ffdeec','#d7b8ff'][Math.floor(Math.random()*3)], gravity: -.005, kind: 'heart' });
    startFxLoop();
  }
  function startFxLoop() { if (fxFrame === null) fxFrame = requestAnimationFrame(drawFx); }
  function drawHeart(x, y, size, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 18, size / 18); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-18, -5, -9, -16, 0, -7); ctx.bezierCurveTo(9, -16, 18, -5, 0, 6); ctx.fill(); ctx.restore();
  }
  function drawFx() {
    if (!ctx) { fxFrame = null; return; }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= .985; p.vy = p.vy * .99 + p.gravity; p.life--;
      const alpha = Math.max(0, Math.min(1, p.life / p.max));
      if (p.kind === 'heart') { ctx.globalAlpha = alpha; drawHeart(p.x, p.y, p.size, p.color); ctx.globalAlpha = 1; }
      else { ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      if (p.life <= 0 || p.y > window.innerHeight + 60) particles.splice(i, 1);
    }
    if (particles.length) fxFrame = requestAnimationFrame(drawFx); else { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); fxFrame = null; }
  }
  function launchPetals(count = 25) {
    const layer = $('#petalLayer');
    for (let i = 0; i < count; i++) {
      const el = document.createElement('i'); el.className = 'petal'; el.style.left = `${Math.random() * 100}%`; el.style.animationDuration = `${7 + Math.random() * 8}s`; el.style.animationDelay = `${Math.random() * 4}s`; el.style.setProperty('--drift', `${Math.round((Math.random() - .5) * 260)}px`); el.style.width = `${8 + Math.random() * 9}px`; el.style.height = `${12 + Math.random() * 11}px`; layer.appendChild(el);
      setTimeout(() => el.remove(), 17000);
    }
  }
  function revealObserver() {
    const targets = $$('.reveal');
    if (!('IntersectionObserver' in window)) { targets.forEach(el => el.classList.add('visible')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .13 });
    targets.forEach(el => observer.observe(el));
  }
  function enterExperience() {
    $('#introOverlay').classList.add('dismissed'); fireworks(65); burstHearts(25); launchPetals(18);
    setTimeout(() => $('#introOverlay').setAttribute('aria-hidden', 'true'), 850);
  }
  function replayIntro() {
    $('#introOverlay').classList.remove('dismissed'); $('#introOverlay').setAttribute('aria-hidden', 'false');
  }
  function addEventListeners() {
    $('#openSettings').addEventListener('click', settingsForm);
    $('#musicToggle').addEventListener('click', toggleMusic);
    $('#menuToggle').addEventListener('click', () => $('#mobileNav').classList.toggle('open'));
    $$('#mobileNav a').forEach(link => link.addEventListener('click', closeMobileMenu));
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalBackdrop').addEventListener('click', event => { if (event.target === $('#modalBackdrop')) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeModal(); closeMobileMenu(); } });
    $('#enterSite').addEventListener('click', enterExperience); $('#replayIntro').addEventListener('click', replayIntro);
    $$('.reason-card').forEach(card => card.addEventListener('click', () => openReason(card.dataset.title, card.dataset.message)));
    $('#addReason').addEventListener('click', addReasonForm);
    $$('.gift-card').forEach(card => card.addEventListener('click', () => giftModal(card.dataset.gift)));
    $$('.memory-card').forEach(card => { if (!card.classList.contains('user-memory')) card.addEventListener('click', () => showMemory($('img', card).src, card.dataset.caption)); });
    $('#photoUpload').addEventListener('change', event => { addGalleryPhotos(event.target.files); event.target.value = ''; });
    $('#makeWish').addEventListener('click', makeWish); $('#blowCandles').addEventListener('click', blowCandles);
    $('#downloadLetter').addEventListener('click', downloadLetter); $('#editLetter').addEventListener('click', settingsForm);
    $('#storyMore').addEventListener('click', () => { const extra = $('#storyExtra'); const isHidden = extra.classList.toggle('hidden'); $('#storyMore').innerHTML = isHidden ? 'อ่านความในใจอีกนิด <span>↗</span>' : 'ซ่อนข้อความ <span>↑</span>'; });
    $('#bigHeart').addEventListener('click', () => { burstHearts(70); fireworks(40); showToast('ส่งหัวใจดวงโตที่สุดให้เธอแล้ว ♥'); });
    $('#finalFireworks').addEventListener('click', () => { fireworks(160); burstHearts(35); launchPetals(25); });
    $$('.desktop-nav a').forEach(link => link.addEventListener('click', closeMobileMenu));
  }

  async function init() {
    setupAudio(); initCanvas(); applySettings(); renderCustomReasons(); revealObserver(); addEventListeners();
    countdownTimer = setInterval(() => { updateCountdown(); updateTogetherDays(); }, 1000);
    await loadFeaturedPhoto(); await renderGalleryPhotos();
    // Intro screen is intentional: it makes the first visit feel like opening a gift.
  }
  document.addEventListener('DOMContentLoaded', init);
})();
