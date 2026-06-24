let forecastChart = null;

function renderRate(data) {
  document.getElementById("current-rate").textContent = (+data.current_rate).toFixed(4);
  const change = data.change_1d || 0, pct = data.change_pct_1d || 0;
  const sign = change >= 0 ? "+" : "";
  const el = document.getElementById("rate-change");
  el.textContent = `${sign}${change.toFixed(4)}`;
  el.className = "rate-change " + (change >= 0 ? "up" : "down");
  const pctEl = document.getElementById("rate-change-pct");
  if (pctEl) pctEl.textContent = `${sign}${pct.toFixed(2)}% · variación 24h`;
}

function renderForecastChart(chartData) {
  const canvas = document.getElementById("forecast-chart");
  if (!canvas) return;
  const hist = chartData.historical || [], fc = chartData.forecast || [];
  const cutoff = chartData.training_cutoff || "2019-12-31";
  const histTrain  = hist.filter(p => p.date <= cutoff);
  const histActual = hist.filter(p => p.date > cutoff);
  if (forecastChart) { forecastChart.destroy(); forecastChart = null; }
  forecastChart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        {label:"_upper",data:fc.map(p=>({x:p.date,y:p.yhat_upper})),borderWidth:0,pointRadius:0,
         fill:"+1",backgroundColor:"rgba(251,146,60,0.18)",tension:0.4},
        {label:"_lower",data:fc.map(p=>({x:p.date,y:p.yhat_lower})),borderWidth:0,pointRadius:0,fill:false,tension:0.4},
        {label:"Histórico (2003–2019)",data:histTrain.map(p=>({x:p.date,y:p.value})),
         borderColor:"#3b82f6",borderWidth:1.5,pointRadius:0,fill:false,tension:0.2},
        {label:"Real 2020–2024 (referencia)",data:histActual.map(p=>({x:p.date,y:p.value})),
         borderColor:"#64748b",borderWidth:1.5,borderDash:[5,4],pointRadius:0,fill:false,tension:0.2},
        {label:"Pronóstico del modelo",data:fc.map(p=>({x:p.date,y:p.yhat})),
         borderColor:"#fb923c",borderWidth:1.5,borderDash:[6,3],pointRadius:0,fill:false,tension:0.4},
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:"index",intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:item=>!item.dataset.label.startsWith("_"),
          callbacks:{label:ctx=>` ${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`},
        },
      },
      scales:{
        x:{type:"time",time:{unit:"year",tooltipFormat:"MMM yyyy"},
           ticks:{color:"#475569",maxTicksLimit:10},grid:{color:"#1e293b"}},
        y:{ticks:{color:"#475569",callback:v=>`$${v}`},grid:{color:"#1e293b"}},
      },
    },
  });
}

function renderBanksTable(data) {
  const tbody = document.getElementById("banks-tbody");
  if (!tbody) return;
  const banks = (data.banks||[]).slice().sort((a,b)=>a.sell-b.sell);
  const cheapest = banks[0]?.sell;
  tbody.innerHTML = banks.map((b,i)=>{
    const best = i===0||b.sell===cheapest;
    return `<tr${best?' class="best-rate"':''}>
      <td>${best?'<span class="star-badge">★</span>':''}${b.name}</td>
      <td>$${b.buy.toFixed(4)}</td><td>$${b.sell.toFixed(4)}</td><td>${b.spread.toFixed(4)}</td>
    </tr>`;
  }).join("");
}
