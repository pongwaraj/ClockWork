const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "clockwork.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('in','out')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    distance INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);

module.exports = db;
