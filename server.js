
const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database("elan.db");

db.exec(`
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL,
  phone TEXT,
  description TEXT,
  image TEXT,
  is_vip INTEGER DEFAULT 0,
  vip_until TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/ads", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM ads
    ORDER BY
      CASE
        WHEN is_vip = 1 AND vip_until > datetime('now') THEN 0
        ELSE 1
      END,
      datetime(created_at) DESC
  `).all();

  res.json(rows);
});

app.post("/api/ads", upload.single("image"), (req, res) => {
  const {
    title,
    category,
    price,
    phone,
    description
  } = req.body;

  if (!title || !category) {
    return res.status(400).json({
      error: "Başlıq və kateqoriya vacibdir."
    });
  }

  const image = req.file
    ? "/uploads/" + req.file.filename
    : "";

  const result = db.prepare(`
    INSERT INTO ads
    (title, category, price, phone, description, image)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title,
    category,
    price || null,
    phone || "",
    description || "",
    image
  );

  res.json({
    ok: true,
    id: result.lastInsertRowid
  });
});

app.post("/api/ads/:id/vip", (req, res) => {
  const days = Math.max(
    1,
    Math.min(30, Number(req.body.days) || 7)
  );

  const until = new Date(
    Date.now() + days * 86400000
  )
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const result = db.prepare(`
    UPDATE ads
    SET is_vip = 1, vip_until = ?
    WHERE id = ?
  `).run(until, req.params.id);

  if (!result.changes) {
    return res.status(404).json({
      error: "Elan tapılmadı."
    });
  }

  res.json({
    ok: true,
    vip_until: until
  });
});

app.delete("/api/ads/:id", (req, res) => {
  const result = db.prepare(
    "DELETE FROM ads WHERE id = ?"
  ).run(req.params.id);

  res.json({
    ok: !!result.changes
  });
});

app.listen(PORT, () => {
  console.log(`Elan platformu ${PORT} portunda işləyir.`);
});
