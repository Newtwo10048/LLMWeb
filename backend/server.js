const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "超級秘密金鑰"; // 用於簽署 token

// 模擬使用者資料
const users = [
  { email: "test@example.com", password: "1234", name: "測試用戶" },
  { email: "athlete@ai.com", password: "5678", name: "運動員" },
  { email: "a", password: "1", name: "運動員" },
];

// 登入 API
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token, name: user.name });
  } else {
    res.status(401).json({ error: "帳號或密碼錯誤" });
  }
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

// Profile API (需登入)
app.get("/api/profile", (req, res) => {
  const email = req.query.email;
  const profile = users.find(u => u.email === email);
  if (profile) {
    res.json({ name: profile.name, height: 175, weight: 70, sport: "baseball" });
  } else {
    res.status(404).json({ error: "找不到個人資料" });
  }
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

// ---- Server 啟動 ----
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

