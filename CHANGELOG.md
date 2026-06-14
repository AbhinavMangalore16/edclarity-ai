# Changelog

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
