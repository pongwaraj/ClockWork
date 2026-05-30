let token = null;

const statusDiv = document.getElementById("status");
const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const recordsCard = document.getElementById("recordsCard");
const recordList = document.getElementById("recordList");

function showStatus(msg, type) {
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = msg;
}

function clearStatus() {
  statusDiv.className = "status";
  statusDiv.textContent = "";
}

async function login() {
  const password = document.getElementById("password").value;
  if (!password) {
    showStatus("กรุณากรอกรหัสผ่าน", "error");
    return;
  }

  clearStatus();

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    if (!res.ok) {
      showStatus(data.error || "รหัสผ่านไม่ถูกต้อง", "error");
      return;
    }

    token = data.token;
    loginCard.style.display = "none";
    adminPanel.style.display = "block";
    recordsCard.style.display = "block";
    loadRecords();
  } catch {
    showStatus("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "error");
  }
}

function logout() {
  token = null;
  loginCard.style.display = "block";
  adminPanel.style.display = "none";
  recordsCard.style.display = "none";
  document.getElementById("password").value = "";
}

async function loadRecords() {
  if (!token) return;

  try {
    const res = await fetch("/api/history");
    const data = await res.json();

    if (data.length === 0) {
      recordList.innerHTML = '<p class="muted">ยังไม่มีประวัติ</p>';
      return;
    }

    recordList.innerHTML = data.map((item) => `
      <div class="history-item">
        <div>
          <span class="name">${escapeHtml(item.employee_name)}</span>
          <span class="badge ${item.action === 'in' ? 'badge-in' : 'badge-out'}">
            ${item.action === 'in' ? 'เข้างาน' : 'ออกงาน'}
          </span>
          <div class="time">${formatTime(item.timestamp)}</div>
        </div>
        <button class="btn btn-small btn-danger" onclick="deleteRecord(${item.id})">🗑️</button>
      </div>
    `).join("");
  } catch {
    recordList.innerHTML = '<p class="muted">โหลดไม่สำเร็จ</p>';
  }
}

async function deleteRecord(id) {
  if (!confirm("แน่ใจว่าต้องการลบ record นี้?")) return;

  try {
    const res = await fetch(`/api/admin/record/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || "ลบไม่สำเร็จ", "error");
    } else {
      showStatus("ลบ record เรียบร้อย", "success");
      loadRecords();
    }
  } catch {
    showStatus("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "error");
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
