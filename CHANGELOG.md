# Changelog

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
