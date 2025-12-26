const state = {
    perfMode: false,
    history: [],
    wheelAngle: 0
};

// --- MODE PERFORMANCE ---
function togglePerformance() {
    state.perfMode = !state.perfMode;
    document.body.classList.toggle('perf-mode', state.perfMode);
    document.getElementById('perfBtn').innerText = state.perfMode ? "🚀 MODE ÉCO : ON" : "🚀 MODE ÉCO : OFF";
}

// --- DÉS AVEC POINTS ---
function rollDice() {
    const qty = Math.min(document.getElementById('diceCount').value, 12);
    const container = document.getElementById('diceDisplay');
    container.innerHTML = '';
    let total = 0;

    for(let i=0; i < qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        
        const die = document.createElement('div');
        die.className = 'die';
        die.dataset.val = val;
        
        // Ajouter le nombre de points nécessaire
        for(let d=0; d < val; d++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            die.appendChild(dot);
        }
        container.appendChild(die);
    }

    document.getElementById('diceTotalValue').innerText = total;
    document.getElementById('diceResult').classList.remove('hidden');
    if(!state.perfMode) fireConfetti();
}

// --- ROULETTE OPTIMISÉE ---
function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const names = document.getElementById('listInput').value.split('\n').filter(t => t.trim() !== "");
    
    // Ajuster résolution selon perfMode
    const size = state.perfMode ? 200 : 400;
    canvas.width = size; canvas.height = size;
    const cx = size/2, cy = size/2, r = size/2 - 10;

    if(names.length === 0) return;

    const slice = (Math.PI * 2) / names.length;
    names.forEach((name, i) => {
        const angle = state.wheelAngle + (i * slice);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${(i * 360 / names.length)}, 70%, 60%)`;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + slice);
        ctx.fill();
        ctx.stroke();
    });
}

function spinWheel() {
    const names = document.getElementById('listInput').value.split('\n').filter(t => t.trim() !== "");
    if(names.length < 2) return;

    let speed = 0.2 + Math.random() * 0.2;
    const friction = state.perfMode ? 0.98 : 0.992; // S'arrête plus vite en mode éco

    function animate() {
        state.wheelAngle += speed;
        speed *= friction;
        drawWheel();

        if(speed > 0.001) {
            requestAnimationFrame(animate);
        } else {
            if(!state.perfMode) fireConfetti();
        }
    }
    animate();
}

// --- PIÈCE ---
function flipCoin() {
    const coin = document.getElementById('coin');
    const result = Math.random() < 0.5 ? 'PILE' : 'FACE';
    
    coin.style.transform = `rotateY(${Math.random() > 0.5 ? 1800 : 1980}deg)`;
    
    setTimeout(() => {
        document.querySelectorAll('.side').forEach(s => s.innerText = result);
        if(!state.perfMode) fireConfetti();
    }, 1000);
}

// --- INITIALISATION & THEME ---
function updateParticipants() { drawWheel(); }
document.getElementById('listInput').oninput = updateParticipants;

function setTheme(t) { document.body.className = t; }
function updateAccent(c) { document.documentElement.style.setProperty('--accent', c); drawWheel(); }

// Confettis (Désactivés si perfMode est ON)
function fireConfetti() {
    if(state.perfMode) return;
    // ... (Logique confetti ici)
}

window.onload = () => { drawWheel(); };