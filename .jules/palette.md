# Palette's Journal

## 2024-05-22 - Sidebar Accessibility

**Learning:** Common pattern of `div` with `onClick` used for navigation/interactive elements instead of semantic `<button>` or `<a>` tags. This breaks keyboard accessibility and screen reader support.
**Action:** Always check interactive elements for semantic HTML tags. Replace `div` with `button` or `a` and ensure `type="button"` for non-submit buttons. Add `aria-label` where text is not descriptive enough, and `aria-current` for navigation links.

## 2024-05-23 - Material Symbols Screen Reader Accessibility

**Learning:** Material Symbols (using ligatures like `<span className="material-symbols-outlined">icon_name</span>`) are often announced literally by screen readers (e.g., "icon name") when used decoratively alongside text, creating redundant and confusing auditory experiences. Additionally, icons acting as loading spinners (`animate-spin`) lack proper container semantics to announce their state.
**Action:** Always add `aria-hidden="true"` to Material Symbol `<span>` elements used decoratively alongside visible text. For icon-only loading states (spinners) and status indicators, ensure the parent container has `role="status"` and `aria-live="polite"`.
## 2026-03-11 - Material Symbol Ligature Accessibility
**Learning:** Material Symbol icons implemented as text ligatures (e.g., <span ...>close</span>) require aria-hidden='true' to prevent screen readers from announcing the ligature text ('close').
**Action:** Always add aria-hidden='true' to ligature-based icon elements and ensure the parent interactive element has a descriptive aria-label.
## 2026-03-11 - Material Symbol Ligature Screen Reader Noise
**Learning:** Even within an interactive element with a proper `aria-label`, the ligature text (e.g., "delete") of a Material Symbol `<span>` is sometimes still announced by certain screen readers, causing repetitive or confusing announcements.
**Action:** Always add `aria-hidden="true"` to Material Symbol `<span>` elements acting as ligatures to strictly enforce their decorative status and let the parent interactive element handle the accessible name.
## 2026-03-21 - Added missing ARIA labels to ActivityFeed.tsx icons
**Learning:** Found multiple instances where dynamic content notifications and close actions relied purely on icons (e.g. ActivityFeed.tsx). Screen readers will read the raw text or skip completely without an aria-label, especially when using standard `<svg>` tags. Also, `aria-hidden='true'` should be used on the SVG when an `aria-label` is set on the parent button.
**Action:** When implementing icon-only buttons, always apply an `aria-label` on the parent `<button>` element and hide the inner decorative `<svg>` from assistive technologies using `aria-hidden='true'`.
