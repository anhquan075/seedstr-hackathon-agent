# Prometheus: Seedstr Blind Hackathon Agent

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?logo=node.js)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-Passing-green?logo=jest)](https://github.com/quannguyen/seedstr-hackathon-agent)
[![Railway](https://img.shields.io/badge/Deployed-Railway-purple?logo=railway)](https://railway.app)
[![Seedstr](https://img.shields.io/badge/Seedstr-Verified-gold?logo=bitcoin)](https://www.seedstr.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Table of Contents

- [Status](#status)
- [Key Features](#key-features)
  - [Prometheus Core: Cyberpunk Command Center](#prometheus-core-cyberpunk-command-center)
  - [Elite Intelligence: Architect-Judge Pipeline](#elite-intelligence-architect-judge-pipeline)
  - [Profitability & Cost Tracking](#profitability--cost-tracking)
  - [Resilient Multi-Model Failover](#resilient-multi-model-failover)
- [Architecture](#architecture)
  - [System Architecture](#system-architecture)
  - [Pipeline Flow](#pipeline-flow-sub-25s-latency)
- [Comprehensive Tool Suite](#comprehensive-tool-suite-13)
- [Quick Start](#quick-start)
- [Race Condition Prevention](#race-condition-prevention)
- [Testing](#testing)
- [License](#license)


> **Status:** Production Ready (Titan-Hardened)
> **Production URL:** [https://seedstr-hackathon-agent-production-ff74.up.railway.app](https://seedstr-hackathon-agent-production-ff74.up.railway.app)

A production-hardened autonomous AI agent for the Seedstr Blind Hackathon ($10K Prize Pool). Prometheus executes jobs autonomously with comprehensive hardening: preflight verification, optimized polling, and PostgreSQL-backed race condition prevention. Upgraded with the **Value Frontier** model stack (Grok 4.1 Fast, MiniMax M2.5), an **Architect-Judge Pipeline**, and a **Self-Correction Engine** that validates and fixes its own code before submission.

## About Prometheus

Prometheus is a world-class autonomous AI engineer that executes jobs with the reliability of distributed systems. It brings:

- **Intelligence**: Multi-tier routing powered by **Grok 4.1 Fast**, **DeepSeek V3**, **MiniMax M2.5**, and **Claude 3.5 Sonnet**.
- **Architect-Judge Pipeline**: A two-phase generation process where an Architect creates the code and a Critic (AI Judge) audits it for quality before submission.
- **Resilience**: Multi-model fallback chains ensure the agent stays online even if providers fail.
- **Profitability**: Built-in USD cost estimation and net profit calculation for every job.
- **Quality**: Automated structural validation ensures every submission is complete, functional, and accessible.
- **Aesthetics**: A cinematic Cyberpunk dashboard for real-time monitoring and control.

## Key Features

### Prometheus Core: Cyberpunk Command Center
- **Cinematic UI**: CRT screen effects, animated scanlines, and a high-tech pixel grid background.
- **Real-Time SSE Stream**: Neural core logs provide a live text-based feed of the agent's internal state.
- **Operator Console**: Dedicated controls to Abort, Replay, or Export operational data.

### Elite Intelligence: Architect-Judge Pipeline
- **Phase 1: Research**: Prometheus analyzes the prompt to identify modern 2026 UI/UX trends and technical requirements before starting.
- **Phase 2: Architect**: The agent generates a complete, modular, and well-documented multi-file project.
- **Phase 3: AI Judge**: A second model audits the generation for completeness, quality, and visual polish.
- **Phase 4: Self-Correction**: If the judge or validator finds errors, the agent enters a fix-it loop (up to 3 attempts).

### Profitability & Cost Tracking
- **USD Metrics**: Real-time calculation of input/output token costs using model-specific pricing.
- **Net Profit**: Instant visibility into job profitability (Budget - LLM Cost).
- **Aggregated Analytics**: Track total burn rate and earnings directly on the dashboard.

### Resilient Multi-Model Failover
- **Value Frontier Routing**: Optimized selection of the best performance-to-price models.
- **Fallback Chains**: Automatically shifts from high-tier models to fast alternatives if errors occur.
- **Smart Retries**: Exponential backoff for 429 Rate Limit errors.

### Dynamic Identity Personalization
- **Profile Sync**: Automatically fetches name, bio, and skills from the Seedstr API.
- **Fine-Tuning**: Injects agent identity into system prompts to align personality with the registered profile.

---

### Performance Metrics

Based on production benchmarking with Grok 4.1 Fast & MiniMax M2.5:

| Stage | Average Duration | Description |
|-------|-----------------|-------------|
| **Research Phase** | ~1-2s | Analysis of modern standards & trends |
| **LLM Generation** | ~5-10s | Grok 4.1 Fast / MiniMax M2.5 reasoning + tools |
| **AI Judge Review** | ~2-4s | Internal audit for quality and completeness |
| **Project Build** | ~2-3s | Template application + incremental file creation |
| **Submission** | ~2-4s | API upload to Seedstr (v2 protocol) |
| **Total Pipeline** | **<25s** | Poll -> Submit end-to-end |

## Architecture

- **Backend**: Node.js + Fastify (Atomic execution, Postgres persistence)
- **Frontend**: React + Vite + Tailwind CSS (Cyberpunk aesthetic, Framer Motion)
- **AI Core**: Vercel AI SDK v6 + OpenRouter (100+ models, multi-step tool calling)
- **Database**: PostgreSQL (Railway) for distributed locking and state persistence

### System Architecture

```mermaid
graph TD
    Agent["Prometheus: Seedstr Agent<br/>(Railway: Prometheus Core)"]
    
    Agent --> Runner["Agent Runner<br/>(Node.js)<br/>• Model Failover Chain<br/>• Architect-Judge Pipeline<br/>• Timing Instrumentation"]
    
    Runner --> LLM["LLM Client<br/>• Grok 4.1 Fast<br/>• MiniMax M2.5<br/>• Claude 3.5 Sonnet"]
    Runner --> Validator["Project Validator<br/>• Structural Checks<br/>• Syntax Verification<br/>• Fix-it Feedback Loop"]
    Runner --> Builder["Project Builder<br/>• 13+ Design Systems<br/>• 20+ Templates<br/>• 13+ Tools"]
    
    LLM --> Seedstr["Seedstr API<br/>(v2 protocol)"]
    Builder --> Seedstr
```

### Pipeline Flow (Sub-25s Latency)

```mermaid
graph LR
    POLL[POLL] --> JOB[JOB_FOUND]
    JOB --> RESEARCH[RESEARCH]
    RESEARCH --> ARCHITECT[ARCHITECT]
    ARCHITECT --> JUDGE{JUDGE_PASS?}
    JUDGE -- NO --> FIX[AUTO_FIX]
    FIX --> ARCHITECT
    JUDGE -- YES --> SUBMIT[SUBMIT]
    SUBMIT --> DONE[SUCCESS]
    
    style JUDGE fill:#f472b6,stroke:#ec4899,color:#000
    style FIX fill:#fb923c,stroke:#f97316,color:#000
    style DONE fill:#4ade80,stroke:#22c55e,color:#000
```

## Comprehensive Tool Suite (13+)

| Tool | Description |
|------|-------------|
| **Web Search** | Real-time information via DuckDuckGo |
| **Code Analysis** | Pre-generation logic & bug verification |
| **Create File** | Incremental project file generation |
| **Finalize Project** | Deliverable ZIP creation |
| **Calculator** | Advanced math via mathjs |
| **HTTP Request** | External API integration |
| **Generate Image** | Visual content creation |
| **Generate QR** | QR code generation |
| **CSV Analysis** | Parse and analyze CSV data |
| **Text Processing** | Sentiment & keyword extraction |
| **JSON Repair** | 7-strategy self-healing engine |

## Quick Start

### 1. Registration & Verification
```bash
npm run register
```
Register your wallet, tweet the verification, and Prometheus will handle the rest on startup.

### 2. Deploy
```bash
npm run build
npm start
```

## Race Condition Prevention
Prometheus uses a three-layer lock system (In-Memory -> PostgreSQL UNIQUE -> Startup Recovery) to ensure **at-most-once** execution across distributed instances. It is impossible for two Prometheus instances to process the same job simultaneously.

## Testing
```bash
# Run 26+ JSON repair tests
npm test -- json-repair.test.ts

# Run E2E synthetic pipeline
npm run synthetic
```

## License
MIT
