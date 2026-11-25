// 1. ระบุรายชื่อไฟล์กระทง PNG ที่มีอยู่ในโฟลเดอร์ assets
const KRATHONG_ASSETS = [
  { id: 'k1', name: 'กระทงใบตอง', src: 'assets/krathong-1.png' },
  { id: 'k2', name: 'กระทงดอกบัว', src: 'assets/krathong-2.png' },
  { id: 'k3', name: 'กระทงขนมปัง', src: 'assets/krathong-3.png' }
  // เพิ่มแบบอื่นต่อท้ายตรงนี้ได้เลย
];

const STORAGE_KEY = 'loy_krathong_data_v1';
const ADMIN_PIN = 'fiwloveeveryone'; // เปลี่ยนรหัสผ่านแอดมินตรงนี้

let selectedAsset = KRATHONG_ASSETS[0].src;
let krathongs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const waterZone = document.getElementById('waterZone');
const krathongCount = document.getElementById('krathongCount');
const modalOverlay = document.getElementById('modalOverlay');
const krathongPicker = document.getElementById('krathongPicker');
const adminModalOverlay = document.getElementById('adminModalOverlay');
const adminList = document.getElementById('adminList');

// สร้างตัวเลือกกระทงใน Modal
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

// ป้องกันอักขระ HTML แปลกปลอมในคำอธิษฐาน
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// วางกระทงลงบนผิวน้ำ พร้อมคำนวณมิติใกล้-ไกล (Perspective)
function spawnKrathong(data, startImmediately = false) {
  const item = document.createElement('div');
  item.className = 'krathong-item';
  item.dataset.id = data.id;

  // สุ่มระดับความลึกในน้ำ (10% = ใกล้ขอบล่าง, 75% = ไกลออกไป)
  const depthPercent = Math.floor(Math.random() * 65) + 10;
  // กระทงที่อยู่ไกลให้ขนาดเล็กลงและลอยช้าลง
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

// โหลดกระทงทั้งหมดที่มีอยู่
function init() {
  renderPicker();
  krathongCount.textContent = krathongs.length;
  krathongs.forEach(k => spawnKrathong(k, false));
}

// Event เปิด-ปิด Modal สร้างกระทง
document.getElementById('openModalBtn').onclick = () => modalOverlay.classList.remove('hidden');
document.getElementById('closeModalBtn').onclick = () => modalOverlay.classList.add('hidden');

// บันทึกและปล่อยกระทงใหม่
document.getElementById('submitKrathongBtn').onclick = () => {
  const nameInput = document.getElementById('userName');
  const wishInput = document.getElementById('userWish');
  const name = nameInput.value.trim() || 'ผู้ไม่ประสงค์ออกนาม';
  const wish = wishInput.value.trim() || 'ขอให้มีความสุขตลอดปี';

  const newKrathong = {
    id: Date.now(),
    name,
    wish,
    img: selectedAsset
  };

  krathongs.push(newKrathong);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(krathongs));

  spawnKrathong(newKrathong, true);
  krathongCount.textContent = krathongs.length;

  nameInput.value = '';
  wishInput.value = '';
  modalOverlay.classList.add('hidden');
};

// ================= ระบบแอดมิน =================

// เปิดหน้าต่างแอดมิน (ถามรหัส PIN)
document.getElementById('adminBtn').onclick = () => {
  const pin = prompt('กรุณากรอกรหัส PIN แอดมิน:');
  if (pin === null) return; // กดยกเลิก
  if (pin === ADMIN_PIN) {
    renderAdminList();
    adminModalOverlay.classList.remove('hidden');
  } else {
    alert('รหัส PIN ไม่ถูกต้อง');
  }
};

document.getElementById('closeAdminBtn').onclick = () => {
  adminModalOverlay.classList.add('hidden');
};

// แสดงรายการกระทงในหน้าต่างแอดมิน
function renderAdminList() {
  if (krathongs.length === 0) {
    adminList.innerHTML = '<p style="text-align:center; opacity:0.7; padding:20px;">ยังไม่มีกระทงในระบบ</p>';
    return;
  }

  adminList.innerHTML = '';
  // เรียงจากกระทงล่าสุดขึ้นก่อน
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

// ลบกระทงทีละใบ
function deleteKrathong(id) {
  if (!confirm('ต้องการลบกระทงใบนี้ใช่หรือไม่?')) return;

  // 1. ลบออกจากข้อมูลและ localStorage
  krathongs = krathongs.filter(k => k.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(krathongs));

  // 2. ลบตัวกระทงที่กำลังลอยอยู่บนหน้าจอออกทันที
  const el = waterZone.querySelector(`.krathong-item[data-id="${id}"]`);
  if (el) el.remove();

  // 3. อัปเดตตัวเลขและรายการแอดมิน
  krathongCount.textContent = krathongs.length;
  renderAdminList();
}

// ลบกระทงทั้งหมด
document.getElementById('clearAllBtn').onclick = () => {
  if (krathongs.length === 0) return;
  if (!confirm('ยืนยันการลบกระทงทั้งหมดหรือไม่?')) return;

  krathongs = [];
  localStorage.removeItem(STORAGE_KEY);
  waterZone.innerHTML = '';
  krathongCount.textContent = 0;
  renderAdminList();
};

// เริ่มทำงาน
init();