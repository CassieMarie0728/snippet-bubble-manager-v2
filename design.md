# Snippet Bubble Manager — Mobile App Interface Design

## Brand Identity

- **Primary Color:** #981518 (deep crimson red — gritty, bold, no-nonsense)
- **Background (Dark):** #0b0f0f (near-black with a hint of warmth)
- **Surface (Dark):** #161a1a (elevated cards/panels)
- **Foreground (Dark):** #ECEDEE (crisp white text)
- **Muted (Dark):** #9BA1A6 (secondary text)
- **Border (Dark):** #2a2e30 (subtle dividers)
- **Background (Light):** #f8f8f8
- **Surface (Light):** #ffffff
- **Foreground (Light):** #11181C
- **Accent/Success:** #22C55E (copy confirmation green)

Dark-first. Speed-first. No fluff.

---

## Screen List

### Tab 1: Library (Home)
The main screen. Search bar at top, filter chips below, scrollable snippet card list. FAB to add new snippet.

### Tab 2: Favorites
Filtered view showing only favorited snippets. Same card layout as Library but pre-filtered.

### Tab 3: Settings
Overlay preferences, behavior toggles, data management (export/import).

### Modal: Add/Edit Snippet
Full-screen modal for creating or editing a snippet. Fields: title, language, tags, description, code. Toggles for favorite/pinned.

### Modal: Snippet Detail
Tap a card to see full snippet with syntax-style code block, metadata, and action buttons (copy, edit, delete, favorite, pin).

### Screen: Sync Conflicts
An Android-first, full-screen conflict-review route for the small set of snippet edits that cannot be safely merged. It presents one conflict at a time, keeps both revisions intact until the user makes a clear choice, and never silently discards a version.

---

## Screen Details

### Library Screen (Tab 1 — Home)
- **Top:** App title "Snippets" left-aligned, bold
- **Search Bar:** Full-width rounded input with search icon, placeholder "Search snippets..."
- **Filter Chips:** Horizontal scroll row — "All", "Pinned", "Recent", plus dynamic language chips (Kotlin, Bash, JS, etc.)
- **Snippet Cards:** Each card shows:
  - Title (bold, foreground)
  - Language badge (small pill, primary color)
  - Tags (small muted text, comma-separated)
  - First 2 lines of code (monospace, truncated)
  - Pin icon (if pinned) and Favorite heart icon
  - **Copy button** — always visible, right side, one-tap action
- **Sort Order:** Pinned first, then by updated_at descending
- **FAB:** Bottom-right floating "+" button to add new snippet
- **Empty State:** Illustration-free text: "No snippets yet. Tap + to add your first one."

### Favorites Screen (Tab 2)
- Same card layout as Library
- Pre-filtered to is_favorite = true
- No filter chips needed
- Empty state: "No favorites yet. Heart a snippet to see it here."

### Settings Screen (Tab 3)
- **Overlay Section:**
  - Bubble size selector (Small / Medium / Large)
  - Bubble opacity slider (30%–100%)
  - Snap to edge toggle
- **Behavior Section:**
  - Default open view (Pinned / Recent)
  - Haptic feedback toggle
- **Data Section:**
  - Export snippets (JSON)
  - Import snippets (JSON)
  - Snippet count display
- **About Section:**
  - Version info
  - "Built by Cassie"

### Add/Edit Snippet (Modal)
- **Header:** "New Snippet" or "Edit Snippet" with back arrow and Save button
- **Fields (vertical scroll):**
  - Title (TextInput, required)
  - Language (TextInput with suggestions: Kotlin, JavaScript, TypeScript, Python, Bash, SQL, JSON, HTML, CSS, Swift, Go, Rust, C++, Other)
  - Tags (TextInput, comma-separated)
  - Description (TextInput, multiline, optional)
  - Code (TextInput, multiline, monospace font, tall area, required)
- **Toggles:**
  - Favorite (heart toggle)
  - Pinned (pin toggle)
- **Actions:**
  - Save button (primary, top-right)
  - Delete button (red, bottom, only in edit mode)

### Snippet Detail (Modal)
- **Header:** Snippet title, back arrow
- **Body:**
  - Language badge
  - Tags row
  - Description (if present)
  - Full code block (monospace, scrollable, dark surface background)
- **Action Bar (bottom):**
  - Copy (primary action, large)
  - Edit
  - Favorite toggle
  - Pin toggle
  - Delete (destructive)
- **Metadata footer:** Created date, last copied date

### Sync Conflicts (Full Screen)
- **Header:** Back affordance, title "Resolve Conflicts," and a clear count such as "2 to review."
- **Conflict queue:** One conflict at a time rather than a dense desktop-style split view. Previous/next controls appear only when more than one unresolved conflict exists.
- **Comparison control:** A visible two-option selector, "Your edit" and "Cloud edit," with each revision rendered in the same scrollable metadata-and-code layout. The selected revision is never altered by merely viewing it.
- **Decision area:** Two full-width, 56dp action buttons pinned above the tab bar: **Use Your Edit** (crimson primary) and **Use Cloud Edit** (outlined secondary). Controls are separated by at least 8dp and announce their outcome to TalkBack.
- **Offline behavior:** Existing conflict data remains readable offline. Resolution controls explain that a connection is required to finalize the choice, rather than pretending a network write succeeded.
- **Safety:** Choosing a revision opens a concise confirmation dialog that names the winning revision and confirms the other revision will remain available in the resolved conflict record for audit history.

---

## Key User Flows

### Flow 1: Add a Snippet
1. User taps FAB (+) on Library screen
2. Add Snippet modal opens
3. User fills in title, code, optional fields
4. User taps Save
5. Modal closes, snippet appears in Library list
6. Haptic success feedback

### Flow 2: Find and Copy a Snippet
1. User taps search bar on Library screen
2. Types query (searches title, code, language, tags)
3. Results filter in real-time (<100ms target)
4. User taps Copy button on desired card
5. Code copied to clipboard
6. Brief "Copied!" toast/feedback
7. Haptic light feedback

### Flow 3: Favorite a Snippet
1. User taps heart icon on snippet card OR in detail view
2. Heart fills/unfills
3. Snippet appears/disappears from Favorites tab
4. Haptic selection feedback

### Flow 4: Pin a Snippet
1. User taps pin icon on snippet card OR in detail view
2. Pin activates/deactivates
3. Pinned snippets float to top of Library list
4. Haptic selection feedback

### Flow 5: Edit a Snippet
1. User taps snippet card to open Detail
2. User taps Edit button
3. Edit modal opens with pre-filled fields
4. User modifies and taps Save
5. Returns to updated Detail view

### Flow 6: Delete a Snippet
1. User opens Edit modal or Detail view
2. Taps Delete button
3. Confirmation alert appears
4. User confirms
5. Snippet removed, returns to Library
6. Haptic medium feedback

### Flow 7: Resolve a Sync Conflict
1. User opens Settings and taps the visible conflict badge only when unresolved conflicts exist.
2. The conflict screen shows the first conflict and defaults to the local "Your edit" revision.
3. User switches between the clearly labelled local and cloud revisions to inspect title, language, tags, description, and code without accidental edits.
4. User taps **Use Your Edit** or **Use Cloud Edit** in the thumb-reachable bottom action area.
5. A confirmation dialog restates the selection; user confirms or cancels.
6. Connected users see a success state and the next conflict; offline users retain the comparison and receive clear retry guidance.

---

## Navigation Structure

```
Tab Bar (3 tabs)
├── Library (index) — house.fill icon
├── Favorites — heart.fill icon  
└── Settings — gear icon
```

Modal stack (presented over tabs):
- Add/Edit Snippet
- Snippet Detail
- Sync Conflicts

---

## Typography

- **Screen titles:** 28px bold
- **Card titles:** 17px semibold
- **Body/description:** 15px regular
- **Code blocks:** 13px monospace
- **Metadata/tags:** 12px muted
- **Buttons:** 15px semibold

---

## Interaction Patterns

- **Copy button:** Scale 0.97 + haptic light + "Copied!" toast
- **Card tap:** Opacity 0.7 press state → opens Detail
- **FAB tap:** Scale 0.97 + haptic light → opens Add modal
- **Swipe actions:** None in V1 (keep it simple)
- **Pull to refresh:** Not needed (local data, always fresh)
- **Search:** Debounced 150ms, filters as you type

---

## Conflict Resolution Mobile Checkpoint

**Platform:** Android phones in portrait orientation plus the installed PWA. The feature uses Expo Router and React Native; no iOS-specific UI is planned because the product scope excludes iOS.

**MFRI:** Platform clarity 5 + accessibility readiness 4 − interaction complexity 2 − performance risk 1 − offline dependence 2 = **4 (moderate)**. The original side-by-side comparison idea was deliberately simplified to one version at a time with a visible selector, which protects readability, memory, and one-handed use without hiding either choice.

**Files reviewed:** `mobile-design-thinking.md`, `touch-psychology.md`, `mobile-performance.md`, `mobile-backend.md`, `mobile-testing.md`, `mobile-debugging.md`, and `platform-android.md`.

**Principles applied:** Use 48dp-or-larger visible actions with 8dp separation; preserve every conflict payload until an explicit, confirmed selection; and render one conflict at a time with no animated or unbounded list work.

**Anti-patterns avoided:** No gesture-only resolution, no automatic last-write-wins UI masquerading as a user choice, and no network-dependent blank state when cached conflict information is available.
