# Euro & Vuelos · AICM → Berlín

**Live:** https://flights-tracker-nglw.onrender.com/

Dashboard para monitorear el tipo de cambio EUR/MXN y planificar un traslado de Ciudad de México a Berlín. Muestra pronósticos del euro, precios históricos de vuelos desde el AICM y rentas actuales en Berlín (habitaciones y pisos completos), todo en una sola pantalla.

---

## Funcionalidades

### Euro / Peso Mexicano
- Tipo de cambio en tiempo real (Banxico API → yfinance → valor sintético como respaldo)
- Pronóstico Holt-Winters hasta 3 años (entrenado con datos 2003–2019)
- Tabla comparativa de compra/venta en los principales bancos mexicanos

### Vuelos MEX → Berlín y alrededores
- Precios históricos mensuales 2022–2025 para BER, HAM, HAJ y DRS
- Comparador de aerolíneas con precio estimado por fecha (Iberia, KLM, Air France, Aeroméxico, Lufthansa, British Airways)
- Integración opcional con Amadeus API para precios en tiempo real

### Rentas en Berlín
- Mapa interactivo (Leaflet) con marcadores de precio por zona
- 28 anuncios: 14 habitaciones (WG, €420–750/mes) y 14 pisos completos (€1,050–2,250/mes)
- **La lista de anuncios se actualiza al mover o acercar el mapa** — solo muestra lo que hay en la vista actual
- Filtros por tipo (Habitación / Piso) y por rango de precio
- Plataformas: WG-Gesucht, ImmobilienScout24, Immowelt, Kleinanzeigen, Wunderflats

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI + APScheduler |
| Pronóstico | statsmodels (Holt-Winters / ExponentialSmoothing) |
| Tipo de cambio | yfinance · Banxico API |
| Vuelos | Amadeus API (sandbox) |
| Frontend | Vanilla JS · Chart.js 4 · Leaflet.js 1.9 |
| Deploy | Render.com (backend) · GitHub Pages (frontend estático) |

---

## Uso local

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
# Abre http://localhost:8000
```

Variables de entorno opcionales (`.env`):

```
BANXICO_TOKEN=...        # token API SIE de Banxico
AMADEUS_API_KEY=...      # Amadeus for Developers (sandbox)
AMADEUS_API_SECRET=...
```

Sin credenciales el dashboard funciona con datos sintéticos y estimaciones.
