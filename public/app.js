const employeeSelect = document.getElementById("employee");
const statusDiv = document.getElementById("status");
const gpsStatus = document.getElementById("gpsStatus");
const gpsCoords = document.getElementById("gpsCoords");
const gpsDist = document.getElementById("gpsDist");
const historyList = document.getElementById("historyList");

let currentPos = null;
let officeLocation = null;

async function fetchEmployees() {
  const res = await fetch("/api/employees");
  const names = await res.json();
  employeeSelect.innerHTML = '<option value="">-- เลือกพนักงาน --</option>';
  names.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    employeeSelect.appendChild(opt);
  });
}

async function fetchOfficeLocation() {
  const res = await fetch("/api/location");
  officeLocation = await res.json();
}

function showStatus(msg, type) {
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = msg;
}

function clearStatus() {
  statusDiv.className = "status";
  statusDiv.textContent = "";
}

function startGPS() {
  if (!navigator.geolocation) {
    gpsStatus.textContent = "⚠️ เบราว์เซอร์นี้ไม่รองรับ GPS";
    return;
  }

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };

  function onPos(pos) {
    currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    gpsStatus.textContent = "✅ GPS พร้อม";
    gpsCoords.textContent = `${currentPos.lat.toFixed(6)}, ${currentPos.lng.toFixed(6)}`;

    if (officeLocation) {
      const dist = getDistance(currentPos.lat, currentPos.lng, officeLocation.office_lat, officeLocation.office_lng);
      if (dist <= officeLocation.max_distance) {
        gpsDist.textContent = `📍 อยู่ในพื้นที่ (ห่าง ${dist} ม.)`;
        gpsDist.style.color = "#28a745";
      } else {
        gpsDist.textContent = `📍 อยู่นอกพื้นที่ (ห่าง ${dist} ม.)`;
        gpsDist.style.color = "#dc3545";
      }
    }
  }

  function onErr(err) {
    gpsStatus.textContent = "⚠️ GPS ไม่พร้อม: " + err.message;
    currentPos = null;
  }

  navigator.geolocation.watchPosition(onPos, onErr, options);
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

async function clock(action) {
  const name = employeeSelect.value;
  if (!name) {
    showStatus("กรุณาเลือกพนักงาน", "error");
    employeeSelect.focus();
    return;
  }
  if (!currentPos) {
    showStatus("กรุณารอสัญญาณ GPS ก่อน", "error");
    return;
  }

  clearStatus();

  try {
    const res = await fetch("/api/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_name: name,
        action,
        latitude: currentPos.lat,
        longitude: currentPos.lng,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.error || "เกิดข้อผิดพลาด", "error");
    } else {
      showStatus(data.message, "success");
      loadHistory();
    }
  } catch {
    showStatus("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์", "error");
  }
}

function clockIn() { clock("in"); }
function clockOut() { clock("out"); }

async function loadHistory() {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();

    if (data.length === 0) {
      historyList.innerHTML = '<p class="muted">ยังไม่มีประวัติ</p>';
      return;
    }

    historyList.innerHTML = data.map((item) => `
      <div class="history-item">
        <div>
          <span class="name">${escapeHtml(item.employee_name)}</span>
          <span class="badge ${item.action === 'in' ? 'badge-in' : 'badge-out'}">
            ${item.action === 'in' ? 'เข้างาน' : 'ออกงาน'}
          </span>
          <div class="time">${formatTime(item.timestamp)}</div>
        </div>
        <div style="font-size:0.75rem;color:#999">${item.distance} ม.</div>
      </div>
    `).join("");
  } catch {
    historyList.innerHTML = '<p class="muted">โหลดประวัติไม่สำเร็จ</p>';
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

fetchEmployees();
fetchOfficeLocation();
startGPS();
loadHistory();
