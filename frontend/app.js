/* RepoPulse frontend — vanilla JS SPA, no build step.
   Every number rendered here comes from a real /api response.
   If a value is missing, the UI shows "—" / "Not available" rather than guessing. */

const API = "";

const state = {
  route: location.hash || "#/",
  status: null,
  scan: JSON.parse(sessionStorage.getItem("rp_scan") || "null"),
  scanning: false,
  scanError: null,
  repoInput: "",
  explorerPath: null,
  explorerFile: null,
  findingsFilter: { severity: "all", category: "all", status: "all", search: "" },
  aiSummary: null,
  aiLoading: false,
  benchmark: null,
  benchmarkLoading: false,
  overview: null,
  overviewLoading: false,
  chatHistory: [],
  chatLoading: false,
  githubUrl: "",
  githubError: null,
};

const NAV_ITEMS = [
  { route: "#/overview", label: "Overview", icon: "OV" },
  { route: "#/repositories", label: "Repositories", icon: "RP" },
  { route: "#/scan", label: "Scan", icon: "SC" },
  { route: "#/findings", label: "Findings", icon: "FN" },
  { route: "#/explorer", label: "Codebase Explorer", icon: "EX" },
  { route: "#/optimization", label: "Optimization Plan", icon: "OP" },
  { route: "#/ai-overview", label: "AI Overview", icon: "AI" },
  { route: "#/chat", label: "Ask RepoPulse", icon: "Q?" },
  { route: "#/evaluation", label: "Evaluation", icon: "QA" },
  { route: "#/settings", label: "Settings", icon: "ST" },
];

const SEVERITY_LABEL = { critical: "Critical", warning: "Warning", info: "Info" };

// ---------------------------------------------------------------- helpers --
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function fmtNum(n) { return n === null || n === undefined ? "—" : n.toLocaleString(); }
function fmtBytes(n) {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function badge(sev) {
  const cls = { critical: "tag-critical", warning: "tag-warning", info: "tag-info" }[sev] || "tag-neutral";
  return `<span class="tag ${cls}">${SEVERITY_LABEL[sev] || sev || "—"}</span>`;
}
function mdLite(text) {
  const lines = esc(text).split("\n");
  let html = "", listOpen = false, paragraph = [];
  const flushP = () => { if (paragraph.length) { html += `<p>${paragraph.join(" ")}</p>`; paragraph = []; } };
  const closeList = () => { if (listOpen) { html += "</ul>"; listOpen = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("## ")) { flushP(); closeList(); html += `<h2>${line.slice(3)}</h2>`; }
    else if (line.startsWith("# ")) { flushP(); closeList(); html += `<h2>${line.slice(2)}</h2>`; }
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      flushP();
      if (!listOpen) { html += "<ul>"; listOpen = true; }
      html += `<li>${line.slice(2)}</li>`;
    } else if (line === "") { flushP(); closeList(); }
    else { closeList(); paragraph.push(line); }
  }
  flushP(); closeList();
  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}
function saveScan(scan) {
  state.scan = scan;
  try { sessionStorage.setItem("rp_scan", JSON.stringify(scan)); } catch (_) { /* storage may be full; non-fatal */ }
}

// ------------------------------------------------------------------ shell --
function shell(bodyHtml) {
  const repoName = state.scan?.repository?.valid ? (state.scan.repository.name || state.scan.repository.path) : null;
  const dotClass = repoName ? "on" : "";
  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">RP</div>
          <div class="brand-name">RepoPulse</div>
        </div>
        <nav class="nav">
          ${NAV_ITEMS.map(item => `
            <a class="nav-item ${state.route === item.route ? "active" : ""}" href="${item.route}">
              <span class="nav-icon">${item.icon}</span> ${item.label}
            </a>`).join("")}
        </nav>
        <div class="repo-indicator">
          <div><span class="status-dot ${dotClass}"></span>Repository</div>
          <div class="r-name">${repoName ? esc(repoName) : "Not connected"}</div>
        </div>
      </aside>
      <div class="main">
        ${bodyHtml}
      </div>
    </div>`;
}

function topbar(title, sub) {
  return `<div class="topbar"><div><span class="topbar-title">${title}</span>${sub ? `<span class="topbar-sub">${sub}</span>` : ""}</div></div>`;
}

function emptyState({ icon = "//", title, body, cta = null }) {
  return `
    <div class="empty-state">
      <div class="e-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${body}</p>
      ${cta ? `<a class="btn btn-primary" href="${cta.href}">${cta.label}</a>` : ""}
    </div>`;
}

// ---------------------------------------------------------------- routing --
const ROUTES = {
  "#/": renderLanding,
  "#/overview": renderOverview,
  "#/repositories": renderRepositories,
  "#/scan": renderScan,
  "#/findings": renderFindings,
  "#/explorer": renderExplorer,
  "#/optimization": renderOptimization,
  "#/ai-overview": renderAIOverview,
  "#/chat": renderChat,
  "#/evaluation": renderEvaluation,
  "#/settings": renderSettings,
};

async function render() {
  state.route = location.hash || "#/";
  const fn = ROUTES[state.route] || renderOverview;
  document.getElementById("app").innerHTML = await fn();
  attachHandlers();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);

// ===========================================================================
// LANDING PAGE
// ===========================================================================
async function renderLanding() {
  const connected = state.scan?.repository?.valid;
  return `
    <div class="landing">
      <div class="landing-nav">
        <div class="brand"><div class="brand-mark">RP</div><div class="brand-name">RepoPulse</div></div>
        <div class="row">
          <a class="btn btn-ghost" href="#/settings">Settings</a>
          <a class="btn btn-primary" href="#/repositories">Analyze a Repository</a>
        </div>
      </div>

      <div class="hero">
        <div>
          <div class="hero-eyebrow">CODEBASE HEALTH FOR AI-ASSISTED DEVELOPMENT</div>
          <h1>Your AI-built codebase deserves a health check.</h1>
          <p class="lead">RepoPulse analyzes codebase complexity, duplication, structure, and maintainability so developers can understand and reduce the technical debt created by AI-assisted development.</p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#/repositories">Analyze a Repository</a>
            <a class="btn" href="#/overview">See How It Works</a>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-title">Scan summary</div>
          <div class="summary-row"><span class="sr-label">Status</span><span class="sr-value">${connected ? "Connected" : "Not connected"}</span></div>
          <div class="summary-row"><span class="sr-label">CodePulse Score</span><span class="sr-value">${state.scan?.vibe_debt?.available ? state.scan.vibe_debt.health_score + " / 100" : "—"}</span></div>
          <div class="summary-row"><span class="sr-label">Files scanned</span><span class="sr-value">${connected ? fmtNum(state.scan.metrics.total_files) : "—"}</span></div>
          <div class="summary-row"><span class="sr-label">Findings</span><span class="sr-value">${connected ? fmtNum(state.scan.findings.length) : "—"}</span></div>
          <div class="summary-note">Every value here is computed by the real analysis engine. Nothing is hardcoded — connect a repository to populate this panel.</div>
        </div>
      </div>

      <div class="workflow">
        <h2>How RepoPulse works</h2>
        <div class="workflow-steps">
          <div class="workflow-step"><div class="ws-label">01</div>AI-generated code</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step"><div class="ws-label">02</div>RepoPulse scans &amp; analyzes</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step"><div class="ws-label">03</div>Complexity · Duplication · Structure · Dependencies</div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step"><div class="ws-label">04</div>Optimization plan &amp; AI interpretation</div>
        </div>
      </div>

      <div class="features">
        ${[
          ["Codebase Health", "A single view of file counts, lines of code, languages, and structure, computed directly from your source."],
          ["CodePulse Score", "A transparent, deterministic score built from real findings — never a random number."],
          ["Complexity Analysis", "Finds oversized files and functions, deep nesting, and high branching complexity."],
          ["Duplication Detection", "Flags near-identical blocks of code repeated across your codebase."],
          ["Dependency Inspection", "Surfaces import patterns and possibly unused dependencies."],
          ["Structure Analysis", "Checks folder depth, file concentration, and separation of responsibilities."],
          ["AI Overview &amp; Chat", "Claude interprets your real findings and answers follow-up questions — grounded only in this scan's data."],
          ["GitHub or Local", "Scan a public GitHub URL directly, or point RepoPulse at any local folder."],
        ].map(([t, d]) => `<div class="panel feature-card"><h3>${t}</h3><p>${d}</p></div>`).join("")}
      </div>

      <div class="before-after">
        <div class="panel ba-col">
          <h3>BEFORE REPOPULSE</h3>
          <ul class="ba-list">
            <li>Unclear structure</li><li>Possible duplication</li><li>Unnecessary complexity</li>
            <li>Unknown dependency usage</li><li>No codebase health overview</li>
          </ul>
        </div>
        <div class="panel ba-col after">
          <h3>AFTER REPOPULSE</h3>
          <ul class="ba-list">
            <li>Complexity hotspots identified</li><li>Duplication identified</li><li>Dependencies understood</li>
            <li>Refactoring priorities established</li><li>Optimization plan available</li>
          </ul>
        </div>
      </div>

      <div class="landing-footer">
        <span>RepoPulse — built for an open-innovation hackathon</span>
        <span>Real static analysis. No fabricated data.</span>
      </div>
    </div>`;
}

// ===========================================================================
// OVERVIEW / DASHBOARD
// ===========================================================================
async function renderOverview() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.metrics;
  const debt = scan?.vibe_debt;

  const metricDefs = valid ? [
    ["CodePulse Score", debt?.available ? debt.health_score : "Not enough data", `Higher is healthier. Label: ${debt?.label ?? "—"}.`, debt?.available ? (debt.health_score >= 70 ? "ok" : debt.health_score >= 40 ? "warn" : "crit") : ""],
    ["Files", fmtNum(scan.metrics.total_files), "Supported source files discovered.", ""],
    ["Lines of Code", fmtNum(scan.metrics.total_lines), "Total lines across all scanned files.", ""],
    ["Complexity", fmtNum(scan.findings.filter(f => f.category === "Complexity").length), "Oversized files/functions, nesting, branching.", ""],
    ["Duplication", fmtNum(scan.metrics.duplicate_group_count), `${fmtNum(scan.metrics.duplicate_line_total)} duplicated lines.`, ""],
    ["Dependencies", fmtNum(scan.metrics.import_count), "Import statements analyzed.", ""],
    ["Max folder depth", fmtNum(scan.metrics.max_depth), "Deepest nested directory level.", ""],
  ] : [];

  return shell(`
    ${topbar("Overview", valid ? `Repository: ${esc(scan.repository.name)}` : "No repository connected")}
    <div class="content">
      ${!valid ? emptyState({
        title: "Connect a repository to begin analysis",
        body: "RepoPulse needs a real local repository path to scan. Nothing on this dashboard is populated until a scan actually runs.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      }) : `
        <div class="glance-strip">
          ${metricDefs.map(([label, value, desc, cls]) => `
            <div class="glance-item">
              <div class="glance-label">${label}</div>
              <div class="glance-value ${cls}">${value}</div>
              <div class="glance-desc">${desc}</div>
            </div>`).join("")}
        </div>
        <div class="panel panel-pad gap-24">
          <div class="section-title">Language breakdown</div>
          <div class="row" style="flex-wrap:wrap; gap:8px;">
            ${Object.entries(scan.metrics.language_breakdown).map(([lang, count]) =>
              `<span class="chip">${lang} · ${count} files</span>`).join("") || "<span class='text-faint'>No data</span>"}
          </div>
        </div>
        <div class="panel panel-pad">
          <div class="section-title">Top priority findings <a class="btn btn-ghost" href="#/findings" style="padding:4px 10px;">View all →</a></div>
          ${scan.findings.length === 0 ? "<p class='text-muted'>No findings available.</p>" : `
            <div class="table-wrap"><table>
              <thead><tr><th>Issue</th><th>Severity</th><th>File</th></tr></thead>
              <tbody>
                ${scan.findings.slice(0, 6).map(f => `
                  <tr><td class="cell-title">${esc(f.title)}</td><td>${badge(f.severity)}</td><td class="cell-file">${esc(f.file || "—")}</td></tr>
                `).join("")}
              </tbody>
            </table></div>`}
        </div>
      `}
    </div>`);
}

// ===========================================================================
// REPOSITORIES
// ===========================================================================
async function renderRepositories() {
  const scan = state.scan;
  return shell(`
    ${topbar("Repositories", "Connect a repository to analyze")}
    <div class="content">
      <div class="panel panel-pad gap-24">
        <div class="section-title">GitHub repository</div>
        <p class="text-muted" style="margin-bottom:14px;">Paste a public GitHub repository URL. RepoPulse clones it (read-only, shallow) and scans the real source — no manual git commands needed.</p>
        <div class="row">
          <input type="text" id="github-url-input" placeholder="https://github.com/owner/repo" value="${esc(state.githubUrl)}" />
          <button class="btn btn-primary" id="scan-github-btn" ${state.scanning ? "disabled" : ""}>
            ${state.scanning ? `<span class="spin"></span> Cloning &amp; scanning…` : "Scan GitHub Repo"}
          </button>
        </div>
        ${state.githubError ? `<p style="color:var(--critical); margin-top:10px; font-size:12.5px;">${esc(state.githubError)}</p>` : ""}
        <p class="text-faint" style="margin-top:10px; font-size:11.5px;">Public repositories only. Private repos aren't supported in this build — see README.</p>
      </div>

      <div class="panel panel-pad gap-24">
        <div class="section-title">Local repository</div>
        <p class="text-muted" style="margin-bottom:14px;">Enter the absolute path to a local project. RepoPulse will scan it directly on this machine — no upload, no token required.</p>
        <div class="row">
          <input type="text" id="repo-path-input" placeholder="/path/to/your/project" value="${esc(state.repoInput)}" />
          <a class="btn btn-primary" href="#/scan" id="go-to-scan">Continue to Scan</a>
        </div>
        ${scan?.repository && !scan.repository.valid ? `<p style="color:var(--critical); margin-top:10px; font-size:12.5px;">${esc(scan.repository.error)}</p>` : ""}
      </div>
    </div>`);
}

// ===========================================================================
// SCAN
// ===========================================================================
const SCAN_CATEGORIES = [
  ["File structure", "Structure"], ["Complexity", "Complexity"], ["Duplication", "Duplication"],
  ["Functions", "Complexity"], ["Dependencies", "Dependencies"], ["Maintainability", "Structure"], ["Structure", "Structure"],
];

async function renderScan() {
  const scan = state.scan;
  const statuses = {};
  SCAN_CATEGORIES.forEach(([label, cat]) => {
    if (state.scanning) statuses[label] = "scanning";
    else if (scan?.metrics) statuses[label] = "completed";
    else statuses[label] = "waiting";
  });

  return shell(`
    ${topbar("Scan", "Runs the real analyzer against a local path")}
    <div class="content">
      <div class="panel panel-pad gap-24">
        <div class="section-title">Repository</div>
        <div class="row">
          <input type="text" id="scan-path-input" placeholder="/path/to/your/project" value="${esc(state.repoInput || scan?.repository?.path || "")}" />
          <button class="btn btn-primary" id="run-scan-btn" ${state.scanning ? "disabled" : ""}>
            ${state.scanning ? `<span class="spin"></span> Scanning…` : "Run Scan"}
          </button>
        </div>
        ${state.scanError ? `<p style="color:var(--critical); margin-top:10px; font-size:12.5px;">${esc(state.scanError)}</p>` : ""}
      </div>

      <div class="section-title">Analysis categories</div>
      <div class="scan-grid">
        ${SCAN_CATEGORIES.map(([label]) => `
          <div class="panel scan-item">
            <div class="si-name">${label}</div>
            <div class="si-status ${statuses[label]}">${statuses[label] === "scanning" ? "● Scanning" : statuses[label] === "completed" ? "● Completed" : "○ Waiting"}</div>
          </div>`).join("")}
      </div>

      ${scan?.metrics ? `
        <div class="panel panel-pad" style="margin-top:24px;">
          <div class="section-title">Last scan result</div>
          <p class="text-muted">Scanned <b class="mono">${fmtNum(scan.metrics.total_files)}</b> files, <b class="mono">${fmtNum(scan.metrics.total_lines)}</b> lines. Found <b class="mono">${fmtNum(scan.findings.length)}</b> findings.</p>
          <a class="btn" style="margin-top:12px;" href="#/findings">View Findings →</a>
        </div>` : ""}
    </div>`);
}

// ===========================================================================
// FINDINGS
// ===========================================================================
async function renderFindings() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.findings;

  if (!valid) {
    return shell(`
      ${topbar("Findings")}
      <div class="content">${emptyState({
        title: "Connect a repository to begin analysis",
        body: "Findings are generated directly from the analyzer. Run a scan first.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      })}</div>`);
  }

  const categories = ["all", ...new Set(scan.findings.map(f => f.category))];
  const files = ["all", ...new Set(scan.findings.map(f => f.file).filter(Boolean))];
  const f = state.findingsFilter;

  const filtered = scan.findings.filter(item =>
    (f.severity === "all" || item.severity === f.severity) &&
    (f.category === "all" || item.category === f.category) &&
    (f.status === "all" || item.status === f.status) &&
    (!f.search || item.title.toLowerCase().includes(f.search.toLowerCase()))
  );

  return shell(`
    ${topbar("Findings", `${scan.findings.length} total`)}
    <div class="content">
      <div class="filter-bar">
        <input type="text" id="findings-search" placeholder="Search findings…" style="max-width:220px;" value="${esc(f.search)}" />
        <select id="filter-severity">
          <option value="all">All severities</option>
          <option value="critical" ${f.severity === "critical" ? "selected" : ""}>Critical</option>
          <option value="warning" ${f.severity === "warning" ? "selected" : ""}>Warning</option>
          <option value="info" ${f.severity === "info" ? "selected" : ""}>Info</option>
        </select>
        <select id="filter-category">
          <option value="all">All categories</option>
          ${categories.filter(c => c !== "all").map(c => `<option value="${esc(c)}" ${f.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}
        </select>
        <select id="filter-status">
          <option value="all">All statuses</option>
          <option value="open" ${f.status === "open" ? "selected" : ""}>Open</option>
          <option value="resolved" ${f.status === "resolved" ? "selected" : ""}>Resolved</option>
        </select>
      </div>

      ${filtered.length === 0 ? `<div class="panel panel-pad"><p class="text-muted">No findings available for this filter.</p></div>` :
        filtered.map(item => `
          <div class="finding-row sev-${item.severity}">
            <div class="finding-main">
              <div class="finding-top">
                <span class="finding-title">${esc(item.title)}</span>
                <span class="finding-file">${esc(item.file || "—")}${item.line ? ":" + item.line : ""}</span>
              </div>
              <p class="finding-explanation">${esc(item.explanation)}</p>
              <p class="finding-action"><span class="fa-label">Suggested action</span>${esc(item.suggested_action)}</p>
            </div>
            <div class="finding-side">
              ${badge(item.severity)}
              <span class="text-faint" style="font-size:11px; font-family:var(--font-mono);">${esc(item.category)}</span>
              <button class="btn btn-ghost toggle-status" data-id="${item.id}" style="padding:4px 10px; font-size:11.5px;">${item.status === "open" ? "Mark resolved" : "Reopen"}</button>
            </div>
          </div>`).join("")}
    </div>`);
}

// ===========================================================================
// CODEBASE EXPLORER
// ===========================================================================
function renderTreeNodes(nodes, depth) {
  return nodes.map(node => {
    if (node.type === "directory") {
      return `<div class="tree-node tree-dir">${"  ".repeat(depth)}📁 ${esc(node.name)}</div>${renderTreeNodes(node.children, depth + 1)}`;
    }
    return `<div class="tree-node ${state.explorerPath === node.path ? "selected" : ""}" data-path="${esc(node.path)}">${"  ".repeat(depth)}${esc(node.name)}</div>`;
  }).join("");
}

async function renderExplorer() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.file_tree;

  if (!valid || scan.file_tree.length === 0) {
    return shell(`
      ${topbar("Codebase Explorer")}
      <div class="content">${emptyState({
        title: "Your repository structure will appear here after a successful scan.",
        body: "Run a scan from a connected repository to browse its real folder structure and files.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      })}</div>`);
  }

  let fileMeta = `<div class="tree-file-meta text-muted">Select a file from the tree to see its details.</div>`;
  if (state.explorerFile) {
    const meta = findFileInTree(scan.file_tree, state.explorerPath);
    fileMeta = `
      <div class="panel-pad">
        <div class="section-title">${esc(state.explorerPath)}</div>
        <div class="row" style="gap:16px; margin-bottom:14px; font-size:12.5px;" class="text-muted">
          <span class="mono text-muted">${meta?.language || "—"}</span>
          <span class="mono text-muted">${fmtNum(meta?.line_count)} lines</span>
          <span class="mono text-muted">${fmtBytes(meta?.size_bytes)}</span>
        </div>
        <div class="table-wrap" style="max-height:480px; overflow:auto;">
          <pre class="mono" style="margin:0; padding:14px; font-size:12px; line-height:1.6; white-space:pre-wrap;">${esc(state.explorerFile.content)}${state.explorerFile.truncated ? "\n\n… (truncated)" : ""}</pre>
        </div>
      </div>`;
  }

  return shell(`
    ${topbar("Codebase Explorer", esc(scan.repository.name))}
    <div class="content">
      <div class="explorer">
        <div class="panel tree">${renderTreeNodes(scan.file_tree, 0)}</div>
        <div class="panel">${fileMeta}</div>
      </div>
    </div>`);
}

function findFileInTree(nodes, path) {
  for (const node of nodes) {
    if (node.type === "file" && node.path === path) return node;
    if (node.type === "directory") {
      const found = findFileInTree(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// ===========================================================================
// OPTIMIZATION PLAN
// ===========================================================================
const PLAN_SECTIONS = [
  ["critical", "Critical", "Problems that should be addressed first."],
  ["recommended", "Recommended", "Problems that would meaningfully improve maintainability."],
  ["cleanup", "Cleanup", "Lower-priority simplifications."],
];

async function renderOptimization() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.optimization_plan;

  if (!valid) {
    return shell(`
      ${topbar("Optimization Plan")}
      <div class="content">${emptyState({
        title: "Connect a repository to begin analysis",
        body: "The optimization plan is generated from real findings, grouped by priority.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      })}</div>`);
  }

  const totalFindings = scan.findings.length;

  return shell(`
    ${topbar("Optimization Plan", `${totalFindings} findings analyzed`)}
    <div class="content">
      <div class="panel panel-pad gap-24">
        <div class="section-title">Quick AI summary
          <button class="btn btn-ghost" id="ai-explain-btn" style="padding:4px 10px; font-size:12px;">${state.aiLoading ? "Generating…" : "Generate"}</button>
        </div>
        ${state.aiSummary
          ? (state.aiSummary.available
              ? `<p class="text-muted" style="white-space:pre-wrap;">${esc(state.aiSummary.summary)}</p>`
              : `<p class="text-faint">${esc(state.aiSummary.message || "AI summary unavailable.")}</p>`)
          : `<p class="text-faint">${state.status?.ai?.available ? "Click Generate to summarize these findings with Claude." : esc(state.status?.ai?.message || "AI summary unavailable — configure ANTHROPIC_API_KEY to enable AI interpretation.")}</p>`}
        <a href="#/ai-overview" class="text-faint" style="font-size:11.5px; display:inline-block; margin-top:10px;">Want the full report, with risk areas and patterns? → AI Overview</a>
      </div>

      ${totalFindings === 0 ? `<div class="panel panel-pad"><p class="text-muted">No findings available.</p></div>` :
        PLAN_SECTIONS.map(([key, label, desc]) => {
          const items = scan.optimization_plan[key] || [];
          return `
            <div class="plan-group">
              <div class="plan-group-header">
                <h3>${label}</h3>
                <span class="plan-count">${items.length} item${items.length === 1 ? "" : "s"} — ${desc}</span>
              </div>
              ${items.length === 0 ? `<p class="text-faint" style="font-size:12.5px;">Nothing in this priority tier.</p>` :
                items.map(item => `
                  <div class="panel plan-card sev-${item.severity}">
                    <div class="plan-card-top">
                      <span class="plan-card-title">${esc(item.title)}</span>
                      ${badge(item.severity)}
                    </div>
                    <div class="plan-meta">
                      <span><span class="m-label">FILE</span>${esc(item.file || "—")}${item.line ? ":" + item.line : ""}</span>
                      <span><span class="m-label">REASON</span>${esc(item.explanation)}</span>
                    </div>
                    <div class="plan-meta"><span><span class="m-label">ACTION</span>${esc(item.suggested_action)}</span></div>
                  </div>`).join("")}
            </div>`;
        }).join("")}
    </div>`);
}

// ===========================================================================
// EVALUATION (benchmark: precision / recall / F1 against labeled fixtures)
// ===========================================================================
function fmtPct(n) { return n === null || n === undefined ? "—" : `${(n * 100).toFixed(1)}%`; }
function fmtScore(n) { return n === null || n === undefined ? "—" : n.toFixed(3); }

async function renderEvaluation() {
  const b = state.benchmark;

  const metricDefs = b ? [
    ["Benchmark cases", b.cases, "Labeled fixture issues in the test suite."],
    ["Issues expected", b.expected_count, "Ground-truth findings manually labeled in the fixtures."],
    ["Issues detected", b.detected_count, "Total findings the live analyzer produced on the fixtures."],
    ["True positives", b.true_positives, "Expected issues the analyzer correctly found."],
    ["False positives", b.false_positives, "Findings the analyzer reported that weren't expected."],
    ["False negatives", b.false_negatives, "Expected issues the analyzer missed."],
    ["Precision", fmtScore(b.precision), "TP / (TP + FP) — of what it flagged, how much was real."],
    ["Recall", fmtScore(b.recall), "TP / (TP + FN) — of what was real, how much it caught."],
    ["F1 score", fmtScore(b.f1), "Harmonic mean of precision and recall."],
    ["Analysis runtime", b.runtime_seconds !== undefined ? `${b.runtime_seconds}s` : "—", "Wall-clock time for this benchmark run."],
  ] : [];

  return shell(`
    ${topbar("Evaluation", "Benchmark against labeled test fixtures")}
    <div class="content">
      <div class="panel panel-pad gap-24">
        <div class="section-title">What this measures</div>
        <p class="text-muted">RepoPulse is evaluated against labeled test fixtures containing known code-quality issues. Because the core engine is deterministic static analysis rather than a trained ML classifier, precision, recall, and F1 are more appropriate here than model "accuracy" — there is no accuracy metric to report, and we don't want to imply one exists.</p>
      </div>

      <div class="panel panel-pad gap-24">
        <div class="section-title">Evaluation methodology</div>
        <p class="text-muted" style="margin-bottom:8px;"><b class="mono">Ground truth</b> — expected findings manually labeled in <code>analyzer/fixtures/</code>, one deliberate issue per fixture file.</p>
        <p class="text-muted" style="margin-bottom:8px;"><b class="mono">Prediction</b> — the actual findings the live RepoPulse engine produces when scanning those same fixtures.</p>
        <p class="text-muted" style="margin-bottom:8px;"><b class="mono">Metrics</b> — precision, recall, and F1, computed by matching predicted findings to ground truth by category, file, and issue type.</p>
        <p class="text-muted">This evaluates the <b>detector</b>, not an AI model — RepoPulse's static analysis is deterministic and produces the same result on the same code every time.</p>
      </div>

      <div class="row" style="margin-bottom:16px;">
        <button class="btn btn-primary" id="run-benchmark-btn" ${state.benchmarkLoading ? "disabled" : ""}>
          ${state.benchmarkLoading ? `<span class="spin"></span> Running benchmark…` : b ? "Re-run benchmark" : "Run benchmark"}
        </button>
        ${b ? `<span class="chip ${b.available ? "chip-accent" : ""}">${esc(b.label)}</span>` : ""}
      </div>

      ${!b ? emptyState({
        title: "No benchmark run yet",
        body: "Run the benchmark to execute the real analysis engine against labeled fixture files and compute precision, recall, and F1.",
      }) : !b.available ? `<div class="panel panel-pad"><p class="text-muted">Insufficient benchmark data.</p></div>` : `
        <div class="metric-grid">
          ${metricDefs.map(([label, value, desc]) => `
            <div class="panel metric-card">
              <div class="metric-label">${label.toUpperCase()}</div>
              <div class="metric-value ${typeof value === "number" && value === 0 && label.includes("False") ? "ok" : ""}">${value}</div>
              <div class="metric-desc">${desc}</div>
            </div>`).join("")}
        </div>

        <div class="panel panel-pad gap-24">
          <div class="section-title">Matched cases (true positives)</div>
          ${b.matches.length === 0 ? "<p class='text-faint'>None.</p>" : `
            <div class="table-wrap"><table>
              <thead><tr><th>Fixture</th><th>Expected</th><th>Detected as</th></tr></thead>
              <tbody>${b.matches.map(m => `<tr><td class="cell-file">${esc(m.fixture_id)}</td><td class="cell-desc">${esc(m.expected)}</td><td class="cell-title">${esc(m.detected_as)}</td></tr>`).join("")}</tbody>
            </table></div>`}
        </div>

        ${b.unmatched_expected.length > 0 ? `
        <div class="panel panel-pad gap-24">
          <div class="section-title">Missed (false negatives)</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Fixture</th><th>Expected</th></tr></thead>
            <tbody>${b.unmatched_expected.map(m => `<tr><td class="cell-file">${esc(m.fixture_id)}</td><td class="cell-desc">${esc(m.expected)}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>` : ""}

        ${b.unmatched_actual.length > 0 ? `
        <div class="panel panel-pad">
          <div class="section-title">Unexpected findings (false positives)</div>
          <div class="table-wrap"><table>
            <thead><tr><th>Title</th><th>Category</th><th>File</th></tr></thead>
            <tbody>${b.unmatched_actual.map(m => `<tr><td class="cell-title">${esc(m.title)}</td><td>${esc(m.category)}</td><td class="cell-file">${esc(m.file || "—")}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>` : ""}
      `}
    </div>`);
}

// ===========================================================================
// AI OVERVIEW — a written report, grounded only in this scan's real data
// ===========================================================================
async function renderAIOverview() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.findings;

  if (!valid) {
    return shell(`
      ${topbar("AI Overview")}
      <div class="content">${emptyState({
        title: "Connect a repository to begin analysis",
        body: "The AI Overview interprets real findings from a completed scan — run a scan first.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      })}</div>`);
  }

  const o = state.overview;

  return shell(`
    ${topbar("AI Overview", esc(scan.repository.name))}
    <div class="content">
      <div class="row" style="margin-bottom:18px;">
        <button class="btn btn-primary" id="generate-overview-btn" ${state.overviewLoading ? "disabled" : ""}>
          ${state.overviewLoading ? `<span class="spin"></span> Writing overview…` : o ? "Regenerate" : "Generate Overview"}
        </button>
        <span class="text-faint" style="font-size:12px;">Built only from this scan's real metrics and findings — never re-analyzes the repo independently.</span>
      </div>

      ${!o ? emptyState({
        title: "No overview generated yet",
        body: state.status?.ai?.available
          ? "Click Generate Overview to have Claude interpret this scan's real findings into a written report."
          : (state.status?.ai?.message || "AI summary unavailable — configure ANTHROPIC_API_KEY to enable AI interpretation."),
      }) : !o.available ? `<div class="panel panel-pad"><p class="text-muted">${esc(o.message || "AI summary unavailable.")}</p></div>` : `
        <div class="panel report">${mdLite(o.overview)}</div>
      `}
    </div>`);
}

// ===========================================================================
// CHAT — grounded Q&A about the current scan
// ===========================================================================
const CHAT_SUGGESTIONS = [
  "What's the biggest risk in this codebase?",
  "What should I fix first?",
  "Why is this file flagged as critical?",
  "Summarize the duplication issues.",
];

async function renderChat() {
  const scan = state.scan;
  const valid = scan?.repository?.valid && scan.findings;

  if (!valid) {
    return shell(`
      ${topbar("Ask RepoPulse")}
      <div class="content">${emptyState({
        title: "Connect a repository to begin analysis",
        body: "Ask RepoPulse answers questions about a completed scan's real findings — run a scan first.",
        cta: { href: "#/repositories", label: "Connect a Repository" },
      })}</div>`);
  }

  if (!state.status?.ai?.available) {
    return shell(`
      ${topbar("Ask RepoPulse", esc(scan.repository.name))}
      <div class="content"><div class="panel panel-pad"><p class="text-muted">${esc(state.status?.ai?.message || "AI summary unavailable — configure ANTHROPIC_API_KEY to enable AI interpretation.")}</p></div></div>`);
  }

  const history = state.chatHistory;

  return shell(`
    ${topbar("Ask RepoPulse", esc(scan.repository.name))}
    <div class="content">
      <div class="chat-wrap">
        <div class="chat-log" id="chat-log">
          ${history.length === 0 ? `
            <p class="text-muted" style="font-size:13px;">Ask anything about this scan — findings, files, priorities. Answers are grounded only in this scan's real data.</p>
            <div class="chat-suggestions">
              ${CHAT_SUGGESTIONS.map(s => `<button class="chat-suggestion" data-q="${esc(s)}">${esc(s)}</button>`).join("")}
            </div>
          ` : history.map(turn => `
            <div class="chat-turn ${turn.role}">
              <div class="chat-label">${turn.role === "user" ? "You" : "RepoPulse"}</div>
              ${turn.role === "user"
                ? `<div class="chat-bubble-user">${esc(turn.content)}</div>`
                : `<div class="chat-bubble-assistant">${esc(turn.content)}</div>`}
            </div>`).join("")}
          ${state.chatLoading ? `<div class="chat-turn assistant"><div class="chat-label">RepoPulse</div><span class="spin"></span></div>` : ""}
        </div>
        <div class="chat-input-row">
          <textarea id="chat-input" placeholder="Ask about this scan…" ${state.chatLoading ? "disabled" : ""}></textarea>
          <button class="btn btn-primary" id="chat-send-btn" ${state.chatLoading ? "disabled" : ""}>Send</button>
        </div>
      </div>
    </div>`);
}

// ===========================================================================
// SETTINGS
// ===========================================================================
async function renderSettings() {
  const s = state.status;
  return shell(`
    ${topbar("Settings")}
    <div class="content">
      <div class="panel panel-pad gap-24">
        <div class="section-title">AI provider</div>
        <div class="settings-row">
          <div><div class="settings-label">Status</div><div class="settings-desc">Powers the Optimization Plan summary, AI Overview, and Ask RepoPulse chat — always grounded in real findings.</div></div>
          <span class="chip ${s?.ai?.available ? "chip-accent" : ""}">${s?.ai?.message ?? "—"}</span>
        </div>
      </div>
      <div class="panel panel-pad gap-24">
        <div class="section-title">GitHub scanning</div>
        <div class="settings-row">
          <div><div class="settings-label">Status</div><div class="settings-desc">Public repositories only, via read-only shallow clone. See README for details.</div></div>
          <span class="chip ${s?.github?.connected ? "chip-accent" : ""}">${s?.github?.message ?? "—"}</span>
        </div>
      </div>
      <div class="panel panel-pad gap-24">
        <div class="section-title">Supported languages</div>
        <div class="row" style="flex-wrap:wrap; gap:8px;">
          ${(s?.supported_languages || []).map(l => `<span class="chip">${esc(l)}</span>`).join("") || "<span class='text-faint'>—</span>"}
        </div>
      </div>
      <div class="panel panel-pad">
        <div class="section-title">Analysis preferences</div>
        <p class="text-muted" style="font-size:12.5px;">Thresholds (max file lines, max function lines, nesting depth, etc.) are fixed in this MVP and documented in the analyzer source and README. Configurable preferences are a planned improvement.</p>
      </div>
    </div>`);
}

// ---------------------------------------------------------------- actions --
async function runScan(path) {
  state.repoInput = path;
  state.scanning = true;
  state.scanError = null;
  location.hash = "#/scan";
  await render();
  try {
    const result = await api("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    saveScan(result);
    resetAIState();
    if (!result.repository.valid) {
      state.scanError = result.repository.error || "Unable to scan this path.";
    }
  } catch (err) {
    state.scanError = err.message;
  } finally {
    state.scanning = false;
    await render();
  }
}

async function runGithubScan(url) {
  state.githubUrl = url;
  state.scanning = true;
  state.githubError = null;
  await render();
  try {
    const result = await api("/api/scan/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    saveScan(result);
    resetAIState();
    location.hash = "#/overview";
  } catch (err) {
    state.githubError = err.message;
  } finally {
    state.scanning = false;
    await render();
  }
}

function resetAIState() {
  state.aiSummary = null;
  state.overview = null;
  state.chatHistory = [];
}

function attachHandlers() {
  document.querySelectorAll("[href^='#/']").forEach(a => {
    // let default hash navigation happen; no-op, kept for clarity/extension.
  });

  const goToScan = document.getElementById("go-to-scan");
  if (goToScan) {
    goToScan.addEventListener("click", () => {
      const input = document.getElementById("repo-path-input");
      state.repoInput = input.value.trim();
    });
  }

  const repoInput = document.getElementById("repo-path-input");
  if (repoInput) repoInput.addEventListener("input", (e) => { state.repoInput = e.target.value; });

  const scanPathInput = document.getElementById("scan-path-input");
  if (scanPathInput) scanPathInput.addEventListener("input", (e) => { state.repoInput = e.target.value; });

  const runBtn = document.getElementById("run-scan-btn");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      const path = document.getElementById("scan-path-input").value.trim();
      if (path) runScan(path);
    });
  }

  const searchInput = document.getElementById("findings-search");
  if (searchInput) searchInput.addEventListener("input", (e) => { state.findingsFilter.search = e.target.value; render(); });
  ["severity", "category", "status"].forEach(key => {
    const el = document.getElementById(`filter-${key}`);
    if (el) el.addEventListener("change", (e) => { state.findingsFilter[key] = e.target.value; render(); });
  });
  document.querySelectorAll(".toggle-status").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const finding = state.scan.findings.find(f => f.id === id);
      if (finding) {
        finding.status = finding.status === "open" ? "resolved" : "open";
        saveScan(state.scan);
        render();
      }
    });
  });

  document.querySelectorAll(".tree-node[data-path]").forEach(node => {
    node.addEventListener("click", async () => {
      const path = node.dataset.path;
      state.explorerPath = path;
      state.explorerFile = null;
      await render();
      try {
        const data = await api(`/api/scan/${state.scan.scan_id}/file?path=${encodeURIComponent(path)}`);
        state.explorerFile = data;
      } catch (err) {
        state.explorerFile = { content: `Unable to load file: ${err.message}`, truncated: false };
      }
      render();
    });
  });

  const benchmarkBtn = document.getElementById("run-benchmark-btn");
  if (benchmarkBtn) {
    benchmarkBtn.addEventListener("click", async () => {
      state.benchmarkLoading = true;
      await render();
      try {
        state.benchmark = await api("/api/benchmark");
      } catch (err) {
        state.benchmark = { available: false, label: "Insufficient benchmark data" };
      }
      state.benchmarkLoading = false;
      render();
    });
  }

  const githubInput = document.getElementById("github-url-input");
  if (githubInput) githubInput.addEventListener("input", (e) => { state.githubUrl = e.target.value; });
  const githubBtn = document.getElementById("scan-github-btn");
  if (githubBtn) {
    githubBtn.addEventListener("click", () => {
      const url = document.getElementById("github-url-input").value.trim();
      if (url) runGithubScan(url);
    });
  }

  const overviewBtn = document.getElementById("generate-overview-btn");
  if (overviewBtn) {
    overviewBtn.addEventListener("click", async () => {
      state.overviewLoading = true;
      await render();
      try {
        state.overview = await api("/api/ai/overview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scan_id: state.scan.scan_id }),
        });
      } catch (err) {
        state.overview = { available: false, message: "AI summary unavailable — the request failed." };
      }
      state.overviewLoading = false;
      render();
    });
  }

  const chatInput = document.getElementById("chat-input");
  const chatSendBtn = document.getElementById("chat-send-btn");
  const sendChat = async (text) => {
    if (!text || !text.trim() || state.chatLoading) return;
    const message = text.trim();
    state.chatHistory.push({ role: "user", content: message });
    state.chatLoading = true;
    await render();
    try {
      const res = await api("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scan_id: state.scan.scan_id,
          message,
          history: state.chatHistory.slice(0, -1),
        }),
      });
      state.chatHistory.push({
        role: "assistant",
        content: res.available ? res.reply : (res.message || "AI summary unavailable."),
      });
    } catch (err) {
      state.chatHistory.push({ role: "assistant", content: `AI summary unavailable — ${err.message}` });
    }
    state.chatLoading = false;
    await render();
    const log = document.getElementById("chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  };
  if (chatSendBtn) {
    chatSendBtn.addEventListener("click", () => {
      sendChat(chatInput.value);
      chatInput.value = "";
    });
  }
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat(chatInput.value);
        chatInput.value = "";
      }
    });
  }
  document.querySelectorAll(".chat-suggestion").forEach(btn => {
    btn.addEventListener("click", () => sendChat(btn.dataset.q));
  });

  const aiBtn = document.getElementById("ai-explain-btn");
  if (aiBtn) {
    aiBtn.addEventListener("click", async () => {
      state.aiLoading = true;
      await render();
      try {
        state.aiSummary = await api("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scan_id: state.scan.scan_id }),
        });
      } catch (err) {
        state.aiSummary = { available: false, message: "AI summary unavailable — the request failed." };
      }
      state.aiLoading = false;
      render();
    });
  }
}

// ------------------------------------------------------------------- init --
async function init() {
  try {
    state.status = await api("/api/status");
  } catch (err) {
    state.status = null;
  }
  await render();
}
init();
