// backend/server.js
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise"; // ✅ 使用 promise 版本
import cors from "cors";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library";

const PORT = 3000; // ✅ 改用 3001（如果 3000 被佔用）
const JWT_SECRET = process.env.JWT_SECRET || "超級秘密金鑰";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "1012981023049-ei8qt2b4qp2n8o0uulpku50tb4cgv4ot.apps.googleusercontent.com";

const app = express();
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// 設定靜態檔案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ✅ MySQL 連線池 (Promise 版本)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'mysql1234',
  database: 'userdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ✅ 測試連線 (Promise 版本)
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL connected');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL 連線失敗:', err);
  }
})();

// ==================== 輔助函數 ====================

// 驗證 Google Token
async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error('Google token 驗證失敗:', error);
    throw new Error('Invalid Google token');
  }
}

// 建立預設 Profile
async function createDefaultProfile(userId) {
  try {
    const sql = `
      INSERT INTO profiles (user_id, name, sportType)
      VALUES (?, '', 'general')
    `;
    await db.query(sql, [userId]);
    console.log('✅ Profile 已建立, user_id:', userId);
  } catch (error) {
    console.error("⚠️ 建立 profile 失敗:", error);
  }
}

// ==================== 一般註冊 ====================

app.post("/api/register", async (req, res) => {
  console.log('📥 收到註冊請求:', { email: req.body.email, hasPassword: !!req.body.password });
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.warn('⚠️ 註冊失敗: 欄位為空');
    return res.status(400).json({ message: "請填寫所有欄位" });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('⚠️ 註冊失敗: Email 格式錯誤');
    return res.status(400).json({ message: "Email 格式不正確" });
  }
  
  if (password.length < 6) {
    console.warn('⚠️ 註冊失敗: 密碼太短');
    return res.status(400).json({ message: "密碼至少需要 6 個字元" });
  }

  try {
    console.log('✅ 驗證通過，開始加密密碼');
    const hash = bcrypt.hashSync(password, 10);
    
    const [existingUsers] = await db.query(
      "SELECT id, provider FROM users WHERE email = ?",
      [email]
    );
    
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.provider === 'google') {
        console.warn('⚠️ 註冊失敗: Email 已被 Google 帳號使用');
        return res.status(409).json({ 
          message: "此 Email 已使用 Google 登入註冊，請直接使用 Google 登入" 
        });
      }
      console.warn('⚠️ 註冊失敗: Email 已存在');
      return res.status(409).json({ 
        message: "此 Email 已被註冊，請使用其他 Email" 
      });
    }

    const [result] = await db.query(
      "INSERT INTO users (email, password, provider) VALUES (?, ?, 'local')",
      [email, hash]
    );

    const userId = result.insertId;
    console.log('✅ 使用者已建立, ID:', userId);
    
    await createDefaultProfile(userId);
    
    console.log('🎉 註冊流程完成');
    res.status(201).json({ 
      message: "註冊成功！即將跳轉到登入頁面...", 
      userId,
      email 
    });

  } catch (err) {
    console.error('❌ 註冊錯誤:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: "此 Email 已被註冊，請使用其他 Email" 
      });
    }
    
    res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
  }
});

// ==================== 一般登入 ====================

app.post("/api/login", async (req, res) => {
  console.log('📥 收到登入請求:', { email: req.body.email });
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "請填寫所有欄位" });
  }

  try {
    const [results] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      console.warn('⚠️ 登入失敗: 帳號不存在');
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const user = results[0];

    if (user.provider === 'google' && !user.password) {
      console.warn('⚠️ 登入失敗: 此帳號使用 Google 登入');
      return res.status(401).json({ 
        message: "此帳號使用 Google 登入，請點擊「使用 Google 登入」按鈕" 
      });
    }

    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      console.warn('⚠️ 登入失敗: 密碼錯誤');
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('✅ 登入成功, user_id:', user.id);
    res.json({ 
      message: "登入成功", 
      token,
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider
      }
    });

  } catch (err) {
    console.error('❌ 登入錯誤:', err);
    res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
  }
});

// ==================== Google 登入 ====================

app.post("/api/google-login", async (req, res) => {
  console.log('📥 收到 Google 登入請求');
  
  const { credential } = req.body; // ✅ 修正：使用 credential 而非 id_token

  if (!credential) {
    return res.status(400).json({ message: "缺少 Google token" });
  }

  try {
    const payload = await verifyGoogleToken(credential);
    const email = payload.email;
    const googleId = payload.sub;
    const name = payload.name;
    const picture = payload.picture;

    console.log('✅ Google token 驗證成功:', { email, name });

    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let user;
    let isNewUser = false;

    if (existingUsers.length === 0) {
      console.log('📝 建立新 Google 使用者');
      
      const [result] = await db.query(
        "INSERT INTO users (email, password, provider, google_id, name, avatar_url) VALUES (?, NULL, 'google', ?, ?, ?)",
        [email, googleId, name, picture]
      );

      const userId = result.insertId;
      user = {
        id: userId,
        email,
        provider: 'google',
        google_id: googleId,
        name,
        avatar_url: picture
      };

      await createDefaultProfile(userId);
      
      isNewUser = true;
      console.log('✅ 新使用者已建立, ID:', userId);

    } else {
      user = existingUsers[0];
      
      if (user.provider === 'local' && !user.google_id) {
        console.log('🔗 綁定 Google 到現有帳號');
        
        await db.query(
          "UPDATE users SET google_id = ?, name = ?, avatar_url = ? WHERE id = ?",
          [googleId, name, picture, user.id]
        );
        
        user.google_id = googleId;
        user.name = name;
        user.avatar_url = picture;
      }
      
      console.log('✅ 現有使用者登入, ID:', user.id);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('✅ Google 登入成功');
    res.json({
      message: isNewUser ? "Google 帳號註冊成功" : "Google 登入成功",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        provider: user.provider,
        isNewUser
      }
    });

  } catch (err) {
    console.error('❌ Google 登入失敗:', err);
    res.status(400).json({ 
      message: "Google 登入失敗，請稍後再試",
      error: err.message 
    });
  }
});

// ==================== JWT 驗證中介層 ====================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token 無效或已過期" });
    }
    req.user = user;
    next();
  });
}

// ==================== Profile API ====================

app.get("/api/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [results] = await db.query(
      "SELECT name, birthday, height, weight, sportType, gender, notes FROM profiles WHERE user_id=?",
      [userId]
    );
    
    if (results.length === 0) {
      return res.json({ name:'', birthday:'', height:'', weight:'', sportType:'general', gender:'male', notes:'' });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profile", authenticateToken, async (req, res) => {
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

  try {
    const [results] = await db.query("SELECT * FROM profiles WHERE user_id=?", [userId]);

    if (results.length === 0) {
      const sql = `
        INSERT INTO profiles (user_id, name, birthday, height, weight, sportType, gender, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.query(sql, [userId, ...Object.values(profileData)]);
      res.json({ message: "已新增 profile", profile: { user_id: userId, ...profileData } });
    } else {
      const sql = "UPDATE profiles SET name=?, birthday=?, height=?, weight=?, sportType=?, gender=?, notes=? WHERE user_id=?";
      await db.query(sql, [...Object.values(profileData), userId]);
      res.json({ message: "已更新 profile", profile: { user_id: userId, ...profileData } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Goals API ====================

app.post("/api/goals", authenticateToken, async (req, res) => {
  const { short_goal, long_goal } = req.body;
  const userId = req.user.id;

  try {
    const [results] = await db.query("SELECT * FROM goals WHERE user_id=?", [userId]);

    if (results.length === 0) {
      await db.query(
        "INSERT INTO goals (user_id, short_goal, long_goal) VALUES (?, ?, ?)",
        [userId, short_goal || '', long_goal || '']
      );
      res.json({ message: "目標已新增" });
    } else {
      await db.query(
        "UPDATE goals SET short_goal=?, long_goal=? WHERE user_id=?",
        [short_goal || '', long_goal || '', userId]
      );
      res.json({ message: "目標已更新" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/goals", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT short_goal, long_goal FROM goals WHERE user_id=? LIMIT 1",
      [req.user.id]
    );
    
    if (rows.length === 0) {
      return res.json({ short_goal: '', long_goal: '' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Diet Logs API ====================

app.post("/api/diet", authenticateToken, async (req, res) => {
  const { food_name, grams } = req.body;
  try {
    await db.query(
      "INSERT INTO diet_logs (user_id, food_name, grams) VALUES (?, ?, ?)",
      [req.user.id, food_name, grams]
    );
    res.json({ message: "飲食已記錄" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/diet/logs", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT food_name, grams, created_at FROM diet_logs WHERE user_id=? ORDER BY id DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Habits API ====================

app.post("/api/habits", authenticateToken, async (req, res) => {
  const {
    freq_per_week,
    duration_min,
    meal_breakfast,
    meal_lunch,
    meal_dinner,
    meal_late
  } = req.body;
  const userId = req.user.id;

  try {
    const [results] = await db.query("SELECT * FROM habits WHERE user_id=?", [userId]);

    if (results.length === 0) {
      await db.query(
        `INSERT INTO habits 
         (user_id, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late]
      );
      res.json({ message: "習慣已新增" });
    } else {
      await db.query(
        `UPDATE habits 
         SET freq_per_week=?, duration_min=?, meal_breakfast=?, meal_lunch=?, meal_dinner=?, meal_late=?
         WHERE user_id=?`,
        [freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late, userId]
      );
      res.json({ message: "習慣已更新" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/habits", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late FROM habits WHERE user_id=? LIMIT 1",
      [req.user.id]
    );
    
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Chat API ====================

app.get("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT role, content, created_at FROM chat_logs WHERE user_id=? ORDER BY id ASC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM chat_logs WHERE user_id=?",
      [req.user.id]
    );
    res.json({ 
      message: "對話歷史已清除", 
      deletedCount: result.affectedRows 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chat", authenticateToken, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  if (!message) return res.status(400).json({ reply: "訊息不得為空" });

  try {
    // 儲存使用者訊息
    await db.query(
      "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'user', ?)",
      [userId, message]
    );

    // 取得歷史對話
    const [history] = await db.query(
      "SELECT role, content FROM chat_logs WHERE user_id=? ORDER BY id ASC",
      [userId]
    );

    const llm = spawn("ollama", ["run", "llama3"]);

    let reply = "";
    llm.stdout.setEncoding("utf8");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    llm.stdout.on("data", chunk => {
      reply += chunk;
      res.write(chunk);
    });

    llm.stderr.on("data", chunk => console.error("Ollama error:", chunk));

    llm.on("close", async () => {
      const replyText = reply.trim();
      
      // 儲存 AI 回覆
      try {
        await db.query(
          "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'assistant', ?)",
          [userId, replyText]
        );
      } catch (err) {
        console.error("儲存 AI 回覆失敗：", err);
      }

      res.end();
    });

    // 建立對話 prompt
    const systemPrompt = "請一定完全以繁體中文回覆我：\n";
    const historyText = history
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");
    const prompt = systemPrompt + historyText + "\nAI:";

    llm.stdin.write(prompt);
    llm.stdin.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== Foods API ====================

app.post("/api/foods", async (req, res) => {
  const {
    foodname,
    portion_size_per_day,
    cal_per_100g,
    carbon_per_100g,
    protein_per_100g,
    fats_per_100g,
    flavor,
    category,
    description
  } = req.body;

  const parseNumber = (value) => value === "" ? null : parseFloat(value);

  const sql = `
    INSERT INTO foods 
    (name, portion_size_per_day, cal_per_100g, carbon_per_100g, protein_per_100g, fats_per_100g, flavor, category, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(sql, [
      foodname || null,
      portion_size_per_day || null,
      parseNumber(cal_per_100g),
      parseNumber(carbon_per_100g),
      parseNumber(protein_per_100g),
      parseNumber(fats_per_100g),
      flavor || null,
      category || null,
      description || null
    ]);
    res.send("✅ Food added successfully!");
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).send("Database insert failed");
  }
});

app.get("/api/foods", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM foods");
    res.json(results);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ==================== Recipes API (簡化版) ====================

app.get("/api/recipes", authenticateToken, async (req, res) => {
  try {
    const [recipes] = await db.query(
      "SELECT * FROM recipes WHERE user_id=? ORDER BY timestamp DESC",
      [req.user.id]
    );
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recipes", authenticateToken, async (req, res) => {
  const { name, content, servings, nutrition } = req.body;
  const userId = req.user.id;
  const timestamp = Date.now();

  try {
    const [result] = await db.query(
      `INSERT INTO recipes (user_id, name, content, servings, nutrition, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, content, servings, JSON.stringify(nutrition), timestamp]
    );
    
    res.json({ 
      message: "食譜已儲存",
      id: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/recipes/:id", authenticateToken, async (req, res) => {
  const recipeId = req.params.id;
  try {
    await db.query(
      "DELETE FROM recipes WHERE id=? AND user_id=?",
      [recipeId, req.user.id]
    );
    res.json({ message: "食譜已刪除" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== 靜態檔案 ====================

app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// ==================== 啟動伺服器 ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});