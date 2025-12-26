// --- ÉTAT GLOBAL & CACHE ---
const state = {
    participants: [],
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    wheel: { angle: 0, isSpinning: false, currentCanvasId: 'wheelCanvas' }
};

// Initialisation
window.addEventListener('load', () => {
    loadState();
    setupConfetti();
    renderHistory();
    // Force un premier rendu propre
    setTimeout(() => updateParticipants(), 100);
});

// Gestion DPI pour Canvas (Anti-flou)
function resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

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

function showMessage(text) {
    const toast = document.getElementById('toastMessage');
    toast.innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- PARTICIPANTS ---
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
    if(confirm('Effacer la liste ?')) {
        listInput.value = "";
        updateParticipants();
        saveState();
    }
}

// --- ROULETTE ---
function getWheelContext() {
    const canvas = document.getElementById(state.wheel.currentCanvasId);
    if (!canvas) return null;
    // On redimensionne à chaque appel pour garantir la netteté
    const ctx = resizeCanvas(canvas);
    return { ctx, canvas };
}

function drawWheel() {
    const data = getWheelContext();
    if (!data) return;
    const { ctx, canvas } = data;
    
    // On utilise les dimensions CSS pour le calcul
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = (w / 2) - 10;
    
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    
    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(127,127,127,0.1)"; ctx.fill();
        ctx.strokeStyle = "rgba(127,127,127,0.2)"; ctx.lineWidth = 2; ctx.stroke();
        return;
    }

    const arc = (Math.PI * 2) / participants.length;
    
    participants.forEach((name, i) => {
        const angle = state.wheel.angle + (i * arc);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${(i * 360 / participants.length)}, 75%, 60%)`;
        ctx.moveTo(cx, cy); 
        ctx.arc(cx, cy, radius, angle, angle + arc);
        ctx.fill();
        
        // Bordure blanche entre les segments
        ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff"; 
        ctx.font = "bold 14px Inter, sans-serif";
        // Ombre portée pour lisibilité
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 4;
        ctx.fillText(name.substring(0, 15), radius - 15, 5);
        ctx.restore();
    });
}

function spinWheel() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    if (participants.length < 2) return showMessage("Il faut au moins 2 joueurs !");
    if (state.wheel.isSpinning) return;

    state.wheel.isSpinning = true;
    const spinDuration = 4000;
    const startAngle = state.wheel.angle;
    const randomRot = 10 + Math.random() * 10; // Rotation aléatoire
    const endAngle = startAngle + (randomRot * Math.PI * 2);
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const ease = 1 - Math.pow(1 - progress, 4); // Quartic ease-out

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
        <div class="team-item">
            <h4>ÉQUIPE ${i + 1}</h4>
            <p>${t.join(', ')}</p>
        </div>
    `).join('');

    // Mise à jour principale + modale si ouverte
    const displays = [document.getElementById('teamDisplay'), document.querySelector('#modalBody .grid-content')];
    displays.forEach(d => { if(d) d.innerHTML = html; });
}

// --- DÉS (Correction et Total) ---
function rollDice() {
    const qty = Math.min(Math.max(parseInt(document.getElementById('diceCount').value), 1), 25);
    let total = 0;
    let html = '';

    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        // Animation delay décalé pour effet cascade
        html += `<div class="die" style="animation-delay: ${i * 0.05}s">${val}</div>`;
    }

    // Affichage des dés
    const diceDisplays = [document.getElementById('diceDisplay'), document.querySelector('#modalBody .dice-container')];
    diceDisplays.forEach(d => { if(d) d.innerHTML = html; });

    // Affichage du résultat TOTAL
    const totalEl = document.getElementById('diceTotalValue');
    const resultContainer = document.getElementById('diceResult');
    if(totalEl && resultContainer) {
        totalEl.innerText = total;
        resultContainer.classList.remove('hidden');
    }
    
    // Mise à jour total dans la modale si elle existe
    const modalTotal = document.getElementById('modalDiceTotal');
    if(modalTotal) modalTotal.innerText = total;

    addToHistory(`Dés (${qty}) : Total ${total}`);
    if (qty > 0) fireConfetti();
}

// --- PIÈCE ---
function flipCoin() {
    // Sélectionne toutes les pièces (principale + modale)
    const coins = document.querySelectorAll('.coin');
    const result = Math.random() < 0.5 ? 'PILE' : 'FACE';
    
    coins.forEach(c => {
        c.classList.remove('animate');
        void c.offsetWidth; // Reflow hack pour restart animation
        c.classList.add('animate');
        
        // Change le texte à mi-course (quand la pièce est invisible)
        setTimeout(() => {
            c.querySelector('.front').innerText = result;
            c.querySelector('.back').innerText = result;
        }, 750); // Ajusté à la moitié de l'anim CSS (1.5s)
    });

    setTimeout(() => {
        addToHistory(`Pièce : ${result}`);
        fireConfetti();
        showMessage(`Résultat : ${result}`);
    }, 1500);
}

// --- ZOOM SYSTEM ---
function openZoom(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    overlay.style.display = 'flex';
    body.innerHTML = ''; 

    if (type === 'wheel') {
        title.innerText = "ROULETTE";
        body.innerHTML = `
            <div class="wheel-wrapper" style="width: 350px; height: 350px;">
                <div class="indicator"></div>
                <canvas id="zoomWheelCanvas"></canvas>
            </div>
            <button class="btn-main" onclick="spinWheel()" style="max-width:200px; margin-top:20px">LANCER</button>
        `;
        // Change l'ID cible pour la fonction de dessin
        state.wheel.currentCanvasId = 'zoomWheelCanvas';
        drawWheel();
    } 
    else if (type === 'teams') {
        title.innerText = "ÉQUIPES";
        const content = document.getElementById('teamDisplay').innerHTML;
        body.innerHTML = `
            <button class="btn-main small" onclick="generateTeams()" style="margin-bottom:20px">Générer à nouveau</button>
            <div class="grid-content" style="width:100%">${content}</div>
        `;
    }
    else if (type === 'dice') {
        title.innerText = "DÉS";
        const content = document.getElementById('diceDisplay').innerHTML;
        const total = document.getElementById('diceTotalValue').innerText;
        body.innerHTML = `
            <button class="btn-main small" onclick="rollDice()" style="margin-bottom:20px">Relancer</button>
            <div class="dice-container">${content}</div>
            <div class="dice-result">Total : <span id="modalDiceTotal">${total}</span></div>
        `;
    }
    else if (type === 'coin') {
        title.innerText = "PILE OU FACE";
        body.innerHTML = `
            <div class="coin-wrapper">
                <div class="coin" id="zoomCoin">
                    <div class="side front">?</div>
                    <div class="side back"></div>
                </div>
            </div>
            <button class="btn-main" onclick="flipCoin()" style="margin-top:20px">Lancer</button>
        `;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    // Remet la cible sur le canvas principal
    state.wheel.currentCanvasId = 'wheelCanvas';
    drawWheel();
}

function showWin(winner) {
    fireConfetti();
    addToHistory(`Roulette : ${winner}`);
    showMessage(`🏆 ${winner} !`);
}

// --- HISTORIQUE & UTILS ---
function addToHistory(text) {
    const date = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    state.history.unshift({ text, date });
    if (state.history.length > 20) state.history.pop();
    saveState();
    renderHistory();
}

function renderHistory() {
    document.getElementById('historyList').innerHTML = state.history.map(h => `
        <div class="history-item">
            <span>${h.text}</span>
            <span class="history-time">${h.date}</span>
        </div>
    `).join('');
}

function clearHistory() {
    state.history = [];
    saveState();
    renderHistory();
}

function resetApp() {
    if(confirm('Tout réinitialiser ?')) {
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
    // Calcul automatique de la couleur du texte sur l'accent (blanc ou noir)
    const r = parseInt(color.substr(1,2),16);
    const g = parseInt(color.substr(3,2),16);
    const b = parseInt(color.substr(5,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    const contrast = yiq >= 128 ? '#000000' : '#ffffff';
    
    document.documentElement.style.setProperty('--accent-fg', contrast);
    state.accent = color;
    saveState();
    drawWheel();
}

// CONFETTI
let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    c.width = window.innerWidth; c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
    
    window.addEventListener('resize', () => {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    });
}

function fireConfetti() {
    const particles = Array.from({length: 100}, () => ({
        x: Math.random() * window.innerWidth, y: -10, 
        r: Math.random() * 6 + 3, d: Math.random() * 5 + 2,
        color: `hsl(${Math.random()*360}, 80%, 60%)`, 
        tilt: Math.random() * 10
    }));
    
    function draw() {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        let active = false;
        particles.forEach((p) => {
            p.y += p.d; p.tilt += 0.1;
            if(p.y < window.innerHeight) {
                active = true;
                confettiCtx.beginPath(); 
                confettiCtx.lineWidth = p.r; 
                confettiCtx.strokeStyle = p.color;
                confettiCtx.moveTo(p.x + Math.cos(p.tilt) * p.r, p.y); 
                confettiCtx.lineTo(p.x, p.y + p.r);
                confettiCtx.stroke();
            }
        });
        if (active) requestAnimationFrame(draw);
    }
    draw();
}
