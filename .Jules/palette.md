## 2025-05-24 - Consistent Copy Feedback

**Learning:** The application had inconsistent feedback for copy actions. `ShareDialog` provided "Copied!" feedback, while `Settings` (API key copy) used a toast only. To improving perceived performance and assurance, immediate button state change is preferred over just toast notifications.
**Action:** When implementing copy-to-clipboard functionality, always use the pattern: Change button text to "Copied!" and icon to "check" for 2 seconds, in addition to or instead of a toast.

## 2025-05-24 - API Key Copy Button Accessibility

**Learning:** The copy button for newly generated API keys lacked an `aria-label`, meaning screen readers would read it as a blank button after it was copied. The `ShareDialog` provided a better model for this interaction.
**Action:** When implementing interactive buttons that change state (like copy buttons), always ensure the `aria-label` dynamically updates to reflect the new state (e.g. from "Copy API key" to "API key copied") to give screen reader users clear, immediate feedback of the action resolving.
