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
  )
`);

const uploadDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const filename =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    cb(null, filename);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "baki1.html"));
});

app.get("/api/ads", (req, res) => {
  try {
    const ads = db.prepare(`
      SELECT *
      FROM ads
      ORDER BY
        CASE
          WHEN is_vip = 1
          AND vip_until > datetime('now')
          THEN 0
          ELSE 1
        END,
        datetime(created_at) DESC
    `).all();

    res.json(ads);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Elanları yükləmək mümkün olmadı."
    });
  }
});

app.post("/api/ads", upload.single("image"), (req, res) => {
  try {
    const title = req.body.title;
    const category = req.body.category;
    const price = req.body.price;
    const phone = req.body.phone;
    const description = req.body.description;

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
      price ? Number(price) : null,
      phone || "",
      description || "",
      image
    );

    res.json({
      ok: true,
      id: result.lastInsertRowid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Elan əlavə edilərkən xəta baş verdi."
    });
  }
});

app.post("/api/ads/:id/vip", (req, res) => {
  try {
    const days = Number(req.body.days);

    if (![3, 7, 30].includes(days)) {
      return res.status(400).json({
        error: "VIP müddəti 3, 7 və ya 30 gün olmalıdır."
      });
    }

    const vipUntil = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const result = db.prepare(`
      UPDATE ads
      SET is_vip = 1,
          vip_until = ?
      WHERE id = ?
    `).run(vipUntil, req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        error: "Elan tapılmadı."
      });
    }

    res.json({
      ok: true,
      vip_until: vipUntil
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "VIP aktivləşdirilərkən xəta baş verdi."
    });
  }
});

app.delete("/api/ads/:id", (req, res) => {
  try {
    const result = db.prepare(
      "DELETE FROM ads WHERE id = ?"
    ).run(req.params.id);

    res.json({
      ok: !!result.changes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Elan silinərkən xəta baş verdi."
    });
  }
});

app.listen(PORT, () => {
  console.log(
    "Baki elan platformasi " + PORT + " portunda isleyir."
  );
});
