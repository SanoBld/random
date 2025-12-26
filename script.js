// --- ÉTAT GLOBAL & CACHE ---
const state = {
    participants: [],
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    wheel: { angle: 0, isSpinning: false, currentCtx: null, currentCanvas: null }
};

// Initialisation
window.addEventListener('load', () => {
    loadState();
    setupConfetti();
    renderHistory();
});

function loadState() {
    const saved = JSON.parse(localStorage.getItem('randomizer_data') || '{}');
    if (saved.participants) document.getElementById('listInput').value = saved.participants;
    if (saved.history) state.history = saved.history;
    if (saved.theme) setTheme(saved.theme);
    if (saved.accent) updateAccent(saved.accent);
    
    // Initialiser la roue par défaut
    updateParticipants();
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    drawWheel();
}

function saveState() {
    state.participants = document.getElementById('listInput').value;
    localStorage.setItem('randomizer_data', JSON.stringify({
        participants: state.participants,
        history: state.history,
        theme: state.theme,
        accent: state.accent
    }));
}

// --- NOTIFICATION TOAST (NON INTRUSIF) ---
function showMessage(text) {
    const toast = document.getElementById('toastMessage');
    toast.innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- GESTION PARTICIPANTS ---
const listInput = document.getElementById('listInput');
listInput.addEventListener('input', () => {
    updateParticipants();
    saveState();
});

function updateParticipants() {
    const raw = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    document.getElementById('playerCount').innerText = `${raw.length} joueurs`;
    if (!state.wheel.isSpinning) drawWheel(); 
}

function clearParticipants() {
    if(confirm('Voulez-vous vraiment effacer la liste ?')) {
        listInput.value = "";
        updateParticipants();
        saveState();
    }
}

// --- MOTEUR DE LA ROULETTE ---
function drawWheel() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    const ctx = state.wheel.currentCtx;
    const canvas = state.wheel.currentCanvas;
    
    if (!ctx || !canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, cx - 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(127,127,127,0.1)"; ctx.fill();
        ctx.strokeStyle = "rgba(127,127,127,0.3)"; ctx.stroke();
        return;
    }

    const arc = (Math.PI * 2) / participants.length;
    
    participants.forEach((name, i) => {
        const angle = state.wheel.angle + (i * arc);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${(i * 360 / participants.length)}, 70%, 55%)`;
        ctx.moveTo(cx, cy); ctx.arc(cx, cy, cx - 10, angle, angle + arc);
        ctx.fill(); ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif";
        ctx.fillText(name.substring(0, 15), cx - 30, 6);
        ctx.restore();
    });
}

function spinWheel() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    if (participants.length < 2) {
        showMessage("Ajoutez au moins 2 participants !");
        return;
    }
    if (state.wheel.isSpinning) return;

    state.wheel.isSpinning = true;
    const spinDuration = 4000;
    const startObj = { val: state.wheel.angle };
    const randomRot = 10 + Math.random() * 10;
    const endVal = state.wheel.angle + (randomRot * Math.PI * 2);
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        state.wheel.angle = startObj.val + (endVal - startObj.val) * ease;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            state.wheel.isSpinning = false;
            const arc = (Math.PI * 2) / participants.length;
            const normalizedAngle = (1.5 * Math.PI - (state.wheel.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const index = Math.floor(normalizedAngle / arc);
            showWin(participants[index]);
        }
    }
    requestAnimationFrame(animate);
}

// --- ÉQUIPES ---
function generateTeams() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    const count = parseInt(document.getElementById('teamCount').value);
    
    if (participants.length < count) {
        showMessage("Pas assez de joueurs pour ce nombre d'équipes !");
        return;
    }

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({ length: count }, () => []);
    shuffled.forEach((p, i) => teams[i % count].push(p));

    const html = teams.map((t, i) => `
        <div class="team-item"><h4>ÉQUIPE ${i + 1}</h4><p>${t.join(', ')}</p></div>
    `).join('');

    document.getElementById('teamDisplay').innerHTML = html;
    const modalBody = document.getElementById('modalBody');
    if (document.getElementById('modalOverlay').style.display === 'flex' && modalBody.querySelector('.grid-content')) {
         modalBody.querySelector('.grid-content').innerHTML = html;
    }
}

// --- DÉS (1 à 25) ---
function rollDice() {
    const qty = Math.min(Math.max(parseInt(document.getElementById('diceCount').value), 1), 25);
    let total = 0;
    let html = '';

    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        html += `<div class="die" style="animation-delay: ${i * 0.05}s">${val}</div>`;
    }

    document.getElementById('diceDisplay').innerHTML = html;
    const modalDice = document.querySelector('#modalBody .dice-container');
    if (modalDice) modalDice.innerHTML = html;

    addToHistory(`Dés (${qty}) : Total ${total}`);
    if (qty > 0) fireConfetti();
}

// --- PIÈCE ---
function flipCoin() {
    const coins = document.querySelectorAll('.coin');
    const result = Math.random() < 0.5 ? 'PILE' : 'FACE';
    
    coins.forEach(c => {
        c.classList.remove('animate');
        void c.offsetWidth; // Reset anim
        c.classList.add('animate');
        setTimeout(() => {
            c.querySelector('.front').innerText = result;
            c.querySelector('.back').innerText = result;
        }, 500);
    });

    setTimeout(() => {
        addToHistory(`Pièce : ${result}`);
        fireConfetti();
        showMessage(`Résultat : ${result}`);
    }, 1000);
}

// --- ZOOM & MODAL SYSTEM ---
function openZoom(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    overlay.style.display = 'flex';
    body.innerHTML = ''; 

    if (type === 'wheel') {
        title.innerText = "ROULETTE (ZOOM)";
        body.innerHTML = `
            <div class="wheel-container" style="width: 350px; height: 350px;">
                <div class="indicator"></div>
                <canvas id="zoomCanvas" width="600" height="600"></canvas>
            </div>
            <button class="btn-main" onclick="spinWheel()" style="max-width:200px; margin-top:20px">LANCER</button>
        `;
        state.wheel.currentCanvas = document.getElementById('zoomCanvas');
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
        drawWheel();
    } 
    else if (type === 'teams') {
        title.innerText = "ÉQUIPES";
        const content = document.getElementById('teamDisplay').innerHTML;
        body.innerHTML = `
            <div class="controls-row" style="margin-bottom:20px; justify-content:center">
                <button class="btn-main small" onclick="generateTeams()">REGÉNÉRER</button>
            </div>
            <div class="grid-content" style="max-height:60vh">${content}</div>
        `;
    }
    else if (type === 'dice') {
        title.innerText = "DÉS";
        const content = document.getElementById('diceDisplay').innerHTML;
        body.innerHTML = `
            <button class="btn-main small" onclick="rollDice()" style="margin-bottom:20px">LANCER À NOUVEAU</button>
            <div class="dice-container" style="justify-content:center">${content}</div>
        `;
    }
    else if (type === 'coin') {
        title.innerText = "PILE OU FACE";
        body.innerHTML = `
            <div class="coin" id="zoomCoin"><div class="side front">?</div><div class="side back"></div></div>
            <button class="btn-main" onclick="flipCoin()" style="margin-top:50px">LANCER</button>
        `;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    drawWheel();
}

function showWin(winner) {
    fireConfetti();
    addToHistory(`Roue : ${winner}`);
    showMessage(`🏆 Vainqueur : ${winner} !`);
}

// --- HISTORIQUE & UTILS ---
function addToHistory(text) {
    const date = new Date().toLocaleTimeString();
    state.history.unshift({ text, date });
    if (state.history.length > 20) state.history.pop();
    saveState();
    renderHistory();
}

function renderHistory() {
    document.getElementById('historyList').innerHTML = state.history.map(h => `
        <div class="history-item"><span>${h.text}</span><span class="history-time">${h.date}</span></div>
    `).join('');
}

function clearHistory() {
    state.history = [];
    saveState();
    renderHistory();
}

function resetApp() {
    if(confirm('Réinitialiser toute l\'application ? Vos données seront perdues.')) {
        localStorage.removeItem('randomizer_data');
        location.reload();
    }
}

function setTheme(t) {
    document.body.className = t;
    state.theme = t;
    saveState();
}

function updateAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    const contrast = (parseInt(color.substr(1,2),16)*299 + parseInt(color.substr(3,2),16)*587 + parseInt(color.substr(5,2),16)*114)/1000 >= 128 ? '#000' : '#fff';
    document.documentElement.style.setProperty('--accent-fg', contrast);
    state.accent = color;
    saveState();
    if (state.wheel.currentCtx) drawWheel();
}

// CONFETTI
let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    c.width = window.innerWidth; c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
}
function fireConfetti() {
    const particles = Array.from({length: 100}, () => ({
        x: Math.random() * window.innerWidth, y: -10, r: Math.random() * 6 + 2, d: Math.random() * 5 + 2,
        color: `hsl(${Math.random()*360}, 100%, 50%)`, tilt: Math.random() * 10
    }));
    function draw() {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach((p, i) => {
            p.y += p.d; p.tilt += 0.1;
            confettiCtx.beginPath(); confettiCtx.lineWidth = p.r; confettiCtx.strokeStyle = p.color;
            confettiCtx.moveTo(p.x + Math.cos(p.tilt) * p.r, p.y); confettiCtx.lineTo(p.x, p.y + p.r);
            confettiCtx.stroke();
            if (p.y > window.innerHeight) particles.splice(i, 1);
        });
        if (particles.length > 0) requestAnimationFrame(draw);
    }
    draw();
}