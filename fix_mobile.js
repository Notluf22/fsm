const fs = require('fs');

// ─── Fix main.js ────────────────────────────────────────────────
let mainJs = fs.readFileSync('src/main.js', 'utf8');

// 1. Replace the old offsetParent pos functions with getBoundingClientRect
const oldPos = `function crossBrowserElementPos(e) {\r\n\te = e || window.event;\r\n\tvar obj = e.target || e.srcElement;\r\n\tvar x = 0, y = 0;\r\n\twhile(obj.offsetParent) {\r\n\t\tx += obj.offsetLeft;\r\n\t\ty += obj.offsetTop;\r\n\t\tobj = obj.offsetParent;\r\n\t}\r\n\treturn { 'x': x, 'y': y };\r\n}\r\n\r\nfunction crossBrowserMousePos(e) {\r\n\te = e || window.event;\r\n\treturn {\r\n\t\t'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,\r\n\t\t'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,\r\n\t};\r\n}\r\n\r\nfunction crossBrowserRelativeMousePos(e) {\r\n\tvar element = crossBrowserElementPos(e);\r\n\tvar mouse = crossBrowserMousePos(e);\r\n\treturn {\r\n\t\t'x': mouse.x - element.x,\r\n\t\t'y': mouse.y - element.y\r\n\t};\r\n}`;

const newPos = `function crossBrowserRelativeMousePos(e) {
\tvar rect = canvas.getBoundingClientRect();
\tvar scaleX = canvas.width / rect.width;
\tvar scaleY = canvas.height / rect.height;
\tvar clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
\tvar clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
\treturn {
\t\t'x': (clientX - rect.left) * scaleX,
\t\t'y': (clientY - rect.top) * scaleY
\t};
}`;

if (!mainJs.includes(oldPos)) {
  console.error('ERROR: Could not find crossBrowserElementPos block in main.js');
  process.exit(1);
}
mainJs = mainJs.replace(oldPos, newPos);

// 2. Insert touch handlers + resize inside window.onload, replacing the old closing brace
const oldOnloadEnd = `\tcanvas.onmouseup = function(e) {\r\n\t\tmovingObject = false;\r\n\r\n\t\tif(currentLink != null) {\r\n\t\t\tif(!(currentLink instanceof TemporaryLink)) {\r\n\t\t\t\tselectedObject = currentLink;\r\n\t\t\t\tlinks.push(currentLink);\r\n\t\t\t\tresetCaret();\r\n\t\t\t}\r\n\t\t\tcurrentLink = null;\r\n\t\t\tdraw();\r\n\t\t}\r\n\t};\r\n}`;

const newOnloadEnd = `\tcanvas.onmouseup = function(e) {
\t\tmovingObject = false;

\t\tif(currentLink != null) {
\t\t\tif(!(currentLink instanceof TemporaryLink)) {
\t\t\t\tselectedObject = currentLink;
\t\t\t\tlinks.push(currentLink);
\t\t\t\tresetCaret();
\t\t\t}
\t\t\tcurrentLink = null;
\t\t\tdraw();
\t\t}
\t};

\t// ---- Touch Support ----
\tvar lastTapTime = 0;

\tfunction getTouchPos(touch) {
\t\tvar rect = canvas.getBoundingClientRect();
\t\tvar scaleX = canvas.width / rect.width;
\t\tvar scaleY = canvas.height / rect.height;
\t\treturn {
\t\t\t'x': (touch.clientX - rect.left) * scaleX,
\t\t\t'y': (touch.clientY - rect.top) * scaleY
\t\t};
\t}

\tcanvas.addEventListener('touchstart', function(e) {
\t\te.preventDefault();
\t\tvar touch = e.changedTouches[0];
\t\tvar mouse = getTouchPos(touch);

\t\t// Double-tap to add state / toggle accept
\t\tvar now = Date.now();
\t\tvar doubleTap = (now - lastTapTime) < 300 && e.touches.length === 1;
\t\tlastTapTime = now;

\t\tif (doubleTap) {
\t\t\tselectedObject = selectObject(mouse.x, mouse.y);
\t\t\tif (selectedObject == null) {
\t\t\t\tselectedObject = new Node(mouse.x, mouse.y);
\t\t\t\tnodes.push(selectedObject);
\t\t\t\tresetCaret();
\t\t\t\tdraw();
\t\t\t} else if (selectedObject instanceof Node) {
\t\t\t\tselectedObject.isAcceptState = !selectedObject.isAcceptState;
\t\t\t\tdraw();
\t\t\t}
\t\t\treturn;
\t\t}

\t\tselectedObject = selectObject(mouse.x, mouse.y);
\t\tmovingObject = false;
\t\toriginalClick = mouse;

\t\tif (selectedObject != null) {
\t\t\tif (shift && selectedObject instanceof Node) {
\t\t\t\tcurrentLink = new SelfLink(selectedObject, mouse);
\t\t\t} else {
\t\t\t\tmovingObject = true;
\t\t\t\tdeltaMouseX = deltaMouseY = 0;
\t\t\t\tif (selectedObject.setMouseStart) {
\t\t\t\t\tselectedObject.setMouseStart(mouse.x, mouse.y);
\t\t\t\t}
\t\t\t}
\t\t\tresetCaret();
\t\t} else if (shift) {
\t\t\tcurrentLink = new TemporaryLink(mouse, mouse);
\t\t}
\t\tdraw();
\t}, { passive: false });

\tcanvas.addEventListener('touchmove', function(e) {
\t\te.preventDefault();
\t\tvar touch = e.changedTouches[0];
\t\tvar mouse = getTouchPos(touch);

\t\tif (currentLink != null) {
\t\t\tvar targetNode = selectObject(mouse.x, mouse.y);
\t\t\tif (!(targetNode instanceof Node)) targetNode = null;

\t\t\tif (selectedObject == null) {
\t\t\t\tif (targetNode != null) {
\t\t\t\t\tcurrentLink = new StartLink(targetNode, originalClick);
\t\t\t\t} else {
\t\t\t\t\tcurrentLink = new TemporaryLink(originalClick, mouse);
\t\t\t\t}
\t\t\t} else {
\t\t\t\tif (targetNode == selectedObject) {
\t\t\t\t\tcurrentLink = new SelfLink(selectedObject, mouse);
\t\t\t\t} else if (targetNode != null) {
\t\t\t\t\tcurrentLink = new Link(selectedObject, targetNode);
\t\t\t\t} else {
\t\t\t\t\tcurrentLink = new TemporaryLink(selectedObject.closestPointOnCircle(mouse.x, mouse.y), mouse);
\t\t\t\t}
\t\t\t}
\t\t\tdraw();
\t\t}

\t\tif (movingObject) {
\t\t\tselectedObject.setAnchorPoint(mouse.x, mouse.y);
\t\t\tif (selectedObject instanceof Node) snapNode(selectedObject);
\t\t\tdraw();
\t\t}
\t}, { passive: false });

\tcanvas.addEventListener('touchend', function(e) {
\t\te.preventDefault();
\t\tmovingObject = false;

\t\tif (currentLink != null) {
\t\t\tif (!(currentLink instanceof TemporaryLink)) {
\t\t\t\tselectedObject = currentLink;
\t\t\t\tlinks.push(currentLink);
\t\t\t\tresetCaret();
\t\t\t}
\t\t\tcurrentLink = null;
\t\t\tdraw();
\t\t}

\t\t// Auto-reset arrow mode after gesture
\t\tif (window._touchArrowMode) {
\t\t\tshift = false;
\t\t\twindow._touchArrowMode = false;
\t\t\tvar btn = document.getElementById('btnArrowMode');
\t\t\tif (btn) {
\t\t\t\tbtn.textContent = '\u{1F517} Arrow Mode';
\t\t\t\tbtn.style.background = '';
\t\t\t\tbtn.style.color = '';
\t\t\t}
\t\t}
\t}, { passive: false });

\t// Responsive canvas sizing
\tfunction resizeCanvas() {
\t\tvar container = canvas.parentElement;
\t\tvar maxW = Math.min(800, container.clientWidth - 40);
\t\tif (maxW < 280) maxW = 280;
\t\tcanvas.style.width = maxW + 'px';
\t\tcanvas.style.height = (maxW * 0.75) + 'px';
\t}
\tresizeCanvas();
\twindow.addEventListener('resize', resizeCanvas);
}`;

if (!mainJs.includes(oldOnloadEnd)) {
  console.error('ERROR: Could not find canvas.onmouseup block ending in main.js');
  process.exit(1);
}
mainJs = mainJs.replace(oldOnloadEnd, newOnloadEnd);

fs.writeFileSync('src/main.js', mainJs, 'utf8');
console.log('✓ main.js patched');

// ─── Fix index.html ─────────────────────────────────────────────
let html = fs.readFileSync('index.html', 'utf8');

// 1. Add touch-action: none and max-width: 100% to canvas CSS
html = html.replace(
  'cursor: crosshair;\r\n            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);\r\n            transition: transform 0.3s ease;',
  'cursor: crosshair;\r\n            touch-action: none;\r\n            max-width: 100%;\r\n            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);\r\n            transition: transform 0.3s ease;'
);

// 2. Add responsive + mobile CSS before </style>
const mobileCSS = `
        /* Mobile responsive */
        @media (max-width: 600px) {
            body { padding: 16px 10px; }
            h1 { font-size: 2rem; }
            .subtitle { font-size: 0.95rem; }
            .container { gap: 16px; }
            .canvas-container { padding: 12px; border-radius: 16px; }
            .sidebar { max-width: 100%; }
            .card { padding: 16px; }
            .btn { padding: 8px 12px; font-size: 0.82rem; }
        }

`;
html = html.replace('    </style>', mobileCSS + '    </style>');

// 3. Add Arrow Mode button in the tools card
html = html.replace(
  '<button id="btnSimulate" class="btn" style="background:#8b5cf6; color:white; border:none;">Simulate</button>',
  '<button id="btnSimulate" class="btn" style="background:#8b5cf6; color:white; border:none;">Simulate</button>\r\n                    <button id="btnArrowMode" class="btn" style="display:none;">🔗 Arrow Mode</button>'
);

// 4. Update instructions to mention mobile
html = html.replace(
  '<li><b>Add a state:</b> Double-click on canvas</li>\r\n                    <li><b>Add an arrow:</b> Shift-drag from state</li>\r\n                    <li><b>Move something:</b> Drag it around</li>\r\n                    <li><b>Delete something:</b> Click &amp; press Delete</li>',
  '<li><b>Add a state:</b> Double-click (or double-tap)</li>\r\n                    <li><b>Toggle accept:</b> Double-click a state</li>\r\n                    <li><b>Add an arrow (desktop):</b> Shift-drag from state</li>\r\n                    <li><b>Add an arrow (mobile):</b> Tap "Arrow Mode", then drag</li>\r\n                    <li><b>Move:</b> Drag it around</li>\r\n                    <li><b>Delete:</b> Click &amp; press Delete</li>'
);

// 5. Show Arrow Mode button on touch devices & wire up handler
const oldDOMReady = `    document.addEventListener("DOMContentLoaded", function() {
        const outputEl = document.getElementById('output');
        setInterval(() => {
            if (outputEl.value && outputEl.value.trim() !== '') {
                outputEl.classList.add('active');
            } else {
                outputEl.classList.remove('active');
            }
        }, 500);
    });`;

const newDOMReady = `    document.addEventListener("DOMContentLoaded", function() {
        const outputEl = document.getElementById('output');
        setInterval(() => {
            if (outputEl.value && outputEl.value.trim() !== '') {
                outputEl.classList.add('active');
            } else {
                outputEl.classList.remove('active');
            }
        }, 500);

        // Show Arrow Mode button on touch-capable devices
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            const btn = document.getElementById('btnArrowMode');
            if (btn) btn.style.display = '';
        }

        // Arrow Mode toggle (mobile shift substitute)
        document.getElementById('btnArrowMode').addEventListener('click', function() {
            if (window._touchArrowMode) {
                window._touchArrowMode = false;
                window.shift = false;
                this.textContent = '🔗 Arrow Mode';
                this.style.background = '';
                this.style.color = '';
            } else {
                window._touchArrowMode = true;
                window.shift = true;
                this.textContent = '✅ Arrow Mode ON';
                this.style.background = '#6366f1';
                this.style.color = 'white';
            }
        });
    });`;

if (!html.includes(oldDOMReady)) {
  console.error('ERROR: Could not find DOMContentLoaded block in index.html');
  process.exit(1);
}
html = html.replace(oldDOMReady, newDOMReady);

fs.writeFileSync('index.html', html, 'utf8');
console.log('✓ index.html patched');
console.log('All done!');
