let rentalsMap = null;
const _markerObjects = [];   // Leaflet marker instances (same order as DEMO_RENTALS)
let _activeFilter = { min: 0, max: 99999 };

function _priceColor(price) {
  if (price < 1200) return "#22c55e";
  if (price < 1800) return "#facc15";
  if (price < 2400) return "#f97316";
  return "#ef4444";
}

function _makeIcon(price) {
  const color = _priceColor(price);
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};color:#0a0f1e;font-weight:800;font-size:10px;
      padding:3px 7px;border-radius:6px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.65);border:2px solid rgba(0,0,0,.35);
      cursor:pointer;line-height:1.4">€${(price/1000).toFixed(1)}k</div>`,
    iconAnchor: [22, 12],
  });
}

function initRentalsMap() {
  if (rentalsMap) return;                              // already initialized
  const el = document.getElementById("rentals-map");
  if (!el || typeof L === "undefined") return;

  rentalsMap = L.map("rentals-map", { center: [52.515, 13.39], zoom: 11 });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/" target="_blank">CARTO</a>',
    maxZoom: 19,
  }).addTo(rentalsMap);

  DEMO_RENTALS.forEach((r, i) => {
    const marker = L.marker([r.lat, r.lng], { icon: _makeIcon(r.price_eur) })
      .addTo(rentalsMap)
      .bindPopup(_popupHtml(r), { maxWidth: 220 });

    marker.on("click", () => highlightCard(i));
    _markerObjects.push(marker);
  });

  // Filter buttons
  document.querySelectorAll(".rental-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rental-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _activeFilter = {
        min: +(btn.dataset.min || 0),
        max: +(btn.dataset.max || 99999),
      };
      applyFilter();
    });
  });

  renderRentalCards(DEMO_RENTALS);
  updateCount(DEMO_RENTALS.length);
}

function _popupHtml(r) {
  const color = _priceColor(r.price_eur);
  return `<div style="font-family:system-ui;font-size:13px;line-height:1.6">
    <strong>${r.neighborhood}</strong><br>
    <span style="color:${color};font-size:1.15em;font-weight:700">
      €${r.price_eur.toLocaleString("de-DE")}/mes
    </span><br>
    ${r.rooms} hab · ${r.size_m2} m² · ${r.type}<br>
    <span style="font-size:.85em;color:#888">${r.platform}</span><br>
    <a href="${r.website}" target="_blank" rel="noopener"
       style="color:#6366f1;font-weight:600">Ver oferta →</a>
  </div>`;
}

function applyFilter() {
  const { min, max } = _activeFilter;
  const visible = DEMO_RENTALS.filter(r => r.price_eur >= min && r.price_eur <= max);

  // Show/hide markers
  DEMO_RENTALS.forEach((r, i) => {
    const show = r.price_eur >= min && r.price_eur <= max;
    if (show) _markerObjects[i].addTo(rentalsMap);
    else _markerObjects[i].remove();
  });

  renderRentalCards(visible);
  updateCount(visible.length);
}

function highlightCard(idx) {
  // idx is the index in DEMO_RENTALS (before filter sort)
  document.querySelectorAll(".rental-card").forEach(c => c.classList.remove("active"));
  const card = document.querySelector(`.rental-card[data-orig-idx="${idx}"]`);
  if (card) {
    card.classList.add("active");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function renderRentalCards(rentals) {
  const container = document.getElementById("rentals-list");
  if (!container) return;
  const sorted = [...rentals].sort((a, b) => a.price_eur - b.price_eur);
  if (!sorted.length) {
    container.innerHTML = '<p style="color:#475569;font-size:.8rem;padding:12px 0">Sin propiedades en este rango.</p>';
    return;
  }
  container.innerHTML = sorted.map(r => {
    const origIdx = DEMO_RENTALS.indexOf(r);
    const color = _priceColor(r.price_eur);
    return `<div class="rental-card" data-orig-idx="${origIdx}"
                 onclick="onRentalCardClick(${origIdx},${r.lat},${r.lng})">
      <div class="rental-card-top">
        <div>
          <div class="rental-name">${r.neighborhood}</div>
          <div class="rental-detail">${r.rooms} hab · ${r.size_m2} m² · ${r.type}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="rental-price" style="color:${color}">€${r.price_eur.toLocaleString("de-DE")}</div>
          <div class="rental-per-mo">/ mes</div>
        </div>
      </div>
      <div class="rental-card-bottom">
        <span class="rental-platform-badge">${r.platform}</span>
        <a href="${r.website}" target="_blank" rel="noopener" class="rental-link"
           onclick="event.stopPropagation()">Ver oferta →</a>
      </div>
    </div>`;
  }).join("");
}

function updateCount(n) {
  const el = document.getElementById("rentals-count");
  if (el) el.textContent = n;
}

function onRentalCardClick(origIdx, lat, lng) {
  highlightCard(origIdx);
  if (rentalsMap) {
    rentalsMap.setView([lat, lng], 14, { animate: true });
    _markerObjects[origIdx]?.openPopup();
  }
}

// Fallback: self-init after all external resources (including Leaflet CDN) are loaded
window.addEventListener("load", () => { if (!rentalsMap) initRentalsMap(); });
