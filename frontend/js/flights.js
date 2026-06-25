let priceChart = null;
let activeDest = "BER";
let activeMonthIdx = null;
let activeDateStr = null;

const DEST_NAMES = {BER:"Berlin Brandenburg",HAM:"Hamburgo",HAJ:"Hannover",DRS:"Dresden"};

async function fetchHistory(dest) {
  try {
    const r = await fetch(`api/flights/history?dest=${dest}`);
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return DEMO_FLIGHT_HISTORY[dest]; }
}

async function fetchAirlines(dest, dateStr) {
  try {
    const r = await fetch(`api/flights/airlines?dest=${dest}&date=${dateStr}`);
    if (!r.ok) throw new Error();
    return await r.json();
  } catch { return {airlines:estimateAirlines(dest,dateStr),source:"estimate"}; }
}

function buildPriceChart(history) {
  const canvas = document.getElementById("price-chart");
  if (!canvas) return;
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  const months = history.monthly;
  const today = new Date(), curYear = today.getFullYear();
  priceChart = new Chart(canvas, {
    type:"line",
    data:{
      labels: months.map(m=>m.month_label),
      datasets:[
        {label:"_max",data:months.map(m=>m.max),borderWidth:0,pointRadius:0,
         fill:"+1",backgroundColor:"rgba(99,102,241,0.15)",tension:0.4},
        {label:"_min",data:months.map(m=>m.min),borderWidth:0,pointRadius:0,fill:false,tension:0.4},
        {label:"Media histórica",data:months.map(m=>m.mean),borderColor:"#6366f1",borderWidth:2,
         pointRadius:3,pointBackgroundColor:"#6366f1",fill:false,tension:0.4},
        {label:"Año actual",data:months.map(m=>m.by_year?.[curYear]??null),borderColor:"#f97316",
         borderWidth:2,borderDash:[5,4],pointRadius:3,pointBackgroundColor:"#f97316",
         fill:false,tension:0.4,spanGaps:false},
        {label:"Seleccionado",data:new Array(12).fill(null),borderColor:"#facc15",
         backgroundColor:"#facc15",borderWidth:0,pointRadius:8,pointHoverRadius:10,showLine:false,fill:false},
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      onClick:(evt,_,chart)=>{
        const els=chart.getElementsAtEventForMode(evt,"index",{intersect:false},false);
        if(els.length) selectMonth(els[0].index);
      },
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:item=>!item.dataset.label.startsWith("_"),
          callbacks:{label:ctx=>{
            if(ctx.dataset.label==="Seleccionado"&&ctx.parsed.y===null) return null;
            return ` ${ctx.dataset.label}: $${(ctx.parsed.y||0).toLocaleString("es-MX")}`;
          }},
        },
      },
      scales:{
        x:{ticks:{color:"#475569"},grid:{color:"#1e293b"}},
        y:{ticks:{color:"#475569",callback:v=>`$${(v/1000).toFixed(0)}k`},grid:{color:"#1e293b"}},
      },
    },
  });
}

function setChartMarker(monthIdx, value) {
  if (!priceChart) return;
  const data = new Array(12).fill(null);
  if (monthIdx!==null && value!==null) data[monthIdx]=value;
  priceChart.data.datasets[4].data=data;
  priceChart.update("none");
}

function selectMonth(monthIdx) {
  activeMonthIdx=monthIdx;
  const today=new Date(), mo=monthIdx+1;
  let yr=today.getFullYear();
  if(mo<today.getMonth()+1) yr+=1;
  const dateStr=`${yr}-${String(mo).padStart(2,"0")}-15`;
  activeDateStr=dateStr;
  const dp=document.getElementById("flight-date");
  if(dp) dp.value=dateStr;
  const mean=DEMO_FLIGHT_HISTORY[activeDest]?.monthly[monthIdx]?.mean??null;
  setChartMarker(monthIdx,mean);
  loadAirlines(activeDest,dateStr);
}

function selectDate(dateStr) {
  if(!dateStr) return;
  activeDateStr=dateStr;
  const d=new Date(dateStr+"T12:00:00");
  const monthIdx=d.getMonth();
  activeMonthIdx=monthIdx;
  const mean=DEMO_FLIGHT_HISTORY[activeDest]?.monthly[monthIdx]?.mean??null;
  setChartMarker(monthIdx,mean);
  loadAirlines(activeDest,dateStr);
}

async function loadAirlines(dest, dateStr) {
  const result=await fetchAirlines(dest,dateStr);
  renderAirlinesList(result.airlines||[], dest, dateStr, result.source||"estimate");
}

function renderAirlinesList(airlines, dest, dateStr, source) {
  const d=new Date((dateStr||new Date().toISOString().slice(0,10))+"T12:00:00");
  document.getElementById("airlines-title").textContent=`MEX → ${DEST_NAMES[dest]||dest}`;
  document.getElementById("airlines-subtitle").textContent=
    d.toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"long",year:"numeric"});
  const badge=document.getElementById("price-source-badge");
  if(badge){badge.textContent=source==="amadeus"?"EN VIVO":"Estimado";
            badge.className="source-badge "+(source==="amadeus"?"live":"estimate");}
  const list=document.getElementById("airlines-list");
  if(!list) return;
  if(!airlines.length){list.innerHTML='<p style="color:#475569;font-size:.8rem;padding:12px 0">Sin resultados</p>';return;}
  const minPrice=Math.min(...airlines.map(a=>a.price_mxn));
  const kayakBase=`https://www.kayak.com/flights/MEX-${dest}/${dateStr||new Date().toISOString().slice(0,10)}`;
  list.innerHTML=airlines.map((a,i)=>{
    const best=a.price_mxn===minPrice;
    const flag=AIRLINE_FLAGS[a.code]||"✈️";
    const kayakUrl=`${kayakBase}?fs=airlines=${a.code}`;
    return `<div class="airline-simple-row">
      <span class="rank-badge${best?' best':''}">${i+1}°</span>
      <span class="airline-flag">${flag}</span>
      <div class="airline-info">
        <div><span class="airline-name">${a.airline}</span><span class="airline-code">${a.code}</span></div>
        <div class="airline-via">vía ${a.via} · ${a.duration} · ${a.stops} escala</div>
      </div>
      <div class="airline-price-col">
        <span class="price-pill ${best?'price-best':'price-normal'}">$${a.price_mxn.toLocaleString("es-MX")}</span>
        <a href="${kayakUrl}" target="_blank" rel="noopener" class="airline-link">Ver vuelo →</a>
      </div>
    </div>`;
  }).join("");
}

function switchDest(dest) {
  activeDest=dest;
  document.querySelectorAll(".dest-tab").forEach(b=>b.classList.toggle("active",b.dataset.dest===dest));
  fetchHistory(dest).then(h=>{
    buildPriceChart(h);
    if(activeDateStr) selectDate(activeDateStr);
    else { const n=new Date(); n.setMonth(n.getMonth()+1); selectDate(n.toISOString().slice(0,10).slice(0,8)+"15"); }
  });
}

async function initFlights() {
  document.querySelectorAll(".dest-tab").forEach(b=>b.addEventListener("click",()=>switchDest(b.dataset.dest)));
  const dp=document.getElementById("flight-date");
  if(dp) dp.addEventListener("change",e=>selectDate(e.target.value));
  const history=await fetchHistory(activeDest);
  buildPriceChart(history);
  const today=new Date();
  const next=new Date(today.getFullYear(),today.getMonth()+1,15);
  const ds=next.toISOString().slice(0,10);
  if(dp) dp.value=ds;
  selectDate(ds);
}
