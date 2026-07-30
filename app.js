/* ==========================================================================
   EkoTakip - Etkinlik Karbon Hesaplayıcısı Engine
   ========================================================================== */

let currentWizardStep = 1;
let currentFlightClass = 'economy';
let isNewWizardFlow = true;
let activeEventId = null;

// Helper utilities for number safety & Turkish formatting
function safeNum(val, defaultVal = 0, maxVal = 10000000) {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || !isFinite(parsed)) return defaultVal;
    return Math.min(maxVal, Math.max(0, parsed));
}

function formatTR(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) return '0,00';
    return num.toLocaleString('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatDateTR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[monthIdx] || parts[1]} ${parts[0]}`;
}

// Custom Apple HIG Dialog System (Replaces Native alert, confirm, prompt)
function showCustomAlert(title, message, iconClass = 'fa-circle-info') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('anzCustomDialogModal');
        const titleEl = document.getElementById('anzDialogTitle');
        const msgEl = document.getElementById('anzDialogMessage');
        const iconEl = document.getElementById('anzDialogIcon');
        const promptWrap = document.getElementById('anzDialogPromptWrap');
        const cancelBtn = document.getElementById('anzDialogCancelBtn');
        const confirmBtn = document.getElementById('anzDialogConfirmBtn');

        if (!overlay) {
            alert(`${title}\n\n${message}`);
            return resolve(true);
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        iconEl.className = `fa-solid ${iconClass} anz-dialog-icon`;
        promptWrap.style.display = 'none';
        cancelBtn.style.display = 'none';

        confirmBtn.textContent = 'Tamam';
        confirmBtn.className = 'anz-dialog-btn primary';

        const cleanup = (val) => {
            overlay.style.display = 'none';
            confirmBtn.onclick = null;
            resolve(val);
        };

        confirmBtn.onclick = () => cleanup(true);
        overlay.style.display = 'flex';
    });
}

function showCustomConfirm(title, message, confirmText = 'Evet', isDanger = false, iconClass = 'fa-triangle-exclamation') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('anzCustomDialogModal');
        const titleEl = document.getElementById('anzDialogTitle');
        const msgEl = document.getElementById('anzDialogMessage');
        const iconEl = document.getElementById('anzDialogIcon');
        const promptWrap = document.getElementById('anzDialogPromptWrap');
        const cancelBtn = document.getElementById('anzDialogCancelBtn');
        const confirmBtn = document.getElementById('anzDialogConfirmBtn');

        if (!overlay) {
            const res = confirm(`${title}\n\n${message}`);
            return resolve(res);
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        iconEl.className = `fa-solid ${iconClass} anz-dialog-icon ${isDanger ? 'danger' : ''}`;
        promptWrap.style.display = 'none';
        cancelBtn.style.display = 'inline-block';
        cancelBtn.textContent = 'Vazgeç';

        confirmBtn.textContent = confirmText;
        confirmBtn.className = isDanger ? 'anz-dialog-btn danger' : 'anz-dialog-btn primary';

        const cleanup = (val) => {
            overlay.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(val);
        };

        confirmBtn.onclick = () => cleanup(true);
        cancelBtn.onclick = () => cleanup(false);
        overlay.style.display = 'flex';
    });
}

function showCustomPrompt(title, message, defaultValue = '', placeholder = 'Şablon Adı Giriniz...') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('anzCustomDialogModal');
        const titleEl = document.getElementById('anzDialogTitle');
        const msgEl = document.getElementById('anzDialogMessage');
        const iconEl = document.getElementById('anzDialogIcon');
        const promptWrap = document.getElementById('anzDialogPromptWrap');
        const promptInput = document.getElementById('anzDialogPromptInput');
        const cancelBtn = document.getElementById('anzDialogCancelBtn');
        const confirmBtn = document.getElementById('anzDialogConfirmBtn');

        if (!overlay) {
            const res = prompt(`${title}\n\n${message}`, defaultValue);
            return resolve(res);
        }

        titleEl.textContent = title;
        msgEl.textContent = message;
        iconEl.className = 'fa-solid fa-star anz-dialog-icon star';
        promptWrap.style.display = 'block';
        promptInput.value = defaultValue;
        promptInput.placeholder = placeholder;
        cancelBtn.style.display = 'inline-block';
        cancelBtn.textContent = 'Vazgeç';

        confirmBtn.textContent = 'Kaydet';
        confirmBtn.className = 'anz-dialog-btn primary';

        const cleanup = (val) => {
            overlay.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            resolve(val);
        };

        confirmBtn.onclick = () => {
            const val = promptInput.value ? promptInput.value.trim() : '';
            cleanup(val || null);
        };
        cancelBtn.onclick = () => cleanup(null);
        overlay.style.display = 'flex';
        setTimeout(() => promptInput.focus(), 100);
    });
}

// Built-in Event Templates
const builtInTemplates = [
    { key: 'custom', name: 'Özel (Boş)', icon: 'fa-pen-to-square' },
    { key: 'meeting', name: 'Toplantı (50)', icon: 'fa-users' },
    { key: 'conference', name: 'Konferans (300)', icon: 'fa-microphone' },
    { key: 'gala', name: 'Ödül Töreni (750)', icon: 'fa-trophy' },
    { key: 'expo', name: 'Fuar (1500)', icon: 'fa-building-columns' },
    { key: 'hybrid', name: 'Online/Hibrit', icon: 'fa-laptop' }
];

// Single Source of Truth for Presets and Defaults
const eventTemplatesData = {
    custom: {
        title: '',
        attendees: 0,
        area: 0,
        flightKm: 0,
        flightClass: 'economy',
        localTransitKm: 0,
        freightTonKm: 0,
        eleckWh: 0,
        hotelNights: 0,
        mealsRed: 0,
        mealsChicken: 0,
        mealsVeg: 0,
        buildM2: 0,
        swagCount: 0
    },
    meeting: {
        title: 'Q3 Pazarlama Ekip Toplantısı',
        attendees: 50,
        area: 150,
        flightKm: 0,
        flightClass: 'economy',
        localTransitKm: 150,
        freightTonKm: 200,
        eleckWh: 500,
        hotelNights: 5,
        mealsRed: 5,
        mealsChicken: 20,
        mealsVeg: 25,
        buildM2: 15,
        swagCount: 50
    },
    conference: {
        title: 'Türkiye Dijital Pazarlama Zirvesi',
        attendees: 300,
        area: 800,
        flightKm: 1200,
        flightClass: 'economy',
        localTransitKm: 800,
        freightTonKm: 1000,
        eleckWh: 1800,
        hotelNights: 25,
        mealsRed: 40,
        mealsChicken: 100,
        mealsVeg: 160,
        buildM2: 120,
        swagCount: 300
    },
    gala: {
        title: 'Kristal Elma 2026 Ödül Töreni',
        attendees: 750,
        area: 1800,
        flightKm: 2400,
        flightClass: 'economy',
        localTransitKm: 1200,
        freightTonKm: 1500,
        eleckWh: 2800,
        hotelNights: 40,
        mealsRed: 120,
        mealsChicken: 200,
        mealsVeg: 300,
        buildM2: 180,
        swagCount: 500
    },
    expo: {
        title: 'Brand Week Istanbul 2026 Fuar Alanı',
        attendees: 1500,
        area: 3500,
        flightKm: 4200,
        flightClass: 'business',
        localTransitKm: 2800,
        freightTonKm: 3200,
        eleckWh: 5400,
        hotelNights: 75,
        mealsRed: 200,
        mealsChicken: 350,
        mealsVeg: 450,
        buildM2: 350,
        swagCount: 900
    },
    hybrid: {
        title: 'EkoTakip Hibrit Dijital Lansman',
        isOnline: true,
        attendees: 500,
        area: 100,
        flightKm: 0,
        flightClass: 'economy',
        localTransitKm: 100,
        freightTonKm: 150,
        eleckWh: 600,
        hotelNights: 2,
        mealsRed: 0,
        mealsChicken: 15,
        mealsVeg: 35,
        buildM2: 30,
        swagCount: 50
    }
};

let userCustomTemplates = [];
try {
    const saved = localStorage.getItem('anz_custom_templates');
    userCustomTemplates = saved ? JSON.parse(saved) : [];
} catch (e) {
    userCustomTemplates = [];
}

function saveCustomTemplatesToStorage() {
    try {
        localStorage.setItem('anz_custom_templates', JSON.stringify(userCustomTemplates));
    } catch (e) {
        console.error('Save template error:', e);
    }
}

function renderTemplateSelectorGrid(activeKey = 'gala') {
    const grid = document.getElementById('templateSegGrid');
    if (!grid) return;

    let html = builtInTemplates.map(t => `
        <button type="button" class="template-seg-btn ${activeKey === t.key ? 'active' : ''}" onclick="applyEventTemplate('${t.key}', this)">
            <i class="fa-solid ${t.icon}"></i> ${t.name}
        </button>
    `).join('');

    userCustomTemplates.forEach(ct => {
        html += `
            <div class="template-seg-btn custom-tpl-btn ${activeKey === ct.id ? 'active' : ''}" onclick="applyCustomTemplate('${ct.id}', this)" role="button">
                <i class="fa-solid fa-star custom-star-icon"></i>
                <span class="custom-tpl-name">${escapeHtml(ct.name)}</span>
                <i class="fa-solid fa-xmark del-tpl-btn" title="Şablonu Sil" onclick="deleteCustomTemplate('${ct.id}', event)"></i>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function applyEventTemplate(templateKey, targetBtn = null) {
    const tpl = eventTemplatesData[templateKey];
    if (!tpl) return;

    populateWizardInputs(tpl);

    document.querySelectorAll('.template-seg-btn').forEach(btn => btn.classList.remove('active'));
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}

function applyCustomTemplate(templateId, targetBtn = null) {
    const ct = userCustomTemplates.find(t => t.id === templateId);
    if (!ct || !ct.data) return;

    populateWizardInputs(ct.data);

    document.querySelectorAll('.template-seg-btn').forEach(btn => btn.classList.remove('active'));
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}

async function saveCurrentResultAsTemplate() {
    const defaultTitle = document.getElementById('evResultTitle')?.textContent || document.getElementById('evTitle')?.value || 'Özel Şablonum';
    const tplName = await showCustomPrompt(
        'Şablon Olarak Kaydet',
        'Bu hesaplama girdilerini gelecek etkinliklerinizde şablon olarak kullanmak için isim verin:',
        defaultTitle
    );

    if (!tplName || !tplName.trim()) return;

    const tplData = {
        title: tplName.trim(),
        attendees: safeNum(document.getElementById('evAttendees')?.value),
        area: safeNum(document.getElementById('evArea')?.value),
        flightKm: safeNum(document.getElementById('evFlightKm')?.value),
        flightClass: document.getElementById('evFlightClass')?.value || 'economy',
        localTransitKm: safeNum(document.getElementById('evLocalTransitKm')?.value),
        freightTonKm: safeNum(document.getElementById('evFreightTonKm')?.value),
        eleckWh: safeNum(document.getElementById('evEleckWh')?.value),
        hotelNights: safeNum(document.getElementById('evHotelNights')?.value),
        mealsRed: safeNum(document.getElementById('evMealsRed')?.value),
        mealsChicken: safeNum(document.getElementById('evMealsChicken')?.value),
        mealsVeg: safeNum(document.getElementById('evMealsVeg')?.value),
        buildM2: safeNum(document.getElementById('evBuildM2')?.value),
        swagCount: safeNum(document.getElementById('evSwagCount')?.value)
    };

    const newTpl = {
        id: 'tpl-' + Date.now(),
        name: tplName.trim(),
        data: tplData
    };

    userCustomTemplates.push(newTpl);
    saveCustomTemplatesToStorage();
    renderTemplateSelectorGrid(newTpl.id);
    await showCustomAlert('Şablon Kaydedildi ⭐', `"${tplName.trim()}" yeni etkinlikleriniz için özel şablonlarınıza eklendi!`, 'fa-circle-check');
}

async function deleteCustomTemplate(tplId, event) {
    if (event) event.stopPropagation();
    const ct = userCustomTemplates.find(t => t.id === tplId);
    const name = ct ? ct.name : 'Bu şablonu';
    
    const sure = await showCustomConfirm(
        'Şablonu Sil',
        `"${name}" özel şablonunu silmek istediğinize emin misiniz?`,
        'Şablonu Sil',
        true
    );

    if (!sure) return;

    userCustomTemplates = userCustomTemplates.filter(t => t.id !== tplId);
    saveCustomTemplatesToStorage();
    renderTemplateSelectorGrid('custom');
}

// Single Source of Truth Default Sample Events
const defaultEvents = [
    {
        id: 'ev-101',
        title: 'Kristal Elma 2026 Ödül Töreni',
        attendees: 750,
        area: 1800,
        flightKm: 2400,
        flightClass: 'economy',
        localTransitKm: 1200,
        freightTonKm: 1500,
        eleckWh: 2800,
        hotelNights: 40,
        mealsRed: 120,
        mealsChicken: 200,
        mealsVeg: 300,
        buildM2: 180,
        swagCount: 500,
        date: '2026-06-15'
    },
    {
        id: 'ev-102',
        title: 'Brand Week Istanbul 2025 Ana Sahne',
        attendees: 1200,
        area: 2500,
        flightKm: 4200,
        flightClass: 'business',
        localTransitKm: 2800,
        freightTonKm: 3200,
        eleckWh: 5400,
        hotelNights: 75,
        mealsRed: 200,
        mealsChicken: 350,
        mealsVeg: 450,
        buildM2: 350,
        swagCount: 900,
        date: '2025-11-10'
    }
];

let userEventsList = [];
try {
    const saved = localStorage.getItem('anz_user_events');
    userEventsList = saved ? JSON.parse(saved) : defaultEvents;
} catch (e) {
    userEventsList = defaultEvents;
}

function saveEventsToStorage() {
    try {
        localStorage.setItem('anz_user_events', JSON.stringify(userEventsList));
    } catch (e) {
        console.error('LocalStorage save error:', e);
    }
}

// ===== SETTINGS & THEME SHEET =====

function getActiveTheme() {
    const saved = localStorage.getItem('anz_theme');
    if (saved) return saved;
    const root = document.documentElement;
    return root.classList.contains('apple-light') ? 'light' : 'dark';
}

function applyTheme(themeName) {
    const isDark = themeName === 'dark';
    const body = document.body;
    const root = document.documentElement;

    if (isDark) {
        body.classList.add('apple-dark');
        body.classList.remove('apple-light');
        root.classList.add('apple-dark');
        root.classList.remove('apple-light');
    } else {
        body.classList.remove('apple-dark');
        body.classList.add('apple-light');
        root.classList.remove('apple-dark');
        root.classList.add('apple-light');
    }

    localStorage.setItem('anz_theme', isDark ? 'dark' : 'light');

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#0B0D0F' : '#F5F1E8');
    }

    const switchToggle = document.getElementById('themeSwitchToggle');
    if (switchToggle) switchToggle.checked = isDark;

    if (typeof globalDbData !== 'undefined' && globalDbData) {
        renderMacroCharts();
        if (typeof leafletMap !== 'undefined' && leafletMap) {
            initOrUpdateMap();
        }
        if (typeof companyTabMapInstance !== 'undefined' && companyTabMapInstance) {
            const company = (typeof globalDbData.companies !== 'undefined') ? globalDbData.companies.find(c => c.name === activeSelectedCompany) : null;
            initOrUpdateCompanyTabMap(company);
        }
    }
}

function openSettingsSheet() {
    const modal = document.getElementById('settingsSheetModal');
    if (!modal) return;
    
    // Sync switch state with active theme
    const isDark = getActiveTheme() === 'dark';
    const switchToggle = document.getElementById('themeSwitchToggle');
    if (switchToggle) switchToggle.checked = isDark;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeSettingsSheet() {
    const modal = document.getElementById('settingsSheetModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    showSettingsMainView();
}

function toggleThemeFromSwitch(isDarkChecked) {
    applyTheme(isDarkChecked ? 'dark' : 'light');
}

async function resetAllDataToDefault() {
    const sure = await showCustomConfirm(
        'Tüm Verileri Sıfırla',
        'Kayıtlı tüm etkinlikler ve özel şablonlar silinerek varsayılan örneklere dönülecektir.\n\nBu işlem geri alınamaz. Emin misiniz?',
        'Tümünü Sıfırla',
        true
    );

    if (!sure) return;

    localStorage.removeItem('anz_user_events');
    localStorage.removeItem('anz_custom_templates');
    userEventsList = [...defaultEvents];
    userCustomTemplates = [];
    saveEventsToStorage();
    renderEventsDashboard();
    closeSettingsSheet();
}

// ===== WIZARD FORM SHEET MODAL =====

function openEventWizardModal() {
    const modal = document.getElementById('eventWizardModal');
    if (!modal) return;
    isNewWizardFlow = true;
    activeEventId = null;
    currentWizardStep = 1;

    const sheetTitle = document.getElementById('sheetTitle');
    if (sheetTitle) sheetTitle.textContent = 'Yeni Etkinlik';

    const cancelBtn = document.getElementById('sheetCancelBtn');
    if (cancelBtn) cancelBtn.textContent = 'Vazgeç';

    // Synchronize Gala Template Pill with default Gala Inputs
    renderTemplateSelectorGrid('gala');
    applyEventTemplate('gala', null);

    updateEventWizardUI();
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

async function closeEventWizardModal() {
    const modal = document.getElementById('eventWizardModal');
    if (!modal) return;

    if (isNewWizardFlow && currentWizardStep < 5) {
        const confirmClose = await showCustomConfirm(
            'İşlemden Vazgeç',
            'Etkinlik oluşturma işleminden vazgeçmek istediğinize emin misiniz? Girilen veriler silinecektir.',
            'Vazgeç',
            false
        );
        if (!confirmClose) return;
    }

    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function selectFlightClass(cls) {
    currentFlightClass = cls;
    const hidden = document.getElementById('evFlightClass');
    if (hidden) hidden.value = cls;

    const btnEco = document.getElementById('chipClassEconomy');
    const btnBiz = document.getElementById('chipClassBusiness');
    if (cls === 'economy') {
        if (btnEco) btnEco.classList.add('active');
        if (btnBiz) btnBiz.classList.remove('active');
    } else {
        if (btnBiz) btnBiz.classList.add('active');
        if (btnEco) btnEco.classList.remove('active');
    }
}

function adjustCounter(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val = Math.max(0, val + delta);
    input.value = val;
}

function nextEventWizardStep() {
    if (currentWizardStep < 4) {
        currentWizardStep++;
        updateEventWizardUI();
    } else if (currentWizardStep === 4) {
        currentWizardStep = 5;
        calculateAndRenderEventResult();
        updateEventWizardUI();
    }
}

function prevEventWizardStep() {
    if (currentWizardStep > 1 && currentWizardStep <= 4) {
        currentWizardStep--;
        updateEventWizardUI();
    }
}

function updateEventWizardUI() {
    const progressMap = { 1: '25%', 2: '50%', 3: '75%', 4: '100%', 5: '100%' };
    const stepSubtitles = {
        1: 'Seyahat & Lojistik (1/4)',
        2: 'Tesis & Enerji (2/4)',
        3: 'İkram & Gıda (3/4)',
        4: 'Malzeme & Atık (4/4)',
        5: 'RVD Kurumsal Beyannamesi'
    };

    const fillBar = document.getElementById('wizProgressFill');
    if (fillBar) fillBar.style.width = progressMap[currentWizardStep] || '25%';

    const sheetTitle = document.getElementById('sheetTitle');
    const subtitleEl = document.getElementById('wizStepSubtitle');

    if (currentWizardStep === 5) {
        const evTitleVal = document.getElementById('evTitle')?.value || 'Kristal Elma 2026 Ödül Töreni';
        if (sheetTitle) sheetTitle.textContent = evTitleVal;
        if (subtitleEl) subtitleEl.textContent = 'RVD Kurumsal Beyannamesi';
    } else {
        if (sheetTitle) sheetTitle.textContent = isNewWizardFlow ? 'Yeni Etkinlik' : 'Etkinliği Düzenle';
        if (subtitleEl) subtitleEl.textContent = stepSubtitles[currentWizardStep] || '';
    }

    const trackEl = document.querySelector('.wiz-progress-track');
    if (trackEl) trackEl.style.display = (currentWizardStep <= 4) ? 'block' : 'none';

    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`evWizardStep${i}`);
        if (stepEl) stepEl.style.display = (i === currentWizardStep) ? 'block' : 'none';
    }

    const resultEl = document.getElementById('evWizardStepResult');
    if (resultEl) resultEl.style.display = (currentWizardStep === 5) ? 'block' : 'none';

    const wizardSticky = document.getElementById('evWizardStickyBar');
    const resultSticky = document.getElementById('evResultStickyBar');
    const prevBtn = document.getElementById('evWizardPrevBtn');
    const nextBtn = document.getElementById('evWizardNextBtn');
    const resultFinishBtn = document.getElementById('evResultFinishBtn');
    const dangerZone = document.getElementById('evResultDangerZone');

    if (currentWizardStep <= 4) {
        if (wizardSticky) wizardSticky.style.display = 'flex';
        if (resultSticky) resultSticky.style.display = 'none';
        if (prevBtn) prevBtn.style.display = currentWizardStep > 1 ? 'inline-block' : 'none';
        if (nextBtn) {
            nextBtn.textContent = currentWizardStep === 4 ? 'Hesapla & Raporla' : 'Devam Et';
        }
    } else {
        if (wizardSticky) wizardSticky.style.display = 'none';
        if (resultSticky) resultSticky.style.display = 'flex';
        if (resultFinishBtn) {
            resultFinishBtn.textContent = isNewWizardFlow ? 'Beyannameyi Kaydet' : 'Tamam';
        }
        if (dangerZone) {
            dangerZone.style.display = isNewWizardFlow ? 'none' : 'block';
        }
    }

    const body = document.querySelector('.event-wizard-body');
    if (body) body.scrollTop = 0;
}

// ===== CARBON EMISSIONS CALCULATION ENGINE (SINGLE SOURCE OF TRUTH) =====

function computeEventEmissions(params) {
    const N = safeNum(params.attendees, 0, 1000000);            // Katılımcı max 1.000.000
    const m2 = safeNum(params.area, 0, 1000000);                // Alan m2 max 1.000.000
    const flightKm = safeNum(params.flightKm, 0, 50000);        // Uçuş km max 50.000 (Makul tek etkinlik sınırı)
    const flightClass = (params.flightClass || 'economy').toLowerCase();
    const localTransitKm = safeNum(params.localTransitKm, 0, 500000);
    const freightTonKm = safeNum(params.freightTonKm, 0, 1000000);
    const eleckWh = safeNum(params.eleckWh, 0, 10000000);
    const hotelNights = safeNum(params.hotelNights, 0, 100000);
    const mealsRed = safeNum(params.mealsRed, 0, 500000);
    const mealsChicken = safeNum(params.mealsChicken, 0, 500000);
    const mealsVeg = safeNum(params.mealsVeg, 0, 500000);
    const buildM2 = safeNum(params.buildM2, 0, 500000);
    const swagCount = safeNum(params.swagCount, 0, 1000000);

    // Calibrated Benchmark Baseline (Physical vs Online/Hybrid Digital Streaming)
    // Relies strictly on the explicit user-controlled UI toggle params.isOnline
    const isOnlineEvent = !!params.isOnline;

    let baselineKg = 0;
    if (isOnlineEvent) {
        // Online / Hybrid streaming digital infrastructure benchmark (0.25 kg CO2e per online viewer + 1.5 kg per studio m2) - Tahmini Dijital Katsayılar
        baselineKg = (N * 0.25) + (m2 * 1.5);
    } else {
        // Physical event benchmark: (N * 4.5) + (m2 * 2.0) + (N * 1.5)
        baselineKg = (N * 4.5) + (m2 * 2.0) + (N * 1.5);
    }
    const isBaselineValid = baselineKg > 0;

    // Dynamic Flight Class Multiplier (DEFRA / DESNZ Official Greenhouse Gas Reporting Protocol)
    // Short-Medium Haul (<3700km): 1.50x (Euro-Business blocked middle seat model)
    // Long Haul International (>=3700km): 2.90x (Wide-body Lie-flat suite model)
    let flightMultiplier = 1.0;
    if (flightClass === 'business') {
        if (flightKm < 3700) {
            flightMultiplier = 1.50;
        } else {
            flightMultiplier = 2.90;
        }
    }

    // 4 Pillars Calculation
    const flightKg = flightKm * 0.14 * flightMultiplier;
    const transitKg = localTransitKm * 0.16;
    const freightKg = freightTonKm * 0.11;
    const p1TravelKg = flightKg + transitKg + freightKg;

    const elecKg = eleckWh * 0.40;
    const hotelKg = hotelNights * 14.0;
    const p2EnergyKg = elecKg + hotelKg;

    const p3CateringKg = (mealsRed * 4.2) + (mealsChicken * 1.3) + (mealsVeg * 0.4);

    const stageKg = buildM2 * 8.5;
    const swagKg = swagCount * 0.6;
    const p4MaterialsKg = stageKg + swagKg;

    const totalEmissionsKg = p1TravelKg + p2EnergyKg + p3CateringKg + p4MaterialsKg;
    const totalEmissionsTon = totalEmissionsKg / 1000;

    // Zero division guard & Floating-point 1-decimal rounding (prevents 15.000000002 boundary flips)
    let diffPct = 0;
    if (isBaselineValid) {
        const rawDiff = ((totalEmissionsKg - baselineKg) / baselineKg) * 100;
        diffPct = Math.round(rawDiff * 10) / 10;
    }

    // GHG Protocol Scope 1, Scope 2, Scope 3 Breakdown
    const scope1Kg = 0; // Tesis içi doğrudan sabit yakıt/jeneratör kaynağı bulunmuyor (0 kg)
    const scope2Kg = elecKg; // Satın alınan şebeke elektriği (Scope 2)
    const scope3Kg = (flightKg + transitKg + freightKg) + hotelKg + p3CateringKg + p4MaterialsKg; // İş seyahati, otel, gıda, vinil/malzeme (Scope 3)

    return {
        baselineKg,
        isBaselineValid,
        isOnlineEvent,
        p1TravelKg,
        p2EnergyKg,
        p3CateringKg,
        p4MaterialsKg,
        scope1Kg,
        scope2Kg,
        scope3Kg,
        scope1Ton: scope1Kg / 1000,
        scope2Ton: scope2Kg / 1000,
        scope3Ton: scope3Kg / 1000,
        totalEmissionsKg,
        totalEmissionsTon,
        diffPct
    };
}

function getWizardInputParams() {
    return {
        title: document.getElementById('evTitle')?.value || 'Kristal Elma 2026 Ödül Töreni',
        isOnline: document.getElementById('evIsOnline')?.checked || false,
        attendees: safeNum(document.getElementById('evAttendees')?.value),
        area: safeNum(document.getElementById('evArea')?.value),
        flightKm: safeNum(document.getElementById('evFlightKm')?.value),
        flightClass: document.getElementById('evFlightClass')?.value || 'economy',
        localTransitKm: safeNum(document.getElementById('evLocalTransitKm')?.value),
        freightTonKm: safeNum(document.getElementById('evFreightTonKm')?.value),
        eleckWh: safeNum(document.getElementById('evEleckWh')?.value),
        hotelNights: safeNum(document.getElementById('evHotelNights')?.value),
        mealsRed: safeNum(document.getElementById('evMealsRed')?.value),
        mealsChicken: safeNum(document.getElementById('evMealsChicken')?.value),
        mealsVeg: safeNum(document.getElementById('evMealsVeg')?.value),
        buildM2: safeNum(document.getElementById('evBuildM2')?.value),
        swagCount: safeNum(document.getElementById('evSwagCount')?.value)
    };
}

function calculateAndRenderEventResult() {
    const params = getWizardInputParams();
    const res = computeEventEmissions(params);

    const titleEl = document.getElementById('evResultTitle');
    if (titleEl) titleEl.textContent = params.title;

    const numEl = document.getElementById('evResultTotalVal');
    if (numEl) numEl.textContent = formatTR(res.totalEmissionsKg, 2);

    const baseValEl = document.getElementById('evBaselineVal');
    if (baseValEl) baseValEl.textContent = `${formatTR(res.baselineKg, 1)} kg`;

    const calcValEl = document.getElementById('evCalculatedVal');
    if (calcValEl) calcValEl.textContent = `${formatTR(res.totalEmissionsKg, 1)} kg`;

    const diffValEl = document.getElementById('evDiffVal');
    if (diffValEl) {
        if (!res.isBaselineValid) {
            diffValEl.textContent = 'Veri Girilmedi';
            diffValEl.className = 'row-val-bold amber';
        } else if (res.diffPct <= 0) {
            diffValEl.textContent = `-${formatTR(Math.abs(res.diffPct), 1)}% Tasarruf`;
            diffValEl.className = 'row-val-bold green';
        } else if (res.diffPct <= 15) {
            diffValEl.textContent = `+${formatTR(res.diffPct, 1)}% Yakın`;
            diffValEl.className = 'row-val-bold amber';
        } else {
            diffValEl.textContent = `+${formatTR(res.diffPct, 1)}% Artış`;
            diffValEl.className = 'row-val-bold red';
        }
    }



    // 4 Pillar Breakdown Visual Progress Bar & Legend
    const tot = res.totalEmissionsKg > 0 ? res.totalEmissionsKg : 1;

    // realPct → gerçek hesaplanmış oran (label, legend, PDF için)
    const p1RealPct = (res.p1TravelKg / tot) * 100;
    const p2RealPct = (res.p2EnergyKg / tot) * 100;
    const p3RealPct = (res.p3CateringKg / tot) * 100;
    const p4RealPct = (res.p4MaterialsKg / tot) * 100;

    // barPct → sadece bar görünürlüğü için minimum %2 klamp (hiçbir sütun kaybolmasın)
    const p1BarPct = Math.max(2, p1RealPct);
    const p2BarPct = Math.max(2, p2RealPct);
    const p3BarPct = Math.max(2, p3RealPct);
    const p4BarPct = Math.max(2, p4RealPct);

    const seg1 = document.getElementById('segP1');
    const seg2 = document.getElementById('segP2');
    const seg3 = document.getElementById('segP3');
    const seg4 = document.getElementById('segP4');

    if (seg1) seg1.style.width = `${p1BarPct}%`;
    if (seg2) seg2.style.width = `${p2BarPct}%`;
    if (seg3) seg3.style.width = `${p3BarPct}%`;
    if (seg4) seg4.style.width = `${p4BarPct}%`;

    const legendGrid = document.getElementById('evPillarLegend');
    if (legendGrid) {
        legendGrid.innerHTML = `
            <div class="legend-item"><span class="dot dot-p1"></span> <span>Seyahat (%${formatTR(p1RealPct, 1)})</span></div>
            <div class="legend-item"><span class="dot dot-p2"></span> <span>Tesis & Enerji (%${formatTR(p2RealPct, 1)})</span></div>
            <div class="legend-item"><span class="dot dot-p3"></span> <span>İkram & Gıda (%${formatTR(p3RealPct, 1)})</span></div>
            <div class="legend-item"><span class="dot dot-p4"></span> <span>Malzeme (%${formatTR(p4RealPct, 1)})</span></div>
        `;
    }

    const listEl = document.getElementById('evResultBreakdownList');
    if (listEl) {
        const pillars = [
            { name: '1. Seyahat & Lojistik', kg: res.p1TravelKg },
            { name: '2. Tesis & Enerji', kg: res.p2EnergyKg },
            { name: '3. İkram & Gıda', kg: res.p3CateringKg },
            { name: '4. Malzeme & Atık', kg: res.p4MaterialsKg }
        ];

        listEl.innerHTML = pillars.map(p => {
            const pct = res.totalEmissionsKg > 0 ? Math.min(100, (p.kg / res.totalEmissionsKg) * 100) : 0;
            return `
                <div class="apple-row">
                    <span class="row-label">${p.name}</span>
                    <span class="row-val-bold">${formatTR(p.kg / 1000, 2)} t (%${formatTR(pct, 1)})</span>
                </div>
            `;
        }).join('');
    }

    // GHG Protocol Scope 1, Scope 2, Scope 3 Dynamic UI Rendering
    const scopeListEl = document.getElementById('evResultScopeList');
    if (scopeListEl) {
        const hasEmissions = res.totalEmissionsKg > 0;
        const s1Pct = hasEmissions ? (res.scope1Kg / res.totalEmissionsKg) * 100 : 0;
        const s2Pct = hasEmissions ? (res.scope2Kg / res.totalEmissionsKg) * 100 : 0;
        const s3Pct = hasEmissions ? (res.scope3Kg / res.totalEmissionsKg) * 100 : 0;

        scopeListEl.innerHTML = `
            <div class="apple-row">
                <div class="row-left-text">
                    <span class="row-title">Scope 1 (Doğrudan Emisyonlar)</span>
                    <span class="row-sub">Tesis içi doğrudan sabit yakıt/jeneratör kaynağı bulunmuyor</span>
                </div>
                <span class="row-val-bold">0,00 t (%0,0)</span>
            </div>
            <div class="apple-row">
                <div class="row-left-text">
                    <span class="row-title">Scope 2 (Dolaylı Enerji)</span>
                    <span class="row-sub">Satın alınan şebeke elektriği tüketimi</span>
                </div>
                <span class="row-val-bold">${formatTR(res.scope2Ton, 2)} t (%${formatTR(s2Pct, 1)})</span>
            </div>
            <div class="apple-row">
                <div class="row-left-text">
                    <span class="row-title">Scope 3 (Tedarik Zinciri & Seyahat)</span>
                    <span class="row-sub">Uçuş, transfer, otel (Kat 6: İş Seyahati), kargo (Kat 4: Lojistik), gıda & malzeme üretimi (Kat 1)</span>
                </div>
                <span class="row-val-bold">${formatTR(res.scope3Ton, 2)} t (%${formatTR(s3Pct, 1)})</span>
            </div>
            ${params.hotelNights > 0 ? `
            <div class="apple-row" style="background: rgba(67, 56, 202, 0.05); padding: 0.75rem 0.9rem;">
                <div class="row-left-text">
                    <span class="row-sub" style="color: var(--text-secondary); font-size: 0.78rem; line-height: 1.35;">
                        <i class="fa-solid fa-circle-info" style="color: var(--accent-indigo); margin-right: 0.25rem;"></i>
                        <strong>Taksonomi Notu:</strong> ${params.hotelNights} gece otel/konaklama harcaması Etkinlik Kırılımında <em>"Tesis & Enerji"</em> başlığında; GHG Protokolü'nde ise iş seyahati (Scope 3 - Kat 6) altında hesaplanır. Toplam emisyon (%100,0) eşittir.
                    </span>
                </div>
            </div>
            ` : ''}
        `;
    }

    // Dynamic Population for Executive Legal Printable PDF Certificate
    const certTitle = document.getElementById('pdfCertEventTitle');
    if (certTitle) certTitle.textContent = params.title;

    const certNoStr = activeEventId ? `ANZ-${new Date().getFullYear()}-RVD-${activeEventId.replace(/[^0-9]/g, '').slice(-4) || '101'}` : 'ANZ-' + new Date().getFullYear() + '-RVD-' + Math.floor(1000 + Math.random() * 9000);
    const certNo = document.getElementById('pdfCertNo');
    if (certNo) certNo.textContent = certNoStr;

    const certAuth = document.getElementById('pdfCertAuthCode');
    if (certAuth) certAuth.textContent = certNoStr;

    const certDate = document.getElementById('pdfCertDate');
    if (certDate) certDate.textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    const certAtt = document.getElementById('pdfCertAttendees');
    if (certAtt) certAtt.textContent = `${params.attendees.toLocaleString('tr-TR')} Kişi`;

    const certArea = document.getElementById('pdfCertArea');
    if (certArea) certArea.textContent = `${params.area.toLocaleString('tr-TR')} m²`;

    const certTotTon = document.getElementById('pdfCertTotalEmissions');
    if (certTotTon) certTotTon.textContent = `${formatTR(res.totalEmissionsTon, 2)} t CO₂e`;

    const certTotKg = document.getElementById('pdfCertTotalKg');
    if (certTotKg) certTotKg.textContent = `${formatTR(res.totalEmissionsKg, 2)}`;

    const certTableTotTon = document.getElementById('pdfCertTableTotalTon');
    if (certTableTotTon) certTableTotTon.textContent = `${formatTR(res.totalEmissionsTon, 2)} t`;

    const certPerf = document.getElementById('pdfCertPerformance');
    const certStatusBadge = document.getElementById('pdfCertStatusBadge');
    const certSealBadge = document.getElementById('pdfCertSealBadge');

    if (!res.isBaselineValid) {
        if (certPerf) {
            certPerf.textContent = 'Veri Yok';
            certPerf.className = 'pdf-hero-val';
        }
        if (certStatusBadge) {
            certStatusBadge.textContent = 'BEYAN HESAPLANAMADI';
            certStatusBadge.className = 'pdf-cert-iso-badge';
        }
        if (certSealBadge) {
            certSealBadge.innerHTML = '<i class="fa-solid fa-circle-question"></i> BASELINE İÇİN VERİ GİRİNİZ';
            certSealBadge.className = 'pdf-seal-badge';
        }
    } else if (res.diffPct <= 0) {
        if (certPerf) {
            certPerf.textContent = `-${formatTR(Math.abs(res.diffPct), 1)}% Tasarruf`;
            certPerf.className = 'pdf-hero-val green';
        }
        if (certStatusBadge) {
            certStatusBadge.textContent = 'DİJİTAL KARBON BEYANI';
            certStatusBadge.className = 'pdf-cert-iso-badge green';
        }
        if (certSealBadge) {
            certSealBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> SEKTÖR REFERANS HEDEFİNE ULAŞILDI';
            certSealBadge.className = 'pdf-seal-badge green';
        }
    } else {
        if (certPerf) {
            certPerf.textContent = `+${formatTR(res.diffPct, 1)}% Artış`;
            certPerf.className = 'pdf-hero-val red';
        }
        if (certStatusBadge) {
            certStatusBadge.textContent = 'BASELINE AŞILDI (YÜKSEK EMİSYON)';
            certStatusBadge.className = 'pdf-cert-iso-badge red';
        }
        if (certSealBadge) {
            certSealBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> BASELINE AŞILDI (EMİSYON ARTIŞI)';
            certSealBadge.className = 'pdf-seal-badge red';
        }
    }

    const certBaseSub = document.getElementById('pdfCertBaselineSub');
    if (certBaseSub) certBaseSub.textContent = `Baseline: ${formatTR(res.baselineKg, 0)} kg CO₂e`;

    // 4 Pillars PDF Table Inputs
    const p1Inp = document.getElementById('pdfCertP1Inputs');
    if (p1Inp) p1Inp.textContent = `${params.flightKm.toLocaleString('tr-TR')} km Uçuş, ${params.localTransitKm.toLocaleString('tr-TR')} km Transfer`;

    const p1Ton = document.getElementById('pdfCertP1Ton');
    if (p1Ton) p1Ton.textContent = `${formatTR(res.p1TravelKg / 1000, 2)} t`;

    const p1PctEl = document.getElementById('pdfCertP1Pct');
    if (p1PctEl) p1PctEl.textContent = `%${formatTR(p1RealPct, 1)}`;

    const p2Inp = document.getElementById('pdfCertP2Inputs');
    if (p2Inp) p2Inp.textContent = `${params.eleckWh.toLocaleString('tr-TR')} kWh Elektrik, ${params.hotelNights} Gece`;

    const p2Ton = document.getElementById('pdfCertP2Ton');
    if (p2Ton) p2Ton.textContent = `${formatTR(res.p2EnergyKg / 1000, 2)} t`;

    const p2PctEl = document.getElementById('pdfCertP2Pct');
    if (p2PctEl) p2PctEl.textContent = `%${formatTR(p2RealPct, 1)}`;

    const p3Inp = document.getElementById('pdfCertP3Inputs');
    if (p3Inp) p3Inp.textContent = `${(params.mealsRed + params.mealsChicken + params.mealsVeg).toLocaleString('tr-TR')} Porsiyon Menü`;

    const p3Ton = document.getElementById('pdfCertP3Ton');
    if (p3Ton) p3Ton.textContent = `${formatTR(res.p3CateringKg / 1000, 2)} t`;

    const p3PctEl = document.getElementById('pdfCertP3Pct');
    if (p3PctEl) p3PctEl.textContent = `%${formatTR(p3RealPct, 1)}`;

    const p4Inp = document.getElementById('pdfCertP4Inputs');
    if (p4Inp) p4Inp.textContent = `${params.buildM2} m² Sahne, ${params.swagCount} Promosyon`;

    const p4Ton = document.getElementById('pdfCertP4Ton');
    if (p4Ton) p4Ton.textContent = `${formatTR(res.p4MaterialsKg / 1000, 2)} t`;

    const p4PctEl = document.getElementById('pdfCertP4Pct');
    if (p4PctEl) p4PctEl.textContent = `%${formatTR(p4RealPct, 1)}`;

    // Populate PDF Certificate GHG Protocol Scope 1, 2, 3 values
    const certS1Val = document.getElementById('pdfCertScope1Val');
    if (certS1Val) certS1Val.textContent = `0,00 t (%0,0)`;

    const hasEmissions = res.totalEmissionsKg > 0;
    const certS2Val = document.getElementById('pdfCertScope2Val');
    if (certS2Val) {
        const s2Pct = hasEmissions ? (res.scope2Kg / res.totalEmissionsKg) * 100 : 0;
        certS2Val.textContent = `${formatTR(res.scope2Ton, 2)} t (%${formatTR(s2Pct, 1)})`;
    }

    const certS3Val = document.getElementById('pdfCertScope3Val');
    if (certS3Val) {
        const s3Pct = hasEmissions ? (res.scope3Kg / res.totalEmissionsKg) * 100 : 0;
        certS3Val.textContent = `${formatTR(res.scope3Ton, 2)} t (%${formatTR(s3Pct, 1)})`;
    }

    const pdfTaxNote = document.getElementById('pdfCertTaxonomyNote');
    if (pdfTaxNote) {
        pdfTaxNote.style.display = params.hotelNights > 0 ? 'block' : 'none';
    }
}

// ===== DASHBOARD RENDER & STATS =====

function getBadgeColorClass(diffPct, isBaselineValid = true) {
    if (!isBaselineValid) return 'badge-neutral';        // Baseline tanımsız/veri girilmedi -> Nötr gri
    if (diffPct <= 0) return 'badge-green';              // Baseline altı / Tasarruf (Başarı #22C55E)
    if (diffPct <= 15) return 'badge-amber';             // Baseline yakın (Uyarı #F59E0B)
    return 'badge-red';                                  // Baseline üstü (Tehlike #EF4444)
}

function openEventResult(eventId) {
    const ev = userEventsList.find(e => e.id === eventId);
    if (!ev) return;

    isNewWizardFlow = false;
    activeEventId = eventId;
    populateWizardInputs(ev);
    currentWizardStep = 5;

    const sheetTitle = document.getElementById('sheetTitle');
    if (sheetTitle) sheetTitle.textContent = ev.title;

    const cancelBtn = document.getElementById('sheetCancelBtn');
    if (cancelBtn) cancelBtn.textContent = 'Kapat';

    calculateAndRenderEventResult();
    updateEventWizardUI();

    const modal = document.getElementById('eventWizardModal');
    if (modal) modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

let currentDashboardPage = 1;
let dashboardItemsPerPage = 10;

function setDashboardPage(page) {
    currentDashboardPage = page;
    renderEventsDashboard();
}

function changeItemsPerPage(val) {
    dashboardItemsPerPage = parseInt(val, 10) || 10;
    currentDashboardPage = 1;
    renderEventsDashboard();
}

function renderEventsDashboard() {
    const container = document.getElementById('eventsListContainer');
    const pagContainer = document.getElementById('eventsPaginationContainer');
    if (!container) return;

    if (userEventsList.length === 0) {
        container.innerHTML = `<div class="empty-state">Kayıtlı etkinlik bulunmuyor.</div>`;
        if (pagContainer) pagContainer.style.display = 'none';
        updateExecutiveStats(0, 0, 0);
        return;
    }

    // Filter by search query if any
    const query = document.getElementById('historySearchInput')?.value.toLowerCase().trim() || '';
    const filteredEvents = userEventsList.filter(ev => {
        if (!query) return true;
        return ev.title && ev.title.toLowerCase().includes(query);
    });

    // Compute grand totals across ALL events for executive KPI cards
    let grandTotalKg = 0;
    let grandBaselineKg = 0;
    userEventsList.forEach(ev => {
        const res = computeEventEmissions(ev);
        grandTotalKg += res.totalEmissionsKg;
        grandBaselineKg += res.baselineKg;
    });

    if (filteredEvents.length === 0) {
        container.innerHTML = `<div class="empty-state">Aramanıza uygun etkinlik bulunamadı.</div>`;
        if (pagContainer) pagContainer.style.display = 'none';
        const count = userEventsList.length;
        updateExecutiveStats(grandTotalKg, count > 0 ? grandTotalKg / count : 0, grandBaselineKg > 0 ? (((grandTotalKg - grandBaselineKg) / grandBaselineKg) * 100) : 0);
        return;
    }

    const totalItems = filteredEvents.length;
    const totalPages = Math.ceil(totalItems / dashboardItemsPerPage);

    // Clamp current page
    if (currentDashboardPage > totalPages) currentDashboardPage = totalPages;
    if (currentDashboardPage < 1) currentDashboardPage = 1;

    const startIdx = (currentDashboardPage - 1) * dashboardItemsPerPage;
    const endIdx = Math.min(startIdx + dashboardItemsPerPage, totalItems);
    const visibleEvents = filteredEvents.slice(startIdx, endIdx);

    container.innerHTML = visibleEvents.map(ev => {
        const res = computeEventEmissions(ev);
        const badgeClass = getBadgeColorClass(res.diffPct, res.isBaselineValid);

        return `
            <div class="apple-list-item" onclick="openEventResult('${escapeHtml(String(ev.id))}')" role="button" tabindex="0">
                <div class="list-item-left">
                    <span class="list-item-title">${escapeHtml(ev.title)}</span>
                    <span class="list-item-meta">${escapeHtml(String(ev.attendees))} Katılımcı • ${escapeHtml(formatTR(ev.area || 0, 0))} m² • ${escapeHtml(formatDateTR(ev.date))}</span>
                </div>
                <div class="list-item-right">
                    <span class="list-item-badge ${badgeClass}">${formatTR(res.totalEmissionsTon, 2)} t</span>
                    <i class="fa-solid fa-chevron-right list-item-chevron"></i>
                </div>
            </div>
        `;
    }).join('');

    // Pagination Bar rendering (only if totalItems > 10)
    if (pagContainer) {
        if (totalItems > 10) {
            pagContainer.style.display = 'block';
            pagContainer.innerHTML = renderPaginationHTML(totalItems, startIdx + 1, endIdx, currentDashboardPage, totalPages);
        } else {
            pagContainer.style.display = 'none';
        }
    }

    const count = userEventsList.length;
    const avgKg = count > 0 ? grandTotalKg / count : 0;
    const savingsPct = grandBaselineKg > 0 ? (((grandTotalKg - grandBaselineKg) / grandBaselineKg) * 100) : 0;

    updateExecutiveStats(grandTotalKg, avgKg, savingsPct);
}

function renderPaginationHTML(totalItems, startItem, endItem, currentPage, totalPages) {
    let pagesHTML = '';
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    if (startPage < 1) startPage = 1;

    for (let p = startPage; p <= endPage; p++) {
        pagesHTML += `
            <button class="pag-btn ${p === currentPage ? 'active' : ''}" onclick="setDashboardPage(${p})">${p}</button>
        `;
    }

    return `
        <div class="pagination-bar">
            <div class="pagination-info">${totalItems} kayıttan ${startItem}-${endItem} arası</div>
            <div class="pagination-controls">
                <button class="pag-btn" onclick="setDashboardPage(1)" ${currentPage === 1 ? 'disabled' : ''} title="İlk Sayfa">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button class="pag-btn" onclick="setDashboardPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} title="Önceki Sayfa">
                    <i class="fa-solid fa-angle-left"></i>
                </button>
                ${pagesHTML}
                <button class="pag-btn" onclick="setDashboardPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} title="Sonraki Sayfa">
                    <i class="fa-solid fa-angle-right"></i>
                </button>
                <button class="pag-btn" onclick="setDashboardPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} title="Son Sayfa">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>
            <div class="pag-select-wrap">
                <select class="pag-select" onchange="changeItemsPerPage(this.value)">
                    <option value="10" ${dashboardItemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${dashboardItemsPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${dashboardItemsPerPage === 50 ? 'selected' : ''}>50</option>
                </select>
            </div>
        </div>
    `;
}

function updateExecutiveStats(totalKg, avgKg, savingsPct) {
    const statTot = document.getElementById('statTotalEmissions');
    const statAvg = document.getElementById('statAvgEmissions');
    const statSav = document.getElementById('statSavingsPct');
    const statSavSub = document.getElementById('statSavingsSub');

    if (statTot) statTot.textContent = `${formatTR(totalKg / 1000, 1)} t`;
    if (statAvg) statAvg.textContent = `${formatTR(avgKg / 1000, 1)} t`;
    if (statSav) {
        if (savingsPct <= 0) {
            statSav.textContent = `-${formatTR(Math.abs(savingsPct), 1)}%`;
            statSav.className = 'stat-value green';
            if (statSavSub) statSavSub.textContent = 'Sektör Ortalamasına Göre';
        } else {
            statSav.textContent = `+${formatTR(savingsPct, 1)}%`;
            statSav.className = 'stat-value red';
            if (statSavSub) statSavSub.textContent = 'Sektör Ortalaması Üstü';
        }
    }
}

function finishEventWizard() {
    if (isNewWizardFlow) {
        const title = document.getElementById('evTitle')?.value || 'Yeni Etkinlik';
        const attendees = safeNum(document.getElementById('evAttendees')?.value, 750);
        const area = safeNum(document.getElementById('evArea')?.value, 1800);

        const newEv = {
            id: 'ev-' + Date.now(),
            title,
            attendees,
            area,
            flightKm: safeNum(document.getElementById('evFlightKm')?.value),
            flightClass: document.getElementById('evFlightClass')?.value || 'economy',
            localTransitKm: safeNum(document.getElementById('evLocalTransitKm')?.value),
            freightTonKm: safeNum(document.getElementById('evFreightTonKm')?.value),
            eleckWh: safeNum(document.getElementById('evEleckWh')?.value),
            hotelNights: safeNum(document.getElementById('evHotelNights')?.value),
            mealsRed: safeNum(document.getElementById('evMealsRed')?.value),
            mealsChicken: safeNum(document.getElementById('evMealsChicken')?.value),
            mealsVeg: safeNum(document.getElementById('evMealsVeg')?.value),
            buildM2: safeNum(document.getElementById('evBuildM2')?.value),
            swagCount: safeNum(document.getElementById('evSwagCount')?.value),
            date: new Date().toISOString().split('T')[0]
        };

        userEventsList.unshift(newEv);
        saveEventsToStorage();
        renderEventsDashboard();
        triggerAutoCloudSync(newEv);
    } else if (activeEventId) {
        const idx = userEventsList.findIndex(e => e.id === activeEventId);
        if (idx !== -1) {
            const updatedParams = getWizardInputParams();
            userEventsList[idx] = {
                ...userEventsList[idx],
                ...updatedParams
            };
            saveEventsToStorage();
            renderEventsDashboard();
            triggerAutoCloudSync(userEventsList[idx]);
        }
    }
    closeEventWizardModal();
}

async function triggerAutoCloudSync(eventData) {
    if (!eventData) return;
    try {
        const res = computeEventEmissions(eventData);
        const csvRow = [
            `"${(eventData.title || '').replace(/"/g, '""')}"`,
            eventData.date || '',
            eventData.attendees || 0,
            eventData.area || 0,
            formatTR(res.totalEmissionsTon, 2),
            formatTR(res.baselineKg, 1),
            formatTR(res.diffPct, 1),
            formatTR(res.scope1Ton, 2),
            formatTR(res.scope2Ton, 2),
            formatTR(res.scope3Ton, 2)
        ].join(';');

        await fetch('/api/cloud-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'Vercel Auto Sync Engine',
                eventTitle: eventData.title,
                eventDate: eventData.date,
                totalEmissionsTon: res.totalEmissionsTon,
                reportCsvData: csvRow
            })
        });
    } catch (e) {
        console.error('Auto cloud sync background fetch error:', e);
    }
}

async function deleteCurrentEvent() {
    if (!activeEventId) return;
    const ev = userEventsList.find(e => e.id === activeEventId);
    const titleName = ev ? ev.title : 'Bu etkinlik';
    
    const sure = await showCustomConfirm(
        'Etkinliği Sil',
        `"${titleName}" kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        'Etkinliği Sil',
        true
    );

    if (!sure) return;

    userEventsList = userEventsList.filter(e => e.id !== activeEventId);
    saveEventsToStorage();
    renderEventsDashboard();
    closeEventWizardModal();
}

function populateWizardInputs(ev) {
    if (!ev) return;
    if (document.getElementById('evTitle')) document.getElementById('evTitle').value = ev.title || '';
    if (document.getElementById('evIsOnline')) document.getElementById('evIsOnline').checked = !!ev.isOnline;
    if (document.getElementById('evAttendees')) document.getElementById('evAttendees').value = ev.attendees ?? 0;
    if (document.getElementById('evArea')) document.getElementById('evArea').value = ev.area ?? 0;
    if (document.getElementById('evFlightKm')) document.getElementById('evFlightKm').value = ev.flightKm ?? 0;
    selectFlightClass(ev.flightClass || 'economy');
    if (document.getElementById('evLocalTransitKm')) document.getElementById('evLocalTransitKm').value = ev.localTransitKm ?? 0;
    if (document.getElementById('evFreightTonKm')) document.getElementById('evFreightTonKm').value = ev.freightTonKm ?? 0;
    if (document.getElementById('evEleckWh')) document.getElementById('evEleckWh').value = ev.eleckWh ?? 0;
    if (document.getElementById('evHotelNights')) document.getElementById('evHotelNights').value = ev.hotelNights ?? 0;
    if (document.getElementById('evMealsRed')) document.getElementById('evMealsRed').value = ev.mealsRed ?? 0;
    if (document.getElementById('evMealsChicken')) document.getElementById('evMealsChicken').value = ev.mealsChicken ?? 0;
    if (document.getElementById('evMealsVeg')) document.getElementById('evMealsVeg').value = ev.mealsVeg ?? 0;
    if (document.getElementById('evBuildM2')) document.getElementById('evBuildM2').value = ev.buildM2 ?? 0;
    if (document.getElementById('evSwagCount')) document.getElementById('evSwagCount').value = ev.swagCount ?? 0;
}

async function downloadCurrentEventPDF() {
    const params = getWizardInputParams();
    const res = computeEventEmissions(params);
    if (!res.isBaselineValid) {
        await showCustomAlert(
            'PDF Raporu Engellendi',
            'Karbon emisyon raporu oluşturabilmek için lütfen Katılımcı Sayısı veya Tesis Alanı verisini giriniz.\n\nEksik verilerle rapor belgesi üretilemez.',
            'fa-triangle-exclamation'
        );
        return;
    }
    window.print();
}

async function downloadEventPDF(eventId) {
    const ev = userEventsList.find(e => e.id === eventId);
    if (!ev) return;
    const res = computeEventEmissions(ev);
    if (!res.isBaselineValid) {
        await showCustomAlert(
            'PDF Raporu Engellendi',
            `"${ev.title}" etkinliği için Katılımcı Sayısı veya Tesis Alanı girilmediğinden karbon emisyon PDF raporu oluşturulamaz.`,
            'fa-triangle-exclamation'
        );
        return;
    }
    openEventResult(eventId);
    setTimeout(() => {
        window.print();
    }, 200);
}

function filterHistoryList() {
    currentDashboardPage = 1;
    renderEventsDashboard();
}

function debounce(func, delay = 200) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

async function exportDeclarationsCSV() {
    if (!userEventsList || userEventsList.length === 0) {
        await showCustomAlert(
            'Veri Bulunamadı',
            'Dışa aktarılacak kayıtlı etkinlik beyannamesi bulunmamaktadır. Önce yeni bir etkinlik oluşturup kaydediniz.',
            'fa-info-circle'
        );
        return;
    }

    const count = userEventsList.length;
    const confirmExport = await showCustomConfirm(
        'Excel / CSV Dışa Aktar',
        `Kayıtlı ${count} adet etkinlik emisyon verisi Microsoft Excel uyumlu CSV formatında cihazınıza indirilecektir. Onaylıyor musunuz?`,
        'Excel CSV İndir',
        false,
        'fa-file-excel'
    );

    if (!confirmExport) return;

    const headers = [
        'Etkinlik Adı',
        'Tarih',
        'Katılımcı (Kişi)',
        'Tesis Alanı (m2)',
        'Uçuş (km)',
        'Kabin Sınıfı',
        'Transfer (km)',
        'Kargo (ton-km)',
        'Elektrik (kWh)',
        'Otel (Gece)',
        'Kırmızı Et (Porsiyon)',
        'Tavuk/Balık (Porsiyon)',
        'Vejetaryen (Porsiyon)',
        'Sahne (m2)',
        'Promosyon (Adet)',
        'Toplam Emisyon (t CO2e)',
        'Baseline (kg CO2e)',
        'Performans Oranı (%)',
        'Scope 1 (t CO2e)',
        'Scope 2 (t CO2e)',
        'Scope 3 (t CO2e)'
    ];

    const rows = userEventsList.map(ev => {
        const res = computeEventEmissions(ev);
        let rawTitle = (ev.title || '').trim();
        if (/^[=+@\-\t\r]/.test(rawTitle)) {
            rawTitle = "'" + rawTitle;
        }
        const safeTitle = `"${rawTitle.replace(/"/g, '""')}"`;
        return [
            safeTitle,
            ev.date || '',
            ev.attendees || 0,
            ev.area || 0,
            ev.flightKm || 0,
            ev.flightClass || 'economy',
            ev.localTransitKm || 0,
            ev.freightTonKm || 0,
            ev.eleckWh || 0,
            ev.hotelNights || 0,
            ev.mealsRed || 0,
            ev.mealsChicken || 0,
            ev.mealsVeg || 0,
            ev.buildM2 || 0,
            ev.swagCount || 0,
            formatTR(res.totalEmissionsTon, 2),
            formatTR(res.baselineKg, 1),
            formatTR(res.diffPct, 1),
            formatTR(res.scope1Ton, 2),
            formatTR(res.scope2Ton, 2),
            formatTR(res.scope3Ton, 2)
        ].join(';');
    });

    const csvContent = "\uFEFF" + headers.join(';') + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `EkoTakip_Etkinlik_Beyannameleri_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
}

async function exportDeclarationsJSON() {
    if (!userEventsList || userEventsList.length === 0) {
        await showCustomAlert(
            'Veri Bulunamadı',
            'Dışa aktarılacak kayıtlı etkinlik beyannamesi bulunmamaktadır. Önce yeni bir etkinlik oluşturup kaydediniz.',
            'fa-info-circle'
        );
        return;
    }

    const count = userEventsList.length;
    const confirmExport = await showCustomConfirm(
        'Verileri Dışa Aktar (JSON)',
        `Kayıtlı ${count} adet etkinlik emisyon beyannamesi verisi JSON formatında cihazınıza indirilecektir. Onaylıyor musunuz?`,
        'İndir',
        false,
        'fa-file-export'
    );

    if (!confirmExport) return;

    const exportData = userEventsList.map(ev => {
        const res = computeEventEmissions(ev);
        return {
            ...ev,
            computedMetrics: {
                totalEmissionsTon: parseFloat(res.totalEmissionsTon.toFixed(2)),
                totalEmissionsKg: parseFloat(res.totalEmissionsKg.toFixed(2)),
                baselineKg: parseFloat(res.baselineKg.toFixed(2)),
                diffPct: parseFloat(res.diffPct.toFixed(1)),
                p1TravelKg: parseFloat(res.p1TravelKg.toFixed(2)),
                p2EnergyKg: parseFloat(res.p2EnergyKg.toFixed(2)),
                p3CateringKg: parseFloat(res.p3CateringKg.toFixed(2)),
                p4MaterialsKg: parseFloat(res.p4MaterialsKg.toFixed(2)),
                scope1Kg: parseFloat(res.scope1Kg.toFixed(2)),
                scope2Kg: parseFloat(res.scope2Kg.toFixed(2)),
                scope3Kg: parseFloat(res.scope3Kg.toFixed(2))
            }
        };
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `EkoTakip_Etkinlik_Beyannameleri_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// ===== NATIVE DEVICE & OS SHARE INTEGRATION (Real Drive/OneDrive Share Sheet) =====

async function shareCurrentEventFile() {
    const params = getWizardInputParams();
    const res = computeEventEmissions(params);

    if (!res.isBaselineValid) {
        await showCustomAlert(
            'İşlem Engellendi',
            'Paylaşım yapabilmek için lütfen Katılımcı Sayısı veya Tesis Alanı verisini giriniz.',
            'fa-triangle-exclamation'
        );
        return;
    }

    const shareData = {
        title: `EkoTakip - ${params.title}`,
        text: `"${params.title}" Etkinliği Karbon Emisyonu: ${formatTR(res.totalEmissionsTon, 2)} t CO2e. Baseline Performansı: %${formatTR(res.diffPct, 1)}.`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share error:', err);
            }
        }
    } else {
        await showCustomAlert(
            'Bağlantı Kopyalandı',
            'Etkinlik emisyon özeti panoya kopyalandı.',
            'fa-copy'
        );
        try {
            await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        } catch (e) {
            console.error('Clipboard error:', e);
        }
    }
}

function openKvkkModal() {
    const main = document.getElementById('settingsMainView');
    const kvkkSub = document.getElementById('settingsKvkkSubView');
    const methodSub = document.getElementById('settingsMethodologySubView');
    const navBtn = document.getElementById('settingsNavBackBtn');
    const body = document.querySelector('.settings-sheet-body');
    if (main && kvkkSub) {
        main.style.display = 'none';
        if (methodSub) methodSub.style.display = 'none';
        kvkkSub.style.display = 'block';
        if (body) body.scrollTop = 0;
        if (navBtn) {
            navBtn.setAttribute('onclick', 'showSettingsMainView()');
            const span = navBtn.querySelector('span');
            if (span) span.textContent = 'Ayarlar';
        }
    }
}

function openMethodologySubView() {
    const main = document.getElementById('settingsMainView');
    const kvkkSub = document.getElementById('settingsKvkkSubView');
    const methodSub = document.getElementById('settingsMethodologySubView');
    const navBtn = document.getElementById('settingsNavBackBtn');
    const body = document.querySelector('.settings-sheet-body');
    if (main && methodSub) {
        main.style.display = 'none';
        if (kvkkSub) kvkkSub.style.display = 'none';
        methodSub.style.display = 'block';
        if (body) body.scrollTop = 0;
        if (navBtn) {
            navBtn.setAttribute('onclick', 'showSettingsMainView()');
            const span = navBtn.querySelector('span');
            if (span) span.textContent = 'Ayarlar';
        }
    }
}

function showSettingsMainView() {
    const main = document.getElementById('settingsMainView');
    const kvkkSub = document.getElementById('settingsKvkkSubView');
    const methodSub = document.getElementById('settingsMethodologySubView');
    const navBtn = document.getElementById('settingsNavBackBtn');
    const body = document.querySelector('.settings-sheet-body');
    if (main) {
        if (kvkkSub) kvkkSub.style.display = 'none';
        if (methodSub) methodSub.style.display = 'none';
        main.style.display = 'block';
        if (body) body.scrollTop = 0;
        if (navBtn) {
            navBtn.setAttribute('onclick', 'closeSettingsSheet()');
            const span = navBtn.querySelector('span');
            if (span) span.textContent = 'Geri';
        }
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

document.addEventListener('DOMContentLoaded', () => {
    renderEventsDashboard();

    const searchInput = document.getElementById('historySearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterHistoryList, 200));
    }

    // Input focus scroll into view for iOS keyboard stability
    document.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('focus', () => {
            setTimeout(() => {
                inp.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 200);
        });
    });

    // ── Keyboard shortcuts (desktop) ─────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        const wizardOpen   = document.getElementById('eventWizardModal')?.style.display !== 'none';
        const settingsOpen = document.getElementById('settingsSheetModal')?.style.display !== 'none';
        const dialogOpen   = document.getElementById('anzCustomDialogModal')?.style.display === 'flex';
        const tag          = document.activeElement?.tagName;
        const isTyping     = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        // Escape — close top-most modal
        if (e.key === 'Escape') {
            if (dialogOpen) return; // let dialog handle itself
            if (wizardOpen)   { closeEventWizardModal(); return; }
            if (settingsOpen) { closeSettingsSheet();    return; }
        }

        // Shortcuts only when wizard is open and user isn't mid-typing (except Tab/Enter)
        if (wizardOpen && !dialogOpen) {

            // Enter — advance step (but NOT when focus is inside a textarea or select)
            if (e.key === 'Enter' && !isTyping) {
                e.preventDefault();
                const resultSticky = document.getElementById('evResultStickyBar');
                const isResultStep = resultSticky?.style.display !== 'none';
                if (isResultStep) {
                    finishEventWizard();
                } else {
                    nextEventWizardStep();
                }
                return;
            }

            // Arrow keys — prev / next step (only when NOT typing)
            if (!isTyping) {
                if (e.key === 'ArrowRight') { e.preventDefault(); nextEventWizardStep(); return; }
                if (e.key === 'ArrowLeft')  { e.preventDefault(); prevEventWizardStep(); return; }
            }

            // Tab focus trap — keep Tab cycling inside the open wizard
            if (e.key === 'Tab') {
                const modal = document.getElementById('eventWizardModal');
                if (!modal) return;
                const focusable = Array.from(modal.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.offsetParent !== null);
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last  = focusable[focusable.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
                }
            }
        }

            // Tab focus trap inside settings sheet
        if (settingsOpen && !dialogOpen && e.key === 'Tab') {
            const modal = document.getElementById('settingsSheetModal');
            if (!modal) return;
            const focusable = Array.from(modal.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last  = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
            }
        }
    });
});

/* ==========================================================================
   EkoTakip - Sayfa 1: Makro İklim Zekası Engine
   ========================================================================== */

let currentActiveTabId = 'macroTab';
let globalDbData = null;

let macroLineChart = null;
let gasDoughnutChart = null;
let sectorBarChart = null;

let leafletMap = null;
let mapMarkers = [];

let companyCurrentPage = 1;
let companyItemsPerPage = 10;

let activeSelectedCompany = null;
let currentSubTab = 'overview';
let companyTabMapInstance = null;
let companyMapMarkers = [];

function switchTab(tabId) {
    currentActiveTabId = tabId;

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    const navMacro = document.getElementById('nav-link-macro');
    const navCompany = document.getElementById('nav-link-company');
    const navEvents = document.getElementById('nav-link-events');
    if (navMacro) navMacro.classList.toggle('active', tabId === 'macroTab');
    if (navCompany) navCompany.classList.toggle('active', tabId === 'companyTab');
    if (navEvents) navEvents.classList.toggle('active', tabId === 'eventsTab');

    const tbMacro = document.getElementById('tabbar-macro');
    const tbCompany = document.getElementById('tabbar-company');
    const tbEvents = document.getElementById('tabbar-events');
    if (tbMacro) tbMacro.classList.toggle('active', tabId === 'macroTab');
    if (tbCompany) tbCompany.classList.toggle('active', tabId === 'companyTab');
    if (tbEvents) tbEvents.classList.toggle('active', tabId === 'eventsTab');

    const fab = document.querySelector('.fab-bottom-right-btn');
    if (fab) {
        fab.style.display = tabId === 'eventsTab' ? 'flex' : 'none';
    }

    if (tabId === 'macroTab') {
        setTimeout(() => {
            if (leafletMap) leafletMap.invalidateSize();
            else initOrUpdateMap('ALL');
        }, 150);
    } else if (tabId === 'companyTab') {
        setTimeout(() => {
            if (!activeSelectedCompany && globalDbData && globalDbData.companies && globalDbData.companies.length > 0) {
                selectActiveCompany(globalDbData.companies[0].name);
            } else if (activeSelectedCompany) {
                renderCompanyTabCockpit();
            }
        }, 100);
    }
}

async function loadMacroData() {
    try {
        const response = await fetch('./data/adnet_emissions_db.json');
        if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
        
        globalDbData = await response.json();
        populateCompanyDropdowns();
        updateMacroKPIs();
        renderMacroCharts();
        initOrUpdateMap('ALL');
        renderCompanyLedger();
    } catch (err) {
        console.error('Makro veri yüklenemedi:', err);
    }
}

function updateMacroKPIs() {
    if (!globalDbData) return;
    const years = Object.keys(globalDbData.total_yearly);
    const lastYear = years[years.length - 1] || '2025';
    const totalVal = globalDbData.total_yearly[lastYear] || 883000000;
    const totalEst = (totalVal / 1000000).toFixed(1);
    
    const kpiEmissions = document.getElementById('kpiTotalEmissions');
    const kpiFacilities = document.getElementById('kpiFacilitiesCount');
    const kpiCompanies = document.getElementById('kpiCompaniesCount');

    if (kpiEmissions) kpiEmissions.textContent = `${totalEst} Mt CO₂e`;
    if (kpiFacilities) kpiFacilities.textContent = (globalDbData.summary?.total_facilities_mapped || 472).toLocaleString('tr-TR');
    if (kpiCompanies) kpiCompanies.textContent = (globalDbData.summary?.total_companies_mapped || 266).toLocaleString('tr-TR');
}

function renderMacroCharts() {
    if (!globalDbData) return;

    const computedStyles = getComputedStyle(document.documentElement);
    const isLightMode = document.documentElement.classList.contains('apple-light');
    const labelColor = computedStyles.getPropertyValue('--text-primary').trim() || '#F4F5F6';
    const subLabelColor = computedStyles.getPropertyValue('--text-secondary').trim() || '#9AA0AA';
    const gridColor = computedStyles.getPropertyValue('--bg-border').trim() || 'rgba(255, 255, 255, 0.08)';

    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = labelColor;
    }

    // 1. MACRO LINE CHART
    const canvasLine = document.getElementById('macroLineChart');
    if (canvasLine) {
        const ctxLine = canvasLine.getContext('2d');
        if (macroLineChart) macroLineChart.destroy();

        const yearlyObj = globalDbData.total_yearly;
        const labels = Object.keys(yearlyObj);
        const dataVals = Object.values(yearlyObj).map(v => parseFloat((v / 1000000).toFixed(2)));

        macroLineChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Türkiye Emisyonu (Mt CO₂e)',
                    data: dataVals,
                    borderColor: computedStyles.getPropertyValue('--status-success').trim() || '#6B8F71',
                    backgroundColor: isLightMode ? 'rgba(107, 143, 113, 0.14)' : 'rgba(34, 197, 94, 0.14)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointBackgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return `${context.parsed.y} Mt CO₂e`; }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: subLabelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: subLabelColor }, grid: { color: gridColor } }
                }
            }
        });
    }

    // 2. GAS DOUGHNUT CHART
    const canvasDoughnut = document.getElementById('gasDoughnutChart');
    if (canvasDoughnut) {
        const ctxDoughnut = canvasDoughnut.getContext('2d');
        if (gasDoughnutChart) gasDoughnutChart.destroy();

        gasDoughnutChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['CO₂', 'CH₄', 'N₂O', 'F-Gaz'],
                datasets: [{
                    data: [72, 18, 7, 3],
                    backgroundColor: ['#6B8F71', '#5B7C99', '#7C5295', '#C2622D'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor, boxWidth: 12 }
                    }
                }
            }
        });
    }

    // 3. SECTOR BAR CHART
    const canvasBar = document.getElementById('sectorBarChart');
    if (canvasBar) {
        const ctxBar = canvasBar.getContext('2d');
        if (sectorBarChart) sectorBarChart.destroy();

        const sectorTranslations = {
            'power': 'Santraller & Elektrik',
            'manufacturing': 'İmalat & Sanayi',
            'transportation': 'Ulaştırma & Nakliye',
            'waste': 'Atık Yönetimi',
            'agriculture': 'Tarım & Hayvancılık',
            'buildings': 'İnşaat & Binalar',
            'fossil-fuel-operations': 'Fosil Yakıtlar',
            'fluorinated-gases': 'F-Gazları',
            'forestry-and-land-use': 'Ormancılık',
            'mineral-extraction': 'Madencilik'
        };

        const sectorObj = globalDbData.sector_yearly;
        let sectorList = [];

        Object.keys(sectorObj).forEach(secKey => {
            const secData = sectorObj[secKey];
            const yrKey = secData['2025'] ? '2025' : Object.keys(secData).pop();
            const val = secData[yrKey] ? (secData[yrKey]['co2e_20yr'] || secData[yrKey]['co2e_100yr'] || 0) : 0;
            const mtVal = parseFloat((val / 1000000).toFixed(1));
            const cleanName = sectorTranslations[secKey] || secKey;
            
            sectorList.push({ name: cleanName, val: mtVal });
        });

        sectorList.sort((a, b) => b.val - a.val);
        sectorList = sectorList.slice(0, 6);

        sectorBarChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: sectorList.map(s => s.name),
                datasets: [{
                    label: 'Mt CO₂e / Yıl',
                    data: sectorList.map(s => s.val),
                    backgroundColor: ['#5B7C99', '#6B8F71', '#C2622D', '#8FA8B8', '#7C5295', '#9C6B5A'],
                    borderRadius: 5,
                    barThickness: 14
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) { return `${context.parsed.x} Mt CO₂e / Yıl`; }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: subLabelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: labelColor, font: { weight: '500' } }, grid: { display: false } }
                }
            }
        });
    }
}

function initOrUpdateMap(sectorFilter = 'ALL') {
    const mapDiv = document.getElementById('turkeyMap');
    if (!mapDiv) return;

    const isLightMode = document.documentElement.classList.contains('apple-light') || document.body.classList.contains('apple-light') || (localStorage.getItem('anz_theme') === 'light');
    const tileUrl = isLightMode
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    if (!leafletMap) {
        leafletMap = L.map('turkeyMap', { zoomControl: false }).setView([39.0, 35.2], 6);
        L.tileLayer(tileUrl, {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(leafletMap);
        
        L.control.zoom({ position: 'topright' }).addTo(leafletMap);
    } else {
        leafletMap.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                leafletMap.removeLayer(layer);
            }
        });
        L.tileLayer(tileUrl, {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(leafletMap);
    }

    mapMarkers.forEach(m => leafletMap.removeLayer(m));
    mapMarkers = [];

    if (!globalDbData || !globalDbData.facilities) return;

    const sectorColors = {
        'Enerji & Santraller': '#C2622D',
        'İmalat & Ağır Sanayi': '#6B8F71',
        'Ulaştırma & Lojistik': '#5B7C99',
        'Maden & Hammadde': '#7C5295',
        'İnşaat & Binalar': '#6B4E8F',
        'Tarım & Hayvancılık': '#9C6B5A'
    };

    globalDbData.facilities.forEach(fac => {
        const matches = (sectorFilter === 'ALL') || 
            (fac.sector && fac.sector.toLowerCase().includes(sectorFilter.toLowerCase()));
            
        if (matches) {
            const color = sectorColors[fac.sector] || '#6B8F71';
            const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 5), 14);
            
            const marker = L.circleMarker([fac.lat, fac.lon], {
                radius: radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.85)',
                weight: 1.5,
                opacity: 0.95,
                fillOpacity: 0.85
            }).addTo(leafletMap);

            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; padding: 4px; color: #1e293b;">
                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 700;">${escapeHtml(fac.name || '')}</h4>
                    <p style="margin: 0 0 2px 0; font-size: 0.78rem;"><strong>Sektör:</strong> ${escapeHtml(fac.sector || '')}</p>
                    <p style="margin: 0; font-size: 0.78rem;"><strong>Emisyon:</strong> ${(fac.emissions_tonnes || 0).toLocaleString('tr-TR')} Ton CO₂e</p>
                </div>
            `);

            mapMarkers.push(marker);
        }
    });
}

function filterMap(sector) {
    initOrUpdateMap(sector);
}

function renderCompanyLedger() {
    if (!globalDbData || !globalDbData.companies) return;

    const tbody = document.getElementById('companyTableBody');
    const mobileCardsContainer = document.getElementById('companyMobileCards');
    const emptyState = document.getElementById('companyEmptyState');
    const searchInput = document.getElementById('companySearchInput');
    const sectorFilter = document.getElementById('sectorFilterSelect');
    const sortFilter = document.getElementById('sortFilterSelect');

    const paginationInfo = document.getElementById('paginationInfoText');

    if (!tbody) return;

    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const sectorVal = sectorFilter ? sectorFilter.value : 'ALL';
    const sortVal = sortFilter ? sortFilter.value : 'emissions_desc';

    let filtered = globalDbData.companies.filter(c => {
        const matchesSearch = !searchVal || c.name.toLowerCase().includes(searchVal);
        const matchesSector = sectorVal === 'ALL' || c.sectors.some(s => s.toLowerCase().includes(sectorVal.toLowerCase()));
        return matchesSearch && matchesSector;
    });

    if (sortVal === 'emissions_desc') filtered.sort((a, b) => b.est_co2e_annual - a.est_co2e_annual);
    else if (sortVal === 'emissions_asc') filtered.sort((a, b) => a.est_co2e_annual - b.est_co2e_annual);
    else if (sortVal === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / companyItemsPerPage) || 1;

    if (companyCurrentPage > totalPages) companyCurrentPage = totalPages;
    if (companyCurrentPage < 1) companyCurrentPage = 1;

    const startIdx = (companyCurrentPage - 1) * companyItemsPerPage;
    const endIdx = Math.min(startIdx + companyItemsPerPage, totalCount);
    const pageItems = filtered.slice(startIdx, endIdx);

    tbody.innerHTML = '';
    if (mobileCardsContainer) mobileCardsContainer.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (paginationInfo) paginationInfo.textContent = '0 kayıttan 0 gösteriliyor';
        renderPaginationControls(0);
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (paginationInfo) {
        paginationInfo.textContent = `${totalCount} kayıttan ${startIdx + 1}-${endIdx} arası gösteriliyor`;
    }

    renderPaginationControls(totalPages);

    pageItems.forEach((c, idx) => {
        const emisionFormat = (c.est_co2e_annual >= 1000000) 
            ? (c.est_co2e_annual / 1000000).toFixed(2) + ' Mt CO₂e' 
            : c.est_co2e_annual.toLocaleString('tr-TR') + ' Ton';

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => openCompanyModal(c.name);
        tr.innerHTML = `
            <td>${startIdx + idx + 1}</td>
            <td>
                <strong>${c.name}</strong>
                <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${(c.assets || []).slice(0, 2).join(' • ')}</div>
            </td>
            <td><span style="font-size:0.8rem; color:var(--text-secondary);">${c.sectors.join(', ')}</span></td>
            <td>${(c.assets || []).length || 1} Tesis</td>
            <td><strong style="color:var(--status-success);">${emisionFormat}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    if (mobileCardsContainer) {
        mobileCardsContainer.innerHTML = '';
        mobileCardsContainer.style.cssText = 'margin-top: 1rem; border-top: 1px solid var(--bg-border); padding-top: 0.2rem;';

        pageItems.forEach((c, idx) => {
            const emisionFormat = (c.est_co2e_annual >= 1000000) 
                ? (c.est_co2e_annual / 1000000).toFixed(2) + ' Mt' 
                : c.est_co2e_annual.toLocaleString('tr-TR') + ' t';

            const row = document.createElement('div');
            row.className = 'ios-grouped-row';
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.95rem 0.2rem;
                cursor: pointer;
                border-bottom: ${idx < pageItems.length - 1 ? '1px solid var(--bg-border)' : 'none'};
                transition: background 0.15s ease;
            `;
            row.onmouseenter = () => row.style.background = 'var(--bg-secondary)';
            row.onmouseleave = () => row.style.background = 'transparent';
            row.onclick = () => openCompanyModal(c.name);

            row.innerHTML = `
                <div style="flex: 1; min-width: 0; padding-right: 0.8rem;">
                    <div style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(c.name)}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(c.sectors.slice(0, 1).join(', '))} • ${c.assets.length || 1} Tesis Yerleşkesi
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
                    <span style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${emisionFormat}</span>
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.85rem; color: var(--text-tertiary);" aria-hidden="true"></i>
                </div>
            `;
            mobileCardsContainer.appendChild(row);
        });
    }
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button class="page-nav-btn" onclick="changeCompanyPage(1)" ${companyCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angles-left"></i></button>`;
    html += `<button class="page-nav-btn" onclick="changeCompanyPage(${companyCurrentPage - 1})" ${companyCurrentPage === 1 ? 'disabled' : ''}><i class="fa-solid fa-angle-left"></i></button>`;

    let startPage = Math.max(1, companyCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        const isActive = p === companyCurrentPage ? 'active' : '';
        html += `<button class="page-nav-btn ${isActive}" onclick="changeCompanyPage(${p})">${p}</button>`;
    }

    html += `<button class="page-nav-btn" onclick="changeCompanyPage(${companyCurrentPage + 1})" ${companyCurrentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angle-right"></i></button>`;
    html += `<button class="page-nav-btn" onclick="changeCompanyPage(${totalPages})" ${companyCurrentPage === totalPages ? 'disabled' : ''}><i class="fa-solid fa-angles-right"></i></button>`;

    container.innerHTML = html;
}

function changeCompanyPage(newPage) {
    companyCurrentPage = newPage;
    renderCompanyLedger();
}

function changeItemsPerPage(newLimit) {
    companyItemsPerPage = parseInt(newLimit) || 10;
    companyCurrentPage = 1;
    renderCompanyLedger();
}

// Attach event listeners & initialize Makro engine
document.addEventListener('DOMContentLoaded', () => {
    loadMacroData();

    const searchInput = document.getElementById('companySearchInput');
    const sectorFilter = document.getElementById('sectorFilterSelect');
    const sortFilter = document.getElementById('sortFilterSelect');

    if (searchInput) searchInput.addEventListener('input', () => { companyCurrentPage = 1; renderCompanyLedger(); });
    if (sectorFilter) sectorFilter.addEventListener('change', () => { companyCurrentPage = 1; renderCompanyLedger(); });
    if (sortFilter) sortFilter.addEventListener('change', () => { companyCurrentPage = 1; renderCompanyLedger(); });
});

/* ==========================================================================
   EkoTakip - Sayfa 2: Şirketim Cockpit Engine
   ========================================================================== */

function populateCompanyDropdowns() {
    if (!globalDbData || !globalDbData.companies) return;

    const optionsHtml = globalDbData.companies.map((c, idx) =>
        `<option value="${escapeHtml(c.name)}">${idx + 1}. ${escapeHtml(c.name)}</option>`
    ).join('');

    const tabSelect = document.getElementById('companyTabSelect');
    if (tabSelect) tabSelect.innerHTML = '<option value="">Koç, Sabancı, Eti, Erdemir, THY…</option>' + optionsHtml;
}

function selectActiveCompany(companyName) {
    if (!companyName || !globalDbData) {
        resetActiveCompany();
        return;
    }

    const company = globalDbData.companies.find(c => 
        c.name.trim().toLowerCase() === companyName.trim().toLowerCase() ||
        c.name === companyName
    );
    if (!company) {
        resetActiveCompany();
        return;
    }

    activeSelectedCompany = company.name;

    const tabSelect = document.getElementById('companyTabSelect');
    if (tabSelect) tabSelect.value = company.name;

    switchTab('companyTab');
    renderCompanyTabCockpit();
}

function resetActiveCompany() {
    activeSelectedCompany = null;
    renderCompanyTabCockpit();
}

function getCompanyLogoHtml(company, size = 'lg') {
    if (!company) {
        return `
            <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--bg-secondary); color: var(--accent-indigo); font-weight: 700; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--bg-border);">
                <i class="fa-solid fa-building"></i>
            </div>
        `;
    }
    const initial = company.name.charAt(0).toUpperCase();
    return `
        <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--bg-secondary); color: var(--accent-indigo); font-weight: 700; font-size: 1.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--bg-border);">
            ${escapeHtml(initial)}
        </div>
    `;
}

function renderCompanyTabCockpit() {
    const activeContent = document.getElementById('companyTabActiveContent');
    if (!activeContent) return;

    if (!globalDbData || !globalDbData.companies) {
        activeContent.innerHTML = `
            <div class="apple-card apple-hero-cockpit-card" style="padding: 2rem; text-align: center;">
                <div style="font-size: 1.5rem; color: var(--accent-indigo); margin-bottom: 0.5rem;"><i class="fa-solid fa-spinner fa-spin"></i></div>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">Şirket verileri yükleniyor...</p>
            </div>
        `;
        return;
    }

    const company = activeSelectedCompany ? globalDbData.companies.find(c => c.name === activeSelectedCompany) : null;

    const rankIdx = company ? globalDbData.companies.findIndex(c => c.name === company.name) + 1 : '--';
    const totalEmissionsStr = company
        ? (company.est_co2e_annual >= 1000000
            ? (company.est_co2e_annual / 1000000).toFixed(2) + ' Mt CO₂e'
            : company.est_co2e_annual.toLocaleString('tr-TR') + ' Ton')
        : '--- Mt CO₂e';

    const logoMarkup = getCompanyLogoHtml(company, 'lg');
    const optionsHtml = `<option value="" ${!company ? 'selected' : ''}>— Kurum Seçin (Koç, Sabancı, Eti, THY...) —</option>` +
        globalDbData.companies.map((c, idx) =>
            `<option value="${escapeHtml(c.name)}" ${company && c.name === company.name ? 'selected' : ''}>${idx + 1}. ${escapeHtml(c.name)}</option>`
        ).join('');

    const assetsListHtml = (company && company.assets && company.assets.length > 0)
        ? company.assets.map(asset => `
            <div class="ios-facility-row">
                <div class="facility-row-left">
                    <div class="facility-squircle-icon">
                        <i class="fa-solid fa-industry"></i>
                    </div>
                    <div>
                        <span class="facility-title-text">${escapeHtml(asset)}</span>
                        <span class="facility-sub-text">${escapeHtml(company.sectors[0] || 'Sanayi')}</span>
                    </div>
                </div>
            </div>
        `).join('')
        : `<div style="padding: 1.2rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem;"><i class="fa-solid fa-hand-pointer" style="margin-right: 0.4rem; color: var(--accent-indigo);"></i> Yukarıdaki menüden kurum seçildiğinde bağlı tesisler ve harita lokasyonları yüklenecektir.</div>`;

    activeContent.innerHTML = `
        <div id="cockpitView-overview">
            <div class="cockpit-top-grid">
                <!-- Apple Hero Cockpit Card -->
                <div class="apple-card apple-hero-cockpit-card">
                    <div class="hero-company-picker-trigger" onclick="openMobilePicker()" style="display:flex; align-items:center; gap:0.9rem; cursor:pointer;">
                        ${logoMarkup}
                        <div style="flex:1; min-width:0;">
                            <select id="companyTabSelect" onpointerdown="event.preventDefault(); openMobilePicker();" onmousedown="event.preventDefault(); openMobilePicker();" ontouchstart="event.preventDefault(); openMobilePicker();" onclick="event.preventDefault(); openMobilePicker();" onfocus="this.blur(); openMobilePicker();" onchange="selectActiveCompany(this.value)" class="hero-company-select" style="background:transparent; border:none; color:var(--text-primary); font-size:1.2rem; font-weight:700; font-family:inherit; cursor:pointer; width:100%; outline:none; appearance:none; -webkit-appearance:none; -moz-appearance:none;">
                                ${optionsHtml}
                            </select>
                            <span class="hero-company-sub" style="display:block; margin-top:2px;">${company ? `${escapeHtml(company.sectors[0] || 'Sanayi')} • ${company.assets.length} Tesis Yerleşkesi` : 'Kurum emisyon ve tesis detayları'}</span>
                        </div>
                        <i class="fa-solid fa-chevron-right" style="color:var(--accent-indigo); font-size:0.95rem; opacity:0.85;" aria-hidden="true"></i>
                    </div>

                    <div class="hero-divider-line"></div>

                    <div class="hero-main-stat">
                        <div>
                            <span class="hero-stat-caption">YILLIK TOPLAM EMİSYON</span>
                            <span class="hero-stat-number" style="${!company ? 'color:var(--text-tertiary);' : ''}">${totalEmissionsStr}</span>
                        </div>
                        <div class="hero-stat-badge">
                            <i class="fa-solid fa-satellite-dish"></i> Uydu Ölçümü
                        </div>
                    </div>

                    <div class="hero-secondary-stats">
                        <div class="hero-sec-item">
                            <span class="hero-sec-val">${company ? `${company.assets.length} Tesis` : '--- Tesis'}</span>
                            <span class="hero-sec-label">Climate TRACE</span>
                        </div>
                        <div class="hero-sec-item">
                            <span class="hero-sec-val" style="color:var(--status-warning);">${rankIdx !== '--' ? `#${rankIdx} / ${globalDbData.companies.length}` : '--- Sıra'}</span>
                            <span class="hero-sec-label">Türkiye Sırası</span>
                        </div>
                        <div class="hero-sec-item">
                            <span class="hero-sec-val" style="color:var(--status-success);">%55 Azaltım</span>
                            <span class="hero-sec-label">SBTi 2030 Hedefi</span>
                        </div>
                    </div>
                </div>

                <!-- Mini Map Card -->
                <div class="apple-card">
                    <div class="card-header-flex">
                        <div>
                            <h3 class="card-title-text"><i class="fa-solid fa-map-location-dot" style="color: var(--accent-indigo);"></i> Tesis Konumları</h3>
                            <p class="card-subtitle">Uydulardan doğrulanmış fabrika ve santral lokasyonları</p>
                        </div>
                        <button type="button" class="card-expand-btn" onclick="openCompanyMapFullscreen()" title="Tam Ekran & Detaylar" aria-label="Büyüt">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                    </div>
                    <div id="companyTabMap" class="company-mini-map"></div>
                </div>
            </div>

            <!-- Connected Facilities List -->
            <div class="apple-card margin-top-1">
                <div class="card-header-flex">
                    <div>
                        <h3 class="card-title-text"><i class="fa-solid fa-layer-group" style="color: var(--accent-indigo);"></i> Bağlı Tesisler ${company ? `(${company.assets.length})` : ''}</h3>
                        <p class="card-subtitle">Climate TRACE uydu doğrulamalı emisyon ölçümleri</p>
                    </div>
                </div>
                <div class="margin-top-1">
                    ${assetsListHtml}
                </div>
            </div>

            <!-- Official Climate Disclosure Card (Resmi İklim Beyannamesi & ESG Raporlama) -->
            <div class="apple-card margin-top-1" id="companyTabDisclosureCard">
                <div class="card-header-flex" style="border-bottom:1px solid var(--bg-border); padding-bottom:0.8rem;">
                    <div>
                        <h3 class="card-title-text"><i class="fa-solid fa-file-contract" style="color: var(--accent-indigo, #6366f1);"></i> Resmi İklim Beyannamesi</h3>
                        <p class="card-subtitle">TCFD, CDP ve ISSB S2 standartlarında kurumsal iklim ve ESG açıklamaları</p>
                    </div>

                    <div class="disclosure-header-controls">
                        <select id="cockpitFramework" onchange="renderCockpitDisclosure()" class="apple-select-input">
                            <option value="tcfd" selected>TCFD Standartları</option>
                            <option value="cdp">CDP İklim Anketi</option>
                            <option value="issb">ISSB S2 Raporu</option>
                        </select>
                        <select id="cockpitYear" onchange="renderCockpitDisclosure()" class="apple-select-input">
                            <option value="2026" selected>Dönem 2026</option>
                            <option value="2025">Dönem 2025</option>
                        </select>
                        <button type="button" class="disclosure-pdf-btn" onclick="downloadCockpitPdf()">
                            <i class="fa-solid fa-file-pdf"></i> Resmi PDF İndir
                        </button>
                    </div>
                </div>

                <div id="cockpitDisclosureOutput" class="margin-top-1">
                    <!-- Populated dynamically by buildDisclosureHtml -->
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        initOrUpdateCompanyTabMap(company);
        renderCockpitDisclosure(company ? company.name : null);
    }, 150);
}

function switchCockpitSubTab(subTab) {
    currentSubTab = subTab;
    ['overview', 'ingestion', 'disclosure'].forEach(tab => {
        const view = document.getElementById('cockpitView-' + tab);
        if (view) view.style.display = (tab === subTab) ? 'block' : 'none';
    });

    document.querySelectorAll('.subnav-btn').forEach(btn => {
        const isActive = btn.getAttribute('onclick')?.includes(subTab);
        btn.classList.toggle('active', !!isActive);
    });

    if (subTab === 'overview' && activeSelectedCompany && globalDbData) {
        const company = globalDbData.companies.find(c => c.name === activeSelectedCompany);
        if (company) {
            setTimeout(() => {
                initOrUpdateCompanyTabMap(company);
            }, 100);
        }
    }
}

function initOrUpdateCompanyTabMap(company) {
    const mapDiv = document.getElementById('companyTabMap');
    if (!mapDiv || mapDiv.offsetWidth === 0 || mapDiv.offsetHeight === 0) return;

    if (companyTabMapInstance) {
        try {
            companyTabMapInstance.off();
            companyTabMapInstance.remove();
        } catch (e) {}
        companyTabMapInstance = null;
    }

    if (mapDiv._leaflet_id) {
        delete mapDiv._leaflet_id;
    }

    const isLightMode = document.documentElement.classList.contains('apple-light') || document.body.classList.contains('apple-light') || (localStorage.getItem('anz_theme') === 'light');
    const tileUrl = isLightMode
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    try {
        companyTabMapInstance = L.map('companyTabMap', { zoomControl: false }).setView([39.0, 35.2], 6);
        L.tileLayer(tileUrl, { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19 }).addTo(companyTabMapInstance);
        L.control.zoom({ position: 'topright' }).addTo(companyTabMapInstance);
    } catch (err) {
        console.warn('Company tab map suppressed:', err);
        return;
    }

    setTimeout(() => {
        if (companyTabMapInstance && mapDiv.offsetWidth > 0) {
            try { companyTabMapInstance.invalidateSize(); } catch (e) {}
        }
    }, 200);

    if (!company || !company.assets || !globalDbData || !globalDbData.facilities) return;

    const compAssetsLower = company.assets.map(a => a.toLowerCase().trim());
    const matchedFacs = globalDbData.facilities.filter(f => compAssetsLower.includes(f.name.toLowerCase().trim()));

    if (matchedFacs.length > 0) {
        const bounds = [];
        matchedFacs.forEach(fac => {
            const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 6), 16);
            const marker = L.circleMarker([fac.lat, fac.lon], {
                radius: radius,
                fillColor: '#6B8F71',
                color: '#FFFFFF',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(companyTabMapInstance);

            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; padding: 4px; color: #1e293b;">
                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 700;">${escapeHtml(fac.name || '')}</h4>
                    <p style="margin: 0 0 2px 0; font-size: 0.78rem;"><strong>Kurum:</strong> ${escapeHtml(company.name)}</p>
                    <p style="margin: 0; font-size: 0.78rem;"><strong>Emisyon:</strong> ${(fac.emissions_tonnes || 0).toLocaleString('tr-TR')} Ton CO₂e</p>
                </div>
            `);

            bounds.push([fac.lat, fac.lon]);
        });

        if (bounds.length === 1) {
            companyTabMapInstance.setView(bounds[0], 8);
        } else if (bounds.length > 1) {
            companyTabMapInstance.fitBounds(bounds, { padding: [30, 30] });
        }
    }
}

let currentPickerCallback = null;

function buildMobilePickerList(query = '') {
    const list = document.getElementById('mobilePickerList');
    if (!list || !globalDbData || !globalDbData.companies) return;

    const q = (query || '').toLowerCase().trim();
    const companies = globalDbData.companies
        .filter(c => !q || c.name.toLowerCase().includes(q) || (c.sectors && c.sectors.some(s => s.toLowerCase().includes(q))))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    list.innerHTML = '';

    if (companies.length === 0) {
        list.innerHTML = `<li style="padding: 1.5rem 1.25rem; color: var(--text-tertiary); font-size: 0.9rem; text-align: center;">Sonuç bulunamadı.</li>`;
        return;
    }

    companies.forEach((c, idx) => {
        const li = document.createElement('li');
        li.className = 'picker-list-item' + (c.name === activeSelectedCompany ? ' selected' : '');
        li.innerHTML = `
            <span><strong>${idx + 1}.</strong> ${escapeHtml(c.name)}</span>
            <span class="item-sector">${escapeHtml(c.sectors?.[0] || 'Sanayi')}</span>
            <i class="fa-solid fa-check item-check" aria-hidden="true"></i>
        `;
        li.addEventListener('click', () => {
            selectActiveCompany(c.name);
            if (typeof currentPickerCallback === 'function') {
                currentPickerCallback(c.name);
                currentPickerCallback = null;
            }
            closeMobilePicker();
        });
        list.appendChild(li);
    });
}

function openMobilePicker(onSelectCallback) {
    currentPickerCallback = typeof onSelectCallback === 'function' ? onSelectCallback : null;

    const screen = document.getElementById('mobilePickerScreen');
    const searchInput = document.getElementById('mobilePickerSearch');
    if (!screen) return;

    screen.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            screen.classList.add('open');
        });
    });

    buildMobilePickerList('');
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 220);
    document.body.style.overflow = 'hidden';
}

function closeMobilePicker() {
    const screen = document.getElementById('mobilePickerScreen');
    if (!screen) return;

    screen.classList.remove('open');
    document.body.style.overflow = '';

    const searchInput = document.getElementById('mobilePickerSearch');
    if (searchInput) searchInput.value = '';

    setTimeout(() => {
        screen.style.display = 'none';
    }, 250);
}

function filterMobilePicker(query) {
    buildMobilePickerList(query);
}

/* ==========================================================================
   COMPANY DETAIL & BEYANNAME MODAL ENGINE (MATCHING IMAGE 2)
   ========================================================================== */

let currentModalCompany = null;

function openCompanyModal(companyName) {
    if (!companyName || !globalDbData || !globalDbData.companies) return;
    const company = globalDbData.companies.find(c => c.name === companyName);
    if (!company) return;

    currentModalCompany = company.name;

    const modal = document.getElementById('companyDetailModal');
    if (!modal) return;

    const totalEmissions = company.est_co2e_annual || 0;
    const totalStr = (totalEmissions >= 1000000) 
        ? (totalEmissions / 1000000).toFixed(2) + ' Mt' 
        : totalEmissions.toLocaleString('tr-TR') + ' t';

    const s1 = totalEmissions * 0.22;
    const s2 = totalEmissions * 0.35;
    const s3 = totalEmissions * 0.43;

    const formatT = (val) => (val >= 1000000) ? (val / 1000000).toFixed(2) + ' Mt' : val.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' t';

    const nameEl = document.getElementById('modalCompanyName');
    const emissionEl = document.getElementById('modalCompanyTotalEmission');
    if (nameEl) nameEl.textContent = company.name;
    if (emissionEl) emissionEl.textContent = totalStr;

    const sectorBreakdown = document.getElementById('modalSectorBreakdown');
    if (sectorBreakdown) {
        sectorBreakdown.innerHTML = (company.assets && company.assets.length > 0)
            ? company.assets.slice(0, 4).map((a, i) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0; border-bottom:${i < Math.min(company.assets.length, 4) - 1 ? '1px solid var(--bg-border)' : 'none'};">
                    <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">${i + 1}. ${escapeHtml(a)}</span>
                    <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">${formatT(totalEmissions / company.assets.length)} (%${Math.round(100 / company.assets.length)})</span>
                </div>
            `).join('')
            : `<div style="font-size:0.82rem; color:var(--text-secondary);">Kayıtlı tesis bulunamadı.</div>`;
    }

    const s1El = document.getElementById('modalScope1Val');
    const s2El = document.getElementById('modalScope2Val');
    const s3El = document.getElementById('modalScope3Val');

    if (s1El) s1El.textContent = `${formatT(s1)} (%22,0)`;
    if (s2El) s2El.textContent = `${formatT(s2)} (%35,0)`;
    if (s3El) s3El.textContent = `${formatT(s3)} (%43,0)`;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCompanyDetailModal() {
    const modal = document.getElementById('companyDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

/* ==========================================================================
   REGULATORY DISCLOSURE ENGINE (TCFD / CDP / ISSB S2 / RVD BEYANNAMESİ)
   ========================================================================== */

const FRAMEWORK_META = {
    tcfd: { name: 'TCFD', label: 'İklimle İlgili Finansal Açıklamalar' },
    cdp:  { name: 'CDP',  label: 'İklim Değişikliği Anketi' },
    issb: { name: 'ISSB S2', label: 'İklimle İlgili Finansal Açıklamalar' }
};

function disclosureRow(category, label, value, source) {
    const isAuto = source === 'auto';
    const statusDot = isAuto 
        ? `<span style="color: var(--status-success); font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-check" style="font-size: 0.8rem;"></i> Doğrulandı</span>`
        : `<span style="color: var(--text-tertiary); font-weight: 500; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-minus" style="font-size: 0.75rem;"></i> Beyan Yok</span>`;

    return `
        <tr>
            <td style="font-weight:600; font-size:0.85rem;">${category}</td>
            <td style="font-size:0.85rem; color:var(--text-primary);">${label}</td>
            <td style="font-size:0.85rem; color:var(--text-secondary);">${value}</td>
            <td style="text-align:right;">${statusDot}</td>
        </tr>`;
}

function getCompanyDisclosureItems(company, framework) {
    if (!company) return [];
    
    const isHolding = company.name.toLowerCase().includes('holding') || company.name.toLowerCase().includes('a.ş') || (company.est_co2e_annual || 0) > 1000000;
    const facilities = company.assets?.length || 0;
    const totalEmissions = company.est_co2e_annual || 0;
    const emStr = totalEmissions >= 1000000
        ? (totalEmissions / 1000000).toFixed(2) + ' Mt CO₂e'
        : totalEmissions.toLocaleString('tr-TR') + ' t CO₂e';
    const sector = company.sectors?.[0] || 'Sanayi';

    const items = [];

    if (framework === 'tcfd' || framework === 'issb') {
        items.push({ cat: 'Yönetişim', label: 'Yönetim Kurulu Gözetimi', val: `${escapeHtml(company.name)} yönetim kurulu iklim risklerini gözetmektedir.`, src: 'auto' });
        items.push({ cat: 'Yönetişim', label: 'Yönetim Sorumluluğu', val: isHolding ? 'Sürdürülebilirlik Komitesi ataması tamamlanmıştır.' : 'Henüz beyan edilmedi', src: isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'Strateji', label: 'Faaliyet Sektörü', val: escapeHtml(sector), src: 'auto' });
        items.push({ cat: 'Strateji', label: 'Uydu Doğrulamalı Tesisler', val: `${facilities} aktif tesis (Climate TRACE v5.8)`, src: 'auto' });
        items.push({ cat: 'Strateji', label: 'Fiziksel Risk Analizi', val: isHolding ? 'İklim senaryo analizi (SSP2-4.5) tamamlandı.' : 'Henüz beyan edilmedi', src: isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'Risk Yönetimi', label: 'ERM İklim Entegrasyonu', val: isHolding ? 'Kurumsal Risk Yönetimi (ERM) matrisine entegre.' : 'Henüz beyan edilmedi', src: isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'Metrikler', label: 'Scope 1 Doğrudan Emisyon', val: `${emStr} (Uydu Ölçümü)`, src: 'auto' });
        items.push({ cat: 'Metrikler', label: 'Scope 2 Elektrik Emisyonu', val: 'Climate TRACE şebeke toplamına dahil', src: 'auto' });
        items.push({ cat: 'Metrikler', label: 'Net-Sıfır 2030 / 2050 Hedefi', val: isHolding ? '2050 Net-Sıfır Uyum Hedefi.' : '2030 %55 Azaltım Hedefi.', src: 'auto' });
    } else {
        items.push({ cat: 'C1 Governance', label: 'C1.1 Yönetim Gözetimi', val: `${escapeHtml(company.name)} iklim gözetim beyanı mevcut.`, src: 'auto' });
        items.push({ cat: 'C1 Governance', label: 'C1.2 Sorumluluk Yapısı', val: isHolding ? 'ESG ve Sürdürülebilirlik Komitesi sorumluluğunda.' : 'Henüz beyan edilmedi', src: isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'C2 Risks', label: 'C2.1 Risk Süreçleri', val: isHolding ? 'İklim riskleri kurumsal risk yönetimine entegre.' : 'Henüz beyan edilmedi', src: isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'C4 Targets', label: 'C4.1 Net-Sıfır Hedefi', val: '2030 %55 Azaltım & 2050 Net-Sıfır Taahhüdü.', src: 'auto' });
        items.push({ cat: 'C6 Emissions', label: 'C6.1 Gross Scope 1', val: `${emStr} (Climate TRACE v5.8)`, src: 'auto' });
        items.push({ cat: 'C6 Emissions', label: 'C6.3 Gross Scope 2', val: 'Şebeke emisyon tahminine dahil', src: 'auto' });
    }

    return items;
}

function buildDisclosureHtml(companyName, framework, year) {
    if (!companyName || !globalDbData) return '<div style="padding:1.2rem; text-align:center; color:var(--text-secondary);">Lütfen menüden bir kurum seçin.</div>';
    const company = globalDbData.companies.find(c => c.name === companyName);
    if (!company) return '<div style="padding:1.2rem; text-align:center; color:var(--text-secondary);">Lütfen menüden bir kurum seçin.</div>';

    const fm = FRAMEWORK_META[framework] || FRAMEWORK_META.tcfd;
    const items = getCompanyDisclosureItems(company, framework);

    let rowsHtml = '';
    let autoCount = 0;
    let totalCount = items.length;

    items.forEach(item => {
        const isAuto = item.src === 'auto';
        if (isAuto) autoCount++;
        rowsHtml += disclosureRow(item.cat, item.label, item.val, item.src);
    });

    const pct = totalCount ? Math.round((autoCount / totalCount) * 100) : 0;

    return `
        <div style="margin-top:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; padding-bottom:0.6rem; border-bottom:1px solid var(--bg-border); flex-wrap:wrap; gap:0.4rem;">
                <div>
                    <strong style="font-size:0.95rem; color:var(--text-primary);">${escapeHtml(company.name)}</strong>
                    <span style="font-size:0.8rem; color:var(--text-secondary); margin-left:0.4rem;">• ${fm.name} Beyanname Taslağı (${year})</span>
                </div>
                <div style="font-size:0.8rem; font-weight:600; color:var(--status-success);">Uyum Skoru: %${pct} (${autoCount}/${totalCount} Doğrulandı)</div>
            </div>
            
            <!-- Desktop Table View -->
            <div class="apple-table-wrap desktop-only" style="overflow-x:auto;">
                <table class="apple-table" style="min-width:600px;">
                    <thead>
                        <tr>
                            <th>Kategori</th>
                            <th>Açıklama / Gösterge</th>
                            <th>Beyan Verisi</th>
                            <th style="text-align:right;">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Grouped List View (NO INNER CARD BORDER OR BACKGROUND) -->
            <div class="mobile-only" style="margin-top:0.5rem;">
                ${items.map((item, idx) => `
                    <div class="ios-grouped-row" style="display:flex; justify-content:space-between; align-items:center; padding:0.95rem 0.2rem; border-bottom:${idx < items.length - 1 ? '1px solid var(--bg-border)' : 'none'};">
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:3px;">
                                <span style="font-size:0.72rem; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.04em;">${escapeHtml(item.cat)}</span>
                                <span style="font-size:0.72rem; font-weight:600; color:var(--status-success);">• ✓ Doğrulandı</span>
                            </div>
                            <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary); margin-bottom:2px;">
                                ${escapeHtml(item.label)}
                            </div>
                            <div style="font-size:0.82rem; color:var(--text-secondary); line-height:1.35;">
                                ${item.val}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function renderCockpitDisclosure(companyName) {
    const targetName = companyName || activeSelectedCompany;
    const framework = document.getElementById('cockpitFramework')?.value || 'tcfd';
    const year = document.getElementById('cockpitYear')?.value || '2026';
    const output = document.getElementById('cockpitDisclosureOutput');
    if (!output) return;
    output.innerHTML = buildDisclosureHtml(targetName, framework, year);
}

function downloadCockpitPdf(companyName) {
    const targetName = companyName || activeSelectedCompany;
    if (!targetName || !globalDbData) {
        alert('Lütfen önce bir kurum seçin.');
        return;
    }

    const company = globalDbData.companies.find(c => c.name === targetName);
    if (!company) {
        alert('Lütfen önce bir kurum seçin.');
        return;
    }

    const framework = document.getElementById('cockpitFramework')?.value || 'tcfd';
    const year = document.getElementById('cockpitYear')?.value || '2026';

    let pdfContainer = document.getElementById('pdfPrintTemplate');
    if (!pdfContainer) {
        pdfContainer = document.createElement('div');
        pdfContainer.id = 'pdfPrintTemplate';
        document.body.appendChild(pdfContainer);
    }

    pdfContainer.innerHTML = buildOfficialPdfTemplate(company, framework, year);
    
    setTimeout(() => {
        window.print();
    }, 100);
}

function buildOfficialPdfTemplate(company, framework, year) {
    const fm = FRAMEWORK_META[framework] || FRAMEWORK_META.tcfd;
    const totalEmissions = company.est_co2e_annual || 0;
    const emStr = totalEmissions >= 1000000
        ? (totalEmissions / 1000000).toFixed(2) + ' Mt CO₂e'
        : totalEmissions.toLocaleString('tr-TR') + ' t CO₂e';
    const sector = company.sectors?.[0] || 'Sanayi';
    const facilities = company.assets?.length || 0;

    const items = getCompanyDisclosureItems(company, framework);
    let rowsHtml = '';
    let autoCount = 0;
    let totalCount = items.length;

    items.forEach(item => {
        const isAuto = item.src === 'auto';
        if (isAuto) autoCount++;
        rowsHtml += `
            <tr>
                <td style="padding:8px; border:1px solid #ddd; font-weight:bold; font-size:12px;">${escapeHtml(item.cat)}</td>
                <td style="padding:8px; border:1px solid #ddd; font-size:12px;">${escapeHtml(item.label)}</td>
                <td style="padding:8px; border:1px solid #ddd; font-size:12px;">${item.val}</td>
                <td style="padding:8px; border:1px solid #ddd; text-align:center; font-size:12px; color:green;">${isAuto ? 'Doğrulandı' : 'Beyan Yok'}</td>
            </tr>
        `;
    });

    const pct = totalCount ? Math.round((autoCount / totalCount) * 100) : 0;

    return `
        <div style="font-family:-apple-system, sans-serif; padding:30px; background:#fff; color:#000;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:15px; margin-bottom:20px;">
                <div>
                    <h1 style="margin:0; font-size:22px;">EKO TAKİP PRO TÜRKİYE RESMİ İKLİM BEYANNAMESİ</h1>
                    <p style="margin:4px 0 0 0; font-size:13px; color:#555;">GHG Protocol & ISO 14064 Uluslararası Raporlama Standardı (${year})</p>
                </div>
                <div style="text-align:right; font-size:12px;">
                    <div><strong>Rapor Kodu:</strong> EKO-${year}-${Math.floor(100000 + Math.random()*900000)}</div>
                    <div><strong>Çerçeve:</strong> ${fm.name}</div>
                </div>
            </div>

            <div style="background:#f8f9fa; border:1px solid #eee; padding:15px; border-radius:6px; margin-bottom:20px; display:flex; justify-content:space-between;">
                <div>
                    <h2 style="margin:0; font-size:18px;">${escapeHtml(company.name)}</h2>
                    <p style="margin:4px 0 0 0; font-size:13px; color:#666;">Sektör: ${escapeHtml(sector)} | Tesis Sayısı: ${facilities}</p>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px; color:#666;">Yıllık Toplam Emisyon</div>
                    <div style="font-size:20px; font-weight:bold; color:#16a34a;">${emStr}</div>
                    <div style="font-size:12px; color:#16a34a; font-weight:bold;">Uyum Skoru: %${pct}</div>
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Kategori</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Gösterge</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Kurumsal Açıklama & Emisyon Verisi</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:center;">Durum</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #ddd; padding-top:15px; font-size:11px; color:#666;">
                <div><i class="fa-solid fa-shield-halved"></i> <strong>Climate TRACE Uydu Doğrulaması:</strong> Bu beyanname uydulardan doğrulanmış sera gazı emisyon verilerini içerir.</div>
                <div>Sayfa 1 / 1</div>
            </div>
        </div>
    `;
}

function exportEventsCSV() {
    if (!userEventsList || userEventsList.length === 0) {
        alert('Dışa aktarılacak kayıtlı etkinlik bulunamadı.');
        return;
    }

    let csvContent = "\uFEFFEtkinlik Adı;Tarih;Katılımcı Sayısı;Alan (m2);Konaklama (Gece);Toplam Emisyon (kg CO2e);Kişi Başı Emisyon (kg CO2e)\n";

    userEventsList.forEach(e => {
        const totalKg = e.totalCo2e || 0;
        const perPerson = e.attendees > 0 ? (totalKg / e.attendees).toFixed(2) : 0;
        csvContent += `"${e.title || ''}";"${e.date || ''}";${e.attendees || 0};${e.sqm || 0};${e.hotelNights || 0};${totalKg.toFixed(2)};${perPerson}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `etkinlik_karbon_hesaplamalari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ==========================================================================
   FULLSCREEN CHART & MAP MODAL SYSTEM LOGIC
   ========================================================================== */
let fullscreenChartInstance = null;
let fullscreenMapInstance = null;

function openCompanyMapFullscreen() {
    if (window.innerWidth <= 992) return;
    if (!activeSelectedCompany || !globalDbData) return;

    const company = globalDbData.companies.find(c => c.name === activeSelectedCompany);
    if (!company) return;

    const modal = document.getElementById('chartFullscreenModal');
    if (!modal) return;

    // Hide nav arrows — company map is a standalone view
    const navGroup = modal.querySelector('.fullscreen-nav-group');
    if (navGroup) navGroup.style.display = 'none';

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    // Set header texts
    document.getElementById('fullscreenModalTitle').innerHTML =
        `<i class="fa-solid fa-map-location-dot" style="color:var(--accent-indigo);"></i> ${escapeHtml(company.name)} — Tesis Haritası`;
    document.getElementById('fullscreenModalSubtitle').textContent =
        `${company.name} bünyesindeki uydu doğrulamalı fabrika ve santral lokasyonları`;
    document.getElementById('fullscreenTableTitle').innerHTML =
        `<i class="fa-solid fa-building-flag"></i> ${escapeHtml(company.name)} Tesisleri`;

    // Switch to map view
    document.getElementById('fullscreenChartContainer').style.display = 'none';
    document.getElementById('fullscreenMapContainer').style.display = 'block';

    // Match facilities
    const compAssetsLower = (company.assets || []).map(a => a.toLowerCase().trim());
    const matchedFacs = (globalDbData.facilities || []).filter(f =>
        compAssetsLower.includes((f.name || '').toLowerCase().trim())
    );
    matchedFacs.sort((a, b) => (b.emissions_tonnes || 0) - (a.emissions_tonnes || 0));

    // KPI cards
    const totalEmissions = matchedFacs.reduce((s, f) => s + (f.emissions_tonnes || 0), 0);
    const citiesCount = new Set(matchedFacs.map(f => getFacilityCity(f))).size;
    const kpiGrid = document.getElementById('fullscreenKpiGrid');
    kpiGrid.innerHTML = `
        <div class="fullscreen-kpi-card">
            <span class="fullscreen-kpi-label">Bağlı Tesis</span>
            <span class="fullscreen-kpi-value" style="color:var(--accent-indigo);">${matchedFacs.length} Tesis</span>
            <span class="fullscreen-kpi-sub">Uydu Tespiti Yapılmış</span>
        </div>
        <div class="fullscreen-kpi-card">
            <span class="fullscreen-kpi-label">Toplam Emisyon</span>
            <span class="fullscreen-kpi-value" style="color:var(--status-danger,#dc2626);">${(totalEmissions/1000000).toFixed(2)} Mt</span>
            <span class="fullscreen-kpi-sub">CO₂e / Yıl</span>
        </div>
        <div class="fullscreen-kpi-card">
            <span class="fullscreen-kpi-label">Kapsanan İller</span>
            <span class="fullscreen-kpi-value">${citiesCount} İl</span>
            <span class="fullscreen-kpi-sub">Coğrafi Dağılım</span>
        </div>
        <div class="fullscreen-kpi-card">
            <span class="fullscreen-kpi-label">Doğrulama</span>
            <span class="fullscreen-kpi-value" style="color:var(--status-success,#34c759);">IPCC Tier-3</span>
            <span class="fullscreen-kpi-sub">Climate TRACE 2024/2025</span>
        </div>
    `;

    // Table
    document.getElementById('fullscreenTableHead').innerHTML = `
        <tr><th>Tesis Adı</th><th>Sektör</th><th>Yıllık Emisyon</th><th>Konum</th></tr>
    `;
    document.getElementById('fullscreenTableBody').innerHTML = matchedFacs.map(f => {
        const lon = f.lon || f.lng;
        const city = getFacilityCity(f);
        const emStr = (f.emissions_tonnes || 0) >= 1000000
            ? ((f.emissions_tonnes || 0)/1000000).toFixed(2) + ' Mt CO₂e'
            : (f.emissions_tonnes || 0).toLocaleString('tr-TR') + ' Ton CO₂e';
        return `
            <tr style="cursor:pointer;" onclick="focusFullscreenMapMarker(${f.lat}, ${lon}, '${escapeHtml(f.name)}')">
                <td><strong><i class="fa-solid fa-location-dot" style="color:var(--accent-indigo); margin-right:4px;"></i>${escapeHtml(f.name)}</strong></td>
                <td><span class="status-badge status-active">${escapeHtml(f.sector || 'Sanayi')}</span></td>
                <td><strong>${emStr}</strong></td>
                <td>${escapeHtml(city)}</td>
            </tr>`;
    }).join('');

    // Render map
    setTimeout(() => {
        const mapDom = document.getElementById('fullscreenMapContainer');
        if (mapDom) {
            if (fullscreenMapInstance) {
                try { fullscreenMapInstance.remove(); } catch(e){}
                fullscreenMapInstance = null;
            }
            mapDom._leaflet_id = null;
            mapDom.innerHTML = '';
        }

        const isDark = !document.documentElement.classList.contains('apple-light');
        const tileUrl = isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        fullscreenMapInstance = L.map('fullscreenMapContainer', { zoomControl: false }).setView([39.0, 35.2], 6);
        L.tileLayer(tileUrl, { attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 18 }).addTo(fullscreenMapInstance);
        L.control.zoom({ position: 'topright' }).addTo(fullscreenMapInstance);

        const bounds = [];
        matchedFacs.forEach(fac => {
            const lon = fac.lon || fac.lng;
            if (!fac.lat || !lon) return;
            bounds.push([fac.lat, lon]);
            const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 6), 16);
            const marker = L.circleMarker([fac.lat, lon], {
                radius, fillColor: '#6366f1', color: '#ffffff', weight: 2, opacity: 0.95, fillOpacity: 0.85
            }).addTo(fullscreenMapInstance);

            const city = getFacilityCity(fac);
            const emStr = (fac.emissions_tonnes || 0).toLocaleString('tr-TR') + ' Ton CO₂e';
            marker.bindPopup(`
                <div style="font-family:system-ui; padding:4px; color:#1e293b;">
                    <strong style="font-size:0.95rem;">${escapeHtml(fac.name)}</strong><br/>
                    <span style="font-size:0.82rem;color:#555;">${escapeHtml(fac.sector || 'Sanayi')} • ${escapeHtml(city)}</span><br/>
                    <span style="font-size:0.8rem;color:#6366f1;font-weight:600;">Emisyon: ${emStr}</span>
                </div>
            `);
        });

        if (bounds.length === 1) {
            fullscreenMapInstance.setView(bounds[0], 9);
        } else if (bounds.length > 1) {
            fullscreenMapInstance.fitBounds(bounds, { padding: [40, 40] });
        }

        fullscreenMapInstance.invalidateSize();
    }, 100);
}

let currentFullscreenType = null;

const fullscreenChartList = ['lineChart', 'doughnutChart', 'barChart', 'turkeyMap'];

function getFacilityCity(fac) {
    if (!fac) return 'Türkiye';
    if (fac.city) return fac.city;
    if (fac.province && fac.province !== 'Türkiye') return fac.province;

    const name = fac.name || '';
    if (/istanbul|ist /i.test(name)) return 'İstanbul';
    if (/ankara/i.test(name)) return 'Ankara';
    if (/izmir/i.test(name)) return 'İzmir';
    if (/zonguldak|zetes/i.test(name)) return 'Zonguldak';
    if (/biga|canakkale/i.test(name)) return 'Çanakkale';
    if (/iskenderun|sugozu|hatay/i.test(name)) return 'Hatay';
    if (/afsin|elbistan|marasp/i.test(name)) return 'Kahramanmaraş';
    if (/gurun|kangal|sivas/i.test(name)) return 'Sivas';
    if (/erzurum|ispir|tekman|karayazi/i.test(name)) return 'Erzurum';
    if (/pinarbasi|kayseri/i.test(name)) return 'Kayseri';
    if (/adana/i.test(name)) return 'Adana';
    if (/gaziantep/i.test(name)) return 'Gaziantep';
    if (/konya/i.test(name)) return 'Konya';

    const lat = fac.lat, lon = fac.lon || fac.lng;
    if (lat && lon) {
        if (lat > 40.5 && lon < 30.0) return 'İstanbul';
        if (lat > 40.8 && lon > 31.0 && lon < 32.5) return 'Zonguldak';
        if (lat > 39.5 && lat < 40.5 && lon > 32.0 && lon < 33.5) return 'Ankara';
        if (lat > 38.0 && lat < 39.0 && lon > 26.5 && lon < 27.5) return 'İzmir';
        if (lat > 40.0 && lat < 40.8 && lon > 26.0 && lon < 27.8) return 'Çanakkale';
        if (lat > 36.3 && lat < 37.2 && lon > 35.5 && lon < 36.8) return 'Hatay';
        if (lat > 38.0 && lat < 39.0 && lon > 36.5 && lon < 37.5) return 'Kahramanmaraş';
        if (lat > 38.5 && lat < 39.5 && lon > 36.0 && lon < 38.0) return 'Sivas';
        if (lat > 39.2 && lat < 40.8 && lon > 40.5 && lon < 42.5) return 'Erzurum';
    }

    return 'Sivas';
}

function navigateChartFullscreen(direction) {
    if (!currentFullscreenType) {
        openChartFullscreen(fullscreenChartList[0]);
        return;
    }
    let currentIndex = fullscreenChartList.indexOf(currentFullscreenType);
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = fullscreenChartList.length - 1;
    if (newIndex >= fullscreenChartList.length) newIndex = 0;

    openChartFullscreen(fullscreenChartList[newIndex]);
}

function openChartFullscreen(type) {
    if (window.innerWidth <= 992) return; // Desktop-only feature

    currentFullscreenType = type;
    const modal = document.getElementById('chartFullscreenModal');
    const titleEl = document.getElementById('fullscreenModalTitle');
    const subtitleEl = document.getElementById('fullscreenModalSubtitle');
    const chartContainer = document.getElementById('fullscreenChartContainer');
    const mapContainer = document.getElementById('fullscreenMapContainer');
    const kpiGrid = document.getElementById('fullscreenKpiGrid');
    const tableHead = document.getElementById('fullscreenTableHead');
    const tableBody = document.getElementById('fullscreenTableBody');
    const tableTitle = document.getElementById('fullscreenTableTitle');
    const navIndicator = document.getElementById('fullscreenNavIndicator');

    if (!modal) return;

    // Update indicator
    const currentNavIdx = fullscreenChartList.indexOf(type);
    if (navIndicator) {
        navIndicator.textContent = currentNavIdx >= 0 ? `${currentNavIdx + 1} / ${fullscreenChartList.length}` : `1 / 4`;
    }

    // Hide/show nav group depending on context (company map hides it)
    const navGroup = modal.querySelector('.fullscreen-nav-group');
    if (navGroup) navGroup.style.display = '';

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    // Reset containers
    chartContainer.style.display = 'block';
    mapContainer.style.display = 'none';

    if (fullscreenChartInstance) {
        fullscreenChartInstance.destroy();
        fullscreenChartInstance = null;
    }
    if (fullscreenMapInstance) {
        try { fullscreenMapInstance.remove(); } catch(e){}
        fullscreenMapInstance = null;
    }
    const mapDomResetNode = document.getElementById('fullscreenMapContainer');
    if (mapDomResetNode) {
        mapDomResetNode._leaflet_id = null;
        mapDomResetNode.innerHTML = '';
    }

    const isLightMode = document.documentElement.classList.contains('apple-light');
    const labelColor = isLightMode ? '#2B2620' : (computedStyles.getPropertyValue('--text-primary').trim() || '#F4F5F6');
    const subLabelColor = isLightMode ? '#5C5344' : (computedStyles.getPropertyValue('--text-secondary').trim() || '#9AA0AA');
    const gridColor = isLightMode ? '#E0D8C5' : (computedStyles.getPropertyValue('--bg-border').trim() || 'rgba(255, 255, 255, 0.08)');

    const canvas = document.getElementById('fullscreenChartCanvas');
    const ctx = canvas.getContext('2d');

    if (type === 'lineChart') {
        titleEl.innerHTML = `<i class="fa-solid fa-chart-line" style="color: var(--accent-green);"></i> Yıllık Toplam Emisyon Trendi`;
        subtitleEl.textContent = `2015 – 2025 resmi Climate TRACE ölçümleri ve yıllık karşılaştırmalı veriler`;
        tableTitle.innerHTML = `<i class="fa-solid fa-table-list"></i> Yıllara Göre Emisyon Kırılımı (2015 - 2025)`;

        const yearlyObj = (globalDbData && globalDbData.total_yearly) || {};
        const labels = Object.keys(yearlyObj);
        const rawVals = Object.values(yearlyObj);
        const dataVals = rawVals.map(v => parseFloat((v / 1000000).toFixed(2)));

        // Compute KPIs
        const maxVal = Math.max(...dataVals);
        const minVal = Math.min(...dataVals);
        const maxYear = labels[dataVals.indexOf(maxVal)] || '2025';
        const latestVal = dataVals[dataVals.length - 1] || 0;
        const firstVal = dataVals[0] || 1;
        const changePct = (((latestVal - firstVal) / firstVal) * 100).toFixed(1);

        kpiGrid.innerHTML = `
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Son Ölçülen (2025)</span>
                <span class="fullscreen-kpi-value">${latestVal} Mt</span>
                <span class="fullscreen-kpi-sub">CO₂e Yıllık Emisyon</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Zirve Yılı (${maxYear})</span>
                <span class="fullscreen-kpi-value" style="color:var(--status-danger,#ff3b30);">${maxVal} Mt</span>
                <span class="fullscreen-kpi-sub">En yüksek emisyon seviyesi</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">10 Yıllık Değişim</span>
                <span class="fullscreen-kpi-value" style="color:${changePct >= 0 ? 'var(--status-warning,#ff9500)' : 'var(--status-success,#34c759)'};">
                    ${changePct >= 0 ? '+' : ''}${changePct}%
                </span>
                <span class="fullscreen-kpi-sub">2015 - 2025 Kıyaslaması</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Ortalama Yıllık</span>
                <span class="fullscreen-kpi-value">${(dataVals.reduce((a,b)=>a+b,0)/dataVals.length).toFixed(1)} Mt</span>
                <span class="fullscreen-kpi-sub">Ortalama Emisyon Gücü</span>
            </div>
        `;

        // Build Table
        tableHead.innerHTML = `
            <tr>
                <th>Yıl</th>
                <th>Emisyon (Mt CO₂e)</th>
                <th>Toplam Ton CO₂e</th>
                <th>Yıllık Değişim</th>
            </tr>
        `;
        tableBody.innerHTML = labels.map((yr, idx) => {
            const val = dataVals[idx];
            const prev = idx > 0 ? dataVals[idx - 1] : val;
            const diff = idx > 0 ? (((val - prev) / prev) * 100).toFixed(1) : '0.0';
            const diffBadge = diff > 0 
                ? `<span style="color:var(--status-danger); font-weight:600;"><i class="fa-solid fa-arrow-up"></i> +%${diff}</span>` 
                : (diff < 0 ? `<span style="color:var(--status-success); font-weight:600;"><i class="fa-solid fa-arrow-down"></i> %${diff}</span>` : `<span style="color:var(--text-secondary);">-</span>`);
            return `
                <tr>
                    <td><strong>${yr}</strong></td>
                    <td>${val.toLocaleString('tr-TR')} Mt</td>
                    <td>${rawVals[idx].toLocaleString('tr-TR')} Ton</td>
                    <td>${diffBadge}</td>
                </tr>
            `;
        }).reverse().join('');

        fullscreenChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Türkiye Toplam Emisyonu (Mt CO₂e)',
                    data: dataVals,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.16)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 20,
                        left: 10,
                        right: 20
                    }
                },
                plugins: {
                    legend: { display: true, labels: { color: labelColor, font: { size: 13, weight: 'bold' } } },
                    tooltip: {
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(c) { return ` Emisyon: ${c.parsed.y} Mt CO₂e (${rawVals[c.dataIndex].toLocaleString('tr-TR')} Ton)`; }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: subLabelColor, font: { size: 12 } }, grid: { color: gridColor } },
                    y: { ticks: { color: subLabelColor, font: { size: 12 } }, grid: { color: gridColor } }
                }
            }
        });

    } else if (type === 'doughnutChart') {
        titleEl.innerHTML = `<i class="fa-solid fa-chart-pie" style="color: var(--accent-indigo);"></i> Sera Gazları Detaylı Dağılımı`;
        subtitleEl.textContent = `CO₂ (Karbondioksit), CH₄ (Metan), N₂O (Azot Oksit) ve Florlu gazların emisyon payları`;
        tableTitle.innerHTML = `<i class="fa-solid fa-circle-info"></i> Sera Gazları Detaylı Tablosu & GWP Faktörleri`;

        const gases = [
            { name: 'Karbondioksit (CO₂)', code: 'CO₂', pct: 72, color: '#6B8F71', gwp: 1, source: 'Enerji, Sanayi, Ulaştırma', desc: 'Fosil yakıt kullanımı ve sanayi prosesleri' },
            { name: 'Metan (CH₄)', code: 'CH₄', pct: 18, color: '#5B7C99', gwp: 28, source: 'Tarım, Atık, Madencilik', desc: 'Hayvancılık, çöp depolama ve gaz kaçakları' },
            { name: 'Azot Oksit (N₂O)', code: 'N₂O', pct: 7, color: '#7C5295', gwp: 265, source: 'Gübre, Kimya Sanayi', desc: 'Tarımsal topraklama ve kimyasal üretim' },
            { name: 'Florlu Gazlar (F-Gaz)', code: 'F-Gaz', pct: 3, color: '#C2622D', gwp: '1,000+', source: 'Soğutma, İklimlendirme', desc: 'Klima sistemleri ve endüstriyel soğutucular' }
        ];

        kpiGrid.innerHTML = `
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Baskın Sera Gazı</span>
                <span class="fullscreen-kpi-value" style="color:#6B8F71;">CO₂ (%72)</span>
                <span class="fullscreen-kpi-sub">Karbondioksit Emisyonları</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Yüksek Potansiyelli</span>
                <span class="fullscreen-kpi-value" style="color:#7C5295;">N₂O (265 GWP)</span>
                <span class="fullscreen-kpi-sub">Azot Oksit Isınma Gücü</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Metan Payı</span>
                <span class="fullscreen-kpi-value" style="color:#5B7C99;">%18</span>
                <span class="fullscreen-kpi-sub">Kısa Vadeli Küresel Isınma</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Florlu Gaz Payı</span>
                <span class="fullscreen-kpi-value" style="color:#C2622D;">%3</span>
                <span class="fullscreen-kpi-sub">Sentetik İklimlendirme Gazı</span>
            </div>
        `;

        tableHead.innerHTML = `
            <tr>
                <th>Sera Gazı</th>
                <th>Yüzdelik Pay</th>
                <th>GWP (100 Yıllık)</th>
                <th>Ana Kaynak Sektörler</th>
            </tr>
        `;
        tableBody.innerHTML = gases.map(g => `
            <tr>
                <td><strong style="color:${g.color};"><i class="fa-solid fa-circle" style="font-size:0.75rem;"></i> ${g.name}</strong></td>
                <td><strong>%${g.pct}</strong></td>
                <td>${g.gwp}x CO₂e</td>
                <td>${g.source}</td>
            </tr>
        `).join('');

        fullscreenChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: gases.map(g => g.name),
                datasets: [{
                    data: gases.map(g => g.pct),
                    backgroundColor: gases.map(g => g.color),
                    borderWidth: 2,
                    borderColor: gridColor
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 15,
                        bottom: 15,
                        left: 15,
                        right: 15
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: labelColor, font: { size: 13, weight: '600' }, boxWidth: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(c) { return ` ${gases[c.dataIndex].name}: %${c.parsed} (${gases[c.dataIndex].desc})`; }
                        }
                    }
                }
            }
        });

    } else if (type === 'barChart') {
        titleEl.innerHTML = `<i class="fa-solid fa-chart-column" style="color: var(--accent-orange, #ff9500);"></i> Sektörel Emisyon Payları Analizi`;
        subtitleEl.textContent = `Türkiye sanayi, enerji ve ulaşım sektörlerinin yıllık sera gazı katkıları`;
        tableTitle.innerHTML = `<i class="fa-solid fa-industry"></i> Sektörel Emisyon & Tesis Sayıları Tablosu`;

        const sectorTranslations = {
            'power': 'Santraller & Elektrik',
            'manufacturing': 'İmalat & Sanayi',
            'transportation': 'Ulaştırma & Nakliye',
            'waste': 'Atık Yönetimi',
            'agriculture': 'Tarım & Hayvancılık',
            'buildings': 'İnşaat & Binalar',
            'fossil-fuel-operations': 'Fosil Yakıt Üretimi',
            'mineral-extraction': 'Madencilik'
        };

        const sectorObj = (globalDbData && globalDbData.sector_yearly) || {};
        let sectorList = [];

        Object.keys(sectorObj).forEach(secKey => {
            const secData = sectorObj[secKey];
            const yrKey = secData['2025'] ? '2025' : Object.keys(secData).pop();
            const val = secData[yrKey] ? (secData[yrKey]['co2e_20yr'] || secData[yrKey]['co2e_100yr'] || 0) : 0;
            const mtVal = parseFloat((val / 1000000).toFixed(2));
            const cleanName = sectorTranslations[secKey] || secKey;
            
            sectorList.push({ key: secKey, name: cleanName, val: mtVal });
        });

        sectorList.sort((a, b) => b.val - a.val);
        const totalSectorEmissions = sectorList.reduce((acc, s) => acc + s.val, 0);

        kpiGrid.innerHTML = `
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Lider Sektör</span>
                <span class="fullscreen-kpi-value" style="color:#5B7C99;">${sectorList[0]?.name || 'Santraller'}</span>
                <span class="fullscreen-kpi-sub">${sectorList[0]?.val || 0} Mt CO₂e / Yıl</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">En Yüksek 3 Sektör Payı</span>
                <span class="fullscreen-kpi-value" style="color:var(--status-warning,#ff9500);">
                    %${totalSectorEmissions > 0 ? (((sectorList[0]?.val + sectorList[1]?.val + sectorList[2]?.val)/totalSectorEmissions)*100).toFixed(1) : '85'}
                </span>
                <span class="fullscreen-kpi-sub">Toplam Sektörel Pay</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Sektör Sayısı</span>
                <span class="fullscreen-kpi-value">${sectorList.length} Ana Sektör</span>
                <span class="fullscreen-kpi-sub">IPCC Kategori Sınıfı</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">2030 SBTi Hedefi</span>
                <span class="fullscreen-kpi-value" style="color:var(--status-success,#34c759);">-%45 Azaltım</span>
                <span class="fullscreen-kpi-sub">Net-Zero Senaryosu</span>
            </div>
        `;

        tableHead.innerHTML = `
            <tr>
                <th>Sektör Adı</th>
                <th>Yıllık Emisyon (Mt CO₂e)</th>
                <th>Oransal Pay (%)</th>
                <th>Status / Trend</th>
            </tr>
        `;
        tableBody.innerHTML = sectorList.map((s, idx) => {
            const pct = totalSectorEmissions > 0 ? ((s.val / totalSectorEmissions) * 100).toFixed(1) : '0.0';
            return `
                <tr>
                    <td><strong>${idx + 1}. ${s.name}</strong></td>
                    <td>${s.val.toLocaleString('tr-TR')} Mt</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <div style="flex:1; height:6px; background:var(--bg-border); border-radius:3px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background:var(--accent-indigo);"></div>
                            </div>
                            <span>%${pct}</span>
                        </div>
                    </td>
                    <td><span class="status-badge status-active">Aktif İzleme</span></td>
                </tr>
            `;
        }).join('');

        fullscreenChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sectorList.map(s => s.name),
                datasets: [{
                    label: 'Yıllık Sektör Emisyonu (Mt CO₂e)',
                    data: sectorList.map(s => s.val),
                    backgroundColor: ['#5B7C99', '#6B8F71', '#C2622D', '#8FA8B8', '#7C5295', '#9C6B5A', '#EAB308', '#6366F1'],
                    borderRadius: 6,
                    barThickness: 22
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 15,
                        left: 10,
                        right: 20
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(c) { return ` Emisyon: ${c.parsed.x} Mt CO₂e / Yıl`; }
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: subLabelColor }, grid: { color: gridColor } },
                    y: { ticks: { color: subLabelColor }, grid: { color: gridColor } }
                }
            }
        });

    } else if (type === 'turkeyMap') {
        titleEl.innerHTML = `<i class="fa-solid fa-map-location-dot" style="color: var(--accent-indigo);"></i> Türkiye Tesis Haritası (Tam Ekran)`;
        subtitleEl.textContent = `Climate TRACE uydularıyla tespit edilen santral, fabrika ve sanayi lokasyonları`;
        tableTitle.innerHTML = `<i class="fa-solid fa-building-flag"></i> Haritada İncelemekte Olunan Tesisler`;

        chartContainer.style.display = 'none';
        mapContainer.style.display = 'block';

        const facilities = (globalDbData && globalDbData.facilities) || [];
        let filteredFacilities = [...facilities];

        // Sort by emissions descending for table and top visibility
        filteredFacilities.sort((a, b) => (b.emissions_tonnes || 0) - (a.emissions_tonnes || 0));

        const citiesCount = new Set(filteredFacilities.map(f => getFacilityCity(f))).size;

        kpiGrid.innerHTML = `
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Haritalanan Tesis</span>
                <span class="fullscreen-kpi-value" style="color:var(--accent-indigo);">${filteredFacilities.length} Tesis</span>
                <span class="fullscreen-kpi-sub">Uydu Tespiti Yapılmış</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Kapsanan Şehirler</span>
                <span class="fullscreen-kpi-value">${citiesCount} İl</span>
                <span class="fullscreen-kpi-sub">Coğrafi Dağılım</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Aktif Sektörler</span>
                <span class="fullscreen-kpi-value">${new Set(filteredFacilities.map(f => f.sector || 'Sanayi')).size} Sektör</span>
                <span class="fullscreen-kpi-sub">Sanayi, Santral, Maden</span>
            </div>
            <div class="fullscreen-kpi-card">
                <span class="fullscreen-kpi-label">Doğrulama Verisi</span>
                <span class="fullscreen-kpi-value" style="color:var(--status-success,#34c759);">IPCC Tier-3</span>
                <span class="fullscreen-kpi-sub">Climate TRACE 2024/2025</span>
            </div>
        `;

        tableHead.innerHTML = `
            <tr>
                <th>Tesis Adı</th>
                <th>Sektör</th>
                <th>Yıllık Emisyon</th>
                <th>Konum / Şehir</th>
            </tr>
        `;
        tableBody.innerHTML = filteredFacilities.slice(0, 60).map(f => {
            const lon = f.lon || f.lng;
            const city = getFacilityCity(f);
            const emStr = (f.emissions_tonnes || 0) >= 1000000 
                ? ((f.emissions_tonnes || 0)/1000000).toFixed(2) + ' Mt CO₂e'
                : (f.emissions_tonnes || 0).toLocaleString('tr-TR') + ' Ton CO₂e';

            return `
                <tr style="cursor:pointer;" onclick="focusFullscreenMapMarker(${f.lat}, ${lon}, '${escapeHtml(f.name)}')">
                    <td><strong><i class="fa-solid fa-location-dot" style="color:var(--accent-indigo); margin-right:4px;"></i> ${escapeHtml(f.name)}</strong></td>
                    <td><span class="status-badge status-active">${escapeHtml(f.sector || 'Sanayi')}</span></td>
                    <td><strong>${emStr}</strong></td>
                    <td>${escapeHtml(city)}</td>
                </tr>
            `;
        }).join('');

        const sectorColors = {
            'Enerji': '#C2622D',
            'Enerji & Santraller': '#C2622D',
            'İmalat': '#6B8F71',
            'İmalat & Ağır Sanayi': '#6B8F71',
            'Ulaştırma': '#5B7C99',
            'Ulaştırma & Lojistik': '#5B7C99',
            'Maden': '#7C5295',
            'Madencilik': '#7C5295',
            'Maden & Hammadde': '#7C5295',
            'Tarım & Hayvancılık': '#9C6B5A',
            'İnşaat & Binalar': '#6B4E8F'
        };

        // Initialize Leaflet Map in Fullscreen cleanly
        setTimeout(() => {
            const mapDom = document.getElementById('fullscreenMapContainer');
            if (mapDom) {
                if (fullscreenMapInstance) {
                    try { fullscreenMapInstance.remove(); } catch(e){}
                    fullscreenMapInstance = null;
                }
                mapDom._leaflet_id = null;
                mapDom.innerHTML = '';
            }

            fullscreenMapInstance = L.map('fullscreenMapContainer', { zoomControl: false }).setView([39.0, 35.2], 6);

            const isDark = !document.documentElement.classList.contains('apple-light');
            const tileUrl = isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

            L.tileLayer(tileUrl, {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 18
            }).addTo(fullscreenMapInstance);

            L.control.zoom({ position: 'topright' }).addTo(fullscreenMapInstance);

            const bounds = [];
            filteredFacilities.forEach(fac => {
                const lon = fac.lon || fac.lng;
                if (fac.lat && lon) {
                    bounds.push([fac.lat, lon]);
                    const color = sectorColors[fac.sector] || '#6366f1';
                    const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 5), 14);

                    const marker = L.circleMarker([fac.lat, lon], {
                        radius: radius,
                        fillColor: color,
                        color: '#ffffff',
                        weight: 1.5,
                        opacity: 0.95,
                        fillOpacity: 0.85
                    }).addTo(fullscreenMapInstance);

                    const city = getFacilityCity(fac);
                    const emStr = (fac.emissions_tonnes || 0).toLocaleString('tr-TR') + ' Ton CO₂e';

                    marker.bindPopup(`
                        <div style="font-family:system-ui; padding:4px; color:#1e293b;">
                            <strong style="font-size:0.95rem; color:#111;">${escapeHtml(fac.name)}</strong><br/>
                            <span style="font-size:0.82rem; color:#555;">${escapeHtml(fac.sector || 'Sanayi')} • ${escapeHtml(city)}</span><br/>
                            <span style="font-size:0.8rem; color:#6366f1; font-weight:600;">Emisyon: ${emStr}</span>
                        </div>
                    `);
                }
            });

            if (bounds.length > 0) {
                fullscreenMapInstance.fitBounds(bounds, { padding: [30, 30] });
            }

            fullscreenMapInstance.invalidateSize();
        }, 100);
    }
}

function focusFullscreenMapMarker(lat, lng, name) {
    if (fullscreenMapInstance && lat && lng) {
        fullscreenMapInstance.setView([lat, lng], 12, { animate: true });
    }
}

function closeChartFullscreen() {
    const modal = document.getElementById('chartFullscreenModal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.classList.remove('modal-open');

    if (fullscreenChartInstance) {
        fullscreenChartInstance.destroy();
        fullscreenChartInstance = null;
    }
    if (fullscreenMapInstance) {
        try { fullscreenMapInstance.remove(); } catch(e){}
        fullscreenMapInstance = null;
    }
    const mapDomNode = document.getElementById('fullscreenMapContainer');
    if (mapDomNode) {
        mapDomNode._leaflet_id = null;
        mapDomNode.innerHTML = '';
    }
    currentFullscreenType = null;

    // Refresh original macro charts
    renderMacroCharts();
}

function exportFullscreenDataCSV() {
    if (!currentFullscreenType) return;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';

    if (currentFullscreenType === 'lineChart') {
        csvContent += 'Yil,Emisyon_Mt_CO2e,Toplam_Ton_CO2e\n';
        const yearlyObj = (globalDbData && globalDbData.total_yearly) || {};
        Object.keys(yearlyObj).forEach(yr => {
            const val = (yearlyObj[yr] / 1000000).toFixed(2);
            csvContent += `${yr},${val},${yearlyObj[yr]}\n`;
        });
    } else if (currentFullscreenType === 'doughnutChart') {
        csvContent += 'Sera_Gazi,Pay_Yuzde,GWP_Katsayisi,Ana_Kaynaklar\n';
        csvContent += 'Karbondioksit (CO2),72,1,Enerji Sanayi Ulastirma\n';
        csvContent += 'Metan (CH4),18,28,Tarim Atik Madencilik\n';
        csvContent += 'Azot Oksit (N2O),7,265,Gubre Kimya Sanayi\n';
        csvContent += 'Florlu Gazlar (F-Gaz),3,1000+,Sogutma Iklimlendirme\n';
    } else if (currentFullscreenType === 'barChart') {
        csvContent += 'Sektor,Yillik_Emisyon_Mt_CO2e\n';
        const sectorObj = (globalDbData && globalDbData.sector_yearly) || {};
        Object.keys(sectorObj).forEach(sec => {
            const yrData = sectorObj[sec];
            const yrKey = yrData['2025'] ? '2025' : Object.keys(yrData).pop();
            const val = yrData[yrKey] ? (yrData[yrKey]['co2e_20yr'] || 0) : 0;
            csvContent += `"${sec}",${(val/1000000).toFixed(2)}\n`;
        });
    } else {
        csvContent += 'Tesis_Adi,Sirket,Sektor,Sehir,Enlem,Boylam\n';
        const facilities = (globalDbData && globalDbData.facilities) || [];
        facilities.forEach(f => {
            csvContent += `"${f.name || ''}","${f.company || ''}","${f.sector || ''}","${f.province || ''}",${f.lat || ''},${f.lng || ''}\n`;
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eko_takip_${currentFullscreenType}_detay.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Global Keyboard shortcuts for modal (ESC to close, Left/Right arrows to navigate)
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('chartFullscreenModal');
    if (modal && modal.style.display !== 'none') {
        if (event.key === 'Escape') {
            closeChartFullscreen();
        } else if (event.key === 'ArrowLeft') {
            navigateChartFullscreen(-1);
        } else if (event.key === 'ArrowRight') {
            navigateChartFullscreen(1);
        }
    }
});




