const fs = require('fs');
const files = [
  'components/ResumePreview.tsx',
  'components/TemplateSelector.tsx',
  'components/OfferComparison.tsx'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n--- ${file} ---`);
  const buttons = content.match(/<button[\s\S]*?<\/button>/g);
  if (buttons) {
    buttons.forEach((b, i) => {
      if (!b.includes('aria-label') && (b.includes('material-symbols-outlined') || !b.includes('>'))) {
         console.log(`Button ${i}: MISSING aria-label`);
      }
    });
  }
}
