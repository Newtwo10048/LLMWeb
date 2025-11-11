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

| 問題                               | 原因                   | 解決方式                                                            |
| -------------------------------- | -------------------- | --------------------------------------------------------------- |
| ❌ `ER_ACCESS_DENIED_ERROR`       | MySQL 密碼錯誤           | 修改 `server.js` 中的資料庫設定，與 MySQL root 密碼一致                        |
| ❌ `Cannot find module 'express'` | npm 套件未安裝            | 執行 `npm install`                                                |
| ❌ `ollama not recognized`        | Ollama 未加入環境變數       | 重新開機，或手動加入 `C:\Users\<帳號>\AppData\Local\Programs\Ollama` 至 PATH |
| ❌ `Port already in use`          | 其他程式佔用 3000/5001 連接埠 | 修改 `server.js` 中的 port 或結束佔用程式                                  |
