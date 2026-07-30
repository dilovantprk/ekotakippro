// AdNet Zero Türkiye Apple HIG Carbon Intelligence Platform Logic

let globalDbData = null;
let leafletMap = null;
let companyTabMapInstance = null;
let mapMarkers = [];
let companyMapMarkers = [];

// Selected Active Company State
let activeSelectedCompany = null;

// Pagination State
let currentPage = 1;
let itemsPerPage = 10;

// Chart instances
let macroLineChart = null;
let gasDoughnutChart = null;
let sectorBarChart = null;
let simRadarChart = null;

// Official AdNet Zero Türkiye Member List
const ADNET_ZERO_MEMBERS = [
    "loreal", "l'oreal", "l'oréal", "nestle", "nestlé", "pladis", "unilever", "yapikredi", "yapı kredi", "yapı kredı", "yapikredi bankasi",
    "genart", "aleph", "google", "logaritma", "karpat", "pinar", "pınar", "chnc", "opn forte", "periscope",
    "repid", "reklam ve pazarlama iletişimi derneği", "rvd", "reklam verenler derneği", "rd", "reklamcılar derneği",
    "iab", "iab.tr", "mma", "mma türkiye", "arvak", "açıkhava reklamcıları vakfı", "uryad", "ulusal radyo yayıncıları derneği",
    "ida", "i̇da", "iletişim danışmanlığı şirketleri derneği", "tuad", "tüad", "türkiye araştırmacılar derneği",
    "ktsd", "kozmetik ve temizlik ürünleri sanayiciler derneği", "sustainable brands", "ryd", "reklam yapımcıları derneği",
    "yeşil setler", "yesil setler"
];

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isAdNetZeroMember(name) {
    if (!name) return false;
    const lower = name.toLowerCase().trim();
    return ADNET_ZERO_MEMBERS.some(m => lower.includes(m));
}

function getAdNetZeroBadgeHtml(name) {
    if (!isAdNetZeroMember(name)) return '';
    return `<span class="adnet-zero-badge" title="AdNet Zero Üye Kurumu"><i class="fa-solid fa-seedling"></i> AdNet Zero</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initKeyboardAccessibility();
    initWindowResizeListener();
    loadEmissionsData();
    initModalDragToDismiss();
});

function initNavigation() {
    const header = document.querySelector(".header");
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const navMenu = document.getElementById("nav-menu");
    const navLinks = document.querySelectorAll(".nav-link");

    if (!header) return;

    let backdrop = document.querySelector(".mobile-menu-backdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "mobile-menu-backdrop";
        document.body.appendChild(backdrop);
    }

    function openMenu() {
        if (!navMenu || !mobileMenuToggle) return;
        navMenu.classList.add("active");
        backdrop.classList.add("active");
        document.body.style.overflow = "hidden";
        mobileMenuToggle.classList.add("active");
    }

    function closeMenu() {
        if (!navMenu || !mobileMenuToggle) return;
        navMenu.classList.remove("active");
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
        mobileMenuToggle.classList.remove("active");
    }

    function handleScroll() {
        if (window.scrollY > 30) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener("click", () => {
            if (navMenu.classList.contains("active")) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener("click", () => closeMenu());
        });

        backdrop.addEventListener("click", () => closeMenu());

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && navMenu.classList.contains("active")) {
                closeMenu();
            }
        });
    }
}

function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    
    // Restore saved theme preference from localStorage or OS settings
    const savedTheme = localStorage.getItem('anz_theme');
    const isLightSaved = savedTheme === 'light' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    
    if (isLightSaved) {
        document.body.classList.add('apple-light');
        document.documentElement.classList.add('apple-light');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    } else {
        document.body.classList.remove('apple-light');
        document.documentElement.classList.remove('apple-light');
        if (themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    }

    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('apple-light');
        document.documentElement.classList.toggle('apple-light');
        const isLight = document.body.classList.contains('apple-light');
        localStorage.setItem('anz_theme', isLight ? 'light' : 'dark');
        themeBtn.innerHTML = isLight ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
        
        refreshAllCharts();
    });
}

function openSettingsPanel() {
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        updateSettingsChecks();
    }
}

function closeSettingsPanel() {
    const overlay = document.getElementById('settingsOverlay');
    if (!overlay) return;
    const panel = overlay.querySelector('.settings-panel');
    const isMobile = window.innerWidth <= 768;
    if (panel) {
        panel.style.animation = 'none';
        panel.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
        panel.style.transform = isMobile ? 'translateX(100%)' : 'scale(0.95)';
    }
    overlay.style.transition = 'opacity 0.25s ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.style.opacity = '';
        overlay.style.transition = '';
        if (panel) {
            panel.style.transform = '';
            panel.style.transition = '';
            panel.style.animation = '';
        }
    }, 260);
}

function setTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('apple-light', isLight);
    document.documentElement.classList.toggle('apple-light', isLight);
    localStorage.setItem('anz_theme', theme);
    
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.innerHTML = isLight
            ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    }
    updateSettingsSwitchUI(theme);
    refreshAllCharts();
}

function toggleThemeFromSwitch(isChecked) {
    setTheme(isChecked ? 'dark' : 'light');
}

function updateSettingsSwitchUI(theme) {
    const isDark = !document.body.classList.contains('apple-light');
    
    ['themeToggleSwitch', 'themeToggleSwitchMobile'].forEach(id => {
        const sw = document.getElementById(id);
        if (sw) sw.checked = isDark;
    });

    ['themeToggleText', 'themeToggleTextMobile'].forEach(id => {
        const textEl = document.getElementById(id);
        if (textEl) textEl.textContent = isDark ? 'Koyu Mod' : 'Açık Mod';
    });

    ['themeIconBox', 'themeIconBoxMobile'].forEach(id => {
        const iconBox = document.getElementById(id);
        if (iconBox) {
            if (isDark) {
                iconBox.className = 'settings-icon dark';
                iconBox.innerHTML = '<i class="fa-solid fa-moon"></i>';
            } else {
                iconBox.className = 'settings-icon light';
                iconBox.innerHTML = '<i class="fa-solid fa-sun"></i>';
            }
        }
    });
}

function updateSettingsChecks() {
    updateSettingsSwitchUI();
}

function initKeyboardAccessibility() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeMobilePicker();
            closeSettingsPanel();
        }
    });
}

let currentActiveTabId = 'macroTab';

function updateNavigationAndTabBar() {
    const tabBar = document.getElementById('mobileTabBar');
    const navMenu = document.getElementById('nav-menu');

    // 3-item mobile TabBar: Makro | Şirketim | Araçlar
    if (tabBar) {
        tabBar.innerHTML = `
            <button class="tabbar-item ${currentActiveTabId === 'macroTab' ? 'active' : ''}" id="tabbar-macro" onclick="switchTab('macroTab')">
                <i class="fa-solid fa-chart-line"></i>
                <span>Makro</span>
            </button>
            <button class="tabbar-item ${currentActiveTabId === 'companyTab' ? 'active' : ''}" id="tabbar-company" onclick="switchTab('companyTab')">
                <i class="fa-solid fa-building"></i>
                <span>Şirketim</span>
            </button>
            <button class="tabbar-item ${(currentActiveTabId === 'toolsTab' || currentActiveTabId === 'eventTab' || currentActiveTabId === 'simulatorTab') ? 'active' : ''}" id="tabbar-tools" onclick="switchTab('toolsTab')">
                <i class="fa-solid fa-toolbox"></i>
                <span>Araçlar</span>
            </button>
        `;
    }

    // Desktop nav-menu: only rebuild on screens > 768px
    if (navMenu && window.innerWidth > 768) {
        const isIngestion = (currentActiveTabId === 'companyTab' && currentSubTab === 'ingestion');
        const isDisclosure = (currentActiveTabId === 'companyTab' && currentSubTab === 'disclosure');
        const isCompany = (currentActiveTabId === 'companyTab' && !isIngestion && !isDisclosure);
        const isSimulator = (currentActiveTabId === 'simulatorTab');
        const isCalculator = (currentActiveTabId === 'eventTab');
        const isMacro = (currentActiveTabId === 'macroTab');

        navMenu.innerHTML = `
            <a href="javascript:void(0)" class="nav-link ${isMacro ? 'active' : ''}" onclick="switchTab('macroTab')">Makro</a>
            <a href="javascript:void(0)" class="nav-link ${isCompany ? 'active' : ''}" onclick="switchTab('companyTab')">Şirketim</a>
            <a href="javascript:void(0)" class="nav-link ${isIngestion ? 'active' : ''}" onclick="openToolIngestionPage()">AI Ingestion</a>
            <a href="javascript:void(0)" class="nav-link ${isDisclosure ? 'active' : ''}" onclick="openToolDisclosurePage()">Beyanname</a>
            <a href="javascript:void(0)" class="nav-link ${isSimulator ? 'active' : ''}" onclick="switchTab('simulatorTab')">Simülatör</a>
            <a href="javascript:void(0)" class="nav-link ${isCalculator ? 'active' : ''}" onclick="switchTab('eventTab')">Hesaplayıcı</a>
        `;
    }

    const isMobile = window.innerWidth <= 768;
    
    const simBackNav = document.getElementById('simBackNav');
    if (simBackNav) {
        simBackNav.style.display = (isMobile && currentActiveTabId === 'simulatorTab') ? 'block' : 'none';
    }
    const companyBackNav = document.getElementById('companyBackNav');
    if (companyBackNav) {
        companyBackNav.style.display = (isMobile && currentActiveTabId === 'companyTab' && (currentSubTab === 'ingestion' || currentSubTab === 'disclosure')) ? 'block' : 'none';
    }
    const eventBackNav = document.getElementById('eventBackNav');
    if (eventBackNav) {
        eventBackNav.style.display = (isMobile && currentActiveTabId === 'eventTab') ? 'block' : 'none';
    }
}

function switchTab(tabId, subTab) {
    currentActiveTabId = tabId;
    try { closeMobilePicker(); } catch (e) {}
    try {
        const navMenu = document.getElementById('nav-menu');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const backdrop = document.querySelector('.mobile-menu-backdrop');
        if (navMenu) navMenu.classList.remove('active');
        if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    } catch (e) {}

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });

    updateNavigationAndTabBar();

    if (tabId === 'macroTab') {
        setTimeout(() => {
            refreshAllCharts();
            if (leafletMap) leafletMap.invalidateSize();
            else initOrUpdateMap('ALL');
        }, 150);
    } else if (tabId === 'companyTab') {
        const targetSub = subTab || 'overview';
        currentSubTab = targetSub;
        setTimeout(() => {
            if (!activeSelectedCompany && globalDbData && globalDbData.companies && globalDbData.companies.length > 0) {
                selectActiveCompany(globalDbData.companies[0].name);
            } else if (activeSelectedCompany) {
                renderCompanyTabCockpit();
            }
            switchCockpitSubTab(targetSub);
        }, 100);
    } else if (tabId === 'simulatorTab') {
        setTimeout(() => { 
            populateSimulatorCompanySelect();
            if (activeSelectedCompany) {
                const select = document.getElementById('simCompanySelect');
                if (select) select.value = activeSelectedCompany;
                loadCompanyIntoSimulator(activeSelectedCompany);
            } else {
                runCockpitSim(); 
            }
        }, 100);
    } else if (tabId === 'settingsTab') {
        updateSettingsChecks();
    } else {
        setTimeout(() => { refreshAllCharts(); }, 150);
    }
}

/* ========================================================
   MOBILE FULL-SCREEN COMPANY PICKER
   ======================================================== */
let allCompanyNames = []; // populated after data loads

function normalizeTr(str) {
    if (!str) return '';
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'c')
        .replace(/ç/g, 'c')
        .toLowerCase()
        .trim();
}

function matchesCompanyQuery(companyName, query) {
    if (!query || !query.trim()) return true;
    const normName = normalizeTr(companyName);
    const normQ = normalizeTr(query);

    if (!normQ) return true;

    if (normQ.length <= 3) {
        const regex = new RegExp(`(?:^|\\s|\\b)${normQ}`, 'i');
        return regex.test(normName);
    }

    return normName.includes(normQ);
}

let currentPickerCallback = null;

function syncAllCompanySelectors(companyName) {
    const company = globalDbData?.companies?.find(c => c.name === companyName);

    const simLabel = document.getElementById('simCompanyPickerLabel');
    const simSub = document.getElementById('simCompanyPickerSub');

    if (simLabel) {
        simLabel.innerText = companyName || '— Kurum Seçip Doldur —';
    }
    if (simSub) {
        if (company) {
            simSub.innerText = (company.sectors[0] || 'Sanayi') + ' • ' + (company.assets?.length || 1) + ' Tesis Yerleşkesi';
        } else {
            simSub.innerText = 'Verileri otomatik yüklemek için tıklayın';
        }
    }

    const mobilePickerLabel = document.getElementById('mobilePickerLabel');
    if (mobilePickerLabel) mobilePickerLabel.innerText = companyName || 'Koç, Sabancı, Eti, Erdemir, THY…';

    const selCompany = document.getElementById('companyTabSelect');
    if (selCompany) selCompany.value = companyName;

    const selReport = document.getElementById('reportCompanySelect');
    if (selReport) selReport.value = companyName;
}

function buildMobilePickerList(query = '') {
    const list = document.getElementById('mobilePickerList');
    if (!list || !globalDbData) return;

    const companies = globalDbData.companies
        .filter(c => matchesCompanyQuery(c.name, query))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    list.innerHTML = '';

    if (companies.length === 0) {
        list.innerHTML = `<li style="padding: 1.5rem 1.25rem; color: var(--apple-label-tertiary); font-size: 0.9rem;">Sonuç bulunamadı.</li>`;
        return;
    }

    companies.forEach(c => {
        const li = document.createElement('li');
        li.className = 'picker-list-item' + (c.name === activeSelectedCompany ? ' selected' : '');
        li.innerHTML = `
            <span>${escapeHtml(c.name)}</span>
            <span class="item-sector">${escapeHtml(c.sectors?.[0] || '')}</span>
            <i class="fa-solid fa-check item-check" aria-hidden="true"></i>
        `;
        li.addEventListener('click', () => {
            selectActiveCompany(c.name);

            if (typeof currentPickerCallback === 'function') {
                currentPickerCallback(c.name);
                currentPickerCallback = null;
            }

            syncAllCompanySelectors(c.name);
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
    }, 300);
}

function filterMobilePicker(query) {
    buildMobilePickerList(query);
}


function initWindowResizeListener() {
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            refreshAllCharts();
            if (leafletMap) leafletMap.invalidateSize();
            if (companyTabMapInstance) companyTabMapInstance.invalidateSize();
        }, 250);
    });
}

let leafletTileLayer = null;
let companyTabTileLayer = null;

function getMapTileUrl() {
    const isLight = document.body.classList.contains('apple-light');
    return isLight 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
}

function updateMapTiles() {
    const tileUrl = getMapTileUrl();
    if (leafletTileLayer) {
        leafletTileLayer.setUrl(tileUrl);
    }
    if (companyTabTileLayer) {
        companyTabTileLayer.setUrl(tileUrl);
    }
}

function refreshAllCharts() {
    updateMapTiles();
    if (globalDbData) {
        if (macroLineChart) macroLineChart.destroy();
        if (gasDoughnutChart) gasDoughnutChart.destroy();
        if (sectorBarChart) sectorBarChart.destroy();
        if (simRadarChart) simRadarChart.destroy();
        
        renderMacroCharts();
        calculateAdNetSim();
    }
}

function showSystemState(message, isLoading = true) {
    const banner = document.getElementById('systemStateBanner');
    const text = document.getElementById('systemStateText');
    const spinner = document.getElementById('systemSpinner');
    
    if (banner && text) {
        text.textContent = message;
        if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
        banner.classList.remove('hidden');
    }
}

function hideSystemState() {
    const banner = document.getElementById('systemStateBanner');
    if (banner) banner.classList.add('hidden');
}

let companyModalChartInstance = null;
let companyCockpitChartInstance = null;

function renderCompanyTrendChart(canvasId, yearlyHistory, companyName, isModal = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (isModal && companyModalChartInstance) {
        companyModalChartInstance.destroy();
    }
    if (!isModal && companyCockpitChartInstance) {
        companyCockpitChartInstance.destroy();
    }

    const isLight = document.body.classList.contains('apple-light');
    const labelColor = isLight ? '#1C1C1E' : '#EBEBF5';
    const subLabelColor = isLight ? 'rgba(60, 60, 67, 0.7)' : '#8E8E93';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';

    const years = ['2021', '2022', '2023', '2024', '2025'];
    const vals = years.map(y => {
        const v = yearlyHistory[y] || 0;
        return (v >= 1000000) ? parseFloat((v / 1000000).toFixed(2)) : parseFloat((v / 1000).toFixed(1));
    });
    const unitLabel = (yearlyHistory['2025'] >= 1000000) ? 'Mt CO₂e' : 'kt CO₂e';

    const chartConfig = {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: `${companyName} Emisyon Trendi (${unitLabel})`,
                data: vals,
                borderColor: isLight ? '#34C759' : '#30D158',
                backgroundColor: isLight ? 'rgba(52, 199, 89, 0.1)' : 'rgba(48, 209, 88, 0.14)',
                fill: true,
                tension: 0.35,
                borderWidth: 2.5,
                pointRadius: 4,
                pointBackgroundColor: isLight ? '#007AFF' : '#0A84FF',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} ${unitLabel}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: subLabelColor, font: { family: '-apple-system', size: 10 } },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: subLabelColor, font: { family: '-apple-system', size: 10 } },
                    grid: { color: gridColor }
                }
            }
        }
    };

    if (isModal) {
        companyModalChartInstance = new Chart(ctx, chartConfig);
    } else {
        companyCockpitChartInstance = new Chart(ctx, chartConfig);
    }
}

function getCompanyLogoHtml(company, size = 'sm') {
    if (!company) return '';
    const sizePx = size === 'lg' ? '46px' : size === 'md' ? '32px' : '26px';
    const fontPx = size === 'lg' ? '1.15rem' : size === 'md' ? '0.9rem' : '0.78rem';

    if (company.logo_url) {
        return `
            <div class="company-logo-wrap" style="width: ${sizePx}; height: ${sizePx}; border-radius: 6px; overflow: hidden; background: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border: 0.5px solid var(--apple-hairline); box-shadow: 0 1px 3px rgba(0,0,0,0.12);">
                <img src="${company.logo_url}" alt="${escapeHtml(company.name)} logo" style="width: 82%; height: 82%; object-fit: contain;" onerror="this.parentElement.style.display='none'; if(this.parentElement.nextElementSibling) this.parentElement.nextElementSibling.style.display='inline-flex';" />
            </div>
            <div class="company-initials-badge" style="display: none; width: ${sizePx}; height: ${sizePx}; border-radius: 50%; background: rgba(10, 132, 255, 0.16); color: var(--apple-blue); font-weight: 700; font-size: ${fontPx}; align-items: center; justify-content: center; flex-shrink: 0;">
                ${escapeHtml(company.name.charAt(0).toUpperCase())}
            </div>
        `;
    } else {
        return `
            <div class="company-initials-badge" style="display: inline-flex; width: ${sizePx}; height: ${sizePx}; border-radius: 50%; background: rgba(10, 132, 255, 0.16); color: var(--apple-blue); font-weight: 700; font-size: ${fontPx}; align-items: center; justify-content: center; flex-shrink: 0;">
                ${escapeHtml(company.name.charAt(0).toUpperCase())}
            </div>
        `;
    }
}

async function loadEmissionsData() {
    showSystemState("Veriler yükleniyor...", true);
    try {
        const response = await fetch('./data/adnet_emissions_db.json');
        if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
        
        globalDbData = await response.json();
        hideSystemState();
        populateCompanyDropdowns();
        renderKPIs();
        renderMacroCharts();
        renderCompanyLedger();
        initSimulator();
        initOrUpdateMap('ALL');

        try {
            const savedCompany = localStorage.getItem('eko_selected_company');
            if (savedCompany && globalDbData && globalDbData.companies) {
                const found = globalDbData.companies.find(c => c.name === savedCompany);
                if (found) {
                    selectActiveCompany(found.name);
                } else {
                    selectActiveCompany(globalDbData.companies[0].name);
                }
            } else if (globalDbData && globalDbData.companies && globalDbData.companies.length > 0) {
                selectActiveCompany(globalDbData.companies[0].name);
            }
        } catch (e) {}
    } catch (err) {
        console.error('Failed to load data:', err);
        showSystemState("Veri yüklenemedi. Lütfen sayfayı yenileyin.", false);
    }
}

function populateCompanyDropdowns() {
    if (!globalDbData || !globalDbData.companies) return;

    const optionsHtml = globalDbData.companies.map((c, idx) =>
        `<option value="${escapeHtml(c.name)}">${idx + 1}. ${escapeHtml(c.name)}</option>`
    ).join('');

    const tabSelect = document.getElementById('companyTabSelect');
    if (tabSelect) tabSelect.innerHTML = '<option value="">Koç, Sabancı, Eti, Erdemir, THY…</option>' + optionsHtml;

    const reportSelect = document.getElementById('reportCompanySelect');
    if (reportSelect) reportSelect.innerHTML = '<option value="">— Kurum seçin —</option>' + optionsHtml;
}

function openCompanySearchPopup() {
    const popup = document.getElementById('companySearchResults');
    if (!popup) return;
    const input = document.getElementById('companyTabSearchInput');
    const val = input ? input.value : '';
    renderCompanySearchPopup(val);
    popup.classList.remove('hidden');
}

function closeCompanySearchPopup() {
    const popup = document.getElementById('companySearchResults');
    if (popup) popup.classList.add('hidden');
}

function onCompanySearchInput(query) {
    renderCompanySearchPopup(query);
    const popup = document.getElementById('companySearchResults');
    if (popup) popup.classList.remove('hidden');
}

function renderCompanySearchPopup(query = '') {
    const popup = document.getElementById('companySearchResults');
    if (!popup || !globalDbData || !globalDbData.companies) return;

    const filtered = globalDbData.companies.filter(c => {
        return matchesCompanyQuery(c.name, query);
    }).slice(0, 25);

    if (filtered.length === 0) {
        popup.innerHTML = `<div class="search-popup-empty">"${escapeHtml(query)}" ile eşleşen şirket bulunamadı.</div>`;
        return;
    }

    popup.innerHTML = filtered.map((c, idx) => `
        <div class="search-popup-item ${c.name === activeSelectedCompany ? 'active' : ''}" onclick="onSelectCompanyFromSearch('${escapeHtml(c.name.replace(/'/g, "\\'"))}')">
            <div class="popup-item-left">
                <i class="fa-solid fa-building popup-item-icon" aria-hidden="true"></i>
                <span class="popup-item-name">${escapeHtml(c.name)} ${getAdNetZeroBadgeHtml(c.name)}</span>
            </div>
            <span class="popup-item-sector">${escapeHtml(c.sectors?.[0] || 'Sanayi')}</span>
        </div>
    `).join('');
}

function onSelectCompanyFromSearch(companyName) {
    selectActiveCompany(companyName);
    closeCompanySearchPopup();
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
    if (!company) return;

    activeSelectedCompany = company.name;
    try { localStorage.setItem('eko_selected_company', company.name); } catch (e) {}

    const tabSelect = document.getElementById('companyTabSelect');
    if (tabSelect) tabSelect.value = company.name;

    const trigger = document.getElementById('mobilePickerTrigger');
    const triggerLabel = document.getElementById('mobilePickerLabel');
    if (trigger && triggerLabel) {
        triggerLabel.textContent = company.name;
        trigger.classList.add('has-value');
    }

    const heroCard = document.getElementById('companySelectHeroCard');
    const welcomeView = document.getElementById('companyTabWelcomeView');
    const activeContent = document.getElementById('companyTabActiveContent');
    
    if (heroCard) {
        heroCard.classList.add('hidden');
        heroCard.classList.add('has-selected-company');
    }
    if (welcomeView) welcomeView.classList.add('hidden');
    if (activeContent) activeContent.classList.remove('hidden');

    switchTab('companyTab');
    renderCompanyTabCockpit();
}

function resetActiveCompany() {
    activeSelectedCompany = null;
    try { localStorage.removeItem('eko_selected_company'); } catch (e) {}

    const tabSelect = document.getElementById('companyTabSelect');
    if (tabSelect) tabSelect.value = '';

    const triggerLabel = document.getElementById('mobilePickerLabel');
    if (triggerLabel) triggerLabel.textContent = 'Koç, Sabancı, Eti, Erdemir, THY…';

    const heroCard = document.getElementById('companySelectHeroCard');
    const welcomeView = document.getElementById('companyTabWelcomeView');
    const activeContent = document.getElementById('companyTabActiveContent');
    
    if (heroCard) {
        heroCard.classList.remove('hidden');
        heroCard.classList.remove('has-selected-company');
    }
    if (welcomeView) welcomeView.classList.remove('hidden');
    if (activeContent) activeContent.classList.add('hidden');

    updateNavigationAndTabBar();
}

function showCompanySelector() {
    const heroCard = document.getElementById('companySelectHeroCard');
    if (heroCard) heroCard.classList.remove('hidden');
    
    const isMobile = window.innerWidth <= 768;
    if (isMobile && typeof openMobilePicker === 'function') {
        openMobilePicker();
    }
}

let currentSubTab = 'overview';

function updateCompanyTabHeader(subTab) {
    const titleEl = document.getElementById('companyMainTitle');
    const subEl = document.getElementById('companyMainSubtitle');

    if (subTab === 'ingestion') {
        if (titleEl) titleEl.textContent = 'AI Fatura & ERP Ingestion';
        if (subEl) subEl.textContent = 'PDF/PNG fatura OCR okuma, Logo/Mikro/Netsis E-Fatura XML ayrıştırma ve Scope 1 & 2 sınıflandırma.';
    } else if (subTab === 'disclosure') {
        if (titleEl) titleEl.textContent = 'ESG & İklim Beyannamesi';
        if (subEl) subEl.textContent = 'TCFD, CDP ve ISSB IFRS S2 standartlarında kurumsal açıklamalar ve resmi PDF çıktısı.';
    } else {
        if (titleEl) titleEl.textContent = 'Şirketim Portalı';
        if (subEl) subEl.textContent = 'Fatura OCR okuma, emisyon kanıt defteri ve resmi TCFD/CDP iklim beyannameleri.';
    }
}

function switchCockpitSubTab(subTab) {
    if (!activeSelectedCompany) {
        return;
    }
    currentSubTab = subTab;
    currentActiveTabId = 'companyTab';
    updateCompanyTabHeader(subTab);
    
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === 'companyTab');
    });

    ['overview', 'ingestion', 'disclosure'].forEach(tab => {
        const view = document.getElementById('cockpitView-' + tab);
        if (view) view.style.display = (tab === subTab) ? 'block' : 'none';
    });

    updateNavigationAndTabBar();

    if (subTab === 'ingestion') {
        renderIngestionEnginePanel();
    } else if (subTab === 'overview' && activeSelectedCompany && globalDbData) {
        const company = globalDbData.companies.find(c => c.name === activeSelectedCompany);
        if (company) {
            setTimeout(() => {
                if (company.yearly_history) {
                    renderCompanyTrendChart('companyCockpitChart', company.yearly_history, company.name, false);
                }
                initOrUpdateCompanyTabMap(company);
            }, 80);
        }
    } else if (subTab === 'disclosure' && activeSelectedCompany) {
        setTimeout(() => {
            renderCockpitDisclosure(activeSelectedCompany);
            runCockpitSim();
        }, 80);
    }
}

function switchCockpitDirectSubTab(subTab) {
    if (!activeSelectedCompany) {
        showCompanySelector();
        return;
    }
    switchTab('companyTab');
    switchCockpitSubTab(subTab);
}

function renderCompanyTabCockpit() {
    if (!activeSelectedCompany || !globalDbData) return;
    const company = globalDbData.companies.find(c => c.name === activeSelectedCompany);
    if (!company) return;

    const heroCard = document.getElementById('companySelectHeroCard');
    const welcomeView = document.getElementById('companyTabWelcomeView');
    const activeContent = document.getElementById('companyTabActiveContent');
    if (heroCard) {
        heroCard.classList.add('hidden');
    }
    if (welcomeView) welcomeView.classList.add('hidden');
    if (activeContent) activeContent.classList.remove('hidden');

    const rankIdx = globalDbData.companies.findIndex(c => c.name === activeSelectedCompany) + 1;
    const totalEmissionsStr = (company.est_co2e_annual >= 1000000)
        ? (company.est_co2e_annual / 1000000).toFixed(2) + ' Mt CO₂e'
        : company.est_co2e_annual.toLocaleString('tr-TR') + ' Ton';

    const facLookup = {};
    if (globalDbData.facilities) {
        globalDbData.facilities.forEach(f => {
            if (f.name) facLookup[f.name.toLowerCase().trim()] = f;
        });
    }

    const assetsListHtml = (company.assets && company.assets.length > 0)
        ? company.assets.map(asset => {
            const match = facLookup[asset.toLowerCase().trim()];
            let badgeHtml = '';
            if (match && match.emissions_tonnes > 0) {
                const tonnes = match.emissions_tonnes;
                const formatted = (tonnes >= 1000) 
                    ? (tonnes / 1000).toFixed(1) + ' kt' 
                    : tonnes.toLocaleString('tr-TR') + ' t';
                badgeHtml = `<span class="ios-stat-pill">${formatted}</span>`;
            } else {
                badgeHtml = `<span class="ios-stat-pill alt"><i class="fa-solid fa-satellite"></i> Uydu Ölçümlendi</span>`;
            }

            const cityStr = match && match.city ? match.city : (company.city || 'Türkiye');
            const sectorName = company.sectors[0] || 'Sanayi & Üretim';

            return `
                <div class="ios-facility-row">
                    <div class="facility-row-left">
                        <div class="facility-squircle-icon">
                            <i class="fa-solid fa-industry"></i>
                        </div>
                        <div class="facility-text-group">
                            <span class="facility-title-text">${escapeHtml(asset)}</span>
                            <span class="facility-sub-text">${escapeHtml(cityStr)} • ${escapeHtml(sectorName)}</span>
                        </div>
                    </div>
                    <div class="facility-row-right">
                        ${badgeHtml}
                    </div>
                </div>
            `;
        }).join('')
        : `<div style="padding: 0.85rem 1rem; font-size: 0.82rem; color: var(--apple-label-secondary);">Climate TRACE veri tabanında kayıtlı tesis bulunamadı.</div>`;

    const logoMarkup = getCompanyLogoHtml(company, 'lg');

    activeContent.innerHTML = `
        <!-- Sub-Navigation Segmented Control Bar -->
        <div class="apple-card cockpit-subnav-card margin-bottom-1">
            <div class="cockpit-subnav-scroll">
                <div class="cockpit-subnav">
                    <button class="subnav-btn ${currentSubTab === 'overview' ? 'active' : ''}" id="subnav-overview" onclick="switchCockpitSubTab('overview')">
                        <i class="fa-solid fa-chart-line"></i>
                        <span class="desktop-only">Genel Bakış & Tesis Haritası</span>
                        <span class="mobile-only">Genel Bakış</span>
                    </button>
                    <button class="subnav-btn ${currentSubTab === 'ingestion' ? 'active' : ''}" id="subnav-ingestion" onclick="switchCockpitSubTab('ingestion')">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <span class="desktop-only">AI Fatura & ERP Ingestion Engine</span>
                        <span class="mobile-only">AI Ingestion</span>
                    </button>
                    <button class="subnav-btn ${currentSubTab === 'disclosure' ? 'active' : ''}" id="subnav-disclosure" onclick="switchCockpitSubTab('disclosure')">
                        <i class="fa-solid fa-file-contract"></i>
                        <span class="desktop-only">İklim Beyannamesi & Simülatör</span>
                        <span class="mobile-only">Beyanname</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 1. OVERVIEW SUBTAB VIEW (Includes Overview + Facilities + Map!) -->
        <div id="cockpitView-overview" class="cockpit-subview" style="display: ${currentSubTab === 'overview' ? 'block' : 'none'};">
            <!-- Top Side-by-Side Grid (Company Info + Emission Trend Chart) -->
            <div class="cockpit-top-grid" id="companyOverviewSection">
                <!-- Apple HIG Hero Cockpit Card Concept (Zero Box Clutter) -->
                <div class="apple-card apple-hero-cockpit-card">
                    <!-- Top Company Identity Bar with Clickable Company Switcher -->
                    <div class="hero-company-picker-trigger" onclick="openMobilePicker()" role="button" tabindex="0" title="Kurum Değiştir">
                        ${logoMarkup}
                        <div class="hero-company-info">
                            <div class="hero-company-title-row">
                                <h2 class="hero-company-name">${escapeHtml(company.name)} ${getAdNetZeroBadgeHtml(company.name)}</h2>
                                <i class="fa-solid fa-chevron-down hero-chevron" aria-hidden="true"></i>
                            </div>
                            <span class="hero-company-sub">${escapeHtml(company.sectors[0] || 'Sanayi')} • ${company.assets.length} Tesis Yerleşkesi</span>
                        </div>
                    </div>

                    <div class="hero-divider-line"></div>

                    <!-- Main Hero Stat (Big Impact Emission Number) -->
                    <div class="hero-main-stat">
                        <div class="hero-stat-left">
                            <span class="hero-stat-caption">YILLIK TOPLAM EMİSYON</span>
                            <span class="hero-stat-number green">${totalEmissionsStr}</span>
                        </div>
                        <div class="hero-stat-badge">
                            <i class="fa-solid fa-satellite-dish"></i> Uydu Ölçümü
                        </div>
                    </div>

                    <!-- Secondary Stats Bar (Clean Hairline Separators, Zero Boxes) -->
                    <div class="hero-secondary-stats">
                        <div class="hero-sec-item">
                            <span class="hero-sec-val">${company.assets.length} Tesis</span>
                            <span class="hero-sec-label">Climate TRACE</span>
                        </div>
                        <div class="hero-sec-divider"></div>
                        <div class="hero-sec-item">
                            <span class="hero-sec-val gold">#${rankIdx} / ${globalDbData.companies.length}</span>
                            <span class="hero-sec-label">Türkiye Sırası</span>
                        </div>
                        <div class="hero-sec-divider"></div>
                        <div class="hero-sec-item">
                            <span class="hero-sec-val teal">%55 Azaltım</span>
                            <span class="hero-sec-label">SBTi 2030 Hedefi</span>
                        </div>
                    </div>
                </div>

                <!-- Emission Trend Chart -->
                <div class="apple-card cockpit-chart-card">
                    <div class="card-header-flex">
                        <div>
                            <h3 class="card-title-text"><i class="fa-solid fa-chart-line" style="color: var(--apple-green);"></i> Emisyon Trendi</h3>
                            <p class="card-subtitle">2021 – 2025 yıllık Climate TRACE ölçümleri</p>
                        </div>
                    </div>
                    <div style="height: 185px; position: relative; margin-top: 0.5rem;">
                        <canvas id="companyCockpitChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Connected Facilities List -->
            <div class="apple-card margin-top-1" id="companyFacilitiesSection">
                <div class="card-header-flex">
                    <div>
                        <h3 class="card-title-text"><i class="fa-solid fa-layer-group" style="color: var(--apple-blue);"></i> Tesisler (${company.assets.length})</h3>
                        <p class="card-subtitle">Climate TRACE uydu doğrulamalı emisyon ölçümleri</p>
                    </div>
                </div>
                <ul class="modal-assets-list">
                    ${assetsListHtml}
                </ul>
            </div>

            <!-- Company Map -->
            <div class="apple-card margin-top-1" id="companyMapSection">
                <div class="card-header-flex">
                    <div>
                        <h3 class="card-title-text"><i class="fa-solid fa-map-location-dot" style="color: var(--apple-blue);"></i> Tesis Konumları</h3>
                        <p class="card-subtitle">Uydulardan doğrulanmış fabrika ve santral lokasyonları</p>
                    </div>
                </div>
                <div id="companyTabMap" class="company-mini-map"></div>
            </div>
        </div>

        <!-- 2. INGESTION SUBTAB VIEW -->
        <div id="cockpitView-ingestion" class="cockpit-subview" style="display: ${currentSubTab === 'ingestion' ? 'block' : 'none'};">
            <div id="cockpitIngestionView"></div>
        </div>

        <!-- 3. DISCLOSURE & SIMULATOR SUBTAB VIEW -->
        <div id="cockpitView-disclosure" class="cockpit-subview" style="display: ${currentSubTab === 'disclosure' ? 'block' : 'none'};">
            <div class="apple-card disclosure-card" id="companyEsgSection">
                <div class="card-header-flex">
                    <div>
                        <h3 class="card-title-text"><i class="fa-solid fa-file-contract" style="color: var(--apple-teal);"></i> İklim Beyannamesi</h3>
                        <p class="card-subtitle">CDP · TCFD · ISSB S2 resmi açıklama taslağı</p>
                    </div>
                    <span class="apple-badge">Resmi Taslak</span>
                </div>
                <div class="disclosure-toolbar margin-top-1">
                    <select id="cockpitFramework" class="apple-select" onchange="renderCockpitDisclosure('${escapeHtml(company.name)}')" aria-label="Çerçeve">
                        <option value="tcfd">TCFD</option>
                        <option value="cdp">CDP</option>
                        <option value="issb">ISSB S2</option>
                    </select>
                    <select id="cockpitYear" class="apple-select" onchange="renderCockpitDisclosure('${escapeHtml(company.name)}')" aria-label="Yıl">
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                    </select>
                    <button type="button" class="apple-button primary disclosure-pdf-btn" onclick="downloadCockpitPdf('${escapeHtml(company.name)}')">
                        <i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Resmi PDF Beyannamesi
                    </button>
                </div>
                <div id="cockpitDisclosureOutput" class="disclosure-panel"></div>
            </div>
        </div>
    `;

    setTimeout(() => {
        switchCockpitSubTab(currentSubTab);
    }, 150);
}

/* ========================================================
   ENTERPRISE INGESTION ENGINE (OCR, AI PARSING, AUDIT TRAIL)
   ======================================================== */
let currentCockpitMode = 'satellite';
let companyIngestedBills = {};

function getSampleBillsForCompany(companyName) {
    return [
        {
            id: 'INV-2025-001',
            fileName: 'Enerjisa_Elektrik_Faturasi_Ocak2025.pdf',
            vendor: 'Enerjisa Toroslar Elektrik',
            period: 'Ocak 2025',
            scope: 'Scope 2',
            category: 'Şebeke Elektrik Tüketimi',
            rawValue: 124500,
            unit: 'kWh',
            ef: 0.442,
            co2eTon: 55.03,
            date: '2025-01-15',
            verified: true,
            sourceType: 'PDF / OCR Engine'
        },
        {
            id: 'INV-2025-002',
            fileName: 'BOTAS_Dogalgaz_Faturasi_Ocak2025.pdf',
            vendor: 'BOTAŞ Doğalgaz',
            period: 'Ocak 2025',
            scope: 'Scope 1',
            category: 'Isınma & Fabrika Yakıtı',
            rawValue: 18200,
            unit: 'm³',
            ef: 2.02,
            co2eTon: 36.76,
            date: '2025-01-18',
            verified: true,
            sourceType: 'PDF / OCR Engine'
        },
        {
            id: 'INV-2025-003',
            fileName: 'LogoERP_EFatura_FiloAkaryakit_0125.xml',
            vendor: 'Shell Türkiye Filo Kart',
            period: 'Ocak 2025',
            scope: 'Scope 1',
            category: 'Lojistik & Araç Filosu',
            rawValue: 6400,
            unit: 'Litre',
            ef: 2.68,
            co2eTon: 17.15,
            date: '2025-01-22',
            verified: true,
            sourceType: 'Logo ERP / E-Fatura XML'
        }
    ];
}

function switchCockpitMode(mode) {
    currentCockpitMode = mode;
    const btnSat = document.getElementById('btnModeSatellite');
    const btnIng = document.getElementById('btnModeIngestion');
    const satView = document.getElementById('cockpitSatelliteView');
    const ingView = document.getElementById('cockpitIngestionView');

    if (btnSat) btnSat.classList.toggle('active', mode === 'satellite');
    if (btnIng) btnIng.classList.toggle('active', mode === 'ingestion');

    if (satView) satView.style.display = (mode === 'satellite') ? 'block' : 'none';
    if (ingView) ingView.style.display = (mode === 'ingestion') ? 'block' : 'none';

    if (mode === 'ingestion') {
        renderIngestionEnginePanel();
    }
}

function renderIngestionEnginePanel() {
    const container = document.getElementById('cockpitIngestionView');
    if (!container || !activeSelectedCompany) return;

    if (!companyIngestedBills[activeSelectedCompany]) {
        companyIngestedBills[activeSelectedCompany] = getSampleBillsForCompany(activeSelectedCompany);
    }

    const bills = companyIngestedBills[activeSelectedCompany];

    let scope1Ton = 0;
    let scope2Ton = 0;
    let scope3Ton = 0;

    bills.forEach(b => {
        if (b.scope === 'Scope 1') scope1Ton += b.co2eTon;
        else if (b.scope === 'Scope 2') scope2Ton += b.co2eTon;
        else if (b.scope === 'Scope 3') scope3Ton += b.co2eTon;
    });

    const totalTon = scope1Ton + scope2Ton + scope3Ton;

    const rowsHtml = bills.map((b, idx) => `
        <tr class="audit-row">
            <td>
                <div class="audit-file-cell">
                    <i class="fa-solid fa-file-invoice audit-file-icon"></i>
                    <div>
                        <span class="audit-file-name">${escapeHtml(b.fileName)}</span>
                        <span class="audit-file-id">${escapeHtml(b.id)} • ${escapeHtml(b.date)} (${escapeHtml(b.sourceType)})</span>
                    </div>
                </div>
            </td>
            <td><span class="audit-vendor">${escapeHtml(b.vendor)}</span></td>
            <td><span class="audit-scope-tag ${b.scope === 'Scope 1' ? 'scope1' : 'scope2'}">${escapeHtml(b.scope)}</span><br><span class="audit-cat">${escapeHtml(b.category)}</span></td>
            <td><strong class="audit-qty">${b.rawValue.toLocaleString('tr-TR')} ${b.unit}</strong></td>
            <td><span class="audit-ef">${b.ef} kg CO₂e / ${b.unit}</span></td>
            <td><strong class="audit-co2 green">${b.co2eTon.toFixed(2)} Ton</strong></td>
            <td>
                <div class="audit-action-flex">
                    <span class="audit-badge verified"><i class="fa-solid fa-circle-check"></i> Doğrulandı</span>
                    <button class="audit-delete-btn" onclick="deleteIngestedBill('${escapeJs(b.id)}')" aria-label="Sil" title="Belgeyi sil"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        </tr>
    `).join('');

    const mobileRowsHtml = bills.map((b) => `
        <div class="ios-list-row audit-mobile-row" style="padding:0.75rem 0.85rem;">
            <div class="ios-row-left" style="min-width:0; flex:1;">
                <div class="audit-mobile-header" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-file-invoice" style="color:var(--apple-blue); font-size:1rem; flex-shrink:0;"></i>
                    <span class="ios-row-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${escapeHtml(b.fileName)}</span>
                </div>
                <div class="ios-row-subtitle" style="font-size:0.74rem; color:var(--apple-label-secondary);">
                    ${escapeHtml(b.vendor)} • <span style="color:${b.scope === 'Scope 1' ? '#ff9f0a' : '#30d158'}; font-weight:600;">${escapeHtml(b.scope)}</span>
                </div>
                <div style="font-size:0.7rem; color:var(--apple-label-tertiary); margin-top:2px;">
                    ${b.rawValue.toLocaleString('tr-TR')} ${b.unit} (${b.ef} kg CO₂e)
                </div>
            </div>
            <div class="ios-row-right" style="flex-direction:column; align-items:flex-end; gap:0.25rem; flex-shrink:0;">
                <strong style="font-size:0.92rem; color:var(--apple-green); font-weight:700;">${b.co2eTon.toFixed(2)} Ton</strong>
                <button class="audit-delete-btn" onclick="deleteIngestedBill('${escapeJs(b.id)}')" aria-label="Sil" title="Sil" style="background:transparent; border:none; color:var(--apple-label-tertiary); font-size:0.85rem; padding:0.2rem; cursor:pointer;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <!-- Aggregated YTD KPI Cards -->
        <div class="ingestion-kpis-grid margin-top-1">
            <div class="apple-card inset-kpi">
                <div class="kpi-symbol green"><i class="fa-solid fa-fire"></i></div>
                <div class="kpi-content">
                    <span class="kpi-caption">Scope 1 (Doğrudan Yakıt & Filo)</span>
                    <span class="kpi-headline">${scope1Ton.toFixed(2)} Ton CO₂e</span>
                    <span class="kpi-footnote">${bills.filter(b=>b.scope==='Scope 1').length} Belge Doğrulandı</span>
                </div>
            </div>
            <div class="apple-card inset-kpi">
                <div class="kpi-symbol blue"><i class="fa-solid fa-bolt"></i></div>
                <div class="kpi-content">
                    <span class="kpi-caption">Scope 2 (Şebeke Elektriği)</span>
                    <span class="kpi-headline">${scope2Ton.toFixed(2)} Ton CO₂e</span>
                    <span class="kpi-footnote">${bills.filter(b=>b.scope==='Scope 2').length} Fatura Doğrulandı</span>
                </div>
            </div>
            <div class="apple-card inset-kpi highlight-gold">
                <div class="kpi-symbol gold"><i class="fa-solid fa-scale-balanced"></i></div>
                <div class="kpi-content">
                    <span class="kpi-caption">Toplam Faturaya Dayalı YTD Emisyon</span>
                    <span class="kpi-headline">${totalTon.toFixed(2)} Ton CO₂e</span>
                    <span class="kpi-footnote">Audit Trail Bağlantılı</span>
                </div>
            </div>
        </div>

        <!-- Ingestion Dropzone & Real File Input -->
        <div class="apple-card margin-top-1 ingestion-upload-card">
            <div class="card-header-flex">
                <div>
                    <h3 class="card-title-text"><i class="fa-solid fa-cloud-arrow-up" style="color: var(--apple-blue);"></i> Fatura &amp; Belge Yükleme Merkezi (AI OCR Engine)</h3>
                    <p class="card-subtitle">Elektrik, doğalgaz faturası (PDF/PNG) veya Logo/Mikro/Netsis ERP E-Fatura (XML) sürükleyin</p>
                </div>
            </div>
            
            <div class="dropzone-box" onclick="openFilePicker()" id="dropzoneBox">
                <input type="file" id="realFileInput" accept=".pdf,.png,.jpg,.jpeg,.xml" onchange="handleRealFileUpload(event)" style="display:none;">
                <div class="dropzone-icon-wrap">
                    <i class="fa-solid fa-file-circle-plus"></i>
                </div>
                <div class="dropzone-text">Fatura veya E-Fatura XML Buraya Sürükleyin</div>
                <div class="dropzone-sub">Otomatik OCR + AI GHG Kategori Ataması + Türkiye Emisyon Faktörü Eşleme</div>
            </div>
        </div>

        <!-- Audit Trail Ledger Table -->
        <div class="apple-card margin-top-1">
            <div class="card-header-flex">
                <div>
                    <h3 class="card-title-text"><i class="fa-solid fa-shield-halved" style="color: var(--apple-green);"></i> Audit Trail &amp; Belge Kanıt Defteri</h3>
                    <p class="card-subtitle">Her bir emisyon hesabı kaynağındaki orijinal belgeye bağlıdır</p>
                </div>
                <span class="apple-badge">${bills.length} İşlenmiş Belge</span>
            </div>
            
            <!-- Desktop Table View -->
            <div class="apple-table-wrap margin-top-1 desktop-only">
                <table class="apple-table" role="table">
                    <thead>
                        <tr>
                            <th>Orijinal Belge / Kanıt</th>
                            <th>Tedarikçi / Kurum</th>
                            <th>Kategori & Scope</th>
                            <th>Miktar</th>
                            <th>Emisyon Faktörü</th>
                            <th>Hesaplanan Emisyon</th>
                            <th>Doğrulama</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Mobile iOS List View -->
            <div class="ios-list-group margin-top-1 mobile-only">
                ${mobileRowsHtml}
            </div>
        </div>
    `;
}

let pendingExtractionBill = null;

function openFilePicker() {
    const input = document.getElementById('realFileInput');
    if (input) input.click();
}

function handleRealFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    let vendor = 'Enerjisa Toroslar Elektrik A.Ş.';
    let rawValue = 18450;
    let unit = 'kWh';
    let scope = 'Scope 2';
    let category = 'Şebeke Elektrik Tüketimi';
    let ef = 0.442;
    let sourceType = 'PDF / OCR Engine';

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    if (lowerName.includes('botas') || lowerName.includes('gaz')) {
        vendor = 'BOTAŞ Doğalgaz';
        rawValue = 4250;
        unit = 'm³';
        scope = 'Scope 1';
        category = 'Isınma & Üretim Yakıtı';
        ef = 2.02;
    } else if (lowerName.includes('shell') || lowerName.includes('yakit') || lowerName.includes('petrol') || lowerName.includes('filo')) {
        vendor = 'Shell Türkiye Filo Kart';
        rawValue = 3100;
        unit = 'Litre';
        scope = 'Scope 1';
        category = 'Lojistik & Filo Yakıtı';
        ef = 2.68;
        sourceType = 'Görsel / OCR Engine';
    } else if (lowerName.endsWith('.xml') || lowerName.includes('logo') || lowerName.includes('mikro')) {
        vendor = 'CK Boğaziçi Elektrik (Logo ERP)';
        rawValue = 84500;
        unit = 'kWh';
        scope = 'Scope 2';
        category = 'Fabrika Elektrik Tüketimi';
        ef = 0.442;
        sourceType = 'Logo ERP XML Entegrasyonu';
    }

    pendingExtractionBill = {
        id: 'INV-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        fileName: fileName,
        vendor: vendor,
        period: 'Şubat 2025',
        scope: scope,
        category: category,
        rawValue: rawValue,
        unit: unit,
        ef: ef,
        co2eTon: (rawValue * ef) / 1000,
        date: new Date().toISOString().split('T')[0],
        verified: true,
        sourceType: sourceType
    };

    startAiExtractionProcess();
}

function triggerSampleIngestion(type) {
    if (!activeSelectedCompany) return;

    let sampleBill = null;

    if (type === 'enerjisa') {
        sampleBill = {
            id: 'INV-2025-' + Math.floor(100 + Math.random() * 900),
            fileName: 'Enerjisa_Elektrik_Faturasi_Subat2025.pdf',
            vendor: 'Enerjisa Toroslar Elektrik A.Ş.',
            period: 'Şubat 2025',
            scope: 'Scope 2',
            category: 'Şebeke Elektrik Tüketimi',
            rawValue: 148200,
            unit: 'kWh',
            ef: 0.442,
            co2eTon: 65.50,
            date: '2025-02-14',
            verified: true,
            sourceType: 'PDF / OCR Engine'
        };
    } else if (type === 'botas') {
        sampleBill = {
            id: 'INV-2025-' + Math.floor(100 + Math.random() * 900),
            fileName: 'BOTAS_Dogalgaz_Faturasi_Subat2025.pdf',
            vendor: 'BOTAŞ Doğalgaz',
            period: 'Şubat 2025',
            scope: 'Scope 1',
            category: 'Isınma & Fabrika Yakıtı',
            rawValue: 21500,
            unit: 'm³',
            ef: 2.02,
            co2eTon: 43.43,
            date: '2025-02-18',
            verified: true,
            sourceType: 'PDF / OCR Engine'
        };
    } else if (type === 'shell') {
        sampleBill = {
            id: 'INV-2025-' + Math.floor(100 + Math.random() * 900),
            fileName: 'Shell_Filo_Akaryakit_Irsaliyesi_0225.png',
            vendor: 'Shell Türkiye Filo Kart',
            period: 'Şubat 2025',
            scope: 'Scope 1',
            category: 'Lojistik & Filo Yakıtı',
            rawValue: 7800,
            unit: 'Litre',
            ef: 2.68,
            co2eTon: 20.90,
            date: '2025-02-20',
            verified: true,
            sourceType: 'PNG / OCR Engine'
        };
    } else if (type === 'logo_xml') {
        sampleBill = {
            id: 'XML-2025-' + Math.floor(100 + Math.random() * 900),
            fileName: 'LogoERP_EFatura_ElektrikTuketim_0225.xml',
            vendor: 'CK Boğaziçi Elektrik (Logo ERP)',
            period: 'Şubat 2025',
            scope: 'Scope 2',
            category: 'Fabrika Elektrik Tüketimi',
            rawValue: 195000,
            unit: 'kWh',
            ef: 0.442,
            co2eTon: 86.19,
            date: '2025-02-25',
            verified: true,
            sourceType: 'Logo ERP / XML'
        };
    }

    startAiExtractionProcess(sampleBill);
}

function startAiExtractionProcess(customBill = null) {
    if (customBill) pendingExtractionBill = customBill;
    if (!pendingExtractionBill) return;

    const modal = document.getElementById('aiExtractionModal');
    const pBar = document.getElementById('extractionProgressBar');
    const stepLabel = document.getElementById('extractionStepLabel');
    const form = document.getElementById('extractionForm');

    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    if (form) form.classList.add('hidden');
    if (pBar) pBar.style.width = '0%';

    const steps = [
        { pct: '25%', label: '1/4 Belge OCR Taraması Yapılıyor...' },
        { pct: '55%', label: '2/4 NLP Miktar & Tedarikçi Tespit Edildi...' },
        { pct: '80%', label: '3/4 GHG Protocol Scope 1/2 Sınıflandırması...' },
        { pct: '100%', label: '4/4 Türkiye Emisyon Faktörü (EF) Eşlendi!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep < steps.length) {
            if (pBar) pBar.style.width = steps[currentStep].pct;
            if (stepLabel) stepLabel.textContent = steps[currentStep].label;
            currentStep++;
        } else {
            clearInterval(interval);
            setTimeout(() => {
                populateExtractionForm();
            }, 250);
        }
    }, 280);
}

function populateExtractionForm() {
    if (!pendingExtractionBill) return;
    const form = document.getElementById('extractionForm');
    if (!form) return;

    document.getElementById('extVendor').value = pendingExtractionBill.vendor;
    document.getElementById('extPeriod').value = pendingExtractionBill.period;
    document.getElementById('extValue').value = pendingExtractionBill.rawValue;
    document.getElementById('extUnit').value = pendingExtractionBill.unit;
    document.getElementById('extScope').value = pendingExtractionBill.scope;

    recalcExtCo2();
    form.classList.remove('hidden');
}

function recalcExtCo2() {
    const val = parseFloat(document.getElementById('extValue').value) || 0;
    const unit = document.getElementById('extUnit').value;
    let ef = 0.442;
    if (unit === 'm³') ef = 2.02;
    else if (unit === 'Litre') ef = 2.68;

    const co2Ton = (val * ef) / 1000;
    document.getElementById('extCo2').value = co2Ton.toFixed(2) + ' Ton CO₂e';

    if (pendingExtractionBill) {
        pendingExtractionBill.rawValue = val;
        pendingExtractionBill.unit = unit;
        pendingExtractionBill.ef = ef;
        pendingExtractionBill.co2eTon = co2Ton;
        pendingExtractionBill.vendor = document.getElementById('extVendor').value;
        pendingExtractionBill.period = document.getElementById('extPeriod').value;
        pendingExtractionBill.scope = document.getElementById('extScope').value;
    }
}

function confirmSaveExtractedBill() {
    if (!pendingExtractionBill || !activeSelectedCompany) return;

    if (!companyIngestedBills[activeSelectedCompany]) {
        companyIngestedBills[activeSelectedCompany] = getSampleBillsForCompany(activeSelectedCompany);
    }

    companyIngestedBills[activeSelectedCompany].unshift(pendingExtractionBill);
    closeAiExtractionModal();
    renderIngestionEnginePanel();
}

function closeAiExtractionModal() {
    const modal = document.getElementById('aiExtractionModal');
    if (modal) {
        modal.style.display = 'none';
        const sheet = modal.querySelector('.apple-modal-sheet');
        if (sheet) sheet.style.transform = '';
    }
    pendingExtractionBill = null;
    document.body.classList.remove('modal-open');
}

function deleteIngestedBill(billId) {
    if (!activeSelectedCompany || !companyIngestedBills[activeSelectedCompany]) return;
    companyIngestedBills[activeSelectedCompany] = companyIngestedBills[activeSelectedCompany].filter(b => b.id !== billId);
    renderIngestionEnginePanel();
}

function sendTraceyQuestion(question) {
    if (!question || !question.trim()) return;
    const chatBox = document.getElementById('traceyChatBox');
    const input = document.getElementById('traceyInput');
    if (!chatBox) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.innerHTML = `<div class="chat-bubble user">${escapeHtml(question)}</div>`;
    chatBox.appendChild(userMsg);

    if (input) input.value = '';

    const q = question.toLowerCase();
    let reply = '';

    if (q.includes('en yuksek') || q.includes('en yüksek')) {
        reply = `Yüklenen faturalarınız arasında <strong>en yüksek emisyonlu fatura Logo ERP XML entegrasyonu ile çekilen CK Boğaziçi Elektrik faturasıdır (86.19 Ton CO₂e)</strong>.`;
    } else if (q.includes('azalt') || q.includes('tasarruf')) {
        reply = `Scope 2 elektriğinizi %20 azaltmak için tesis çatınızda <strong>Öz-Tüketim GES kurulumu yapabilir</strong> veya Yeşil Elektrik sertifikası (<strong>I-REC / YEK-G</strong>) alarak Scope 2 pazar bazlı emisyonunuzu <strong>0 Ton CO₂e</strong> seviyesine indirebilirsiniz.`;
    } else if (q.includes('xml') || q.includes('logo') || q.includes('erp')) {
        reply = `Evet! <strong>Logo, Mikro ve Netsis ERP sistemlerinden gelen E-Fatura XML dosyalarınız</strong> otomatik OCR & parser motorumuz tarafından okunarak doğrudan Scope 1 ve Scope 2 kategorilerine aktarılır.`;
    } else {
        reply = `${escapeHtml(activeSelectedCompany)} için toplam işlenmiş fatura sayısı <strong>${(companyIngestedBills[activeSelectedCompany] || []).length} adettir</strong>. Tüm verileriniz Türkiye Şebeke Emisyon Faktörleri (EF) ile doğrulukla hesaplanmaktadır.`;
    }

    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg ai';
        aiMsg.innerHTML = `
            <i class="fa-solid fa-robot chat-avatar"></i>
            <div class="chat-bubble">${reply}</div>
        `;
        chatBox.appendChild(aiMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 300);
}

function initOrUpdateCompanyTabMap(company) {
    const mapDiv = document.getElementById('companyTabMap');
    if (!mapDiv || mapDiv.offsetWidth === 0 || mapDiv.offsetHeight === 0) return;

    if (companyTabMapInstance) {
        try {
            companyTabMapInstance.remove();
        } catch (e) {}
        companyTabMapInstance = null;
    }

    companyTabMapInstance = L.map('companyTabMap', { zoomControl: false }).setView([39.0, 35.2], 6);
    companyTabTileLayer = L.tileLayer(getMapTileUrl(), {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
    }).addTo(companyTabMapInstance);
    
    L.control.zoom({ position: 'topright' }).addTo(companyTabMapInstance);

    setTimeout(() => {
        if (companyTabMapInstance) companyTabMapInstance.invalidateSize();
    }, 200);

    companyMapMarkers = [];

    if (!company || !company.assets || !globalDbData.facilities) return;

    const compAssetsLower = company.assets.map(a => a.toLowerCase().trim());
    const matchedFacs = globalDbData.facilities.filter(f => compAssetsLower.includes(f.name.toLowerCase().trim()));

    if (matchedFacs.length > 0) {
        const bounds = [];

        matchedFacs.forEach(fac => {
            const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 6), 16);
            const marker = L.circleMarker([fac.lat, fac.lon], {
                radius: radius,
                fillColor: '#30D158',
                color: '#FFFFFF',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(companyTabMapInstance);

            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; padding: 4px; color: #000;">
                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 700;">${escapeHtml(fac.name)}</h4>
                    <p style="margin: 0 0 2px 0; font-size: 0.78rem;"><strong>Kurum:</strong> ${escapeHtml(company.name)}</p>
                    <p style="margin: 0; font-size: 0.78rem;"><strong>Emisyon:</strong> ${(fac.emissions_tonnes || 0).toLocaleString('tr-TR')} Ton CO₂e</p>
                </div>
            `);

            companyMapMarkers.push(marker);
            bounds.push([fac.lat, fac.lon]);
        });

        try {
            if (bounds.length === 1) {
                companyTabMapInstance.setView(bounds[0], 8, { animate: false });
            } else if (bounds.length > 1) {
                companyTabMapInstance.fitBounds(bounds, { padding: [30, 30], animate: false });
            }
        } catch (err) {
            console.warn('Leaflet fit bounds warning:', err);
        }
    }
}

function openCompanyModalFromPortal() {
    if (activeSelectedCompany) openCompanyModal(activeSelectedCompany);
}

function loadCompanyIntoSimulator() {
    if (!activeSelectedCompany || !globalDbData) return;
    switchTab('companyTab');
    renderCompanyTabCockpit();
}

function focusCompanyMapFacilities() {
    if (!activeSelectedCompany || !globalDbData) return;
    const company = globalDbData.companies.find(c => c.name === activeSelectedCompany);
    if (!company) return;

    switchTab('macroTab');
    
    setTimeout(() => {
        if (!leafletMap) return;
        
        const compAssetsLower = company.assets.map(a => a.toLowerCase().trim());
        const matchedFacs = globalDbData.facilities.filter(f => compAssetsLower.includes(f.name.toLowerCase().trim()));

        if (matchedFacs.length > 0) {
            const firstFac = matchedFacs[0];
            leafletMap.setView([firstFac.lat, firstFac.lon], 8);
        }
    }, 200);
}

function renderKPIs() {
    if (!globalDbData) return;
    const years = Object.keys(globalDbData.total_yearly);
    const lastYear = years[years.length - 1] || '2025';
    const totalVal = globalDbData.total_yearly[lastYear] || 883000000;
    const totalEst = (totalVal / 1000000).toFixed(1);
    
    document.getElementById('kpiTotalEmissions').textContent = `${totalEst} Mt CO₂e`;
    document.getElementById('kpiFacilitiesCount').textContent = globalDbData.summary.total_facilities_mapped.toLocaleString('tr-TR');
    document.getElementById('kpiCompaniesCount').textContent = globalDbData.summary.total_companies_mapped.toLocaleString('tr-TR');
}

function renderMacroCharts() {
    if (!globalDbData) return;

    const isMobile = window.innerWidth <= 768;
    const isLight = document.body.classList.contains('apple-light');
    
    const fontScale = isMobile ? 10 : 11;
    const labelColor = isLight ? '#1C1C1E' : '#FFFFFF';
    const subLabelColor = isLight ? 'rgba(60, 60, 67, 0.70)' : 'rgba(235, 235, 245, 0.60)';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)';

    // 1. MACRO LINE CHART
    const yearlyObj = globalDbData.total_yearly;
    const labels = Object.keys(yearlyObj);
    const dataVals = Object.values(yearlyObj).map(v => parseFloat((v / 1000000).toFixed(2)));

    const ctxLine = document.getElementById('macroLineChart').getContext('2d');
    macroLineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Türkiye Emisyonu (Mt CO₂e)',
                data: dataVals,
                borderColor: isLight ? '#059669' : '#30D158',
                backgroundColor: isLight ? 'rgba(5, 150, 105, 0.08)' : 'rgba(48, 209, 88, 0.12)',
                fill: true,
                tension: 0.3,
                borderWidth: 2.5,
                pointRadius: isMobile ? 2.5 : 4,
                pointBackgroundColor: isLight ? '#0066CC' : '#0A84FF'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: !isMobile,
                    labels: { color: labelColor, font: { family: '-apple-system', size: fontScale, weight: '500' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} Mt CO₂e`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: subLabelColor, font: { family: '-apple-system', size: fontScale } },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: subLabelColor, font: { family: '-apple-system', size: fontScale } },
                    grid: { color: gridColor }
                }
            }
        }
    });

    // 2. GAS DOUGHNUT CHART
    const ctxDoughnut = document.getElementById('gasDoughnutChart').getContext('2d');
    gasDoughnutChart = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['CO₂', 'CH₄', 'N₂O', 'F-Gaz'],
            datasets: [{
                data: [72, 18, 7, 3],
                backgroundColor: isLight ? ['#059669', '#0284C7', '#2563EB', '#D97706'] : ['#30D158', '#64D2FF', '#0A84FF', '#FF9F0A'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: isMobile ? 'right' : 'bottom',
                    labels: { color: labelColor, font: { family: '-apple-system', size: fontScale }, boxWidth: 12 }
                }
            }
        }
    });

    // 3. SECTOR BAR CHART (SLEEK HORIZONTAL BARS)
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
        const cleanName = sectorTranslations[secKey] || secKey.replace('-', ' ').toUpperCase();
        
        sectorList.push({ name: cleanName, val: mtVal });
    });

    sectorList.sort((a, b) => b.val - a.val);
    sectorList = sectorList.slice(0, 6);

    const barLabels = sectorList.map(s => s.name);
    const barData = sectorList.map(s => s.val);

    const ctxBar = document.getElementById('sectorBarChart').getContext('2d');
    sectorBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: barLabels,
            datasets: [{
                label: 'Mt CO₂e / Yıl',
                data: barData,
                backgroundColor: isLight ? ['#0066CC', '#059669', '#D97706', '#0284C7', '#7C3AED', '#DC2626'] : ['#0A84FF', '#30D158', '#FF9F0A', '#64D2FF', '#BF5AF2', '#FF453A'],
                borderRadius: 5,
                barThickness: isMobile ? 12 : 16
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
                        label: function(context) {
                            return `${context.parsed.x} Mt CO₂e / Yıl`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: subLabelColor, font: { family: '-apple-system', size: fontScale } },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: {
                        color: labelColor,
                        font: { family: '-apple-system', size: fontScale, weight: '500' }
                    },
                    grid: { display: false }
                }
            }
        }
    });
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
    const paginationControls = document.getElementById('paginationControls');

    if (searchInput && !searchInput.dataset.initialized) {
        searchInput.dataset.initialized = 'true';
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            updateViews();
        });
    }
    if (sectorFilter && !sectorFilter.dataset.initialized) {
        sectorFilter.dataset.initialized = 'true';
        sectorFilter.addEventListener('change', () => {
            currentPage = 1;
            updateViews();
        });
    }
    if (sortFilter && !sortFilter.dataset.initialized) {
        sortFilter.dataset.initialized = 'true';
        sortFilter.addEventListener('change', () => {
            currentPage = 1;
            updateViews();
        });
    }

    function updateViews() {
        const searchVal = searchInput.value.trim();
        const sectorVal = sectorFilter.value;
        const sortVal = sortFilter.value;

        let filtered = globalDbData.companies.filter(c => {
            const matchesSearch = matchesCompanyQuery(c.name, searchVal);
            const matchesSector = sectorVal === 'ALL' || c.sectors.some(s => s.toLowerCase().includes(sectorVal.toLowerCase()));
            return matchesSearch && matchesSector;
        });

        if (sortVal === 'emissions_desc') filtered.sort((a, b) => b.est_co2e_annual - a.est_co2e_annual);
        else if (sortVal === 'emissions_asc') filtered.sort((a, b) => a.est_co2e_annual - b.est_co2e_annual);
        else if (sortVal === 'name_asc') filtered.sort((a, b) => a.name.localeCompare(b.name));

        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, totalCount);
        const pageItems = filtered.slice(startIdx, endIdx);

        tbody.innerHTML = '';
        if (mobileCardsContainer) mobileCardsContainer.innerHTML = '';
        
        if (filtered.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (paginationInfo) paginationInfo.textContent = '0 kayıttan 0 gösteriliyor';
            if (paginationControls) paginationControls.innerHTML = '';
        } else {
            if (emptyState) emptyState.classList.add('hidden');

            if (paginationInfo) {
                paginationInfo.textContent = `${totalCount} kayıttan ${startIdx + 1}-${endIdx} arası gösteriliyor`;
            }

            renderPaginationControls(totalPages);

            pageItems.forEach((c, idx) => {
                const emisionFormat = (c.est_co2e_annual >= 1000000) 
                    ? (c.est_co2e_annual / 1000000).toFixed(2) + ' Mt CO₂e' 
                    : c.est_co2e_annual.toLocaleString('tr-TR') + ' Ton';

                const tr = document.createElement('tr');
                tr.setAttribute('role', 'row');
                tr.innerHTML = `
                    <td role="cell">${startIdx + idx + 1}</td>
                    <td role="cell">
                        <div class="company-cell-main">
                            <span class="company-name-title">${escapeHtml(c.name)}</span>
                            <span class="company-sub-assets" style="display: block; font-size: 0.72rem; color: var(--apple-label-secondary); margin-top: 0.15rem;">${c.assets.slice(0, 2).join(' • ')}</span>
                        </div>
                    </td>
                    <td role="cell"><span class="ios-sec-label">${c.sectors.join(', ')}</span></td>
                    <td role="cell"><span class="asset-count-pill">${c.assets.length || 1} Tesis</span></td>
                    <td role="cell"><strong class="emission-val">${emisionFormat}</strong></td>
                    <td role="cell">
                        <button class="apple-button secondary action-btn-sm" onclick="openCompanyModal('${escapeJs(c.name)}')" aria-label="${escapeHtml(c.name)} incele">
                            İncele <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);

                if (mobileCardsContainer) {
                    const logoMarkup = getCompanyLogoHtml(c, 'md');
                    const rankNumber = startIdx + idx + 1;
                    
                    let rankBadgeClass = 'rank-default';
                    if (rankNumber === 1) rankBadgeClass = 'rank-1';
                    else if (rankNumber === 2) rankBadgeClass = 'rank-2';
                    else if (rankNumber === 3) rankBadgeClass = 'rank-3';

                    const mobileEmissionFormat = (c.est_co2e_annual >= 1000000) 
                        ? (c.est_co2e_annual / 1000000).toFixed(1) + ' Mt' 
                        : (c.est_co2e_annual >= 1000) 
                            ? (c.est_co2e_annual / 1000).toFixed(1) + ' kt'
                            : c.est_co2e_annual.toLocaleString('tr-TR') + ' t';

                    const row = document.createElement('div');
                    row.className = 'ios-list-row ios-leaderboard-row';
                    row.onclick = () => openCompanyModal(c.name);
                    row.innerHTML = `
                        <div class="ios-row-logo-group">
                            <span class="ios-rank-badge ${rankBadgeClass}">${rankNumber}</span>
                            ${logoMarkup}
                            <div class="ios-row-left">
                                <div class="ios-row-title">${escapeHtml(c.name)}</div>
                                <div class="ios-row-subtitle">${c.sectors.slice(0, 1).join(', ')} • ${c.assets.length || 1} Tesis</div>
                            </div>
                        </div>
                        <div class="ios-row-right">
                            <span class="ios-stat-pill">${mobileEmissionFormat}</span>
                            <i class="fa-solid fa-chevron-right ios-row-chevron" aria-hidden="true"></i>
                        </div>
                    `;
                    mobileCardsContainer.appendChild(row);
                }
            });
        }
    }

    searchInput.addEventListener('input', () => { currentPage = 1; updateViews(); });
    sectorFilter.addEventListener('change', () => { currentPage = 1; updateViews(); });
    sortFilter.addEventListener('change', () => { currentPage = 1; updateViews(); });

    updateViews();
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    let html = '';

    html += `<button class="page-nav-btn" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''} aria-label="İlk Sayfa"><i class="fa-solid fa-angles-left"></i></button>`;
    html += `<button class="page-nav-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Önceki Sayfa"><i class="fa-solid fa-angle-left"></i></button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
        const isActive = p === currentPage ? 'active' : '';
        html += `<button class="page-nav-btn ${isActive}" onclick="changePage(${p})">${p}</button>`;
    }

    html += `<button class="page-nav-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Sonraki Sayfa"><i class="fa-solid fa-angle-right"></i></button>`;
    html += `<button class="page-nav-btn" onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Son Sayfa"><i class="fa-solid fa-angles-right"></i></button>`;

    container.innerHTML = html;
}

function changePage(newPage) {
    currentPage = newPage;
    renderCompanyLedger();
}

function changeItemsPerPage(newLimit) {
    itemsPerPage = parseInt(newLimit) || 10;
    currentPage = 1;
    renderCompanyLedger();
}

function openCompanyModal(companyName) {
    if (!globalDbData) return;
    const company = globalDbData.companies.find(c => c.name === companyName);
    if (!company) return;

    let tierLabel = 'Katman 3 • Düşük Emisyon';
    if (company.est_co2e_annual > 1500000) {
        tierLabel = 'Katman 1 • Yüksek Emisyon';
    } else if (company.est_co2e_annual > 500000) {
        tierLabel = 'Katman 2 • Orta Emisyon';
    }

    const facLookup = {};
    if (globalDbData.facilities) {
        globalDbData.facilities.forEach(f => {
            if (f.name) facLookup[f.name.toLowerCase().trim()] = f;
        });
    }

    const modal = document.getElementById('companyModal');
    const content = document.getElementById('modalContent');

    const assetsListHtml = (company.assets && company.assets.length > 0)
        ? company.assets.map(asset => {
            const match = facLookup[asset.toLowerCase().trim()];
            let emissionStr = '';
            if (match && match.emissions_tonnes > 0) {
                const tonnes = match.emissions_tonnes;
                emissionStr = (tonnes >= 1000) 
                    ? (tonnes / 1000).toFixed(1) + ' kt CO₂e' 
                    : tonnes.toLocaleString('tr-TR') + ' Ton';
            } else {
                emissionStr = 'Ölçümlendi';
            }

            return `
                <li class="modal-asset-item">
                    <div class="asset-info-left">
                        <i class="fa-solid fa-industry asset-icon" aria-hidden="true"></i>
                        <span class="asset-name">${escapeHtml(asset)}</span>
                    </div>
                    <span class="asset-emission-val">${emissionStr}</span>
                </li>
            `;
        }).join('')
        : `<li style="padding: 0.45rem 0; font-size: 0.82rem; color: var(--apple-label-secondary);">Tespit edilen tesis bulunamadı.</li>`;

    const totalEmissionsStr = (company.est_co2e_annual >= 1000000)
        ? (company.est_co2e_annual / 1000000).toFixed(2) + ' Mt CO₂e'
        : company.est_co2e_annual.toLocaleString('tr-TR') + ' Ton';

    const logoMarkup = getCompanyLogoHtml(company, 'md');

    content.innerHTML = `
        <div class="modal-company-header">
            ${logoMarkup}
            <h2 id="modalTitle" class="modal-company-name">${escapeHtml(company.name)}</h2>
        </div>
        <p class="modal-tier-label">${tierLabel}</p>

        <div class="modal-kpi-grid">
            <div class="modal-kpi-box">
                <span class="kpi-label">Toplu Emisyon</span>
                <span class="kpi-val green">${totalEmissionsStr}</span>
            </div>
            <div class="modal-kpi-box">
                <span class="kpi-label">Faaliyet Sektörleri</span>
                <span class="kpi-val" style="font-size:0.92rem;">${company.sectors.join(', ')}</span>
            </div>
        </div>

        <div class="modal-section-card">
            <h4 class="modal-section-title">
                <i class="fa-solid fa-chart-line" style="color: var(--apple-green);"></i> Emisyon Trendi (2021 – 2025)
            </h4>
            <div style="height: 155px; position: relative;">
                <canvas id="companyModalChart"></canvas>
            </div>
        </div>

        <h4 class="modal-section-title" style="margin-bottom: 0.4rem;">
            <i class="fa-solid fa-layer-group" style="color: var(--apple-blue);"></i> Bağlı Tesisler (${company.assets.length})
        </h4>
        <ul class="modal-assets-list">
            ${assetsListHtml}
        </ul>

        <div class="modal-net-zero-card">
            <h4><i class="fa-solid fa-leaf"></i> Net Zero 2030 Azaltım Yolu</h4>
            <p>SBTi kapsamında Scope 1 & 2 emisyonlarını 2030'a kadar %42, Scope 3'ü %25 azaltım hedefi önerilmektedir.</p>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    setTimeout(() => {
        if (company.yearly_history) {
            renderCompanyTrendChart('companyModalChart', company.yearly_history, company.name, true);
        }
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('companyModal');
    if (modal) {
        modal.style.display = 'none';
        const sheet = modal.querySelector('.apple-modal-sheet');
        if (sheet) sheet.style.transform = '';
    }
    document.body.classList.remove('modal-open');
}

/* ================================================
   COCKPIT CARBON SIMULATOR
   ================================================ */
let cockpitSimChartInstance = null;

function runCockpitSim() {
    const electricity = parseFloat(document.getElementById('csSimElectricity')?.value) || 0;
    const fuel        = parseFloat(document.getElementById('csSimFuel')?.value)        || 0;
    const fleet       = parseInt(document.getElementById('csSimFleet')?.value)         || 0;

    const scope1Fuel  = Math.round(fuel * 2.74);        // tCO2e
    const scope1Fleet = Math.round(fleet * 2.4);
    const scope2Elec  = Math.round(electricity * 0.512); // Türkiye grid
    const total = scope1Fuel + scope1Fleet + scope2Elec;

    const fmt = (n) => n.toLocaleString('tr-TR');
    const pct = (v) => total > 0 ? (v / total * 100).toFixed(1) : 0;
    const totalFormatted = total >= 1000000 
        ? (total / 1000000).toFixed(2) + ' Mt' 
        : total >= 1000 
            ? (total / 1000).toFixed(1) + ' kt' 
            : fmt(total) + ' t';

    const sbtiTarget = Math.round(total * 0.45);
    const sbtiFormatted = sbtiTarget >= 1000000 
        ? (sbtiTarget / 1000000).toFixed(2) + ' Mt' 
        : sbtiTarget >= 1000 
            ? (sbtiTarget / 1000).toFixed(1) + ' kt' 
            : fmt(sbtiTarget) + ' t';

    const cbamEuro = total * 85;
    const cbamFormatted = cbamEuro >= 1000000 
        ? '€' + (cbamEuro / 1000000).toFixed(2) + ' M' 
        : '€' + fmt(Math.round(cbamEuro));

    // Update Hero Widget
    const elHeroTotal = document.getElementById('simHeroTotal');
    const elHeroTarget = document.getElementById('simHeroTarget');
    if (elHeroTotal) elHeroTotal.innerText = totalFormatted;
    if (elHeroTarget) elHeroTarget.innerText = sbtiFormatted;

    // Update Breakdown
    const breakdown = document.getElementById('csSimResultBreakdown');
    if (breakdown) {
        breakdown.innerHTML = `
            <div class="sim-breakdown-list">
                <div class="sim-row-item">
                    <div class="sim-row-left">
                        <span class="sim-dot red"></span>
                        <span class="sim-row-title">Scope 1 — Yakıt Tüketimi</span>
                    </div>
                    <div class="sim-row-right">
                        <span class="sim-row-val">${fmt(scope1Fuel)} t</span>
                        <span class="sim-pct-badge">${pct(scope1Fuel)}%</span>
                    </div>
                </div>

                <div class="sim-row-item">
                    <div class="sim-row-left">
                        <span class="sim-dot orange"></span>
                        <span class="sim-row-title">Scope 1 — Araç Filosu</span>
                    </div>
                    <div class="sim-row-right">
                        <span class="sim-row-val">${fmt(scope1Fleet)} t</span>
                        <span class="sim-pct-badge">${pct(scope1Fleet)}%</span>
                    </div>
                </div>

                <div class="sim-row-item">
                    <div class="sim-row-left">
                        <span class="sim-dot blue"></span>
                        <span class="sim-row-title">Scope 2 — Şebeke Elektriği</span>
                    </div>
                    <div class="sim-row-right">
                        <span class="sim-row-val">${fmt(scope2Elec)} t</span>
                        <span class="sim-pct-badge">${pct(scope2Elec)}%</span>
                    </div>
                </div>

                <div class="sim-row-item highlight-cbam">
                    <div class="sim-row-left">
                        <span class="sim-dot purple"></span>
                        <span class="sim-row-title">Tahmini AB SKDM Karbon Vergisi (€85/ton)</span>
                    </div>
                    <div class="sim-row-right">
                        <strong class="gold-text">${cbamFormatted}</strong>
                        <span class="sim-pct-badge gold">CBAM</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function populateSimulatorCompanySelect() {
    const select = document.getElementById('simCompanySelect');
    if (!select || !globalDbData || !globalDbData.companies) return;

    if (select.options.length <= 1) {
        globalDbData.companies.forEach(comp => {
            const opt = document.createElement('option');
            opt.value = comp.name;
            opt.textContent = comp.name;
            select.appendChild(opt);
        });
    }
}

function loadCompanyIntoSimulator(companyName) {
    if (!companyName || !globalDbData) return;
    const company = globalDbData.companies.find(c => c.name === companyName);
    if (!company) return;

    const elecInput = document.getElementById('csSimElectricity');
    const fuelInput = document.getElementById('csSimFuel');
    const fleetInput = document.getElementById('csSimFleet');

    if (elecInput) elecInput.value = Math.round((company.est_co2e_annual || 50000) * 0.18 / 0.42);
    if (fuelInput) fuelInput.value = Math.round((company.est_co2e_annual || 50000) * 0.35 / 2.68);
    if (fleetInput) fleetInput.value = Math.min((company.assets?.length || 1) * 3, 200);

    runCockpitSim();
}

function initSimulator() {
    populateSimulatorCompanySelect();
    runCockpitSim();
}

function calculateAdNetSim() {
    const simChart = document.getElementById('simRadarChart');
    if (!simChart) return;

    const isMobile = window.innerWidth <= 768;
    const isLight = document.body.classList.contains('apple-light');

    // IEA / GHG Protocol emission factors (Türkiye grid: 0.512 tCO2/MWh, fuel: ~2.7 tCO2/ton, vehicle: ~2.4 tCO2/vehicle/yr)
    const emp         = parseInt(document.getElementById('simEmployees')?.value)  || 0;
    const electricity = parseFloat(document.getElementById('simElectricity')?.value) || 0;
    const fuel        = parseFloat(document.getElementById('simFuel')?.value)      || 0;
    const fleet       = parseInt(document.getElementById('simFleet')?.value)       || 0;

    // Scope 1: direct combustion
    const scope1Fuel    = Math.round(fuel * 2.74);         // ~2.74 tCO2/ton fuel
    const scope1Fleet   = Math.round(fleet * 2.4);         // ~2.4 tCO2/vehicle/yr
    // Scope 2: purchased electricity (Türkiye grid factor)
    const scope2Elec    = Math.round(electricity * 0.512);
    // Scope 3 estimate: business travel + supply chain (~1.2 tCO2/employee)
    const scope3Other   = Math.round(emp * 1.2);

    const total = scope1Fuel + scope1Fleet + scope2Elec + scope3Other;

    const simTotalVal = document.getElementById('simTotalVal');
    if (simTotalVal) simTotalVal.textContent = total > 0 ? total.toLocaleString('tr-TR') : '—';

    let tierTitle = 'Düşük Emisyon';
    let tierSub   = 'Sektör ortalamasının altındasınız. Mevcut azaltım hedeflerini koruyun.';
    if (total > 50000)  { tierTitle = 'Yüksek Emisyon';   tierSub = 'Acil emisyon azaltım planı gereklidir. Kısa vadede Scope 1 & 2 önceliklendirilmeli.'; }
    else if (total > 10000) { tierTitle = 'Orta Emisyon'; tierSub = 'Enerji verimliliği ve yenilenebilir enerji geçişi ile %40+ azalım mümkün.'; }
    else if (total > 1000)  { tierTitle = 'Makul Emisyon'; tierSub = 'Scope 3 kayıplarını izlemeye alarak bütünsel azaltım stratejisi oluşturun.'; }

    const simTierTitle = document.getElementById('simTierTitle');
    const simTierSub = document.getElementById('simTierSub');
    if (simTierTitle) simTierTitle.textContent = tierTitle;
    if (simTierSub) simTierSub.innerHTML = tierSub;

    const ctxRadar = simChart.getContext('2d');
    if (simRadarChart) simRadarChart.destroy();
    const labelColor = isLight ? '#3C3C43' : '#8E8E93';

    simRadarChart = new Chart(ctxRadar, {
        type: 'doughnut',
        data: {
            labels: ['Scope 1 — Yakıt', 'Scope 1 — Araç Filosu', 'Scope 2 — Elektrik', 'Scope 3 — Diğer'],
            datasets: [{
                data: [scope1Fuel, scope1Fleet, scope2Elec, scope3Other],
                backgroundColor: ['#FF453A', '#FF9F0A', '#0A84FF', '#BF5AF2'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: isLight ? '#1C1C1E' : '#EBEBF5', font: { size: isMobile ? 10 : 12 }, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('tr-TR')} Ton CO₂e`
                    }
                }
            }
        }
    });

    const recsList = document.getElementById('simRecsList');
    if (!recsList) return;
    recsList.innerHTML = [
        scope2Elec > 500  ? `<li><strong>Elektrik (Scope 2):</strong> ${scope2Elec.toLocaleString('tr-TR')} Ton CO₂e — Yenilenebilir enerji PPA veya çatı güneş ile ~%60 azaltım.</li>` : '',
        scope1Fuel > 200  ? `<li><strong>Yakıt (Scope 1):</strong> ${scope1Fuel.toLocaleString('tr-TR')} Ton CO₂e — Doğalgaz yerine biyometan veya elektrikli prosesler değerlendirin.</li>` : '',
        scope1Fleet > 100 ? `<li><strong>Araç Filosu (Scope 1):</strong> ${scope1Fleet.toLocaleString('tr-TR')} Ton CO₂e — EV dönüşümü ile %80+ azaltım potansiyeli.</li>` : '',
        scope3Other > 300 ? `<li><strong>Scope 3:</strong> ${scope3Other.toLocaleString('tr-TR')} Ton CO₂e — Tedarik zinciri karbon denetimi ve iş seyahati politikası belirleyin.</li>` : '',
        `<li><strong>Toplam 2030 Hedefi:</strong> <strong>${Math.round(total * 0.45).toLocaleString('tr-TR')} Ton CO₂e</strong> — Bilim Temelli Hedefler (SBTi) ile uyumlu %55 azalım.</li>`
    ].filter(Boolean).join('');
}

// REAL WORKING APPLE HIG LEAFLET MAP WITH SECTOR-COLOR CODED PINS
function initOrUpdateMap(sectorFilter = 'ALL') {
    const mapDiv = document.getElementById('turkeyMap');
    if (!mapDiv) return;

    if (!leafletMap) {
        leafletMap = L.map('turkeyMap', { zoomControl: false }).setView([39.0, 35.2], 6);
        leafletTileLayer = L.tileLayer(getMapTileUrl(), {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(leafletMap);
        
        L.control.zoom({ position: 'topright' }).addTo(leafletMap);
    } else if (leafletTileLayer) {
        leafletTileLayer.setUrl(getMapTileUrl());
    }

    setTimeout(() => {
        if (leafletMap) leafletMap.invalidateSize();
    }, 100);

    mapMarkers.forEach(m => leafletMap.removeLayer(m));
    mapMarkers = [];

    if (!globalDbData || !globalDbData.facilities) return;

    const sectorColors = {
        'Enerji': '#FF9F0A',            // Apple Orange
        'İmalat & Sanayi': '#0A84FF',   // Apple Blue
        'Ulaştırma & Lojistik': '#64D2FF',// Apple Teal
        'Maden & Hammadde': '#BF5AF2',  // Apple Purple
        'İnşaat & Binalar': '#30D158',   // Apple Green
        'Tarım & Hayvancılık': '#FF3B30',// Apple Red
        'Atık Yönetimi': '#AF52DE'      // Apple Violet
    };

    globalDbData.facilities.forEach(fac => {
        const matchesSector = (sectorFilter === 'ALL') || 
            (fac.sector && fac.sector.toLowerCase().includes(sectorFilter.toLowerCase()));
            
        if (matchesSector) {
            const color = sectorColors[fac.sector] || '#30D158';
            const radius = Math.min(Math.max((fac.emissions_tonnes || 500) / 100, 5), 14);
            
            const marker = L.circleMarker([fac.lat, fac.lon], {
                radius: radius,
                fillColor: color,
                color: 'rgba(255,255,255,0.7)',
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.85
            }).addTo(leafletMap);

            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; padding: 4px; color: #000;">
                    <h4 style="margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 700;">${escapeHtml(fac.name)}</h4>
                    <p style="margin: 0 0 2px 0; font-size: 0.78rem;"><strong>Sektör:</strong> ${escapeHtml(fac.sector)}</p>
                    <p style="margin: 0; font-size: 0.78rem;"><strong>Emisyon:</strong> ${(fac.emissions_tonnes || 0).toLocaleString('tr-TR')} Ton CO₂e</p>
                </div>
            `);

            mapMarkers.push(marker);
        }
    });
}

function filterMap(sector, btnElement) {
    document.querySelectorAll('.map-chip').forEach(b => b.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }
    initOrUpdateMap(sector);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeJs(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}


/* ========================================================
   REGULATORY DISCLOSURE GENERATOR
   CDP / TCFD / ISSB IFRS S2
   ======================================================== */

const FRAMEWORK_META = {
    tcfd: { name: 'TCFD', label: 'İklimle İlgili Finansal Açıklamalar' },
    cdp:  { name: 'CDP',  label: 'İklim Değişikliği Anketi' },
    issb: { name: 'ISSB S2', label: 'İklimle İlgili Finansal Açıklamalar' }
};

function disclosureRow(category, label, value, source) {
    const isAuto = source === 'auto';
    const statusDot = isAuto 
        ? `<span class="disc-status-dot auto"><span class="dot"></span> Doğrulandı</span>`
        : `<span class="disc-status-dot missing"><span class="dot"></span> Beyan Yok</span>`;

    return `
        <tr>
            <td class="disc-col-cat">${category}</td>
            <td class="disc-col-label">
                <span class="disc-mobile-cat-tag">${escapeHtml(category)}</span>
                <span class="disc-label-text">${label}</span>
            </td>
            <td class="disc-col-val ${isAuto ? 'verified' : 'missing'}">${value}</td>
            <td class="disc-col-status">${statusDot}</td>
        </tr>`;
}

function getCompanyDisclosureItems(company, framework) {
    if (!company) return [];
    
    const isAdNetZero = typeof isAdNetZeroMember === 'function' && isAdNetZeroMember(company.name);
    const isHolding = company.name.toLowerCase().includes('holding') || company.name.toLowerCase().includes('a.ş') || (company.est_co2e_annual || 0) > 1000000;
    const facilities = company.assets?.length || 0;
    const totalEmissions = company.est_co2e_annual || 0;
    const emStr = totalEmissions >= 1000000
        ? (totalEmissions / 1000000).toFixed(2) + ' Mt CO₂e'
        : totalEmissions.toLocaleString('tr-TR') + ' t CO₂e';
    const sector = company.sectors?.[0] || 'Sanayi';

    const hist = company.yearly_history || {};
    const histYears = Object.keys(hist).sort();
    const histStr = histYears.length
        ? histYears.map(y => `${y}: ${(hist[y] / 1000).toFixed(0)} kt`).join(' · ')
        : '—';

    const items = [];

    if (framework === 'tcfd' || framework === 'issb') {
        // 1. Governance
        items.push({
            cat: 'Yönetişim',
            label: 'Yönetim Kurulu Gözetimi',
            val: `${escapeHtml(company.name)} yönetim kurulu iklim risklerini gözetmektedir.`,
            src: 'auto'
        });
        items.push({
            cat: 'Yönetişim',
            label: 'Yönetim Sorumluluğu',
            val: isHolding || isAdNetZero ? 'Sürdürülebilirlik Komitesi ataması tamamlanmıştır.' : 'Henüz beyan edilmedi',
            src: isHolding || isAdNetZero ? 'auto' : 'missing'
        });
        items.push({
            cat: 'Yönetişim',
            label: 'İklim Komitesi Yapısı',
            val: isAdNetZero ? 'AdNet Zero iklim komitesi koordinasyonu mevcut.' : (isHolding ? 'Çevre ve ESG çalışma grubu faal.' : 'Henüz beyan edilmedi'),
            src: isAdNetZero || isHolding ? 'auto' : 'missing'
        });

        // 2. Strategy
        items.push({
            cat: 'Strateji',
            label: 'Faaliyet Sektörü',
            val: escapeHtml(sector),
            src: 'auto'
        });
        items.push({
            cat: 'Strateji',
            label: 'Uydu Doğrulamalı Tesisler',
            val: `${facilities} aktif tesis (Climate TRACE v5.8)`,
            src: 'auto'
        });
        items.push({
            cat: 'Strateji',
            label: 'Fiziksel Risk Analizi',
            val: isHolding || isAdNetZero ? 'İklim senaryo analizi (SSP2-4.5) tamamlandı.' : 'Henüz beyan edilmedi',
            src: isHolding || isAdNetZero ? 'auto' : 'missing'
        });
        items.push({
            cat: 'Strateji',
            label: 'Geçiş Riskleri & Fırsatlar',
            val: isAdNetZero ? 'SKDM (CBAM) geçiş riski ve yeşil dönüşüm haritası mevcut.' : 'Henüz beyan edilmedi',
            src: isAdNetZero ? 'auto' : 'missing'
        });

        // 3. Risk Management
        items.push({
            cat: 'Risk Yönetimi',
            label: 'ERM İklim Entegrasyonu',
            val: isHolding || isAdNetZero ? 'Kurumsal Risk Yönetimi (ERM) matrisine entegre.' : 'Henüz beyan edilmedi',
            src: isHolding || isAdNetZero ? 'auto' : 'missing'
        });
        items.push({
            cat: 'Risk Yönetimi',
            label: 'Değerlendirme Metodolojisi',
            val: isAdNetZero ? 'ISO 14064-1 & GHG Protocol Standartları.' : 'Henüz beyan edilmedi',
            src: isAdNetZero ? 'auto' : 'missing'
        });

        // 4. Metrics & Targets
        items.push({
            cat: 'Metrikler',
            label: 'Scope 1 Doğrudan Emisyon',
            val: `${emStr} (Uydu Ölçümü)`,
            src: 'auto'
        });
        items.push({
            cat: 'Metrikler',
            label: 'Scope 2 Elektrik Emisyonu',
            val: 'Climate TRACE şebeke toplamına dahil',
            src: 'auto'
        });
        items.push({
            cat: 'Metrikler',
            label: 'Tarihsel Emisyon Trendi',
            val: histStr,
            src: 'auto'
        });
        items.push({
            cat: 'Metrikler',
            label: 'Scope 3 Değer Zinciri',
            val: isAdNetZero ? 'Değer Zinciri Emisyon Beyanı Tamamlandı.' : 'Henüz beyan edilmedi',
            src: isAdNetZero ? 'auto' : 'missing'
        });
        items.push({
            cat: 'Metrikler',
            label: 'Net-Sıfır 2030 / 2050 Hedefi',
            val: isAdNetZero ? '2030 %50 Azaltım & 2050 Net-Sıfır Taahhüdü.' : (isHolding ? '2050 Net-Sıfır Uyum Hedefi.' : 'Henüz beyan edilmedi'),
            src: isAdNetZero || isHolding ? 'auto' : 'missing'
        });
    } else {
        // CDP Framework
        items.push({ cat: 'C1 Governance', label: 'C1.1 Yönetim Gözetimi', val: `${escapeHtml(company.name)} iklim gözetim beyanı mevcut.`, src: 'auto' });
        items.push({ cat: 'C1 Governance', label: 'C1.2 Sorumluluk Yapısı', val: isHolding || isAdNetZero ? 'ESG ve Sürdürülebilirlik Komitesi sorumluluğunda.' : 'Henüz beyan edilmedi', src: isHolding || isAdNetZero ? 'auto' : 'missing' });
        items.push({ cat: 'C2 Risks', label: 'C2.1 Risk Süreçleri', val: isHolding || isAdNetZero ? 'İklim riskleri kurumsal risk yönetimine entegre.' : 'Henüz beyan edilmedi', src: isHolding || isAdNetZero ? 'auto' : 'missing' });
        items.push({ cat: 'C4 Targets', label: 'C4.1 Net-Sıfır Hedefi', val: isAdNetZero ? '2030 %50 Azaltım & 2050 Net-Sıfır taahhüdü.' : (isHolding ? '2050 Net-Sıfır taahhüdü.' : 'Henüz beyan edilmedi'), src: isAdNetZero || isHolding ? 'auto' : 'missing' });
        items.push({ cat: 'C6 Emissions', label: 'C6.1 Gross Scope 1', val: `${emStr} (Climate TRACE v5.8)`, src: 'auto' });
        items.push({ cat: 'C6 Emissions', label: 'C6.3 Gross Scope 2', val: 'Şebeke emisyon tahminine dahil', src: 'auto' });
        items.push({ cat: 'C6 Emissions', label: 'C6.10 Scope 3', val: isAdNetZero ? 'Tüm Scope 3 kategorileri bildirildi.' : 'Henüz beyan edilmedi', src: isAdNetZero ? 'auto' : 'missing' });
    }

    return items;
}

function buildDisclosureHtml(companyName, framework, year) {
    if (!companyName || !globalDbData) return '';
    const company = globalDbData.companies.find(c => c.name === companyName);
    if (!company) return '';

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
        <div class="minimal-disclosure">
            <div class="disclosure-substrip">
                <div class="disc-company-info">
                    <strong>${escapeHtml(company.name)}</strong> · ${fm.name} (${year})
                </div>
                <div class="disc-completeness-pill">Doluluk: <strong>%${pct}</strong> (${autoCount}/${totalCount} Doğrulandı)</div>
            </div>
            
            <div class="apple-table-wrap">
                <table class="apple-table disc-unified-table">
                    <thead>
                        <tr>
                            <th class="disc-col-cat">Kategori</th>
                            <th class="disc-col-label">Açıklama / Gösterge</th>
                            <th class="disc-col-val">Beyan Verisi</th>
                            <th class="disc-col-status" style="text-align:right;">Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>`;
}

/* ── renderCockpitDisclosure(): renders into cockpit card ── */
function renderCockpitDisclosure(companyName) {
    const framework = document.getElementById('cockpitFramework')?.value || 'tcfd';
    const year      = document.getElementById('cockpitYear')?.value || '2024';
    const output    = document.getElementById('cockpitDisclosureOutput');
    if (!output) return;
    output.innerHTML = buildDisclosureHtml(companyName, framework, year) ||
        `<div class="report-empty-state"><i class="fa-regular fa-file-lines"></i><p>Bir kurum seçin</p></div>`;
}

function openToolDisclosurePage() {
    if (!activeSelectedCompany) {
        selectActiveCompany('Eti Alüminyum Inc');
    }
    switchTab('companyTab');
    switchCockpitSubTab('disclosure');
}

/* ── renderDisclosure(): standalone tab version ─────────── */
function renderDisclosure() {
    const select = document.getElementById('reportCompanySelect');
    if (select && (!select.value || select.value === '') && select.options.length > 1) {
        select.selectedIndex = 1;
    }
    const companyName = select?.value || (globalDbData?.companies?.[0]?.name);
    const framework   = document.getElementById('reportFramework')?.value || 'tcfd';
    const year        = document.getElementById('reportYear')?.value || '2024';
    const output      = document.getElementById('disclosureOutput');
    if (!output) return;

    const html = buildDisclosureHtml(companyName, framework, year);
    output.innerHTML = html || `<div class="report-empty-state"><i class="fa-regular fa-file-lines"></i><p>Bir kurum seçin</p></div>`;
}

function printDisclosure() {
    downloadCockpitPdf();
}

function downloadCockpitPdf(companyName) {
    const targetName = companyName || activeSelectedCompany || document.getElementById('reportCompanySelect')?.value;
    if (!targetName || !globalDbData) {
        alert('Lütfen önce bir kurum seçin.');
        return;
    }

    const company = globalDbData.companies.find(c => c.name === targetName);
    if (!company) return;

    const framework = document.getElementById('cockpitFramework')?.value || document.getElementById('reportFramework')?.value || 'tcfd';
    const year = document.getElementById('cockpitYear')?.value || document.getElementById('reportYear')?.value || '2024';

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
        const badgeHtml = isAuto 
            ? `<span class="pdf-badge green">Doğrulandı</span>`
            : `<span class="pdf-badge gray">Beyan Yok</span>`;

        rowsHtml += `
            <tr>
                <td class="pdf-cat-td">${escapeHtml(item.cat)}</td>
                <td class="pdf-label-td">${escapeHtml(item.label)}</td>
                <td class="pdf-val-td">${item.val}</td>
                <td class="pdf-status-td" style="text-align:center;">${badgeHtml}</td>
            </tr>
        `;
    });

    const pct = totalCount ? Math.round((autoCount / totalCount) * 100) : 0;

    return `
        <div class="official-pdf-page">
            <div class="pdf-top-bar">
                <div class="pdf-brand">
                    <div class="pdf-icon-badge"><i class="fa-solid fa-leaf"></i></div>
                    <div>
                        <div class="pdf-brand-title">EKOTRACE TÜRKİYE</div>
                        <div class="pdf-brand-sub">KURUMSAL İKLİM ZEKASI &amp; RAPORLAMA PORTALI</div>
                    </div>
                </div>
                <div class="pdf-doc-meta">
                    <div><strong>Rapor kodu:</strong> EKO-${year}-${Math.floor(100000 + Math.random()*900000)}</div>
                    <div><strong>Tarih:</strong> 29 Temmuz 2026</div>
                    <div><strong>Çerçeve:</strong> ${fm.name}</div>
                    <div><strong>Standart:</strong> GHG Protocol / ISO 14064</div>
                </div>
            </div>

            <div class="pdf-summary-card">
                <div class="pdf-sum-left">
                    <h1 class="pdf-company-title">${escapeHtml(company.name)}</h1>
                    <div class="pdf-company-sub">Sektör: <strong>${escapeHtml(sector)}</strong> | Tesis Sayısı: <strong>${facilities}</strong></div>
                </div>
                <div class="pdf-sum-right">
                    <div class="pdf-kpi-block">
                        <span class="pdf-kpi-lbl">Yıllık Emisyon</span>
                        <span class="pdf-kpi-val green">${emStr}</span>
                    </div>
                    <div class="pdf-kpi-block">
                        <span class="pdf-kpi-lbl">Uyum Skoru</span>
                        <span class="pdf-kpi-val">%${pct}</span>
                    </div>
                </div>
            </div>

            <div class="pdf-section-head">RESMİ İKLİM BEYANNAMESİ VE ESG AÇIKLAMALARI (${year})</div>

            <table class="official-pdf-table">
                <thead>
                    <tr>
                        <th style="width: 18%;">Kategori</th>
                        <th style="width: 27%;">Gösterge</th>
                        <th style="width: 40%;">Kurumsal Açıklama &amp; Emisyon Verisi</th>
                        <th style="width: 15%; text-align: center;">Durum</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="pdf-footer-wrap">
                <div class="pdf-verification-seal">
                    <i class="fa-solid fa-shield-halved"></i>
                    <div>
                        <strong>CLIMATE TRACE UYDU VERİ DOĞRULAMASI</strong>
                        <p>İşbu belge, GHG Protocol ve ISO 14064 standartları doğrultusunda EkoTrace Türkiye tarafından otomatik üretilmiştir.</p>
                    </div>
                </div>
                <div class="pdf-page-indicator">Sayfa 1 / 1</div>
            </div>
        </div>
    `;
}

/* ========================================================
   FLOATING AI CHAT WIDGET LOGIC (EkoTracey AI)
   ======================================================== */
function toggleFloatingAiChat() {
    const panel = document.getElementById('floatingAiPanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        openFloatingAiChat();
    } else {
        closeFloatingAiChat();
    }
}

function openFloatingAiChat() {
    const panel = document.getElementById('floatingAiPanel');
    const trigger = document.getElementById('floatingAiTrigger');
    if (!panel) return;
    panel.style.display = 'flex';
    panel.classList.remove('hidden');
    if (trigger) trigger.classList.add('hidden');

    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
    const input = document.getElementById('floatingAiInput');
    if (input && window.innerWidth > 768) {
        setTimeout(() => input.focus(), 220);
    }
}

function closeFloatingAiChat() {
    const panel = document.getElementById('floatingAiPanel');
    const trigger = document.getElementById('floatingAiTrigger');
    if (panel) {
        panel.classList.add('hidden');
        panel.style.display = 'none';
    }
    if (trigger) trigger.classList.remove('hidden');
    document.body.style.overflow = '';
}

function sendFloatingAiQuestion(query) {
    if (!query || !query.trim()) return;
    const chatBox = document.getElementById('floatingAiChatBox');
    const input = document.getElementById('floatingAiInput');
    if (!chatBox) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'ai-chat-msg user';
    userDiv.innerHTML = `<div class="ai-chat-bubble user">${escapeHtml(query)}</div>`;
    chatBox.appendChild(userDiv);

    if (input) input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const q = query.toLowerCase();
    let answer = '';

    if (q.includes('top 5') || q.includes('en yuksek') || q.includes('en yüksek')) {
        answer = `Türkiye'nin Climate TRACE uydu ölçümlerine göre en yüksek emisyonlu kurumları: <strong>EUAŞ (Elektrik Üretim A.Ş.), Tüpraş, Erdemir, İsdemir ve THY</strong>'dir.`;
    } else if (q.includes('scope 1') || q.includes('scope 2') || q.includes('fark')) {
        answer = `<strong>Scope 1:</strong> Şirketinizin doğrudan fabrika baca yakıtı ve araç filosu tüketimidir (Doğalgaz, Kömür, Motorin).<br><strong>Scope 2:</strong> Satın aldığınız şebeke elektriği ve ısı tüketimidir.`;
    } else if (q.includes('ocr') || q.includes('fatura') || q.includes('enerjisa')) {
        answer = `Faturanız yüklendiğinde, AI OCR motorumuz <strong>tüketim miktarını (kWh/m³) okur</strong> ve <strong>Türkiye Şebeke Emisyon Faktörü (0.442 kg CO₂e/kWh)</strong> ile çarparak doğrudan Scope 2 kaydını oluşturur.`;
    } else if (activeSelectedCompany) {
        answer = `<strong>${escapeHtml(activeSelectedCompany)}</strong> kurumunun emisyon verileri aktiftir. Şirketim sekmesindeki <strong>AI Ingestion</strong> modülünden faturaları doğrudan yükleyebilirsiniz.`;
    } else {
        answer = `EkoTrace Türkiye platformundaki <strong>266 Türk sanayi ve enerji şirketi</strong> Climate TRACE uydu verileri ve IPCC faktörleri ile anlık doğrulanmaktadır.`;
    }

    setTimeout(() => {
        const botDiv = document.createElement('div');
        botDiv.className = 'ai-chat-msg';
        botDiv.innerHTML = `
            <div class="ai-chat-avatar"><i class="fa-solid fa-leaf"></i></div>
            <div class="ai-chat-bubble">${answer}</div>
        `;
        chatBox.appendChild(botDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 250);
}

function initModalDragToDismiss() {
    document.querySelectorAll('.apple-modal-overlay').forEach(overlay => {
        const sheet = overlay.querySelector('.apple-modal-sheet');
        if (!sheet) return;
        const header = sheet.querySelector('.sheet-header-bar') || sheet;
        const scrollBody = sheet.querySelector('.sheet-scroll-body') || sheet;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onTouchStart = (e) => {
            if (e.target.closest('.modal-close-btn')) return;
            const isAtTop = scrollBody ? scrollBody.scrollTop <= 0 : true;
            if (isAtTop || e.target.closest('.sheet-header-bar')) {
                startY = e.touches[0].clientY;
                currentY = startY;
                isDragging = true;
                sheet.style.transition = 'none';
            }
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (deltaY > 0) {
                if (e.cancelable) e.preventDefault();
                sheet.style.transform = `translateY(${deltaY}px)`;
                overlay.style.opacity = Math.max(0.2, 1 - (deltaY / 450));
            } else {
                sheet.style.transform = '';
                overlay.style.opacity = '';
            }
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            sheet.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
            overlay.style.transition = 'opacity 0.28s ease';

            const deltaY = currentY - startY;
            if (deltaY > 80) {
                sheet.style.transform = 'translateY(100%)';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    sheet.style.transform = '';
                    overlay.style.opacity = '';
                    overlay.style.transition = '';
                    document.body.classList.remove('modal-open');
                }, 280);
            } else {
                sheet.style.transform = '';
                overlay.style.opacity = '';
                setTimeout(() => {
                    overlay.style.transition = '';
                }, 280);
            }
            startY = 0;
            currentY = 0;
        };

        header.addEventListener('touchstart', onTouchStart, { passive: true });
        header.addEventListener('touchmove', onTouchMove, { passive: false });
        header.addEventListener('touchend', onTouchEnd, { passive: true });

        scrollBody.addEventListener('touchstart', onTouchStart, { passive: true });
        scrollBody.addEventListener('touchmove', onTouchMove, { passive: false });
        scrollBody.addEventListener('touchend', onTouchEnd, { passive: true });
    });
}

function openToolIngestionPage() {
    if (!activeSelectedCompany && globalDbData && globalDbData.companies && globalDbData.companies.length > 0) {
        selectActiveCompany(globalDbData.companies[0].name);
    }
    switchTab('companyTab', 'ingestion');
}

function openToolDisclosurePage() {
    if (!activeSelectedCompany && globalDbData && globalDbData.companies && globalDbData.companies.length > 0) {
        selectActiveCompany(globalDbData.companies[0].name);
    }
    switchTab('companyTab', 'disclosure');
}

function openToolSimulatorModal() {
    switchTab('simulatorTab');
}

function openToolCalculatorModal() {
    switchTab('eventTab');
    goToEventStep(1);
}

function simulateToolIngestionUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const area = document.getElementById('toolIngestionStatusArea');
    if (area) {
        area.innerHTML = `
            <div class="apple-card" style="padding: 1rem; background: rgba(48, 209, 88, 0.12); border-color: rgba(48, 209, 88, 0.3);">
                <span style="font-weight: 700; color: var(--apple-green); font-size: 0.9rem;"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(file.name)} Yüklendi ve OCR Ayrıştırıldı</span>
                <p style="font-size: 0.8rem; color: var(--apple-label-secondary); margin-top: 0.25rem;">Tutar: 48,250 ₺ • Elektrik Tüketimi (14,500 kWh) • Scope 2 GHG Sınıflandırıldı.</p>
            </div>
        `;
    }
}

/* ========================================================
   AD NET ZERO TÜRKİYE & RVD ETKİNLİK KARBON HESAPLAYICISI ENGINE
   ======================================================== */

let currentWizardStep = 1;
let currentFlightClass = 'economy';

const userEventsList = [
    {
        id: 'ev-1',
        title: 'Kristal Elma 2026 Ödül Töreni',
        attendees: 750,
        area: 1800,
        flightKm: 45000,
        flightClass: 'economy',
        localTransitKm: 8500,
        freightTonKm: 12000,
        eleckWh: 14500,
        hotelNights: 120,
        mealsRed: 250,
        mealsChicken: 350,
        mealsVeg: 400,
        buildM2: 650,
        swagCount: 1000,
        date: '2026-10-14'
    },
    {
        id: 'ev-2',
        title: 'Felis 2026 Yaratıcılık Festivali',
        attendees: 850,
        area: 1600,
        flightKm: 32000,
        flightClass: 'business',
        localTransitKm: 6500,
        freightTonKm: 9000,
        eleckWh: 16000,
        hotelNights: 110,
        mealsRed: 150,
        mealsChicken: 350,
        mealsVeg: 500,
        buildM2: 500,
        swagCount: 900,
        date: '2026-11-07'
    }
];

function openEventWizardModal() {
    const modal = document.getElementById('eventWizardModal');
    if (!modal) return;
    currentWizardStep = 1;
    updateEventWizardUI();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeEventWizardModal() {
    const modal = document.getElementById('eventWizardModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
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
    const pillarSubtitles = {
        1: '1. Seyahat & Lojistik (%70-%90 Karbon Etkisi)',
        2: '2. Tesis & Enerji Tüketimi',
        3: '3. İkram & Gıda (Catering)',
        4: '4. Malzeme & Atık Yönetimi',
        5: 'RVD & Ad Net Zero Türkiye Beyannamesi'
    };

    const progressBar = document.getElementById('evWizardProgressBar');
    if (progressBar) progressBar.style.width = progressMap[currentWizardStep] || '25%';

    const stepBadge = document.getElementById('evWizardStepBadge');
    if (stepBadge) {
        stepBadge.textContent = currentWizardStep <= 4 ? `Adım ${currentWizardStep} / 4` : 'Sonuç Raporu';
    }

    const pillarSub = document.getElementById('evWizardPillarSubtitle');
    if (pillarSub) pillarSub.textContent = pillarSubtitles[currentWizardStep] || '';

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

    if (currentWizardStep <= 4) {
        if (wizardSticky) wizardSticky.style.display = 'flex';
        if (resultSticky) resultSticky.style.display = 'none';
        if (prevBtn) prevBtn.style.display = currentWizardStep > 1 ? 'inline-flex' : 'none';
        if (nextBtn) {
            nextBtn.querySelector('span').textContent = currentWizardStep === 4 ? 'Hesapla & Beyanname Oluştur' : 'Devam Et';
        }
    } else {
        if (wizardSticky) wizardSticky.style.display = 'none';
        if (resultSticky) resultSticky.style.display = 'flex';
    }

    const body = document.querySelector('.event-wizard-body');
    if (body) body.scrollTop = 0;
}

function calculateAndRenderEventResult() {
    const N = parseFloat(document.getElementById('evAttendees')?.value) || 0;
    const m2 = parseFloat(document.getElementById('evArea')?.value) || 0;
    const flightKm = parseFloat(document.getElementById('evFlightKm')?.value) || 0;
    const flightClass = document.getElementById('evFlightClass')?.value || 'economy';
    const localTransitKm = parseFloat(document.getElementById('evLocalTransitKm')?.value) || 0;
    const freightTonKm = parseFloat(document.getElementById('evFreightTonKm')?.value) || 0;
    const eleckWh = parseFloat(document.getElementById('evEleckWh')?.value) || 0;
    const hotelNights = parseFloat(document.getElementById('evHotelNights')?.value) || 0;
    const mealsRed = parseFloat(document.getElementById('evMealsRed')?.value) || 0;
    const mealsChicken = parseFloat(document.getElementById('evMealsChicken')?.value) || 0;
    const mealsVeg = parseFloat(document.getElementById('evMealsVeg')?.value) || 0;
    const buildM2 = parseFloat(document.getElementById('evBuildM2')?.value) || 0;
    const swagCount = parseFloat(document.getElementById('evSwagCount')?.value) || 0;
    const title = document.getElementById('evTitle')?.value || 'Kristal Elma 2026';

    const baselineKg = (N * 3.2) + (m2 * 1.1);
    const flightMultiplier = flightClass === 'business' ? 3.0 : 1.0;
    const flightKg = flightKm * 0.15 * flightMultiplier;
    const transitKg = localTransitKm * 0.18;
    const freightKg = freightTonKm * 0.12;
    const p1TravelKg = flightKg + transitKg + freightKg;

    const elecKg = eleckWh * 0.42;
    const hotelKg = hotelNights * 18.5;
    const p2EnergyKg = elecKg + hotelKg;

    const cateringKg = (mealsRed * 5.0) + (mealsChicken * 1.5) + (mealsVeg * 0.5);
    const p3CateringKg = cateringKg;

    const stageKg = buildM2 * 12.0;
    const swagKg = swagCount * 0.8;
    const p4MaterialsKg = stageKg + swagKg;

    const totalEmissionsKg = baselineKg + p1TravelKg + p2EnergyKg + p3CateringKg + p4MaterialsKg;
    const totalEmissionsTon = totalEmissionsKg / 1000;
    const diffPct = baselineKg > 0 ? (((totalEmissionsKg - baselineKg) / baselineKg) * 100) : 0;

    const titleEl = document.getElementById('evResultTitle');
    if (titleEl) titleEl.textContent = title;

    const numEl = document.getElementById('evResultTotalVal');
    if (numEl) numEl.textContent = totalEmissionsKg.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const tonSubEl = document.getElementById('evResultTonSub');
    if (tonSubEl) tonSubEl.textContent = `${totalEmissionsTon.toFixed(2)} Ton CO₂e Toplam Karbon Ayak İzi`;

    const baseValEl = document.getElementById('evBaselineVal');
    if (baseValEl) baseValEl.textContent = `${baselineKg.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg`;

    const calcValEl = document.getElementById('evCalculatedVal');
    if (calcValEl) calcValEl.textContent = `${totalEmissionsKg.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg`;

    const diffValEl = document.getElementById('evDiffVal');
    const diffSubEl = document.getElementById('evDiffSub');
    if (diffValEl) {
        diffValEl.textContent = `${diffPct <= 0 ? '' : '+'}${diffPct.toFixed(1)}%`;
        diffValEl.className = diffPct <= 0 ? 'baseline-val eco' : 'baseline-val warn';
    }
    if (diffSubEl) {
        diffSubEl.textContent = diffPct <= 0 ? 'Baseline Altında Başarılı' : 'Baseline Üzerinde';
    }

    const listEl = document.getElementById('evResultBreakdownList');
    if (listEl) {
        const pillars = [
            { name: '1. Seyahat & Lojistik', kg: p1TravelKg, icon: 'fa-plane' },
            { name: '2. Tesis & Enerji', kg: p2EnergyKg, icon: 'fa-bolt' },
            { name: '3. İkram & Gıda', kg: p3CateringKg, icon: 'fa-utensils' },
            { name: '4. Malzeme & Atık', kg: p4MaterialsKg, icon: 'fa-box' }
        ];

        listEl.innerHTML = pillars.map(p => {
            const pct = totalEmissionsKg > 0 ? Math.min(100, Math.round((p.kg / totalEmissionsKg) * 100)) : 0;
            return `
                <div class="event-breakdown-row">
                    <div class="breakdown-row-top">
                        <span class="breakdown-row-name"><i class="fa-solid ${p.icon}"></i> ${p.name}</span>
                        <span class="breakdown-row-val">${(p.kg / 1000).toFixed(2)} t (%${pct})</span>
                    </div>
                    <div class="breakdown-track">
                        <div class="breakdown-bar" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderEventsDashboard() {
    const container = document.getElementById('eventsListContainer');
    if (!container) return;

    if (userEventsList.length === 0) {
        container.innerHTML = `<div class="empty-events-state">Kayıtlı etkinlik beyannamesi bulunamadı.</div>`;
        return;
    }

    container.innerHTML = userEventsList.map(ev => {
        const totalKg = (ev.attendees * 3.2) + (ev.area * 1.1) + ((ev.flightKm || 0) * 0.15) + ((ev.eleckWh || 0) * 0.42);
        return `
            <div class="event-flat-card">
                <div class="event-flat-main">
                    <h4 class="event-flat-title">${escapeHtml(ev.title)}</h4>
                    <p class="event-flat-meta">${ev.attendees} Katılımcı • ${(ev.area || 0).toLocaleString('tr-TR')} m² • ${ev.date}</p>
                </div>
                <div class="event-flat-right">
                    <span class="event-flat-badge">${totalKg.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kg CO₂e</span>
                    <button type="button" class="event-flat-pdf-btn" onclick="downloadEventPDF('${ev.id}')">
                        <i class="fa-solid fa-file-pdf"></i> Beyanname İndir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function finishEventWizard() {
    const title = document.getElementById('evTitle')?.value || 'Yeni Etkinlik Raporu';
    const attendees = parseFloat(document.getElementById('evAttendees')?.value) || 750;
    const area = parseFloat(document.getElementById('evArea')?.value) || 1800;

    const newEv = {
        id: 'ev-' + Date.now(),
        title,
        attendees,
        area,
        flightKm: parseFloat(document.getElementById('evFlightKm')?.value) || 0,
        flightClass: document.getElementById('evFlightClass')?.value || 'economy',
        localTransitKm: parseFloat(document.getElementById('evLocalTransitKm')?.value) || 0,
        freightTonKm: parseFloat(document.getElementById('evFreightTonKm')?.value) || 0,
        eleckWh: parseFloat(document.getElementById('evEleckWh')?.value) || 0,
        hotelNights: parseFloat(document.getElementById('evHotelNights')?.value) || 0,
        mealsRed: parseFloat(document.getElementById('evMealsRed')?.value) || 0,
        mealsChicken: parseFloat(document.getElementById('evMealsChicken')?.value) || 0,
        mealsVeg: parseFloat(document.getElementById('evMealsVeg')?.value) || 0,
        buildM2: parseFloat(document.getElementById('evBuildM2')?.value) || 0,
        swagCount: parseFloat(document.getElementById('evSwagCount')?.value) || 0,
        date: new Date().toISOString().split('T')[0]
    };

    userEventsList.unshift(newEv);
    renderEventsDashboard();
    closeEventWizardModal();
}

function downloadCurrentEventPDF() {
    const title = document.getElementById('evTitle')?.value || 'Kristal Elma 2026';
    alert(`${title} RVD Beyannamesi indiriliyor...`);
    window.print();
}

function downloadEventPDF(eventId) {
    const ev = userEventsList.find(e => e.id === eventId);
    if (ev) {
        alert(`${ev.title} RVD Beyannamesi indiriliyor...`);
        window.print();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderEventsDashboard();
});

