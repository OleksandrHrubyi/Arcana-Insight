# UI Rules (Project)

- For mobile bottom sheets, when the energy sheet is open, hide the entire bottom navigation wrapper (`.bottom-nav-wrap`) via a `body` state class to prevent overlap/tap blocking.
- Close buttons inside sheets must use the same visual style as the project-wide sheet close action pattern (`oracle-actions__ok` look and sizing), not a custom variant.
- Do not show helper microcopy like `Tap the highlighted step to continue your ritual.` in the energy sheet unless explicitly requested.
- Every tappable primary/secondary button in app flows should trigger light haptic feedback by default; only skip it for deliberate edge-cases explicitly approved in spec.
