const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { validateLocation } = require("./location");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const EMPLOYEES = ["น้ำฝน รัศมี", "โชโช เซน"];
const ADMIN_PASSWORD = "exd1919887";
const ADMIN_TOKEN = crypto.randomBytes(32).toString("hex");

const attendance = [];
let nextId = 1;

function requireAdmin(req, res, next) {
  const token = req.headers.authorization;
  if (token !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: "รหัสผ่านไม่ถูกต้อง" });
  }
  res.json({ token: ADMIN_TOKEN });
});

app.delete("/api/admin/record/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const idx = attendance.findIndex((r) => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "ไม่พบ record" });
  }
  attendance.splice(idx, 1);
  res.json({ message: "ลบ record เรียบร้อย" });
});

app.get("/api/employees", (_req, res) => {
  res.json(EMPLOYEES);
});

app.post("/api/clock", (req, res) => {
  const { employee_name, action, latitude, longitude } = req.body;

  if (!employee_name || !action || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["in", "out"].includes(action)) {
    return res.status(400).json({ error: "action must be 'in' or 'out'" });
  }
  if (!EMPLOYEES.includes(employee_name)) {
    return res.status(400).json({ error: "พนักงานไม่ถูกต้อง" });
  }

  const loc = validateLocation(latitude, longitude);
  if (!loc.valid) {
    return res.status(403).json({
      error: `คุณอยู่นอกพื้นที่ (ห่าง ${loc.distance} ม.) ต้องอยู่ใน ${loc.maxDistance} ม.`,
      ...loc,
    });
  }

  attendance.unshift({
    id: nextId++,
    employee_name,
    action,
    latitude,
    longitude,
    distance: loc.distance,
    timestamp: new Date().toISOString(),
  });

  if (attendance.length > 100) attendance.length = 100;

  res.json({
    message: `บันทึกการ${action === "in" ? "เข้างาน" : "ออกงาน"}ของ ${employee_name} เรียบร้อย`,
    distance: loc.distance,
  });
});

app.get("/api/history", (_req, res) => {
  res.json(attendance);
});

app.get("/api/location", (_req, res) => {
  const { OFFICE_LAT, OFFICE_LNG, MAX_DISTANCE_M } = require("./location");
  res.json({ office_lat: OFFICE_LAT, office_lng: OFFICE_LNG, max_distance: MAX_DISTANCE_M });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`ClockWork running at http://localhost:${PORT}`);
  });
}
