const PROXY = 'http://localhost:3001'; 
let agentsData = []; // สร้างตัวแปรว่างๆ ไว้รับข้อมูลจริง

// 1. ฟังก์ชันดึงข้อมูลจริงจาก Server
async function fetchWazuhAgents() {
    try {
        const response = await fetch(`${PROXY}/api/wazuh-agents`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        let rawData = await response.json();
        
        // ❌ เอา Agent ID '000' ออกจากการแสดงผล
        agentsData = rawData.filter(agent => agent.id !== '000');
        
        console.log("✅ โหลดข้อมูล Agent จริงสำเร็จ:", agentsData.length, "เครื่อง (ไม่รวม 000)");

        // 📊 อัปเดตตัวเลขในการ์ดด้านบน
        updateNewStatCards();

        // 🛠️ เช็คก่อนว่า URL มีการแนบ ?status=... มา
        const urlParams = new URLSearchParams(window.location.search);
        const statusFilter = urlParams.get('status');
        
        const pageCountEl = document.getElementById('page-agent-count');

        if (statusFilter) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = `status=${statusFilter.toLowerCase()}`;
            
            const filtered = agentsData.filter(agent => 
                (agent.status || '').toLowerCase() === statusFilter.toLowerCase()
            );

            if (pageCountEl) pageCountEl.innerText = `(${filtered.length})`;
            renderTable(filtered);
        } else {
            if (pageCountEl) pageCountEl.innerText = `(${agentsData.length})`;
            renderTable(agentsData);
        }

    } catch (error) {
        console.error("❌ Error fetching agents:", error);
    }
}

// 2. ฟังก์ชันอัปเดตตัวเลขและลิสต์ Top 5 (OS & Groups)
function updateNewStatCards() {
    const active = agentsData.filter(a => a.status === 'active').length;
    const disconnected = agentsData.filter(a => a.status === 'disconnected').length;

    const activeEl = document.getElementById('stat-active');
    const disconnectedEl = document.getElementById('stat-disconnected');

    if (activeEl) activeEl.innerText = active;
    if (disconnectedEl) disconnectedEl.innerText = disconnected;

    // --- จัดการ Top 5 OS ---
    // ตัวอย่างส่วนการนับ OS ที่ได้มาจาก agentsData
let osCounts = {};

agentsData.forEach(agent => {
    let osRaw = (agent.os && agent.os.name) ? agent.os.name : (typeof agent.os === 'string' ? agent.os : 'Unknown');
    
    let osName = osRaw;
    
    // 🛠️ ตรวจสอบถ้ามีคำว่า Windows ให้ยุบเหลือแค่ "Windows" สั้น ๆ ตัวเดียว
    if (osRaw.toLowerCase().includes('windows')) {
        osName = 'Windows';
    } else if (osRaw.toLowerCase().includes('ubuntu') || osRaw.toLowerCase().includes('linux')) {
        osName = 'Linux'; // (เผื่อไว้สำหรับยุบกลุ่ม Linux/Ubuntu ให้สั้นลงเหมือนกัน)
    }

    osCounts[osName] = (osCounts[osName] || 0) + 1;
});

// จากนั้นนำ osCounts นี้ไปวาดกราฟ Donut หรืออัปเดต UI รายการ Top 5 OS

    const topOS = Object.entries(osCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // --- จัดการ Top 5 Groups ---
    const groupCounts = {};
    agentsData.forEach(agent => {
        if (Array.isArray(agent.group)) {
            agent.group.forEach(g => {
                groupCounts[g] = (groupCounts[g] || 0) + 1;
            });
        } else if (agent.group) {
            groupCounts[agent.group] = (groupCounts[agent.group] || 0) + 1;
        } else {
            groupCounts['Unassigned'] = (groupCounts['Unassigned'] || 0) + 1;
        }
    });

    const topGroups = Object.entries(groupCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // เรนเดอร์ HTML Top 5 OS
    const osListEl = document.getElementById('top-os-list');
    if (osListEl) {
        osListEl.innerHTML = topOS.map(([name, count]) => {
            let icon = '<i class="fas fa-laptop text-gray-400 mr-2"></i>';
            if (name.toLowerCase().includes('windows')) icon = '<i class="fab fa-windows text-blue-500 mr-2"></i>';
            if (name.toLowerCase().includes('linux') || name.toLowerCase().includes('ubuntu') || name.toLowerCase().includes('centos')) icon = '<i class="fab fa-linux text-orange-500 mr-2"></i>';
            
            return `
                <li onclick="filterByCard('os', '${name}')" class="flex justify-between items-center p-2 hover:bg-blue-50 rounded cursor-pointer transition text-xs border-b border-gray-50 last:border-0">
                    <span class="text-gray-700 font-medium">${icon}${name}</span>
                    <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[11px] font-semibold">${count}</span>
                </li>
            `;
        }).join('') || '<li class="text-gray-400 text-center py-2 text-xs">No data</li>';
    }

    // เรนเดอร์ HTML Top 5 Groups
    const groupsListEl = document.getElementById('top-groups-list');
    if (groupsListEl) {
        groupsListEl.innerHTML = topGroups.map(([name, count]) => `
            <li onclick="filterByCard('group', '${name}')" class="flex justify-between items-center p-2 hover:bg-blue-50 rounded cursor-pointer transition text-xs border-b border-gray-50 last:border-0">
                <span class="text-gray-700 font-medium"><i class="fas fa-folder text-yellow-500 mr-2"></i>${name}</span>
                <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[11px] font-semibold">${count}</span>
            </li>
        `).join('') || '<li class="text-gray-400 text-center py-2 text-xs">No data</li>';
    }
}

// 🎯 แก้ไข: ฟังก์ชันสั่งกรองเมื่อคลิกที่ Card (แยกการทำงานออกมาให้ชัดเจน)
function filterByCard(type, value) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // สั่งให้พิมพ์ลงในช่องค้นหาตรง ๆ เช่น os=Windows หรือ group=default
        searchInput.value = `${type}=${value}`;
        
        // สั่งให้ระบบเริ่มประมวลผลฟิลเตอร์ทันทีเหมือนกับการกดปุ่มพิมพ์เอง
        searchInput.dispatchEvent(new Event('input')); 
    }
}

// 3. ฟังก์ชันวาดตาราง
function renderTable(data) {
    const tbody = document.getElementById('agents-tbody');
    const entriesInfo = document.getElementById('entries-info');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">No agents found</td></tr>';
        if (entriesInfo) entriesInfo.innerText = "Showing 0 entries";
        return;
    }

    data.forEach(agent => {
        const tr = document.createElement('tr');
        
        let statusClass = '';
        let rowClass = '';
        const statusStr = (agent.status || 'unknown').toLowerCase();
        
        if (statusStr === 'active') {
            statusClass = 'status-active';
        } else if (statusStr === 'disconnected') {
            statusClass = 'status-disconnected';
            rowClass = 'row-disconnected';
        } else {
            statusClass = 'bg-gray-400'; 
        }

        const osName = (agent.os && agent.os.name) ? agent.os.name : 'Unknown OS';
        const osVersion = (agent.os && agent.os.version) ? agent.os.version : '';
        const osFull = `${osName} ${osVersion}`.trim();
        const groupList = (agent.group && Array.isArray(agent.group)) ? agent.group.join(', ') : (agent.group || '-');
        
        tr.className = `border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowClass}`;
        
        tr.innerHTML = `
            <td class="py-3 px-4 text-center"><input type="checkbox" class="rounded border-gray-300 shadow-sm"></td>
            <td class="py-3 px-2 font-medium text-gray-900">${agent.id || '-'}</td>
            <td class="py-3 px-2 text-blue-600 font-medium cursor-pointer hover:underline">${agent.name || '-'}</td>
            <td class="py-3 px-2">${agent.ip || '-'}</td>
            <td class="py-3 px-2"><span class="group-badge">${groupList}</span></td>
            <td class="py-3 px-2">${osFull}</td>
            <td class="py-3 px-2">${agent.node_name || '-'}</td>
            <td class="py-3 px-2">${agent.version || '-'}</td>
            <td class="py-3 px-2 text-center">
                <div class="flex items-center justify-center space-x-1">
                    <span class="status-dot ${statusClass}"></span>
                    <span class="capitalize">${agent.status || '-'}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center">
                <button class="text-gray-400 hover:text-gray-600"><i class="fas fa-ellipsis-v"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (entriesInfo) {
        entriesInfo.innerText = `Showing 1 to ${data.length} of ${data.length} entries`;
    }
}

// 🎯 แก้ไข: ระบบช่องค้นหา Search (อัปเดตให้รองรับการคลิกจาก Card)
// 4. ระบบช่องค้นหา Search (อัปเดตให้รองรับการคลิกการ์ด OS และ Group)
// 🎯 แก้ไข: ระบบช่องค้นหา Search ให้กรองข้อมูลเมื่อกดการ์ดได้อย่างแม่นยำ
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        // ใช้ค่าข้อความดิบมาเช็ค เพื่อไม่ให้พิมพ์ใหญ่-เล็กมีปัญหาตอนเช็คตัวเริ่มต้น
        const rawKeyword = e.target.value.trim();
        
        // ถ้าช่องค้นหาว่างเปล่า ให้แสดงข้อมูลทั้งหมดทันที
        if (!rawKeyword) {
            renderTable(agentsData);
            return;
        }

        const filtered = agentsData.filter(agent => {
            const name = (agent.name || '').toLowerCase();
            const ip = (agent.ip || '').toLowerCase();
            const id = (agent.id || '').toLowerCase();
            const status = (agent.status || '').toLowerCase();
            
            // จัดการข้อมูล OS ของ Agent ให้เป็นตัวเล็กเพื่อใช้เปรียบเทียบ
            let osName = '';
            if (agent.os && agent.os.name) osName = agent.os.name.toLowerCase();
            else if (typeof agent.os === 'string') osName = agent.os.toLowerCase();

            // จัดการข้อมูล Group ของ Agent ให้เป็นตัวเล็กเพื่อใช้เปรียบเทียบ
            let groups = [];
            if (Array.isArray(agent.group)) {
                groups = agent.group.map(g => g.toLowerCase().trim());
            } else if (agent.group) {
                groups = [agent.group.toLowerCase().trim()];
            }

            // 🛠️ ตรวจจับกรณีคลิกการ์ด (เช่น os=Windows, group=default)
            if (rawKeyword.toLowerCase().startsWith('os=')) {
                const targetOS = rawKeyword.substring(3).toLowerCase().trim();
                return osName.includes(targetOS);
            }
            
            if (rawKeyword.toLowerCase().startsWith('group=')) {
                const targetGroup = rawKeyword.substring(6).toLowerCase().trim();
                // ค้นหาว่าในกลุ่มทั้งหมดของเครื่องนั้น มีคำที่ตรงกับที่คลิกมาหรือไม่
                return groups.some(g => g.includes(targetGroup) || g === targetGroup);
            }
            
            if (rawKeyword.toLowerCase().startsWith('status=')) {
                const targetStatus = rawKeyword.substring(7).toLowerCase().trim();
                return status === targetStatus;
            }

            // 🔍 สำหรับกรณีพิมพ์ค้นหาเองทั่วไปในช่อง Search
            const keyword = rawKeyword.toLowerCase();
            return name.includes(keyword) || 
                   ip.includes(keyword) || 
                   id.includes(keyword) || 
                   status.includes(keyword) ||
                   osName.includes(keyword) ||
                   groups.some(g => g.includes(keyword));
        });
        
        renderTable(filtered);
    });
}

// 5. สั่งให้เริ่มดึงข้อมูลทันทีเมื่อโหลดหน้าเว็บ
window.onload = () => {
    fetchWazuhAgents();
};