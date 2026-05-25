const fs = require('fs');

const file = 'components/ResumePreview.tsx';
const content = fs.readFileSync(file, 'utf8');
const buttons = content.match(/<button[\s\S]*?<\/button>/g);
if (buttons) {
  buttons.forEach((b, i) => {
    if (b.includes('material-symbols-outlined') && !b.includes('aria-hidden="true"')) {
       console.log(`Icon Button MISSING aria-hidden="true": \n${b.substring(0, 150)}...`);
    }
    if (b.includes('material-symbols-outlined') && !b.includes('aria-label=')) {
       console.log(`Icon Button MISSING aria-label: \n${b.substring(0, 150)}...`);
    }
  });
}
