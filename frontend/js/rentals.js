let rentalsMap = null;
const _markerObjects = [];
let _activeFilter = { min: 0, max: 99999 };
let _activeCategory = "all";

function _priceColor(price) {
  if (price < 600)  return "#22c55e";
  if (price < 1200) return "#facc15";
  if (price < 1800) return "#f97316";
  return "#ef4444";
}

function _makeIcon(price, category) {
  const color = _priceColor(price);
  const prefix = category === "habitacion" ? "H " : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};color:#0a0f1e;font-weight:800;font-size:10px;
      padding:3px 7px;border-radius:6px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.65);border:2px solid rgba(0,0,0,.35);
      cursor:pointer;line-height:1.4">${prefix}€${(price/1000).toFixed(1)}k</div>`,
    iconAnchor: [22, 12],
  });
}

function initRentalsMap() {
  if (rentalsMap) return;
  const el = document.getElementById("rentals-map");
  if (!el || typeof L === "undefined") return;

  rentalsMap = L.map("rentals-map", { center: [52.515, 13.39], zoom: 11 });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/" target="_blank">CARTO</a>',
    maxZoom: 19,
  }).addTo(rentalsMap);

  DEMO_RENTALS.forEach((r, i) => {
    const marker = L.marker([r.lat, r.lng], { icon: _makeIcon(r.price_eur, r.category) })
      .addTo(rentalsMap)
      .bindPopup(_popupHtml(r), { maxWidth: 230 });
    marker.on("click", () => highlightCard(i));
    _markerObjects.push(marker);
  });

  // Price filter buttons
  document.querySelectorAll(".rental-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rental-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _activeFilter = { min: +(btn.dataset.min || 0), max: +(btn.dataset.max || 99999) };
      applyFilter();
    });
  });

  // Category filter buttons
  document.querySelectorAll(".rental-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rental-cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _activeCategory = btn.dataset.category;
      applyFilter();
    });
  });

  // Viewport-based card refresh on map move/zoom
  rentalsMap.on("moveend", _refreshViewport);
  rentalsMap.on("zoomend", _refreshViewport);

  _refreshViewport();
}

function _matchesFilter(r) {
  return r.price_eur >= _activeFilter.min &&
         r.price_eur <= _activeFilter.max &&
         (_activeCategory === "all" || r.category === _activeCategory);
}

function _refreshViewport() {
  if (!rentalsMap) return;
  const bounds = rentalsMap.getBounds();
  const visible = DEMO_RENTALS.filter(r => _matchesFilter(r) && bounds.contains([r.lat, r.lng]));
  renderRentalCards(visible);
  updateCount(visible.length);
}

function _popupHtml(r) {
  const color = _priceColor(r.price_eur);
  const catLabel = r.category === "habitacion" ? "Habitación" : "Piso";
  const catColor = r.category === "habitacion" ? "#065f46" : "#1e1b4b";
  const catText  = r.category === "habitacion" ? "#6ee7b7" : "#a5b4fc";
  const detail   = r.category === "habitacion"
    ? `${r.size_m2} m² · en piso de ${r.rooms} hab.`
    : `${r.rooms} hab. · ${r.size_m2} m²`;
  return `<div style="font-family:system-ui;font-size:13px;line-height:1.6">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <strong>${r.neighborhood}</strong>
      <span style="font-size:.7em;padding:1px 6px;border-radius:3px;
        background:${catColor};color:${catText};font-weight:600">${catLabel}</span>
    </div>
    <span style="color:${color};font-size:1.15em;font-weight:700">
      €${r.price_eur.toLocaleString("de-DE")}/mes
    </span><br>
    <span style="color:#94a3b8;font-size:.85em">${detail}</span><br>
    <span style="font-size:.8em;color:#64748b">${r.platform}</span><br>
    <a href="${r.website}" target="_blank" rel="noopener"
       style="color:#6366f1;font-weight:600">Ver oferta →</a>
  </div>`;
}

function applyFilter() {
  // Update marker visibility (all of Berlin, just filtered by price+category)
  DEMO_RENTALS.forEach((r, i) => {
    if (_matchesFilter(r)) _markerObjects[i].addTo(rentalsMap);
    else _markerObjects[i].remove();
  });
  // Update cards for current viewport
  _refreshViewport();
}

function highlightCard(idx) {
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
    container.innerHTML = '<p style="color:#475569;font-size:.8rem;padding:12px 0">Sin propiedades en esta zona o rango.</p>';
    return;
  }
  container.innerHTML = sorted.map(r => {
    const origIdx = DEMO_RENTALS.indexOf(r);
    const color = _priceColor(r.price_eur);
    const catLabel = r.category === "habitacion" ? "Habitación" : "Piso";
    const catCls   = r.category === "habitacion" ? "rental-cat-badge--room" : "rental-cat-badge--flat";
    const detail   = r.category === "habitacion"
      ? `${r.size_m2} m² · en piso de ${r.rooms} hab.`
      : `${r.rooms} hab. · ${r.size_m2} m²`;
    return `<div class="rental-card" data-orig-idx="${origIdx}"
                 onclick="onRentalCardClick(${origIdx},${r.lat},${r.lng})">
      <div class="rental-card-top">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="rental-name">${r.neighborhood}</span>
            <span class="rental-cat-badge ${catCls}">${catLabel}</span>
          </div>
          <div class="rental-detail">${detail}</div>
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

window.addEventListener("load", () => { if (!rentalsMap) initRentalsMap(); });
