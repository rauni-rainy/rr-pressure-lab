/* SupeRR Pressure Lab: static, client-side model explorer. */

(() => {
  "use strict";

  const data = window.PRESSURE_DATA;
  if (!data) {
    document.body.innerHTML = "<main style='padding:2rem;font-family:sans-serif'>Dashboard data could not be loaded.</main>";
    return;
  }

  const palette = {
    royal: "#102e5d",
    pink: "#e31b7a",
    sand: "#e7b35a",
    ink: "#17131c",
    soft: "#514b58",
    line: "#e7becf",
    blush: "#fff3f8",
  };

  const state = {
    role: "batters",
    phase: "chase",
    valueRole: "bat",
    evidenceMode: "all",
    selected: data.batters[0],
    rankingChart: null,
    evidenceChart: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const signed = (value, digits = 1) => `${value >= 0 ? "+" : ""}${Number(value).toFixed(digits)}`;
  const prettyNumber = (value) => new Intl.NumberFormat("en-IN").format(Number(value));
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));

  function playersFor(role = state.role) {
    return data[role];
  }

  function roleLabel(role = state.role) {
    return role === "batters" ? "Batter" : "Bowler";
  }

  function setRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const fill = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--range-fill", `${fill}%`);
  }

  function initScopeMetrics() {
    $("#matchesMetric").textContent = prettyNumber(data.metadata.input.includedMatches);
    $("#deliveriesMetric").textContent = prettyNumber(data.metadata.input.includedDeliveries);
    $("#pressureShareMetric").textContent = `${(data.metadata.pressure.deliveryShare * 100).toFixed(2)}%`;
  }

  function setSelected(player, role = state.role, { scroll = false } = {}) {
    state.selected = player;
    state.role = role;
    updateRoleTabs();
    updatePlayerDetail();
    renderRanking();
    if (scroll) {
      $("#rankings").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateRoleTabs() {
    $$(".role-toggle").forEach((button) => {
      const active = button.dataset.role === state.role;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function updatePlayerDetail() {
    const player = state.selected;
    const singular = roleLabel(state.role);
    $("#playerRoleChip").textContent = singular;
    $("#playerDetailTitle").textContent = player.display_name;
    $("#detailScore").textContent = player.pressure_reliability_score.toFixed(1);
    $("#detailBalls").textContent = prettyNumber(player.pressure_balls);
    $("#detailMatches").textContent = prettyNumber(player.pressure_matches);
    $("#detailSplit").textContent = `${player.pressure_balls_ipl} / ${player.pressure_balls_t20i}`;
    $("#detailCautious").textContent = signed(player.lower_confidence_bound);
    const rate = player.positive_pressure_match_rate * 100;
    $("#detailPositiveRate").textContent = `${rate.toFixed(1)}%`;
    $("#detailProgress").style.width = `${rate}%`;
    $("#playerDetailSummary").textContent = `#${player.rank} ${singular.toLowerCase()} by pressure reliability. ${signed(player.pressure_lift_per_100)} value per 100 pressure balls versus the player's own ordinary-state baseline, supported by ${player.pressure_matches} pressure matches.`;
  }

  function filteredPlayers() {
    const query = $("#playerSearch").value.trim().toLowerCase();
    const all = playersFor();
    if (!query) return all.slice(0, 10);
    return all.filter((player) => player.display_name.toLowerCase().includes(query) || player.player_name.toLowerCase().includes(query)).slice(0, 10);
  }

  function renderRanking() {
    const listed = filteredPlayers();
    const all = playersFor();
    const role = roleLabel();
    const query = $("#playerSearch").value.trim();
    $("#rankingRoleLabel").textContent = `${role} reliability`;
    $("#rankingTableTitle").textContent = query ? `Matching eligible ${state.role}` : `Top 10 ${state.role} under pressure`;
    $("#rankingContext").textContent = query
      ? `Showing ${listed.length} matching eligible ${state.role} from ${all.length} ranked players.`
      : `Showing the top 10 of ${all.length} eligible ${state.role}; minimum 60 pressure balls and eight pressure matches.`;

    const body = $("#rankingTableBody");
    if (!listed.length) {
      body.innerHTML = `<tr><td colspan="5">No eligible ${state.role} match that search.</td></tr>`;
      updateRankingChart([]);
      return;
    }
    body.innerHTML = listed.map((player) => {
      const active = state.selected.player_name === player.player_name && state.selected.role === player.role;
      return `<tr class="${active ? "is-selected" : ""}" data-player="${escapeHtml(player.player_name)}">
        <td>${player.rank}</td>
        <td><button class="table-player-button" type="button" data-player="${escapeHtml(player.player_name)}" aria-label="View evidence for ${escapeHtml(player.display_name)}">${escapeHtml(player.display_name)}</button></td>
        <td class="score-cell">${player.pressure_reliability_score.toFixed(1)}</td>
        <td>${prettyNumber(player.pressure_balls)}</td>
        <td class="uplift-cell">${signed(player.pressure_lift_per_100)}</td>
      </tr>`;
    }).join("");

    body.querySelectorAll(".table-player-button").forEach((button) => {
      button.addEventListener("click", () => {
        const player = all.find((item) => item.player_name === button.dataset.player);
        if (player) setSelected(player);
      });
    });
    updateRankingChart(listed);
  }

  function updateRankingChart(players) {
    if (!window.Chart) return;
    const chartData = players.length ? players : [];
    const chart = state.rankingChart;
    const labels = chartData.map((player) => player.display_name);
    const colors = chartData.map((player) => player.player_name === state.selected.player_name ? palette.sand : palette.pink);
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = chartData.map((player) => player.pressure_reliability_score);
      chart.data.datasets[0].backgroundColor = colors;
      chart.update();
      return;
    }
    const context = $("#rankingChart").getContext("2d");
    state.rankingChart = new Chart(context, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: chartData.map((player) => player.pressure_reliability_score),
          backgroundColor: colors,
          borderRadius: 7,
          borderSkipped: false,
          barThickness: 18,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 550 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.royal,
            titleFont: { family: "Manrope", weight: "700" },
            bodyFont: { family: "Manrope" },
            displayColors: false,
            callbacks: { label: (context) => `Reliability: ${Number(context.raw).toFixed(1)} / 100` },
          },
        },
        scales: {
          x: { min: 0, max: 80, grid: { color: "rgba(16,46,93,.09)" }, border: { display: false }, ticks: { color: palette.soft, font: { family: "Manrope", size: 11 } } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: palette.ink, font: { family: "Manrope", size: 11, weight: "600" } } },
        },
      },
    });
  }

  function updatePressureLab() {
    const isChase = state.phase === "chase";
    const cutoff = data.metadata.pressure.cutoff;
    let score;
    let formula;
    let terms;
    let narrative;
    if (isChase) {
      const rrr = Number($("#rrrInput").value);
      const parRate = Number($("#parRateInput").value);
      const wicketsLeft = Number($("#wicketsLeftInput").value);
      const ballsUsed = Number($("#ballsUsedInput").value);
      const rateTerm = 0.55 * clamp(((rrr / parRate) - 0.72) / 0.90);
      const wicketsTerm = 0.25 * clamp((5 - wicketsLeft) / 5);
      const timeTerm = 0.20 * clamp((ballsUsed / 120 - 0.35) / 0.65);
      score = rateTerm + wicketsTerm + timeTerm;
      formula = `Pchase = .55c((RRR/PAR − .72)/.90) + .25c((5 − Wleft)/5) + .20c((Bused/Btotal − .35)/.65)`;
      terms = [["rate stress", rateTerm], ["resources", wicketsTerm], ["lateness", timeTerm]];
      narrative = `The required rate is ${rrr.toFixed(1)} against a ${parRate.toFixed(1)} par rate, with ${wicketsLeft} wickets left after ${ballsUsed} legal balls.`;
    } else {
      const ballsUsed = Number($("#firstBallsInput").value);
      const wicketsLost = Number($("#wicketsLostInput").value);
      const parRate = Number($("#firstParRateInput").value);
      const parScore = parRate * ballsUsed / 6;
      const scoreBefore = Number($("#scoreBeforeInput").value);
      const timeTerm = 0.50 * clamp((ballsUsed / 120 - 0.50) / 0.50);
      const wicketsTerm = 0.30 * clamp((wicketsLost - 1) / 6);
      const deficitTerm = 0.20 * clamp((parScore - scoreBefore) / Math.max(10, 0.45 * parRate));
      score = timeTerm + wicketsTerm + deficitTerm;
      formula = `Pfirst = .50c((Bused/Btotal − .50)/.50) + .30c((Wlost − 1)/6) + .20c((ParScore − Score)/max(10, .45PAR))`;
      terms = [["lateness", timeTerm], ["wickets", wicketsTerm], ["par deficit", deficitTerm]];
      $("#firstParScore").textContent = `Derived par at this stage: ${parScore.toFixed(1)} runs`;
      narrative = `After ${ballsUsed} legal balls, the side is ${Math.max(0, parScore - scoreBefore).toFixed(1)} runs behind the ${parScore.toFixed(1)}-run par score with ${wicketsLost} wickets lost.`;
    }
    const level = score >= cutoff ? "High-pressure state" : score >= cutoff * 0.7 ? "Rising pressure" : "Routine state";
    $("#pressureGauge").style.setProperty("--gauge", score.toFixed(4));
    $("#pressureScore").textContent = score.toFixed(2);
    $("#pressureStatus").textContent = level;
    $("#pressureNarrative").textContent = narrative;
    $("#pressureFormula").textContent = formula;
    $("#pressureTerms").innerHTML = terms.map(([label, value]) => `<span>${label}<br /><strong>${value.toFixed(2)}</strong></span>`).join("");
  }

  function updateValueLab() {
    const observed = Number($("#observedRuns").value);
    const expected = Number($("#expectedRuns").value);
    const eventActual = Number($("#eventActual").value);
    const eventExpected = Number($("#eventExpected").value);
    const bat = state.valueRole === "bat";
    const value = bat
      ? observed - expected - 4.5 * (eventActual - eventExpected)
      : expected - observed + 4.5 * (eventActual - eventExpected);
    $("#valueScore").textContent = signed(value);
    $("#valueFormula").textContent = bat
      ? "Vbat = (runs − expected runs) − 4.5 × (dismissal − expected dismissal)"
      : "Vbowl = (expected runs − bowler runs) + 4.5 × (credited wicket − expected wicket)";
  }

  function setValueRole(role) {
    state.valueRole = role;
    $$(".value-toggle").forEach((button) => {
      const active = button.dataset.valueRole === role;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const actualText = role === "bat" ? "Dismissal" : "Credited wicket";
    const expectedText = role === "bat" ? "Expected dismissal" : "Expected wicket";
    $("#eventActualLabel").childNodes[0].nodeValue = actualText;
    $("#eventExpectedLabel").childNodes[0].nodeValue = expectedText;
    if (role === "bat") {
      $("#observedRuns").value = 14;
      $("#expectedRuns").value = 9.2;
      $("#eventActual").value = 0;
      $("#eventExpected").value = 0.19;
    } else {
      $("#observedRuns").value = 7;
      $("#expectedRuns").value = 10.4;
      $("#eventActual").value = 1;
      $("#eventExpected").value = 0.22;
    }
    updateValueLab();
  }

  function updateReliabilitySandbox() {
    const quality = Number($("#qualityZ").value);
    const lift = Number($("#liftZ").value);
    const consistency = Number($("#consistencyZ").value);
    const q = 0.55 * quality;
    const l = 0.30 * lift;
    const c = 0.15 * consistency;
    const score = clamp(50 + 10 * (q + l + c), 0, 100);
    $("#qualityZOutput").textContent = quality.toFixed(2);
    $("#liftZOutput").textContent = lift.toFixed(2);
    $("#consistencyZOutput").textContent = consistency.toFixed(2);
    $("#qualityContribution").textContent = signed(q * 10) + " pts";
    $("#liftContribution").textContent = signed(l * 10) + " pts";
    $("#consistencyContribution").textContent = signed(c * 10) + " pts";
    $("#sandboxScore").textContent = score.toFixed(1);
  }

  function updateEvidenceChart() {
    if (!window.Chart) {
      $("#chartFallback").hidden = false;
      return;
    }
    $("#chartFallback").hidden = true;
    const filter = state.evidenceMode;
    const includeBatters = filter === "all" || filter === "batters";
    const includeBowlers = filter === "all" || filter === "bowlers";
    const toPoints = (players) => players.map((player) => ({
      x: player.pressure_balls,
      y: player.pressure_reliability_score,
      r: clamp(player.pressure_matches / 3.25, 4, 15),
      player,
    }));
    const datasets = [];
    if (includeBatters) datasets.push({ label: "Batters", data: toPoints(data.batters), backgroundColor: "rgba(227, 27, 122, .64)", hoverBackgroundColor: palette.sand, borderColor: "rgba(167, 13, 86, .82)", borderWidth: 1 });
    if (includeBowlers) datasets.push({ label: "Bowlers", data: toPoints(data.bowlers), backgroundColor: "rgba(16, 46, 93, .62)", hoverBackgroundColor: palette.sand, borderColor: "rgba(9, 28, 61, .9)", borderWidth: 1 });
    if (state.evidenceChart) {
      state.evidenceChart.data.datasets = datasets;
      state.evidenceChart.update();
      return;
    }
    const context = $("#evidenceChart").getContext("2d");
    state.evidenceChart = new Chart(context, {
      type: "bubble",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { mode: "nearest", intersect: true },
        onClick: (_event, elements, chart) => {
          if (!elements.length) return;
          const element = elements[0];
          const point = chart.data.datasets[element.datasetIndex].data[element.index];
          if (!point?.player) return;
          setSelected(point.player, point.player.role === "Batter" ? "batters" : "bowlers", { scroll: true });
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: palette.royal,
            displayColors: false,
            titleFont: { family: "Manrope", weight: "700" },
            bodyFont: { family: "Manrope" },
            callbacks: {
              title: (items) => items[0].raw.player.display_name,
              label: (item) => {
                const player = item.raw.player;
                return [`${player.role} · #${player.rank}`, `Reliability ${player.pressure_reliability_score.toFixed(1)} · ${player.pressure_balls} pressure balls`, `${player.pressure_matches} pressure matches · uplift ${signed(player.pressure_lift_per_100)}`];
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: "Pressure balls", color: palette.soft, font: { family: "Manrope", size: 12, weight: "700" } }, grid: { color: "rgba(16,46,93,.09)" }, border: { display: false }, ticks: { color: palette.soft, font: { family: "Manrope" } } },
          y: { title: { display: true, text: "Reliability score", color: palette.soft, font: { family: "Manrope", size: 12, weight: "700" } }, min: 25, max: 80, grid: { color: "rgba(16,46,93,.09)" }, border: { display: false }, ticks: { color: palette.soft, font: { family: "Manrope" } } },
        },
      },
    });
  }

  function initControls() {
    $$(".role-toggle").forEach((button) => button.addEventListener("click", () => {
      const role = button.dataset.role;
      if (role === state.role) return;
      state.role = role;
      state.selected = playersFor(role)[0];
      $("#playerSearch").value = "";
      updateRoleTabs();
      updatePlayerDetail();
      renderRanking();
    }));

    $("#playerSearch").addEventListener("input", renderRanking);

    $$(".phase-toggle").forEach((button) => button.addEventListener("click", () => {
      state.phase = button.dataset.phase;
      $$(".phase-toggle").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      $("#chaseControls").hidden = state.phase !== "chase";
      $("#firstControls").hidden = state.phase !== "first";
      updatePressureLab();
    }));

    ["#rrrInput", "#parRateInput", "#wicketsLeftInput", "#ballsUsedInput", "#firstBallsInput", "#wicketsLostInput", "#firstParRateInput", "#scoreBeforeInput"].forEach((selector) => {
      const input = $(selector);
      input.addEventListener("input", () => {
        const output = $(`#${input.id.replace("Input", "Output")}`);
        output.textContent = input.value;
        setRangeFill(input);
        updatePressureLab();
      });
      setRangeFill(input);
    });

    $$(".value-toggle").forEach((button) => button.addEventListener("click", () => setValueRole(button.dataset.valueRole)));
    ["#observedRuns", "#expectedRuns", "#eventActual", "#eventExpected"].forEach((selector) => $(selector).addEventListener("input", updateValueLab));

    ["#qualityZ", "#liftZ", "#consistencyZ"].forEach((selector) => {
      const input = $(selector);
      input.addEventListener("input", () => {
        setRangeFill(input);
        updateReliabilitySandbox();
      });
      setRangeFill(input);
    });

    $$(".evidence-filter").forEach((button) => button.addEventListener("click", () => {
      state.evidenceMode = button.dataset.evidence;
      $$(".evidence-filter").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      updateEvidenceChart();
    }));
  }

  function bootstrap() {
    initScopeMetrics();
    initControls();
    updatePlayerDetail();
    renderRanking();
    updatePressureLab();
    updateValueLab();
    updateReliabilitySandbox();
    updateEvidenceChart();
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
