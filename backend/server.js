// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const { spawn } = require("child_process");


const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

const APP_PORT = 3000;
const SECRET_KEY = "超級秘密金鑰"; // JWT 用

const password = "123456";
const hash = bcrypt.hashSync(password, 10);
console.log(hash);

// MySQL 連線
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mysql1234',  // 改成你自己的密碼
  database: 'userDB'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected');
});

// -------------------- Helpers --------------------
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) return res.status(403).json({ error: 'invalid token' });
    req.user = payload; // payload 內含 { id, email }
    next();
  });
}

// -------------------- Auth --------------------
// 註冊
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ message: "帳號密碼不可為空" });

  const hash = bcrypt.hashSync(password, 8);
  const sql = "INSERT INTO users (email,password) VALUES (?,?)";
  db.query(sql, [email, hash], (err, result) => {
    if (err) return res.json({ message: "帳號已存在或錯誤" });

    const userId = result.insertId;
    // 建立預設 profile
    const profileSql = `
      INSERT INTO profiles (user_id, name, sportType)
      VALUES (?, '', 'general')
    `;
    db.query(profileSql, [userId], (err2) => {
      if (err2) console.error("建立 profile 失敗", err2);
      res.status(200).json({ message: "註冊成功", userId });
    });
  });
});

// 登入
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.json({ message: "資料庫錯誤" });
    if (results.length === 0) return res.json({ message: "帳號不存在" });

    const row = results[0];
    const match = bcrypt.compareSync(password, row.password);
    if (!match) return res.json({ message: "帳號或密碼錯誤" });

    const token = jwt.sign({ id: row.id, email: row.email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "登入成功", token });
  });
});

// 驗證 token
app.post("/api/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "缺少 token" });
  try {
    const payload = jwt.verify(token, SECRET_KEY);
    res.json({ valid: true, email: payload.email });
  } catch (err) {
    res.status(401).json({ valid: false, error: "Token 無效或過期" });
  }
});

// -------------------- Profile --------------------
// 取得 profile
app.get("/api/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT name, birthday, height, weight, sportType, gender, notes FROM profiles WHERE user_id=?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.json({ name:'', birthday:'', height:'', weight:'', sportType:'general', gender:'male', notes:'' });
    res.json(results[0]);
  });
});

// 儲存 / 更新 profile
app.post("/api/profile", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, birthday, height, weight, sportType, gender, notes } = req.body;

  const sql = `
    INSERT INTO profiles (user_id, name, birthday, height, weight, sportType, gender, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      birthday=VALUES(birthday),
      height=VALUES(height),
      weight=VALUES(weight),
      sportType=VALUES(sportType),
      gender=VALUES(gender),
      notes=VALUES(notes)
  `;
  db.query(sql, [userId, name, birthday, height, weight, sportType, gender, notes], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // 將儲存的資料也回傳
    res.json({
      message: "已儲存",
      profile: { name, birthday, height, weight, sportType, gender, notes }
    });
  });
});


// -------------------- Logs --------------------
app.get("/api/logs", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT id, food_name, grams, created_at FROM logs WHERE user_id = ? ORDER BY created_at DESC";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/logs", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { food_name, grams } = req.body;
  if (!food_name || !grams) return res.status(400).json({ error: "缺少食物名稱或克數" });

  const created_at = Date.now();
  const sql = "INSERT INTO logs (user_id, food_name, grams, created_at) VALUES (?,?,?,?)";
  db.query(sql, [userId, food_name, grams, created_at], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, food_name, grams, created_at });
  });
});

app.delete("/api/logs/:id", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const logId = req.params.id;
  const sql = "DELETE FROM logs WHERE id = ? AND user_id = ?";
  db.query(sql, [logId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: result.affectedRows });
  });
});
// ---- AI 問答 route ----
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "訊息不得為空" });

  const llm = spawn("ollama", ["run", "llama3"]);
  let reply = "";

  llm.stdout.setEncoding("utf8");
  llm.stdout.on("data", chunk => {
    reply += chunk;
  });

  llm.stderr.on("data", chunk => {
    console.error("Ollama error:", chunk);
  });

  llm.on("close", () => {
    res.json({ reply: reply.trim() });
  });

  llm.stdin.write(message + "\n");
  llm.stdin.end();
});
// -------------------- 前端靜態 --------------------
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

app.listen(APP_PORT, () => console.log(`Backend running on http://localhost:${APP_PORT}`));
