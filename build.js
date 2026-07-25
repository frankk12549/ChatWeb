const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '.vercel', 'output', 'static');
fs.mkdirSync(out, { recursive: true });

const files = ['index.html', 'favicon.png', 'favicon.svg', 'manifest.webmanifest'];
files.forEach(f => {
  let src = path.join(__dirname, f);
  if (!fs.existsSync(src)) src = path.join(__dirname, 'public', f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, f));
    console.log('Copied:', f);
  } else {
    console.log('Not found:', f);
  }
});

console.log('Build done');
