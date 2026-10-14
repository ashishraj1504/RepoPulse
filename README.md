# RepoPulse 🩺

> **Codebase health and technical debt intelligence for AI-assisted development.**  
> *Deterministic static analysis meets grounded AI interpretation — no guesswork, no hallucinated metrics.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![Architecture](https://img.shields.io/badge/Frontend-Vanilla%20JS%20SPA-orange.svg)](#architecture)
[![Design](https://img.shields.io/badge/Design-Editorial%20Report%20Tokens-8a3324.svg)](#design-system--philosophy)
[![Status](https://img.shields.io/badge/Build-Zero%20Dependency%20Frontend-success.svg)](#quick-start)

---

## 📖 Overview

As AI coding assistants (Copilot, Cursor, ChatGPT, Claude) accelerate software delivery, codebases increasingly suffer from **"vibe debt"** — subtle duplication, sprawling monolithic functions, erratic branching complexity, unorganized directory structures, and phantom dependencies.

**RepoPulse** is a specialized codebase health intelligence platform designed to audit and rehabilitate software built with AI assistance. It pairs **rigorous, deterministic static analysis** with **grounded LLM synthesis** to provide clear, actionable optimization plans.

### 🌟 Core Principles

1. **Deterministic First, AI Second**: Every score, file count, duplicate line, and complexity metric is computed by a deterministic static analyzer. If data is not present, the UI explicitly renders `—` / `Not available` rather than guessing or fabricating numbers.
2. **Strictly Grounded AI**: When Claude (Anthropic) is invoked for summaries, reports, or interactive chat, its context is strictly bounded to real scan findings. It never invents non-existent flaws or re-analyzes code out of thin air.
3. **Editorial Report Aesthetic**: Built with a warm, publication-grade reading experience (warm paper backgrounds, ink typography, Source Serif 4 headings, and IBM Plex Sans/Mono) instead of noisy neon dashboard clichés.
4. **Zero-Build, Lightweight Footprint**: Pure vanilla ES6+ JavaScript, custom CSS variables, and HTML5 semantic markup. No Node build pipeline, bundlers, or heavy framework overhead required to run the frontend.

---

## 🧭 Application Modules & Routing

RepoPulse features client-side hash routing (`window.location.hash`) providing 11 dedicated application views:

| Hash Route | View | Description |
|---|---|---|
| `#/` | **Landing Page** | Product mission, workflow breakdown, before/after contrast, and live session scan preview. |
| `#/overview` | **Dashboard Overview** | At-a-glance health strip, CodePulse score, language distribution, and top priority findings. |
| `#/repositories`| **Repository Connector**| Connect local folder paths or shallow-clone public GitHub repositories. |
| `#/scan` | **Analysis Scanner** | Real-time status tracker across seven structural and complexity categories. |
| `#/findings` | **Findings Explorer** | Searchable, filterable list of issues categorized by severity, type, and resolution status. |
| `#/explorer` | **Codebase Explorer** | Interactive hierarchical tree view with file metadata, line counts, and content viewer. |
| `#/optimization`| **Optimization Plan** | Three-tier triage roadmap (*Critical*, *Recommended*, *Cleanup*) with one-click AI summary. |
| `#/ai-overview` | **AI Executive Report**| Markdown report highlighting architectural patterns and systemic risks. |
| `#/chat` | **Ask RepoPulse** | Context-grounded conversational agent answering scan-specific queries. |
| `#/evaluation` | **Detector Evaluation** | Precision, Recall, and F1-score benchmarks tested against labeled fixtures. |
| `#/settings` | **System Settings** | Health of AI provider, GitHub shallow-clone service, supported languages, and rule thresholds. |

---

## ⚡ Key Features

```
                                      ┌─────────────────────────────────────────┐
                                      │           Codebase Ingestion            │
                                      │    (Local Directory / Public GitHub)    │
                                      └────────────────────┬────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │       Deterministic Static Engine       │
                                      │  • Duplication detection (exact/near)   │
                                      │  • Complexity & nesting analyzer        │
                                      │  • Directory structure & depth audit    │
                                      │  • Dependency & import inspection       │
                                      └────────────────────┬────────────────────┘
                                                           │
                               ┌───────────────────────────┴───────────────────────────┐
                               ▼                                                       ▼
            ┌────────────────────────────────────┐                  ┌────────────────────────────────────┐
            │          CodePulse Score           │                  │        Grounded AI Layer           │
            │   Deterministic 0–100 health tier  │                  │  (Claude via Anthropic API)        │
            │   (ok / warn / crit indicators)    │                  │  • Executive summary               │
            └────────────────────────────────────┘                  │  • Prioritized optimization plan   │
                                                                    │  • Scan-grounded chat assistant    │
                                                                    └────────────────────────────────────┘
```

### 1. Deterministic CodePulse Health Score
Calculates a 0–100 score based directly on quantifiable findings:
- **Files & LOC Scanned**: Source volume metrics across supported languages.
- **Complexity Hotspots**: Oversized files, long functions, deep branch nesting, and excessive cyclomatic logic.
- **Duplication Detection**: Clustered duplicate code blocks and repeated lines.
- **Structural Integrity**: Folder nesting depth and file concentration.
- **Dependency Auditing**: Import statement tracking and unused package detection.

### 2. Interactive Triage & Findings Management
- Filter by Severity (`critical`, `warning`, `info`).
- Filter by Category (`Complexity`, `Duplication`, `Structure`, `Dependencies`).
- Filter by Status (`open`, `resolved`).
- Real-time substring search across finding titles and explanations.
- One-click status toggling persisted across sessions via `sessionStorage`.

### 3. Tree-Based Codebase Explorer
- Clean file tree visualization with directory folding.
- File metadata preview including detected language, total line count, and byte size.
- Pre-wrapped syntax and content inspector.

### 4. Precision, Recall & F1 Evaluation Suite
Unlike standard AI tools that cannot measure their own accuracy, RepoPulse includes a built-in detector evaluation module:
- Compares analyzer findings against labeled ground-truth fixture test cases (`analyzer/fixtures/`).
- Computes **Precision** ($TP / (TP + FP)$), **Recall** ($TP / (TP + FN)$), and **F1-Score**.
- Surfaces matched true positives, false positives (unexpected detections), and false negatives (missed expected issues).

### 5. Grounded LLM Synthesis
- **Optimization Plan Explanation**: High-level synthesis of prioritized fixes.
- **Deep Architectural Report**: Narrative breakdown rendered using custom markdown parsing.
- **Ask RepoPulse (Chat)**: Interactive Q&A strictly fed current scan metrics to eliminate hallucinations.

---

## 📂 Project Structure

```text
RepoPulse/
├── frontend/
│   ├── index.html        # HTML5 entrypoint; loads Google Fonts & styles
│   ├── styles.css        # Full CSS token architecture, components & responsive layouts
│   └── app.js            # SPA hash router, reactive renderers, state store & API client
└── README.md             # Project documentation & API specifications
```

---

## 🔌 API Specification & Backend Contract

The frontend interacts with a REST backend via relative `/api` paths. Below is the reference contract for implementing or integrating a server:

### System & Health
- `GET /api/status`
  - **Returns**: Status of AI provider, GitHub cloning capability, and array of supported languages.
  ```json
  {
    "ai": { "available": true, "message": "Claude 3.5 Sonnet connected" },
    "github": { "connected": true, "message": "Ready for public repository scans" },
    "supported_languages": ["JavaScript", "TypeScript", "Python", "Go", "Rust"]
  }
  ```

### Scanning
- `POST /api/scan`
  - **Payload**: `{ "path": "/absolute/path/to/project" }`
  - **Returns**: Full scan object containing `scan_id`, `repository`, `metrics`, `vibe_debt`, `findings`, `file_tree`, and `optimization_plan`.
- `POST /api/scan/github`
  - **Payload**: `{ "url": "https://github.com/owner/repository" }`
  - **Returns**: Full scan object generated after a shallow, read-only clone.
- `GET /api/scan/:scan_id/file?path=:filepath`
  - **Returns**: `{ "content": "string", "truncated": false }`

### AI Synthesis (Anthropic Claude)
- `POST /api/ai/explain`
  - **Payload**: `{ "scan_id": "string" }`
  - **Returns**: `{ "available": true, "summary": "string" }`
- `POST /api/ai/overview`
  - **Payload**: `{ "scan_id": "string" }`
  - **Returns**: `{ "available": true, "overview": "# Markdown formatted report..." }`
- `POST /api/ai/chat`
  - **Payload**: 
    ```json
    {
      "scan_id": "string",
      "message": "What should I refactor first?",
      "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
    }
    ```
  - **Returns**: `{ "available": true, "reply": "string" }`

### Evaluation Benchmark
- `GET /api/benchmark`
  - **Returns**: Precision, recall, F1, runtime seconds, fixture matches, unmatched expected (FN), and unexpected detections (FP).

---

## 🚀 Quick Start

### Running the Frontend

Because the frontend is a zero-dependency SPA with no build step, you can serve it using any static web server:

#### Option 1: Python HTTP Server (Built-in)
```bash
# Navigate to the frontend directory
cd frontend

# Start a local HTTP server
python -m http.server 3000
```
Open your browser at: **`http://localhost:3000`**

#### Option 2: Node.js `serve` / `npx`
```bash
npx serve frontend -p 3000
```

#### Option 3: VS Code Live Server
Right-click `frontend/index.html` and select **"Open with Live Server"**.

---

## 🧪 Testing & Validation

1. **Hash Routing**: Open `http://localhost:3000/#/` and navigate through all sidebar routes to verify view rendering.
2. **Session Persistence**: Run a scan or load a fixture; reload the page to confirm `sessionStorage.getItem("rp_scan")` re-populates the dashboard without data loss.
3. **Filter Pipeline**: On `#/findings`, verify multi-condition filtering across severity, category, and text search.
4. **Benchmark Verification**: Trigger the evaluation suite on `#/evaluation` to inspect deterministic detection scores.

---

## 🗺️ Roadmap

- [ ] **Configurable Thresholds**: User-defined cyclomatic complexity limits, maximum function lengths, and nesting depths.
- [ ] **Multi-Language AST Support**: Enhanced AST-based static parsing for TypeScript, Python, and Go.
- [ ] **CI/CD GitHub Action**: Run RepoPulse in pull request pipelines to block merging code with high vibe debt.
- [ ] **Private Repository Support**: Secure SSH key and personal access token (PAT) authentication.
- [ ] **Export Options**: Download PDF and Markdown audit reports directly from the UI.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
