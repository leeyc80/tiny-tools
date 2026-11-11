/*
 * Canada take-home pay estimator — 2026 (CRA T4127, 123rd ed. July 2026 / 122nd ed. Jan 2026; TD1 2026).
 * Annual (Option 1 style) calculation for an employee claiming basic personal amounts only.
 * BC uses the annual (unprorated) 2026 values: lowest rate 5.60 %, tax reduction $690.
 * Update every January (and July if CRA publishes mid-year changes).
 */
const RATES = {
  year: 2026,
  cpp: {ympe: 74600, yampe: 85000, exempt: 3500, rate: 0.0595, baseRate: 0.0495, cpp2Rate: 0.04},
  ei: {mie: 68900, rate: 0.0163},
  fed: {A: [0, 58523, 117045, 181440, 258482], R: [0.14, 0.205, 0.26, 0.29, 0.33], bpaMax: 16452, bpaMin: 14829, cea: 1501},
  prov: {
    ON: {A: [0, 53891, 107785, 150000, 220000], V: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], bpa: 12989,
         reduction: 300, surtax: [[5818, 0.20], [7446, 0.36]], ohp: true},
    BC: {A: [0, 50363, 100728, 115648, 140430, 190405, 265545], V: [0.056, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], bpa: 13216,
         bcReduction: {base: 690, threshold: 25570, rate: 0.0356}},
    AB: {A: [0, 61200, 154259, 185111, 246813, 370220], V: [0.08, 0.10, 0.12, 0.13, 0.14, 0.15], bpa: 22769},
  },
};

const bracket = (inc, A, R) => {
  let t = 0;
  for (let i = 0; i < A.length; i++) {
    const hi = i + 1 < A.length ? A[i + 1] : Infinity;
    if (inc > A[i]) t += (Math.min(inc, hi) - A[i]) * R[i];
  }
  return t;
};

// Ontario Health Premium (not indexed)
const ohp = a => {
  if (a <= 20000) return 0;
  if (a <= 36000) return Math.min(300, (a - 20000) * 0.06);
  if (a <= 48000) return Math.min(450, 300 + (a - 36000) * 0.06);
  if (a <= 72000) return Math.min(600, 450 + (a - 48000) * 0.25);
  if (a <= 200000) return Math.min(750, 600 + (a - 72000) * 0.25);
  return Math.min(900, 750 + (a - 200000) * 0.25);
};

function annualDeductions(income, prov) {
  const r = RATES, c = r.cpp, P = r.prov[prov];
  const I = Math.max(0, income);
  const cpp = Math.max(0, Math.min(I, c.ympe) - c.exempt) * c.rate;
  const cppBase = cpp * c.baseRate / c.rate;          // credit portion
  const cppAdd1 = cpp - cppBase;                       // first additional → deduction from income (F5)
  const cpp2 = Math.max(0, Math.min(I, c.yampe) - c.ympe) * c.cpp2Rate;  // deduction from income
  const ei = Math.min(I, r.ei.mie) * r.ei.rate;
  const A = Math.max(0, I - cppAdd1 - cpp2);           // taxable income

  // Federal
  const f = r.fed, low = f.R[0];
  const bpaf = A <= f.A[3] ? f.bpaMax : A >= f.A[4] ? f.bpaMin
    : f.bpaMax - (A - f.A[3]) * (f.bpaMax - f.bpaMin) / (f.A[4] - f.A[3]);
  const fed = Math.max(0, bracket(A, f.A, f.R) - low * bpaf - low * (cppBase + ei) - low * Math.min(I, f.cea));

  // Provincial
  const v0 = P.V[0];
  const t4 = Math.max(0, bracket(A, P.A, P.V) - v0 * P.bpa - v0 * (cppBase + ei));
  let provTax = t4;
  if (prov === 'ON') {
    const v1 = P.surtax.reduce((s, [th, rt]) => s + Math.max(0, t4 - th) * rt, 0);
    const s = Math.max(0, Math.min(t4 + v1, 2 * P.reduction - (t4 + v1)));
    provTax = Math.max(0, t4 + v1 - s) + ohp(A);
  } else if (prov === 'BC') {
    const b = P.bcReduction;
    const s = A <= b.threshold ? b.base : Math.max(0, b.base - (A - b.threshold) * b.rate);
    provTax = Math.max(0, t4 - Math.min(t4, s));
  }
  const total = cpp + cpp2 + ei + fed + provTax;
  return {gross: I, cpp, cpp2, ei, fed, prov: provTax, total, net: I - total, taxable: A};
}

/* ---------------- UI ---------------- */
const I18N = {
  ko: {
    mode: '입력 방식', hourly: '시급', salary: '연봉', wage: '시급', hours: '주당 근무 시간', ot: '주당 초과근무 시간', otHint: '1.5배',
    vac: '휴가수당 (Vacation pay)', vacNone: '없음 / 별도 지급', annual: '연봉', freq: '급여 주기', prov: '주 (Province)',
    weekly: '매주 (연 52회)', biweekly: '2주마다 (연 26회)', semi: '월 2회 (연 24회)', monthly: '매월 (연 12회)',
    ON: '온타리오 (ON)', BC: '브리티시컬럼비아 (BC)', AB: '앨버타 (AB)',
    perPay: '1회 실수령액', perPayOf: f => `${f} 기준`, item: '항목', per: '1회', yr: '연간',
    gross: '총급여 (세전)', cpp: 'CPP (연금)', cpp2: 'CPP2 (추가 연금)', ei: 'EI (고용보험)', fed: '연방 소득세', provTax: '주 소득세',
    total: '공제 합계', net: '실수령액', eff: d => `공제율 ${d}% · 연 실수령 ${'{net}'}`,
    hourlyNet: h => `실수령 기준 시급 약 ${h}`, krw: '원화로 보기', krwNote: r => `1 CAD = ${r}원 (유럽중앙은행 기준환율)`,
    fxFail: '환율을 불러오지 못했습니다',
  },
  en: {
    mode: 'Pay type', hourly: 'Hourly', salary: 'Salary', wage: 'Hourly wage', hours: 'Hours per week', ot: 'Overtime hours per week', otHint: '1.5×',
    vac: 'Vacation pay', vacNone: 'None / paid separately', annual: 'Annual salary', freq: 'Pay frequency', prov: 'Province',
    weekly: 'Weekly (52/yr)', biweekly: 'Bi-weekly (26/yr)', semi: 'Semi-monthly (24/yr)', monthly: 'Monthly (12/yr)',
    ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta',
    perPay: 'Take-home per pay', perPayOf: f => f, item: 'Item', per: 'Per pay', yr: 'Annual',
    gross: 'Gross pay', cpp: 'CPP', cpp2: 'CPP2', ei: 'EI premiums', fed: 'Federal tax', provTax: 'Provincial tax',
    total: 'Total deductions', net: 'Net pay', eff: d => `Deductions ${d}% of gross · ${'{net}'} net per year`,
    hourlyNet: h => `≈ ${h} per hour after deductions`, krw: 'Show in KRW', krwNote: r => `1 CAD = ₩${r} (ECB reference rate)`,
    fxFail: 'Could not load the exchange rate',
  },
};

(function () {
  const app = typeof document !== 'undefined' && document.getElementById('app');
  if (!app) return;
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  const t = I18N[lang];
  const cad = n => '$' + n.toLocaleString('en-CA', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const FREQ = {weekly: 52, biweekly: 26, semi: 24, monthly: 12};

  app.innerHTML = `
  <div class="card">
    <div class="field"><label>${t.mode}</label>
      <div class="seg" id="mode"><button data-v="hourly" aria-pressed="true">${t.hourly}</button><button data-v="salary" aria-pressed="false">${t.salary}</button></div></div>
    <div id="hourlyBox">
      <div class="field"><label for="wage">${t.wage}</label><span class="pre">$</span><input id="wage" inputmode="decimal" placeholder="20.00"></div>
      <div class="field"><label for="hours">${t.hours}</label><input id="hours" inputmode="decimal" value="40"></div>
      <div class="field"><label for="ot">${t.ot}</label><input id="ot" inputmode="decimal" value="0"><span class="hint">${t.otHint}</span></div>
      <div class="field"><label for="vac">${t.vac}</label><select id="vac"><option value="0">${t.vacNone}</option><option value="4">4%</option><option value="6">6%</option></select></div>
    </div>
    <div id="salaryBox" hidden>
      <div class="field"><label for="annual">${t.annual}</label><span class="pre">$</span><input id="annual" inputmode="decimal" placeholder="60,000"></div>
    </div>
    <div class="field"><label for="freq">${t.freq}</label><select id="freq">
      <option value="weekly">${t.weekly}</option><option value="biweekly" selected>${t.biweekly}</option><option value="semi">${t.semi}</option><option value="monthly">${t.monthly}</option></select></div>
    <div class="field"><label for="prov">${t.prov}</label><select id="prov">
      ${Object.keys(RATES.prov).map(p => `<option value="${p}">${t[p]}</option>`).join('')}</select></div>
  </div>
  <div class="card">
    <p class="sub" id="lbl">${t.perPay}</p>
    <p class="big" id="big">$0.00</p>
    <p class="conv" id="conv"></p>
    <p class="sub" id="eff"></p>
    <table class="tbl"><thead><tr><th>${t.item}</th><th>${t.per}</th><th>${t.yr}</th></tr></thead><tbody id="rows"></tbody></table>
    ${lang === 'ko' ? `<label class="check"><input type="checkbox" id="krw"> ${t.krw}</label><p class="sub" id="fx"></p>` : ''}
  </div>`;

  const $ = id => document.getElementById(id);
  const num = id => { const v = parseFloat(String($(id).value).replace(/[^\d.]/g, '')); return isFinite(v) && v > 0 ? v : 0; };
  let mode = 'hourly', fxRate = 0;

  function calc() {
    const per = FREQ[$('freq').value];
    let annual;
    if (mode === 'hourly') {
      const w = num('wage');
      annual = (w * num('hours') + w * 1.5 * num('ot')) * 52 * (1 + (+$('vac').value) / 100);
    } else annual = num('annual');
    const d = annualDeductions(annual, $('prov').value);
    const rows = [['gross', d.gross], ['cpp', d.cpp], ...(d.cpp2 > 0 ? [['cpp2', d.cpp2]] : []), ['ei', d.ei], ['fed', d.fed], ['provTax', d.prov], ['total', d.total], ['net', d.net]];
    $('rows').innerHTML = rows.map(([k, v]) => `<tr class="${k === 'net' ? 'net' : k === 'total' ? 'tot' : ''}"><td>${t[k]}</td><td>${(k === 'gross' || k === 'net' ? '' : '−') + cad(v / per)}</td><td>${cad(v)}</td></tr>`).join('').replace(/−\$0\.00/g, '$0.00');
    $('lbl').textContent = `${t.perPay} · ${t.perPayOf($('freq').selectedOptions[0].text)}`;
    $('big').textContent = cad(d.net / per);
    const pct = d.gross ? (d.total / d.gross * 100).toFixed(1) : '0.0';
    let eff = t.eff(pct).replace('{net}', cad(d.net));
    if (mode === 'hourly' && num('wage') && (num('hours') + num('ot'))) eff += ' · ' + t.hourlyNet(cad(d.net / 52 / (num('hours') + num('ot'))));
    $('eff').textContent = eff;
    if ($('conv')) $('conv').textContent = fxRate && $('krw') && $('krw').checked && d.net ? `≈ ${Math.round(d.net / per * fxRate).toLocaleString('ko-KR')}원 · 연 ${Math.round(d.net * fxRate / 10000).toLocaleString('ko-KR')}만원` : '';
    try { localStorage.setItem('cap-state', JSON.stringify({mode, wage: $('wage').value, hours: $('hours').value, ot: $('ot').value, vac: $('vac').value, annual: $('annual').value, freq: $('freq').value, prov: $('prov').value, krw: $('krw') ? $('krw').checked : false})); } catch (e) {}
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === m));
    $('hourlyBox').hidden = m !== 'hourly'; $('salaryBox').hidden = m !== 'salary';
    calc();
  }
  $('mode').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.v); };
  ['wage', 'hours', 'ot', 'annual'].forEach(id => $(id).addEventListener('input', calc));
  $('annual').addEventListener('input', () => { const r = $('annual').value.replace(/[^\d.]/g, ''); if (r) { const [i, d] = r.split('.'); $('annual').value = (+i).toLocaleString('en-CA') + (d !== undefined ? '.' + d.slice(0, 2) : ''); } });
  ['vac', 'freq', 'prov'].forEach(id => $(id).addEventListener('change', calc));

  async function loadFx() {
    try {
      const r = await fetch('https://api.frankfurter.dev/v1/latest?from=CAD&to=KRW');
      const j = await r.json();
      fxRate = j.rates.KRW;
      $('fx').textContent = t.krwNote(fxRate.toLocaleString('ko-KR', {maximumFractionDigits: 2})) + ` · ${j.date}`;
    } catch (e) { $('fx').textContent = t.fxFail; }
    calc();
  }
  if ($('krw')) $('krw').addEventListener('change', () => { if ($('krw').checked && !fxRate) loadFx(); else { if (!$('krw').checked) $('fx').textContent = ''; calc(); } });

  let st = {};
  try { st = JSON.parse(localStorage.getItem('cap-state') || '{}'); } catch (e) {}
  ['wage', 'hours', 'ot', 'annual'].forEach(id => { if (st[id] != null && st[id] !== '') $(id).value = st[id]; });
  ['vac', 'freq', 'prov'].forEach(id => { if (st[id] && [...$(id).options].some(o => o.value === st[id])) $(id).value = st[id]; });
  if ($('krw') && st.krw) { $('krw').checked = true; loadFx(); }
  setMode(st.mode === 'salary' ? 'salary' : 'hourly');
})();

if (typeof module !== 'undefined') module.exports = {annualDeductions, RATES};
