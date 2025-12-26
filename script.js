const state = {
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    wheel: { angle: 0, isSpinning: false, currentCtx: null, currentCanvas: null }
};

// Initialisation au chargement
window.addEventListener('load', () => {
    // Initialisation des canvas
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    if(state.wheel.currentCanvas) {
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    }
    
    setupConfetti();
    loadState();
});

function loadState() {
    const saved = JSON.parse(localStorage.getItem('randomizer_data') || '{}');
    if (saved.participants) document.getElementById('listInput').value = saved.participants;
    if (saved.history) { state.history = saved.history; renderHistory(); }
    if (saved.accent) updateAccent(saved.accent);
    if (saved.theme) setTheme(saved.theme);
    
    // Mise à jour initiale de la roue
    updateParticipants();
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

// --- GESTION PARTICIPANTS & ROULETTE ---
document.getElementById('listInput').addEventListener('input', () => {
    updateParticipants();
    saveState();
});

function updateParticipants() {
    const raw = document.getElementById('listInput').value.split('\n').map(x=>x.trim()).filter(x=>x);
    document.getElementById('playerCount').innerText = `${raw.length} joueurs`;
    if(!state.wheel.isSpinning) drawWheel();
}

function clearParticipants() {
    if(confirm('Tout effacer ?')) {
        document.getElementById('listInput').value = "";
        updateParticipants();
        saveState();
    }
}

function drawWheel() {
    const participants = document.getElementById('listInput').value.split('\n').map(x=>x.trim()).filter(x=>x);
    const ctx = state.wheel.currentCtx;
    const canvas = state.wheel.currentCanvas;
    
    if (!ctx || !canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    const cx = w/2, cy = h/2, radius = cx - 15;
    
    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
        // Roue vide (grise)
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fillStyle = "rgba(127,127,127,0.1)"; ctx.fill();
        ctx.strokeStyle = "rgba(127,127,127,0.2)"; ctx.lineWidth=2; ctx.stroke();
        return;
    }

    const arc = (Math.PI * 2) / participants.length;
    participants.forEach((name, i) => {
        const angle = state.wheel.angle + (i * arc);
        
        ctx.beginPath();
        // Couleurs harmonieuses
        ctx.fillStyle = `hsl(${(i * 360 / participants.length)}, 70%, 60%)`;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc);
        ctx.fill();
        
        // Séparateur blanc
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2; ctx.stroke();
        
        // Texte
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc/2);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff"; 
        ctx.font = "bold 24px -apple-system, sans-serif";
        ctx.shadowColor="rgba(0,0,0,0.3)"; ctx.shadowBlur=4;
        ctx.fillText(name.substring(0,14), radius - 30, 8);
        ctx.restore();
    });
}

function spinWheel() {
    const participants = document.getElementById('listInput').value.split('\n').map(x=>x.trim()).filter(x=>x);
    if (participants.length < 2) return alert("Ajoutez au moins 2 participants !");
    if (state.wheel.isSpinning) return;

    state.wheel.isSpinning = true;
    const spinDuration = 4000;
    const startAngle = state.wheel.angle;
    // Rotation aléatoire (min 5 tours)
    const finalRot = startAngle + (5 + Math.random() * 5) * Math.PI * 2; 
    const startTime = performance.now();

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        // Easing : OutQuart (démarrage rapide, fin très lente)
        const ease = 1 - Math.pow(1 - progress, 4);
        
        state.wheel.angle = startAngle + (finalRot - startAngle) * ease;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            state.wheel.isSpinning = false;
            // Calcul du gagnant
            const arc = (Math.PI * 2) / participants.length;
            const normAngle = (1.5 * Math.PI - (state.wheel.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const winner = participants[Math.floor(normAngle / arc)];
            
            addToHistory(`Roulette : ${winner}`);
            fireConfetti();
            alert(`🏆 Vainqueur : ${winner}`);
        }
    }
    requestAnimationFrame(animate);
}

// --- DÉS (VISUEL POINTS / PIPS) ---
function rollDice() {
    // Limite entre 1 et 12 dés pour l'affichage
    const qty = Math.min(Math.max(document.getElementById('diceCount').value, 1), 12);
    let html = '';
    let total = 0;

    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        
        // Génération des points (divs vides)
        let dots = '';
        for(let d=0; d<val; d++) {
            dots += '<div class="dot"></div>';
        }
        
        // L'attribut data-val permet au CSS de savoir où placer les points
        html += `<div class="die" data-val="${val}">${dots}</div>`;
    }

    // Affichage principal
    document.getElementById('diceDisplay').innerHTML = html;
    
    // Si modal ouvert, mise à jour aussi
    const modalDice = document.querySelector('#modalBody .dice-container');
    if (modalDice) modalDice.innerHTML = html;

    addToHistory(`Dés (${qty}) : Total ${total}`);
    if(qty > 0) fireConfetti();
}

// --- ÉQUIPES ---
function generateTeams() {
    const participants = document.getElementById('listInput').value.split('\n').map(x=>x.trim()).filter(x=>x);
    const count = parseInt(document.getElementById('teamCount').value);
    
    if(participants.length < count) return alert("Pas assez de joueurs pour faire ces équipes !");

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({length: count}, () => []);
    shuffled.forEach((p, i) => teams[i % count].push(p));

    const html = teams.map((t, i) => `
        <div style="background:rgba(127,127,127,0.06); padding:12px; border-radius:12px; margin-bottom:10px;">
            <strong style="color:var(--accent)">ÉQUIPE ${i+1}</strong><br> ${t.join(', ')}
        </div>`).join('');
    
    document.getElementById('teamDisplay').innerHTML = html;
    
    // Update modal si ouvert
    const modalTeam = document.querySelector('#modalBody .scrollable-content');
    if (modalTeam) modalTeam.innerHTML = html;
    
    addToHistory(`Génération de ${count} équipes`);
}

// --- PIÈCE ---
function flipCoin() {
    const coin = document.querySelector('.coin');
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? 'PILE' : 'FACE';
    
    // Reset pour permettre de relancer l'animation
    coin.style.transition = 'none';
    coin.style.transform = 'rotateY(0deg)';
    
    // Force reflow
    void coin.offsetWidth;
    
    setTimeout(() => {
        coin.style.transition = 'transform 2.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        // Rotation : 5 tours complets (1800deg) + résultat
        const rotation = 1800 + (isHeads ? 0 : 180);
        coin.style.transform = `rotateY(${rotation}deg)`;
    }, 10);

    setTimeout(() => {
        // Mise à jour visuelle du texte
        const sides = document.querySelectorAll('.side');
        sides.forEach(s => s.innerText = result);
        addToHistory(`Pièce : ${result}`);
        fireConfetti();
    }, 2500);
}

// --- HISTORIQUE & OUTILS ---
function addToHistory(text) {
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    state.history.unshift({ text, time });
    if(state.history.length > 20) state.history.pop(); // Garde les 20 derniers
    renderHistory();
    saveState();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = state.history.map(h => 
        `<div class="history-item">
            <span>${h.text}</span> 
            <small style="opacity:0.5">${h.time}</small>
        </div>`
    ).join('');
}

function clearHistory() { 
    state.history = []; 
    renderHistory(); 
    saveState(); 
}

// --- MODAL ZOOM ---
function openZoom(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    overlay.style.display = 'flex';
    body.innerHTML = ''; // Reset content

    if (type === 'wheel') {
        title.innerText = "ROULETTE";
        // Clone le canvas pour le zoom
        const wrapper = document.createElement('div');
        wrapper.className = 'wheel-wrapper';
        wrapper.style.maxWidth = '400px';
        wrapper.innerHTML = `<div class="indicator"></div><canvas id="zoomWheelCanvas" width="500" height="500"></canvas>`;
        body.appendChild(wrapper);
        
        // Setup nouveau contexte
        state.wheel.currentCanvas = document.getElementById('zoomWheelCanvas');
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
        drawWheel();
        
        const btn = document.createElement('button');
        btn.className = 'btn-main';
        btn.innerText = 'LANCER';
        btn.onclick = spinWheel;
        body.appendChild(btn);
    }
    else if (type === 'dice') {
        title.innerText = "DÉS";
        const content = document.getElementById('diceDisplay').innerHTML;
        body.innerHTML = `<div class="dice-container">${content}</div>`;
        const btn = document.createElement('button');
        btn.className = 'btn-main';
        btn.innerText = 'RELANCER';
        btn.onclick = rollDice;
        body.appendChild(btn);
    }
    else if (type === 'teams') {
        title.innerText = "ÉQUIPES";
        const content = document.getElementById('teamDisplay').innerHTML;
        body.innerHTML = `<div class="scrollable-content" style="width:100%">${content}</div>`;
    }
    else if (type === 'coin') {
        title.innerText = "PILE / FACE";
        // Simple message car l'anim pièce est complexe à cloner parfaitement sans bug
        body.innerHTML = "<p style='text-align:center'>Utilisez l'écran principal pour lancer la pièce.</p>";
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    // Remet le contexte sur le canvas principal
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    drawWheel();
}

// --- THEMES & ACCENT ---
function updateAccent(c) {
    document.documentElement.style.setProperty('--accent', c);
    // Calcul contraste auto (blanc ou noir selon la luminosité)
    const r = parseInt(c.substr(1,2),16), g = parseInt(c.substr(3,2),16), b = parseInt(c.substr(5,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    const fg = yiq >= 128 ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--accent-fg', fg);
    
    state.accent = c;
    saveState();
    if(!state.wheel.isSpinning) drawWheel();
}

function setTheme(t) { 
    document.body.className = t; 
    state.theme = t; 
    saveState(); 
}

function resetApp() { 
    if(confirm('Voulez-vous vraiment tout réinitialiser ?')) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

// --- CONFETTIS OPTIMISÉS ---
let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    if(!c) return;
    c.width = window.innerWidth; 
    c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
    
    window.addEventListener('resize', () => {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    });
}

function fireConfetti() {
    if(!confettiCtx) return;
    const particles = Array.from({length: 80}, () => ({
        x: Math.random() * window.innerWidth,
        y: -20,
        r: Math.random() * 5 + 2,
        d: Math.random() * 5 + 2,
        color: `hsl(${Math.random()*360}, 80%, 60%)`,
        tilt: Math.random() * 10
    }));

    function draw() {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        let active = false;
        particles.forEach((p) => {
            p.y += p.d;
            p.tilt += 0.1;
            if(p.y < window.innerHeight) {
                active = true;
                confettiCtx.beginPath();
                confettiCtx.lineWidth = p.r;
                confettiCtx.strokeStyle = p.color;
                confettiCtx.moveTo(p.x + Math.cos(p.tilt)*5, p.y);
                confettiCtx.lineTo(p.x, p.y + p.r * 2);
                confettiCtx.stroke();
            }
        });
        if(active) requestAnimationFrame(draw);
    }
    draw();
}