const fs = require('fs');
let m = fs.readFileSync('src/main.js', 'utf8');

// Expose shift as a module-level getter/setter on window so the HTML button works
const oldShiftDecl = 'var shift = false;';
const newShiftDecl = `var shift = false;
// Expose shift so the touch Arrow Mode button (in HTML) can toggle it
Object.defineProperty(window, '_fsmShift', {
\tget: function() { return shift; },
\tset: function(v) { shift = v; }
});`;

if (m.includes(oldShiftDecl)) {
    m = m.replace(oldShiftDecl, newShiftDecl);
    console.log('✓ shift exposed on window');
} else {
    console.error('✗ could not find shift decl');
}

fs.writeFileSync('src/main.js', m, 'utf8');

// Fix index.html to use window._fsmShift instead of window.shift
let h = fs.readFileSync('index.html', 'utf8');
h = h.replace(/window\.shift\s*=/g, 'window._fsmShift =');
fs.writeFileSync('index.html', h, 'utf8');
console.log('✓ index.html updated to use _fsmShift');
console.log('done');
