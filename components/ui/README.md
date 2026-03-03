# ResumeAI UI Component Library

A collection of reusable, accessible UI components built with React 19, TypeScript, and Tailwind CSS.

## Components

- **Button**: Versatile button with variants (primary, secondary, outline, ghost, danger) and sizes.
- **Input**: Accessible input field with label, error state, and icon support.
- **Select**: Custom select component with icon support and consistent styling.
- **Card**: Simple container component for grouping content.
- **Dialog**: Accessible modal dialog component.

## Usage

```tsx
import { Button, Input, Select } from './components/ui';

const MyComponent = () => (
  <div>
    <Input label="Email" placeholder="email@example.com" />
    <Select label="Role">
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </Select>
    <Button variant="primary">Submit</Button>
  </div>
);
```
