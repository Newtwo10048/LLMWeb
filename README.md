一、安裝
下載這三個
https://nodejs.org/
https://dev.mysql.com/downloads/installer/
https://ollama.ai/download

啟用伺服器(用CMD
cd C:\LLMWeb\backend
node server.js

用CMD進入mysql模式，執行schema.sql檔裡的程式1.~9.
cd C:\Program Files\MySQL\MySQL Server 9.4\bin
mysql -u root -p

安裝llama3(這個是llm)
$ollama pull llama3

網站
http://localhost:3000

測試用帳密
test@example.com 123456
