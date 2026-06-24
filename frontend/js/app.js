let refreshTimer = null;

async function loadExchangeData() {
  try {
    const r = await fetch("api/exchange/data");
    if (!r.ok) throw new Error();
    const data = await r.json();
    renderRate(data);
    renderForecastChart(data.chart);
    const ts = data.last_updated || data.chart?.generated_at || "";
    if (ts) {
      const d = new Date(ts);
      document.getElementById("last-updated").innerHTML =
        `Actualizado: <strong>${d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}</strong>`;
    }
  } catch {
    renderRate(DEMO_EXCHANGE);
    renderForecastChart(DEMO_EXCHANGE.chart);
    document.getElementById("last-updated").innerHTML =
      `Actualizado: <strong>${new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}</strong>`;
  }
}

async function loadBanks() {
  try {
    const r = await fetch("api/exchange/banks");
    if (!r.ok) throw new Error();
    renderBanksTable(await r.json());
  } catch { renderBanksTable(DEMO_BANKS); }
}

async function fullRefresh() {
  await Promise.all([loadExchangeData(), loadBanks()]);
  if (activeDateStr) loadAirlines(activeDest, activeDateStr);
}

function setRefreshInterval(minutes) {
  if (refreshTimer) clearInterval(refreshTimer);
  if (minutes > 0) refreshTimer = setInterval(fullRefresh, minutes * 60 * 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("refresh-interval")
    ?.addEventListener("change", e => setRefreshInterval(+e.target.value));
  document.getElementById("refresh-btn")
    ?.addEventListener("click", fullRefresh);

  await Promise.all([loadExchangeData(), loadBanks(), initFlights()]);
  initRentalsMap();
  setRefreshInterval(30);
});
