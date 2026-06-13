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
## 2026-04-02 - Custom Tab Component Accessibility
**Learning:** Custom tab implementations (like comment filter buttons) often lack necessary focus rings and active state announcements for screen readers. Using just active classes (e.g. `bg-white`) is not sufficient for keyboard navigation or screen reader context.
**Action:** Always add explicit `focus-visible:ring` classes to ensure tab elements are navigable by keyboard. Use the `aria-pressed` or `aria-current` attributes to correctly announce the active tab to assistive technologies.
## 2026-06-13 - Accessible Tabs & Material Icon Ligatures
**Learning:** Custom tab implementations lacking semantic roles (`tablist`, `tab`, `tabpanel`) cause severe usability issues for screen reader users by hiding the relationship between tab controls and their content panels. Additionally, Material Symbol ligatures (like `<span className="material-symbols-outlined">star</span>`) must always have `aria-hidden="true"` applied to prevent repetitive or out-of-context screen reader announcements of the raw ligature text.
**Action:** When implementing custom tabs, always provide proper ARIA roles and relationships. For Material Symbols used decoratively alongside text, explicitly hide them from assistive technologies using `aria-hidden="true"`.
