# EdClarity.ai — v2.0.0 (Olympus Release)

An AI-native educational ecosystem combining an enterprise **Learning Management System (LMS)**, **Teacher Creator Studio (85% Revenue Share)**, **LibraAI Hybrid RAG Assistant**, **Persona Mode Co-Teachers**, **Gamified Clarities & Spaced Repetition**, and a hardened **Olympus-EdC-v1 AI Orchestration Gateway**.

---

## 🏛️ Olympus-EdC-v1 Proprietary AI Model Suite

EdClarity v2.0.0 is powered by the **Olympus-EdC-v1** multi-model orchestration runtime, dynamically routed by query complexity with automatic failover and circuit breakers:

| Public Codename | Role & Capability |
| :--- | :--- |
| **`Athena-EdC-v1`** | Primary Balanced LLM for Persona Co-Teachers, LibraAI RAG synthesis, and interactive tutoring |
| **`Hermes-EdC-v1`** | Ultra-Fast Sub-50ms Instant LLM for low-latency chat, quick classifications, and guardrails |
| **`Apollo-EdC-v1`** | Deep Reasoning & Flagship Pro LLM for complex multi-step derivations, proofs, and grading |
| **`Prometheus-EdC-v1`** | Structured JSON Engine for Clarities course generation, Daily Quizzes, and Flashcards |
| **`Zelos-EdC-v1` / `Iris-EdC-v1`** | Multimodal & High-Availability Failover Pool with automated circuit-breaker recovery |
| **`Mnemosyne-EdC-v1`** | Semantic Vector Embeddings & Cross-Encoder Reranking for LibraAI hybrid retrieval |
| **`Metis-EdC-v1`** | Local Document Synthesis Engine for offline/private document processing |

---

## 🚀 Key Platform Capabilities (v2.0.0)

### 1. Enterprise AI Hardening & System Architecture
- **AI Gateway (`src/lib/ai/gateway.ts`)**: Token-bucket rate limiting (per-user & per-IP), concurrency caps, daily token/cost budget enforcement, and automatic request trace IDs.
- **2-Stage Guardrails v2 (`src/lib/ai/guardrails.ts`)**: Unicode NFKC normalization, zero-width stripping, prompt-injection & jailbreak detection, automatic **PII Redaction** (emails, phone numbers, SSNs, Aadhaar, PAN, payment cards, API keys), and groundedness verification.
- **2-Level Semantic Cache (`src/lib/ai/semantic-cache.ts`)**: L1 exact SHA-256 cache + L2 `Mnemosyne-EdC-v1` 256-dim cosine similarity cache (`>= 0.93` threshold) with tenant isolation.
- **Complexity Router & 3-Provider Failover Pool (`src/lib/ai/router.ts`, `providers.ts`)**: Dynamic routing across `fast`, `balanced`, and `reasoning` tiers with exponential backoff, jitter, and per-provider circuit breakers.
- **Human-in-the-Loop (HITL) Review Queue (`/admin/review`)**: Automated risk scoring and admin escalation queue to approve, edit, or reject flagged AI outputs.
- **Real-Time AI Observability (`/admin/observability`)**: Live execution trace stream, `p50` / `p95` / `p99` latency percentiles, cache hit rates, token cost tracking, and automated anomaly alerts.

### 2. Full-Featured LMS Marketplace & Teacher Studio
- **Course Marketplace (`/courses`)**: Browse categories, preview free chapters, enroll in courses, and track chapter-by-chapter video completion (`lmsProgress`).
- **Teacher Course Studio (`/teacher/courses`)**: Create courses, upload Mux-powered HD video chapters (`muxData`), attach study PDFs on Cloudflare R2, and publish to students.
- **Creator Economy & Dodo Payments (`/teacher/earnings`)**: Live checkout integration via **Dodo Payments** with an automated **85% Teacher / 15% Platform** revenue split (`teacherEarnings`) and **EdClarity Pro** subscriptions.
- **Encrypted RBAC Role Switching**: Cryptographically verified (`PBKDF2-SHA256` + `timingSafeEqual`) role elevation modals for switching between **Student**, **Teacher**, and **SuperAdmin** modes.

### 3. LibraAI Hybrid RAG & 10-Feature Learning-to-Rank
- **Hybrid Retrieval**: Combines dense vector search (`Mnemosyne-EdC-v1`) + BM25 lexical search with Reciprocal Rank Fusion (RRF).
- **10-Feature Learning-to-Rank (`ranking/ltr.py`)**: Reranks candidate chunks using dense cosine, BM25 score, cross-encoder score, query term coverage, exact phrase match, title match, freshness decay, chunk length quality, source authority, and historical click/citation CTR.
- **Transactional Outbox CDC (`src/lib/ai/cdc.ts`)**: Keeps Neon PostgreSQL, Cloudflare R2, and OpenSearch vector indices synchronized via background Inngest workers (`cdc-dispatcher`, `process-pdf`).

### 4. Persona Mode, Clarities & Meeting Intelligence
- **Persona Mode (`/persona`)**: Course-specific channels (`#general`, `#live-q-and-a`, `#ai-notetaker-summary`) with an embedded `Athena-EdC-v1` AI Co-Teacher and one-click class study guide generation.
- **Clarities & Spaced Repetition (`/clarities`)**: Gamified AI-generated micro-courses, SM-2 spaced repetition flashcards, and Daily AI Quizzes.
- **Live Video Meetings (`/meetings`)**: Stream Video SDK classrooms with AI Tutors, automatic transcription, and post-session summaries.
- **Interactive Legal Hub (`/terms` & `/privacy`)**: Searchable Terms of Service and Privacy Policy pages with scroll-spy navigation, section link copying, and print views.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Shadcn UI, Recharts, TanStack Query + tRPC
- **Backend & Database**: Next.js Serverless Routes, tRPC, Drizzle ORM, Neon Serverless PostgreSQL, Redis / Upstash KV
- **AI & Search**: `Olympus-EdC-v1` Orchestrator, FastAPI (`LibraRAG`), OpenSearch, Langfuse Telemetry, Inngest Durable Workflows
- **Media & Payments**: Mux Video Streaming, Stream Video SDK, Cloudflare R2 (S3-compatible storage), Dodo Payments
- **Authentication**: Better Auth (Email + 6-digit Nodemailer OTP Verification, Google & GitHub OAuth, Encrypted RBAC)

---

## 📦 Quick Start

### 1. Install Dependencies
```bash
cd edclarity-ai
npm install
```

### 2. Configure Environment Variables (`.env`)
Configure your Neon `DATABASE_URL`, `BETTER_AUTH_SECRET`, OAuth keys, `SMTP_USER` / `SMTP_PASS` (for OTP emails), Cloudflare R2 credentials, Mux keys, Dodo Payments keys, and AI provider keys in `edclarity-ai/.env`.

### 3. Push Database Schema
```bash
npx drizzle-kit push
```

### 4. Run Development Servers
```bash
# Start Next.js frontend & API
npm run dev

# (Optional) Start Inngest background worker dev server
npx inngest-cli@latest dev
```

Navigate to [http://localhost:3000](http://localhost:3000).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
