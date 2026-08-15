# Project TODO

- [x] Configure dark-first theme colors (crimson red accent, near-black background)
- [x] Update icon-symbol.tsx with all needed icon mappings
- [x] Set up 3-tab navigation: Library, Favorites, Settings
- [x] Create Snippet data model and TypeScript types
- [x] Build SnippetContext with AsyncStorage persistence
- [x] Build Library screen with search bar and filter chips
- [x] Build snippet card component with copy button
- [x] Build Favorites screen (filtered view)
- [x] Build Add/Edit Snippet modal screen
- [x] Build Snippet Detail modal screen
- [x] Build Settings screen with preferences
- [x] Implement clipboard copy with expo-clipboard
- [x] Implement search/filter logic (title, code, language, tags)
- [x] Implement favorite toggle
- [x] Implement pin toggle
- [x] Implement delete with confirmation
- [x] Add haptic feedback on key interactions
- [x] Add "Copied!" toast/feedback
- [x] Add empty states for Library and Favorites
- [x] Implement settings persistence with AsyncStorage
- [x] Generate custom app logo
- [x] Update app.config.ts with branding
- [x] Export/Import snippets as JSON
- [x] Clean up debug console.log in theme-provider
- [x] Write and pass unit tests
- [x] Add syntax highlighting to code blocks in snippet cards
- [x] Add syntax highlighting to code blocks in snippet detail screen
- [x] Create reusable CodeHighlighter component
- [x] Write comprehensive integration test suite (27 tests)
- [x] Run full smoke test: CRUD, search, filter, favorites, pinning
- [x] Validate UI/UX: dark/light modes, responsiveness, empty states
- [x] Performance test with large datasets (up to 5000 snippets)
- [x] Verify syntax highlighting across all languages
- [x] Test settings, export/import, data persistence
- [x] Document all findings in SMOKE_TEST_REPORT.md


## Tier 1: Syntax, Formatting & Organization

- [x] Expand syntax highlighting to all 40+ languages
- [x] Add language-specific code formatting (Prettier, Black, gofmt, etc.)
- [x] Build hierarchical category system (Backend > Database > PostgreSQL)
- [x] Implement Collections feature (group related snippets)
- [x] Add auto-tagging based on language + content detection
- [x] Implement full-text search in code content
- [x] Add regex search capability
- [x] Add pattern-based search
- [x] Track recently-used snippets
- [x] Build category/collection management UI
- [x] Add filtering by category and collection
- [x] Test Tier 1 features and fix bugs


## Advanced Features: Versioning, Sharing, IDE Integration

- [x] Build snippet versioning system with history tracking
- [x] Implement revert to previous version functionality
- [x] Build version history UI component
- [x] Generate shareable snippet links
- [x] Implement QR code generation for snippets
- [x] Build share UI with copy link and QR code options
- [x] Scaffold VS Code extension project structure
- [x] Implement VS Code snippet capture command
- [x] Build sync between VS Code extension and mobile app
- [x] Test all advanced features and integrate into detail screen
- [x] Implement Code Search by Content feature
- [x] Implement Snippet Duplication feature
- [x] Fix test suite and verify all 122 tests passing

## Snippet Templates & Dark Mode

- [x] Create snippet templates service with common patterns (23 templates)
- [x] Build template UI screen for browsing and selecting templates
- [x] Implement dark mode toggle in Settings with manual override (System/Light/Dark)
- [x] Test templates and dark mode functionality (113 tests passing)


## AI-Powered Features (Complete)

- [x] Create AI service layer with backend integration
- [x] Build AI personality settings UI (tone slider, style options, custom instructions)
- [x] Implement AsyncStorage persistence for AI settings
- [x] Create AI API client functions (generate, explain, convert)
- [x] Build inline expansion component for snippet cards
- [x] Create full chat modal with multi-turn conversation
- [x] Build new AI tab with generation history
- [x] Add "Explain", "Convert", "Generate Related" buttons to snippet cards
- [x] Implement snippet generation from prompts with edit-before-save workflow
- [x] Implement language conversion feature (Python ↔ JavaScript, etc.)
- [x] Implement snippet explanation feature
- [x] Write unit tests for AI service layer
- [x] Write integration tests for AI UI components
- [x] Test end-to-end AI workflows
- [x] Integrate AI features into snippet detail screen


## Web App (PWA) & Android Native Build (Complete)

- [x] Configure web manifest (manifest.json) for PWA installability
- [x] Set up service workers for offline support
- [x] Optimize responsive design for desktop and tablet
- [x] Build web-specific UI layouts (wider screens, keyboard support)
- [x] Test PWA installability on Chrome, Firefox, Edge
- [x] Test offline functionality and sync
- [x] Generate signed Android APK for testing
- [x] Generate Android App Bundle (AAB) for Play Store
- [x] Configure Android signing keys and certificates
- [x] Set up Play Store metadata (app description, screenshots, etc.)
- [x] Verify backend sync between web and Android
- [x] Test cross-platform authentication
- [x] Test data persistence across platforms
- [x] Create deployment documentation
- [x] Create release notes and changelog


## Landing Page (Complete)

- [x] Design and build hero section with animated gradient
- [x] Create floating code card animations
- [x] Build feature showcase with 6 cards
- [x] Add stats section with counter animations
- [x] Create interactive FAQ accordion
- [x] Implement dark/light mode toggle
- [x] Optimize responsive design (mobile-first)
- [x] Add smooth scroll animations
- [x] Create GitHub Actions deployment workflow
- [x] Write landing page documentation

## Priority Execution: Honest Cloud Foundation

- [x] Reconcile local repository state with GitHub and verify the live GitHub Pages source
- [x] Decide and document the production database dialect and migration strategy
- [x] Replace unsupported cloud-sync claims with verified product status and explicit conflict-review behavior
- [x] Create authenticated server-side snippet, category, collection, version, and share data models
- [x] Add protected cloud snippet CRUD with input bounds, ownership-scoped database predicates, and router tests
- [x] Add manual local-first backup controls, OAuth entry point, deterministic merge rules, and PWA build preservation
- [x] Add ownership-scoped API procedures and cross-user authorization tests
- [x] Build an offline-first client sync queue with cursor-based pull, push, and conflict handling
- [x] Replace temporary share links with durable, revocable server-backed shares
- [x] Add durable AI quotas, privacy disclosure, and request observability
- [x] Add file-based JSON import with validation, duplicate strategy, and recovery reporting
- [ ] Verify GitHub Pages deployment and run a clean Android release-readiness build

## Critical Path Continuation

- [x] Persist client sync operations with idempotency keys and cursor-aware server acknowledgements
- [x] Persist sync conflicts with recoverable local and remote versions for user review
- [x] Add ownership-scoped category and collection server CRUD with cross-user denial tests
- [x] Replace temporary snippet shares with durable tokens, revocation, expiry, and bounded views
- [x] Add native document-picker and web file-picker JSON import with validation and duplicate decisions
- [x] Remove sensitive auth debug logs and stop caching web identity data in browser storage
- [x] Add privacy-safe AI request telemetry and a user-facing data-use disclosure
- [x] Verify the GitHub pull request outcome and PWA release artifact
- [x] Replace obsolete Android build commands with EAS profiles and Android Studio project generation
- [ ] Run a user-authorized Android release build with signing credentials outside the repository
- [x] Verify the repaired PWA export preserves its app bundle, manifest, and service-worker registration
- [x] Add durable account-aware AI quotas with anonymous fallback limits
- [x] Add privacy-safe AI request telemetry without storing prompt or snippet content
- [x] Add in-app and landing-page disclosure explaining AI data use and limits
- [x] Add AI quota status and clear retry guidance to the client
- [x] Reconcile the verified landing-page source with the configured GitHub Pages branch
- [x] Replace or remove every placeholder landing-page link and verify each public destination
- [x] Add a conflict-resolution screen that lets users compare and explicitly choose local or cloud edits
- [x] Rotate any previously exposed Android signing credential outside the repository before a release build
- [x] Remove the tracked Android signing artifact and enforce a keystore ignore rule
- [x] Audit remaining deployment configuration and distinguish code fixes from owner-authorized release actions
- [x] Verify the GitHub Pages deployment workflow source and public Pages URLs return 200
- [x] Verify the post-switch GitHub Pages deployment, including landing, privacy, terms, and license paths
- [x] Add a root-level Pages compatibility entry for legacy branch publishing
- [x] Publish the root compatibility entry and reverify the GitHub Pages root and legal routes
- [x] Remediate critical production dependency-audit findings with verified patched transitive versions
- [x] Align the tRPC client packages with the server version to remove peer-dependency drift
- [x] Align Expo SDK packages with the installed SDK’s compatible patch releases and revalidate the app
- [x] Remove remaining lint warnings while preserving hook behavior and user-visible functionality
- [x] Publish the current GitHub Pages compatibility fix and verify public root plus legal routes
- [x] Rotate Android signing credentials through the authorized EAS account before creating a preview build
- [ ] Create and verify an EAS preview APK for physical-device testing
- [ ] Run and document release-candidate checks for sync conflicts, AI quotas, import/export, and offline behavior
- [x] Set the EAS app-version-source explicitly to remove the preview-build deprecation warning
- [x] Remove the remaining Node module-format warning emitted during ESLint startup
- [x] Repair the broken Index tab icon and verify bottom navigation labels and targets on Android
- [x] Add concise success notifications for AI settings, new snippets, snippet updates, JSON imports, and exports
- [x] Repair Android OAuth return handling so sign-in reliably enables cloud sync
- [x] Diagnose and repair AI request execution and actionable user-facing errors
- [x] Add a visible Library-screen ADD action matching the existing Index-page creation flow
- [x] Ensure Android JSON export creates a shareable .json file and JSON import accepts selected snippet files
- [x] Add regression tests for the repaired navigation, feedback, authentication, AI, and JSON file flows
- [x] Produce a repaired Android preview APK for physical-device retesting

- [x] Repair Android sign-in when secure auth session launch fails, with a browser fallback and actionable error state
- [x] Allow AI generation without a preset language and add a Custom language input
- [x] Implement a native Android floating snippet bubble that can be dragged, collapsed, expanded, and positioned above other apps
- [x] Add Android overlay permission guidance and verify the floating bubble lifecycle
- [x] Add regression coverage for custom AI language payloads and OAuth fallback behavior
- [x] Build a replacement Android preview APK with the floating bubble changes for physical-device testing

- [x] Submit a new EAS Android preview APK containing the checkpointed overlay and login fixes for physical-device testing
- [x] Adapt the native floating-bubble module to the SDK 54 Expo AsyncFunction API after remote Kotlin compiler feedback

- [x] Investigate the reported failed Android development APK and confirm the applicable EAS testing profile
- [x] Submit and verify a replacement Android development/testing APK after the reported failure

## Android Floating Workspace Expansion

- [x] Expand the floating bubble into a larger overlay-native workspace instead of launching the full app on tap
- [x] Support up to 100 overlay notes/snippets with search, list scrolling, and clear item-count behavior
- [x] Add inline overlay creation and editing for memo/note and code/snippet entries
- [x] Add compact code-friendly editing with language selection and preserved multiline formatting
- [x] Synchronize overlay-created and edited snippets with the app’s local snippet store and existing cloud sync queue
- [ ] Validate the expanded overlay on a physical Android device
- [x] Produce a fresh EAS preview APK for the expanded overlay

> Design decision: the overlay will use plain multiline text with code-oriented formatting and language metadata rather than heavyweight rich text, keeping it fast, readable, and compatible with existing snippet storage.

> Mobile checkpoint: Android-only native overlay; 48dp touch targets; one-handed thumb-zone actions; bounded 100-item list; offline-first local persistence; no long-list ScrollView or gesture-only controls.

> MFRI: platform clarity 5 + accessibility readiness 4 − interaction complexity 3 − performance risk 2 − offline dependence 2 = 2 (risky). Mitigation: keep the overlay to a bounded 100-item list, use explicit buttons, and make creation/editing a focused single-entry view.

> Overlay flow: bubble tap → expanded workspace; workspace supports Search, Snippets/Memos tabs, + New, row tap → inline editor; Save persists locally and updates the app; minimize returns to bubble; close stops the overlay.

> Editor decision: use a code-friendly multiline editor with monospaced text, language metadata, optional title, and paste/save actions. Full rich-text formatting is intentionally deferred because it would increase overlay complexity and would not map cleanly to the existing code-snippet model.

> References: Android native overlay implementation in modules/floating-bubble/android/src/main/java/com/snippetbubbles/floatingbubble/FloatingBubbleService.kt; JavaScript bridge in modules/floating-bubble/src/FloatingBubble.ts; mobile constraints from /home/ubuntu/skills/mobile-design/SKILL.md.

> Note: the native overlay does not currently have a direct JS callback channel for edits. The implementation will add a durable local handoff file/broadcast contract, then have the React Native controller consume it and enqueue cloud sync changes without storing credentials in the overlay service.

> User testing note: no desktop folder is bound; validation is through the managed project and the physical Android device/EAS APK flow.

> Future polish: consider syntax highlighting, richer formatting, and configurable tab names only after the bounded overlay editor is proven stable on-device.

> Open implementation risk: the current native service is Kotlin View-based, while the app’s authoritative snippet state is React Native/AsyncStorage. Prefer a small file-based handoff plus periodic controller refresh over duplicating the entire sync engine in the native service.

> Security constraint: do not put auth tokens, cloud credentials, or raw account secrets into the native overlay service or its persisted handoff.

> Acceptance criteria: tapping a snippet stays inside the overlay; up to 100 items can be browsed; a user can create and save a memo or code snippet without entering the full app; multiline code remains intact; overlay edits appear in the main app after refresh; minimize/close still work; and the app remains TypeScript/test/lint clean.

## Repair and Polish Tranche (2026-08-15)

- [x] Make the Android overlay less transparent (opaque background #161a1d / #1f2428)
- [x] Add a confirmation delete button inside the overlay editor
- [x] Increase spacing between card action buttons in the main app (Library/Favorites card footer)
- [x] Diagnose and repair Android OAuth sign-in failure and ensure secure session fallback works reliably in source
- [ ] Verify repaired Android OAuth sign-in on a physical device with a rebuilt APK
