// --- ÉTAT GLOBAL & CACHE ---
const state = {
    participants: [],
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    wheel: { 
        angle: 0, 
        isSpinning: false, 
        currentCtx: null, 
        currentCanvas: null 
    }
};

// --- INITIALISATION ---
window.addEventListener('load', () => {
    loadState();
    setupConfetti();
    renderHistory();
    
    // Initialisation des canvas
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    if (state.wheel.currentCanvas) {
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    }
    updateParticipants();
});

function loadState() {
    const saved = JSON.parse(localStorage.getItem('randomizer_data') || '{}');
    if (saved.participants) document.getElementById('listInput').value = saved.participants;
    if (saved.history) state.history = saved.history;
    if (saved.theme) setTheme(saved.theme);
    if (saved.accent) updateAccent(saved.accent);
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

// --- NOTIFICATIONS (TOAST) ---
function showMessage(text) {
    const toast = document.getElementById('toastMessage');
    toast.innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- GESTION DES PARTICIPANTS ---
const listInput = document.getElementById('listInput');
if (listInput) {
    listInput.addEventListener('input', () => {
        updateParticipants();
        saveState();
    });
}

function updateParticipants() {
    const raw = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    const countLabel = document.getElementById('playerCount');
    if (countLabel) countLabel.innerText = `${raw.length} joueurs`;
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
    const radius = cx - 10;
    
    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
        ctx.beginPath(); 
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(127,127,127,0.05)"; 
        ctx.fill();
        ctx.strokeStyle = "rgba(127,127,127,0.2)"; 
        ctx.stroke();
        return;
    }

    const arc = (Math.PI * 2) / participants.length;
    
    participants.forEach((name, i) => {
        const angle = state.wheel.angle + (i * arc);
        
        // Tranches
        ctx.beginPath();
        ctx.fillStyle = `hsl(${(i * 360 / participants.length)}, 65%, 60%)`;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc);
        ctx.fill();
        
        // Bordure blanche discrète entre les segments
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texte
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px -apple-system, sans-serif";
        ctx.fillText(name.substring(0, 15), radius - 20, 6);
        ctx.restore();
    });
}

function spinWheel() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    if (participants.length < 2) return showMessage("Ajoutez au moins 2 participants !");
    if (state.wheel.isSpinning) return;

    state.wheel.isSpinning = true;
    const spinDuration = 4000;
    const startAngle = state.wheel.angle;
    const randomRot = 8 + Math.random() * 8;
    const endAngle = startAngle + (randomRot * Math.PI * 2);
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const ease = 1 - Math.pow(1 - progress, 4); // OutQuart easing

        state.wheel.angle = startAngle + (endAngle - startAngle) * ease;
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
    
    if (participants.length < count) return showMessage("Pas assez de joueurs !");

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({ length: count }, () => []);
    shuffled.forEach((p, i) => teams[i % count].push(p));

    const html = teams.map((t, i) => `
        <div class="team-item"><h4>ÉQUIPE ${i + 1}</h4><p>${t.join(', ')}</p></div>
    `).join('');

    const display = document.getElementById('teamDisplay');
    if (display) display.innerHTML = html;
    
    const modalBody = document.getElementById('modalBody');
    const modalGrid = modalBody ? modalBody.querySelector('.grid-content') : null;
    if (modalGrid) modalGrid.innerHTML = html;
}

// --- DÉS (LOGIQUE DE POINTS / PIPS) ---
function rollDice() {
    const qty = Math.min(Math.max(parseInt(document.getElementById('diceCount').value), 1), 25);
    let total = 0;
    let html = '';

    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        
        let dots = '';
        for(let d=0; d<val; d++) dots += '<div class="dot"></div>';
        
        html += `<div class="die" data-val="${val}" style="animation-delay: ${i * 0.05}s">${dots}</div>`;
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
        void c.offsetWidth;
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

// --- SYSTÈME DE ZOOM (MODAL) ---
function openZoom(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    overlay.style.display = 'flex';
    body.innerHTML = ''; 

    if (type === 'wheel') {
        title.innerText = "ROULETTE";
        body.innerHTML = `
            <div class="wheel-container" style="width: 320px; height: 320px;">
                <div class="indicator"></div>
                <canvas id="zoomCanvas" width="600" height="600"></canvas>
            </div>
            <button class="btn-main" onclick="spinWheel()" style="margin-top:20px">LANCER</button>
        `;
        state.wheel.currentCanvas = document.getElementById('zoomCanvas');
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
        drawWheel();
    } 
    else if (type === 'teams') {
        title.innerText = "ÉQUIPES";
        const content = document.getElementById('teamDisplay').innerHTML;
        body.innerHTML = `
            <button class="btn-main" onclick="generateTeams()" style="margin-bottom:20px">REGÉNÉRER</button>
            <div class="grid-content" style="max-height:60vh; width:100%">${content}</div>
        `;
    }
    else if (type === 'dice') {
        title.innerText = "DÉS";
        const content = document.getElementById('diceDisplay').innerHTML;
        body.innerHTML = `
            <button class="btn-main" onclick="rollDice()" style="margin-bottom:20px">RELANCER</button>
            <div class="dice-container">${content}</div>
        `;
    }
    else if (type === 'coin') {
        title.innerText = "PILE OU FACE";
        body.innerHTML = `
            <div class="coin" id="zoomCoin"><div class="side front">?</div><div class="side back"></div></div>
            <button class="btn-main" onclick="flipCoin()" style="margin-top:40px">LANCER</button>
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
    showMessage(`🏆 Vainqueur : ${winner}`);
}

// --- HISTORIQUE & THEMES ---
function addToHistory(text) {
    const date = new Date().toLocaleTimeString([], {hour: '2h-min', minute:'2h-min'});
    state.history.unshift({ text, date });
    if (state.history.length > 20) state.history.pop();
    saveState();
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (list) {
        list.innerHTML = state.history.map(h => `
            <div class="history-item"><span>${h.text}</span><span class="history-time">${h.date}</span></div>
        `).join('');
    }
}

function clearHistory() {
    state.history = [];
    saveState();
    renderHistory();
}

function setTheme(t) {
    document.body.className = t;
    state.theme = t;
    saveState();
}

function updateAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    state.accent = color;
    saveState();
}

// --- CONFETTI (OPTIMISÉ) ---
let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    c.width = window.innerWidth; 
    c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
}

function fireConfetti() {
    const particles = Array.from({length: 80}, () => ({
        x: Math.random() * window.innerWidth, 
        y: -20, 
        r: Math.random() * 4 + 2, 
        d: Math.random() * 4 + 2,
        color: `hsl(${Math.random()*360}, 80%, 60%)`, 
        tilt: Math.random() * 10
    }));

    function draw() {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach((p, i) => {
            p.y += p.d; 
            p.tilt += 0.1;
            confettiCtx.beginPath(); 
            confettiCtx.lineWidth = p.r; 
            confettiCtx.strokeStyle = p.color;
            confettiCtx.moveTo(p.x + Math.cos(p.tilt) * p.r, p.y); 
            confettiCtx.lineTo(p.x, p.y + p.r);
            confettiCtx.stroke();
            if (p.y > window.innerHeight) particles.splice(i, 1);
        });
        if (particles.length > 0) requestAnimationFrame(draw);
    }
    draw();
}

function resetApp() {
    if(confirm('Tout réinitialiser ?')) {
        localStorage.clear();
        location.reload();
    }
}