# Changelog

## [2.0.0] - 2026-10-31 (Olympus Major Release)

### 🏛️ Olympus-EdC-v1 Proprietary AI Model Suite
- **Unified Model Codenames**: Standardized all public UI, telemetry, and API model identifiers under the **EdC-v1** naming architecture:
  - **`Athena-EdC-v1`**: Primary balanced reasoning & RAG synthesis model.
  - **`Hermes-EdC-v1`**: Sub-50ms ultra-fast low-latency model.
  - **`Apollo-EdC-v1`**: Deep reasoning & flagship Pro model.
  - **`Prometheus-EdC-v1`**: Structured JSON generation model for Clarities, quizzes, and notes.
  - **`Zelos-EdC-v1` & `Iris-EdC-v1`**: Multimodal & high-availability failover pool models.
  - **`Mnemosyne-EdC-v1`**: Semantic vector embeddings & cross-encoder reranking engine.
  - **`Metis-EdC-v1`**: Local document synthesis engine.
  - **`Olympus-EdC-v1`**: Multi-provider inference runtime & circuit-breaker orchestrator.

### 🛡️ Enterprise AI Hardening (9-Phase Architecture)
- **AI Gateway & Rate Limiting**: Added per-user/IP token-bucket rate limiting, concurrency guards, and daily token/USD budget caps (`src/lib/ai/gateway.ts`).
- **2-Stage Guardrails v2 & PII Redaction**: Implemented Unicode NFKC normalization, zero-width stripping, prompt-injection defense, groundedness checks, and automatic scrubbing of emails, phone numbers, government IDs, payment cards, and API keys before LLM inference (`src/lib/ai/guardrails.ts`).
- **2-Level Semantic Cache**: Added L1 exact SHA-256 caching and L2 `Mnemosyne-EdC-v1` vector similarity caching (`cosine >= 0.93`) with user/tenant isolation (`src/lib/ai/semantic-cache.ts`).
- **Complexity Router & Circuit Breakers**: Added automatic prompt complexity scoring (`fast` / `balanced` / `reasoning`) and a 3-provider failover pool with exponential backoff and circuit breakers (`src/lib/ai/router.ts`, `src/lib/ai/providers.ts`).
- **Transactional Outbox CDC & Inngest Workers**: Added `outbox_events` and `index_state` tables with durable Inngest workers (`cdc-dispatcher`, `process-pdf`) for zero-drift vector indexing.
- **Human-in-the-Loop (HITL) Review Queue**: Built `/admin/review` for admins to inspect, approve, edit, or reject high-risk or low-confidence AI responses (`src/lib/ai/hitl.ts`).
- **10-Feature Learning-to-Rank (LTR)**: Upgraded `LibraRAG` retrieval with a 10-feature linear LTR combiner and online weight updates from explicit/implicit user feedback (`rag_feedback`).
- **Percentile & Cost Observability**: Upgraded `/admin/observability` with live `p50` / `p95` / `p99` latency metrics, cache hit rates, fallback tracking, and USD cost telemetry.

### 🎓 LMS Marketplace, Creator Studio & Security
- **Teacher Earnings & 85/15 Revenue Split**: Integrated Dodo Payments checkout & return flows (`/checkout/success`) with automatic **85% Teacher / 15% Platform** earnings ledger (`teacher_earnings`).
- **Encrypted RBAC Role Switching**: Added password-protected role elevation modals in the dashboard user menu using server-side `PBKDF2-SHA256` hashing and constant-time verification (`timingSafeEqual`).
- **Email OTP Verification**: Activated 6-digit email OTP verification on sign-up and password reset flows via Nodemailer.
- **Interactive Legal Hub**: Linked searchable **Terms of Service** (`/terms`) and **Privacy Policy** (`/privacy`) pages across authentication, sidebar footer, and support views.


## [1.1.1-beta] - 2026-06-14

### Architecture & Chores
- **Monorepo Migration**: Officially migrated the `LibraRAG` FastAPI backend directly into the Next.js project structure under `src/modules/LibraRAG` for a unified development experience.
- **Gitignore Expansion**: Significantly expanded `.gitignore` to properly exclude Python environments (`.venv`), `__pycache__`, and data science artifacts to support the new unified structure.
- **UI Cleanup**: Removed the manual "Sync" button from the `ChatInterface` to streamline the chat actions.



## [1.1.0-beta] - 2026-06-14

### New Features

- **LibraAI Enhancements**
  - Voice-to-text dictation integrated directly into the chat interface for hands-free queries.
  - Global vs. Personalized knowledge toggle, allowing users to restrict RAG retrieval strictly to their own uploaded study materials.
  - Full Markdown rendering with intelligent citation rewriting. Local PDF citations now beautifully hyperlink and open securely via the backend API.
- **Identity & Persistence**
  - Seamless fallback to persistent local guest IDs, ensuring uploaded documents remain securely accessible across sessions for unauthenticated users.

### UI/UX & Bug Fixes
- Fixed responsive scaling of hero videos and image components on mobile.
- Recharts evaluation graphs updated to correctly render lines using modern Tailwind CSS v4 variables.
- Clarity Mode mobile drawer now supports active background interactions without darkening the screen.
- Back-to-home navigation added seamlessly to the authentication views.


## [1.0.0-beta] - 2026-06-13

### New Features

- **LibraAI (RAG Assistant)**
  - Advanced hybrid retrieval for high accuracy
  - Interactive 'Clarity Mode' with real-time performance telemetry
  - Per-query Faithfulness and Hallucination scoring using Recharts
- **Meeting Intelligence**
  - Automated video meeting transcription
  - AI-powered meeting summarization and action items extraction
- **EdTutors Integration**
  - Customized AI agents to assist with specific educational and administrative workflows
- **Developer & User Experience**
  - Redesigned dashboard UI with glassmorphic elements
  - Official Developer Announcements and Support pages
  - Pre-launch notification system improvements

### Future Scope (Upcoming Features)

- **Real-Time Token Streaming**: Implementing server-sent events (SSE) for LibraAI to stream LLM responses token-by-token for lower perceived latency.
- **Persistent Metric Tracking**: Storing and visualizing historical RAG evaluation metrics across sessions to track model performance degradation.
- **Advanced Contextual Compression**: Integrating `ContextualCompressionRetriever` with LangGraph for highly condensed and relevant RAG retrieval.
- **Enhanced EdAgent Workflows**: Adding multi-agent orchestrations for complex administrative tasks.
- **Toast Notifications**: Replacing native alerts with a unified `sonner` toast notification system across all modules.
## [feature/auth] - 2025-07-21

### New Features

- **OAuth Integration**
  - Sign in with Google
  - Sign in with GitHub
  - Integrated using `authClient` and configured OAuth provider logic

- **Unified Sign In / Sign Up UI**
  - Adaptive layout based on screen size
  - Elegant card design with brand colors and provider icons
  - Seamless one-click OAuth sign-ins

- **Smart Session Handling**
  - Automatically detects existing sessions
  - Redirects logged-in users appropriately

- **Beautiful Auth Screen Layout**
  - Clean card-based layout with modern fonts and color palette
  - Distinct “Sign in with Google / GitHub” buttons with icons
  - Includes welcoming heading, subtitle, and branding

- **Theming and Accessibility**
  - Tailwind CSS + Headless UI for consistent styling
  - High contrast and accessible components

- **Fully Responsive Design**
  - Optimized for mobile, tablet, and desktop
  - Smooth hover, focus, and animation states

- **Pre-launch Notification System**
  - Users can submit email addresses to be notified
  - Duplicate email check with user feedback
  - Animated welcome message on landing page

### Bug Fixes

- Improved input validation and error handling in authentication and notification forms

### Chores

- Established initial database schema
  - Users, sessions, accounts, verifications, notifications tables
- Updated project dependencies to support auth and UI enhancements

### Tested On

- Google OAuth login
- GitHub OAuth login
- Session persistence and redirection
- Mobile and desktop responsiveness
