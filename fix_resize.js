const fs = require('fs');
let m = fs.readFileSync('src/main.js', 'utf8');

// Replace the broken resizeCanvas with a safe version:
// - Only shrink, never stretch beyond 800px
// - Use requestAnimationFrame to ensure layout is settled
// - Keep scale factors consistent (both axes same ratio)
const oldResize = `\t// Responsive canvas sizing\n\tfunction resizeCanvas() {\n\t\tvar container = canvas.parentElement;\n\t\tvar maxW = Math.min(800, container.clientWidth - 40);\n\t\tif (maxW < 280) maxW = 280;\n\t\tcanvas.style.width = maxW + 'px';\n\t\tcanvas.style.height = (maxW * 0.75) + 'px';\n\t}\n\tresizeCanvas();\n\twindow.addEventListener('resize', resizeCanvas);`;

const newResize = `\t// Responsive canvas sizing — run after layout settles via rAF
\tfunction resizeCanvas() {
\t\tvar container = canvas.parentElement;
\t\tvar availW = container.clientWidth - 44; // 20px padding each side + 2px border
\t\tif (availW <= 0 || availW >= 800) {
\t\t\t// No CSS override needed — canvas shows at its natural 800x600
\t\t\tcanvas.style.width = '';
\t\t\tcanvas.style.height = '';
\t\t\treturn;
\t\t}
\t\t// Scale down proportionally
\t\tvar scale = availW / 800;
\t\tcanvas.style.width = Math.floor(800 * scale) + 'px';
\t\tcanvas.style.height = Math.floor(600 * scale) + 'px';
\t}
\trequestAnimationFrame(function() { resizeCanvas(); });
\twindow.addEventListener('resize', resizeCanvas);`;

if (m.includes(oldResize)) {
    m = m.replace(oldResize, newResize);
    console.log('✓ resizeCanvas fixed');
} else {
    console.error('✗ could not find resizeCanvas block');
}

fs.writeFileSync('src/main.js', m, 'utf8');
console.log('done');
