import fs from 'fs';

const path = 'node_modules/eslint-plugin-react/lib/util/version.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('contextOrFilename.getFilename()', 'contextOrFilename.filename || contextOrFilename.getFilename()');
fs.writeFileSync(path, content);
