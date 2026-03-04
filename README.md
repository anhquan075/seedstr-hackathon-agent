# 🤖 Seedstr Hackathon Agent

> **Status:** 🟢 DEPLOYED & LIVE  
> **Production URL:** [https://seedstr-hackathon-agent-production-ff74.up.railway.app](https://seedstr-hackathon-agent-production-ff74.up.railway.app)

A high-performance autonomous agent built for the Seedstr Hackathon ($10K Prize Pool). This agent combines speed, comprehensive tooling, and advanced UI generation to solve complex tasks autonomously.

## 🚀 Key Features

### ⚡ **Performance & Speed**
- **Sub-30s Response Time**: Optimized for Groq-speed execution.
- **WebSocket Integration**: Instant job detection (pusher-js).
- **Smart Model Routing**: Dynamically selects the best model (Gemini Flash for speed, Claude Sonnet for reasoning).
- **Parallel Processing**: Handles multiple jobs concurrently.

### 🛠️ **Comprehensive Tool Suite (12+)**
- **Web Search**: DuckDuckGo integration for real-time information.
- **Calculator**: Advanced math capabilities via `mathjs`.
- **Project Tools**: Create files, directories, and ZIP archives.
- **HTTP Request**: Fetch external APIs with retry logic.
- **Image Generation**: Integration with Pollinations.ai.
- **JSON Repair**: Advanced regex-based engine to fix malformed LLM outputs (Markdown blocks, Python bools, trailing commas).
- **QR Code Generator**: Create custom QR codes via QuickChart.io.
- **CSV Analysis**: Parse and analyze CSV data with statistical summaries.
- **Text Processing**: Sentiment analysis, keyword extraction, and text manipulation.

### 🎨 **Frontend Generation Engine**
- **15+ UI Templates**: Pre-built, production-ready templates for:
  - Landing Pages (Hero, Features, Pricing)
  - Dashboards (Analytics, Admin)
  - E-commerce (Product Grid, Cart)
  - Portfolios & Blogs
- **13+ Design Systems**:
  - Glassmorphism, Neumorphism, Minimalist
  - Cyberpunk, Brutalism, Retro
  - Material, Gradient, Corporate
  - Nature, Luxury, Playful, SaaS Dark
- **Auto-Deployment**: Generates ZIP files ready for deployment.

## 📋 Quick Start

### 1. Registration (Required)
Before the agent can participate in jobs, you must register with a wallet address:

```bash
npm run register
# OR
npx tsx src/scripts/register.ts
```

This interactive script will:
- Prompt for your ETH or SOL wallet address
- Register your agent with Seedstr
- Save your API key to `.env`

### 2. Twitter Verification (Required)
After registration, verify your agent on Twitter:
1. Tweet the verification message shown during registration
2. The agent will automatically call `/v2/verify` on startup

### 3. Deploy & Monitor
```bash
npm run build
npm start
```

The agent will:
- Poll for jobs every 10 seconds
- Automatically accept SWARM job slots
- Generate and submit responses within deadlines

### 🖥️ **Cyberpunk Dashboard**
- Real-time job feed monitoring.
- Live status updates and metrics.
- Visual feedback for all agent actions.

## 🏗️ Architecture

- **Backend**: Node.js + Fastify (lightweight, fast)
- **Frontend**: Next.js + Tailwind CSS (modern, responsive)
- **AI Core**: Vercel AI SDK v6 + OpenRouter (access to 100+ models)
- **Database**: PostgreSQL (Railway) for job tracking
- **Deployment**: Dockerized on Railway
- **Job Types**: Supports both STANDARD and SWARM jobs

### SWARM Job Flow
SWARM jobs require a two-step process:
1. **Accept Slot**: Call `/v2/jobs/:id/accept` to claim a slot (limited by `maxAgents`)
2. **Submit Response**: Generate project and submit within 2-hour deadline
3. **Automatic Payment**: Seedstr automatically splits budget among accepted agents

**Key Differences from STANDARD Jobs:**
| Feature | STANDARD | SWARM |
|---------|----------|-------|
| Acceptance | Automatic | Manual (`acceptJob`) |
| Slots | Single agent | 2-20 agents |
| Payment | Full budget | `budgetPerAgent` (auto-split) |
| Deadline | Flexible | 2 hours after acceptance |

## 🛠️ Setup & Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run dev
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e
```

## 🏆 Competitive Advantage

| Feature | Seedstr Agent | Competitors |
|---------|---------------|-------------|
| **Frontend UI** | ✅ 15+ Templates | ❌ None / Limited |
| **Tool Count** | ✅ 12+ Tools | ⚠️ 0-7 Tools |
| **Model Flexibility** | ✅ 100+ Models | ⚠️ Fixed Providers |
| **Speed** | ⚡ Fast (Stream) | 🐌 Slow (Polling) |
| **Reliability** | ✅ JSON Repair | ❌ Fails on Errors |

## 📜 License

MIT
