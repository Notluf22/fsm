const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');

// 1. canvas CSS - add touch-action and max-width
const old1 = 'cursor: crosshair;';
const new1 = 'cursor: crosshair;\r\n            touch-action: none;\r\n            max-width: 100%;';
h = h.replace(old1, new1);
console.log(h.includes('touch-action') ? '✓ canvas css' : '✗ canvas css');

// 2. mobile CSS before </style>
const mobileCSS = '\r\n        /* Mobile responsive */\r\n        @media (max-width: 650px) {\r\n            body { padding: 16px 10px; }\r\n            h1 { font-size: 2rem; }\r\n            .subtitle { font-size: 0.9rem; }\r\n            .container { gap: 14px; }\r\n            .canvas-container { padding: 10px; border-radius: 14px; }\r\n            .sidebar { max-width: 100%; }\r\n            .card { padding: 14px; }\r\n            .btn { padding: 8px 10px; font-size: 0.8rem; }\r\n        }\r\n';
if (!h.includes('@media (max-width:')) {
    h = h.replace('    </style>', mobileCSS + '    </style>');
}
console.log(h.includes('@media') ? '✓ mobile css' : '✗ mobile css');

// 3. Arrow Mode button after Simulate button
const simBtn = 'border:none;">Simulate</button>';
if (h.includes(simBtn) && !h.includes('btnArrowMode')) {
    h = h.replace(simBtn, simBtn + '\r\n                    <button id="btnArrowMode" class="btn" style="display:none;">\uD83D\uDD17 Arrow Mode</button>');
}
console.log(h.includes('btnArrowMode') ? '✓ arrow btn' : '✗ arrow btn');

// 4. instructions - update for mobile
h = h.replace(
    '<li><b>Add a state:</b> Double-click on canvas</li>',
    '<li><b>Add state:</b> Double-click / double-tap</li>'
);
h = h.replace(
    '<li><b>Add an arrow:</b> Shift-drag from state</li>',
    '<li><b>Arrow (desktop):</b> Shift-drag from state</li>\r\n                    <li><b>Arrow (mobile):</b> Tap \u201cArrow Mode\u201d then drag</li>'
);
h = h.replace('<li><b>Move something:</b>', '<li><b>Move:</b>');
h = h.replace('Drag it around</li>', 'Drag it</li>');
h = h.replace('<li><b>Delete something:</b>', '<li><b>Delete:</b>');
console.log(h.includes('double-tap') ? '✓ instructions' : '✗ instructions');

// 5. Patch DOMContentLoaded to add Arrow Mode handler
// Find the closing of the existing DOMContentLoaded listener
const domIdx = h.indexOf('document.addEventListener("DOMContentLoaded"');
const closingTag = '    });\r\n    </script>';
const arrowHandlerCode = '\r\n\r\n        // Show Arrow Mode button on touch-capable devices\r\n        if (\'ontouchstart\' in window || navigator.maxTouchPoints > 0) {\r\n            var arrowBtn = document.getElementById(\'btnArrowMode\');\r\n            if (arrowBtn) arrowBtn.style.display = \'\';\r\n        }\r\n\r\n        // Arrow Mode toggle — mobile substitute for Shift key\r\n        var arrowModeBtn = document.getElementById(\'btnArrowMode\');\r\n        if (arrowModeBtn) {\r\n            arrowModeBtn.addEventListener(\'click\', function() {\r\n                if (window._touchArrowMode) {\r\n                    window._touchArrowMode = false;\r\n                    window.shift = false;\r\n                    this.textContent = \'\uD83D\uDD17 Arrow Mode\';\r\n                    this.style.background = \'\';\r\n                    this.style.color = \'\';\r\n                } else {\r\n                    window._touchArrowMode = true;\r\n                    window.shift = true;\r\n                    this.textContent = \'\u2705 Arrow ON\';\r\n                    this.style.background = \'#6366f1\';\r\n                    this.style.color = \'white\';\r\n                }\r\n            });\r\n        }\r\n';

if (!h.includes('_touchArrowMode')) {
    h = h.replace(closingTag, arrowHandlerCode + '    });\r\n    </script>');
    console.log('✓ DOMContentLoaded patched');
} else {
    console.log('✓ DOMContentLoaded already patched');
}

fs.writeFileSync('index.html', h, 'utf8');
console.log('All done!');
