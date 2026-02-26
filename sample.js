// Fetches History from cloud and overwrites local
async function syncHistoryFromCloud() {
    const syncBtn = document.getElementById('btn-sync');
    if (syncBtn) {
        syncBtn.textContent = '⏳ Синхронизация...';
        syncBtn.disabled = true;
        syncBtn.style.opacity = '0.7';
    }

    try {
        const res = await fetch(`${GOOGLE_SCRIPT_URL}?token=${API_TOKEN}&sheet=History&_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && !data.error) {
                // We got data, overwrite local storage
                const historyData = data.map(k => ({
                    id: k.id || k.ID || "",
                    date: k.Date || k.date || "",
                    brand: k.Brand || k.brand || "",
                    series: k.Series || k.series || "",
                    steel: k.Steel || k.steel || "",
                    carbon: k["C, %"] || k.carbon || "",
                    crmov: k["CrMoV, %"] || k.crmov || "",
                    length: k.Length || k.length || "",
                    width: k.Width || k.width || "",
                    angle: k["Sharp. angle (double)"] || k.angle || "",
                    honingAdd: k["Honing add"] || k.honingAdd || "",
                    bess: k["BESS g"] || k.bess || "",
                    comments: k.Comments || k.comments || ""
                }));
                // Filter out empty rows often found in gsheets
                const validHistory = historyData.filter(item => item.id || item.brand);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(validHistory));
                if (typeof renderHistory === 'function') renderHistory();
            }
        }
    } catch (e) {
        console.error("History sync failed", e);
    } finally {
        if (syncBtn) {
            syncBtn.textContent = '✅ Синхронизировано';
            syncBtn.style.opacity = '1';
            setTimeout(() => {
                syncBtn.textContent = 'Синхронизировать 🔄';
                syncBtn.disabled = false;
            }, 2000);
        }
    }
}
