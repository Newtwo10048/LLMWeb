// ---- Tabs ----
document.querySelectorAll('#mainTabs .tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const token = localStorage.getItem('token');
    if(!token && btn.dataset.panel !== 'loginPanel'){
      alert("請先登入");
      return;
    }
    document.querySelectorAll('#mainTabs .tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panelCard').forEach(p=>p.style.display='none');
    document.getElementById(btn.dataset.panel).style.display='block';
  })
})

// ---- 登入 ----
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if(res.ok){
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', email);
      document.getElementById('loginHint').textContent = '登入成功';
      unlockPanels();
      document.querySelector('[data-panel="profilePanel"]').click();
      loadProfile(email);
    } else {
      document.getElementById('loginHint').textContent = data.error;
    }
  } catch(err){
    document.getElementById('loginHint').textContent = "伺服器錯誤";
  }
});

// ---- 登出 ----
const logoutBtn = document.createElement('button');
  logoutBtn.id = "logoutBtn";
  logoutBtn.type = "button";
  logoutBtn.textContent = "登出";
  logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  alert("已登出");
  location.reload();
});
document.querySelector('header').appendChild(logoutBtn);

// ---- Token 驗證 ----
async function verifyToken(token){
  try{
    const res = await fetch("http://localhost:3000/api/verify-token", {
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
  updateCharts(); // ✅ 初始化圖表
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

// ---- 載入 Profile ----
async function loadProfile(email){
  const token = localStorage.getItem('token');
  const res = await fetch("http://localhost:3000/api/profile", {
    method: "GET",
    headers: { "Authorization": "Bearer " + token }
  });
  if(res.ok){
    const profile = await res.json();
    document.getElementById("name").value = profile.name;
    document.getElementById("height").value = profile.height;
    document.getElementById("weight").value = profile.weight;
    document.getElementById("sportType").value = profile.sport;
  }
}

// ---- 頁面載入時檢查 token ----
window.addEventListener('load', async ()=>{
  const token = localStorage.getItem('token');
  if(token){
    const email = await verifyToken(token);
    if(email){
      document.getElementById('loginHint').textContent = '已登入';
      unlockPanels();
      loadProfile(email);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      document.getElementById('loginHint').textContent = '請重新登入';
    }
  }
});
document.getElementById("askBtn").addEventListener("click", async () => {
  const input = document.getElementById("qaInput");
  const responseBox = document.getElementById("qaResponse");
  const message = input.value.trim();
  if (!message) return;

  responseBox.innerHTML = "⏳ 等待 AI 回覆中...";

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await res.json();

    // 逐字打字效果
    responseBox.innerHTML = "";
    let i = 0;
    const interval = setInterval(() => {
      responseBox.innerHTML += data.reply[i];
      i++;
      if (i >= data.reply.length) clearInterval(interval);
    }, 30); // 每 30ms 打一個字

  } catch (err) {
    responseBox.innerHTML = "❌ 錯誤：" + err.message;
  }
});
