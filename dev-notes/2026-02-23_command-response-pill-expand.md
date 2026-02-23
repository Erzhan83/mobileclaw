# Command Response Pill — Auto-Expand Issue

**Date**: 2026-02-23
**Status**: Unsolved — pill renders correctly, auto-expand animation consistently fails on real connection

## What We Built

Slash commands (e.g., `/status`, `/commands`, `/model`) now render as expandable pills instead of regular chat bubbles:

1. User sends a slash command → user message is hidden (`isHidden`)
2. A placeholder assistant message is created with `isCommandResponse: true` and empty content
3. A centered spinner pill shows "Running..."
4. When the response arrives, the pill populates with content and should auto-expand

### Files Modified

- **`types/chat.ts`** — Added `isCommandResponse` and `isHidden` to `Message`
- **`app/page.tsx`** — Slash command detection, placeholder creation, placeholder filling, ID mapping, effectiveId resolution
- **`components/MessageRow.tsx`** — `CommandResponsePill` component, spinner inline, `ContextPill` restyled
- **`lib/demoMode.ts`** — Slash command demo responses with `instant: true`
- **`app/globals.css`** — Added `@keyframes gridSlideOpen`

### What Works

- Slash commands render as pills (not regular bubbles)
- User message is hidden for slash commands
- Spinner shows while waiting
- Content populates into the pill when response arrives
- Clicking the pill toggles expand/collapse
- **Demo mode**: auto-expand animation works
- **Client-only commands**: `/commands` (local) auto-expands correctly on render
- `ContextPill` (user-side) restyled back to dark `bg-primary`
- `InjectedPill` (assistant-side) left-aligned with `bg-card` style
- Compact spacing (`-mt-1.5`) between consecutive pills

## The Bug: Auto-Expand Doesn't Work on OpenClaw

The pill renders with content but stays collapsed. User must click to expand. Works perfectly in demo mode and for local `/commands`.

### Root Cause Analysis

The fundamental difference between demo/local and OpenClaw:

**Demo/Local**: Client generates `runId`, uses it for both the placeholder message and the update. The message ID never changes. React key stays stable. The update happens in a controlled lifecycle.

**OpenClaw mode**: Server responds with a different `runId`. We map this to the client ID, but the frequency and batching of WebSocket events seem to interfere with React's ability to paint the initial `0fr` state before the final `1fr` state is reached.

### Approaches Tried (All Failed on OpenClaw)

| # | Approach | Result |
|---|----------|--------|
| 1 | `useEffect` + double `requestAnimationFrame` + `setExpanded(true)` | No expand |
| 2 | `useEffect` + `setTimeout(30ms)` + `setExpanded(true)` | No expand |
| 3 | Split spinner/pill into separate components, mount pill fresh with rAF on `[]` | No expand |
| 4 | Exact SpawnPill pattern: `useState(false)` + `useEffect(rAF, [])` + `SlideContent` | No expand |
| 5 | `setTimeout(50ms)` instead of rAF | No expand |
| 6 | `useState(true)` — start expanded, no animation | No expand (before placeholder fix — was never mounting) |
| 7 | Pure CSS `@keyframes gridSlideOpen` animation, no JS timing | No expand |
| 8 | **ID Sync**: Use `getEffectiveRunId` to map server `runId` to client placeholder `id`. | `isStreaming` correctly set to true, but animation still skipped. |
| 9 | **History Persistence**: Carry over `isCommandResponse` flag during history merges. | Prevents bubble from reverting to standard bubble, but doesn't fix initial expansion. |
| 10| **Pure CSS + Keyed Remount**: Use `key={message.id}` and `animation: gridSlideOpen` to force a CSS-only transition on mount. | No expand. |
| 11| **Agent Stream Coverage**: Map IDs across `content`, `reasoning`, and `tool` streams (not just `chat`). | Correctly fills placeholder from all streams, but animation still skipped. |

### Why It's Difficult

The `SpawnPill` uses an identical pattern and works. The `CommandResponsePill` also works for local commands. The failure is exclusive to server-delivered responses. This suggests that the layout recalculations triggered by `beginContentArrival()` or the rapid batching of `setMessages` in the WebSocket event loop is suppressing the initial paint required for a CSS transition/animation.

### Suggested Next Steps

1. **Force a two-phase render**: Instead of filling the placeholder in the delta handler, set a flag like `contentReady` on the message, then use a separate effect in CommandResponsePill to detect it and trigger the expand after a guaranteed paint.
2. **Accept no animation**: Start with `open=true` (no slide) for the OpenClaw case to ensure the user at least sees the content without clicking.
