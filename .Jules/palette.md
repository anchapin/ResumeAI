## 2025-05-24 - Consistent Copy Feedback

**Learning:** The application had inconsistent feedback for copy actions. `ShareDialog` provided "Copied!" feedback, while `Settings` (API key copy) used a toast only. To improving perceived performance and assurance, immediate button state change is preferred over just toast notifications.
**Action:** When implementing copy-to-clipboard functionality, always use the pattern: Change button text to "Copied!" and icon to "check" for 2 seconds, in addition to or instead of a toast.

## 2025-05-24 - API Key Copy Button Accessibility

**Learning:** The copy button for newly generated API keys lacked an `aria-label`, meaning screen readers would read it as a blank button after it was copied. The `ShareDialog` provided a better model for this interaction.
**Action:** When implementing interactive buttons that change state (like copy buttons), always ensure the `aria-label` dynamically updates to reflect the new state (e.g. from "Copy API key" to "API key copied") to give screen reader users clear, immediate feedback of the action resolving.
## 2026-03-08 - Added ARIA labels to icon-only buttons
**Learning:** Found multiple instances where icon-only buttons lacked `aria-label` attributes and the inner Material Symbol `<span>` elements lacked `aria-hidden="true"`. This is a common pattern in the repository that reduces accessibility for screen reader users. Dynamic aria-labels (like "Expand details" vs "Collapse details") enhance context.
**Action:** Always ensure icon-only buttons have descriptive `aria-label`s and hide decorative ligature icons with `aria-hidden="true"`.

## 2026-03-09 - Ensure aria-hidden for ligature icons
**Learning:** Adding `aria-label`s to buttons is critical, but when the button uses an icon font like Material Symbols that relies on text ligatures (e.g., `close`, `history`, `edit`), screen readers will read the ligature text aloud. This creates a confusing experience (e.g. reading "Close close" or just "Close" when it should be "Close form").
**Action:** When adding `aria-label` to an icon-only button that uses ligature icons, always ensure the inner `<span>` element containing the ligature text has `aria-hidden="true"`.

## 2026-05-06 - Always Check Ligature Icons
**Learning:** Found multiple instances where the `aria-hidden="true"` attribute was missing from ligature icons inside interactive elements (`components/ResumeCard.tsx`), despite a previous learning about this issue. The omission causes screen readers to read the literal text of the icon (e.g., "edit", "share", "delete", "content_copy") even when the parent button already has a descriptive `aria-label`. This redundancy can make navigation confusing.
**Action:** When working on UI components that use Material Symbols or similar ligature-based icon fonts, especially inside interactive elements like `<button>` or `<a>`, make it a habit to proactively audit all `<span className="material-symbols-outlined">` tags to ensure they include `aria-hidden="true"`. Do not assume it was added globally.
