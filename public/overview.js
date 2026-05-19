/* ═══════════════════════════════════════════════
   overview.js — Wazuh Dashboard (เชื่อม 3 CARDS)
   ✅ ดึงข้อมูล API จริง + อัปเดต Charts
═══════════════════════════════════════════════ */

const PROXY = 'http://localhost:3001';
const REFRESH_INTERVAL = 30000; // 30 วินาที

// ═══════════════════════════════════════════════
// 🔐 LOGIN CHECK
// ═══════════════════════════════════════════════
(function checkLogin() {
    const user = sessionStorage.getItem("saved_username");
    if (!user) {
        window.location.href = 'login.html'; 
    }
})();

// ═══════════════════════════════════════════════
// 📊 MAIN LOAD FUNCTION - ส่วนหลักที่ดึงข้อมูลจาก API
// ═══════════════════════════════════════════════
async function loadAll() {
  const loader = document.getElementById('loadingOverlay');
  const errorBanner = document.getElementById('errorBanner');
  const errorMsg = document.getElementById('errorMsg');

  if (loader) loader.style.display = 'flex';

  try {
    console.log(`📡 [${new Date().toLocaleTimeString()}] Fetching API...`);
    
    // ➊ ขอข้อมูลจาก backend server
    const response = await fetch(`${PROXY}/api/overview`);
    console.log('📊 HTTP Status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // ➋ แปลงข้อมูล JSON
    const data = await response.json();
    console.log('✅ Data received:', data);

    // ➌ อัปเดต Dashboard
    updateDashboardUI(data);
    
    // ➍ ซ่อน error banner
    if (errorBanner) errorBanner.style.display = 'none';
    
    console.log('🎨 Dashboard updated successfully');

  } catch (err) {
    console.error('❌ Error:', err.message);
    
    // แสดง error message
    if (errorBanner) {
      errorBanner.style.display = 'flex';
      errorMsg.textContent = `⚠️ ${err.message} - Retrying...`;
    }
  } finally {
    if (loader) loader.style.display = 'none';
    updateTimestamp();
  }
}

// ═══════════════════════════════════════════════
// 🎨 UPDATE DASHBOARD UI
// ═══════════════════════════════════════════════
function updateDashboardUI(data) {
  if (!data) return;

  // ► KPI Cards - ตัวเลขใหญ่ๆ ตรงบน
  setTxt('riskScore', data.riskScore || 0);
  setTxt('critCount', data.criticalAlerts || 0);
  setTxt('totalEvents', data.totalEvents || 0);
  setTxt('activeCount', data.agents?.active || 0);
  setTxt('disconnCount', data.agents?.disconnected || 0);

  // ► Risk Score Color
  const riskEl = document.getElementById('riskScore');
  if (riskEl) {
    const risk = data.riskScore || 0;
    if (risk >= 80) {
      riskEl.style.color = '#e53e3e'; // Red - High Risk
    } else if (risk >= 50) {
      riskEl.style.color = '#ed8936'; // Orange - Medium Risk
    } else {
      riskEl.style.color = '#38a169'; // Green - Low Risk
    }
  }

  // ► Severity breakdown
  setTxt('sevCrit', data.severity?.critical || 0);
  setTxt('sevHigh', data.severity?.high || 0);
  setTxt('sevMed', data.severity?.medium || 0);
  setTxt('sevLow', data.severity?.low || 0);

  // ► Sparklines
  const rand = (base, n) => Array.from({ length: n }, () => base * (0.7 + Math.random() * 0.6));
  drawSparkline('sparkRisk',  [data.riskScore || 50, ...rand(data.riskScore || 50, 11)], '#d69e2e');
  drawSparkline('sparkCrit',  rand(Math.max(1, data.criticalAlerts || 1), 12), '#e53e3e');
  drawSparkline('sparkTotal', rand(Math.max(10, data.totalEvents || 100), 12), '#38a169');

  // ► Charts - อัปเดต 3 CARDS
  drawDonut(data.agents?.active || 0, data.agents?.disconnected || 0);
  
  // ✅ UPDATE 3 CARDS จากข้อมูล API
  console.log('📊 Updating 3 cards with data:');
  console.log('   - topAlertTypes:', data.topAlertTypes);
  console.log('   - topMitre:', data.topMitre);
  console.log('   - topAgents:', data.topAgents);
  
  drawPieTypes(data.topAlertTypes || []);      // CARD 1: Top 5 Alert Types
  drawPieMitre(data.topMitre || []);           // CARD 2: Top 10 MITRE
  renderAgentsTable(data.topAgents || []);     // CARD 3: Top 5 Agents
  
  // ► Tables
  renderAlerts(data.latestAlerts || [], data.wazuhDashboardUrl || 'https://172.15.0.38/app/');
}

// ═══════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  
  if (typeof val === 'number') {
    el.textContent = val.toLocaleString('th-TH');
  } else {
    el.textContent = val || '0';
  }
}

function updateTimestamp() {
  const el = document.getElementById('lastUpdate');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('th-TH');
  }
}

// ═══════════════════════════════════════════════
// 📊 CHART RENDERING FUNCTIONS
// ═══════════════════════════════════════════════

const PIE_COLORS = [
  '#e57373', '#ffb74d', '#fff176', '#aed581', '#4dd0e1',
  '#7986cb', '#f06292', '#a1887f', '#90a4ae', '#ce93d8'
];

const TEAL_SHADES = [
  '#00695c', '#00897b', '#26a69a', '#4db6ac', '#80cbc4',
  '#b2dfdb', '#1de9b6', '#64ffda', '#a7ffeb', '#e0f2f1'
];

let donutChart, pieTypesChart, pieMitreChart;

// ► Sparkline
function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = 90;
  canvas.height = 36;
  
  if (!data || data.length === 0) {
    ctx.clearRect(0, 0, 90, 36);
    return;
  }
  
  const mx = Math.max(...data);
  const mn = Math.min(...data);
  const range = mx - mn || 1;
  
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 90,
    y: 36 - ((v - mn) / range) * 32 - 2
  }));
  
  ctx.clearRect(0, 0, 90, 36);
  
  // พื้นที่ใต้เส้น
  ctx.beginPath();
  ctx.moveTo(pts[0].x, 36);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, 36);
  ctx.fillStyle = color + '33';
  ctx.fill();
  
  // เส้นกราฟ
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

// ► Donut Chart - Agents
function drawDonut(active, disconnected) {
  const el = document.getElementById('donutAgents');
  if (!el) return;
  
  if (donutChart) donutChart.destroy();
  
  donutChart = new Chart(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [active, disconnected],
        backgroundColor: ['#4c6ef5', '#e53e3e'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// ► Pie Chart - CARD 1: Alert Types ⚠️
function drawPieTypes(data) {
  const el = document.getElementById('pieAlertTypes');
  if (!el) return;
  
  console.log('🎨 Drawing Alert Types Chart:', data);
  
  if (pieTypesChart) pieTypesChart.destroy();
  
  // ถ้าไม่มีข้อมูล แสดงข้อความ
  if (!data || data.length === 0) {
    const legend = document.getElementById('alertTypesLegend');
    if (legend) {
      legend.innerHTML = '<div class="legend-item" style="color:#999">No data available</div>';
    }
    return;
  }
  
  pieTypesChart = new Chart(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: PIE_COLORS.slice(0, data.length),
        borderWidth: 0
      }]
    },
    options: {
      cutout: '55%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 8,
          titleFont: { size: 12 },
          bodyFont: { size: 11 }
        }
      }
    }
  });
  
  // สร้าง Legend ด้านข้าง
  const legend = document.getElementById('alertTypesLegend');
  if (legend) {
    legend.innerHTML = data.map((d, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></span>
        <span class="legend-name">${d.name.substring(0, 25)}</span>
        <span class="legend-count">(${d.count})</span>
      </div>`).join('');
  }
}

// ► Pie Chart - CARD 2: MITRE ATT&CKS 🎯
function drawPieMitre(data) {
  const el = document.getElementById('pieMitre');
  if (!el) return;
  
  console.log('🎨 Drawing MITRE Chart:', data);
  
  if (pieMitreChart) pieMitreChart.destroy();
  
  // ถ้าไม่มีข้อมูล แสดงข้อความ
  if (!data || data.length === 0) {
    const list = document.getElementById('mitreList');
    if (list) {
      list.innerHTML = '<div class="legend-item" style="color:#999">No data available</div>';
    }
    return;
  }
  
  pieMitreChart = new Chart(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: TEAL_SHADES.slice(0, data.length),
        borderWidth: 0
      }]
    },
    options: {
      cutout: '55%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 8,
          titleFont: { size: 12 },
          bodyFont: { size: 11 }
        }
      }
    }
  });
  
  // สร้าง List ด้านข้าง
  const list = document.getElementById('mitreList');
  if (list) {
    list.innerHTML = data.map((d, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${TEAL_SHADES[i % TEAL_SHADES.length]}"></span>
        <span class="legend-name">${d.name}</span>
        <span class="legend-count">(${d.count})</span>
      </div>`).join('');
  }
}

// ═══════════════════════════════════════════════
// 📋 RENDER TABLES / LISTS
// ═══════════════════════════════════════════════

// ► CARD 3: Render Agents List 🖥️
function renderAgentsTable(agents) {
  const list = document.getElementById('agentsList');
  if (!list) return;
  
  console.log('📋 Rendering Agents Table:', agents);
  
  if (!agents || agents.length === 0) {
    list.innerHTML = '<li style="color:#999;text-align:center;padding:20px">No agents available</li>';
    return;
  }
  
  list.innerHTML = agents.map((a, i) => `
    <li>
      <span class="agent-rank">${i + 1}</span>
      <span class="agent-icon">🖥️</span>
      <span class="agent-name">${a.name || '-'}</span>
      <span class="agent-events">${(a.events || 0).toLocaleString('th-TH')}</span>
    </li>`).join('');
}

// ► Render Alerts Table
function renderAlerts(alerts, wazuhUrl) {
  const body = document.getElementById('alertsBody');
  if (!body) return;

  body.innerHTML = (alerts || []).map(a => {
    const lvl = a.level || 0;
    const cls = lvl >= 12 ? 'lvl-crit' : lvl >= 7 ? 'lvl-8' : lvl >= 5 ? 'lvl-5' : 'lvl-3';
    const ts = a.timestamp?.substring(0, 19).replace('T', ' ') || '-';
    const desc = (a.description || '-').substring(0, 40);
    
    return `<tr>
      <td class="ts">${ts}</td>
      <td><span class="level-badge ${cls}">${lvl}</span></td>
      <td style="font-family:monospace;font-size:11px">${a.ruleId || '-'}</td>
      <td class="truncate" title="${a.description || '-'}">${desc}</td>
      <td><strong>${a.agentName || '-'}</strong></td>
      <td><a class="view-link" href="${wazuhUrl}" target="_blank">View ↗</a></td>
    </tr>`;
  }).join('');
  
  if (alerts.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999">No alerts</td></tr>';
  }
}

// ═══════════════════════════════════════════════
// 🔄 INITIALIZATION & AUTO-REFRESH
// ═══════════════════════════════════════════════

console.log('🚀 Dashboard initializing...');
loadAll();  // โหลดข้อมูลครั้งแรก

// Auto-refresh ทุก 30 วินาที
const refreshInterval = setInterval(() => {
  console.log('🔄 Auto-refreshing...');
  loadAll();
}, REFRESH_INTERVAL);

// Manual refresh button (ถ้ามี)
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    console.log('👆 Manual refresh clicked');
    loadAll();
  });
}

// ═══════════════════════════════════════════════
// 🔌 API DROPDOWN MENU
// ═══════════════════════════════════════════════

const apiBtn = document.getElementById('apiBtn');
const apiMenu = document.getElementById('apiMenu');

if (apiBtn) {
    apiBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        apiMenu.classList.toggle('show');
        
        const arrow = apiBtn.querySelector('.arrow');
        if (apiMenu.classList.contains('show')) {
            arrow.style.transform = 'rotate(180deg)';
        } else {
            arrow.style.transform = 'rotate(0deg)';
        }
    });
}

function changeAPI(apiName) {
    const apiLabel = document.getElementById('apiDefault');
    if (apiLabel) {
        apiLabel.innerText = apiName;
    }
    if (apiMenu) apiMenu.classList.remove('show');
    console.log("Switched to API:", apiName);
}

window.addEventListener('click', function() {
    if (apiMenu && apiMenu.classList.contains('show')) {
        apiMenu.classList.remove('show');
    }
});