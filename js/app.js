// ====== STATE ======
let currentMode = 'grinding';
const DB_STORAGE_KEY = 'staysharp_database';
const DB_CACHE_SCHEMA_VERSION = 1;

// Storage wrapper: keeps app working when localStorage is restricted (private mode / strict policies).
const memoryStore = {};
let storageFallbackLogged = false;

function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        if (!storageFallbackLogged) {
            console.warn('localStorage unavailable, using in-memory fallback.');
            storageFallbackLogged = true;
        }
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }
}

function safeSetItem(key, value) {
    const stringValue = String(value);
    try {
        localStorage.setItem(key, stringValue);
    } catch (e) {
        if (!storageFallbackLogged) {
            console.warn('localStorage unavailable, using in-memory fallback.');
            storageFallbackLogged = true;
        }
        memoryStore[key] = stringValue;
    }
}

function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        delete memoryStore[key];
    }
}

function showTransientNotice(message, type = 'info') {
    const existing = document.getElementById('runtime-notice');
    if (existing) existing.remove();

    const notice = document.createElement('div');
    notice.id = 'runtime-notice';
    notice.textContent = message;
    notice.style.position = 'fixed';
    notice.style.right = '16px';
    notice.style.bottom = '16px';
    notice.style.maxWidth = '320px';
    notice.style.padding = '10px 12px';
    notice.style.borderRadius = '10px';
    notice.style.fontSize = '13px';
    notice.style.lineHeight = '1.4';
    notice.style.zIndex = '10001';
    notice.style.border = '1px solid rgba(255,255,255,0.18)';
    notice.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    notice.style.background = type === 'warn' ? 'rgba(251, 191, 36, 0.17)' : 'rgba(16, 20, 30, 0.92)';
    notice.style.color = '#e8eaf0';
    document.body.appendChild(notice);

    setTimeout(() => {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity 0.25s ease';
        setTimeout(() => notice.remove(), 300);
    }, 4200);
}

function toText(value) {
    return value === null || value === undefined ? "" : String(value);
}

function normalizeKnifeRecord(input = {}) {
    return {
        brand: toText(input.brand).trim(),
        series: toText(input.series).trim(),
        steel: toText(input.steel).trim(),
        carbon: toText(input.carbon ?? ""),
        CrMoV: toText(input.CrMoV ?? input.crmov ?? ""),
        length: toText(input.length ?? ""),
        width: toText(input.width ?? ""),
        angle: toText(input.angle ?? ""),
        honing_add: toText(input.honing_add ?? ""),
        comments: toText(input.comments).trim(),
        category: toText(input.category || "custom")
    };
}

function sanitizeKnivesArray(items) {
    if (!Array.isArray(items)) return [];
    return items
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(normalizeKnifeRecord);
}

function normalizeHistoryRecord(input = {}) {
    return {
        id: toText(input.id ?? input.ID).trim(),
        date: normalizeHistoryDateValue(input.date ?? input.Date),
        updatedAt: toText(input.updatedAt ?? input.UpdatedAt ?? input["Updated At"] ?? input.updated_at),
        brand: toText(input.brand ?? input.Brand).trim(),
        series: toText(input.series ?? input.Series).trim(),
        steel: toText(input.steel ?? input.Steel).trim(),
        carbon: toText(input.carbon ?? input["C, %"]),
        crmov: toText(input.crmov ?? input["CrMoV, %"]),
        length: toText(input.length ?? input.Length),
        width: toText(input.width ?? input.Width),
        angle: toText(input.angle ?? input["Sharp. angle (double)"]),
        honingAdd: toText(input.honingAdd ?? input["Honing add"]),
        bess: toText(input.bess ?? input["BESS g"]),
        comments: toText(input.comments ?? input.Comments).trim()
    };
}

function sanitizeHistoryArray(items) {
    if (!Array.isArray(items)) return [];
    return items
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))
        .map(normalizeHistoryRecord)
        .filter(item => item.id || item.brand);
}

function parseRecordTimestamp(record) {
    if (!record || typeof record !== 'object') return 0;
    const updatedAt = toText(record.updatedAt).trim();
    if (updatedAt) {
        const isoTs = Date.parse(updatedAt);
        if (!isNaN(isoTs)) return isoTs;
    }

    const dateVal = toText(record.date).trim().replace(',', '');
    if (!dateVal) return 0;
    const nativeTs = Date.parse(dateVal);
    if (!isNaN(nativeTs)) return nativeTs;

    const ruMatch = dateVal.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!ruMatch) return 0;

    const day = Number(ruMatch[1]);
    const month = Number(ruMatch[2]) - 1;
    const year = Number(ruMatch[3]);
    const hh = Number(ruMatch[4] || 0);
    const mm = Number(ruMatch[5] || 0);
    const ss = Number(ruMatch[6] || 0);
    return new Date(year, month, day, hh, mm, ss).getTime();
}

function normalizeHistoryDateValue(value) {
    const raw = toText(value).trim();
    if (!raw) return '';

    const ruMatch = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ruMatch) {
        // Keep manual date-only values intact; normalize time format when present.
        if (!ruMatch[4]) return `${ruMatch[1]}.${ruMatch[2]}.${ruMatch[3]}`;
        const ss = ruMatch[6] || '00';
        return `${ruMatch[1]}.${ruMatch[2]}.${ruMatch[3]} ${ruMatch[4]}:${ruMatch[5]}:${ss}`;
    }

    const nativeTs = Date.parse(raw);
    if (!isNaN(nativeTs)) {
        return new Date(nativeTs).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    return raw;
}

function touchHistoryRecord(record, keepDate = false) {
    const normalized = normalizeHistoryRecord(record || {});
    const now = new Date();
    normalized.updatedAt = now.toISOString();
    if (!keepDate || !toText(normalized.date).trim()) {
        normalized.date = now.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    return normalized;
}

function writeDatabaseCache(knives) {
    const payload = {
        schemaVersion: DB_CACHE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        data: sanitizeKnivesArray(knives)
    };
    safeSetItem(DB_STORAGE_KEY, JSON.stringify(payload));
}

function resolveInitialDatabase() {
    const fallback = (typeof allKnives !== 'undefined' && Array.isArray(allKnives))
        ? sanitizeKnivesArray(allKnives)
        : [];
    const raw = safeGetItem(DB_STORAGE_KEY);
    if (!raw) {
        if (fallback.length > 0) writeDatabaseCache(fallback);
        return fallback;
    }

    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        safeRemoveItem(DB_STORAGE_KEY);
        showTransientNotice('Локальный кэш базы поврежден и автоматически сброшен.', 'warn');
        if (fallback.length > 0) writeDatabaseCache(fallback);
        return fallback;
    }

    if (Array.isArray(parsed)) {
        const migrated = sanitizeKnivesArray(parsed);
        writeDatabaseCache(migrated);
        return migrated;
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
        const data = sanitizeKnivesArray(parsed.data);
        if (parsed.schemaVersion !== DB_CACHE_SCHEMA_VERSION) {
            writeDatabaseCache(data);
        }
        return data;
    }

    safeRemoveItem(DB_STORAGE_KEY);
    showTransientNotice('Локальный кэш базы поврежден и автоматически сброшен.', 'warn');
    if (fallback.length > 0) writeDatabaseCache(fallback);
    return fallback;
}

window.allKnives = resolveInitialDatabase();

function getKnivesArray() {
    return sanitizeKnivesArray(window.allKnives);
}

// DOM Elements
const navLinksContainer = document.getElementById('nav-links');
const views = document.querySelectorAll('.view');
const modeTabs = document.querySelectorAll('.tab-btn');

const grindingGroup = document.getElementById('grinding-group');
const honingGroup = document.getElementById('honing-group');
const resultLabel = document.getElementById('result-label');
const resultValue = document.getElementById('result-value');

// Inputs
const inputKj = document.getElementById('input-kj');
const inputGa = document.getElementById('input-ga');
const inputRw = document.getElementById('input-rw');
const rwInputGroup = document.getElementById('rw-input-group');
const rwSlotGrinding = document.getElementById('rw-slot-grinding');
const rwSlotHoning = document.getElementById('rw-slot-honing');
// Grinding
const inputC1 = document.getElementById('input-c1');
const inputC2 = document.getElementById('input-c2');
// Honing
const inputHoningAdd = document.getElementById('input-honing-add');
const inputFvbS = document.getElementById('input-fvb-s');
const inputC3C4 = document.getElementById('input-c3-c4');
const inputC5C6 = document.getElementById('input-c5-c6');
const calculatorForm = document.getElementById('calculator-form');

function placeRwInputForMode(mode) {
    if (!rwInputGroup || !rwSlotGrinding || !rwSlotHoning) return;
    const target = mode === 'honing' ? rwSlotHoning : rwSlotGrinding;
    if (rwInputGroup.parentElement !== target) {
        target.appendChild(rwInputGroup);
    }
    rwSlotGrinding.classList.toggle('slot-collapsed', mode === 'honing');
    rwSlotHoning.classList.toggle('slot-collapsed', mode !== 'honing');
    if (calculatorForm) {
        calculatorForm.classList.toggle('mode-honing', mode === 'honing');
    }
}

// ====== SIDEBAR TOGGLE ======
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
    sidebar.classList.remove('collapsed');
    sidebarToggle.classList.add('active');
    sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
    sidebar.classList.add('collapsed');
    sidebarToggle.classList.remove('active');
    sidebarOverlay.classList.add('hidden');
}

sidebarToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('collapsed')) {
        openSidebar();
    } else {
        closeSidebar();
    }
});

sidebarOverlay.addEventListener('click', closeSidebar);

// Auto-close sidebar when mouse leaves its area (desktop)
let sidebarLeaveTimer = null;
sidebar.addEventListener('mouseleave', () => {
    // Don't auto-close during drag-and-drop
    if (draggedItem) return;
    if (!sidebar.classList.contains('collapsed')) {
        sidebarLeaveTimer = setTimeout(() => {
            closeSidebar();
        }, 400);
    }
});
sidebar.addEventListener('mouseenter', () => {
    if (sidebarLeaveTimer) {
        clearTimeout(sidebarLeaveTimer);
        sidebarLeaveTimer = null;
    }
});

// Auto-close sidebar on mobile after navigation
function isMobile() {
    return window.innerWidth <= 768;
}

// ====== TAB ORDER PERSISTENCE ======
const TAB_ORDER_KEY = 'staysharp_tab_order';

function saveTabOrder() {
    const items = navLinksContainer.querySelectorAll('li');
    const order = Array.from(items).map(li => li.getAttribute('data-target'));
    safeSetItem(TAB_ORDER_KEY, JSON.stringify(order));
}

function restoreTabOrder() {
    const saved = safeGetItem(TAB_ORDER_KEY);
    if (!saved) return;

    try {
        const order = JSON.parse(saved);
        const items = navLinksContainer.querySelectorAll('li');
        const map = {};
        items.forEach(li => { map[li.getAttribute('data-target')] = li; });

        order.forEach(target => {
            if (map[target]) {
                navLinksContainer.appendChild(map[target]);
            }
        });
    } catch (e) {
        // Ignore corrupt data
    }
}

restoreTabOrder();

// ====== DRAG AND DROP TABS (Pointer Events) ======
let draggedItem = null;
let isDragging = false;
let dragStartY = 0;

function initDragAndDrop() {
    const navItems = navLinksContainer.querySelectorAll('li');

    navItems.forEach(item => {
        // Remove HTML5 draggable to avoid conflicts
        item.removeAttribute('draggable');

        const handle = item.querySelector('.drag-handle');
        if (!handle) return;

        // Pointer down on drag handle starts drag
        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            draggedItem = item;
            dragStartY = e.clientY;
            isDragging = false;
            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!draggedItem || draggedItem !== item) return;

            // Activate drag after 5px movement
            if (!isDragging && Math.abs(e.clientY - dragStartY) > 5) {
                isDragging = true;
                item.classList.add('dragging');
            }

            if (!isDragging) return;

            // Release capture temporarily to find element under pointer
            handle.releasePointerCapture(e.pointerId);
            const targetEl = document.elementFromPoint(e.clientX, e.clientY);
            handle.setPointerCapture(e.pointerId);

            const targetItem = targetEl ? targetEl.closest('.nav-links li') : null;

            navLinksContainer.querySelectorAll('li').forEach(li => li.classList.remove('drag-over'));
            if (targetItem && targetItem !== draggedItem) {
                targetItem.classList.add('drag-over');
            }
        });

        handle.addEventListener('pointerup', (e) => {
            if (!draggedItem || draggedItem !== item) return;

            if (isDragging) {
                // Release capture to find target
                try { handle.releasePointerCapture(e.pointerId); } catch (ex) { }
                const targetEl = document.elementFromPoint(e.clientX, e.clientY);
                const targetItem = targetEl ? targetEl.closest('.nav-links li') : null;

                if (targetItem && targetItem !== draggedItem) {
                    const items = Array.from(navLinksContainer.querySelectorAll('li'));
                    const dragIdx = items.indexOf(draggedItem);
                    const dropIdx = items.indexOf(targetItem);

                    if (dragIdx < dropIdx) {
                        navLinksContainer.insertBefore(draggedItem, targetItem.nextSibling);
                    } else {
                        navLinksContainer.insertBefore(draggedItem, targetItem);
                    }
                    saveTabOrder();
                    bindNavigation();
                }
            }

            item.classList.remove('dragging');
            navLinksContainer.querySelectorAll('li').forEach(li => li.classList.remove('drag-over'));
            draggedItem = null;
            isDragging = false;
        });

        handle.addEventListener('pointercancel', () => {
            item.classList.remove('dragging');
            navLinksContainer.querySelectorAll('li').forEach(li => li.classList.remove('drag-over'));
            draggedItem = null;
            isDragging = false;
        });
    });
}

initDragAndDrop();

// ====== NAVIGATION ======
function bindNavigation() {
    const navLinks = navLinksContainer.querySelectorAll('li');
    navLinks.forEach(link => {
        // Remove old listeners by cloning (only needed on re-init)
        link.addEventListener('click', (e) => {
            // Don't navigate when clicking drag handle
            if (e.target.closest('.drag-handle')) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');

            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
            });
            document.getElementById(targetId).classList.add('active');
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'db-view') {
                renderDatabase(); // refresh if needed
            }

            // Auto-close sidebar after navigation
            closeSidebar();
        });
    });
}

bindNavigation();

// ====== MODE SWITCH ======
modeTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        modeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        currentMode = tab.getAttribute('data-type');
        placeRwInputForMode(currentMode);
        if (currentMode === 'grinding') {
            grindingGroup.classList.remove('hidden');
            honingGroup.classList.add('hidden');
            resultLabel.textContent = 'USH';
        } else {
            honingGroup.classList.remove('hidden');
            grindingGroup.classList.add('hidden');
            resultLabel.textContent = 'FVB_H';
        }
        calculateLive();
    });
});

// ====== MATH LOGIC ======
placeRwInputForMode(currentMode);

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

function calculateLive() {
    const KJ = parseFloat(inputKj.value) || 0;
    const GA = parseFloat(inputGa.value) || 0;
    const RW = parseFloat(inputRw.value) || 0;

    let result = 0;

    if (currentMode === 'grinding') {
        const C1 = parseFloat(inputC1.value) || 50.0;
        const C2 = parseFloat(inputC2.value) || 28.6;

        const AC = Math.sqrt(Math.pow(KJ - 6, 2) + Math.pow(11.9, 2));
        const BAC = Math.atan(11.9 / (KJ - 6));
        const DC = Math.sqrt(
            Math.pow(RW, 2) + Math.pow(AC, 2) -
            2 * RW * AC * Math.cos(toRadians(90 + GA) - BAC)
        );
        const EC = Math.sqrt(Math.pow(DC, 2) - Math.pow(C1, 2));
        result = EC - C2 + 6;

    } else {
        const honingAdd = parseFloat(inputHoningAdd.value) || 0;
        const FVB_S = parseFloat(inputFvbS.value) || 0;
        const C3_C4 = parseFloat(inputC3C4.value) || 128.1;
        const C5_C6 = parseFloat(inputC5C6.value) || 51.4;

        const AC = Math.sqrt(Math.pow(KJ - 6, 2) + Math.pow(11.9, 2));
        const BAC = Math.atan(11.9 / (KJ - 6));
        const DC = Math.sqrt(
            Math.pow(RW, 2) + Math.pow(AC, 2) -
            2 * RW * AC * Math.cos(toRadians(90 + GA + honingAdd) - BAC)
        );
        const FC = Math.sqrt(Math.pow(DC, 2) - Math.pow(C3_C4 + FVB_S, 2));
        result = FC - C5_C6 + 6;
    }

    if (isNaN(result)) result = 0;
    resultValue.textContent = result.toFixed(2);

    // Auto-update angles in save form based on calculator
    const recordAngle = document.getElementById('record-angle');
    if (recordAngle) {
        recordAngle.value = (GA * 2).toFixed(1);
    }

    const recordHoningAdd = document.getElementById('record-honing-add');
    if (recordHoningAdd) {
        const hAdd = parseFloat(inputHoningAdd.value);
        if (!isNaN(hAdd)) {
            recordHoningAdd.value = hAdd.toFixed(1);
        }
    }
}

// Bind live updates
const inputs = [inputKj, inputGa, inputRw, inputC1, inputC2, inputHoningAdd, inputFvbS, inputC3C4, inputC5C6];
inputs.forEach(input => {
    input.addEventListener('input', calculateLive);
});

// Initial calculate
calculateLive();

// ====== CLOUD SYNC ======
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzaKD0e3RrcBfnb7fFpDEEbvgd_CIDzABkymBQzCgSZn6Z66ZLw-R9sXz0m9YrIbFPw/exec';
const API_TOKEN = 'StaySharp_Secure_Token_2026'; // Секретный токен для базовой защиты
const CLOUD_OUTBOX_KEY = 'staysharp_cloud_outbox';
const CLOUD_HISTORY_META_KEY = 'staysharp_cloud_history_meta';
const HISTORY_DELETED_IDS_KEY = 'staysharp_deleted_ids';
const HISTORY_DELETED_IDS_TTL_MS = 1000 * 60 * 60 * 24 * 45; // 45 days
const CLOUD_PUSH_INTERVAL_MS = 7000;
const CLOUD_PULL_INTERVAL_MS = 30000;
let cloudQueueFlushPromise = null;
let cloudPushIntervalId = null;
let cloudPullIntervalId = null;

function getCloudOutbox() {
    const raw = safeGetItem(CLOUD_OUTBOX_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    safeSetItem(CLOUD_OUTBOX_KEY, JSON.stringify([]));
    return [];
}

function setCloudOutbox(items) {
    safeSetItem(CLOUD_OUTBOX_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}

function getCloudHistoryMeta() {
    const raw = safeGetItem(CLOUD_HISTORY_META_KEY);
    if (!raw) return { initialized: false, cloudIds: [], updatedAt: '' };
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return {
                initialized: !!parsed.initialized,
                cloudIds: Array.isArray(parsed.cloudIds) ? parsed.cloudIds.map(id => toText(id).trim()).filter(Boolean) : [],
                updatedAt: toText(parsed.updatedAt)
            };
        }
    } catch (e) { }
    return { initialized: false, cloudIds: [], updatedAt: '' };
}

function setCloudHistoryMeta(meta) {
    const normalized = {
        initialized: !!meta?.initialized,
        cloudIds: Array.isArray(meta?.cloudIds) ? meta.cloudIds.map(id => toText(id).trim()).filter(Boolean) : [],
        updatedAt: toText(meta?.updatedAt || new Date().toISOString())
    };
    safeSetItem(CLOUD_HISTORY_META_KEY, JSON.stringify(normalized));
}

function getDeletedIdsMap() {
    const raw = safeGetItem(HISTORY_DELETED_IDS_KEY);
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) { }
    safeSetItem(HISTORY_DELETED_IDS_KEY, JSON.stringify({}));
    return {};
}

function setDeletedIdsMap(map) {
    const normalized = {};
    if (map && typeof map === 'object') {
        Object.keys(map).forEach((id) => {
            const cleanId = toText(id).trim();
            if (!cleanId) return;
            normalized[cleanId] = toText(map[id]);
        });
    }
    safeSetItem(HISTORY_DELETED_IDS_KEY, JSON.stringify(normalized));
}

function pruneDeletedIdsMap(inputMap) {
    const map = (inputMap && typeof inputMap === 'object') ? { ...inputMap } : {};
    const now = Date.now();
    Object.keys(map).forEach((id) => {
        const ts = Date.parse(toText(map[id]));
        if (isNaN(ts) || now - ts > HISTORY_DELETED_IDS_TTL_MS) {
            delete map[id];
        }
    });
    return map;
}

function rememberDeletedId(id, deletedAt = new Date().toISOString()) {
    const cleanId = toText(id).trim();
    if (!cleanId) return;
    const map = pruneDeletedIdsMap(getDeletedIdsMap());
    map[cleanId] = toText(deletedAt);
    setDeletedIdsMap(map);
}

function clearDeletedId(id) {
    const cleanId = toText(id).trim();
    if (!cleanId) return;
    const map = pruneDeletedIdsMap(getDeletedIdsMap());
    if (Object.prototype.hasOwnProperty.call(map, cleanId)) {
        delete map[cleanId];
        setDeletedIdsMap(map);
    }
}

function getPendingHistoryOpsById() {
    const ops = getCloudOutbox();
    const byId = new Map();
    ops.forEach((op) => {
        const sheetName = toText(op?.sheetName || 'History');
        const action = toText(op?.action);
        const id = toText(op?.record?.id).trim();
        if (!id || sheetName !== 'History') return;
        byId.set(id, { action });
    });
    return byId;
}

function mergeCloudOps(prevOp, nextOp) {
    if (!prevOp) return nextOp;
    if (nextOp.action === 'delete') return nextOp;
    if (prevOp.action === 'add' && nextOp.action === 'update') {
        return { ...nextOp, action: 'add' };
    }
    if (prevOp.action === 'delete' && (nextOp.action === 'add' || nextOp.action === 'update')) {
        return { ...nextOp, action: 'add' };
    }
    return nextOp;
}

function compactCloudOutbox(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const compacted = [];
    const keyToIndex = new Map();

    items.forEach((op) => {
        if (!op || typeof op !== 'object') return;
        const action = toText(op.action);
        const sheetName = toText(op.sheetName || 'History');
        const record = (op.record && typeof op.record === 'object') ? op.record : {};
        const recordId = toText(record.id).trim();

        if (!action || !sheetName) return;
        if ((action === 'add' || action === 'update' || action === 'delete') && !recordId) return;

        const normalizedOp = {
            action,
            sheetName,
            record: action === 'delete' ? { id: recordId } : normalizeHistoryRecord(record),
            queuedAt: toText(op.queuedAt) || new Date().toISOString()
        };

        const key = `${sheetName}:${recordId}`;
        const existingIdx = keyToIndex.get(key);
        if (existingIdx === undefined) {
            keyToIndex.set(key, compacted.length);
            compacted.push(normalizedOp);
            return;
        }

        compacted[existingIdx] = mergeCloudOps(compacted[existingIdx], normalizedOp);
    });

    return compacted;
}

function enqueueCloudOperation(record, sheetName = "History", action = "add") {
    const normalizedRecord = action === 'delete'
        ? { id: toText(record?.id).trim() }
        : normalizeHistoryRecord(record || {});
    if (!normalizedRecord.id) return;

    const outbox = getCloudOutbox();
    outbox.push({
        action,
        sheetName,
        record: normalizedRecord,
        queuedAt: new Date().toISOString()
    });
    setCloudOutbox(compactCloudOutbox(outbox));
}

async function pushToCloud(record, sheetName = "History", action = "add") {
    const normalizedRecord = action === 'delete'
        ? { id: toText(record?.id).trim() }
        : normalizeHistoryRecord(record || {});
    if (!normalizedRecord.id) throw new Error('Missing record id for cloud sync');

    // Apps Script expects JSON in e.postData.contents.
    // text/plain avoids CORS preflight while preserving a JSON body.
    const payload = {
        token: API_TOKEN,
        sheet: sheetName,
        action,
        record: normalizedRecord
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
        cache: 'no-store'
    });

    const responseText = (await response.text()).trim();
    if (!response.ok) throw new Error(`Cloud HTTP ${response.status}`);
    if (/^Success/i.test(responseText)) return true;
    if (/Unauthorized/i.test(responseText)) throw new Error('Cloud unauthorized token');
    if (/^Error/i.test(responseText)) throw new Error(responseText);

    if (!responseText || responseText === 'null') return true;
    try {
        const parsed = JSON.parse(responseText);
        if (parsed && (parsed.ok || parsed.success)) return true;
        if (parsed && parsed.error) throw new Error(parsed.error);
    } catch (e) { }
    throw new Error(`Unexpected cloud response: ${responseText.slice(0, 120)}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCloudHistoryRecords() {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?token=${API_TOKEN}&sheet=History&_t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Cloud History HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.error) throw new Error('Cloud History returned invalid payload');
    return sanitizeHistoryArray(data);
}

async function confirmHistoryOperation(op, attempts = 3) {
    if (!op || !op.record || !op.record.id) return false;
    const id = toText(op.record.id).trim();
    if (!id) return false;

    for (let i = 0; i < attempts; i += 1) {
        const cloudHistory = await fetchCloudHistoryRecords();
        const exists = cloudHistory.some(item => item.id === id);
        if (op.action === 'delete') {
            if (!exists) return true;
        } else if (exists) {
            return true;
        }
        await sleep(500);
    }

    return false;
}

async function flushCloudOutbox() {
    if (cloudQueueFlushPromise) return cloudQueueFlushPromise;
    cloudQueueFlushPromise = (async () => {
        const queue = getCloudOutbox();
        if (queue.length === 0) return { sent: 0, failed: 0 };

        const failed = [];
        let sent = 0;
        for (const op of queue) {
            try {
                await pushToCloud(op.record, op.sheetName, op.action);
                if (op.sheetName === 'History') {
                    const confirmed = await confirmHistoryOperation(op);
                    if (!confirmed) {
                        throw new Error('Cloud did not confirm this operation');
                    }
                }
                sent += 1;
            } catch (e) {
                failed.push(op);
                console.warn('Cloud op failed, will retry:', op.action, op.record?.id, e.message);
            }
        }

        setCloudOutbox(compactCloudOutbox(failed));
        return { sent, failed: failed.length };
    })();

    try {
        return await cloudQueueFlushPromise;
    } finally {
        cloudQueueFlushPromise = null;
    }
}

function mergeHistoryRecords(localHistory, cloudHistory, deletedIdsMap = {}) {
    const local = sanitizeHistoryArray(localHistory);
    const cloud = sanitizeHistoryArray(cloudHistory);
    const merged = local.slice();
    const indexById = new Map();
    const seenNoId = new Set();

    merged.forEach((item, index) => {
        if (item.id) {
            indexById.set(item.id, index);
            return;
        }
        const fp = `${item.date}|${item.brand}|${item.series}|${item.steel}|${item.angle}|${item.comments}`;
        seenNoId.add(fp);
    });

    cloud.forEach((item) => {
        if (item.id) {
            const deletedAtRaw = toText(deletedIdsMap[item.id]);
            if (deletedAtRaw) {
                const deletedAtTs = Date.parse(deletedAtRaw);
                const itemTs = parseRecordTimestamp(item);
                if (!isNaN(deletedAtTs) && itemTs > 0 && itemTs <= deletedAtTs) {
                    return;
                }
            }

            const existingIdx = indexById.get(item.id);
            if (existingIdx === undefined) {
                indexById.set(item.id, merged.length);
                merged.push(item);
                return;
            }

            const current = merged[existingIdx];
            const localTs = parseRecordTimestamp(current);
            const cloudTs = parseRecordTimestamp(item);

            if (cloudTs > localTs) {
                merged[existingIdx] = item;
                return;
            }

            if (localTs > cloudTs) {
                merged[existingIdx] = current;
                return;
            }

            // If timestamps are equal/unknown, keep local non-empty values.
            const fallback = { ...item };
            Object.keys(current).forEach((key) => {
                if (toText(current[key]).trim() !== '') fallback[key] = current[key];
            });
            merged[existingIdx] = fallback;
            return;
        }

        const fp = `${item.date}|${item.brand}|${item.series}|${item.steel}|${item.angle}|${item.comments}`;
        if (!seenNoId.has(fp)) {
            seenNoId.add(fp);
            merged.push(item);
        }
    });

    return sanitizeHistoryArray(merged);
}

function applyCloudDeletionDiff(localRecords, prevCloudIds, currentCloudIds, pendingOpsById) {
    if (!(prevCloudIds instanceof Set) || !(currentCloudIds instanceof Set)) {
        return { records: localRecords, deletedIds: [] };
    }

    // Safety: if cloud suddenly became empty, skip mass deletion to avoid destructive false positives.
    if (prevCloudIds.size > 0 && currentCloudIds.size === 0) {
        return { records: localRecords, deletedIds: [] };
    }

    const deletedIds = [];
    const records = localRecords.filter((item) => {
        const id = toText(item?.id).trim();
        if (!id) return true;
        if (!prevCloudIds.has(id) || currentCloudIds.has(id)) return true;

        const pending = pendingOpsById.get(id);
        if (!pending) {
            deletedIds.push(id);
            return false;
        }

        // Keep local record if there is a pending local add/update not yet pushed.
        if (pending.action === 'add' || pending.action === 'update') return true;

        deletedIds.push(id);
        return false;
    });

    return { records, deletedIds };
}

// Fetches History from cloud and merges it with local (never blindly overwrites local state).
async function syncHistoryFromCloud(showUI = true) {
    const syncBtn = document.getElementById('btn-sync');
    if (showUI && syncBtn) {
        syncBtn.textContent = '⏳ Синхронизация...';
        syncBtn.disabled = true;
        syncBtn.style.opacity = '0.7';
    }

    let success = false;
    try {
        await flushCloudOutbox();
        const localHistory = getHistory();
        const cloudHistory = await fetchCloudHistoryRecords();
        const cloudMeta = getCloudHistoryMeta();
        let deletedIdsMap = pruneDeletedIdsMap(getDeletedIdsMap());
        const currentCloudIds = new Set(cloudHistory.map(item => toText(item.id).trim()).filter(Boolean));

        let mergedHistory = mergeHistoryRecords(localHistory, cloudHistory, deletedIdsMap);

        if (cloudMeta.initialized) {
            const prevCloudIds = new Set((cloudMeta.cloudIds || []).map(id => toText(id).trim()).filter(Boolean));
            const pendingOpsById = getPendingHistoryOpsById();
            const deletionDelta = applyCloudDeletionDiff(mergedHistory, prevCloudIds, currentCloudIds, pendingOpsById);
            mergedHistory = deletionDelta.records;
            deletionDelta.deletedIds.forEach((id) => {
                deletedIdsMap[id] = new Date().toISOString();
            });

            if (showUI && deletionDelta.deletedIds.length > 0) {
                showTransientNotice(`Из облака применено удалений: ${deletionDelta.deletedIds.length}.`, 'warn');
            }

            if (showUI && prevCloudIds.size > 0 && currentCloudIds.size === 0) {
                showTransientNotice('Облако вернуло пустой журнал: массовое удаление локальных записей пропущено для защиты данных.', 'warn');
            }
        }

        // If a newer cloud record reappears, clear local deletion tombstone for that ID.
        cloudHistory.forEach((item) => {
            if (!item.id) return;
            const deletedAtRaw = toText(deletedIdsMap[item.id]);
            if (!deletedAtRaw) return;
            const deletedTs = Date.parse(deletedAtRaw);
            const itemTs = parseRecordTimestamp(item);
            if (!isNaN(deletedTs) && itemTs > deletedTs) {
                delete deletedIdsMap[item.id];
            }
        });

        deletedIdsMap = pruneDeletedIdsMap(deletedIdsMap);
        setDeletedIdsMap(deletedIdsMap);
        setCloudHistoryMeta({
            initialized: true,
            cloudIds: Array.from(currentCloudIds),
            updatedAt: new Date().toISOString()
        });

        safeSetItem(STORAGE_KEY, JSON.stringify(mergedHistory));
        if (typeof renderHistory === 'function') renderHistory();

        if (showUI && !cloudMeta.initialized && cloudHistory.length === 0 && localHistory.length > 0) {
            showTransientNotice('Облако пустое: локальный журнал сохранен, данные не удалены.', 'warn');
        }
        if (showUI) {
            const pending = getCloudOutbox().length;
            if (pending > 0) {
                showTransientNotice(`Не удалось отправить в облако: ${pending} запис(ей). Оставлены в очереди для автоповтора.`, 'warn');
            }
        }
        success = true;
    } catch (e) {
        console.error("History sync failed", e);
        if (showUI) alert("Ошибка сети History: " + e.message);
    }

    if (showUI && syncBtn) {
        syncBtn.textContent = success ? '✅ Синхронизировано' : '❌ Ошибка';
        syncBtn.style.opacity = '1';
        setTimeout(() => {
            syncBtn.textContent = 'Синхронизировать 🔄';
            syncBtn.disabled = false;
        }, 2000);
    }
}

const SIDEBAR_SYNC_LABEL = 'Загрузить из облака';
const SIDEBAR_RESET_LABEL = 'Восстановить встроенный';
const SIDEBAR_HARD_REFRESH_LABEL = 'Обновить PWA';

function setSidebarToolButtonState(button, state, label) {
    if (!button) return;
    button.classList.remove('is-loading', 'is-success', 'is-error');

    if (state === 'loading') {
        button.classList.add('is-loading');
        button.disabled = true;
    } else if (state === 'success') {
        button.classList.add('is-success');
        button.disabled = true;
    } else if (state === 'error') {
        button.classList.add('is-error');
        button.disabled = true;
    } else {
        button.disabled = false;
    }

    if (typeof label === 'string') {
        button.textContent = label;
    }
}

async function syncDatabaseFromCloud(isAutoSync = false) {
    const syncDbBtn = document.getElementById('btn-db-sync');

    if (syncDbBtn && !isAutoSync) {
        setSidebarToolButtonState(syncDbBtn, 'loading', 'Загрузка...');
    }

    let success = false;
    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?token=${API_TOKEN}&sheet=Database&_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && !data.error && data.length > 0) {
                window.allKnives = data.map(k => ({
                    brand: k.Brand || k.brand || "",
                    series: k.Series || k.series || "",
                    steel: k.Steel || k.steel || "",
                    carbon: k["C, %"] || k.carbon || "",
                    CrMoV: k["CrMoV, %"] || k.crmov || "",
                    length: k.Length || k.length || "",
                    width: k.Width || k.width || "",
                    angle: k.Grinding || k.angle || "",
                    honing_add: k.Honing || k.honing_add || "",
                    comments: k.Comments || k.comments || "",
                    category: k.Category || k.category || "custom"
                }));
                writeDatabaseCache(window.allKnives);
                renderDatabase();
                success = true;
            } else if (Array.isArray(data) && data.length === 0) {
                console.log("Database tab is empty in cloud.");
            }
        }
    } catch (e) {
        console.error("Database sync failed", e);
        if (!isAutoSync) alert("Ошибка сети DB: " + e.message);
    }

    // Also sync History during auto-sync
    if (isAutoSync) {
        try {
            await syncHistoryFromCloud(false); // don't affect button UI during auto-sync if viewed
        } catch (e) {
            console.error("History sync wrapper failed", e);
        }
    }

    if (syncDbBtn && !isAutoSync) {
        setSidebarToolButtonState(syncDbBtn, success ? 'success' : 'error', success ? 'Загружено' : 'Ошибка загрузки');
        setTimeout(() => {
            setSidebarToolButtonState(syncDbBtn, 'default', SIDEBAR_SYNC_LABEL);
        }, 2000);
    }
}

function kickCloudSync() {
    if (!navigator.onLine) return;
    void flushCloudOutbox();
    void syncHistoryFromCloud(false);
}

function startCloudRealtimeSync() {
    if (cloudPushIntervalId) clearInterval(cloudPushIntervalId);
    if (cloudPullIntervalId) clearInterval(cloudPullIntervalId);

    cloudPushIntervalId = setInterval(() => {
        if (!navigator.onLine) return;
        void flushCloudOutbox();
    }, CLOUD_PUSH_INTERVAL_MS);

    cloudPullIntervalId = setInterval(() => {
        if (!navigator.onLine || document.hidden) return;
        void syncHistoryFromCloud(false);
    }, CLOUD_PULL_INTERVAL_MS);
}

window.addEventListener('online', kickCloudSync);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) kickCloudSync();
});

// ====== LOCALSTORAGE LOGIC ======
const STORAGE_KEY = 'staysharp_history';

function getHistory() {
    const data = safeGetItem(STORAGE_KEY);
    if (!data) return [];
    try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return sanitizeHistoryArray(parsed);
    } catch (e) { }

    // Self-heal broken history shape/content.
    safeSetItem(STORAGE_KEY, JSON.stringify([]));
    showTransientNotice('Локальная история повреждена и автоматически сброшена.', 'warn');
    return [];
}

function saveToHistory(record) {
    const normalizedRecord = touchHistoryRecord(record, false);
    if (!normalizedRecord.id) {
        normalizedRecord.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
    }
    clearDeletedId(normalizedRecord.id);
    const history = getHistory();
    history.push(normalizedRecord);
    safeSetItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
    enqueueCloudOperation(normalizedRecord, "History", "add");
    void flushCloudOutbox();
}

let editIndex = -1;

// Ensure function is in global scope to be called from onclick element
window.deleteRecord = function (index) {
    if (confirm("Вы уверены, что хотите удалить эту запись?")) {
        const history = getHistory();
        const recordId = history[index].id;
        history.splice(index, 1);
        safeSetItem(STORAGE_KEY, JSON.stringify(history));
        renderHistory();
        if (recordId) {
            rememberDeletedId(recordId);
            enqueueCloudOperation({ id: recordId }, "History", "delete");
            void flushCloudOutbox();
        }
    }
};

window.editRecord = function (index) {
    const history = getHistory();
    const record = history[index];

    document.getElementById('record-brand').value = record.brand || '';
    document.getElementById('record-series').value = record.series || '';
    document.getElementById('record-steel').value = record.steel || '';
    document.getElementById('record-carbon').value = record.carbon || '';
    document.getElementById('record-crmov').value = record.crmov || '';
    document.getElementById('record-length').value = record.length || '';
    document.getElementById('record-width').value = record.width || '';
    document.getElementById('record-angle').value = record.angle || '';
    document.getElementById('record-honing-add').value = record.honingAdd || '';
    document.getElementById('record-bess').value = record.bess || '';
    document.getElementById('record-comments').value = record.comments || '';

    // Inject saved angles into the active calculator inputs
    if (record.angle && !isNaN(parseFloat(record.angle))) {
        document.getElementById('input-ga').value = (parseFloat(record.angle) / 2).toFixed(1);
    }
    if (record.honingAdd && !isNaN(parseFloat(record.honingAdd))) {
        document.getElementById('input-honing-add').value = parseFloat(record.honingAdd).toFixed(1);
    }

    // Trigger calculation so USH/FVB_H are ready for this specific knife
    calculateLive();

    editIndex = index;
    document.getElementById('btn-save-record').textContent = 'Обновить запись';
    document.getElementById('btn-cancel-edit').classList.remove('hidden');

    // Switch to Calculator view to see form
    document.querySelector('[data-target="calc-view"]').click();
};

const cancelEditBtn = document.getElementById('btn-cancel-edit');
if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        editIndex = -1;
        document.getElementById('btn-save-record').textContent = 'Сохранить в журнал';
        document.getElementById('btn-cancel-edit').classList.add('hidden');
        clearForm();
    });
}

function clearForm() {
    document.getElementById('record-brand').value = '';
    document.getElementById('record-series').value = '';
    document.getElementById('record-steel').value = '';
    document.getElementById('record-carbon').value = '';
    document.getElementById('record-crmov').value = '';
    document.getElementById('record-length').value = '';
    document.getElementById('record-width').value = '';
    document.getElementById('record-angle').value = '';
    document.getElementById('record-honing-add').value = '';
    document.getElementById('record-bess').value = '';
    document.getElementById('record-comments').value = '';
}

function populatePredictDatalists() {
    const knives = getKnivesArray();
    if (knives.length === 0) return;

    const bList = document.getElementById('brand-list');
    const sList = document.getElementById('series-list');
    const stList = document.getElementById('steel-list');

    const brandEl = document.getElementById('predict-brand');
    const seriesEl = document.getElementById('predict-series');
    const steelEl = document.getElementById('predict-steel');

    const currBrand = toText(brandEl ? brandEl.value : '').trim().toLowerCase();
    const currSeries = toText(seriesEl ? seriesEl.value : '').trim().toLowerCase();
    const currSteel = toText(steelEl ? steelEl.value : '').trim().toLowerCase();

    const brands = new Set();
    const series = new Set();
    const steels = new Set();

    knives.forEach(k => {
        const kb = toText(k.brand).toLowerCase();
        const ks = toText(k.series).toLowerCase();
        const kst = toText(k.steel).toLowerCase();

        // Calculate matches loosely based on what is typed so far
        const matchB = !currBrand || kb.includes(currBrand);
        const matchS = !currSeries || ks.includes(currSeries);
        const matchSt = !currSteel || kst.includes(currSteel);

        // Populate options filtering out paths that don't match the *other* field constraints
        if (matchS && matchSt && k.brand) brands.add(k.brand.trim());
        if (matchB && matchSt && k.series) series.add(k.series.trim());
        if (matchB && matchS && k.steel) steels.add(k.steel.trim());
    });

    if (bList) bList.innerHTML = Array.from(brands).sort().map(b => `<option value="${b}">`).join('');
    if (sList) sList.innerHTML = Array.from(series).sort().map(s => `<option value="${s}">`).join('');
    if (stList) stList.innerHTML = Array.from(steels).sort().map(st => `<option value="${st}">`).join('');
}
populatePredictDatalists();

function triggerPrediction(e) {
    const resDiv = document.getElementById('prediction-result');
    const knives = getKnivesArray();
    if (knives.length === 0) {
        resDiv.textContent = 'База данных не загружена.';
        return;
    }

    const isDeleting = e && e.inputType && e.inputType.startsWith('delete');

    const bInput = document.getElementById('predict-brand');
    const sInput = document.getElementById('predict-series');
    const stInput = document.getElementById('predict-steel');
    const cInput = document.getElementById('predict-carbon');
    const crInput = document.getElementById('predict-crmov');

    let bVal = bInput.value.trim();
    let sVal = sInput.value.trim();
    let stVal = stInput.value.trim();
    let cVal = cInput.value.trim();
    let crVal = crInput.value.trim();

    // Вспомогательная функция для проверки одного ножа на соответствие текущим полям
    const isMatch = (k, skipField = null) => {
        if (skipField !== 'brand' && bVal && toText(k.brand).toLowerCase() !== bVal.toLowerCase()) return false;
        if (skipField !== 'series' && sVal && toText(k.series).toLowerCase() !== sVal.toLowerCase()) return false;
        if (skipField !== 'steel' && stVal && toText(k.steel).toLowerCase() !== stVal.toLowerCase()) return false;
        if (skipField !== 'carbon' && cVal !== '' && parseFloat(k.carbon) !== parseFloat(cVal)) return false;
        if (skipField !== 'crmov' && crVal !== '' && parseFloat(k.CrMoV) !== parseFloat(crVal)) return false;
        return true;
    };

    let matches = knives.filter(k => isMatch(k));

    // Сброс старых конфликтующих значений
    if (matches.length === 0 && e && e.target && !isDeleting) {
        let anchorField = null;
        if (e.target === bInput) anchorField = 'brand';
        if (e.target === sInput) anchorField = 'series';
        if (e.target === stInput) anchorField = 'steel';
        if (e.target === cInput) anchorField = 'carbon';
        if (e.target === crInput) anchorField = 'crmov';

        if (anchorField) {
            let anchorMatches = knives.filter(k => {
                if (anchorField === 'brand') return toText(k.brand).toLowerCase() === bVal.toLowerCase();
                if (anchorField === 'series') return toText(k.series).toLowerCase() === sVal.toLowerCase();
                if (anchorField === 'steel') return toText(k.steel).toLowerCase() === stVal.toLowerCase();
                if (anchorField === 'carbon') return parseFloat(k.carbon) === parseFloat(cVal);
                if (anchorField === 'crmov') return parseFloat(k.CrMoV) === parseFloat(crVal);
                return true;
            });

            if (anchorMatches.length > 0) {
                const isValid = (field, val) => {
                    if (!val) return true;
                    if (field === 'brand') return anchorMatches.some(k => toText(k.brand).toLowerCase() === val.toLowerCase());
                    if (field === 'series') return anchorMatches.some(k => toText(k.series).toLowerCase() === val.toLowerCase());
                    if (field === 'steel') return anchorMatches.some(k => toText(k.steel).toLowerCase() === val.toLowerCase());
                    if (field === 'carbon') return anchorMatches.some(k => parseFloat(k.carbon) === parseFloat(val));
                    if (field === 'crmov') return anchorMatches.some(k => parseFloat(k.CrMoV) === parseFloat(val));
                    return false;
                };

                if (anchorField !== 'brand' && !isValid('brand', bVal)) { bInput.value = ''; bVal = ''; }
                if (anchorField !== 'series' && !isValid('series', sVal)) { sInput.value = ''; sVal = ''; }
                if (anchorField !== 'steel' && !isValid('steel', stVal)) { stInput.value = ''; stVal = ''; }
                if (anchorField !== 'carbon' && !isValid('carbon', cVal)) { cInput.value = ''; cVal = ''; }
                if (anchorField !== 'crmov' && !isValid('crmov', crVal)) { crInput.value = ''; crVal = ''; }
            }
        }

        matches = knives.filter(k => isMatch(k));
    }

    // Авто-заполнение остальных полей
    if (matches.length > 0 && matches.length !== knives.length && !isDeleting) {
        const uniqueB = [...new Set(matches.map(k => k.brand))].filter(Boolean);
        const uniqueS = [...new Set(matches.map(k => k.series))].filter(Boolean);
        const uniqueSt = [...new Set(matches.map(k => k.steel))].filter(Boolean);
        const uniqueC = [...new Set(matches.map(k => (k.carbon !== null && k.carbon !== undefined && k.carbon !== "") ? k.carbon.toString() : null))].filter(Boolean);
        const uniqueCr = [...new Set(matches.map(k => (k.CrMoV !== null && k.CrMoV !== undefined && k.CrMoV !== "") ? k.CrMoV.toString() : null))].filter(Boolean);

        if (uniqueB.length === 1 && e.target !== bInput) bInput.value = uniqueB[0];
        if (uniqueS.length === 1 && e.target !== sInput) sInput.value = uniqueS[0];
        if (uniqueSt.length === 1 && e.target !== stInput) stInput.value = uniqueSt[0];
        if (uniqueC.length === 1 && e.target !== cInput) cInput.value = uniqueC[0];
        if (uniqueCr.length === 1 && e.target !== crInput) crInput.value = uniqueCr[0];
    }

    const brand = toText(bInput.value).trim().toLowerCase();
    const series = toText(sInput.value).trim().toLowerCase();
    const steel = toText(stInput.value).trim().toLowerCase();
    const carbonRaw = cInput.value.trim();
    const crmovRaw = crInput.value.trim();
    const carbon = parseFloat(carbonRaw);
    const crmov = parseFloat(crmovRaw);

    let foundAngle = null;
    let foundHoning = null;
    let matchType = '';

    // Step 1 logic
    if (brand && series && steel) {
        const exact = knives.find(k =>
            toText(k.brand).toLowerCase() === brand &&
            toText(k.series).toLowerCase() === series &&
            toText(k.steel).toLowerCase() === steel
        );
        if (exact && exact.angle) {
            foundAngle = parseFloat(exact.angle);
            foundHoning = parseFloat(exact.honing_add || 0);
            matchType = 'Точное совпадение (Бренд + Серия + Сталь)';
        }
    }

    const getAverages = (arr) => {
        const validAngle = arr.filter(k => k.angle && !isNaN(parseFloat(k.angle)));
        if (validAngle.length === 0) return null;
        const avgAngle = validAngle.reduce((sum, k) => sum + parseFloat(k.angle), 0) / validAngle.length;

        const validHoning = arr.filter(k => k.honing_add && !isNaN(parseFloat(k.honing_add)));
        const avgHoning = validHoning.length > 0 ? validHoning.reduce((sum, k) => sum + parseFloat(k.honing_add), 0) / validHoning.length : 0;

        return { angle: avgAngle, honing: avgHoning };
    }

    if (foundAngle === null && brand) {
        const brandMatch = knives.filter(k => toText(k.brand).toLowerCase() === brand);
        if (brandMatch.length > 0) {
            const avgs = getAverages(brandMatch);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Среднее значение по Бренду';
            }
        }
    }

    if (foundAngle === null && steel) {
        const steelMatch = knives.filter(k => toText(k.steel).toLowerCase() === steel);
        if (steelMatch.length > 0) {
            const avgs = getAverages(steelMatch);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Среднее по Стали';
            }
        }
    }

    // Step 2 logic
    if (foundAngle === null && !isNaN(carbon) && !isNaN(crmov)) {
        const exactChem = knives.find(k => k.carbon && k.CrMoV && parseFloat(k.carbon) === carbon && parseFloat(k.CrMoV) === crmov);
        if (exactChem && exactChem.angle) {
            foundAngle = parseFloat(exactChem.angle);
            foundHoning = parseFloat(exactChem.honing_add || 0);
            matchType = 'Точное совпадение (Углерод и CrMoV)';
        }
    }

    if (foundAngle === null && !isNaN(carbon)) {
        const exactC = knives.filter(k => k.carbon && parseFloat(k.carbon) === carbon);
        if (exactC.length > 0) {
            const avgs = getAverages(exactC);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Среднее по Углероду';
            }
        }
    }

    if (foundAngle === null && !isNaN(carbon)) {
        const closeC = knives.filter(k => k.carbon && Math.abs(parseFloat(k.carbon) - carbon) <= 0.08);
        if (closeC.length > 0) {
            const avgs = getAverages(closeC);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Приблизительное совпадение по Углероду (±0.08)';
            }
        }
    }

    if (foundAngle === null && !isNaN(crmov)) {
        const exactCr = knives.filter(k => k.CrMoV && parseFloat(k.CrMoV) === crmov);
        if (exactCr.length > 0) {
            const avgs = getAverages(exactCr);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Среднее по CrMoV%';
            }
        }
    }

    if (foundAngle === null && !isNaN(crmov)) {
        const closeCr = knives.filter(k => k.CrMoV && Math.abs(parseFloat(k.CrMoV) - crmov) <= 1.0);
        if (closeCr.length > 0) {
            const avgs = getAverages(closeCr);
            if (avgs) {
                foundAngle = avgs.angle;
                foundHoning = avgs.honing;
                matchType = 'Приблизительное совпадение по CrMoV (±1.0%)';
            }
        }
    }

    const outWrap = document.getElementById('prediction-out-wrap');

    if (foundAngle !== null) {
        document.getElementById('predict-val-angle').textContent = foundAngle.toFixed(1);
        document.getElementById('predict-val-honing').textContent = foundHoning.toFixed(1);

        resDiv.innerHTML = `Найдено (${matchType})`;
        resDiv.style.color = "var(--accent-warm)";
        outWrap.classList.remove('hidden');
    } else {
        resDiv.textContent = 'Не удалось найти анализ по введенным данным. Попробуйте уточнить сталь (или % углерода) или бренд.';
        resDiv.style.color = "var(--text-muted)";
        outWrap.classList.add('hidden');
    }

    // Update datalists dynamically
    populatePredictDatalists();
}

// Add event listeners to all predict inputs for instant analysis
const predictInputs = [
    'predict-brand', 'predict-series', 'predict-steel',
    'predict-carbon', 'predict-crmov'
];
predictInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', triggerPrediction);
});

const predictApplyBtn = document.getElementById('btn-predict-apply');
if (predictApplyBtn) {
predictApplyBtn.addEventListener('click', () => {
    const pAngle = parseFloat(document.getElementById('predict-val-angle').textContent);
    const pHoning = parseFloat(document.getElementById('predict-val-honing').textContent);

    // Fill form
    document.getElementById('record-brand').value = document.getElementById('predict-brand').value;
    document.getElementById('record-series').value = document.getElementById('predict-series').value;
    document.getElementById('record-steel').value = document.getElementById('predict-steel').value;
    document.getElementById('record-carbon').value = document.getElementById('predict-carbon').value;
    document.getElementById('record-crmov').value = document.getElementById('predict-crmov').value;
    document.getElementById('record-angle').value = pAngle.toFixed(1);
    document.getElementById('record-honing-add').value = pHoning.toFixed(1);

    // Fill inputs & calc
    document.getElementById('input-ga').value = (pAngle / 2).toFixed(1);
    document.getElementById('input-honing-add').value = pHoning.toFixed(1);
    calculateLive();

    // Switch view
    document.querySelector('[data-target="calc-view"]').click();

    // Highlight
    const toHighlight = ['record-angle', 'record-honing-add', 'input-ga'];
    toHighlight.forEach(id => document.getElementById(id).classList.add('highlight-pulse'));
    setTimeout(() => {
        toHighlight.forEach(id => document.getElementById(id).classList.remove('highlight-pulse'));
    }, 1000);

    // Clear prediction view
    document.getElementById('predict-brand').value = '';
    document.getElementById('predict-series').value = '';
    document.getElementById('predict-steel').value = '';
    document.getElementById('predict-carbon').value = '';
    document.getElementById('predict-crmov').value = '';
    document.getElementById('prediction-result').textContent = '';
    document.getElementById('prediction-out-wrap').classList.add('hidden');
});
}

let isSavingRecord = false;
let lastSaveEventAt = 0;
const SAVE_EVENT_DEDUP_MS = 700;

window.saveRecordClick = function (e) {
    // iOS PWA may fire touch + click for the same tap; keep only first event.
    const eventType = e && e.type ? e.type : '';
    if (eventType) {
        const now = Date.now();
        if (now - lastSaveEventAt < SAVE_EVENT_DEDUP_MS) {
            return;
        }
        lastSaveEventAt = now;
    }

    if (e) {
        // Only prevent default if it's not a touch event that might be needed for scrolling
        // But for a button type="button", preventDefault is mostly harmless.
        if (e.type === 'click' || e.type === 'touchend') {
            e.preventDefault();
        }
        e.stopPropagation();
    }

    // Prevent double execution from buggy iOS PWA double events
    if (isSavingRecord) {
        console.log("Blocked duplicate save attempt");
        return;
    }

    try {
        isSavingRecord = true;
        const brand = document.getElementById('record-brand').value.trim();
        if (!brand) {
            isSavingRecord = false;
            alert("⚠️ Заполните поле 'Бренд'!");
            return;
        }

        const historyOpts = getHistory();
        const existingRecord = (editIndex >= 0 && historyOpts[editIndex]) ? historyOpts[editIndex] : {};

        const baseRecord = normalizeHistoryRecord({
            id: editIndex >= 0 ? (existingRecord.id || (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5))) : (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5)),
            date: editIndex >= 0
                ? (existingRecord.date || new Date().toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }))
                : new Date().toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }),
            brand: brand,
            series: document.getElementById('record-series').value.trim(),
            steel: document.getElementById('record-steel').value.trim(),
            carbon: document.getElementById('record-carbon').value.trim(),
            crmov: document.getElementById('record-crmov').value.trim(),
            length: document.getElementById('record-length').value.trim(),
            width: document.getElementById('record-width').value.trim(),
            angle: document.getElementById('record-angle').value.trim(),
            honingAdd: document.getElementById('record-honing-add').value.trim(),
            bess: document.getElementById('record-bess').value.trim(),
            comments: document.getElementById('record-comments').value.trim()
        });
        const record = touchHistoryRecord(baseRecord, true);

        if (editIndex >= 0) {
            // Update existing record
            clearDeletedId(record.id);
            historyOpts[editIndex] = record;
            safeSetItem(STORAGE_KEY, JSON.stringify(historyOpts));
            renderHistory();
            enqueueCloudOperation(record, "History", "update");
            void flushCloudOutbox();

            editIndex = -1;
            document.getElementById('btn-save-record').textContent = 'Сохранить в журнал';
            document.getElementById('btn-cancel-edit').classList.add('hidden');
        } else {
            // Save new record
            saveToHistory(record);
        }

        clearForm();

        const btn = document.getElementById('btn-save-record');
        const originalText = btn.textContent;
        btn.textContent = '✅ Сохранено!';
        btn.style.backgroundColor = 'var(--success)';
        btn.style.borderColor = 'var(--success)';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
            // Auto switch to History AFTER confirmation is shown
            document.querySelector('[data-target="history-view"]').click();

            // Allow saving again after navigation completes
            setTimeout(() => { isSavingRecord = false; }, 500);
        }, 1000);
    } catch (err) {
        console.error("Save error:", err);
        isSavingRecord = false;
        alert("Ошибка сохранения: " + err.message);
    }
};

function bindSaveRecordButton() {
    const saveBtn = document.getElementById('btn-save-record');
    if (!saveBtn || saveBtn.dataset.saveBound === '1') return;

    const onSaveTap = (event) => window.saveRecordClick(event);
    saveBtn.addEventListener('click', onSaveTap);
    saveBtn.addEventListener('touchend', onSaveTap, { passive: false });
    saveBtn.dataset.saveBound = '1';
}

// Bind immediately (script is loaded at the end of body) and also on page restore.
bindSaveRecordButton();
window.addEventListener('pageshow', bindSaveRecordButton);

function resetDatabaseCacheWithDefaults() {
    const defaults = (typeof allKnives !== 'undefined' && Array.isArray(allKnives))
        ? sanitizeKnivesArray(allKnives)
        : [];
    safeRemoveItem(DB_STORAGE_KEY);
    window.allKnives = defaults;
    writeDatabaseCache(window.allKnives);

    const searchEl = document.getElementById('search-knives');
    renderDatabase(searchEl ? searchEl.value : "");
    populatePredictDatalists();
    showTransientNotice('Справочник обновлен из встроенной базы.');
}

async function hardRefreshApplication() {
    // Keep user data; only clear runtime web caches and SW registrations.
    try {
        if ('caches' in window && typeof caches.keys === 'function') {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
    } catch (e) {
        console.warn('CacheStorage cleanup failed:', e);
    }

    try {
        if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(reg => reg.unregister()));
        }
    } catch (e) {
        console.warn('Service worker unregister failed:', e);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('fresh', Date.now().toString());
    window.location.replace(url.toString());
}

function bindResetDbCacheButton() {
    const resetBtn = document.getElementById('btn-reset-db-cache');
    if (!resetBtn || resetBtn.dataset.bound === '1') return;

    resetBtn.addEventListener('click', async () => {
        const ok = confirm('Обновить локальный справочник из встроенной базы? История заточек не будет удалена.');
        if (!ok) return;

        setSidebarToolButtonState(resetBtn, 'loading', 'Восстановление...');
        try {
            // Small delay so the loading indicator is visible on fast devices.
            await new Promise(resolve => setTimeout(resolve, 180));
            resetDatabaseCacheWithDefaults();
            setSidebarToolButtonState(resetBtn, 'success', 'Восстановлено');
            setTimeout(() => {
                setSidebarToolButtonState(resetBtn, 'default', SIDEBAR_RESET_LABEL);
            }, 1700);
        } catch (e) {
            console.error('Reset DB cache failed:', e);
            setSidebarToolButtonState(resetBtn, 'error', 'Ошибка обновления');
            setTimeout(() => {
                setSidebarToolButtonState(resetBtn, 'default', SIDEBAR_RESET_LABEL);
            }, 2200);
        }
    });

    resetBtn.dataset.bound = '1';
}

function bindHardRefreshButton() {
    const refreshBtn = document.getElementById('btn-hard-refresh');
    if (!refreshBtn || refreshBtn.dataset.bound === '1') return;

    refreshBtn.addEventListener('click', async () => {
        const ok = confirm('Перезапустить приложение и принудительно очистить web-кэш (Service Worker + Cache Storage)? История и журнал не удаляются.');
        if (!ok) return;

        setSidebarToolButtonState(refreshBtn, 'loading', 'Подготовка...');

        try {
            await hardRefreshApplication();
            // In case redirect is blocked by browser policy.
            setSidebarToolButtonState(refreshBtn, 'success', 'Перезапуск...');
        } catch (e) {
            console.error('Hard refresh failed:', e);
            alert('Не удалось выполнить обновление приложения: ' + e.message);
            setSidebarToolButtonState(refreshBtn, 'error', 'Ошибка обновления');
            setTimeout(() => {
                setSidebarToolButtonState(refreshBtn, 'default', SIDEBAR_HARD_REFRESH_LABEL);
            }, 2200);
        }
    });

    refreshBtn.dataset.bound = '1';
}

window.resetDatabaseCache = resetDatabaseCacheWithDefaults;
bindResetDbCacheButton();
bindHardRefreshButton();
window.addEventListener('pageshow', bindResetDbCacheButton);
window.addEventListener('pageshow', bindHardRefreshButton);



function renderHistory() {
    const history = getHistory();
    const tbody = document.querySelector('#history-table tbody');
    const emptyState = document.getElementById('empty-history');
    const tableEl = document.getElementById('history-table');

    tbody.innerHTML = '';

    if (history.length === 0) {
        emptyState.classList.remove('hidden');
        tableEl.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        tableEl.classList.remove('hidden');

        history.slice().reverse().forEach((item, revIndex) => {
            const index = history.length - 1 - revIndex;
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td style="color: var(--text-muted); font-size: 12px; white-space: nowrap;">${item.date}</td>
                <td style="font-weight: 600; color: var(--text-main);">${item.brand || '-'}</td>
                <td>${item.series || '-'}</td>
                <td>${item.steel || '-'}</td>
                <td>${item.carbon || '-'}</td>
                <td>${item.crmov || '-'}</td>
                <td>${item.length || '-'}</td>
                <td>${item.width || '-'}</td>
                <td style="color: var(--accent-warm); font-weight: 700;">${item.angle || '-'}</td>
                <td>${item.honingAdd || '-'}</td>
                <td style="color: var(--success); font-weight: 600;">${item.bess || '-'}</td>
                <td style="color: var(--text-secondary); max-width: 180px; font-size: 12px; white-space: pre-wrap; word-break: break-word;">${item.comments || '-'}</td>
                <td>
                    <button class="del-btn" style="margin-bottom: 4px;" onclick="window.editRecord(${index})">Изменить</button><br>
                    <button class="del-btn" onclick="window.deleteRecord(${index})">Удалить</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

renderHistory(); // load on start

// ====== DATABASE (knives.js & Cloud) ======
// (Click listeners are attached directly in HTML via onclick="")

// Auto-sync on startup
document.addEventListener('DOMContentLoaded', () => {
    syncDatabaseFromCloud(true);
    startCloudRealtimeSync();
    kickCloudSync();
    bindResetDbCacheButton();
});

function renderDatabase(filter = "") {
    const tbody = document.getElementById('knives-table-body');
    tbody.innerHTML = '';

    const knives = getKnivesArray();
    if (knives.length === 0) return;

    filter = toText(filter).toLowerCase();

    const filtered = knives.filter(k => {
        if (!filter) return true;
        const brand = toText(k.brand).toLowerCase();
        const steel = toText(k.steel).toLowerCase();
        return brand.includes(filter) || steel.includes(filter);
    });

    filtered.forEach(k => {
        const tr = document.createElement('tr');

        const formatStr = val => val ? val : '-';
        const steelInfo = k.steel ? `<strong>${k.steel}</strong> <br><small class="text-muted">(C: ${formatStr(k.carbon)} / CrMoV: ${formatStr(k.CrMoV)})</small>` : '-';

        let catText = k.category;
        let badgeColor = '';
        if (k.category === 'premium_quality') { badgeColor = 'tag-red'; catText = 'Premium'; }
        if (k.category === 'high_quality') { badgeColor = 'tag-green'; catText = 'High'; }
        if (k.category === 'medium_quality') { catText = 'Medium'; }
        if (k.category === 'low_quality') { catText = 'Low'; }

        tr.innerHTML = `
            <td><span class="tag-badge ${badgeColor}">${catText}</span></td>
            <td><strong>${formatStr(k.brand)}</strong> ${k.series ? `<br><small class="text-muted">${k.series}</small>` : ''}</td>
            <td>${steelInfo}</td>
            <td style="color: var(--text-main)"><strong>${k.angle}°</strong></td>
            <td style="color: var(--text-secondary)">${k.honing_add ? k.honing_add + '°' : '-'}</td>
        `;

        // Make row clickable
        tr.style.cursor = 'pointer';
        tr.style.transition = 'background 0.2s';
        tr.addEventListener('mouseenter', () => tr.style.backgroundColor = 'rgba(255,255,255,0.03)');
        tr.addEventListener('mouseleave', () => tr.style.backgroundColor = 'transparent');

        tr.addEventListener('click', () => {
            // Fill calculator inputs
            if (k.angle) document.getElementById('input-ga').value = (parseFloat(k.angle) / 2).toFixed(1);
            if (k.honing_add) document.getElementById('input-honing-add').value = parseFloat(k.honing_add).toFixed(1);

            calculateLive();

            // Clear previous edits, acts as a "new knife" setup
            editIndex = -1;
            document.getElementById('btn-save-record').textContent = 'Сохранить в журнал';
            document.getElementById('btn-cancel-edit').classList.add('hidden');

            // Pre-fill the save form with known DB attributes
            clearForm();
            if (k.brand) document.getElementById('record-brand').value = k.brand;
            if (k.series) document.getElementById('record-series').value = k.series;
            if (k.steel) document.getElementById('record-steel').value = k.steel;
            if (k.carbon) document.getElementById('record-carbon').value = k.carbon;
            if (k.CrMoV) document.getElementById('record-crmov').value = k.CrMoV;

            // Switch to Calculator view
            document.querySelector('[data-target="calc-view"]').click();

            // Highlight calculator inputs to show what changed
            document.getElementById('input-ga').classList.add('highlight-pulse');
            setTimeout(() => document.getElementById('input-ga').classList.remove('highlight-pulse'), 1000);
        });

        tbody.appendChild(tr);
    });
}

const searchKnivesInput = document.getElementById('search-knives');
if (searchKnivesInput) {
    searchKnivesInput.addEventListener('input', (e) => {
        renderDatabase(e.target.value);
    });
}

// Render DB initially
renderDatabase();

// ====== MODAL & GLOSSARY LOGIC ======
const glossary = {
    kj: { title: "KJ (Knife to Jig)", text: "Расстояние от лезвия ножа до штанги универсального суппорта. Измеряется в миллиметрах." },
    ga: { title: "GA (Grinding Angle)", text: "Желаемый угол заточки на сторону (половинный угол). Обычно составляет 15° - 20°." },
    rw: { title: "RW (Radius of Wheel)", text: "Текущий радиус точильного или хонинговального круга. Для Tormek T-4/T-8 обычно колеблется по мере износа камня от 125 до 100 мм." },
    c1: { title: "Константа C1", text: "Константа геометрии станка (по умолчанию 50.0). Расстояние от центра вала до передней плоскости суппорта." },
    c2: { title: "Константа C2", text: "Константа геометрии станка (по умолчанию 28.6). Смещение оси камня." },
    honing_add: { title: "Honing Add", text: "Добавочный угол компенсации для этапа хонингования (доводки на кожаном круге). Рекомендуется добавлять 1°, если вы хотите сделать микроподвод." },
    fvb_s: { title: "FVB_S (Frontal Base)", text: "Смещение передней базы при установке фронтальной приставки FVB." },
    c3_c4: { title: "Константа C3_C4", text: "Сумма констант для хонинговального круга. По умолчанию 128.1." },
    c5_c6: { title: "Константа C5_C6", text: "Сумма смещений для расчета высоты хонингования. По умолчанию 51.4." }
};

const schemas = {
    grinding: { title: "Схема геометрии: Grinding", content: '<p style="margin-bottom: 10px; color: var(--text-secondary);">Пояснение геометрических размеров для режима основной заточки по камню.</p><img src="images/schema_right.png" alt="Схема Grinding">' },
    honing: { title: "Схема геометрии: Honing", content: '<p style="margin-bottom: 10px; color: var(--text-secondary);">Пояснение геометрических размеров для режима доводки на кожаном круге (с учетом FVB).</p><img src="images/schema_left.png" alt="Схема Honing">' }
};

const modal = document.getElementById('info-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.modal-close');

function openModal(title, htmlContent) {
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modal.classList.remove('hidden');
}
window.openModal = openModal;

function hideInfoModal() {
    if (!modal) return;
    modal.classList.add('hidden');
}
window.closeInfoModal = hideInfoModal;

if (closeModal) {
    closeModal.addEventListener('click', hideInfoModal);
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideInfoModal(); // click outside to close
    });
}

function bindInfoButtons() {
    document.querySelectorAll('.info-icon').forEach(btn => {
        if (btn.dataset.boundInfo === '1') return;
        btn.dataset.boundInfo = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            if (glossary[key]) {
                openModal(glossary[key].title, `<p>${glossary[key].text}</p>`);
            }
        });
    });

    document.querySelectorAll('.schema-btn').forEach(btn => {
        if (btn.dataset.boundSchema === '1') return;
        btn.dataset.boundSchema = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = btn.getAttribute('data-schema');
            if (schemas[type]) {
                openModal(schemas[type].title, schemas[type].content);
            }
        });
    });
}

bindInfoButtons();
