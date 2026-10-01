const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database("elan.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS elanlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    basliq TEXT NOT NULL,
    metn TEXT,
    sekil TEXT,
    tarix DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const uploads = path.join(__dirname, "uploads");

if (!fs.existsSync(uploads)) {
  fs.mkdirSync(uploads);
}

const storage = multer.diskStorage({
  destination: uploads,
  filename: (req, file, cb) => {
    const ad = Date.now() + path.extname(file.originalname);
    cb(null, ad);
  }
});

const upload = multer({ storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(uploads));

app.get("/", (req, res) => {
  const elanlar = db
    .prepare("SELECT * FROM elanlar ORDER BY id DESC")
    .all();

  let html = `
  <!DOCTYPE html>
  <html lang="az">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Elan Platforması</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f2f2f2;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 900px;
        margin: auto;
      }
      h1 {
        text-align: center;
      }
      form, .elan {
        background: white;
        padding: 20px;
        margin-bottom: 20px;
        border-radius: 12px;
      }
      input, textarea, button {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
        margin-top: 10px;
        border-radius: 8px;
        border: 1px solid #ccc;
      }
      button {
        background: #222;
        color: white;
        cursor: pointer;
      }
      img {
        max-width: 100%;
        border-radius: 10px;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Elan Platforması</h1>

      <form action="/elan" method="POST" enctype="multipart/form-data">
        <input type="text" name="basliq" placeholder="Elanın başlığı" required>
        <textarea name="metn" placeholder="Elan haqqında məlumat"></textarea>
        <input type="file" name="sekil" accept="image/*">
        <button type="submit">Elanı yerləşdir</button>
      </form>

      <h2>Elanlar</h2>
  `;

  for (const elan of elanlar) {
    html += `
      <div class="elan">
        <h2>${elan.basliq}</h2>
        <p>${elan.metn || ""}</p>
        ${
          elan.sekil
            ? `<img src="/uploads/${elan.sekil}" alt="Elan şəkli">`
            : ""
        }
      </div>
    `;
  }

  html += `
    </div>
  </body>
  </html>
  `;

  res.send(html);
});

app.post("/elan", upload.single("sekil"), (req, res) => {
  const basliq = req.body.basliq;
  const metn = req.body.metn;
  const sekil = req.file ? req.file.filename : null;

  db.prepare(
    "INSERT INTO elanlar (basliq, metn, sekil) VALUES (?, ?, ?)"
  ).run(basliq, metn, sekil);

  res.redirect("/");
});

app.listen(PORT, () => {
  console.log("Server işləyir: " + PORT);
});
