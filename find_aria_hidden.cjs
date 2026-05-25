const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('components', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    const buttons = content.match(/<button[\s\S]*?<\/button>|<Button[\s\S]*?<\/Button>/g);
    if (buttons) {
      buttons.forEach((b, i) => {
        if (b.includes('aria-label') && b.includes('material-symbols-outlined') && !b.includes('aria-hidden="true"')) {
           console.log(`\n--- ${filePath} ---`);
           console.log(`Button MISSING aria-hidden="true" on icon: \n${b.trim()}`);
        }
      });
    }
  }
});
