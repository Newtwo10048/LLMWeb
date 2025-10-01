// ---- Tabs ----
document.querySelectorAll('#mainTabs .tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const token = localStorage.getItem('token');
    if(!token && btn.dataset.panel !== 'loginPanel' && btn.dataset.panel !== 'registerPanel'){
      alert("請先登入");
      return;
    }
    document.querySelectorAll('#mainTabs .tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panelCard').forEach(p=>p.style.display='none');
    document.getElementById(btn.dataset.panel).style.display='block';
  });
});

// ---- 登入 ----
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if(res.ok && data.token){
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', email);
      document.getElementById('loginHint').textContent = '登入成功';
      unlockPanels();
      document.querySelector('[data-panel="profilePanel"]').click();
      loadProfile();
      loadLogs();
    } else {
      document.getElementById('loginHint').textContent = data.message || '登入失敗';
    }
  } catch(err){
    document.getElementById('loginHint').textContent = "網路錯誤：" + err.message;
  }
});

// ---- 註冊 ----
document.getElementById("register-btn").addEventListener("click", async () => {
  const msgEl = document.getElementById("register-msg");
  msgEl.textContent = "";
  const email = (document.getElementById("email").value || "").trim();
  const password = document.getElementById("password").value || "";
  if(!email || !password){ msgEl.textContent="請輸入帳號與密碼"; return; }

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    msgEl.textContent = data.message || "註冊成功";
  } catch(e){ msgEl.textContent="網路錯誤"; }
});

// ---- 登出 ----
const logoutBtn = document.createElement('button');
logoutBtn.id="logoutBtn"; logoutBtn.type="button"; logoutBtn.textContent="登出";
logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  location.reload();
});
document.querySelector('header').appendChild(logoutBtn);

// ---- Token 驗證 ----
async function verifyToken(token){
  try{
    const res = await fetch("/api/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    return res.ok && data.valid ? data.email : null;
  } catch(e){ return null; }
}
function unlockPanels() {
  document.querySelectorAll('.panelCard').forEach(p => p.classList.remove('locked'));
  updateCharts();
}

// ---- Profile ----
async function loadProfile(){
  const token = localStorage.getItem("token");
  if(!token) return;
  const res = await fetch("/api/profile", { headers: { "Authorization":"Bearer "+token } });
  if(res.ok){
    const data = await res.json();
    document.getElementById("name").value = data.name || '';
    document.getElementById("birthday").value = data.birthday || '';
    document.getElementById("height").value = data.height || '';
    document.getElementById("weight").value = data.weight || '';
    document.getElementById("sportType").value = data.sportType || 'general';
    document.getElementById("gender").value = data.gender || 'male';
    document.getElementById("notes").value = data.notes || '';
  }
}
document.getElementById('loadProfile').addEventListener('click', loadProfile);
window.addEventListener("DOMContentLoaded", loadProfile);


document.getElementById('saveProfile').addEventListener('click', async ()=>{
  const token = localStorage.getItem("token");
  if(!token) return alert("請先登入");

  const data = {
    name: document.getElementById("name").value,
    birthday: document.getElementById("birthday").value,
    height: parseInt(document.getElementById("height").value)||0,
    weight: parseInt(document.getElementById("weight").value)||0,
    sportType: document.getElementById("sportType").value,
    gender: document.getElementById("gender").value,
    notes: document.getElementById("notes").value
  };

  const res = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":"Bearer "+token },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  
  // alert 顯示儲存成功的資料
  if(result.profile){
    alert(`儲存成功！\n\n` +
      `姓名: ${result.profile.name}\n` +
      `生日: ${result.profile.birthday}\n` +
      `身高: ${result.profile.height}\n` +
      `體重: ${result.profile.weight}\n` +
      `運動類型: ${result.profile.sportType}\n` +
      `性別: ${result.profile.gender}\n` +
      `備註: ${result.profile.notes}`
    );
  } else {
    alert(result.message || '已儲存ok');
  }
});




async function delLog(id){
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/logs/${id}`, {
    method:"DELETE",
    headers:{ "Authorization":"Bearer "+token }
  });
  const data = await res.json();
  if(data.deleted){
    logs = logs.filter(l=>l.id!==id);
    renderLogs();
    updateCharts();
  }
}
// ---- Local storage helpers ----
function saveLocal(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function loadLocal(key) {
  return JSON.parse(localStorage.getItem(key) || "null");
}

// ---- Diet logs ----
let logs = loadLocal('athlete_logs') || [];

function renderLogs() {
  const el = document.getElementById('logs');
  el.innerHTML = '';
  logs.forEach((r, i) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;padding:6px 0">
        <div>${r.name} — ${r.grams} g 
          <span class='muted'>(${new Date(r.t).toLocaleString()})</span>
        </div>
        <div><button data-i='${i}' class='del'>刪除</button></div>
      </div>`;
    el.appendChild(div);
  });

  document.querySelectorAll('.del').forEach(b => b.addEventListener('click', (e) => {
    const i = +e.target.dataset.i;
    logs.splice(i, 1);
    saveLocal('athlete_logs', logs);
    renderLogs();
    updateCharts();
  }));
}


document.getElementById('addLog').addEventListener('click', () => {
  const name = document.getElementById('foodName').value;
  const grams = +document.getElementById('foodGrams').value || 0;
  if (!name || grams <= 0) return alert('請輸入食物名稱與克數');
  logs.unshift({ name, grams, t: Date.now() });
  saveLocal('athlete_logs', logs);
  renderLogs();
  updateCharts();
});

renderLogs();
// ---- Chart.js ----
let pieChart, barChart;

function updateCharts() {
  const total = logs.reduce((s, l) => s + l.grams, 0) || 1;
  const protein = Math.round(total * 0.3);
  const carbs = Math.round(total * 0.5);
  const fat = Math.max(total - protein - carbs, 0);
  const servings = Math.ceil(total / 100);

  // ✅ 營養素圓餅圖
  if (!pieChart) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['蛋白質 (估) g', '碳水 (估) g', '脂肪 (估) g'],
        datasets: [{ data: [protein, carbs, fat], backgroundColor: ['#36a2eb', '#ffcd56', '#ff6384'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  } else {
    pieChart.data.datasets[0].data = [protein, carbs, fat];
    pieChart.update();
  }

  // ✅ 建議份數柱狀圖
  if (!barChart) {
    const ctx2 = document.getElementById('servingChart').getContext('2d');
    barChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['建議份數'],
        datasets: [{ label: '建議份數 (100g 為 1 份)', data: [servings], backgroundColor: '#4bc0c0' }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  } else {
    barChart.data.datasets[0].data = [servings];
    barChart.update();
  }
}

// ---- 初始化 ----
window.addEventListener('load', async ()=>{
  const token = localStorage.getItem("token");
  if(token){
    const email = await verifyToken(token);
    if(email){
      document.getElementById('loginHint').textContent = '已登入';
      unlockPanels();
      loadProfile();
      loadLogs();
    } else {
      localStorage.removeItem('token');
      document.getElementById('loginHint').textContent = '請重新登入';
    }
  }
});
document.getElementById("askBtn").addEventListener("click", async () => {
  const input = document.getElementById("qaInput");
  const responseBox = document.getElementById("qaResponse");
  const message = input.value.trim();
  if (!message) return;

  // 先把使用者訊息加入對話框
  responseBox.innerHTML += `<div class="user-msg">你：${message}</div>`;

  // 建立 AI 回覆容器，先顯示思考中
  const aiDiv = document.createElement("div");
  aiDiv.className = "ai-msg";
  aiDiv.innerHTML = "⏳ AI思考中...";
  responseBox.appendChild(aiDiv);

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    aiDiv.innerHTML = ""; // 清空思考中

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value);

      for (const char of chunkText) {
        if (char === "\n") aiDiv.innerHTML += "<br>";
        else aiDiv.innerHTML += char;
        await new Promise(r => setTimeout(r, 30)); // 打字機效果
      }
    }

    // 滾動到最新訊息
    responseBox.scrollTop = responseBox.scrollHeight;

  } catch (err) {
    aiDiv.innerHTML = "❌ 錯誤：" + err.message;
  }

  input.value = ""; // 清空輸入框
});
