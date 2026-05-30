const express = require("express");
const { getDb, persist } = require("./db");
const { validateLocation } = require("./location");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/api/clock", async (req, res) => {
  const { employee_name, action, latitude, longitude } = req.body;

  if (!employee_name || !action || latitude == null || longitude == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["in", "out"].includes(action)) {
    return res.status(400).json({ error: "action must be 'in' or 'out'" });
  }

  const loc = validateLocation(latitude, longitude);
  if (!loc.valid) {
    return res.status(403).json({
      error: `คุณอยู่นอกพื้นที่ (ห่าง ${loc.distance} ม.) ต้องอยู่ใน ${loc.maxDistance} ม.`,
      ...loc,
    });
  }

  const now = new Date().toISOString();
  const db = await getDb();
  db.run(
    "INSERT INTO attendance (employee_name, action, latitude, longitude, distance, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    [employee_name, action, latitude, longitude, loc.distance, now]
  );
  persist();

  res.json({
    message: `บันทึกการ${action === "in" ? "เข้างาน" : "ออกงาน"}ของ ${employee_name} เรียบร้อย`,
    distance: loc.distance,
  });
});

app.get("/api/history", async (_req, res) => {
  const db = await getDb();
  const results = db.exec("SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 100");
  const rows = results[0] ? results[0].values.map((v) => {
    const cols = results[0].columns;
    return cols.reduce((obj, col, i) => { obj[col] = v[i]; return obj; }, {});
  }) : [];
  res.json(rows);
});

app.get("/api/location", (_req, res) => {
  const { OFFICE_LAT, OFFICE_LNG, MAX_DISTANCE_M } = require("./location");
  res.json({ office_lat: OFFICE_LAT, office_lng: OFFICE_LNG, max_distance: MAX_DISTANCE_M });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ClockWork running at http://localhost:${PORT}`);
});
