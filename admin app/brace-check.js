const fs = require('fs');
const text = fs.readFileSync('src/screens/MemoScreen.tsx', 'utf8');
let state = 'code';
let braceCount = 0;
let line = 1;
let col = 0;
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (ch === '\n') { line++; col = 0; continue; }
  col++;
  const prev = i > 0 ? text[i-1] : '';
  if (state === 'code') {
    if (ch === '/' && text[i+1] === '/') { state = 'linecomment'; continue; }
    if (ch === '/' && text[i+1] === '*') { state = 'blockcomment'; i++; continue; }
    if (ch === '"') { state = 'double'; continue; }
    if (ch === "'") { state = 'single'; continue; }
    if (ch === '`') { state = 'template'; continue; }
    if (ch === '{') braceCount++;
    if (ch === '}') braceCount--;
    if (braceCount < 0) { console.log('negative', line, col, text.slice(i-20,i+20)); process.exit(0); }
  } else if (state === 'linecomment') {
    if (ch === '\n') state = 'code';
  } else if (state === 'blockcomment') {
    if (ch === '*' && text[i+1] === '/') { state = 'code'; i++; col++; }
  } else if (state === 'double') {
    if (ch === '"' && prev !== '\\') state = 'code';
  } else if (state === 'single') {
    if (ch === "'" && prev !== '\\') state = 'code';
  } else if (state === 'template') {
    if (ch === '`' && prev !== '\\') { state = 'code'; continue; }
    if (ch === '$' && text[i+1] === '{') { state = 'template-expr'; i++; col++; }
  } else if (state === 'template-expr') {
    if (ch === '`' && prev !== '\\') { state = 'code'; continue; }
    if (ch === '{') braceCount++;
    if (ch === '}') { braceCount--; if (braceCount === 0) state = 'template'; }
  }
}
console.log('final', braceCount, state);
