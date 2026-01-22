document.addEventListener('DOMContentLoaded', () => {
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker Registered', reg))
            .catch(err => console.log('Service Worker not supported in this environment (file://)'));
    }

    // ===============================================
    // DOM要素の取得
    // ===============================================
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
    
    // 粗大ごみフォーム
    const bulkDateInput = document.getElementById('bulk_date');
    const bulkItemInput = document.getElementById('bulk_item');
    const bulkAmountInput = document.getElementById('bulk_amount');
    const bulkCountInput = document.getElementById('bulk_count');
    const registerBulkWasteBtn = document.getElementById('registerBulkWasteBtn');

    // 不用品回収フォーム
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
    const testNotificationBtn = document.getElementById('testNotificationBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const importDataBtn = document.getElementById('importDataBtn');
    const importDataInput = document.getElementById('importDataInput');
    const locationListContainer = document.getElementById('locationList');
    const addLocationBtn = document.getElementById('addLocationBtn');
    const resetAllDataBtn = document.getElementById('resetAllDataBtn');
    
    // 危険エリアトグル
    const showDangerZoneToggle = document.getElementById('showDangerZoneToggle');
    const dangerZone = document.getElementById('dangerZone');


    // ===============================================
    // グローバル変数
    // ===============================================
    let currentActiveScreen = 'calendar';
    let currentCalendarDate = new Date();
    const STORAGE_KEY = 'trash_app_data';
    let editingBulkWasteId = null;
    let editingReusableId = null;

    let appData = {
        settings: {
            currentLocationId: 'home',
            darkMode: false,
            lastNotificationTime: '07:00'
        },
        locations: {
            "home": {
                id: "home",
                name: "自宅",
                trashRules: [],
                specialCollections: { bulkWaste: [], reusable: [] }
            }
        }
    };

    // ===============================================
    // データ管理
    // ===============================================
    function loadAppData() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            appData = JSON.parse(storedData);
        }
        if (!appData.settings || !appData.settings.currentLocationId) {
            appData.settings = { currentLocationId: 'home', darkMode: false, lastNotificationTime: '07:00' };
        }
        if (!appData.locations || Object.keys(appData.locations).length === 0) {
            appData.locations = { "home": { id: "home", name: "自宅", trashRules: [], specialCollections: { bulkWaste: [], reusable: [] } } };
        }
        if (appData.trashRules && appData.trashRules.length > 0) {
            if (!appData.locations['home']) appData.locations['home'] = { id: 'home', name: '自宅', trashRules: [], specialCollections: { bulkWaste: [], reusable: [] } };
            appData.locations['home'].trashRules = appData.trashRules;
            delete appData.trashRules;
            if (appData.specialCollections) {
                 appData.locations['home'].specialCollections = appData.specialCollections;
                 delete appData.specialCollections;
            }
            saveAppData();
        }
        if (appData.locations[appData.settings.currentLocationId].trashRules.length === 0) {
             appData.locations[appData.settings.currentLocationId].trashRules = [
                { id: 'burnable', name: '可燃ごみ', color: '#ff6b6b', active: true, cycleType: 'weekly', weeklyDays: [1, 4], holidaySkip: true, notify: true, notifyTime: '07:00' },
                { id: 'non_burnable', name: '不燃ごみ', color: '#6a9cff', active: true, cycleType: 'nth_weekday', nthWeek: '第2・4', nthWeekday: 2, holidaySkip: true, notify: true, notifyTime: '07:00' },
                { id: 'plastic', name: 'プラスチック', color: '#ffd166', active: true, cycleType: 'weekly', weeklyDays: [3], holidaySkip: false, notify: true, notifyTime: '07:00' },
                { id: 'resource', name: '資源ごみ', color: '#06d6a0', active: true, cycleType: 'interval', intervalStart: '2024-01-01', intervalPeriod: 2, holidaySkip: false, notify: true, notifyTime: '07:00' },
                { id: 'pet_bottle', name: 'ペットボトル', color: '#118ab2', active: true, cycleType: 'specific', specificDates: ['2024-07-15', '2024-08-15'], holidaySkip: false, notify: true, notifyTime: '07:00' },
                { id: 'old_paper', name: '古紙', color: '#ef476f', active: true, cycleType: 'nth_weekday', nthWeek: '第1', nthWeekday: 7, holidaySkip: true, notify: false, notifyTime: '07:00' }
            ];
            saveAppData();
        }
    }

    function saveAppData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    }

    function getCurrentLocationData() {
        return appData.locations[appData.settings.currentLocationId];
    }

    // ===============================================
    // UI共通
    // ===============================================
    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.screen === screenId) item.classList.add('active');
        });
        screenTitle.textContent = document.querySelector(`.nav-item[data-screen="${screenId}"] span:last-child`).textContent;
        currentActiveScreen = screenId;

        if (screenId === 'calendar') {
            renderLocationSwitcher();
            renderCalendar(currentCalendarDate);
        } else if (screenId === 'rules') {
            renderRuleList();
        } else if (screenId === 'settings') {
            loadSettings();
            renderLocationManagement();
        } else if (screenId === 'special_collect') {
            renderSpecialCollectionsList();
        }
    }

    navItems.forEach(item => item.addEventListener('click', () => showScreen(item.dataset.screen)));

    // ===============================================
    // 場所切り替え
    // ===============================================
    function renderLocationSwitcher() {
        currentLocationSelect.innerHTML = '';
        for (const locId in appData.locations) {
            const option = document.createElement('option');
            option.value = locId;
            option.textContent = appData.locations[locId].name;
            if (locId === appData.settings.currentLocationId) option.selected = true;
            currentLocationSelect.appendChild(option);
        }
    }

    currentLocationSelect.addEventListener('change', (e) => {
        appData.settings.currentLocationId = e.target.value;
        saveAppData();
        showScreen(currentActiveScreen);
    });

    // ===============================================
    // カレンダー & 凡例
    // ===============================================
    function renderCalendar(date) {
        currentCalendarDate = new Date(date.getFullYear(), date.getMonth(), 1);
        currentMonthDisplay.textContent = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
        calendarDaysGrid.innerHTML = '';

        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        let startDay = firstDayOfMonth.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1;

        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'inactive');
            calendarDaysGrid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.classList.add('day-cell');
            const currentDay = new Date(year, month, day);
            if (isSameDay(currentDay, new Date())) dayCell.classList.add('today');

            const dayNumber = document.createElement('div');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);

            getTrashCollectionsForDay(currentDay).forEach(rule => {
                const icon = document.createElement('span');
                icon.classList.add('trash-icon');
                icon.style.backgroundColor = rule.color;
                dayCell.appendChild(icon);
            });

            getSpecialCollectionsForDay(currentDay).forEach(item => {
                const specialIcon = document.createElement('span');
                specialIcon.classList.add('trash-icon');
                
                if (item.type === 'bulkWaste') {
                    specialIcon.style.backgroundColor = '#8e79ff';
                    specialIcon.textContent = '粗';
                } else if (item.type === 'reusable') {
                    specialIcon.classList.add('special-reusable');
                    specialIcon.style.backgroundColor = '#e67e22'; 
                    specialIcon.style.borderRadius = '4px';        
                    specialIcon.textContent = '回';
                }
                
                dayCell.appendChild(specialIcon);
            });
            calendarDaysGrid.appendChild(dayCell);
        }

        renderCalendarLegend();
    }

    function renderCalendarLegend() {
        calendarLegend.innerHTML = '';
        const data = getCurrentLocationData();
        if (!data || !data.trashRules) return;

        data.trashRules.forEach(rule => {
            if (!rule.active) return;
            const item = document.createElement('div');
            item.classList.add('legend-item');
            item.innerHTML = `<div class="trash-color-circle" style="background-color: ${rule.color};"></div> ${rule.name}`;
            calendarLegend.appendChild(item);
        });
        
        const bulkLegend = document.createElement('div');
        bulkLegend.classList.add('legend-item');
        bulkLegend.innerHTML = `<div class="trash-color-circle" style="background-color: #8e79ff;"></div> 粗大ごみ`;
        calendarLegend.appendChild(bulkLegend);

        const reuseLegend = document.createElement('div');
        reuseLegend.classList.add('legend-item');
        reuseLegend.innerHTML = `<div class="trash-color-circle special-reusable" style="background-color: #e67e22; border-radius: 4px;"></div> 不用品回収`;
        calendarLegend.appendChild(reuseLegend);
    }

    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    function getTrashCollectionsForDay(date) {
        const collections = [];
        const day = date.getDate();
        const dayOfWeek = date.getDay();
        const currentLocationData = getCurrentLocationData();
        if (!currentLocationData || !currentLocationData.trashRules) return collections;

        currentLocationData.trashRules.forEach(rule => {
            if (!rule.active) return;
            switch (rule.cycleType) {
                case 'weekly':
                    const jsDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
                    if (rule.weeklyDays && rule.weeklyDays.includes(jsDayOfWeek)) collections.push(rule);
                    break;
                case 'nth_weekday':
                    const weekOfMonth = Math.ceil(day / 7);
                    const dayOfWeekJP = dayOfWeek === 0 ? 7 : dayOfWeek;
                    if (rule.nthWeekday === dayOfWeekJP) {
                        const nthWeeks = rule.nthWeek.replace('第', '').split('・').map(Number);
                        if (nthWeeks.includes(weekOfMonth)) collections.push(rule);
                    }
                    break;
                case 'interval':
                    if (rule.intervalStart) {
                        const startDate = new Date(rule.intervalStart);
                        const diffDays = Math.ceil(Math.abs(date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays % (rule.intervalPeriod * 7) === 0) collections.push(rule);
                    }
                    break;
                case 'specific':
                    if (rule.specificDates && rule.specificDates.includes(formatDate(date))) collections.push(rule);
                    break;
            }
        });
        return collections;
    }

    function getSpecialCollectionsForDay(date) {
        const collections = [];
        const formattedDate = formatDate(date);
        const currentLocationData = getCurrentLocationData();
        if (!currentLocationData || !currentLocationData.specialCollections) return collections;

        currentLocationData.specialCollections.bulkWaste.forEach(item => { if (item.date === formattedDate) collections.push({ ...item, type: 'bulkWaste' }); });
        currentLocationData.specialCollections.reusable.forEach(item => { if (item.date === formattedDate) collections.push({ ...item, type: 'reusable' }); });
        return collections;
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    prevMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(currentCalendarDate); });
    nextMonthBtn.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(currentCalendarDate); });


    // ===============================================
    // 個別回収画面
    // ===============================================
    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            subTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            subTabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(btn.dataset.target).classList.add('active');
            resetBulkWasteForm();
            resetReusableForm();
            renderSpecialCollectionsList();
        });
    });

    function resetBulkWasteForm() {
        bulkDateInput.value = '';
        bulkItemInput.value = '';
        bulkAmountInput.value = '';
        bulkCountInput.value = '1';
        registerBulkWasteBtn.textContent = '登録';
        editingBulkWasteId = null;
        const cancelBtn = document.getElementById('cancelBulkWasteEditBtn');
        if (cancelBtn) cancelBtn.remove();
    }

    registerBulkWasteBtn.addEventListener('click', () => {
        const date = bulkDateInput.value;
        const item = bulkItemInput.value.trim();
        const amount = parseInt(bulkAmountInput.value, 10);
        const count = parseInt(bulkCountInput.value, 10);
        if (!date || !item || isNaN(amount) || isNaN(count)) { alert('入力内容を確認してください。'); return; }

        const currentLocationData = getCurrentLocationData();
        if (editingBulkWasteId) {
            const index = currentLocationData.specialCollections.bulkWaste.findIndex(i => i.id === editingBulkWasteId);
            if (index !== -1) currentLocationData.specialCollections.bulkWaste[index] = { ...currentLocationData.specialCollections.bulkWaste[index], date, item, amount, count };
            alert('更新しました！');
        } else {
            const newBulkItem = { id: `bulk_${Date.now()}`, date, item, amount, count };
            currentLocationData.specialCollections.bulkWaste.push(newBulkItem);
            alert('登録しました！');
        }
        saveAppData(); resetBulkWasteForm(); renderCalendar(currentCalendarDate); renderSpecialCollectionsList();
    });

    function resetReusableForm() {
        reusableDateInput.value = '';
        reusableItemInput.value = '';
        reusableTimeHour.value = '08';
        reusableTimeMinute.value = '00';
        registerReusableBtn.textContent = '登録';
        editingReusableId = null;
        const cancelBtn = document.getElementById('cancelReusableEditBtn');
        if (cancelBtn) cancelBtn.remove();
    }

    registerReusableBtn.addEventListener('click', () => {
        const date = reusableDateInput.value;
        const item = reusableItemInput.value.trim();
        const time = `${reusableTimeHour.value}:${reusableTimeMinute.value}`;

        if (!date || !item) { alert('日付、品目、回収時間を入力してください。'); return; }

        const currentLocationData = getCurrentLocationData();
        if (editingReusableId) {
            const index = currentLocationData.specialCollections.reusable.findIndex(i => i.id === editingReusableId);
            if (index !== -1) currentLocationData.specialCollections.reusable[index] = { ...currentLocationData.specialCollections.reusable[index], date, item, time };
            alert('更新しました！');
        } else {
            const newReusableItem = { id: `reusable_${Date.now()}`, date, item, time };
            currentLocationData.specialCollections.reusable.push(newReusableItem);
            alert('登録しました！');
        }
        saveAppData(); resetReusableForm(); renderCalendar(currentCalendarDate); renderSpecialCollectionsList();
    });

    function renderSpecialCollectionsList() {
        bulkWasteListContainer.innerHTML = '';
        reusableListContainer.innerHTML = '';
        const currentLocationData = getCurrentLocationData();
        if (!currentLocationData || !currentLocationData.specialCollections) return;

        currentLocationData.specialCollections.bulkWaste.forEach(item => {
            const listItem = document.createElement('div');
            listItem.classList.add('list-item');
            listItem.dataset.id = item.id;
            listItem.innerHTML = `
                <div class="item-details"><div class="item-name">${item.item}</div><div class="item-meta">${item.date} / ${item.amount}円 / ${item.count}枚</div></div>
                <div class="item-actions"><button class="edit-btn"><span class="material-icons">edit</span></button><button class="delete-btn"><span class="material-icons">delete</span></button></div>
            `;
            bulkWasteListContainer.appendChild(listItem);
        });

        currentLocationData.specialCollections.reusable.forEach(item => {
            const listItem = document.createElement('div');
            listItem.classList.add('list-item');
            listItem.dataset.id = item.id;
            listItem.innerHTML = `
                <div class="item-details"><div class="item-name">${item.item}</div><div class="item-meta">${item.date} / ${item.time}</div></div>
                <div class="item-actions"><button class="edit-btn"><span class="material-icons">edit</span></button><button class="delete-btn"><span class="material-icons">delete</span></button></div>
            `;
            reusableListContainer.appendChild(listItem);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const listItem = e.target.closest('.list-item');
            const id = listItem.dataset.id;
            const isBulk = listItem.parentNode.id === 'bulkWasteList';
            if (confirm('削除しますか？')) {
                if (isBulk) currentLocationData.specialCollections.bulkWaste = currentLocationData.specialCollections.bulkWaste.filter(i => i.id !== id);
                else currentLocationData.specialCollections.reusable = currentLocationData.specialCollections.reusable.filter(i => i.id !== id);
                saveAppData(); renderSpecialCollectionsList(); renderCalendar(currentCalendarDate);
            }
        }));

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const listItem = e.target.closest('.list-item');
            const id = listItem.dataset.id;
            const isBulk = listItem.parentNode.id === 'bulkWasteList';
            if (isBulk) {
                const item = currentLocationData.specialCollections.bulkWaste.find(i => i.id === id);
                if (item) {
                    bulkDateInput.value = item.date; bulkItemInput.value = item.item; bulkAmountInput.value = item.amount; bulkCountInput.value = item.count;
                    editingBulkWasteId = id; registerBulkWasteBtn.textContent = '更新';
                    if (!document.getElementById('cancelBulkWasteEditBtn')) {
                        const cBtn = document.createElement('button'); cBtn.id = 'cancelBulkWasteEditBtn'; cBtn.className = 'secondary-btn'; cBtn.textContent = 'キャンセル'; cBtn.style.marginLeft = '10px'; cBtn.addEventListener('click', resetBulkWasteForm); registerBulkWasteBtn.parentNode.insertBefore(cBtn, registerBulkWasteBtn.nextSibling);
                    }
                    document.getElementById('special_collect').scrollTo({top:0, behavior:'smooth'});
                }
            } else {
                const item = currentLocationData.specialCollections.reusable.find(i => i.id === id);
                if (item) {
                    reusableDateInput.value = item.date; reusableItemInput.value = item.item;
                    const [h, m] = item.time.split(':');
                    reusableTimeHour.value = h;
                    reusableTimeMinute.value = m;
                    editingReusableId = id; registerReusableBtn.textContent = '更新';
                    if (!document.getElementById('cancelReusableEditBtn')) {
                        const cBtn = document.createElement('button'); cBtn.id = 'cancelReusableEditBtn'; cBtn.className = 'secondary-btn'; cBtn.textContent = 'キャンセル'; cBtn.style.marginLeft = '10px'; cBtn.addEventListener('click', resetReusableForm); registerReusableBtn.parentNode.insertBefore(cBtn, registerReusableBtn.nextSibling);
                    }
                    document.getElementById('special_collect').scrollTo({top:0, behavior:'smooth'});
                }
            }
        }));
    }

    // ===============================================
    // ルール設定
    // ===============================================
    function renderRuleList() {
        ruleList.innerHTML = '';
        const data = getCurrentLocationData();
        if (!data || !data.trashRules) return;
        
        data.trashRules.forEach(rule => {
            const card = document.createElement('div');
            card.className = 'rule-card';
            const disabledClass = rule.active ? '' : 'disabled'; // ★追加: 初期状態のクラス

            card.innerHTML = `
                <div class="rule-card-header">
                    <span class="material-icons drag-handle">drag_indicator</span>
                    <div class="trash-color-circle" style="background-color: ${rule.color};"></div>
                    <span class="rule-name">${rule.name}</span>
                    <div class="toggle-switch">
                        <!-- ★修正: name属性を追加 -->
                        <input type="checkbox" id="toggle_${rule.id}" name="toggle_${rule.id}" ${rule.active ? 'checked' : ''}>
                        <label for="toggle_${rule.id}"></label>
                    </div>
                    <button class="expand-btn"><span class="material-icons">expand_more</span></button>
                </div>
                <div class="rule-card-details hidden ${disabledClass}">
                    <div class="cycle-selector">
                        <button class="segment-btn ${rule.cycleType === 'weekly' ? 'active' : ''}" data-cycle="weekly">毎週</button>
                        <button class="segment-btn ${rule.cycleType === 'nth_weekday' ? 'active' : ''}" data-cycle="nth_weekday">第n曜日</button>
                        <button class="segment-btn ${rule.cycleType === 'interval' ? 'active' : ''}" data-cycle="interval">隔週</button>
                        <button class="segment-btn ${rule.cycleType === 'specific' ? 'active' : ''}" data-cycle="specific">特定日</button>
                    </div>
                    <div class="cycle-details"></div>
                    <div class="logic-options">
                        <!-- ★修正: name属性を追加 -->
                        <label><input type="checkbox" name="holiday_skip_${rule.id}" ${rule.holidaySkip ? 'checked' : ''} data-setting="holidaySkip"> 祝日は収集休み</label>
                        <label><input type="checkbox" name="notify_${rule.id}" ${rule.notify ? 'checked' : ''} data-setting="notify"> 当日朝に通知する</label>
                        <!-- ★修正: name属性とaria-labelを追加 -->
                        <input type="time" name="notify_time_${rule.id}" aria-label="通知時間" value="${rule.notifyTime || '07:00'}" data-setting="notifyTime">
                    </div>
                    <button class="delete-rule-btn">この種別を削除</button>
                </div>`;
            ruleList.appendChild(card);
            
            const details = card.querySelector('.rule-card-details');

            // ★修正: トグル切り替え処理
            card.querySelector('.toggle-switch input').addEventListener('change', (e) => { 
                const currentData = getCurrentLocationData();
                const targetRule = currentData.trashRules.find(r => r.id === rule.id);
                
                if (targetRule) {
                    targetRule.active = e.target.checked;
                    rule.active = e.target.checked;
                }

                if (e.target.checked) {
                    details.classList.remove('disabled');
                } else {
                    details.classList.add('disabled');
                }
                saveAppData(); 
                renderCalendar(currentCalendarDate); 
            });

            const detailsSection = card.querySelector('.rule-card-details');
            card.querySelector('.expand-btn').addEventListener('click', () => { 
                detailsSection.classList.toggle('hidden'); 
                if(!detailsSection.classList.contains('hidden')) renderCycleDetails(detailsSection.querySelector('.cycle-details'), rule); 
            });
            
            card.querySelector('.delete-rule-btn').addEventListener('click', () => { 
                if(confirm('削除しますか？')){ 
                    data.trashRules = data.trashRules.filter(r => r.id !== rule.id); 
                    saveAppData(); renderRuleList(); renderCalendar(currentCalendarDate); 
                } 
            });
            
            card.querySelectorAll('.segment-btn').forEach(b => b.addEventListener('click', () => { 
                rule.cycleType = b.dataset.cycle; 
                saveAppData(); 
                renderCycleDetails(detailsSection.querySelector('.cycle-details'), rule); 
                renderCalendar(currentCalendarDate); 
                card.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
                b.classList.add('active');
            }));
            
            detailsSection.querySelectorAll('.logic-options input').forEach(i => i.addEventListener('change', (e) => { 
                const k = e.target.dataset.setting; 
                rule[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; 
                saveAppData(); 
            }));

            if (!detailsSection.classList.contains('hidden')) renderCycleDetails(detailsSection.querySelector('.cycle-details'), rule);
        });
    }

    function renderCycleDetails(container, rule) {
        container.innerHTML = '';
        let html = '';
        if(rule.cycleType === 'weekly') {
            const days = ['月','火','水','木','金','土','日'];
            html = '<div class="checkbox-group">';
            // ★修正: name属性を追加
            days.forEach((d,i)=>{ html+=`<label><input type="checkbox" name="weekday_${rule.id}_${i}" data-day="${i+1}" ${(rule.weeklyDays||[]).includes(i+1)?'checked':''}> ${d}</label>`; });
            html += '</div>';
        } else if(rule.cycleType === 'nth_weekday') {
            // ★修正: name属性とaria-labelを追加
            html = `<label>回数:</label><select class="nth-week-select" name="nth_week_${rule.id}" aria-label="第n週">${['第1','第2','第3','第4','第1・3','第2・4'].map(o=>`<option ${rule.nthWeek===o?'selected':''}>${o}</option>`).join('')}</select>
                    <label>曜日:</label><select class="nth-weekday-select" name="nth_weekday_${rule.id}" aria-label="曜日">${['月','火','水','木','金','土','日'].map((o,i)=>`<option value="${i+1}" ${rule.nthWeekday===(i+1)?'selected':''}>${o}曜日</option>`).join('')}</select>`;
        } else if(rule.cycleType === 'interval') {
            // ★修正: name属性とaria-labelを追加
            html = `<label>開始日:</label><input type="date" class="interval-start-date" name="interval_start_${rule.id}" aria-label="間隔開始日" value="${rule.intervalStart||''}"><label>間隔:</label><select class="interval-period-select" name="interval_period_${rule.id}" aria-label="間隔"><option value="2" ${rule.intervalPeriod===2?'selected':''}>2週間ごと</option><option value="3" ${rule.intervalPeriod===3?'selected':''}>3週間ごと</option></select>`;
        } else if(rule.cycleType === 'specific') {
            // ★修正: name属性とaria-labelを追加
            html = `<label>日付(カンマ区切り):</label><input type="text" class="specific-dates-input" name="specific_dates_${rule.id}" aria-label="特定日" value="${(rule.specificDates||[]).join(', ')}">`;
        }
        container.innerHTML = html;
        
        if(rule.cycleType==='weekly') container.querySelectorAll('input').forEach(i=>i.addEventListener('change',(e)=>{ const d=parseInt(e.target.dataset.day); if(e.target.checked){if(!rule.weeklyDays)rule.weeklyDays=[];if(!rule.weeklyDays.includes(d))rule.weeklyDays.push(d);}else{rule.weeklyDays=rule.weeklyDays.filter(x=>x!==d);} saveAppData(); renderCalendar(currentCalendarDate); }));
        else if(rule.cycleType==='nth_weekday') { container.querySelector('.nth-week-select').addEventListener('change',e=>{rule.nthWeek=e.target.value;saveAppData();renderCalendar(currentCalendarDate);}); container.querySelector('.nth-weekday-select').addEventListener('change',e=>{rule.nthWeekday=parseInt(e.target.value);saveAppData();renderCalendar(currentCalendarDate);}); }
        else if(rule.cycleType==='interval') { container.querySelector('.interval-start-date').addEventListener('change',e=>{rule.intervalStart=e.target.value;saveAppData();renderCalendar(currentCalendarDate);}); container.querySelector('.interval-period-select').addEventListener('change',e=>{rule.intervalPeriod=parseInt(e.target.value);saveAppData();renderCalendar(currentCalendarDate);}); }
        else if(rule.cycleType==='specific') { container.querySelector('.specific-dates-input').addEventListener('change',e=>{rule.specificDates=e.target.value.split(',').map(s=>s.trim()).filter(s=>s);saveAppData();renderCalendar(currentCalendarDate);}); }
    }

    addRuleBtn.addEventListener('click', () => {
        const newRule = { id: `trash_${Date.now()}`, name: '新しいゴミ', color: '#cccccc', active: true, cycleType: 'weekly', weeklyDays: [], holidaySkip: true, notify: true, notifyTime: '07:00' };
        getCurrentLocationData().trashRules.push(newRule); saveAppData(); renderRuleList(); renderCalendar(currentCalendarDate);
    });

    // ===============================================
    // 設定 & 初期化
    // ===============================================
    function loadSettings() {
        darkModeToggle.checked = appData.settings.darkMode;
        document.body.classList.toggle('dark-mode', appData.settings.darkMode);
    }
    darkModeToggle.addEventListener('change', (e) => { appData.settings.darkMode = e.target.checked; document.body.classList.toggle('dark-mode', e.target.checked); saveAppData(); });

    testNotificationBtn.addEventListener('click', () => { /* 省略 */ });
    exportDataBtn.addEventListener('click', () => { const b=new Blob([JSON.stringify(appData,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='trash_data.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); });
    importDataBtn.addEventListener('click', () => importDataInput.click());
    importDataInput.addEventListener('change', (e) => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ try{appData=JSON.parse(ev.target.result); saveAppData(); alert('読み込みました'); showScreen(currentActiveScreen);}catch(err){alert('エラー');} }; r.readAsText(f); });

    function renderLocationManagement() {
        locationListContainer.innerHTML = '';
        const locs = appData.locations;
        for(const id in locs) {
            const div = document.createElement('div'); div.className='location-item';
            // ★修正: name属性とaria-labelを追加
            div.innerHTML = `<input type="text" name="location_name_${id}" aria-label="場所名" value="${locs[id].name}" data-id="${id}"> ${id!=='home'?'<button class="delete-btn">削除</button>':''}`;
            locationListContainer.appendChild(div);
            div.querySelector('input').addEventListener('change',e=>{locs[e.target.dataset.id].name=e.target.value; saveAppData(); renderLocationSwitcher(); if(appData.settings.currentLocationId===id)showScreen(currentActiveScreen);});
            if(id!=='home') div.querySelector('button').addEventListener('click',()=>{ if(confirm('削除しますか？')){ delete locs[id]; if(appData.settings.currentLocationId===id)appData.settings.currentLocationId='home'; saveAppData(); renderLocationManagement(); showScreen(currentActiveScreen); } });
        }
    }
    addLocationBtn.addEventListener('click', () => { const n=prompt('名前:'); if(n){const id=`loc_${Date.now()}`; appData.locations[id]={id,name:n,trashRules:[],specialCollections:{bulkWaste:[],reusable:[]}}; saveAppData(); renderLocationManagement(); renderLocationSwitcher();} });

    // ★修正箇所: 危険エリアの表示ロジック追加
    if (showDangerZoneToggle && dangerZone) {
        showDangerZoneToggle.addEventListener('change', (e) => {
            dangerZone.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    if(resetAllDataBtn) {
        resetAllDataBtn.addEventListener('click', () => {
            if(confirm('【警告】\n本当に全てのデータを初期化しますか？')) {
                localStorage.removeItem(STORAGE_KEY);
                alert('初期化しました。');
                location.reload();
            }
        });
    }

    loadAppData();
    loadSettings();
    showScreen('calendar');
});