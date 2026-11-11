// Builds index.html (links the files, for GitHub Pages or opening locally)
// and dist/last-quarter.html (everything inlined into one file).
const fs = require('fs'), path = require('path');
const root = __dirname, rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = rd('src/body.html'), css = rd('style.css');
const js = fs.readdirSync(path.join(root, 'js')).sort();
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600&family=Press+Start+2P&display=swap">';
const head = '<title>Last Quarter</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n' + fonts;

fs.writeFileSync(path.join(root, 'index.html'),
  '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  head + '\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n' + body +
  js.map(f => '<script src="js/' + f + '"></script>').join('\n') + '\n</body>\n</html>\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/last-quarter.html'),
  head + '\n<style>\n' + css + '</style>\n' + body + '<script>\n' + js.map(f => rd('js/' + f)).join('\n') + '</script>\n');
console.log('built', js.length, 'scripts');
