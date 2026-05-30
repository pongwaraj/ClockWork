require("dotenv").config({ path: require("path").join(__dirname, ".env.local") });

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("@neondatabase/serverless");
const { validateLocation } = require("./location");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const EMPLOYEES = ["น้ำฝน รัศมี", "โชโช เซน"];
const ADMIN_PASSWORD = "exd1919887";
const ADMIN_TOKEN = crypto.randomBytes(32).toString("hex");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee_name TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('in','out')),
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      distance INTEGER NOT NULL,
      device_ip TEXT NOT NULL DEFAULT '',
      device_name TEXT NOT NULL DEFAULT '',
      device_id TEXT NOT NULL DEFAULT '',
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_id TEXT NOT NULL DEFAULT ''
  `).catch(() => {});
}

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

app.delete("/api/admin/record/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await pool.query("DELETE FROM attendance WHERE id = $1 RETURNING id", [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "ไม่พบ record" });
  }
  res.json({ message: "ลบ record เรียบร้อย" });
});

app.get("/api/employees", (_req, res) => {
  res.json(EMPLOYEES);
});

app.post("/api/clock", async (req, res) => {
  const { employee_name, action, latitude, longitude, device_id } = req.body;

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

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
  const ua = req.headers["user-agent"] || "unknown";

  const devId = device_id || "unknown";

  await pool.query(
    "INSERT INTO attendance (employee_name, action, latitude, longitude, distance, device_ip, device_name, device_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    [employee_name, action, latitude, longitude, loc.distance, ip, ua, devId]
  );

  res.json({
    message: `บันทึกการ${action === "in" ? "เข้างาน" : "ออกงาน"}ของ ${employee_name} เรียบร้อย`,
    distance: loc.distance,
  });
});

app.get("/api/history", async (_req, res) => {
  const result = await pool.query("SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 100");
  res.json(result.rows);
});

app.get("/api/location", (_req, res) => {
  const { OFFICE_LAT, OFFICE_LNG, MAX_DISTANCE_M } = require("./location");
  res.json({ office_lat: OFFICE_LAT, office_lng: OFFICE_LNG, max_distance: MAX_DISTANCE_M });
});

initDb().catch((err) => console.error("DB init failed:", err.message));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`ClockWork running at http://localhost:${PORT}`);
  });
}
