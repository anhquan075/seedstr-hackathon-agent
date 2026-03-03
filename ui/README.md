# Seedstr Agent Monitor

A production-ready, real-time monitoring dashboard for the Seedstr autonomous agent. Built with React 19, Vite, Tailwind CSS 4, and Framer Motion.

## Features

- **Real-time Telemetry**: Connects via Server-Sent Events (SSE) with auto-reconnection logic.
- **Agent Health**: Monitors uptime, poll interval, and connection status.
- **Live Job Tracking**: Visualizes the 5-stage pipeline (Fetching → Generating → Building → Submitting → Complete).
- **Statistics Dashboard**: Tracks total jobs, success rate, average completion time, and earnings.
- **Neural Log**: Color-coded, filterable event log with expandable details.
- **Activity Chart**: Live line chart showing successful vs failed jobs over the last 30 minutes.
- **Command Center**: Pause/resume polling, emergency stop, and manual reconnection.
- **OLED Dark Mode**: Professional, high-contrast design optimized for OLED screens.

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Recharts
- Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository and navigate to the `ui` directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

You can configure the SSE endpoint by creating a `.env` file in the `ui` directory:

```env
VITE_SSE_ENDPOINT=http://localhost:3000/api/sse
```

If not provided, it defaults to `/api/sse`.

## Deployment

This project is configured for easy deployment to Vercel.

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel deploy
   ```

The included `vercel.json` automatically rewrites `/api/sse` requests to the production agent backend.

## Design System

This UI uses a custom "OLED Dark Mode" design system generated via `ui-ux-pro-max`:
- **Primary Color**: Teal (`#0F766E`)
- **Background**: Deep Black/Blue (`#020617`)
- **Typography**: Cinzel (Headings) & Josefin Sans (Body)
- **Effects**: Minimal glow, glassmorphism, smooth transitions (150-300ms)