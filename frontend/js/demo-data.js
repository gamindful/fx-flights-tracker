// ── Shared constants ─────────────────────────────────────────────────────────
const SEASONAL = [0.85,0.87,0.92,1.08,0.94,1.02,1.22,1.18,0.90,0.88,0.96,1.25];
const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const HISTORY_YEARS = [2022,2023,2024,2025];
const AIRLINE_FLAGS = {IB:"🇪🇸",KL:"🇳🇱",AF:"🇫🇷",AM:"🇲🇽",LH:"🇩🇪",BA:"🇬🇧",LX:"🇨🇭"};

function _noise(seed) { return Math.sin(seed * 7.3 + 1.4) * 0.05; }

// ── Flight history ───────────────────────────────────────────────────────────
const BASE_PRICES = {BER:17000,HAM:16000,HAJ:15500,DRS:16200};

function buildFlightHistory(basePrice, destCode) {
  const today = new Date();
  const monthly = MONTH_LABELS.map((label, mi) => {
    const by_year = {}, all = [];
    HISTORY_YEARS.forEach((yr, yi) => {
      if (yr > today.getFullYear()) return;
      if (yr === today.getFullYear() && mi > today.getMonth()) return;
      const price = Math.round(basePrice * SEASONAL[mi] * (1+yi*0.032) * (1+_noise(yr+mi*0.1)) / 500) * 500;
      by_year[yr] = price; all.push(price);
    });
    if (!all.length) return {month:mi+1,month_label:label,mean:null,min:null,max:null,by_year};
    return {
      month: mi+1, month_label: label,
      mean: Math.round(all.reduce((a,b)=>a+b,0)/all.length/500)*500,
      min:  Math.round(Math.min(...all)*0.87/500)*500,
      max:  Math.round(Math.max(...all)*1.13/500)*500,
      by_year,
    };
  });
  return {dest:destCode, years:HISTORY_YEARS, monthly};
}

const DEMO_FLIGHT_HISTORY = {
  BER: buildFlightHistory(17000,"BER"),
  HAM: buildFlightHistory(16000,"HAM"),
  HAJ: buildFlightHistory(15500,"HAJ"),
  DRS: buildFlightHistory(16200,"DRS"),
};

const AIRLINE_PROFILES = {
  BER: [
    {airline:"Iberia",         code:"IB",via:"Madrid (MAD)",   mult:0.96,duration:"17h 10min"},
    {airline:"KLM",            code:"KL",via:"Ámsterdam (AMS)",mult:1.00,duration:"16h 20min"},
    {airline:"Air France",     code:"AF",via:"París (CDG)",    mult:1.05,duration:"16h 45min"},
    {airline:"Aeroméxico",     code:"AM",via:"París (CDG)",    mult:1.09,duration:"17h 00min"},
    {airline:"Lufthansa",      code:"LH",via:"Frankfurt (FRA)",mult:1.14,duration:"15h 30min"},
    {airline:"British Airways",code:"BA",via:"Londres (LHR)",  mult:1.18,duration:"15h 55min"},
  ],
  HAM: [
    {airline:"KLM",       code:"KL",via:"Ámsterdam (AMS)",mult:0.97,duration:"15h 50min"},
    {airline:"Air France",code:"AF",via:"París (CDG)",    mult:1.04,duration:"16h 30min"},
    {airline:"Lufthansa", code:"LH",via:"Frankfurt (FRA)",mult:1.11,duration:"15h 10min"},
  ],
  HAJ: [
    {airline:"KLM",      code:"KL",via:"Ámsterdam (AMS)",mult:0.96,duration:"15h 40min"},
    {airline:"Lufthansa",code:"LH",via:"Frankfurt (FRA)",mult:1.06,duration:"14h 55min"},
  ],
  DRS: [
    {airline:"Swiss",    code:"LX",via:"Zúrich (ZRH)",  mult:0.97,duration:"16h 05min"},
    {airline:"Lufthansa",code:"LH",via:"Múnich (MUC)",  mult:1.06,duration:"15h 20min"},
  ],
};

function estimateAirlines(destCode, dateStr) {
  const dt = dateStr ? new Date(dateStr+"T12:00:00") : new Date();
  const mi = dt.getMonth(), yr = dt.getFullYear();
  const base = (BASE_PRICES[destCode]||17000) * SEASONAL[mi] * (1+Math.max(0,yr-2022)*0.032) * (1+_noise(yr+mi*0.1));
  return (AIRLINE_PROFILES[destCode]||[])
    .map(a=>({airline:a.airline,code:a.code,via:a.via,
              price_mxn:Math.round(base*a.mult/500)*500,duration:a.duration,stops:1}))
    .sort((a,b)=>a.price_mxn-b.price_mxn);
}

// ── EUR/MXN demo data ────────────────────────────────────────────────────────
(function() {
  const hist=[], fc=[];
  let v=12.5;
  for(let i=0;i<12*22;i++){
    const d=new Date("2003-01-01"); d.setMonth(d.getMonth()+i);
    v*=1+(Math.random()-0.38)*0.018;
    hist.push({date:d.toISOString().slice(0,10),value:+v.toFixed(4)});
  }
  for(let i=0;i<12*28;i++){
    const d=new Date("2003-01-01"); d.setMonth(d.getMonth()+i);
    const yhat=12.5+i/(12*28)*13;
    fc.push({date:d.toISOString().slice(0,10),yhat:+yhat.toFixed(4),
             yhat_lower:+(yhat*0.88).toFixed(4),yhat_upper:+(yhat*1.12).toFixed(4)});
  }
  window.DEMO_EXCHANGE={current_rate:21.8432,change_1d:0.1245,change_pct_1d:0.57,
    chart:{historical:hist,forecast:fc,training_cutoff:"2019-12-31"}};
})();

window.DEMO_BANKS={
  reference_rate:21.8432,
  banks:[
    {name:"Actinver",             buy:21.516,sell:22.323,spread:0.807},
    {name:"Inbursa",              buy:21.408,sell:22.387,spread:0.979},
    {name:"Banxico (referencia)", buy:21.843,sell:21.843,spread:0.000},
    {name:"Santander México",     buy:21.428,sell:22.433,spread:1.005},
    {name:"BBVA México",          buy:21.406,sell:22.454,spread:1.048},
    {name:"Scotiabank México",    buy:21.406,sell:22.454,spread:1.048},
    {name:"Banorte",              buy:21.385,sell:22.498,spread:1.113},
    {name:"Citibanamex",          buy:21.363,sell:22.521,spread:1.158},
    {name:"HSBC México",          buy:21.341,sell:22.543,spread:1.202},
  ].sort((a,b)=>a.sell-b.sell),
};

// ── Berlin rental listings ───────────────────────────────────────────────────
window.DEMO_RENTALS = [
  // ── Habitaciones (rooms in shared flats / WGs) ──────────────────────────
  {neighborhood:"Mitte",          lat:52.5218,lng:13.4020,price_eur:750, size_m2:15,rooms:4,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Prenzlauer Berg",lat:52.5360,lng:13.4180,price_eur:680, size_m2:18,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Kreuzberg",      lat:52.4995,lng:13.4010,price_eur:620, size_m2:14,rooms:4,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Friedrichshain", lat:52.5170,lng:13.4510,price_eur:645, size_m2:13,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Neukölln",       lat:52.4830,lng:13.4310,price_eur:500, size_m2:16,rooms:4,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Schöneberg",     lat:52.4870,lng:13.3490,price_eur:580, size_m2:15,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Charlottenburg", lat:52.5190,lng:13.3040,price_eur:700, size_m2:16,rooms:4,category:"habitacion",type:"Habitación",
   platform:"Immowelt",     website:"https://www.immowelt.de/suche/berlin/zimmer/mieten"},
  {neighborhood:"Pankow",         lat:52.5680,lng:13.4000,price_eur:480, size_m2:20,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Wedding",        lat:52.5510,lng:13.3600,price_eur:450, size_m2:18,rooms:4,category:"habitacion",type:"Habitación",
   platform:"Kleinanzeigen", website:"https://www.kleinanzeigen.de/s-wg-zimmer/berlin/"},
  {neighborhood:"Tempelhof",      lat:52.4700,lng:13.3800,price_eur:520, size_m2:17,rooms:3,category:"habitacion",type:"Habitación",
   platform:"Kleinanzeigen", website:"https://www.kleinanzeigen.de/s-wg-zimmer/berlin/"},
  {neighborhood:"Spandau",        lat:52.5370,lng:13.1990,price_eur:420, size_m2:22,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Lichtenberg",    lat:52.5130,lng:13.4970,price_eur:460, size_m2:19,rooms:4,category:"habitacion",type:"Habitación",
   platform:"Kleinanzeigen", website:"https://www.kleinanzeigen.de/s-wg-zimmer/berlin/"},
  {neighborhood:"Steglitz",       lat:52.4600,lng:13.3220,price_eur:490, size_m2:17,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},
  {neighborhood:"Treptow",        lat:52.4960,lng:13.4640,price_eur:510, size_m2:18,rooms:3,category:"habitacion",type:"Habitación",
   platform:"WG-Gesucht",   website:"https://www.wg-gesucht.de/zimmer-in-Berlin.8.0.1.0.html"},

  // ── Pisos (whole flats) ─────────────────────────────────────────────────
  {neighborhood:"Mitte",          lat:52.5200,lng:13.4050,price_eur:1950,size_m2:58, rooms:2,category:"piso",type:"Piso",
   platform:"ImmobilienScout24",  website:"https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten"},
  {neighborhood:"Prenzlauer Berg",lat:52.5392,lng:13.4143,price_eur:1680,size_m2:70, rooms:3,category:"piso",type:"Piso",
   platform:"Immowelt",           website:"https://www.immowelt.de/suche/berlin/wohnungen/mieten"},
  {neighborhood:"Kreuzberg",      lat:52.4981,lng:13.3978,price_eur:1450,size_m2:62, rooms:2,category:"piso",type:"Piso",
   platform:"WG-Gesucht",         website:"https://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.1.0.html"},
  {neighborhood:"Neukölln",       lat:52.4811,lng:13.4374,price_eur:1180,size_m2:75, rooms:3,category:"piso",type:"Piso",
   platform:"Kleinanzeigen",      website:"https://www.kleinanzeigen.de/s-wohnungen-mieten/berlin/"},
  {neighborhood:"Charlottenburg", lat:52.5167,lng:13.3059,price_eur:2250,size_m2:85, rooms:3,category:"piso",type:"Piso",
   platform:"ImmobilienScout24",  website:"https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten"},
  {neighborhood:"Friedrichshain", lat:52.5155,lng:13.4546,price_eur:1520,size_m2:65, rooms:2,category:"piso",type:"Piso",
   platform:"Wunderflats",        website:"https://wunderflats.com/en/furnished-apartments/berlin"},
  {neighborhood:"Schöneberg",     lat:52.4852,lng:13.3537,price_eur:1790,size_m2:68, rooms:2,category:"piso",type:"Piso",
   platform:"Immowelt",           website:"https://www.immowelt.de/suche/berlin/wohnungen/mieten"},
  {neighborhood:"Pankow",         lat:52.5657,lng:13.4020,price_eur:1350,size_m2:80, rooms:3,category:"piso",type:"Piso",
   platform:"WG-Gesucht",         website:"https://www.wg-gesucht.de/wohnungen-in-Berlin.8.2.1.0.html"},
  {neighborhood:"Wedding",        lat:52.5479,lng:13.3629,price_eur:1120,size_m2:78, rooms:3,category:"piso",type:"Piso",
   platform:"Kleinanzeigen",      website:"https://www.kleinanzeigen.de/s-wohnungen-mieten/berlin/"},
  {neighborhood:"Tempelhof",      lat:52.4682,lng:13.3832,price_eur:1280,size_m2:72, rooms:2,category:"piso",type:"Piso",
   platform:"ImmobilienScout24",  website:"https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten"},
  {neighborhood:"Spandau",        lat:52.5350,lng:13.2014,price_eur:1050,size_m2:90, rooms:3,category:"piso",type:"Piso",
   platform:"Immowelt",           website:"https://www.immowelt.de/suche/berlin/wohnungen/mieten"},
  {neighborhood:"Lichtenberg",    lat:52.5113,lng:13.5006,price_eur:1160,size_m2:76, rooms:3,category:"piso",type:"Piso",
   platform:"Wunderflats",        website:"https://wunderflats.com/en/furnished-apartments/berlin"},
  {neighborhood:"Steglitz",       lat:52.4584,lng:13.3200,price_eur:1380,size_m2:65, rooms:2,category:"piso",type:"Piso",
   platform:"ImmobilienScout24",  website:"https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten"},
  {neighborhood:"Treptow",        lat:52.4955,lng:13.4614,price_eur:1240,size_m2:70, rooms:2,category:"piso",type:"Piso",
   platform:"Immowelt",           website:"https://www.immowelt.de/suche/berlin/wohnungen/mieten"},
];
