const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

// 1. Replace draw() and drawUsing()
code = code.replace(
`function draw() {
\tdrawUsing(canvas.getContext('2d'));
\tsaveBackup();
}`,
`var needsRedraw = true;
function draw() {
    needsRedraw = true;
}

function renderLoop() {
    if (needsRedraw) {
        drawUsing(canvas.getContext('2d'));
        saveBackup();
        needsRedraw = false;
    }
    requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);`);

// 2. Add Retina Scaling to window.onload
code = code.replace(
`window.onload = function() {
\tcanvas = document.getElementById('canvas');
\trestoreBackup();
\tdraw();`,
`window.onload = function() {
\tcanvas = document.getElementById('canvas');
\t
\t// Retina Display Scaling
\tvar dpr = window.devicePixelRatio || 1;
\tvar rect = canvas.getBoundingClientRect();
\tcanvas.width = rect.width * dpr;
\tcanvas.height = rect.height * dpr;
\tvar ctx = canvas.getContext('2d');
\tctx.scale(dpr, dpr);

\trestoreBackup();
\tpushHistory(); // Initial state
\tdraw();`);

// 3. Append features at the bottom
code += `

// ==========================================
// MODERN FEATURES & ENHANCEMENTS BY ANTIGRAVITY
// ==========================================

// --- Undo / Redo System ---
let historyStack = [];
let historyIndex = -1;
let isRestoringHistory = false;

function pushHistory() {
    if (isRestoringHistory) return;
    const stateStr = localStorage['fsm'];
    if (historyIndex >= 0 && historyStack[historyIndex] === stateStr) return;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(stateStr);
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        isRestoringHistory = true;
        localStorage['fsm'] = historyStack[historyIndex];
        restoreBackup();
        isRestoringHistory = false;
        draw();
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        isRestoringHistory = true;
        localStorage['fsm'] = historyStack[historyIndex];
        restoreBackup();
        isRestoringHistory = false;
        draw();
    }
}

// Intercept saveBackup to also push to history
const originalSaveBackup = saveBackup;
saveBackup = function() {
    originalSaveBackup();
    pushHistory();
};

// --- Save / Load JSON ---
function saveJSON() {
    originalSaveBackup();
    const data = localStorage['fsm'];
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fsm_project.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        localStorage['fsm'] = e.target.result;
        restoreBackup();
        pushHistory();
        draw();
    };
    reader.readAsText(file);
}

// --- Validation (DFA vs NFA) ---
function validateFSM() {
    const msgEl = document.getElementById('validation-msg');
    let isNFA = false;

    // Check for empty transitions and multiple same-char transitions
    for (let node of nodes) {
        let transitions = [];
        for (let link of links) {
            if (link.nodeA === node || (link.node && link.node === node)) {
                let chars = link.text.split(',').map(c => c.trim());
                for (let c of chars) {
                    if (c === '' || c.toLowerCase() === '\\\\epsilon' || c === 'ε') {
                        isNFA = true;
                    } else {
                        if (transitions.includes(c)) isNFA = true;
                        transitions.push(c);
                    }
                }
            }
        }
    }

    if (nodes.length === 0) {
        msgEl.innerText = "Add some states first!";
        msgEl.style.color = "gray";
        return;
    }

    if (isNFA) {
        msgEl.innerText = "Status: Nondeterministic Finite Automaton (NFA)";
        msgEl.style.color = "#f59e0b";
    } else {
        msgEl.innerText = "Status: Deterministic Finite Automaton (DFA)";
        msgEl.style.color = "#10b981";
    }
}

// --- Simulate ---
function simulateFSM() {
    const input = prompt("Enter a string to simulate:");
    if (input === null) return;
    
    // Simple basic visual simulation
    let startNode = nodes[0];
    for (let link of links) {
        if (link instanceof StartLink) {
            startNode = link.node;
            break;
        }
    }
    
    if (!startNode) {
        alert("Please add a start state indicator! (Shift-drag from empty space)");
        return;
    }
    
    let currentNode = startNode;
    let i = 0;
    
    function step() {
        selectedObject = currentNode;
        draw();
        
        if (i >= input.length) {
            setTimeout(() => {
                selectedObject = null;
                draw();
                if (currentNode.isAcceptState) {
                    alert("String ACCEPTED!");
                } else {
                    alert("String REJECTED!");
                }
            }, 500);
            return;
        }
        
        let char = input[i];
        let nextNode = null;
        let activeLink = null;
        
        for (let link of links) {
            if ((link.nodeA === currentNode || link.node === currentNode) && link.text.split(',').map(s=>s.trim()).includes(char)) {
                nextNode = link.nodeB || link.node;
                activeLink = link;
                break;
            }
        }
        
        if (!nextNode) {
            alert(\`Rejected: No transition for '\${char}' from state '\${currentNode.text}'\`);
            selectedObject = null;
            draw();
            return;
        }
        
        setTimeout(() => {
            selectedObject = activeLink;
            draw();
            setTimeout(() => {
                currentNode = nextNode;
                i++;
                step();
            }, 500);
        }, 500);
    }
    
    step();
}

// Bind to window for ES Module environment
window.saveAsPNG = saveAsPNG;
window.saveAsSVG = saveAsSVG;
window.saveAsLaTeX = saveAsLaTeX;
window.undo = undo;
window.redo = redo;
window.validateFSM = validateFSM;
window.simulateFSM = simulateFSM;
window.saveJSON = saveJSON;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('btnUndo').onclick = undo;
    document.getElementById('btnRedo').onclick = redo;
    document.getElementById('btnValidate').onclick = validateFSM;
    document.getElementById('btnSimulate').onclick = simulateFSM;
    document.getElementById('btnSaveJSON').onclick = saveJSON;
    document.getElementById('btnLoadJSON').onclick = () => document.getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = loadJSON;
});
`;

fs.writeFileSync('src/main.js', code);
console.log('patched');
