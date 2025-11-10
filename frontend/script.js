// ==================== Memory Storage (替代 localStorage) ====================
// 由於 Claude.ai 環境不支援 localStorage，使用記憶體物件儲存登入狀態
const memory = {
  token: null,           // JWT 登入憑證
  email: null,           // 使用者 Email
  userName: null,        // 使用者名稱 (Google 登入時使用)
  userPicture: null,     // 使用者頭像 URL (Google 登入時使用)
  athlete_logs: []       // 飲食記錄快取
};

// ==================== 統一的 API 請求函數 ====================
/**
 * 統一處理所有 API 請求
 * @param {string} url - API 端點 URL
 * @param {object} options - Fetch 選項 (method, body, headers 等)
 * @returns {Promise<object>} API 回應的 JSON 資料
 */
async function apiRequest(url, options = {}) {
  console.log('🌐 發送請求:', url, options.method || 'GET');
  
  // 設定預設 headers
  const headers = { 
    'Content-Type': 'application/json',
    ...options.headers 
  };

  // 自動附加 JWT token (除非明確設定 includeAuth: false)
  if (memory.token && options.includeAuth !== false) {
    headers['Authorization'] = `Bearer ${memory.token}`;
    console.log('🔑 使用 Token:', memory.token.substring(0, 20) + '...');
  }

  const config = {
    ...options,
    headers
  };

  try {
    console.log('⏳ 等待回應...');
    const response = await fetch(url, config);
    
    console.log('📨 收到回應:', response.status, response.statusText);
    
    // 檢查 HTTP 狀態碼
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ API 錯誤回應:', text);
      throw new Error(`API Error (${response.status}): ${text}`);
    }

    const data = await response.json();
    console.log('✅ 解析成功:', data);
    return data;
  } catch (err) {
    console.error('❌ API Request 錯誤:', err);
    console.error('錯誤詳情:', {
      url,
      method: options.method || 'GET',
      hasToken: !!memory.token,
      error: err.message
    });
    throw err;
  }
}

// ==================== 分頁切換 ====================
// 為所有頁籤按鈕添加點擊事件監聽器
document.querySelectorAll('#mainTabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const token = memory.token;
    
    // 檢查是否已登入 (登入/註冊頁除外)
    if (!token && btn.dataset.panel !== 'loginPanel' && btn.dataset.panel !== 'registerPanel') {
      alert("請先登入");
      return;
    }
    
    // 切換 active 狀態
    document.querySelectorAll('#mainTabs .tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 顯示對應的面板
    document.querySelectorAll('.panelCard').forEach(p => p.style.display = 'none');
    document.getElementById(btn.dataset.panel).style.display = 'block';
  });
});

// ==================== 註冊功能 ====================
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM 載入完成');

  // 取得註冊表單元素
  const registerBtn = document.getElementById('register-btn');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const confirmInput = document.getElementById('register-confirm');
  const msgEl = document.getElementById('register-msg');
  const strengthFill = document.getElementById('strengthFill');
  const reqLength = document.getElementById('req-length');
  const reqLetter = document.getElementById('req-letter');
  const reqNumber = document.getElementById('req-number');

  if (!registerBtn) {
    console.warn('⚠️ 註冊按鈕不存在，跳過註冊功能初始化');
    return;
  }

  // ==================== 密碼強度即時檢測 ====================
  passwordInput?.addEventListener('input', function(e) {
    const password = e.target.value;
    let strength = 0; // 強度計數器

    // 檢查長度 (至少 6 個字元)
    if (password.length >= 6) {
      reqLength?.classList.add('valid');
      strength++;
    } else {
      reqLength?.classList.remove('valid');
    }

    // 檢查是否包含英文字母
    if (/[a-zA-Z]/.test(password)) {
      reqLetter?.classList.add('valid');
      strength++;
    } else {
      reqLetter?.classList.remove('valid');
    }

    // 檢查是否包含數字
    if (/[0-9]/.test(password)) {
      reqNumber?.classList.add('valid');
      strength++;
    } else {
      reqNumber?.classList.remove('valid');
    }

    // 更新強度指示條
    if (strengthFill) {
      strengthFill.className = 'strength-fill';
      if (strength === 1) strengthFill.classList.add('strength-weak');       // 弱
      else if (strength === 2) strengthFill.classList.add('strength-medium'); // 中
      else if (strength === 3) strengthFill.classList.add('strength-strong'); // 強
    }
  });

  /**
   * 顯示註冊訊息
   * @param {string} message - 訊息內容
   * @param {string} type - 訊息類型 (success/error/info)
   */
  function showMessage(message, type) {
    if (msgEl) {
      msgEl.textContent = message;
      msgEl.className = `register-msg show ${type}`;
    }
  }

  /**
   * 清除輸入框錯誤樣式
   */
  function clearErrors() {
    emailInput?.classList.remove('error');
    passwordInput?.classList.remove('error');
    confirmInput?.classList.remove('error');
  }

  /**
   * 驗證 Email 格式
   * @param {string} email - Email 字串
   * @returns {boolean} 是否為有效 Email
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ==================== 註冊按鈕點擊事件 ====================
  registerBtn.addEventListener('click', async function() {
    if (msgEl) msgEl.className = 'register-msg';
    clearErrors();

    // 取得表單資料
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;
    const confirm = confirmInput?.value;

    // 驗證：檢查是否有空欄位
    if (!email || !password || !confirm) {
      if (!email) emailInput?.classList.add('error');
      if (!password) passwordInput?.classList.add('error');
      if (!confirm) confirmInput?.classList.add('error');
      showMessage('請填寫所有欄位', 'error');
      return;
    }

    // 驗證：Email 格式
    if (!isValidEmail(email)) {
      emailInput?.classList.add('error');
      showMessage('請輸入有效的 Email 格式', 'error');
      return;
    }

    // 驗證：密碼長度
    if (password.length < 6) {
      passwordInput?.classList.add('error');
      showMessage('密碼至少需要 6 個字元', 'error');
      return;
    }

    // 驗證：密碼確認
    if (password !== confirm) {
      passwordInput?.classList.add('error');
      confirmInput?.classList.add('error');
      showMessage('兩次密碼輸入不一致', 'error');
      return;
    }

    try {
      showMessage('註冊中...', 'info');
      registerBtn.disabled = true;
      registerBtn.textContent = '註冊中...';

      // 呼叫註冊 API
      const data = await apiRequest('http://localhost:3000/api/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        includeAuth: false // 註冊時不需要 token
      });

      showMessage(data.message || '註冊成功！', 'success');

      // 清空表單
      emailInput.value = '';
      passwordInput.value = '';
      confirmInput.value = '';

      // 重置密碼強度指示
      if (strengthFill) strengthFill.className = 'strength-fill';
      reqLength?.classList.remove('valid');
      reqLetter?.classList.remove('valid');
      reqNumber?.classList.remove('valid');

      // 2 秒後跳轉到登入頁
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);

    } catch (err) {
      showMessage(err.message || '網路錯誤，請檢查連線後再試', 'error');
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = '註冊帳號';
    }
  });

  // Enter 鍵快速註冊
  confirmInput?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') registerBtn.click();
  });
});

// ==================== 一般登入 ====================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault(); // 防止表單預設提交行為
  console.log('🔐 開始登入流程');
  
  // 取得表單資料
  const email = document.getElementById('loginEmail')?.value;
  const pass = document.getElementById('loginPass')?.value;
  const loginHint = document.getElementById('loginHint');

  try {
    // 呼叫登入 API
    const data = await apiRequest("http://localhost:3000/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
      includeAuth: false // 登入時還沒有 token
    });

    if (data.token) {
      // ✅ 儲存 JWT token 到 memory
      memory.token = data.token;
      memory.email = email;
      
      console.log('✅ Token 已儲存:', memory.token.substring(0, 20) + '...');
      
      if (loginHint) loginHint.textContent = '登入成功';
      
      // 解鎖所有功能面板
      unlockPanels();
      
      // 並行載入所有使用者資料
      await Promise.all([
        loadProfile(),      // 個人資料
        loadGoals(),        // 目標設定
        loadDietLogs(),     // 飲食記錄
        loadHabits(),       // 運動習慣
        loadChatHistory()   // 對話歷史
      ]);
      
      console.log('✅ 所有資料載入完成');
      
      // 自動切換到個人資料頁
      document.querySelector('[data-panel="profilePanel"]')?.click();
    } else {
      if (loginHint) loginHint.textContent = data.message || '登入失敗';
    }
  } catch(err) {
    console.error('❌ 登入錯誤:', err);
    if (loginHint) loginHint.textContent = "網路錯誤：" + err.message;
  }
});

// ==================== Google 登入 ====================
/**
 * 處理 Google One Tap 登入回應
 * @param {object} response - Google 回傳的憑證物件
 */
window.handleGoogleLogin = async function(response) {
  console.log("=== Google 登入流程開始 ===");
  
  if (!response.credential) {
    alert("❌ 沒有收到 Google credential");
    return;
  }
  
  try {
    // 將 Google token 傳送到後端驗證
    const data = await apiRequest("http://localhost:3000/api/google-login", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential }),
      includeAuth: false
    });
    
    if (data.user) {
      // ✅ 儲存使用者資訊到 memory
      memory.email = data.user.email;
      memory.userName = data.user.name;
      memory.userPicture = data.user.avatar_url;
      memory.token = data.token;
      
      console.log('✅ Google 登入成功，Token 已儲存');
      
      const loginHint = document.getElementById('loginHint');
      if (loginHint) {
        loginHint.textContent = `歡迎 ${data.user.name}!`;
        loginHint.style.color = 'green';
      }
      
      unlockPanels();
      
      // 延遲 0.5 秒後切換頁面並載入資料
      setTimeout(async () => {
        document.querySelector('.tab[data-panel="profilePanel"]')?.click();
        
        await Promise.all([
          loadProfile(),
          loadGoals(),
          loadDietLogs(),
          loadHabits(),
          loadChatHistory()
        ]);
        
        console.log('✅ 資料載入完成');
      }, 500);
      
    }
  } catch (err) {
    console.error("❌ Google 登入錯誤:", err);
    alert("Google 登入失敗：" + err.message);
  }
};

// ==================== 登出 ====================
// 動態建立登出按鈕
const logoutBtn = document.createElement('button');
logoutBtn.id = "logoutBtn";
logoutBtn.type = "button";
logoutBtn.textContent = "登出";
logoutBtn.addEventListener('click', () => {
  // 清空所有 memory 資料
  memory.token = null;
  memory.email = null;
  memory.userName = null;
  memory.userPicture = null;
  memory.athlete_logs = [];
  
  // 重新載入頁面 (回到登入狀態)
  location.reload();
});
document.querySelector('header')?.appendChild(logoutBtn);

// ==================== 解鎖面板 ====================
/**
 * 登入成功後解鎖所有功能面板
 */
function unlockPanels() {
  document.querySelectorAll('.panelCard').forEach(p => p.classList.remove('locked'));
  updateCharts(); // 更新圖表
}

// ==================== Profile 個人資料 ====================
/**
 * 從後端載入個人資料
 */
async function loadProfile() {
  if (!memory.token) {
    console.warn('⚠️ 無 token，跳過載入個人資料');
    return;
  }
  
  console.log('📥 載入個人資料...');
  
  try {
    const data = await apiRequest("http://localhost:3000/api/profile");
    
    console.log('✅ 個人資料載入成功:', data);
    
    // 填入表單
    const nameEl = document.getElementById("name");
    const bdayEl = document.getElementById("birthday");
    const heightEl = document.getElementById("height");
    const weightEl = document.getElementById("weight");
    const sportEl = document.getElementById("sportType");
    const genderEl = document.getElementById("gender");
    const notesEl = document.getElementById("notes");
    
    if (nameEl) nameEl.value = data.name || '';
    if (bdayEl) bdayEl.value = data.birthday || '';
    if (heightEl) heightEl.value = data.height || '';
    if (weightEl) weightEl.value = data.weight || '';
    if (sportEl) sportEl.value = data.sportType || 'general';
    if (genderEl) genderEl.value = data.gender || 'male';
    if (notesEl) notesEl.value = data.notes || '';
  } catch (err) {
    console.error('❌ 載入個人資料失敗:', err);
  }
}

/**
 * 儲存個人資料到後端
 */
document.getElementById('saveProfile')?.addEventListener('click', async () => {
  if (!memory.token) return alert("請先登入");

  // 收集表單資料
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
    const result = await apiRequest("http://localhost:3000/api/profile", {
      method: "POST",
      body: JSON.stringify(data)
    });

    alert(result.message || "已儲存完成");
  } catch (err) {
    console.error(err);
    alert("儲存失敗，請稍後再試");
  }
});

// ==================== Goals 目標 ====================
/**
 * 從後端載入目標設定
 */
async function loadGoals() {
  if (!memory.token) {
    console.warn('⚠️ 無 token，跳過載入目標');
    return;
  }
  
  console.log('📥 載入目標...');
  
  try {
    const data = await apiRequest("http://localhost:3000/api/goals");
    
    console.log('✅ 目標載入成功:', data);
    
    // 填入表單
    const shortEl = document.getElementById("goalShort");
    const longEl = document.getElementById("goalLong");
    if (shortEl) shortEl.value = data.short_goal || "";
    if (longEl) longEl.value = data.long_goal || "";
  } catch (err) {
    console.error('❌ 載入目標失敗:', err);
  }
}

/**
 * 儲存目標設定到後端
 */
document.getElementById("saveGoals")?.addEventListener("click", async () => {
  if (!memory.token) return alert("請先登入");
  
  const short_goal = document.getElementById("goalShort")?.value || '';
  const long_goal = document.getElementById("goalLong")?.value || '';
  
  try {
    await apiRequest("http://localhost:3000/api/goals", {
      method: "POST",
      body: JSON.stringify({ short_goal, long_goal })
    });
    alert("目標已儲存");
  } catch (err) {
    console.error('儲存目標失敗:', err);
    alert("儲存失敗，請稍後再試");
  }
});

// ==================== Diet Logs 飲食記錄 ====================
/**
 * 從後端載入飲食記錄
 */
async function loadDietLogs() {
  if (!memory.token) {
    console.warn('⚠️ 無 token，跳過載入飲食記錄');
    return;
  }
  
  console.log('📥 載入飲食記錄...');
  
  try {
    const data = await apiRequest("http://localhost:3000/api/diet/logs");
    
    console.log('✅ 飲食記錄載入成功:', data);
    
    const box = document.getElementById("logs");
    
    // 驗證資料格式
    if (!Array.isArray(data)) {
      console.warn('⚠️ 飲食記錄格式錯誤:', data);
      if (box) box.innerHTML = '<div class="muted">暫無飲食記錄</div>';
      return;
    }
    
    // 渲染記錄列表
    if (box) {
      if (data.length === 0) {
        box.innerHTML = '<div class="muted">暫無飲食記錄</div>';
      } else {
        box.innerHTML = data.map(d => 
          `<div>${d.food_name} ${d.grams}g (${d.created_at || ''})</div>`
        ).join("");
      }
    }
    
    // 更新 memory 快取
    memory.athlete_logs = data;
  } catch (err) {
    console.error('❌ 載入飲食記錄失敗:', err);
  }
}

/**
 * 新增飲食記錄
 */
document.getElementById("addLog")?.addEventListener("click", async () => {
  if (!memory.token) return alert("請先登入");
  
  const food_name = document.getElementById("foodName")?.value?.trim() || '';
  const grams = document.getElementById("foodGrams")?.value || 0;
  
  // 驗證輸入
  if (!food_name || grams <= 0) {
    return alert('請輸入食物名稱與克數');
  }
  
  try {
    await apiRequest("http://localhost:3000/api/diet", {
      method: "POST",
      body: JSON.stringify({ food_name, grams })
    });
    
    // 清空表單
    const nameEl = document.getElementById("foodName");
    const gramsEl = document.getElementById("foodGrams");
    if (nameEl) nameEl.value = '';
    if (gramsEl) gramsEl.value = '';
    
    // 重新載入記錄並更新圖表
    await loadDietLogs();
    updateCharts();
  } catch (err) {
    console.error('新增飲食記錄失敗:', err);
    alert('新增失敗，請稍後再試');
  }
});

// ==================== Habits 運動習慣 ====================
/**
 * 從後端載入運動習慣
 */
async function loadHabits() {
  if (!memory.token) {
    console.warn('⚠️ 無 token，跳過載入運動習慣');
    return;
  }
  
  console.log('📥 載入運動習慣...');
  
  try {
    const h = await apiRequest("http://localhost:3000/api/habits");
    
    console.log('✅ 運動習慣載入成功:', h);
    
    // 填入表單
    const freqEl = document.getElementById("freqPerWeek");
    const durEl = document.getElementById("durationMin");
    const bfEl = document.getElementById("mealBreakfast");
    const lunchEl = document.getElementById("mealLunch");
    const dinnerEl = document.getElementById("mealDinner");
    const lateEl = document.getElementById("mealLate");
    
    if (freqEl) freqEl.value = h.freq_per_week || "";
    if (durEl) durEl.value = h.duration_min || "";
    if (bfEl) bfEl.checked = h.meal_breakfast || false;
    if (lunchEl) lunchEl.checked = h.meal_lunch || false;
    if (dinnerEl) dinnerEl.checked = h.meal_dinner || false;
    if (lateEl) lateEl.checked = h.meal_late || false;
  } catch (err) {
    console.error('❌ 載入運動習慣失敗:', err);
  }
}

/**
 * 儲存運動習慣到後端
 */
document.getElementById("saveHabits")?.addEventListener("click", async () => {
  if (!memory.token) return alert("請先登入");
  
  // 收集表單資料
  const payload = {
    freq_per_week: +(document.getElementById("freqPerWeek")?.value || 0),
    duration_min: +(document.getElementById("durationMin")?.value || 0),
    meal_breakfast: document.getElementById("mealBreakfast")?.checked || false,
    meal_lunch: document.getElementById("mealLunch")?.checked || false,
    meal_dinner: document.getElementById("mealDinner")?.checked || false,
    meal_late: document.getElementById("mealLate")?.checked || false,
  };
  
  try {
    await apiRequest("http://localhost:3000/api/habits", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    alert("運動習慣已儲存");
  } catch (err) {
    console.error('儲存運動習慣失敗:', err);
    alert("儲存失敗，請稍後再試");
  }
});

// ==================== Chart.js 圖表 ====================
let pieChart, barChart; // 圖表實例

/**
 * 更新營養圖表 (圓餅圖 + 長條圖)
 */
function updateCharts() {
  const logs = memory.athlete_logs || [];
  
  // 計算總克數
  const total = logs.reduce((s, l) => s + (parseInt(l.grams) || 0), 0) || 1;
  
  // 簡易營養估算 (30% 蛋白質, 50% 碳水, 20% 脂肪)
  const protein = Math.round(total * 0.3);
  const carbs = Math.round(total * 0.5);
  const fat = Math.max(total - protein - carbs, 0);
  
  // 計算建議份數 (100g = 1 份)
  const servings = Math.ceil(total / 100);

  // ==================== 圓餅圖 (營養比例) ====================
  const pieCtx = document.getElementById('pieChart');
  if (!pieCtx) return;
  
  if (!pieChart) {
    // 初次建立圖表
    pieChart = new Chart(pieCtx.getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['蛋白質 (估) g', '碳水 (估) g', '脂肪 (估) g'],
        datasets: [{ 
          data: [protein, carbs, fat], 
          backgroundColor: ['#36a2eb', '#ffcd56', '#ff6384'] 
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
          legend: { position: 'bottom' } 
        } 
      }
    });
  } else {
    // 更新現有圖表
    pieChart.data.datasets[0].data = [protein, carbs, fat];
    pieChart.update();
  }

  // ==================== 長條圖 (建議份數) ====================
  const barCtx = document.getElementById('servingChart');
  if (!barCtx) return;
  
  if (!barChart) {
    // 初次建立圖表
    barChart = new Chart(barCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['建議份數'],
        datasets: [{ 
          label: '建議份數 (100g 為 1 份)', 
          data: [servings], 
          backgroundColor: '#4bc0c0' 
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { 
          y: { beginAtZero: true } 
        } 
      }
    });
  } else {
    // 更新現有圖表
    barChart.data.datasets[0].data = [servings];
    barChart.update();
  }
}

// ==================== Chat History 對話歷史 ====================
window.userHistories = []; // 全域變數儲存對話歷史

/**
 * 從後端載入對話歷史
 */
async function loadChatHistory() {
  if (!memory.token) {
    console.warn('⚠️ 無 token，跳過載入對話歷史');
    return;
  }
  
  console.log('📥 載入對話歷史...');
  
  const responseBox = document.getElementById("qaResponse");
  if (!responseBox) return;
  
  responseBox.innerHTML = "";

  try {
    const history = await apiRequest("http://localhost:3000/api/chat/history");

    console.log("✅ 對話歷史載入成功：", history);

    if (Array.isArray(history)) {
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
    
    // 捲動到最新訊息
    responseBox.scrollTop = responseBox.scrollHeight;
  } catch (err) {
    console.error("❌ 載入歷史對話失敗：", err);
  }
}

/**
 * 清除所有對話歷史
 */
async function clearChatHistory() {
  if (!memory.token) return alert("請先登入");
  
  if (!confirm("確定要清除所有對話歷史嗎？此操作無法復原。")) return;
  
  try {
    const data = await apiRequest("http://localhost:3000/api/chat/history", {
      method: "DELETE"
    });
    
    const responseBox = document.getElementById("qaResponse");
    if (responseBox) responseBox.innerHTML = '<div class="system-msg">對話歷史已清除</div>';
    
    // 清空全域歷史
    window.userHistories = [];
    
    alert(data.message || "對話歷史已清除");
  } catch (err) {
    console.error("清除對話歷史失敗：", err);
    alert("清除失敗，請稍後再試");
  }
}

// ==================== Chat AI 對話功能 ====================
/**
 * 發送訊息給 AI 並接收串流回應
 */
document.getElementById("askBtn")?.addEventListener("click", async () => {
  if (!memory.token) return alert("請先登入");
  
  const input = document.getElementById("qaInput");
  const responseBox = document.getElementById("qaResponse");
  if (!input || !responseBox) return;
  
  const message = input.value.trim();
  if (!message) return;

  // 顯示使用者訊息
  responseBox.innerHTML += `<div class="user-msg">你：${message}</div>`;

  // 建立 AI 回應區塊 (顯示載入中)
  const aiDiv = document.createElement("div");
  aiDiv.className = "ai-msg";
  aiDiv.innerHTML = "AI：⏳ AI思考中...";
  responseBox.appendChild(aiDiv);

  try {
    // 呼叫 Chat API (使用串流模式)
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + memory.token
      },
      body: JSON.stringify({ message })
    });

    aiDiv.innerHTML = "AI：";
    
    // 建立串流讀取器
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let aiReply = ""; // 完整回應文字
    
    // 逐字元讀取並顯示 (打字機效果)
    while (true) {
      const { done, value } = await reader.read();
      if (done) break; // 串流結束
      
      const chunkText = decoder.decode(value);

      // 逐字元顯示 (換行符轉為 <br>)
      for (const char of chunkText) {
        if (char === "\n") aiDiv.innerHTML += "<br>";
        else aiDiv.innerHTML += char;
        await new Promise(r => setTimeout(r, 15)); // 15ms 延遲
      }
      
      aiReply += chunkText;
    }

    // 儲存對話到全域歷史
    window.userHistories.push({ role: "user", content: message });
    window.userHistories.push({ role: "assistant", content: aiReply });
    
    // 捲動到最新訊息
    responseBox.scrollTop = responseBox.scrollHeight;

  } catch (err) {
    aiDiv.innerHTML = "❌ 錯誤：" + err.message;
  }

  // 清空輸入框
  input.value = "";
});

// ==================== 初始化 ====================
/**
 * 頁面載入完成後的初始化流程
 */
window.addEventListener('load', async () => {
  console.log('🚀 頁面載入完成，檢查登入狀態...');
  
  // 檢查是否有 token (用於頁面重新整理時)
  if (memory.token) {
    console.log('✅ 發現已登入，載入資料...');
    unlockPanels();
    
    // 並行載入所有資料
    await Promise.all([
      loadProfile(),
      loadGoals(),
      loadDietLogs(),
      loadHabits(),
      loadChatHistory()
    ]);
  } else {
    console.log('⚠️ 未登入');
  }
});