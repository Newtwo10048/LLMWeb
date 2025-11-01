// backend/server.js
import express from "express";
import bodyParser  from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2";
import cors from "cors";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";



const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const APP_PORT = 3000;
const SECRET_KEY = "超級秘密金鑰"; // JWT 用

//google jwt
import { OAuth2Client } from "google-auth-library";
const CLIENT_ID = "1012981023049-l4nvkheq3s0ql1hokvn4uofsl2h4pr5r.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload; // 內含 email、name、sub(唯一ID)
}

// Serve static files (HTML/JS) from "public" folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// MySQL 連線池 (更穩定)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'mysql1234',
  database: 'userDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 測試連線
db.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL 連線失敗:', err);
    throw err;
  }
  console.log('✅ MySQL connected');
  conn.release();
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
  console.log('📥 收到註冊請求:', { email: req.body.email, hasPassword: !!req.body.password });
  
  const { email, password } = req.body;
  
  // 1. 驗證是否有輸入
  if (!email || !password) {
    console.warn('⚠️ 註冊失敗: 欄位為空');
    return res.status(400).json({ message: "請填寫所有欄位" });
  }
  
  // 2. Email 格式驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('⚠️ 註冊失敗: Email 格式錯誤');
    return res.status(400).json({ message: "Email 格式不正確" });
  }
  
  // 3. 密碼長度驗證
  if (password.length < 6) {
    console.warn('⚠️ 註冊失敗: 密碼太短');
    return res.status(400).json({ message: "密碼至少需要 6 個字元" });
  }

  console.log('✅ 驗證通過，開始加密密碼');
  const hash = bcrypt.hashSync(password, 10);
  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";
  
  db.query(sql, [email, hash], (err, result) => {
    if (err) {
      // 檢查是否是重複 email
      if (err.code === 'ER_DUP_ENTRY') {
        console.warn('⚠️ 註冊失敗: Email 已存在');
        return res.status(409).json({ message: "此 Email 已被註冊，請使用其他 Email" });
      }
      console.error('❌ 資料庫錯誤:', err);
      return res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
    }

    const userId = result.insertId;
    console.log('✅ 使用者已建立, ID:', userId);
    
    // 建立預設 profile
    const profileSql = `
      INSERT INTO profiles (user_id, name, sportType)
      VALUES (?, '', 'general')
    `;
    
    db.query(profileSql, [userId], (err2) => {
      if (err2) {
        console.error("⚠️ 建立 profile 失敗:", err2);
        // 即使 profile 建立失敗，註冊還是算成功
      } else {
        console.log('✅ Profile 已建立');
      }
      
      console.log('🎉 註冊流程完成');
      res.status(201).json({ 
        message: "註冊成功！即將跳轉到登入頁面...", 
        userId,
        email 
      });
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
//google登入
app.post("/api/google-login", async (req, res) => {
  const { credential } = req.body;
  console.log("收到 credential:", credential); // ✅ 確認有收到
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID, // 必須跟生成 token 的 client ID 一致
    });
    const payload = ticket.getPayload();
    console.log(payload);
    res.json({ message: "Google 登入成功", user: payload });
  } catch (err) {
    console.error("Google token 驗證錯誤:", err);
    res.status(401).json({ message: "Google token 驗證失敗" });
  }
});


app.listen(3001, () => console.log("Server running on http://localhost:3001"));
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

  const profileData = {
    name: name || '',
    birthday: birthday || null,
    height: height || null,
    weight: weight || null,
    sportType: sportType || 'general',
    gender: gender || 'male',
    notes: notes || ''
  };

  db.query("SELECT * FROM profiles WHERE user_id=?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      // INSERT
      const sql = `
      INSERT INTO profiles (user_id, name, birthday, height, weight, sportType, gender, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
      db.query(sql, [userId, ...Object.values(profileData)], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "已新增 profile", profile: { user_id: userId, ...profileData } });
      });
    } else {
      // UPDATE
      const sql = "UPDATE profiles SET name=?, birthday=?, height=?, weight=?, sportType=?, gender=?, notes=? WHERE user_id=?";
      db.query(sql, [...Object.values(profileData), userId], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ message: "已更新 profile", profile: { user_id: userId, ...profileData } });
      });
    }
  });
});

// -------------------- Goals --------------------
// 儲存目標 (修正版)
app.post("/api/goals", authenticateToken, (req, res) => {
  const { short_goal, long_goal } = req.body;
  const userId = req.user.id;

  // 檢查是否已有記錄
  db.query("SELECT * FROM goals WHERE user_id=?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      // INSERT
      db.query(
        "INSERT INTO goals (user_id, short_goal, long_goal) VALUES (?, ?, ?)",
        [userId, short_goal || '', long_goal || ''],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: "目標已新增" });
        }
      );
    } else {
      // UPDATE
      db.query(
        "UPDATE goals SET short_goal=?, long_goal=? WHERE user_id=?",
        [short_goal || '', long_goal || '', userId],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: "目標已更新" });
        }
      );
    }
  });
});

// 取得目標
app.get("/api/goals", authenticateToken, (req, res) => {
  db.query(
    "SELECT short_goal, long_goal FROM goals WHERE user_id=? LIMIT 1",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) {
        return res.json({ short_goal: '', long_goal: '' });
      }
      res.json(rows[0]);
    }
  );
});

// -------------------- Diet Logs --------------------
// 新增飲食記錄 (修正路徑)
app.post("/api/diet", authenticateToken, (req, res) => {
  const { food_name, grams } = req.body;
  db.query(
    "INSERT INTO diet_logs (user_id, food_name, grams) VALUES (?, ?, ?)",
    [req.user.id, food_name, grams],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "飲食已記錄" });
    }
  );
});

// 取得飲食記錄
app.get("/api/diet/logs", authenticateToken, (req, res) => {
  db.query(
    "SELECT food_name, grams, created_at FROM diet_logs WHERE user_id=? ORDER BY id DESC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// -------------------- Habits --------------------
// 儲存運動習慣 (修正版)
app.post("/api/habits", authenticateToken, (req, res) => {
  const {
    freq_per_week,
    duration_min,
    meal_breakfast,
    meal_lunch,
    meal_dinner,
    meal_late
  } = req.body;
  const userId = req.user.id;

  // 檢查是否已有記錄
  db.query("SELECT * FROM habits WHERE user_id=?", [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      // INSERT
      db.query(
        `INSERT INTO habits 
         (user_id, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late],
        (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ message: "習慣已新增" });
        }
      );
    } else {
      // UPDATE
      db.query(
        `UPDATE habits 
         SET freq_per_week=?, duration_min=?, meal_breakfast=?, meal_lunch=?, meal_dinner=?, meal_late=?
         WHERE user_id=?`,
        [freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late, userId],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: "習慣已更新" });
        }
      );
    }
  });
});

// 取得運動習慣
app.get("/api/habits", authenticateToken, (req, res) => {
  db.query(
    "SELECT freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late FROM habits WHERE user_id=? LIMIT 1",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) {
        return res.json({
          freq_per_week: 0,
          duration_min: 0,
          meal_breakfast: false,
          meal_lunch: false,
          meal_dinner: false,
          meal_late: false
        });
      }
      res.json(rows[0]);
    }
  );
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

// -------------------- Chat --------------------
// 儲存單條訊息
app.post("/api/chat/save", authenticateToken, (req, res) => {
  const { role, content } = req.body;
  if (!content) return res.status(400).json({ error: "內容不可為空" });

  db.query(
    "INSERT INTO chat_logs (user_id, role, content) VALUES (?, ?, ?)",
    [req.user.id, role || "user", content],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "已儲存" });
    }
  );
});

// 取得使用者歷史對話
app.get("/api/chat/history", authenticateToken, (req, res) => {
  db.query(
    "SELECT role, content, created_at FROM chat_logs WHERE user_id=? ORDER BY id ASC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 刪除使用者所有對話歷史
app.delete("/api/chat/history", authenticateToken, (req, res) => {
  db.query(
    "DELETE FROM chat_logs WHERE user_id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        message: "對話歷史已清除", 
        deletedCount: result.affectedRows 
      });
    }
  );
});

// 刪除單條對話記錄
app.delete("/api/chat/history/:id", authenticateToken, (req, res) => {
  const chatId = req.params.id;
  db.query(
    "DELETE FROM chat_logs WHERE id=? AND user_id=?",
    [chatId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "找不到該對話記錄" });
      }
      res.json({ message: "已刪除", deleted: true });
    }
  );
});

// ---- 保留對話歷史 ----
const userHistories = {}; // key: userId, value: array

app.post("/api/chat", authenticateToken, (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  if (!message) return res.status(400).json({ reply: "訊息不得為空" });

  // 初始化使用者對話歷史
  if (!userHistories[userId]) userHistories[userId] = [];

  // ---- 存使用者訊息 ----
  userHistories[userId].push({ role: "user", content: message });

  // 儲存使用者訊息到資料庫
  db.query(
    "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'user', ?)",
    [userId, message],
    (err) => { if (err) console.error("儲存使用者訊息失敗：", err); }
  );

  const llm = spawn("ollama", ["run", "llama3"]);

  let reply = "";
  llm.stdout.setEncoding("utf8");

  // 設定 headers 讓前端可以即時收到資料
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  llm.stdout.on("data", chunk => {
    reply += chunk;
    res.write(chunk); // 逐 chunk 送給前端
  });

  llm.stderr.on("data", chunk => console.error("Ollama error:", chunk));

  llm.on("close", () => {
    const replyText = reply.trim();
    // 存入使用者對話歷史
    userHistories[userId].push({ role: "assistant", content: replyText });

    // 儲存 AI 回覆
    db.query(
      "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'assistant', ?)",
      [userId, replyText],
      (err) => { if (err) console.error("儲存 AI 回覆失敗：", err); }
    );

    res.end(); // 結束傳輸
  });

  // // 把使用者的對話歷史傳給模型
  const systemPrompt = "請一定完全以繁體中文回覆我：\n";
  const historyText = userHistories[userId]
    .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");
  const prompt = systemPrompt + historyText + "\nAI:";


  llm.stdin.write(prompt);
  llm.stdin.end();
});
// 取得使用者歷史對話
app.get("/api/chat/history", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT role, content, created_at FROM chat_logs WHERE user_id=? ORDER BY created_at ASC";
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results); // 回傳一個陣列 [{role, content, created_at}, ...]
  });
});

// 前端靜態
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

app.listen(APP_PORT, () => console.log(`Backend running on http://localhost:${APP_PORT}`));

// Add new food
function parseNumber(value) {
  return value === "" ? null : parseFloat(value);
}

app.post("/foods", (req, res) => {
  const {
    name,
    portion_size_per_day,
    cal_per_100g,
    carbon_per_100g,
    protein_per_100g,
    fats_per_100g,
    flavor,
    category,
    description
  } = req.body;

  const sql = `
    INSERT INTO foods 
    (name, portion_size_per_day, cal_per_100g, carbon_per_100g, protein_per_100g, fats_per_100g, flavor, category, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name || null,
      portion_size_per_day || null,
      parseNumber(cal_per_100g),
      parseNumber(carbon_per_100g),
      parseNumber(protein_per_100g),
      parseNumber(fats_per_100g),
      flavor || null,
      category || null,
      description || null
    ],
    (err) => {
      if (err) {
        console.error("Insert error:", err);
        return res.status(500).send("Database insert failed");
      }
      res.send("✅ Food added successfully!");
    }
  );
});


// Get all foods
app.get("/foods", (req, res) => {
  db.query("SELECT * FROM foods", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));