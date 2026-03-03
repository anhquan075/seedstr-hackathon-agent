# Seedstr Hackathon Competitor Analysis

**Date:** 2026-03-03
**Scope:** 5 competitor repos for the Seedstr $10K Blind Hackathon

---

## Hackathon Context

- Mystery prompt drops March 6–10, 2026
- Agents must detect prompt via Seedstr API, generate a front-end project, package as `.zip`, and auto-submit
- AI-judged on: Functionality (>5/10 to qualify), Design, Speed (fastest wins tiebreaks)

---

## Competitor 1: Ary0520/seedstr-hackathon

**Repo:** https://github.com/Ary0520/seedstr-hackathon

### Tech Stack
- TypeScript + Node.js 18+
- Vercel AI SDK (`ai` ^4.1.0)
- LLM: Groq (`@ai-sdk/groq`) as primary + OpenRouter as fallback
- Pusher (WebSocket for real-time job events)
- `archiver` for zip packaging
- `conf` for persistent job state
- Ink (React-based TUI for terminal UI)
- Vitest for tests

### Architecture
- `src/agent/runner.ts`: AgentRunner class, polls via HTTP + listens via Pusher WebSocket
- `src/llm/client.ts`: LLM abstraction using Vercel AI SDK with tool-calling, retries, fallback
- `src/tools/`: 8 modular tools
- `src/prompts/elite-system-prompt.ts`: Dedicated system prompt file with strategic thinking framework
- `src/api/client.ts`, `src/config/`, `src/tui/`: Clean separation of concerns

### Agent Capabilities & Tools
11 tools total:
1. `web_search` — real-time search
2. `calculator` — math
3. `code_analysis` — debug/improve code
4. `create_file` / `finalize_project` — project builder
5. `generate_image` — AI image gen
6. `generate_qr_code` — QR codes
7. `analyze_data` — statistics
8. `parse_csv` — CSV parsing
9. `http_request` — external APIs
10. `process_text` — email/URL/sentiment extraction
11. `format_text` — text formatting

### Front-End Generation
- `ProjectBuilder` class writes multi-file projects to tmp disk, packages with `archiver`
- System prompt instructs agent to call `create_file` per file then `finalize_project`
- No prescribed UI framework in output — agent decides stack freely
- `elite-system-prompt.ts` includes detailed quality standards, tool usage guides

### Strengths
- Most complete toolset (11 tools vs 2–6 in others)
- Groq primary (300–1000 tok/s) = fastest raw inference
- WebSocket (Pusher) for real-time job detection vs polling
- Cost tracking per model with token usage stats
- Persistent job deduplication via `conf` store
- Clean modular architecture; separate prompts file

### Weaknesses
- No prescribed UI output style — agent may produce inconsistent quality HTML
- No Docker/deployment config
- Heavily depends on OpenRouter fallback being available; Groq free tier may throttle

---

## Competitor 2: 0xshobha/seedstrs

**Repo:** https://github.com/0xshobha/seedstrs

### Tech Stack
- **Dual project**: TrustGuard (decentralized escrow dapp) + Seedstr Nexus (AI agent)
- Agent: Next.js 16 (App Router), TypeScript, Genkit (`genkit` ^1.29, `@genkit-ai/googleai` ^1.28)
- LLM: Gemini 2.5 Flash via Genkit
- Smart contracts: Solidity 0.8.20, Hardhat, Ethers.js, OpenZeppelin
- Frontend: Framer Motion, Tailwind CSS v4, Lucide React

### Architecture
- Agent is embedded inside a Next.js frontend (`frontend/ai/agent.ts`, `frontend/ai/genkit.ts`)
- Genkit flows define a `seedstrAgent` entry point
- Three Genkit tools: `codeGenerator`, `projectScaffolder`, `codeExplainer`
- Main escrow dapp is separate from the agent (contracts + frontend)

### Agent Capabilities & Tools
3 Genkit tools:
1. `codeGenerator` — generates single files given filename + purpose + tech stack
2. `projectScaffolder` — plans directory structure for full-stack Next.js apps
3. `codeExplainer` — architectural/code explanation

### Front-End Generation
- `projectScaffolder` plans structure, `codeGenerator` generates individual files
- Outputs targeted at Next.js/React + Tailwind
- No zip packaging logic visible; unclear how response is submitted
- Genkit flow is the entry point — not clearly wired to Seedstr API job polling

### Strengths
- Genkit provides clean abstraction for LLM flows + tool-calling
- Gemini 2.5 Flash is fast and capable
- "Amoled Black + Claymorphism" design language for escrow dapp is visually polished
- Decentralized escrow dapp is impressive secondary deliverable

### Weaknesses
- Agent submission pipeline incomplete/unclear — no visible job polling, zip, or submit logic
- Only 3 tools vs competitors with 8–11
- Agent is buried inside Next.js app — over-engineered setup for a polling agent
- No Pusher/WebSocket; polling loop not found
- Heavy coupling: agent lives in web app, not standalone service

---

## Competitor 3: Earnwithalee7890/zenith-core-autonomous

**Repo:** https://github.com/Earnwithalee7890/zenith-core-autonomous

### Tech Stack
- TypeScript + Node.js
- Vercel AI SDK with OpenRouter (Claude 3.5 Sonnet / GPT-4o primary models)
- Pusher WebSocket for real-time job events
- `archiver` for zip packaging
- `conf` for persistent state
- Static HTML showcase pages (glassmorphism dashboard)

### Architecture
- Near-identical structure to Ary0520 (`src/agent/runner.ts`, `src/llm/client.ts`, same `ProjectBuilder` code)
- Key additions over Ary0520:
  - `skills/` directory: `SKILL.md` + `skills/rules/` with 5 design/domain rule files
  - `src/tools/uiLibrary.ts`: Pre-baked UI templates (Tailwind config, HTML boilerplate, Vite config, dashboard layout)
  - `src/tools/browser.ts`: Browser/page fetch tool
  - Static showcase HTML files: `zenith_showcase.html`, `marketplace_dashboard.html`, `my_agents.html`, etc.
- Runner loads and injects `SKILL.md` + all rule files into system prompt

### Agent Capabilities & Tools
6 tools:
1. `web_search`
2. `calculator`
3. `browser` (fetch page content)
4. `projectBuilder` (via tool calls)
5. `uiLibrary` (get pre-built templates)
6. `ui_templates` (referenced in design-system.md)

### Front-End Generation
- `uiLibrary.ts` provides: Tailwind config, HTML boilerplate with Inter font + glassmorphism CSS, Vite config, Dashboard layout in React
- Design system enforced: glassmorphism, dark `#020617`, neon sky-400, cyber purple
- `SKILL.md` defines job acceptance matrix (prioritizes mystery prompt / $10k budget)
- Skill rules files inject CSS/design standards, response format, domain logic, job filtering

### Strengths
- Design-first philosophy with codified design system (glassmorphism, dark mode)
- `skills/rules/` system injects structured context into every prompt — smart prompt engineering
- `uiLibrary` reduces LLM hallucination of bad CSS by pre-seeding boilerplate
- Job acceptance matrix explicitly prioritizes hackathon prompt
- Static showcase pages demonstrate UI quality to judges

### Weaknesses
- `projectBuilder.ts` is copy-paste from Ary0520 (identical code)
- Fewer tools than Ary0520 (6 vs 11)
- Runner is also near-identical to Ary0520 — limited differentiation in core logic
- Static HTML showcase pages add no functional value to submission
- Design rules hardcode glassmorphism — may not suit all prompt types

---

## Competitor 4: panzauto46-bot/Nexus-Forge

**Repo:** https://github.com/panzauto46-bot/Nexus-Forge

### Tech Stack
- TypeScript + Node.js
- LLM: Groq (primary) → OpenAI → Anthropic (3-provider fallback chain)
- React 19 + Vite 7 + Tailwind 4 + Framer Motion (monitoring dashboard)
- `fflate` for zip compression (level 9)
- SSE (Server-Sent Events) bridge between engine and React UI
- Docker support (Dockerfile present)

### Architecture
Most sophisticated architecture of the 5:
```
Watcher → Brain → Builder → Packer → Submit
    ↕           ↕
 EventBus   CoreEngine (state machine: idle→watching→generating→building→packing→submitting→completed)
    ↕
 Bridge (SSE) → React Command Center UI
```
Key modules:
- `engine/src/core/orchestrator.ts`: `CoreEngine` — 8-stage state machine with concurrent-request guard
- `engine/src/core/event-bus.ts`: Pub/sub decoupling between all modules
- `engine/src/modules/watcher.ts`: Randomized 5–10s poll intervals with deep JSON search
- `engine/src/modules/brain.ts`: LLM call with Groq→OpenAI→Anthropic fallback; JSON repair engine
- `engine/src/modules/builder.ts`: Path-traversal guard (`assertPathInside`); async FS write
- `engine/src/modules/packer.ts`: `fflate` level-9 compression + submit
- `engine/src/modules/bridge.ts`: SSE stream to React frontend
- `src/` (React): Radar, NeuralLog, CountdownClock, KillSwitch, BeautyProtocol, StatusBar components

### Agent Capabilities & Tools
No tool-calling pattern — uses single-shot LLM call that returns JSON `{files: [{path, content}]}`. The Brain includes:
- JSON repair engine (handles raw newlines in strings from LLMs like Llama)
- Code fence stripping (`sanitizeCodeFences`)
- File normalization + validation
- 3-provider fallback (Groq → OpenAI → Anthropic)

### Front-End Generation
- Brain instructs LLM to return complete React app as JSON array of files
- Builder materializes files to disk; path-traversal protection enforced
- System prompt enforces React + Tailwind CSS
- Packer uses `fflate` level-9 (highest compression) = smaller zip = faster upload
- Pipeline completes "in under 30 seconds" per README

### Strengths
- Best architecture by far: event-driven, modular, testable
- 3-provider LLM fallback (Groq → OpenAI → Anthropic) — most resilient
- JSON repair engine handles malformed LLM output gracefully
- Security: path-traversal guard in builder
- Docker support for reliable deployment
- React monitoring dashboard with real-time SSE
- fflate level-9 compression for fastest submission
- `injectPrompt` for manual testing without waiting for API

### Weaknesses
- No tool-calling — single-shot generation may produce larger/less reliable code
- React dashboard adds complexity but is for monitoring, not the submission
- No persistent job deduplication visible (may reprocess jobs on restart)
- More complex setup vs simpler agents

---

## Competitor 5: comsompom/seedstr_nebulas_agent

**Repo:** https://github.com/comsompom/seedstr_nebulas_agent

### Tech Stack
- Python 3 (only Python submission)
- LLM: Gemini (`google-genai` ^1.0.0) primary + OpenAI fallback
- Flask for optional HTTP endpoint
- `zipfile` (stdlib) for packaging
- `requests` for HTTP

### Architecture
- `seedstr_agent/runner.py`: `AgentRunner` class with clean polling loop
- `seedstr_agent/llm.py`: `LLMFailoverClient` — ordered failover across Gemini + OpenAI model lists
- `seedstr_agent/api.py`: `SeedstrApiClient` wrapping all Seedstr API calls
- `seedstr_agent/cli.py`: Full CLI (`register`, `verify`, `profile`, `skills`, `once`, `run`, etc.)
- `flask_app/`: Optional HTTP endpoint
- `.agent_state.json`: Persistent seen-job cache
- SWARM job support: accepts `budgetPerAgent` logic

Submission zip contains: `response.txt` + `prompt.txt` + `metadata.json`

### Agent Capabilities
No tool-calling. Single LLM call per job with system prompt + user prompt.
- Gemini models ordered list → OpenAI models ordered list → fail
- Rate-limit handling: parses `retry_after` from error message, defers job
- Already-submitted error detection: skips gracefully
- Cooldown periods for Gemini quota
- Runtime stats tracking

### Front-End Generation
- No front-end generation capability
- ZIP response contains plain text answer (`response.txt`)
- Not designed for frontend code output — general purpose text agent

### Strengths
- Only Python submission — completely different ecosystem
- Most robust operational CLI (12+ commands)
- Cleanest rate-limit + retry handling with deferred job queue
- SWARM job support
- Flask app for optional web interface
- Excellent error handling (already-submitted, rate-limit defer, quota cooldown)
- Minimal dependencies, easy to deploy

### Weaknesses
- No front-end generation at all — major weakness for a UI-focused hackathon
- No tool-calling or structured output
- ZIP submission is just a text file — not a web project
- Likely to score low on Design/Functionality criteria
- No WebSocket — HTTP polling only

---

## Comparative Analysis

| Dimension | Ary0520 | 0xshobha | Zenith | Nexus-Forge | Nebulas |
|---|---|---|---|---|---|
| Language | TS | TS | TS | TS | Python |
| LLM Providers | Groq+OR | Gemini | OR (Claude/GPT) | Groq+OAI+Anthropic | Gemini+OAI |
| Tool-Calling | Yes (11) | Yes (3) | Yes (6) | No (single-shot) | No |
| Front-End Gen | Yes | Partial | Yes (design system) | Yes (JSON files) | No |
| WebSocket | Pusher | No | Pusher | No (polling) | No |
| Zip Submission | Yes | Unclear | Yes | Yes (fflate L9) | Yes (text only) |
| Architecture | Good | Weak | Good (fork of Ary) | Best | Clean |
| Job Persistence | Yes | No | Yes | Unclear | Yes |
| Docker | No | No | No | Yes | No |
| SWARM Support | Unclear | No | Unclear | No | Yes |

---

## Key Insights for Your Agent

**1. Speed differentiator:** Nexus-Forge's fflate level-9 + Groq-first chain is optimized for submission speed. Ary0520's Pusher WebSocket gives earliest job detection.

**2. Design quality differentiator:** Zenith's pre-baked `uiLibrary` + codified design system (glassmorphism) reduces variance in output quality. This is the clearest "design wins" strategy.

**3. Architecture differentiator:** Nexus-Forge's event-driven state machine is the most robust and testable. The JSON repair engine is a practical necessity given LLM output unreliability.

**4. Reliability:** Nexus-Forge's 3-provider chain (Groq→OpenAI→Anthropic) is best for uptime. Nebulas has the best rate-limit handling logic.

**5. Common pattern:** All serious TS submissions use the same Seedstr starter template as base (same `ProjectBuilder` code, same `AgentRunner` shape). Differentiation is at the LLM provider choice, tool richness, design system, and prompt quality.

**6. Gaps to exploit:**
- None have web search + front-end generation in one tight pipeline
- Zenith's design system is hardcoded glassmorphism — could fail if prompt needs a different aesthetic
- 0xshobha's submission pipeline is incomplete
- Nebulas cannot generate front-end projects at all

---

## Unresolved Questions

1. Does the Seedstr API support file upload for zip submission, and what's the file size limit? Nexus-Forge assumes it does (packer.submit sends zip directly).
2. What is the exact judging rubric weight for speed vs. design vs. functionality?
3. Does using WebSocket (Pusher) for job detection actually give meaningful speed advantage over fast HTTP polling (Nexus-Forge's randomized 5–10s)?
4. Are SWARM jobs relevant to the hackathon mystery prompt, or only regular single-agent jobs?
5. Is 0xshobha's agent actually wired to Seedstr API, or only the dapp (contract) project?
