
// ---- Memory Storage (替代 localStorage) ----
const memory = {
  token: null,
  email: null,
  athlete_logs: []
};

// ---- Tabs ----
document.querySelectorAll('#mainTabs .tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const token = memory.token;
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
/// 確保 DOM 完全載入
    console.log('🚀 註冊頁面腳本載入');

// 確保 DOM 完全載入
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM 載入完成');

  // === 獲取所有元素 ===
  const registerBtn = document.getElementById('register-btn');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm');
  const msgEl = document.getElementById('register-msg');
  const strengthFill = document.getElementById('strengthFill');
  const reqLength = document.getElementById('req-length');
  const reqLetter = document.getElementById('req-letter');
  const reqNumber = document.getElementById('req-number');

  // 檢查元素是否存在
  console.log('元素檢查:', {
    registerBtn: !!registerBtn,
    emailInput: !!emailInput,
    passwordInput: !!passwordInput,
    confirmInput: !!confirmInput,
    msgEl: !!msgEl
  });

  if (!registerBtn || !emailInput || !passwordInput || !confirmInput || !msgEl) {
    console.error('❌ 缺少必要的 DOM 元素');
    return;
  }

  // === 密碼強度檢測 ===
  passwordInput.addEventListener('input', function(e) {
    const password = e.target.value;
    let strength = 0;

    // 檢查長度
    if (password.length >= 6) {
      reqLength.classList.add('valid');
      strength++;
    } else {
      reqLength.classList.remove('valid');
    }

    // 檢查字母
    if (/[a-zA-Z]/.test(password)) {
      reqLetter.classList.add('valid');
      strength++;
    } else {
      reqLetter.classList.remove('valid');
    }

    // 檢查數字
    if (/[0-9]/.test(password)) {
      reqNumber.classList.add('valid');
      strength++;
    } else {
      reqNumber.classList.remove('valid');
    }

    // 更新強度條
    strengthFill.className = 'strength-fill';
    if (strength === 1) strengthFill.classList.add('strength-weak');
    else if (strength === 2) strengthFill.classList.add('strength-medium');
    else if (strength === 3) strengthFill.classList.add('strength-strong');
  });

  // === 輔助函數：顯示訊息 ===
  function showMessage(message, type) {
    console.log(`📢 訊息: [${type}] ${message}`);
    msgEl.textContent = message;
    msgEl.className = `register-msg show ${type}`;
  }

  // === 輔助函數：清除所有錯誤樣式 ===
  function clearErrors() {
    emailInput.classList.remove('error');
    passwordInput.classList.remove('error');
    confirmInput.classList.remove('error');
  }

  // === 輔助函數：驗證 Email 格式 ===
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // === 註冊按鈕事件 ===
  registerBtn.addEventListener('click', async function() {
    console.log('🔘 註冊按鈕被點擊');

    // 清空訊息和錯誤樣式
    msgEl.className = 'register-msg';
    clearErrors();

    // 獲取輸入值
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    console.log('📝 輸入值:', {
      email: email ? '✓' : '✗',
      password: password ? '✓' : '✗',
      confirm: confirm ? '✓' : '✗'
    });

    // === 前端驗證 ===

    // 1. 檢查是否為空
    if (!email || !password || !confirm) {
      console.warn('⚠️ 驗證失敗: 欄位為空');
      if (!email) emailInput.classList.add('error');
      if (!password) passwordInput.classList.add('error');
      if (!confirm) confirmInput.classList.add('error');
      showMessage('請填寫所有欄位', 'error');
      return;
    }

    // 2. Email 格式驗證
    if (!isValidEmail(email)) {
      console.warn('⚠️ 驗證失敗: Email 格式不正確');
      emailInput.classList.add('error');
      showMessage('請輸入有效的 Email 格式', 'error');
      return;
    }

    // 3. 密碼長度驗證
    if (password.length < 6) {
      console.warn('⚠️ 驗證失敗: 密碼太短');
      passwordInput.classList.add('error');
      showMessage('密碼至少需要 6 個字元', 'error');
      return;
    }

    // 4. 密碼確認
    if (password !== confirm) {
      console.warn('⚠️ 驗證失敗: 密碼不一致');
      passwordInput.classList.add('error');
      confirmInput.classList.add('error');
      showMessage('兩次密碼輸入不一致', 'error');
      return;
    }

    console.log('✅ 前端驗證通過，準備發送請求');

    // === 發送註冊請求 ===
    try {
      showMessage('註冊中...', 'info');
      registerBtn.disabled = true;
      registerBtn.textContent = '註冊中...';

      console.log('📤 發送 POST 請求到 /api/register');

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('📥 收到回應:', res.status, res.statusText);

      const data = await res.json();
      console.log('📦 回應資料:', data);

      if (res.ok) {
        // 註冊成功
        console.log('🎉 註冊成功!');
        showMessage(data.message || '註冊成功！', 'success');

        // 清空表單
        emailInput.value = '';
        passwordInput.value = '';
        confirmInput.value = '';

        // 重置密碼強度指示器
        strengthFill.className = 'strength-fill';
        reqLength.classList.remove('valid');
        reqLetter.classList.remove('valid');
        reqNumber.classList.remove('valid');

        // 2秒後跳轉到登入頁
        setTimeout(() => {
          console.log('🔄 跳轉到登入頁面');
          window.location.href = 'index.html';
        }, 2000);

      } else {
        // 註冊失敗
        console.error('❌ 註冊失敗:', data.message);
        showMessage(data.message || '註冊失敗', 'error');
        
        // 如果是 Email 重複，標記 Email 輸入框
        if (data.message && data.message.includes('Email')) {
          emailInput.classList.add('error');
        }
      }

    } catch (err) {
      console.error('🔥 請求錯誤:', err);
      showMessage('網路錯誤，請檢查連線後再試', 'error');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = '註冊帳號';
    }
  });

  // === Enter 鍵提交 ===
  confirmInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      console.log('⌨️ Enter 鍵觸發註冊');
      registerBtn.click();
    }
  });

  console.log('✅ 事件監聽器已設置完成');
});


    // 切換到登入頁
    /*
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      // 這裡可以切換到登入頁面
      window.location.href = '/login.html';
    });
    */
// ---- 登入 ----
document.getElementById('loginForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value;
  const pass = document.getElementById('loginPass')?.value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if(res.ok && data.token){
      memory.token = data.token;
      memory.email = email;
      document.getElementById('loginHint').textContent = '登入成功';
      unlockPanels();
      document.querySelector('[data-panel="profilePanel"]')?.click();
      loadProfile();
      loadGoals();
      loadDietLogs();
      loadHabits();
      loadChatHistory();
    } else {
      document.getElementById('loginHint').textContent = data.message || '登入失敗';
    }
  } catch(err){
    document.getElementById('loginHint').textContent = "網路錯誤：" + err.message;
  }
});
//google
window.onGoogleLibraryLoad = () => {
  google.accounts.id.initialize({
    client_id: "1012981023049-l4nvkheq3s0ql1hokvn4uofsl2h4pr5r.apps.googleusercontent.com",
    callback: (response) => {
      console.log("credential", response.credential);
      // 這裡可以 POST 到後端
    }
  });
};

// ---- 註冊 ----
document.getElementById("register-btn")?.addEventListener("click", async () => {
  const msgEl = document.getElementById("register-msg");
  if(msgEl) msgEl.textContent = "";
  const email = (document.getElementById("email")?.value || "").trim();
  const password = document.getElementById("password")?.value || "";
  if(!email || !password){ 
    if(msgEl) msgEl.textContent="請輸入帳號與密碼"; 
    return; 
  }

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(msgEl) msgEl.textContent = data.message || "註冊成功";
  } catch(e){ 
    if(msgEl) msgEl.textContent="網路錯誤"; 
  }
});

// ---- 登出 ----
const logoutBtn = document.createElement('button');
logoutBtn.id="logoutBtn"; logoutBtn.type="button"; logoutBtn.textContent="登出";
logoutBtn.addEventListener('click', ()=>{
  memory.token = null;
  memory.email = null;
  memory.athlete_logs = [];
  location.reload();
});
document.querySelector('header')?.appendChild(logoutBtn);

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
  const token = memory.token;
  if(!token) return;
  try {
    const res = await fetch("/api/profile", { headers: { "Authorization":"Bearer "+token } });
    if(res.ok){
      const data = await res.json();
      const nameEl = document.getElementById("name");
      const bdayEl = document.getElementById("birthday");
      const heightEl = document.getElementById("height");
      const weightEl = document.getElementById("weight");
      const sportEl = document.getElementById("sportType");
      const genderEl = document.getElementById("gender");
      const notesEl = document.getElementById("notes");
      
      if(nameEl) nameEl.value = data.name || '';
      if(bdayEl) bdayEl.value = data.birthday || '';
      if(heightEl) heightEl.value = data.height || '';
      if(weightEl) weightEl.value = data.weight || '';
      if(sportEl) sportEl.value = data.sportType || 'general';
      if(genderEl) genderEl.value = data.gender || 'male';
      if(notesEl) notesEl.value = data.notes || '';
    }
  } catch(err) {
    console.error('載入個人資料失敗:', err);
  }
}

document.getElementById('loadProfile')?.addEventListener('click', loadProfile);
window.addEventListener("DOMContentLoaded", loadProfile);

document.getElementById('saveProfile')?.addEventListener('click', async () => {
  const token = memory.token;
  if(!token) return alert("請先登入");

  const data = {
    name: document.getElementById("name")?.value || '',
    birthday: document.getElementById("birthday")?.value || '',
    height: parseInt(document.getElementById("height")?.value) || null,
    weight: parseInt(document.getElementById("weight")?.value) || null,
    sportType: document.getElementById("sportType")?.value || 'general',
    gender: document.getElementById("gender")?.value || 'male',
    notes: document.getElementById("notes")?.value || ''
  };

  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { 
        "Content-Type":"application/json", 
        "Authorization":"Bearer " + token 
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    if (result.profile) {
      alert(`儲存成功！\n\n` +
            `姓名: ${result.profile.name}\n` +
            `生日: ${result.profile.birthday}\n` +
            `身高: ${result.profile.height}\n` +
            `體重: ${result.profile.weight}\n` +
            `運動類型: ${result.profile.sportType}\n` +
            `性別: ${result.profile.gender}\n` +
            `備註: ${result.profile.notes}`);
    } else {
      alert(result.message || "已儲存完成");
    }
  } catch (err) {
    console.error(err);
    alert("儲存失敗，請稍後再試");
  }
});

// ---- Goals ----
document.getElementById("saveGoals")?.addEventListener("click", async () => {
  const token = memory.token;
  const short_goal = document.getElementById("goalShort")?.value || '';
  const long_goal = document.getElementById("goalLong")?.value || '';
  
  try {
    await fetch("http://localhost:3000/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ short_goal, long_goal })
    });
    alert("目標已儲存");
  } catch(err) {
    console.error('儲存目標失敗:', err);
    alert("儲存失敗，請稍後再試");
  }
});

async function loadGoals() {
  const token = memory.token;
  if(!token) return;
  
  try {
    const res = await fetch("http://localhost:3000/api/goals", { 
      headers: { "Authorization": "Bearer " + token } 
    });
    const data = await res.json();
    
    const shortEl = document.getElementById("goalShort");
    const longEl = document.getElementById("goalLong");
    if(shortEl) shortEl.value = data.short_goal || "";
    if(longEl) longEl.value = data.long_goal || "";
  } catch(err) {
    console.error('載入目標失敗:', err);
  }
}

// ---- Diet Logs ----
async function loadDietLogs() {
  const token = memory.token;
  if(!token) return;
  
  try {
    const res = await fetch("http://localhost:3000/api/diet/logs", { 
      headers: { "Authorization": "Bearer " + token } 
    });
    const data = await res.json();
    const box = document.getElementById("logs");
    
    // 防止 data 不是陣列
    if(!Array.isArray(data)) {
      console.warn('飲食記錄格式錯誤:', data);
      if(box) box.innerHTML = '<div class="muted">暫無飲食記錄</div>';
      return;
    }
    
    if(box) {
      box.innerHTML = data.map(d => 
        `<div>${d.food_name} ${d.grams}g (${d.created_at || ''})</div>`
      ).join("");
    }
  } catch(err) {
    console.error('載入飲食記錄失敗:', err);
  }
}

document.getElementById("addLog")?.addEventListener("click", async () => {
  const token = memory.token;
  const food_name = document.getElementById("foodName")?.value?.trim() || '';
  const grams = document.getElementById("foodGrams")?.value || 0;
  
  if(!food_name || grams <= 0) {
    return alert('請輸入食物名稱與克數');
  }
  
  try {
    await fetch("http://localhost:3000/api/diet", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ food_name, grams })
    });
    
    // 清空輸入
    const nameEl = document.getElementById("foodName");
    const gramsEl = document.getElementById("foodGrams");
    if(nameEl) nameEl.value = '';
    if(gramsEl) gramsEl.value = '';
    
    loadDietLogs(); // 更新畫面
    updateCharts();
  } catch(err) {
    console.error('新增飲食記錄失敗:', err);
    alert('新增失敗，請稍後再試');
  }
});

// ---- Habits ----
document.getElementById("saveHabits")?.addEventListener("click", async () => {
  const token = memory.token;
  const payload = {
    freq_per_week: +(document.getElementById("freqPerWeek")?.value || 0),
    duration_min: +(document.getElementById("durationMin")?.value || 0),
    meal_breakfast: document.getElementById("mealBreakfast")?.checked || false,
    meal_lunch: document.getElementById("mealLunch")?.checked || false,
    meal_dinner: document.getElementById("mealDinner")?.checked || false,
    meal_late: document.getElementById("mealLate")?.checked || false,
  };
  
  try {
    await fetch("http://localhost:3000/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(payload)
    });
    alert("運動習慣已儲存");
  } catch(err) {
    console.error('儲存運動習慣失敗:', err);
    alert("儲存失敗，請稍後再試");
  }
});

async function loadHabits() {
  const token = memory.token;
  if(!token) return;
  
  try {
    const res = await fetch("http://localhost:3000/api/habits", { 
      headers: { "Authorization": "Bearer " + token } 
    });
    const h = await res.json();
    
    const freqEl = document.getElementById("freqPerWeek");
    const durEl = document.getElementById("durationMin");
    const bfEl = document.getElementById("mealBreakfast");
    const lunchEl = document.getElementById("mealLunch");
    const dinnerEl = document.getElementById("mealDinner");
    const lateEl = document.getElementById("mealLate");
    
    if(freqEl) freqEl.value = h.freq_per_week || "";
    if(durEl) durEl.value = h.duration_min || "";
    if(bfEl) bfEl.checked = h.meal_breakfast || false;
    if(lunchEl) lunchEl.checked = h.meal_lunch || false;
    if(dinnerEl) dinnerEl.checked = h.meal_dinner || false;
    if(lateEl) lateEl.checked = h.meal_late || false;
  } catch(err) {
    console.error('載入運動習慣失敗:', err);
  }
}

// ---- Chart.js ----
let pieChart, barChart;

function updateCharts() {
  const logs = memory.athlete_logs || [];
  const total = logs.reduce((s, l) => s + l.grams, 0) || 1;
  const protein = Math.round(total * 0.3);
  const carbs = Math.round(total * 0.5);
  const fat = Math.max(total - protein - carbs, 0);
  const servings = Math.ceil(total / 100);

  // 營養素圓餅圖
  const pieCtx = document.getElementById('pieChart');
  if(!pieCtx) return;
  
  if (!pieChart) {
    pieChart = new Chart(pieCtx.getContext('2d'), {
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

  // 建議份數柱狀圖
  const barCtx = document.getElementById('servingChart');
  if(!barCtx) return;
  
  if (!barChart) {
    barChart = new Chart(barCtx.getContext('2d'), {
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

// ---- Chat History ----
window.userHistories = [];

async function loadChatHistory() {
  const token = memory.token;
  if(!token) return;
  
  const responseBox = document.getElementById("qaResponse");
  if(!responseBox) return;
  
  responseBox.innerHTML = "";

  try {
    const res = await fetch("http://localhost:3000/api/chat/history", {
      headers: { "Authorization": "Bearer " + token }
    });
    const history = await res.json();

    console.log("載入的歷史紀錄：", history);

    if(Array.isArray(history)) {
      history.forEach(m => {
        if (m.role === "user") {
          responseBox.innerHTML += `<div class="user-msg">你：${m.content}</div>`;
          window.userHistories.push({ role: "user", content: m.content });
        } else {
          responseBox.innerHTML += `<div class="ai-msg">AI：${m.content}</div>`;
          window.userHistories.push({ role: "assistant", content: m.content });
        }
      });
    }
    
    responseBox.scrollTop = responseBox.scrollHeight;
  } catch (err) {
    console.error("載入歷史對話失敗：", err);
  }
}

// 清除對話歷史
async function clearChatHistory() {
  const token = memory.token;
  if(!token) return alert("請先登入");
  
  if(!confirm("確定要清除所有對話歷史嗎？此操作無法復原。")) {
    return;
  }
  
  try {
    const res = await fetch("http://localhost:3000/api/chat/history", {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    
    const data = await res.json();
    
    if(res.ok) {
      // 清空前端顯示
      const responseBox = document.getElementById("qaResponse");
      if(responseBox) responseBox.innerHTML = '<div class="system-msg">對話歷史已清除</div>';
      
      // 清空記憶體
      window.userHistories = [];
      
      alert(data.message || "對話歷史已清除");
    } else {
      alert("清除失敗：" + (data.error || "未知錯誤"));
    }
  } catch(err) {
    console.error("清除對話歷史失敗：", err);
    alert("清除失敗，請稍後再試");
  }
}

// ---- Chat ----
document.getElementById("askBtn")?.addEventListener("click", async () => {
  const input = document.getElementById("qaInput");
  const responseBox = document.getElementById("qaResponse");
  if(!input || !responseBox) return;
  
  const message = input.value.trim();
  if (!message) return;

  responseBox.innerHTML += `<div class="user-msg">你：${message}</div>`;

  const aiDiv = document.createElement("div");
  aiDiv.className = "ai-msg";
  aiDiv.innerHTML = "AI：⏳ AI思考中...";
  responseBox.appendChild(aiDiv);

  try {
    const token = memory.token;
    const historyText = (window.userHistories || []).map(m =>
      `${m.role === "user" ? "User" : "AI"}: ${m.content}`
    ).join("\n");

    window.userHistories.push({ role: "user", content: message });

    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ message, history: historyText })
    });

    aiDiv.innerHTML = "AI：";
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let aiReply = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value);

      for (const char of chunkText) {
        if (char === "\n") aiDiv.innerHTML += "<br>";
        else aiDiv.innerHTML += char;
        await new Promise(r => setTimeout(r, 15));
      }
      aiReply += chunkText;
    }

    window.userHistories.push({ role: "assistant", content: aiReply });
    responseBox.scrollTop = responseBox.scrollHeight;

  } catch (err) {
    aiDiv.innerHTML = "❌ 錯誤：" + err.message;
  }

  input.value = "";
});

// ---- 初始化 ----
window.addEventListener('load', async ()=>{
  const token = memory.token;

  if(token){
    const email = await verifyToken(token);
    if(email){
      document.getElementById('loginHint').textContent = '已登入';
      unlockPanels();
      loadProfile();
      loadGoals();
      loadDietLogs();
      loadHabits();
      loadChatHistory();
    } else {
      memory.token = null;
      document.getElementById('loginHint').textContent = '請重新登入';
    }
  }
});

const form = document.getElementById('foodForm');
const foodList = document.getElementById('foodList');

document.getElementById("addFood").addEventListener("click", async (e) => {
  e.preventDefault();

  const data = {
    foodname: form.foodname.value,
    portion_size_per_day: form.portion.value,
    cal_per_100g: form.cal.value,
    carbon_per_100g: form.carbon.value,
    protein_per_100g: form.protein.value,
    fats_per_100g: form.fats.value,
    flavor: form.flavor.value,
    category: form.category.value,
    description: form.desc.value
  };

  const res = await fetch('/foods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const msg = await res.text();
  alert(msg);
  form.reset();
  loadFoods();
});

async function loadFoods() {
  const res = await fetch('/foods');
  const foods = await res.json();
  foodList.innerHTML = foods
    .map(f => `
      <p>
        <b>${f.name}</b> (${f.category}) - ${f.cal_per_100g} kcal/100g<br>
        Flavor: ${f.flavor}, Carbon: ${f.carbon_per_100g}, Protein: ${f.protein_per_100g}, Fat: ${f.fats_per_100g}<br>
        Portion: ${f.portion_size_per_day}<br>
        Description: ${f.description}
      </p>
    `)
    .join('');
}

document.addEventListener("DOMContentLoaded", () => {
  loadFoods();
});