## 2024-07-04 - Adding ARIA Labels to Icon-Only Buttons
**Learning:** Found multiple instances in `pages/Settings.tsx` where icon-only buttons (like Notifications, API key visibility toggle, and Close modals) were missing `aria-label` attributes, which makes them inaccessible to screen readers.
**Action:** When adding new icon-only interactive elements using Material Symbols, ensure they always have an `aria-label` attribute describing their action (e.g. `aria-label="Close"`).
