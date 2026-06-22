/* NanoFactory — ui.js
 * renderUI(), tab switching, all DOM update functions
 */

/* ── Formatting ───────────────────────────────────────────── */
function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'G';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (abs < 10 && abs > 0) return n.toFixed(1);
  return Math.floor(n).toString();
}

function fmtRate(n) {
  if (n === 0) return '';
  const s = (n > 0 ? '+' : '') + n.toFixed(2) + '/s';
  return s;
}

function fmtTime(s) {
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtCost(costObj) {
  return Object.entries(costObj)
    .map(([id, amt]) => `${fmt(amt)} ${getResName(id)}`)
    .join('  ');
}

function getResName(id) {
  const r = RESOURCES.find(x => x.id === id);
  return r ? r.name : id;
}

/* ── MODAL ───────────────────────────────────────────────── */
function showModal(title, body, buttons) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body.replace(/\n/g, '<br>');
  const actionsEl = document.getElementById('modal-actions');
  actionsEl.innerHTML = '';
  for (const btn of buttons) {
    const el = document.createElement('button');
    el.className = `btn ${btn.cls}`;
    el.textContent = btn.label;
    el.addEventListener('click', btn.action);
    actionsEl.appendChild(el);
  }
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ── TAB SWITCHING ───────────────────────────────────────── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add('active');
  gameState.ui.activeTab = tabId;
  if (tabId === 'research')  renderResearchTab();
  if (tabId === 'stats')     renderStatsTab();
  if (tabId === 'lore')      renderLoreTab();
}

/* ── TOOLTIP ─────────────────────────────────────────────── */
const tooltip = document.getElementById('tooltip');

function showTooltip(e, html) {
  tooltip.innerHTML = html;
  tooltip.classList.remove('hidden');
  positionTooltip(e);
}

function positionTooltip(e) {
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  let x = e.clientX + 12;
  let y = e.clientY + 12;
  if (x + tw > window.innerWidth)  x = e.clientX - tw - 8;
  if (y + th > window.innerHeight) y = e.clientY - th - 8;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
}

function hideTooltip() { tooltip.classList.add('hidden'); }

/* ── RESOURCES ───────────────────────────────────────────── */
function renderResourceList() {
  const el = document.getElementById('resource-list');
  if (!el) return;
  let html = '';
  for (const r of RESOURCES) {
    if (r.category === 'special') continue; // RP shown in research tab
    const res  = gameState.resources[r.id];
    const pct  = res.cap < Infinity ? Math.min(100, (res.amount / res.cap) * 100) : 0;
    const atCap = res.cap < Infinity && res.amount >= res.cap;
    const rateStr = fmtRate(res.perSecond);
    const rateCls = res.perSecond === 0 ? 'zero' : (atCap ? 'cap' : '');
    const capStr  = res.cap < Infinity ? fmt(res.cap) : '∞';

    html += `
    <div class="resource-row">
      <div class="resource-line">
        <div class="resource-name">${ICONS[r.id] || ''}<span>${r.name}</span></div>
        <div class="resource-amounts">${fmt(res.amount)} / ${capStr}${atCap ? ' <span class="accent">MAX</span>' : ''}</div>
        <div class="resource-rate ${rateCls}">${atCap ? 'MAX' : (rateStr || '0/s')}</div>
      </div>
      ${res.cap < Infinity ? `<div class="progress-wrap"><div class="progress-fill" style="width:${pct}%;background:${r.color}"></div></div>` : ''}
    </div>`;
  }
  el.innerHTML = html;
}

/* ── POWER ───────────────────────────────────────────────── */
function renderPower() {
  const el = document.getElementById('power-display');
  if (!el) return;
  const { generated, consumed, ratio } = gameState.power;
  const pct = consumed > 0 ? Math.min(100, (generated / consumed) * 100) : 100;
  const shortage = ratio < 1;
  const overPct  = shortage ? Math.min(100, ((consumed - generated) / consumed) * 100) : 0;

  el.innerHTML = `
    <div class="power-bar-wrap">
      <div class="power-bar-track">
        <div class="power-bar-gen" style="width:${Math.min(100, (generated / Math.max(consumed,1)) * 100).toFixed(1)}%"></div>
        ${shortage ? `<div class="power-bar-con" style="width:${overPct.toFixed(1)}%"></div>` : ''}
      </div>
      <div class="power-bar-label">
        <span class="${shortage ? 'power-shortage' : 'blue'}">${fmt(generated)} / ${fmt(consumed)} MW</span>
        <span class="${shortage ? 'danger' : 'muted'}">${shortage ? '[!] SHORTAGE' : (ratio*100).toFixed(0)+'%'}</span>
      </div>
    </div>`;
}

/* ── BUILDINGS ───────────────────────────────────────────── */
function renderBuildingList() {
  const el = document.getElementById('building-list');
  if (!el) return;
  const filter = gameState.ui.buildingFilter || 'all';
  let html = '';

  for (const b of BUILDINGS) {
    if (filter !== 'all' && b.category !== filter) continue;

    // Check unlock
    const locked = b.unlockedByResearch && !gameState.completedResearch.includes(b.unlockedByResearch);
    if (locked) continue; // hide entirely until unlocked

    const owned = gameState.buildings[b.id] || 0;
    const cost1 = getBuildingCostDisplay(b.id, 1);
    const canBuy1 = !!canAffordBuilding(b.id, 1);
    const costStr = fmtCost(cost1);

    const tooltipHtml = buildingTooltipHtml(b, owned);

    html += `
    <div class="building-card"
         data-bid="${b.id}"
         data-tooltip="${encodeURIComponent(tooltipHtml)}">
      <div class="building-line1">
        <div class="building-name">${ICONS[b.id] || ICONS.building || ''}<span>${b.name.toUpperCase()}</span></div>
        <div class="building-owned">${owned > 0 ? 'x' + owned : ''}</div>
      </div>
      <div class="building-line2">
        <div class="building-cost ${canBuy1 ? '' : 'cant-afford'}">${costStr}</div>
        <div class="building-buy-btns">
          <button class="btn btn-buy" data-bid="${b.id}" data-qty="1" ${canBuy1 ? '' : 'disabled'}>x1</button>
          <button class="btn btn-buy" data-bid="${b.id}" data-qty="10" ${canAffordBuilding(b.id,10) ? '' : 'disabled'}>x10</button>
          <button class="btn btn-buy" data-bid="${b.id}" data-qty="max" ${canBuy1 ? '' : 'disabled'}>MAX</button>
        </div>
      </div>
    </div>`;
  }

  if (!html) html = '<div class="muted small" style="padding:8px">Nothing available yet.</div>';
  el.innerHTML = html;

  // Attach tooltip listeners
  el.querySelectorAll('.building-card').forEach(card => {
    const rawHtml = decodeURIComponent(card.dataset.tooltip || '');
    card.addEventListener('mouseenter', e => showTooltip(e, rawHtml));
    card.addEventListener('mousemove',  e => positionTooltip(e));
    card.addEventListener('mouseleave', hideTooltip);
  });
}

function buildingTooltipHtml(b, owned) {
  let rows = '';
  if (b.input) {
    for (const [rid, rps] of Object.entries(b.input)) {
      rows += `<div class="tooltip-row"><span class="tooltip-label">In</span><span class="tooltip-val">${rps}/s ${getResName(rid)}</span></div>`;
    }
  }
  if (b.output) {
    for (const [rid, rps] of Object.entries(b.output)) {
      if (rid === 'mw') {
        rows += `<div class="tooltip-row"><span class="tooltip-label">Gen</span><span class="tooltip-val">+${rps} MW</span></div>`;
      } else {
        rows += `<div class="tooltip-row"><span class="tooltip-label">Out</span><span class="tooltip-val">${rps}/s ${getResName(rid)}</span></div>`;
      }
    }
  }
  if (b.energyCost > 0) {
    rows += `<div class="tooltip-row"><span class="tooltip-label">PWR</span><span class="tooltip-val">${b.energyCost} MW</span></div>`;
  }
  if (owned > 0 && b.output) {
    for (const [rid, rps] of Object.entries(b.output)) {
      if (rid !== 'mw') {
        rows += `<div class="tooltip-row"><span class="tooltip-label">Rate</span><span class="tooltip-val">+${(rps*owned).toFixed(2)}/s</span></div>`;
      }
    }
  }
  return rows || '<span class="muted">Storage building</span>';
}

/* ── COLLECT ─────────────────────────────────────────────── */
function renderCollectSection() {
  const sec = document.getElementById('collect-section');
  if (!sec) return;
  const autoUnlocked = gameState.completedResearch.includes('auto_collector');
  sec.style.display = autoUnlocked ? 'none' : '';
  const info = document.getElementById('collect-info');
  if (info) {
    info.textContent = '+10 ore / +5 coal per click';
  }
}

/* ── RESEARCH TAB ────────────────────────────────────────── */
function renderResearchTab() {
  const el = document.getElementById('research-list');
  const rpEl = document.getElementById('rp-display');
  if (!el) return;

  const rp = gameState.resources.research_points.amount;
  if (rpEl) rpEl.textContent = `${fmt(rp)} RP`;

  const filter = gameState.ui.researchFilter || 'all';
  let html = '';

  for (const r of RESEARCH) {
    if (filter !== 'all' && r.category !== filter) continue;

    const done   = gameState.completedResearch.includes(r.id);
    const prereqMet = !r.requires || gameState.completedResearch.includes(r.requires);
    const locked = !prereqMet;
    const canBuy = prereqMet && !done && rp >= r.cost_rp;

    let cls = 'research-card';
    if (done)   cls += ' done';
    if (locked) cls += ' locked';

    html += `
    <div class="${cls}">
      <div class="research-line1">
        <div class="research-name">${r.name.toUpperCase()}</div>
        <div class="research-cost">${r.cost_rp} RP</div>
      </div>
      <div class="research-desc">${r.description}</div>
      ${done
        ? `<div class="research-status">DONE</div>`
        : locked
          ? `<div class="muted small">Req: ${r.requires}</div>`
          : `<button class="btn btn-buy" data-rid="${r.id}" ${canBuy ? '' : 'disabled'}>${canBuy ? 'RESEARCH' : 'NEED ' + fmt(r.cost_rp - rp) + ' RP'}</button>`
      }
    </div>`;
  }

  el.innerHTML = html || '<div class="muted small" style="padding:8px">Nothing in this category.</div>';
  el.querySelectorAll('[data-rid]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (buyResearch(btn.dataset.rid)) {
        renderResearchTab();
        renderBuildingList(); // update locked buildings
      }
    });
  });
}

/* ── STATS TAB ───────────────────────────────────────────── */
function renderStatsTab() {
  const sess = document.getElementById('stats-session');
  const tots = document.getElementById('stats-totals');
  const achEl = document.getElementById('stats-achievements');
  const lpShop = document.getElementById('lp-shop-panel');
  const lpEl   = document.getElementById('lp-shop');

  if (sess) {
    sess.innerHTML = `
      <div class="stat-row"><span class="stat-label">Time Played</span><span class="stat-val">${fmtTime(gameState.timePlayed)}</span></div>
      <div class="stat-row"><span class="stat-label">Manual Collects</span><span class="stat-val">${gameState.stats.manualCollects}</span></div>
      <div class="stat-row"><span class="stat-label">Research Done</span><span class="stat-val">${gameState.completedResearch.length}</span></div>
      <div class="stat-row"><span class="stat-label">Buildings Owned</span><span class="stat-val">${Object.values(gameState.buildings).reduce((a,b)=>a+b,0)}</span></div>
      <div class="stat-row"><span class="stat-label">Power</span><span class="stat-val">${fmt(gameState.power.generated)} MW gen</span></div>
      <div class="stat-row"><span class="stat-label">Prestiges</span><span class="stat-val">${gameState.prestigeCount}</span></div>
      <div class="stat-row"><span class="stat-label">Legacy Points</span><span class="stat-val accent">${gameState.legacyPoints} LP</span></div>
    `;
  }

  if (tots) {
    let rows = '';
    for (const r of RESOURCES) {
      if (r.category === 'special') continue;
      const res = gameState.resources[r.id];
      if (res.totalProduced > 0) {
        rows += `<div class="stat-row"><span class="stat-label">${r.name}</span><span class="stat-val">${fmt(res.totalProduced)}</span></div>`;
      }
    }
    tots.innerHTML = rows || '<div class="muted small">No production yet.</div>';
  }

  if (achEl) {
    let html = '<div class="achievement-grid">';
    for (const a of ACHIEVEMENTS) {
      const done = gameState.achievements.includes(a.id);
      html += `<div class="achievement-badge ${done ? 'unlocked' : ''}" title="${a.desc}">${a.name}</div>`;
    }
    html += '</div>';
    achEl.innerHTML = html;
  }

  if (lpShop) {
    if (gameState.prestigeCount >= 1) {
      lpShop.style.display = '';
      if (lpEl) {
        let html = `<div class="stat-row"><span class="stat-label">LP Available</span><span class="stat-val accent">${gameState.legacyPoints}</span></div>`;
        for (const u of LP_UPGRADES) {
          const bought = gameState.lpUpgradesBought.includes(u.id);
          html += `
          <div class="lp-item">
            <span class="lp-desc">${u.desc}</span>
            <span>
              <span class="lp-cost">${u.cost} LP</span>
              <button class="btn btn-buy btn-small" data-lpid="${u.id}" ${bought || gameState.legacyPoints < u.cost ? 'disabled' : ''}>
                ${bought ? 'OWNED' : 'BUY'}
              </button>
            </span>
          </div>`;
        }
        lpEl.innerHTML = html;
        lpEl.querySelectorAll('[data-lpid]').forEach(btn => {
          btn.addEventListener('click', () => {
            if (buyLPUpgrade(btn.dataset.lpid)) renderStatsTab();
          });
        });
      }
    } else {
      lpShop.style.display = 'none';
    }
  }
}

/* ── LORE TAB ────────────────────────────────────────────── */
function renderLoreTab() {
  const el = document.getElementById('lore-list');
  if (!el) return;
  let html = '';
  for (const entry of LORE) {
    const unlocked = gameState.unlockedLore.includes(entry.id);
    if (unlocked) {
      html += `
      <div class="lore-entry">
        <div class="lore-title">${entry.title.toUpperCase()}</div>
        <div class="lore-text">${entry.text}</div>
      </div>`;
    } else {
      html += `<div class="lore-locked">— TRANSMISSION LOCKED —</div>`;
    }
  }
  el.innerHTML = html || '<div class="muted small">No transmissions yet.</div>';
}

/* ── PRESTIGE ────────────────────────────────────────────── */
function renderPrestigeBar() {
  const bar = document.getElementById('prestige-bar');
  if (!bar) return;
  bar.style.display = canPrestige() ? '' : 'none';
}

function showPrestigeModal() {
  const lpGain = getPrestigeLPGain();
  showModal(
    'NEW ERA',
    `Legacy Points earned: ${lpGain}\nAll progress resets.`,
    [
      { label: 'CONFIRM REBUILD', cls: 'btn-primary', action: () => {
        closeModal();
        const gained = doPrestige();
        showToast('PRESTIGE', 'New Era', `+${gained} LP gained`);
        renderUI();
      }},
      { label: 'CANCEL', cls: 'btn-secondary', action: () => closeModal() }
    ]
  );
}

/* ── HEADER ──────────────────────────────────────────────── */
function renderHeader() {
  const timeEl     = document.getElementById('header-time');
  const prestigeEl = document.getElementById('header-prestige');
  if (timeEl)     timeEl.textContent     = fmtTime(gameState.timePlayed);
  if (prestigeEl) prestigeEl.textContent = gameState.prestigeCount > 0 ? `ERA ${gameState.prestigeCount}` : '';
}

/* ── FULL RENDER ─────────────────────────────────────────── */
function renderUI() {
  renderHeader();
  renderResourceList();
  renderPower();
  renderBuildingList();
  renderCollectSection();
  renderPrestigeBar();

  if (gameState.ui.activeTab === 'research') renderResearchTab();
  if (gameState.ui.activeTab === 'stats')    renderStatsTab();
  if (gameState.ui.activeTab === 'lore')     renderLoreTab();
}

/* ── OFFLINE MODAL ───────────────────────────────────────── */
function showOfflineModal(result) {
  if (result.skipped) return;
  const elapsed = result.elapsed;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  let table = '<table class="offline-table">';
  for (const r of RESOURCES) {
    if (r.category === 'special') continue;
    const gained = (result.after[r.id] || 0) - (result.before[r.id] || 0);
    if (gained > 0.1) {
      table += `<tr><td>${r.name}</td><td>+${fmt(gained)}</td></tr>`;
    }
  }
  table += '</table>';

  showModal(
    'WELCOME BACK',
    `Away: ${timeStr}<br>Produced while offline:<br>${table}`,
    [{ label: 'CONTINUE', cls: 'btn-primary', action: () => closeModal() }]
  );
}
