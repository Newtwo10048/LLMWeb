// backend/server.js

// ==================== 匯入套件 ====================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";          // 密碼加密
import jwt from "jsonwebtoken";         // JWT Token 生成與驗證
import mysql from "mysql2/promise";     // MySQL 資料庫 (Promise 版本)
import cors from "cors";                // 跨域請求處理
import path from "path";
import { spawn } from "child_process";  // 執行 Ollama AI
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library"; // Google 登入驗證

// ==================== 環境變數與常數 ====================
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "超級秘密金鑰"; // JWT 簽章密鑰
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "1012981023049-ei8qt2b4qp2n8o0uulpku50tb4cgv4ot.apps.googleusercontent.com";

const app = express();
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// ==================== Middleware 設定 ====================
app.use(bodyParser.json());  // 解析 JSON 請求
app.use(cors());             // 允許跨域請求
app.use(express.static('public')); // 提供靜態檔案

// 設定靜態檔案路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ==================== MySQL 連線池 ====================
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'mysql1234',
  database: 'userdb',
  waitForConnections: true,
  connectionLimit: 10,  // 最多 10 個連線
  queueLimit: 0         // 無限排隊
});

// ==================== 測試資料庫連線 ====================
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

/**
 * 驗證 Google ID Token
 * @param {string} token - Google ID Token
 * @returns {Promise<object>} Google 使用者資訊 (email, name, picture 等)
 */
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

/**
 * 為新使用者建立預設 Profile
 * @param {number} userId - 使用者 ID
 */
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

// ==================== 一般註冊 API ====================
/**
 * POST /api/register
 * 註冊新使用者 (Email + Password)
 */
app.post("/api/register", async (req, res) => {
  console.log('📥 收到註冊請求:', { email: req.body.email, hasPassword: !!req.body.password });
  
  const { email, password } = req.body;
  
  // 驗證：檢查必填欄位
  if (!email || !password) {
    console.warn('⚠️ 註冊失敗: 欄位為空');
    return res.status(400).json({ message: "請填寫所有欄位" });
  }
  
  // 驗證：Email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('⚠️ 註冊失敗: Email 格式錯誤');
    return res.status(400).json({ message: "Email 格式不正確" });
  }
  
  // 驗證：密碼長度
  if (password.length < 6) {
    console.warn('⚠️ 註冊失敗: 密碼太短');
    return res.status(400).json({ message: "密碼至少需要 6 個字元" });
  }

  try {
    console.log('✅ 驗證通過，開始加密密碼');
    
    // 使用 bcrypt 加密密碼 (10 rounds)
    const hash = bcrypt.hashSync(password, 10);
    
    // 檢查 Email 是否已被註冊
    const [existingUsers] = await db.query(
      "SELECT id, provider FROM users WHERE email = ?",
      [email]
    );
    
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // 如果已用 Google 註冊，提示使用者
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

    // 建立新使用者
    const [result] = await db.query(
      "INSERT INTO users (email, password, provider) VALUES (?, ?, 'local')",
      [email, hash]
    );

    const userId = result.insertId;
    console.log('✅ 使用者已建立, ID:', userId);
    
    // 為新使用者建立預設 profile
    await createDefaultProfile(userId);
    
    console.log('🎉 註冊流程完成');
    res.status(201).json({ 
      message: "註冊成功！即將跳轉到登入頁面...", 
      userId,
      email 
    });

  } catch (err) {
    console.error('❌ 註冊錯誤:', err);
    
    // 處理資料庫重複鍵錯誤
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: "此 Email 已被註冊，請使用其他 Email" 
      });
    }
    
    res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
  }
});

// ==================== 一般登入 API ====================
/**
 * POST /api/login
 * 使用 Email + Password 登入
 */
app.post("/api/login", async (req, res) => {
  console.log('📥 收到登入請求:', { email: req.body.email });
  
  const { email, password } = req.body;
  
  // 驗證：檢查必填欄位
  if (!email || !password) {
    return res.status(400).json({ message: "請填寫所有欄位" });
  }

  try {
    // 查詢使用者
    const [results] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (results.length === 0) {
      console.warn('⚠️ 登入失敗: 帳號不存在');
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    const user = results[0];

    // 檢查是否為 Google 帳號 (沒有設定密碼)
    if (user.provider === 'google' && !user.password) {
      console.warn('⚠️ 登入失敗: 此帳號使用 Google 登入');
      return res.status(401).json({ 
        message: "此帳號使用 Google 登入，請點擊「使用 Google 登入」按鈕" 
      });
    }

    // 驗證密碼
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      console.warn('⚠️ 登入失敗: 密碼錯誤');
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }

    // 生成 JWT Token (有效期 7 天)
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

// ==================== Google 登入 API ====================
/**
 * POST /api/google-login
 * 使用 Google One Tap 登入
 */
app.post("/api/google-login", async (req, res) => {
  console.log('📥 收到 Google 登入請求');
  
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "缺少 Google token" });
  }

  try {
    // 驗證 Google Token
    const payload = await verifyGoogleToken(credential);
    const email = payload.email;
    const googleId = payload.sub;        // Google 使用者 ID
    const name = payload.name;
    const picture = payload.picture;

    console.log('✅ Google token 驗證成功:', { email, name });

    // 檢查使用者是否已存在
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let user;
    let isNewUser = false;

    if (existingUsers.length === 0) {
      // 新使用者 - 建立帳號
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

      // 建立預設 profile
      await createDefaultProfile(userId);
      
      isNewUser = true;
      console.log('✅ 新使用者已建立, ID:', userId);

    } else {
      // 現有使用者 - 直接登入
      user = existingUsers[0];
      
      // 如果是 local 帳號，綁定 Google ID
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

    // 生成 JWT Token
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
/**
 * 驗證 JWT Token 的中介層函數
 * 用於保護需要登入才能存取的 API
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 格式: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "未提供 token" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token 無效或已過期" });
    }
    req.user = user; // 將解碼後的使用者資訊附加到 req
    next();
  });
}

// ==================== Profile API (個人資料) ====================

/**
 * GET /api/profile
 * 取得個人資料
 */
app.get("/api/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  
  try {
    const [results] = await db.query(
      "SELECT name, birthday, height, weight, sportType, gender, notes FROM profiles WHERE user_id=?",
      [userId]
    );
    
    // 如果沒有 profile，回傳預設值
    if (results.length === 0) {
      return res.json({ 
        name:'', 
        birthday:'', 
        height:'', 
        weight:'', 
        sportType:'general', 
        gender:'male', 
        notes:'' 
      });
    }
    
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/profile
 * 新增或更新個人資料
 */
app.post("/api/profile", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { name, birthday, height, weight, sportType, gender, notes } = req.body;

  // 整理資料 (處理空值)
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
    // 檢查是否已有 profile
    const [results] = await db.query("SELECT * FROM profiles WHERE user_id=?", [userId]);

    if (results.length === 0) {
      // 新增
      const sql = `
        INSERT INTO profiles (user_id, name, birthday, height, weight, sportType, gender, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.query(sql, [userId, ...Object.values(profileData)]);
      res.json({ message: "已新增 profile", profile: { user_id: userId, ...profileData } });
    } else {
      // 更新
      const sql = "UPDATE profiles SET name=?, birthday=?, height=?, weight=?, sportType=?, gender=?, notes=? WHERE user_id=?";
      await db.query(sql, [...Object.values(profileData), userId]);
      res.json({ message: "已更新 profile", profile: { user_id: userId, ...profileData } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Goals API (目標設定) ====================

/**
 * POST /api/goals
 * 新增或更新目標
 */
app.post("/api/goals", authenticateToken, async (req, res) => {
  const { short_goal, long_goal } = req.body;
  const userId = req.user.id;

  try {
    const [results] = await db.query("SELECT * FROM goals WHERE user_id=?", [userId]);

    if (results.length === 0) {
      // 新增
      await db.query(
        "INSERT INTO goals (user_id, short_goal, long_goal) VALUES (?, ?, ?)",
        [userId, short_goal || '', long_goal || '']
      );
      res.json({ message: "目標已新增" });
    } else {
      // 更新
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

/**
 * GET /api/goals
 * 取得目標設定
 */
app.get("/api/goals", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT short_goal, long_goal FROM goals WHERE user_id=? LIMIT 1",
      [req.user.id]
    );
    
    // 如果沒有設定，回傳空字串
    if (rows.length === 0) {
      return res.json({ short_goal: '', long_goal: '' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== Diet Logs API (飲食記錄) ====================

/**
 * POST /api/diet
 * 新增飲食記錄
 */
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

/**
 * GET /api/diet/logs
 * 取得飲食記錄列表 (最新在前)
 */
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

// ==================== Habits API (運動習慣) ====================

/**
 * POST /api/habits
 * 新增或更新運動習慣
 */
app.post("/api/habits", authenticateToken, async (req, res) => {
  const {
    freq_per_week,    // 每週運動頻率
    duration_min,     // 每次運動時長 (分鐘)
    meal_breakfast,   // 是否吃早餐
    meal_lunch,       // 是否吃午餐
    meal_dinner,      // 是否吃晚餐
    meal_late         // 是否吃宵夜
  } = req.body;
  const userId = req.user.id;

  try {
    const [results] = await db.query("SELECT * FROM habits WHERE user_id=?", [userId]);

    if (results.length === 0) {
      // 新增
      await db.query(
        `INSERT INTO habits 
         (user_id, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late]
      );
      res.json({ message: "習慣已新增" });
    } else {
      // 更新
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

/**
 * GET /api/habits
 * 取得運動習慣
 */
app.get("/api/habits", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT freq_per_week, duration_min, meal_breakfast, meal_lunch, meal_dinner, meal_late FROM habits WHERE user_id=? LIMIT 1",
      [req.user.id]
    );
    
    // 如果沒有設定，回傳預設值
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

// ==================== Chat API (AI 對話) ====================

/**
 * GET /api/chat/history
 * 取得對話歷史
 */
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

/**
 * DELETE /api/chat/history
 * 清除對話歷史
 */
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

/**
 * POST /api/chat
 * 與 AI 對話 (使用 Ollama Llama3)
 * 回應格式：串流 (Stream)
 */
app.post("/api/chat", authenticateToken, async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  if (!message) return res.status(400).json({ reply: "訊息不得為空" });

  try {
    // 儲存使用者訊息到資料庫
    await db.query(
      "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'user', ?)",
      [userId, message]
    );

    // 取得歷史對話
    const [history] = await db.query(
      "SELECT role, content FROM chat_logs WHERE user_id=? ORDER BY id ASC",
      [userId]
    );

    // 啟動 Ollama Llama3 (本地 AI 模型)
    const llm = spawn("ollama", ["run", "llama3"]);

    let reply = ""; // 完整 AI 回覆
    llm.stdout.setEncoding("utf8");

    // 設定回應為純文字串流
    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    // 即時傳送 AI 回應 (串流)
    llm.stdout.on("data", chunk => {
      reply += chunk;
      res.write(chunk); // 立即傳送到前端
    });

    // 處理 Ollama 錯誤
    llm.stderr.on("data", chunk => console.error("Ollama error:", chunk));

    // AI 回應完成
    llm.on("close", async () => {
      const replyText = reply.trim();
      
      // 儲存 AI 回覆到資料庫
      try {
        await db.query(
          "INSERT INTO chat_logs (user_id, role, content) VALUES (?, 'assistant', ?)",
          [userId, replyText]
        );
      } catch (err) {
        console.error("儲存 AI 回覆失敗：", err);
      }

      res.end(); // 結束串流
    });

    // 建立對話 prompt (包含歷史)
    const systemPrompt = "請一定完全以繁體中文回覆我：\n";
    const historyText = history
      .map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");
    const prompt = systemPrompt + historyText + "\nAI:";

    // 傳送 prompt 給 AI
    llm.stdin.write(prompt);
    llm.stdin.end();
    
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== Foods API (食物資料庫) ====================

/**
 * POST /api/foods
 * 新增食物資料
 */
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

  // 輔助函數：將空字串轉為 null
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

/**
 * GET /api/foods
 * 取得所有食物資料
 */
app.get("/api/foods", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM foods");
    res.json(results);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ==================== Recipes API (食譜管理) ====================

/**
 * POST /api/recipes/analyze
 * 分析食譜（使用 Llama3）
 */
app.post("/api/recipes/analyze", authenticateToken, async (req, res) => {
  const { recipeContent } = req.body;

  if (!recipeContent) {
    return res.status(400).json({ error: "請提供食譜內容" });
  }

  console.log('📝 收到食譜分析請求');

  try {
    // 設定 streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 建立 AI prompt
    const prompt = `
請分析以下食譜的營養成分和食材清單，並以 JSON 格式回覆。

食譜內容：
${recipeContent}

請回覆以下格式的 JSON（不要有任何其他文字）：
{
  "nutrition": {
    "calories": 總熱量（大卡，數字），
    "protein": 蛋白質（克，數字），
    "carbs": 碳水化合物（克，數字），
    "fat": 脂肪（克，數字），
    "fiber": 膳食纖維（克，數字）
  },
  "ingredients": [
    {"name": "食材名稱", "amount": "份量"},
    {"name": "食材名稱", "amount": "份量"}
  ],
  "recipe": "完整的食譜步驟說明"
}

請只回覆 JSON，不要有其他說明文字。
`;

    // 呼叫 Ollama Llama3
    const llm = spawn("ollama", ["run", "llama3"]);
    
    let fullResponse = "";
    
    llm.stdout.setEncoding("utf8");
    
    llm.stdout.on("data", (chunk) => {
      fullResponse += chunk;
      // 即時傳送給前端
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    llm.stderr.on("data", (chunk) => {
      console.error("Ollama error:", chunk.toString());
    });

    llm.on("close", () => {
      console.log('🤖 AI 分析完成');
      
      try {
        // 嘗試解析 JSON
        let jsonText = fullResponse.trim();
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const result = JSON.parse(jsonText);
        
        // 發送最終結果
        res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
        res.end();
      } catch (parseError) {
        console.error('❌ JSON 解析失敗:', parseError);
        console.log('原始回應:', fullResponse);
        
        // 如果 JSON 解析失敗，嘗試提取數字
        const fallbackResult = extractNutritionFromText(fullResponse);
        res.write(`data: ${JSON.stringify({ done: true, result: fallbackResult, warning: '使用備用解析' })}\n\n`);
        res.end();
      }
    });

    // 寫入 prompt
    llm.stdin.write(prompt);
    llm.stdin.end();

  } catch (err) {
    console.error('❌ 食譜分析失敗:', err);
    res.status(500).json({ error: "分析失敗：" + err.message });
  }
});

/**
 * POST /api/recipes
 * 儲存食譜（修正版）
 */
app.post("/api/recipes", authenticateToken, async (req, res) => {
  const { recipeName, recipeContent, servings, nutrition, ingredients, recipe } = req.body;
  const userId = req.user.id;

  console.log('💾 收到儲存食譜請求:', { recipeName, userId });

  if (!recipeName || !recipeContent) {
    return res.status(400).json({ error: "請提供食譜名稱和內容" });
  }

  try {
    // 開始交易
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 1. 插入食譜主資料
      const [recipeResult] = await connection.query(
        `INSERT INTO recipes (user_id, recipe_name, recipe_content, servings, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, recipeName, recipe || recipeContent, servings || 1]
      );

      const recipeId = recipeResult.insertId;
      console.log('✅ 食譜主資料已插入, ID:', recipeId);

      // 2. 插入營養成分
      if (nutrition) {
        await connection.query(
          `INSERT INTO recipe_nutrition (recipe_id, calories, protein, carbs, fat, fiber)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            recipeId,
            nutrition.calories || 0,
            nutrition.protein || 0,
            nutrition.carbs || 0,
            nutrition.fat || 0,
            nutrition.fiber || 0
          ]
        );
        console.log('✅ 營養成分已插入');
      }

      // 3. 插入食材清單
      if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
        for (const ingredient of ingredients) {
          await connection.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, amount)
             VALUES (?, ?, ?)`,
            [recipeId, ingredient.name, ingredient.amount || '適量']
          );
        }
        console.log('✅ 食材清單已插入');
      }

      // 提交交易
      await connection.commit();
      connection.release();

      console.log('🎉 食譜儲存成功, ID:', recipeId);

      res.json({
        message: "食譜儲存成功",
        recipeId,
        recipeName
      });

    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }

  } catch (err) {
    console.error('❌ 儲存食譜失敗:', err);
    res.status(500).json({ error: "儲存失敗：" + err.message });
  }
});

/**
 * GET /api/recipes
 * 取得用戶的所有食譜
 */
app.get("/api/recipes", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [recipes] = await db.query(
      `SELECT 
        r.id,
        r.recipe_name,
        r.recipe_content,
        r.servings,
        r.created_at,
        n.calories,
        n.protein,
        n.carbs,
        n.fat,
        n.fiber
       FROM recipes r
       LEFT JOIN recipe_nutrition n ON r.id = n.recipe_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    console.log('✅ 取得食譜列表:', recipes.length, '筆');
    res.json(recipes);
  } catch (err) {
    console.error('❌ 取得食譜失敗:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/:id
 * 取得單一食譜詳情（含食材）
 */
app.get("/api/recipes/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const recipeId = req.params.id;

  try {
    // 取得食譜基本資料
    const [recipes] = await db.query(
      `SELECT 
        r.*,
        n.calories,
        n.protein,
        n.carbs,
        n.fat,
        n.fiber
       FROM recipes r
       LEFT JOIN recipe_nutrition n ON r.id = n.recipe_id
       WHERE r.id = ? AND r.user_id = ?`,
      [recipeId, userId]
    );

    if (recipes.length === 0) {
      return res.status(404).json({ error: "找不到食譜" });
    }

    const recipe = recipes[0];

    // 取得食材清單
    const [ingredients] = await db.query(
      `SELECT ingredient_name AS name, amount 
       FROM recipe_ingredients 
       WHERE recipe_id = ?`,
      [recipeId]
    );

    recipe.ingredients = ingredients;

    console.log('✅ 取得食譜詳情:', recipe.recipe_name);
    res.json(recipe);
  } catch (err) {
    console.error('❌ 取得食譜詳情失敗:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/recipes/:id
 * 刪除食譜
 */
app.delete("/api/recipes/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const recipeId = req.params.id;

  try {
    const [result] = await db.query(
      `DELETE FROM recipes WHERE id = ? AND user_id = ?`,
      [recipeId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "找不到食譜" });
    }

    console.log('🗑️ 食譜已刪除, ID:', recipeId);
    res.json({ message: "食譜已刪除" });
  } catch (err) {
    console.error('❌ 刪除食譜失敗:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== 備用：從文字中提取營養資訊 ====================
function extractNutritionFromText(text) {
  const extractNumber = (pattern) => {
    const match = text.match(pattern);
    return match ? parseFloat(match[1]) : 0;
  };

  return {
    nutrition: {
      calories: extractNumber(/calories?["']?\s*:\s*(\d+\.?\d*)/i) || 
                extractNumber(/熱量[:：]?\s*(\d+\.?\d*)/i) || 500,
      protein: extractNumber(/protein["']?\s*:\s*(\d+\.?\d*)/i) || 
               extractNumber(/蛋白質[:：]?\s*(\d+\.?\d*)/i) || 20,
      carbs: extractNumber(/carbs?["']?\s*:\s*(\d+\.?\d*)/i) || 
             extractNumber(/碳水[:：]?\s*(\d+\.?\d*)/i) || 50,
      fat: extractNumber(/fats?["']?\s*:\s*(\d+\.?\d*)/i) || 
           extractNumber(/脂肪[:：]?\s*(\d+\.?\d*)/i) || 15,
      fiber: extractNumber(/fiber["']?\s*:\s*(\d+\.?\d*)/i) || 
             extractNumber(/纖維[:：]?\s*(\d+\.?\d*)/i) || 5
    },
    ingredients: [],
    recipe: text.substring(0, 500) + "..."
  };
}

// ==================== 靜態檔案服務 ====================
// 提供前端 HTML/CSS/JS 檔案
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// ==================== 404 處理 ====================
app.use((req, res) => {
  res.status(404).json({ error: '找不到此 API 路徑' });
});

// ==================== 錯誤處理中介層 ====================
app.use((err, req, res, next) => {
  console.error('❌ 伺服器錯誤:', err);
  res.status(500).json({ 
    error: '伺服器內部錯誤', 
    message: err.message 
  });
});

// ==================== 啟動伺服器 ====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API 端點已準備就緒`);
  console.log(`🌐 前端頁面: http://localhost:${PORT}`);
  console.log(`\n可用的 API 路徑：`);
  console.log(`   POST /api/register         - 註冊`);
  console.log(`   POST /api/login            - 登入`);
  console.log(`   POST /api/google-login     - Google 登入`);
  console.log(`   GET  /api/profile          - 取得個人資料`);
  console.log(`   POST /api/profile          - 儲存個人資料`);
  console.log(`   GET  /api/goals            - 取得目標`);
  console.log(`   POST /api/goals            - 儲存目標`);
  console.log(`   POST /api/diet             - 新增飲食記錄`);
  console.log(`   GET  /api/diet/logs        - 取得飲食記錄`);
  console.log(`   GET  /api/habits           - 取得運動習慣`);
  console.log(`   POST /api/habits           - 儲存運動習慣`);
  console.log(`   POST /api/chat             - AI 對話`);
  console.log(`   GET  /api/chat/history     - 取得對話歷史`);
  console.log(`   DELETE /api/chat/history   - 清除對話歷史`);
  console.log(`   GET  /api/foods            - 取得食物資料`);
  console.log(`   POST /api/foods            - 新增食物資料`);
  console.log(`   POST /api/recipes/analyze  - 分析食譜`);
  console.log(`   GET  /api/recipes          - 取得食譜列表`);
  console.log(`   POST /api/recipes          - 儲存食譜`);
  console.log(`   GET  /api/recipes/:id      - 取得食譜詳情`);
  console.log(`   DELETE /api/recipes/:id    - 刪除食譜`);
});