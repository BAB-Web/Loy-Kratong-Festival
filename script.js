// วาง HTTP URL ที่ได้จาก Power Automate ตรงนี้
const API_URL = 'วาง_HTTP_URL_ของ_POWER_AUTOMATE_ที่นี่';

// รายชื่อไฟล์กระทง PNG ในโฟลเดอร์ assets (เพิ่มหรือแก้ชื่อไฟล์ให้ตรงกับที่มี)
const KRATHONG_ASSETS = [
  { id: 'k1', name: 'กระทงใบตอง', src: 'assets/krathong-1.png' },
  { id: 'k2', name: 'กระทงดอกบัว', src: 'assets/krathong-2.png' },
  { id: 'k3', name: 'กระทงขนมปัง', src: 'assets/krathong-3.png' }
];

let selectedAsset = KRATHONG_ASSETS[0].src;
let krathongs = [];
let sessionAdminPin = null;

const waterZone = document.getElementById('waterZone');
const krathongCount = document.getElementById('krathongCount');
const modalOverlay = document.getElementById('modalOverlay');
const krathongPicker = document.getElementById('krathongPicker');
const adminModalOverlay = document.getElementById('adminModalOverlay');
const adminList = document.getElementById('adminList');

// ฟังก์ชันกลางสำหรับส่งคำสั่งไป Power Automate
async function callApi(payload) {
  return await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

function renderPicker() {
  krathongPicker.innerHTML = '';
  KRATHONG_ASSETS.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = `picker-item ${index === 0 ? 'selected' : ''}`;
    div.innerHTML = `<img src="${item.src}" alt="${item.name}" />`;
    div.onclick = () => {
      document.querySelectorAll('.picker-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectedAsset = item.src;
    };
    krathongPicker.appendChild(div);
  });
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function spawnKrathong(data, startImmediately = false) {
  const item = document.createElement('div');
  item.className = 'krathong-item';
  item.dataset.id = data.id;

  const depthPercent = Math.floor(Math.random() * 65) + 10;
  const scale = (1.05 - (depthPercent / 100) * 0.45).toFixed(2);
  const duration = Math.floor(24 + (depthPercent / 100) * 22);
  const delay = startImmediately ? -2 : -(Math.random() * duration).toFixed(1);

  item.style.bottom = `${depthPercent}%`;
  item.style.zIndex = 100 - depthPercent;
  item.style.animationDuration = `${duration}s`;
  item.style.animationDelay = `${delay}s`;

  item.innerHTML = `
    <div class="krathong-inner" style="transform: scale(${scale});">
      <div class="wish-bubble">
        <strong>${escapeHTML(data.name)}</strong>
        <span>${escapeHTML(data.wish)}</span>
      </div>
      <img src="${data.img}" alt="krathong" />
    </div>
  `;

  waterZone.appendChild(item);
}

// โหลดกระทงทั้งหมดจาก SharePoint
async function loadKrathongs() {
  try {
    const res = await callApi({ action: 'get' });
    if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    krathongs = await res.json();
    waterZone.innerHTML = '';
    krathongCount.textContent = krathongs.length;
    krathongs.forEach(k => spawnKrathong(k, false));
  } catch (err) {
    console.error(err);
  }
}

// เปิด-ปิด Modal สร้างกระทง
document.getElementById('openModalBtn').onclick = () => modalOverlay.classList.remove('hidden');
document.getElementById('closeModalBtn').onclick = () => modalOverlay.classList.add('hidden');

// ส่งกระทงใหม่ไปบันทึกที่ SharePoint
document.getElementById('submitKrathongBtn').onclick = async () => {
  const btn = document.getElementById('submitKrathongBtn');
  const nameInput = document.getElementById('userName');
  const wishInput = document.getElementById('userWish');
  const name = nameInput.value.trim() || 'ผู้ไม่ประสงค์ออกนาม';
  const wish = wishInput.value.trim() || 'ขอให้มีความสุขตลอดปี';

  btn.disabled = true;
  btn.textContent = 'กำลังปล่อยกระทง...';

  try {
    const res = await callApi({
      action: 'create',
      name,
      wish,
      img: selectedAsset
    });
    if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');

    const newKrathong = await res.json();
    krathongs.push(newKrathong);
    spawnKrathong(newKrathong, true);
    krathongCount.textContent = krathongs.length;

    nameInput.value = '';
    wishInput.value = '';
    modalOverlay.classList.add('hidden');
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการส่งกระทง กรุณาลองใหม่');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ปล่อยกระทงลงน้ำ';
  }
};

// ================= ระบบแอดมิน =================
document.getElementById('adminBtn').onclick = async () => {
  const pin = prompt('กรุณากรอกรหัสผ่านแอดมิน:');
  if (pin === null || pin.trim() === '') return;

  try {
    const res = await callApi({ action: 'verify', pin });
    if (res.ok) {
      sessionAdminPin = pin;
      renderAdminList();
      adminModalOverlay.classList.remove('hidden');
    } else {
      alert('รหัสผ่านไม่ถูกต้อง');
    }
  } catch (err) {
    alert('ไม่สามารถเชื่อมต่อระบบตรวจสอบได้');
  }
};

document.getElementById('closeAdminBtn').onclick = () => {
  adminModalOverlay.classList.add('hidden');
};

function renderAdminList() {
  if (krathongs.length === 0) {
    adminList.innerHTML = '<p style="text-align:center; opacity:0.7; padding:20px;">ยังไม่มีกระทงในระบบ</p>';
    return;
  }

  adminList.innerHTML = '';
  [...krathongs].reverse().forEach(k => {
    const row = document.createElement('div');
    row.className = 'admin-item';
    row.innerHTML = `
      <div class="admin-item-info">
        <img src="${k.img}" alt="krathong" />
        <div class="admin-item-text">
          <strong>${escapeHTML(k.name)}</strong>
          <span>${escapeHTML(k.wish)}</span>
        </div>
      </div>
      <button class="btn-delete" onclick="deleteKrathong(${k.id})">ลบ</button>
    `;
    adminList.appendChild(row);
  });
}

async function deleteKrathong(id) {
  if (!confirm('ต้องการลบกระทงใบนี้ใช่หรือไม่?')) return;

  try {
    const res = await callApi({ action: 'delete', id, pin: sessionAdminPin });
    if (!res.ok) {
      alert('ไม่มีสิทธิ์ลบหรือรหัสผ่านไม่ถูกต้อง');
      return;
    }

    krathongs = krathongs.filter(k => k.id !== id);
    const el = waterZone.querySelector(`.krathong-item[data-id="${id}"]`);
    if (el) el.remove();

    krathongCount.textContent = krathongs.length;
    renderAdminList();
  } catch (err) {
    alert('ลบไม่สำเร็จ กรุณาลองใหม่');
  }
}

document.getElementById('clearAllBtn').onclick = async () => {
  if (krathongs.length === 0) return;
  if (!confirm('ยืนยันการลบกระทงทั้งหมดหรือไม่?')) return;

  try {
    const res = await callApi({ action: 'clear', pin: sessionAdminPin });
    if (!res.ok) {
      alert('ไม่มีสิทธิ์ลบหรือยังไม่ได้สร้าง Case clear ใน Power Automate');
      return;
    }
    krathongs = [];
    waterZone.innerHTML = '';
    krathongCount.textContent = 0;
    renderAdminList();
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
  }
};

// ================= ระบบเพลงดนตรีไทย =================
const bgMusic = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicBtn');
if (bgMusic && musicBtn) {
  bgMusic.volume = 0.4;
  let isMusicPlaying = false;
  let userManuallyPaused = false;

  const updateMusicUI = (playing) => {
    isMusicPlaying = playing;
    musicBtn.textContent = playing ? '🔊 ปิดเพลง' : '🔇 เปิดเพลง';
    musicBtn.classList.toggle('playing', playing);
  };

  musicBtn.onclick = (e) => {
    e.stopPropagation();
    if (isMusicPlaying) {
      bgMusic.pause();
      userManuallyPaused = true;
      updateMusicUI(false);
    } else {
      bgMusic.play().then(() => {
        userManuallyPaused = false;
        updateMusicUI(true);
      }).catch(() => alert('ไม่พบไฟล์ assets/music.mp3'));
    }
  };

  document.addEventListener('click', () => {
    if (!isMusicPlaying && !userManuallyPaused) {
      bgMusic.play().then(() => updateMusicUI(true)).catch(() => {});
    }
  }, { once: true });
}

// เช็กกระทงใหม่จากคนอื่นอัตโนมัติทุกๆ 20 วินาที
setInterval(async () => {
  try {
    const res = await callApi({ action: 'get' });
    if (!res.ok) return;
    const latestData = await res.json();

    const currentIds = new Set(krathongs.map(k => k.id));
    const newItems = latestData.filter(k => !currentIds.has(k.id));

    newItems.forEach(k => {
      krathongs.push(k);
      spawnKrathong(k, true);
    });

    if (newItems.length > 0) {
      krathongCount.textContent = krathongs.length;
    }
  } catch (err) {
    // ข้ามไปถ้าเน็ตสะดุด
  }
}, 20000);

// เริ่มทำงาน
renderPicker();
loadKrathongs();
