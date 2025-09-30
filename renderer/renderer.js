// renderer.js
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = { challenges: [] };

function fmt(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function daysBetween(aISO, bISO) {
  const a = new Date(aISO),
    b = new Date(bISO);
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
}
function daysElapsed(startISO, todayISO) {
  const start = new Date(startISO);
  const today = new Date(todayISO);
  const ms = today - start;
  return ms < 0 ? 0 : Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function derive(ch) {
  const start = new Date(ch.startDate);
  const end = new Date(ch.endDate);
  const today = new Date();
  const totalDays = daysBetween(
    start.toISOString(),
    new Date(end.getTime() + 24 * 3600 * 1000).toISOString()
  ); // inclusive end
  const elapsed = daysElapsed(start.toISOString(), today.toISOString());
  const remaining = Math.max(0, totalDays - elapsed);

  const done = (ch.distanceLog || []).reduce(
    (s, l) => s + Number(l.km || 0),
    0
  );
  const avgNeededWhole = ch.targetDistanceKm / totalDays;
  const currentPace = elapsed > 0 ? done / elapsed : 0;
  const remainingKm = Math.max(0, ch.targetDistanceKm - done);
  const avgNeededFromNow =
    remaining > 0 ? remainingKm / remaining : remainingKm;

  let projectedFinish = null;
  if (currentPace > 0) {
    const daysNeededTotal = ch.targetDistanceKm / currentPace;
    const extraDaysNeeded = Math.max(0, Math.ceil(daysNeededTotal - elapsed));
    const proj = new Date(today);
    proj.setDate(proj.getDate() + extraDaysNeeded);
    projectedFinish = proj.toISOString().slice(0, 10);
  }

  const pct =
    ch.targetDistanceKm === 0 ? 0 : clamp01(done / ch.targetDistanceKm);
  return {
    totalDays,
    elapsed,
    remaining,
    done,
    remainingKm,
    avgNeededWhole,
    currentPace,
    avgNeededFromNow,
    projectedFinish,
    pct,
  };
}

function render() {
  const root = $("#content");
  root.innerHTML = "";

  if (state.challenges.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<h3>No challenges yet</h3>
      <p class="small">Click <b>+ New Challenge</b> to set up your first goal (e.g., 1315 km in 96 days). We'll calculate daily targets and track your pace.</p>`;
    root.appendChild(empty);
    return;
  }

  state.challenges.forEach((ch) => {
    const d = derive(ch);
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${ch.name}</h3>
      <div class="meta">${ch.sport} • ${ch.startDate} → ${ch.endDate}</div>
      <div class="row" style="margin-bottom:8px;">
        <span class="badge">Target: ${fmt(ch.targetDistanceKm)} km</span>
        <span class="badge">Done: ${fmt(d.done)} km</span>
        <span class="badge">Remaining: ${fmt(d.remainingKm)} km</span>
      </div>
      <div class="progress" title="${(d.pct * 100).toFixed(
        1
      )}%"><div style="width:${(d.pct * 100).toFixed(2)}%"></div></div>
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Total days</div><div class="value">${
          d.totalDays
        }</div></div>
        <div class="kpi"><div class="label">Days left</div><div class="value">${
          d.remaining
        }</div></div>
        <div class="kpi"><div class="label">Avg/day (overall)</div><div class="value">${fmt(
          d.avgNeededWhole
        )}</div></div>
        <div class="kpi"><div class="label">Avg/day (from now)</div><div class="value">${fmt(
          d.avgNeededFromNow
        )}</div></div>
        <div class="kpi"><div class="label">Your pace (km/day)</div><div class="value">${fmt(
          d.currentPace
        )}</div></div>
        <div class="kpi"><div class="label">Projected finish</div><div class="value">${
          d.projectedFinish ? d.projectedFinish : "—"
        }</div></div>
      </div>
      <div class="actions">
        <button class="btn primary" data-action="log" data-id="${
          ch.id
        }">Log distance</button>
        <button class="btn" data-action="edit" data-id="${ch.id}">Edit</button>
        <button class="btn danger" data-action="delete" data-id="${
          ch.id
        }">Delete</button>
      </div>
      <div class="logs">
        <div class="small" style="margin-bottom:6px;">Recent logs</div>
        <div class="log-list"></div>
      </div>
    `;

    const logList = $(".log-list", card);
    const recent = [...(ch.distanceLog || [])]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 6);
    recent.forEach((l) => {
      const row = document.createElement("div");
      row.className = "log";
      row.innerHTML = `<div>${l.dateISO} • <b>${fmt(l.km)}</b> km ${
        l.note ? "• " + l.note : ""
      }</div>
        <button class="btn" data-action="delete-log" data-id="${
          ch.id
        }" data-log="${l.id}">Remove</button>`;
      logList.appendChild(row);
    });

    root.appendChild(card);
  });
}

async function refresh() {
  state.challenges = await window.api.listChallenges();
  render();
}

// Dialog helpers
const challengeDialog = $("#challengeDialog");
const logDialog = $("#logDialog");

$("#newChallengeBtn").addEventListener("click", () => openChallengeDialog());

function openChallengeDialog(ch = null) {
  $("#dialogTitle").textContent = ch ? "Edit Challenge" : "New Challenge";
  $("#challengeId").value = ch ? ch.id : "";
  $("#name").value = ch ? ch.name : "";
  $("#sport").value = ch ? ch.sport : "cycling";
  $("#startDate").value = ch ? ch.startDate : "";
  $("#endDate").value = ch ? ch.endDate : "";
  $("#target").value = ch ? ch.targetDistanceKm : "";
  $("#notes").value = ch ? ch.notes || "" : "";
  challengeDialog.showModal();
}

$("#saveChallenge").addEventListener("click", async (e) => {
  e.preventDefault();
  const payload = {
    name: $("#name").value.trim(),
    sport: $("#sport").value,
    startDate: $("#startDate").value,
    endDate: $("#endDate").value,
    targetDistanceKm: parseFloat($("#target").value),
    notes: $("#notes").value.trim(),
  };
  const id = $("#challengeId").value;
  if (id) await window.api.updateChallenge(id, payload);
  else await window.api.createChallenge(payload);
  challengeDialog.close();
  await refresh();
});

function openLogDialog(chId) {
  $("#logChallengeId").value = chId;
  const iso = new Date().toISOString().slice(0, 10);
  $("#logDate").value = iso;
  $("#logKm").value = "";
  $("#logNote").value = "";
  logDialog.showModal();
}

$("#saveLog").addEventListener("click", async (e) => {
  e.preventDefault();
  const id = $("#logChallengeId").value;
  const dateISO = $("#logDate").value;
  const km = parseFloat($("#logKm").value);
  const note = $("#logNote").value.trim();
  await window.api.addLog(id, dateISO, km, note);
  logDialog.close();
  await refresh();
});

$("#content").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === "log") openLogDialog(id);
  if (action === "edit") {
    const ch = state.challenges.find((c) => c.id === id);
    openChallengeDialog(ch);
  }
  if (action === "delete") {
    if (confirm("Delete this challenge?")) {
      await window.api.deleteChallenge(id);
      await refresh();
    }
  }
  if (action === "delete-log") {
    const logId = btn.dataset.log;
    if (confirm("Remove this log entry?")) {
      await window.api.deleteLog(id, logId);
      await refresh();
    }
  }
});

$("#checkUpdateBtn").addEventListener("click", async () => {
  try {
    const res = await window.api.checkForUpdates();
    if (res.ok) {
      alert("Checking for updates…");
      console.log("Update info:", res.info);
    } else {
      alert("No update (dev mode or not configured).");
    }
  } catch (err) {
    alert("Error checking updates: " + err.message);
  }
});

refresh().catch((err) => {
  console.error(err);
  const root = document.getElementById("content");
  root.innerHTML = `<div class="card"><h3>Something went wrong</h3><p class="small">${String(
    err
  )}</p></div>`;
});
