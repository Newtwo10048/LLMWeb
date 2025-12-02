#更新日誌
2025/11/23 整體完善(登入註冊、個人資訊、目標、飲食紀錄與建議、運動習慣、AI問答、營養素查詢、食物資料庫、食譜營養分析)
2025/12/1 新增database功能(有描述、標號、分類、化合物、還沒有三大類、圖片)

🚀 專案安裝與執行指南
🧰 一、系統需求（建議規格）
| 項目   | 最低需求                     | 建議規格                          |
| ---- | ------------------------ | ----------------------------- |
| 作業系統 | Windows 10 / 11 (64-bit) | Windows 11 64-bit             |
| CPU  | Intel i5 / Ryzen 5       | Intel i7 / Ryzen 7 以上         |
| RAM  | 8 GB                     | 16 GB 以上（若需本地 LLM 模型建議 32 GB） |
| 儲存空間 | 至少 10 GB 可用空間            | SSD 優先（安裝 Ollama 模型需額外空間）     |
| GPU  | 無特別需求                    | 若需 LLM 加速建議 NVIDIA RTX 系列     |

⚙️ 二、安裝環境
1️⃣ 安裝 Node.js

🔗 https://nodejs.org/

請下載「LTS 版本」。
安裝後可在 CMD 測試：

node -v
npm -v


若能正常顯示版本號，代表成功。

2️⃣ 安裝 MySQL

🔗 https://dev.mysql.com/downloads/installer/

在安裝過程中：

建議版本：MySQL 8.0 或以上

務必設定 root 密碼（後續 server.js 需用相同密碼）

勾選「MySQL Server」與「MySQL Workbench」

安裝完後可在 CMD 測試：

mysql -u root -p


（輸入剛剛設定的密碼，若能進入 mysql> 表示成功）

3️⃣ 安裝 Ollama（本地 LLM）

🔗 https://ollama.ai/download

安裝後可直接執行：

ollama run llama3


第一次會自動下載模型，如未下載可手動執行：

ollama pull llama3

🧩 三、建立資料庫

開啟 CMD 進入 MySQL 安裝目錄：

cd "C:\Program Files\MySQL\MySQL Server 9.4\bin"
mysql -u root -p


在 MySQL 介面中執行 schema.sql 裡的指令（1～9 條 SQL 語句），建立資料表與初始資料。
例如：

SOURCE C:/LLMWeb/backend/schema.sql;


若成功建立資料表，MySQL 會顯示 Query OK。

🖥️ 四、啟動伺服器

開啟新的 CMD：

cd C:\LLMWeb\backend
node server.js


若看到 Server running on port 3000 或類似字樣，代表啟動成功。

瀏覽器開啟：

http://localhost:3000

🔐 五、測試帳號
帳號	密碼
test@example.com
	123456
# 🏃‍♂️ 運動員營養師 AI

一個專為運動員設計的智能營養管理系統，結合 AI 對話、飲食追蹤、食譜分析等功能，幫助運動員科學化管理飲食與訓練。

## ✨ 功能特色

### 🔐 使用者系統
- **雙重登入方式**
  - 傳統 Email + 密碼註冊登入
  - Google One Tap 快速登入
- **安全機制**
  - bcrypt 密碼加密
  - JWT Token 身份驗證
  - 密碼強度即時檢測

### 👤 個人資料管理
- 基本資料：姓名、生日、身高、體重
- 運動類型選擇：棒球、足球、綜合訓練
- 性別選擇
- 過敏與特殊飲食備註

### 🎯 目標設定
- 短期目標追蹤
- 長期目標規劃
- 個人化訓練與飲食目標

### 🍽️ 飲食記錄與分析
- **即時飲食記錄**
  - 食物名稱 + 克數記錄
  - 自動計算營養成分
- **視覺化圖表**
  - 營養素比例圓餅圖（蛋白質、碳水、脂肪）
  - 建議份數長條圖
  - 使用 Chart.js 動態渲染

### 🏋️ 運動習慣追蹤
- 每週訓練次數
- 單次訓練時長
- 飲食習慣分析（早餐、午餐、晚餐、宵夜）

### 🤖 AI 智能問答
- **Ollama Llama3 本地 AI**
  - 即時串流回應（打字機效果）
  - 繁體中文對話
  - 對話歷史儲存與讀取
  - 一鍵清除歷史功能
- **個人化建議**
  - 根據運動類型提供飲食建議
  - 賽前賽後營養指導
  - 訓練期營養規劃

### 📊 食譜營養分析
- **AI 食譜解析**
  - 自動分析食材與份量
  - 計算總熱量、蛋白質、碳水、脂肪、纖維
  - 即時 AI 分析回饋
- **食譜管理**
  - 儲存與讀取個人食譜
  - 食譜詳情查看
  - 營養成分視覺化展示

### 🗄️ 食物資料庫
- 食物資料新增與查詢
- 營養成分完整記錄
- 支援自訂食物類型與風味

## 🛠️ 技術架構

### 前端技術
- **HTML5 + CSS3**
  - 響應式設計
  - 現代化 UI/UX
  - 漸變背景與卡片式布局
- **原生 JavaScript (ES6+)**
  - 模組化程式設計
  - 記憶體儲存（替代 localStorage）
  - Fetch API 串流處理
- **Chart.js**
  - 圓餅圖、長條圖視覺化
- **Google Sign-In API**
  - One Tap 登入整合

### 後端技術
- **Node.js + Express.js**
  - RESTful API 設計
  - 中介層身份驗證
  - 錯誤處理機制
- **MySQL 資料庫**
  - 連線池管理
  - 交易處理（食譜儲存）
  - 外鍵關聯設計
- **身份驗證**
  - JWT Token 簽章與驗證
  - bcrypt 密碼加密
  - Google OAuth2 驗證
- **AI 整合**
  - Ollama Llama3 本地模型
  - Server-Sent Events (SSE) 串流
  - 子程序管理（spawn）

### 資料庫設計
```
users (使用者)
  ├── profiles (個人資料)
  ├── goals (目標)
  ├── diet_logs (飲食記錄)
  ├── habits (運動習慣)
  ├── chat_logs (對話歷史)
  └── recipes (食譜)
        ├── recipe_nutrition (營養成分)
        └── recipe_ingredients (食材清單)
```

## 📦 安裝與設定

### 環境需求
- Node.js (v16 或以上)
- MySQL (v8.0 或以上)
- Ollama (安裝 llama3 模型)

### 1. 安裝 Ollama 與 Llama3
```bash
# 下載 Ollama
https://ollama.ai/download

# 安裝 Llama3 模型
ollama pull llama3
```

### 2. 克隆專案
```bash
git clone <your-repo-url>
cd LLMWeb
```

### 3. 安裝相依套件
```bash
cd backend
npm install
```

### 4. 設定資料庫

**建立資料庫**
```sql
CREATE DATABASE userdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE userdb;
```

**執行資料表建立 SQL**
```sql
-- 使用者表
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  provider VARCHAR(50) DEFAULT 'local',
  google_id VARCHAR(255),
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 個人資料表
CREATE TABLE profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255),
  birthday DATE,
  height INT,
  weight INT,
  sportType VARCHAR(50) DEFAULT 'general',
  gender VARCHAR(20) DEFAULT 'male',
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 目標表
CREATE TABLE goals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  short_goal TEXT,
  long_goal TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 飲食記錄表
CREATE TABLE diet_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  food_name VARCHAR(255),
  grams INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 運動習慣表
CREATE TABLE habits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  freq_per_week INT,
  duration_min INT,
  meal_breakfast BOOLEAN DEFAULT FALSE,
  meal_lunch BOOLEAN DEFAULT FALSE,
  meal_dinner BOOLEAN DEFAULT FALSE,
  meal_late BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 對話歷史表
CREATE TABLE chat_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role VARCHAR(50),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 食物資料庫表
CREATE TABLE foods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  portion_size_per_day VARCHAR(100),
  cal_per_100g DECIMAL(10,2),
  carbon_per_100g DECIMAL(10,2),
  protein_per_100g DECIMAL(10,2),
  fats_per_100g DECIMAL(10,2),
  flavor VARCHAR(100),
  category VARCHAR(100),
  description TEXT
);

-- 食譜主表
CREATE TABLE recipes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  recipe_name VARCHAR(255) NOT NULL,
  recipe_content TEXT,
  servings INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 食譜營養成分表
CREATE TABLE recipe_nutrition (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipe_id INT NOT NULL,
  calories DECIMAL(10,2),
  protein DECIMAL(10,2),
  carbs DECIMAL(10,2),
  fat DECIMAL(10,2),
  fiber DECIMAL(10,2),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 食譜食材表
CREATE TABLE recipe_ingredients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recipe_id INT NOT NULL,
  ingredient_name VARCHAR(255),
  amount VARCHAR(100),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
```

### 5. 設定環境變數

修改 `backend/server.js` 中的資料庫連線資訊：
```javascript
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',           // 你的 MySQL 使用者名稱
  password: 'mysql1234',  // 你的 MySQL 密碼
  database: 'userdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### 6. 設定 Google OAuth (可選)

如果要使用 Google 登入功能：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google+ API
4. 建立 OAuth 2.0 憑證
5. 將 Client ID 更新到：
   - `server.js` 中的 `GOOGLE_CLIENT_ID`
   - `index.html` 中的 `data-client_id`

### 7. 啟動伺服器
```bash
# 在 backend 目錄下
node server.js
```

成功啟動後應該會看到：
```
✅ MySQL connected
🚀 Server running on http://localhost:3000
```

### 8. 開啟瀏覽器
```
http://localhost:3000
```

### 9. MYSQL
```
# 在 MySQL 中匯入你的 foodball 資料
mysql -u root -p
CREATE DATABASE foodball;
USE foodball;
SOURCE /path/to/your/foodball.sql;
```
## 📁 專案結構

```
LLMWeb/
├── backend/
│   ├── server.js           # Express 伺服器主程式
│   ├── package.json        # 後端相依套件
│   └── node_modules/       # 套件目錄
│
├── frontend/
│   ├── index.html          # 主頁面
│   ├── style.css           # 樣式表
│   └── script.js           # 前端邏輯
│
└── README.md               # 專案說明文件
```

## 🔌 API 端點說明

### 身份驗證
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/register` | 註冊新帳號 |
| POST | `/api/login` | 一般登入 |
| POST | `/api/google-login` | Google 登入 |

### 個人資料
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| GET | `/api/profile` | 取得個人資料 | ✅ |
| POST | `/api/profile` | 更新個人資料 | ✅ |

### 目標管理
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| GET | `/api/goals` | 取得目標 | ✅ |
| POST | `/api/goals` | 儲存目標 | ✅ |

### 飲食記錄
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| POST | `/api/diet` | 新增飲食記錄 | ✅ |
| GET | `/api/diet/logs` | 取得飲食記錄 | ✅ |

### 運動習慣
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| GET | `/api/habits` | 取得運動習慣 | ✅ |
| POST | `/api/habits` | 儲存運動習慣 | ✅ |

### AI 對話
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| POST | `/api/chat` | 發送訊息給 AI | ✅ |
| GET | `/api/chat/history` | 取得對話歷史 | ✅ |
| DELETE | `/api/chat/history` | 清除對話歷史 | ✅ |

### 食譜管理
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| POST | `/api/recipes/analyze` | AI 分析食譜 | ✅ |
| POST | `/api/recipes` | 儲存食譜 | ✅ |
| GET | `/api/recipes` | 取得食譜列表 | ✅ |
| GET | `/api/recipes/:id` | 取得食譜詳情 | ✅ |
| DELETE | `/api/recipes/:id` | 刪除食譜 | ✅ |

### 食物資料庫
| 方法 | 路徑 | 說明 | 需要驗證 |
|------|------|------|----------|
| GET | `/api/foods` | 取得食物列表 | ❌ |
| POST | `/api/foods` | 新增食物資料 | ❌ |

## 🎯 使用流程

### 1. 註冊與登入
1. 點擊「註冊」分頁
2. 輸入 Email 和密碼（至少 6 字元）
3. 系統會即時檢測密碼強度
4. 註冊成功後自動跳轉到登入頁
5. 或直接使用「Google 登入」按鈕

### 2. 設定個人資料
1. 登入後點擊「個人資訊」
2. 填寫姓名、生日、身高、體重
3. 選擇運動類型（棒球/足球/綜合訓練）
4. 備註過敏或特殊飲食需求
5. 點擊「儲存」

### 3. 設定訓練目標
1. 點擊「目標」分頁
2. 輸入短期目標（例如：一個月減重 2kg）
3. 輸入長期目標（例如：半年內跑完半馬）
4. 點擊「儲存目標」

### 4. 記錄飲食
1. 點擊「飲食紀錄 & 建議」
2. 輸入食物名稱和克數
3. 點擊「加入紀錄」
4. 系統自動更新營養圖表

### 5. AI 營養諮詢
1. 點擊「AI 問答」
2. 輸入問題（例如：明天有比賽，該吃什麼？）
3. AI 會即時回覆建議
4. 所有對話都會自動儲存

### 6. 食譜營養分析
1. 點擊「食譜營養分析」
2. 輸入食譜名稱和完整內容
3. 點擊「AI 分析營養成分」
4. 查看 AI 即時分析過程
5. 確認營養成分後點擊「儲存食譜」
6. 已儲存的食譜會顯示在下方列表

## 🐛 常見問題

### Q1: 啟動後顯示「MySQL connected」但網站無法開啟？
**A:** 檢查 `server.js` 最後是否有 `app.listen(PORT, ...)` 程式碼。

### Q2: AI 對話沒有回應？
**A:** 確認已安裝 Ollama 並執行 `ollama pull llama3`。

### Q3: Google 登入無法使用？
**A:** 檢查 Google Client ID 是否正確設定在 `server.js` 和 `index.html` 中。

### Q4: 資料庫連線失敗？
**A:** 檢查：
- MySQL 服務是否啟動
- 資料庫名稱、使用者、密碼是否正確
- 資料庫 `userdb` 是否已建立

### Q5: 食譜分析失敗？
**A:** 確認：
- Ollama 服務是否運行中
- Llama3 模型是否已下載
- 網路連線是否正常

## 🚀 未來功能規劃

- [ ] 圖片辨識食物功能
- [ ] 運動課表排程
- [ ] 體能數據追蹤（心率、血壓）
- [ ] 社群分享功能
- [ ] 營養師線上諮詢
- [ ] 手機 APP 版本
- [ ] 穿戴裝置整合
- [ ] 多語言支援

## 📄 授權

此專案僅供學習與研究使用。

## 👨‍💻 開發者

專案開發：運動員營養師 AI 團隊

## 🙏 致謝

- [Ollama](https://ollama.ai/) - 本地 AI 模型運行
- [Chart.js](https://www.chartjs.org/) - 圖表視覺化
- [Google Sign-In](https://developers.google.com/identity) - 快速登入整合
- [Express.js](https://expressjs.com/) - Node.js 框架
- [MySQL](https://www.mysql.com/) - 資料庫系統

---

💪 讓科技幫助運動員更健康、更強大！
| 問題                               | 原因                   | 解決方式                                                            |
| -------------------------------- | -------------------- | --------------------------------------------------------------- |
| ❌ `ER_ACCESS_DENIED_ERROR`       | MySQL 密碼錯誤           | 修改 `server.js` 中的資料庫設定，與 MySQL root 密碼一致                        |
| ❌ `Cannot find module 'express'` | npm 套件未安裝            | 執行 `npm install`                                                |
| ❌ `ollama not recognized`        | Ollama 未加入環境變數       | 重新開機，或手動加入 `C:\Users\<帳號>\AppData\Local\Programs\Ollama` 至 PATH |
| ❌ `Port already in use`          | 其他程式佔用 3000/5001 連接埠 | 修改 `server.js` 中的 port 或結束佔用程式                                  |
