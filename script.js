document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }

    // --- DOM要素 ---
    const screenTitle = document.getElementById('screen-title');
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    const currentLocationSelect = document.getElementById('currentLocationSelect');
    const currentMonthDisplay = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const calendarDaysGrid = document.getElementById('calendarDays');
    const calendarLegend = document.getElementById('calendarLegend');
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabContents = document.querySelectorAll('.sub-tab-content');
    
    const bulkDateInput = document.getElementById('bulk_date');
    const bulkItemInput = document.getElementById('bulk_item');
    const bulkAmountInput = document.getElementById('bulk_amount');
    const bulkCountInput = document.getElementById('bulk_count');
    const registerBulkWasteBtn = document.getElementById('registerBulkWasteBtn');
    const reusableDateInput = document.getElementById('reusable_date');
    const reusableItemInput = document.getElementById('reusable_item');
    const reusableTimeHour = document.getElementById('reusable_time_hour');
    const reusableTimeMinute = document.getElementById('reusable_time_minute');
    const registerReusableBtn = document.getElementById('registerReusableBtn');
    
    const bulkWasteListContainer = document.getElementById('bulkWasteList');
    const reusableListContainer = document.getElementById('reusableList');
    const addRuleBtn = document.querySelector('.add-rule-btn');
    const ruleList = document.getElementById('ruleList');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importDataInput = document.getElementById('importDataInput');
    const locationListContainer = document.getElementById('locationList');
    const addLocationBtn = document.getElementById('addLocationBtn');
    const resetAllDataBtn = document.getElementById('resetAllDataBtn');
    const showDangerZoneToggle = document.getElementById('showDangerZoneToggle');
    const dangerZone = document.getElementById('dangerZone');

    // --- データ管理 ---
    let currentActiveScreen = 'calendar';
    let currentCalendarDate = new Date();
    const STORAGE_KEY = 'trash_app_data';

    let appData = {
        settings: { currentLocationId: 'home', darkMode: false },
        locations: { "home": { id: "home", name: "自宅", trashRules: [], specialCollections: { bulkWaste: [], reusable: [] } } }
    };

    function loadAppData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.locations) appData.locations = parsed.locations;
                if (parsed.settings) appData.settings = parsed.settings;
            } catch (e) { console.error("Load Error", e); }
        }
        if (!appData.locations[appData.settings.currentLocationId]) {
            appData.settings.currentLocationId = Object.keys(appData.locations)[0] || 'home';
        }
        const loc = appData.locations[appData.settings.currentLocationId];
        // デフォルトデータの補完
        if (!loc.trashRules || loc.trashRules.length === 0) {
            loc.trashRules = [
                { id: 'burnable', name: '可燃ごみ', color: '#ff6b6b', active: true, cycleType: 'weekly', weeklyDays: [1, 4], nthWeek: "第1", nthWeekday: 1 },
                { id: 'plastic', name: 'プラスチック', color: '#ffd166', active: true, cycleType: 'weekly', weeklyDays: [3], nthWeek: "第1", nthWeekday: 1 }
            ];
            saveAppData();
        }
        if (!loc.specialCollections) loc.specialCollections = { bulkWaste: [], reusable: [] };
    }

    function saveAppData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData)); }
    function getCurrentLocationData() { return appData.locations[appData.settings.currentLocationId]; }

    // --- 画面切り替え ---
    function showScreen(screenId) {
        screens.forEach(s => s.classList.toggle('active', s.id === screenId));
        navItems.forEach(n => n.classList.toggle('active', n.dataset.screen === screenId));
        const label = document.querySelector(`.nav-item[data-screen="${screenId}"] span:last-child`);
        screenTitle.textContent = label ? label.textContent : "メニュー";
        currentActiveScreen = screenId;
        if (screenId === 'calendar') { renderLocationSwitcher(); renderCalendar(currentCalendarDate); }
        else if (screenId === 'rules') renderRuleList();
        else if (screenId === 'settings') { loadSettings(); renderLocationManagement(); }
        else if (screenId === 'special_collect') renderSpecialCollectionsList();
    }
    navItems.forEach(item => item.addEventListener('click', () => showScreen(item.dataset.screen)));

    function renderLocationSwitcher() {
        currentLocationSelect.innerHTML = '';
        for (const id in appData.locations) {
            const opt = document.createElement('option'); opt.value = id; opt.textContent = appData.locations[id].name;
            if (id === appData.settings.currentLocationId) opt.selected = true;
            currentLocationSelect.appendChild(opt);
        }
    }
    currentLocationSelect.addEventListener('change', (e) => {
        appData.settings.currentLocationId = e.target.value; saveAppData(); showScreen(currentActiveScreen);
    });

    // --- カレンダー描画 ---
    function renderCalendar(date) {
        currentCalendarDate = new Date(date.getFullYear(), date.getMonth(), 1);
        currentMonthDisplay.textContent = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
        calendarDaysGrid.innerHTML = '';
        const year = date.getFullYear(), month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();
        let offset = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < offset; i++) {
            const empty = document.createElement('div'); empty.className = 'day-cell inactive';
            calendarDaysGrid.appendChild(empty);
        }
        for (let d = 1; d <= lastDate; d++) {
            const cell = document.createElement('div'); cell.className = 'day-cell';
            const cur = new Date(year, month, d);
            if (isSameDay(cur, new Date())) cell.classList.add('today');
            cell.innerHTML = `<div class="day-number">${d}</div>`;
            getTrashCollectionsForDay(cur).forEach(rule => {
                const icon = document.createElement('span'); icon.className = 'trash-icon';
                icon.style.backgroundColor = rule.color; cell.appendChild(icon);
            });
            getSpecialCollectionsForDay(cur).forEach(item => {
                const icon = document.createElement('span'); icon.className = 'trash-icon';
                if (item.type === 'bulk') { icon.style.backgroundColor = '#8e79ff'; icon.textContent = '粗'; }
                else { icon.style.backgroundColor = '#e67e22'; icon.classList.add('special-reusable'); icon.textContent = '回'; }
                cell.appendChild(icon);
            });
            calendarDaysGrid.appendChild(cell);
        }
        renderLegend();
    }
    function isSameDay(d1, d2) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }

    function getTrashCollectionsForDay(date) {
        const results = [];
        const d = date.getDate(), dow = date.getDay() === 0 ? 7 : date.getDay();
        const data = getCurrentLocationData();
        if (!data || !data.trashRules) return results;
        data.trashRules.forEach(rule => {
            if (!rule.active) return;
            if (rule.cycleType === 'weekly' && rule.weeklyDays && rule.weeklyDays.includes(dow)) results.push(rule);
            else if (rule.cycleType === 'nth_weekday' && rule.nthWeekday === dow) {
                const weekNum = Math.ceil(d / 7);
                if (rule.nthWeek && rule.nthWeek.replace('第','').split('・').map(Number).includes(weekNum)) results.push(rule);
            }
        });
        return results;
    }
    function getSpecialCollectionsForDay(date) {
        const results = [];
        const f = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
        const data = getCurrentLocationData();
        if (!data || !data.specialCollections) return results;
        data.specialCollections.bulkWaste.forEach(i => { if (i.date === f) results.push({...i, type:'bulk'}); });
        data.specialCollections.reusable.forEach(i => { if (i.date === f) results.push({...i, type:'reusable'}); });
        return results;
    }
    function renderLegend() {
        calendarLegend.innerHTML = '';
        const data = getCurrentLocationData();
        if (data && data.trashRules) {
            data.trashRules.forEach(r => {
                if (!r.active) return;
                const div = document.createElement('div'); div.className = 'legend-item';
                div.innerHTML = `<div class="trash-color-circle" style="background-color:${r.color}"></div>${r.name}`;
                calendarLegend.appendChild(div);
            });
        }
    }

    prevMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(currentCalendarDate); });
    nextMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(currentCalendarDate); });

    // --- 個別回収 ---
    subTabBtns.forEach(btn => btn.addEventListener('click', () => {
        subTabBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
        const target = btn.getAttribute('data-target');
        subTabContents.forEach(c => c.classList.toggle('active', c.id === target));
        renderSpecialCollectionsList();
    }));

    registerBulkWasteBtn.addEventListener('click', () => {
        const data = getCurrentLocationData();
        if (!bulkDateInput.value) return alert('日付を選択してください');
        data.specialCollections.bulkWaste.push({ id: Date.now().toString(), date: bulkDateInput.value, item: bulkItemInput.value || '品目未設定', amount: bulkAmountInput.value || 0, count: bulkCountInput.value || 1 });
        saveAppData(); renderSpecialCollectionsList(); renderCalendar(currentCalendarDate);
        bulkItemInput.value = "";
    });
    registerReusableBtn.addEventListener('click', () => {
        const data = getCurrentLocationData();
        if (!reusableDateInput.value) return alert('日付を選択してください');
        data.specialCollections.reusable.push({ id: Date.now().toString(), date: reusableDateInput.value, item: reusableItemInput.value || '品目未設定', time: `${reusableTimeHour.value}:${reusableTimeMinute.value}` });
        saveAppData(); renderSpecialCollectionsList(); renderCalendar(currentCalendarDate);
        reusableItemInput.value = "";
    });

    function renderSpecialCollectionsList() {
        bulkWasteListContainer.innerHTML = ''; reusableListContainer.innerHTML = '';
        const data = getCurrentLocationData();
        if (!data) return;
        data.specialCollections.bulkWaste.forEach(i => {
            const div = document.createElement('div'); div.className='list-item card';
            div.innerHTML = `<div class="list-info"><span class="list-title">${i.item}</span><span class="list-meta">${i.date}</span></div><button onclick="deleteSpecial('bulk','${i.id}')" class="list-del-btn"><span class="material-icons">delete</span></button>`;
            bulkWasteListContainer.appendChild(div);
        });
        data.specialCollections.reusable.forEach(i => {
            const div = document.createElement('div'); div.className='list-item card';
            div.innerHTML = `<div class="list-info"><span class="list-title">${i.item}</span><span class="list-meta">${i.date} ${i.time}</span></div><button onclick="deleteSpecial('reuse','${i.id}')" class="list-del-btn"><span class="material-icons">delete</span></button>`;
            reusableListContainer.appendChild(div);
        });
    }
    window.deleteSpecial = (type, id) => {
        const data = getCurrentLocationData();
        if (type === 'bulk') data.specialCollections.bulkWaste = data.specialCollections.bulkWaste.filter(i => i.id !== id);
        else data.specialCollections.reusable = data.specialCollections.reusable.filter(i => i.id !== id);
        saveAppData(); renderSpecialCollectionsList(); renderCalendar(currentCalendarDate);
    };

    // --- ルール設定 ---
    function renderRuleList() {
        ruleList.innerHTML = '';
        const data = getCurrentLocationData();
        if (!data || !data.trashRules) return;
        data.trashRules.forEach(rule => {
            const card = document.createElement('div'); card.className = 'rule-card card';
            card.innerHTML = `
                <div class="rule-card-header">
                    <div class="trash-color-circle" style="background-color: ${rule.color};"></div>
                    <span class="rule-name">${rule.name}</span>
                    <div class="toggle-switch">
                        <input type="checkbox" id="toggle_${rule.id}" ${rule.active ? 'checked' : ''}>
                        <label for="toggle_${rule.id}"></label>
                    </div>
                    <button class="expand-btn"><span class="material-icons">expand_more</span></button>
                </div>
                <div class="rule-card-details hidden">
                    <div class="cycle-selector">
                        <button class="segment-btn ${rule.cycleType === 'weekly' ? 'active' : ''}" data-cycle="weekly">毎週</button>
                        <button class="segment-btn ${rule.cycleType === 'nth_weekday' ? 'active' : ''}" data-cycle="nth_weekday">第n曜日</button>
                    </div>
                    <div class="cycle-details"></div>
                    <button class="delete-rule-btn danger-btn-small">この種別を削除</button>
                </div>`;
            ruleList.appendChild(card);
            const details = card.querySelector('.rule-card-details');
            const expandBtn = card.querySelector('.expand-btn');
            const expandIcon = expandBtn.querySelector('.material-icons');
            expandBtn.addEventListener('click', () => { 
                const isHidden = details.classList.toggle('hidden'); 
                expandIcon.textContent = isHidden ? 'expand_more' : 'expand_less';
                if (!isHidden) renderCycleDetails(details.querySelector('.cycle-details'), rule);
            });
            card.querySelector('.toggle-switch input').addEventListener('change', (e) => {
                rule.active = e.target.checked; saveAppData(); renderCalendar(currentCalendarDate);
            });
            card.querySelectorAll('.segment-btn').forEach(btn => btn.addEventListener('click', () => {
                rule.cycleType = btn.dataset.cycle;
                card.querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b === btn));
                renderCycleDetails(details.querySelector('.cycle-details'), rule);
                saveAppData(); renderCalendar(currentCalendarDate);
            }));
            card.querySelector('.delete-rule-btn').addEventListener('click', () => {
                if (confirm('削除しますか？')) {
                    data.trashRules = data.trashRules.filter(r => r.id !== rule.id);
                    saveAppData(); renderRuleList(); renderCalendar(currentCalendarDate);
                }
            });
        });
    }

    function renderCycleDetails(container, rule) {
        container.innerHTML = '';
        if (rule.cycleType === 'weekly') {
            const wrap = document.createElement('div'); wrap.className = 'weekday-grid';
            const days = ['月','火','水','木','金','土','日'];
            days.forEach((d, i) => {
                const label = document.createElement('label'); label.className = 'day-check';
                const dow = i + 1;
                label.innerHTML = `<input type="checkbox" ${rule.weeklyDays && rule.weeklyDays.includes(dow) ? 'checked' : ''}><span>${d}</span>`;
                label.querySelector('input').addEventListener('change', (e) => {
                    if (!rule.weeklyDays) rule.weeklyDays = [];
                    if (e.target.checked) rule.weeklyDays.push(dow);
                    else rule.weeklyDays = rule.weeklyDays.filter(x => x !== dow);
                    saveAppData(); renderCalendar(currentCalendarDate);
                });
                wrap.appendChild(label);
            });
            container.appendChild(wrap);
        } else if (rule.cycleType === 'nth_weekday') {
            container.innerHTML = `<div class="nth-row"><select class="nth-week-select">${['第1','第2','第3','第4','第1・3','第2・4'].map(w => `<option ${rule.nthWeek===w?'selected':''}>${w}</option>`).join('')}</select><select class="nth-dow-select">${['月','火','水','木','金','土','日'].map((d,i) => `<option value="${i+1}" ${rule.nthWeekday===(i+1)?'selected':''}>${d}曜日</option>`).join('')}</select></div>`;
            container.querySelector('.nth-week-select').addEventListener('change', e => { rule.nthWeek = e.target.value; saveAppData(); renderCalendar(currentCalendarDate); });
            container.querySelector('.nth-dow-select').addEventListener('change', e => { rule.nthWeekday = parseInt(e.target.value); saveAppData(); renderCalendar(currentCalendarDate); });
        }
    }

    addRuleBtn.addEventListener('click', () => {
        const data = getCurrentLocationData();
        const id = 'rule_' + Date.now();
        data.trashRules.push({ id, name: "新しいゴミ", color: "#cccccc", active: true, cycleType: "weekly", weeklyDays: [], nthWeek: "第1", nthWeekday: 1 });
        saveAppData(); renderRuleList();
    });

    // --- システム ---
    function loadSettings() {
        darkModeToggle.checked = appData.settings.darkMode;
        document.body.classList.toggle('dark-mode', appData.settings.darkMode);
    }
    darkModeToggle.addEventListener('change', (e) => {
        appData.settings.darkMode = e.target.checked; document.body.classList.toggle('dark-mode', e.target.checked); saveAppData();
    });
    function renderLocationManagement() {
        locationListContainer.innerHTML = '';
        for (const id in appData.locations) {
            const div = document.createElement('div'); div.className='location-row';
            div.innerHTML = `<div class="loc-name-wrap"><span class="material-icons">home</span><span>${appData.locations[id].name}</span></div>${id !== 'home' ? `<button onclick="deleteLocation('${id}')" class="loc-del-btn"><span class="material-icons">close</span></button>` : '<span class="default-badge">既定</span>'}`;
            locationListContainer.appendChild(div);
        }
    }
    window.deleteLocation = (id) => {
        if (confirm('この場所を削除しますか？')) {
            delete appData.locations[id];
            appData.settings.currentLocationId = 'home';
            saveAppData(); renderLocationManagement(); renderLocationSwitcher();
        }
    };
    addLocationBtn.addEventListener('click', () => {
        const name = prompt('場所名を入力:');
        if (name) {
            const id = 'loc_' + Date.now();
            appData.locations[id] = { id, name, trashRules: [], specialCollections: { bulkWaste: [], reusable: [] } };
            saveAppData(); renderLocationManagement(); renderLocationSwitcher();
        }
    });

    exportDataBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(appData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'trash_data.json';
        a.click();
    });
    importDataBtn.addEventListener('click', () => importDataInput.click());
    importDataInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try { 
                const imported = JSON.parse(ev.target.result); 
                localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
                location.reload(); 
            } catch(e) { alert('読み込みに失敗しました'); }
        };
        reader.readAsText(file);
    });

    showDangerZoneToggle.addEventListener('change', e => { dangerZone.classList.toggle('hidden', !e.target.checked); });
    resetAllDataBtn.addEventListener('click', () => { if (confirm('すべてのデータが消去されます。本当によろしいですか？')) { localStorage.clear(); location.reload(); } });

    loadAppData();
    showScreen('calendar');
});