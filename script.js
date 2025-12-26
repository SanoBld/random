const state = {
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    wheel: { angle: 0, isSpinning: false, currentCtx: null, currentCanvas: null }
};

window.addEventListener('load', () => {
    state.wheel.currentCanvas = document.getElementById('wheelCanvas');
    if(state.wheel.currentCanvas) {
        state.wheel.currentCtx = state.wheel.currentCanvas.getContext('2d');
    }
    loadState();
    setupConfetti();
});

function loadState() {
    const saved = JSON.parse(localStorage.getItem('randomizer_data') || '{}');
    if (saved.participants) document.getElementById('listInput').value = saved.participants;
    if (saved.history) { state.history = saved.history; renderHistory(); }
    if (saved.accent) updateAccent(saved.accent);
    if (saved.theme) setTheme(saved.theme);
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

// --- PARTICIPANTS & ROUE ---
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
    const cx = w/2, cy = h/2, radius = cx - 10;
    
    ctx.clearRect(0, 0, w, h);

    if (participants.length === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2);
        ctx.fillStyle = "rgba(127,127,127,0.1)"; ctx.fill();
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
        ctx.stroke(); // Bordure
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc/2);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif";
        ctx.fillText(name.substring(0,12), radius - 30, 8);
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
    const finalRot = startAngle + (10 + Math.random() * 10) * Math.PI * 2;
    const startTime = performance.now();

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        
        state.wheel.angle = startAngle + (finalRot - startAngle) * ease;
        drawWheel();

        if (progress < 1) requestAnimationFrame(animate);
        else {
            state.wheel.isSpinning = false;
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

// --- DÉS (Génération de points) ---
function rollDice() {
    const qty = Math.min(Math.max(document.getElementById('diceCount').value, 1), 10);
    let html = '';
    let total = 0;

    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        // Créer le nombre exact de points
        let dots = '';
        for(let d=0; d<val; d++) dots += '<div class="dot"></div>';
        html += `<div class="die" data-val="${val}">${dots}</div>`;
    }

    document.getElementById('diceDisplay').innerHTML = html;
    addToHistory(`Dés (${qty}) : Total ${total}`);
    if(qty>0) fireConfetti();
}

// --- ÉQUIPES ---
function generateTeams() {
    const participants = document.getElementById('listInput').value.split('\n').map(x=>x.trim()).filter(x=>x);
    const count = parseInt(document.getElementById('teamCount').value);
    if(participants.length < count) return alert("Pas assez de joueurs !");

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({length: count}, () => []);
    shuffled.forEach((p, i) => teams[i % count].push(p));

    const html = teams.map((t, i) => `
        <div style="background:rgba(127,127,127,0.1); padding:10px; border-radius:10px; margin-bottom:10px;">
            <strong>ÉQUIPE ${i+1}</strong>: ${t.join(', ')}
        </div>`).join('');
    
    document.getElementById('teamDisplay').innerHTML = html;
    addToHistory(`Génération de ${count} équipes`);
}

// --- PIÈCE ---
function flipCoin() {
    const coin = document.querySelector('.coin');
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? 'PILE' : 'FACE';
    
    // Reset animation
    coin.style.transition = 'none';
    coin.style.transform = 'rotateY(0deg)';
    
    setTimeout(() => {
        coin.style.transition = 'transform 2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        // On fait tourner la pièce (rotation multiple + face finale)
        const rotation = 1800 + (isHeads ? 0 : 180);
        coin.style.transform = `rotateY(${rotation}deg)`;
    }, 50);

    setTimeout(() => {
        // Mettre à jour le texte après l'animation (visuellement triché pour toujours afficher le bon résultat)
        const sides = document.querySelectorAll('.side');
        sides.forEach(s => s.innerText = result);
        addToHistory(`Pièce : ${result}`);
        fireConfetti();
    }, 2000);
}

// --- UTILS ---
function addToHistory(text) {
    state.history.unshift({ text, time: new Date().toLocaleTimeString() });
    if(state.history.length > 20) state.history.pop();
    renderHistory();
    saveState();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = state.history.map(h => 
        `<div class="history-item"><span>${h.text}</span> <small>${h.time}</small></div>`
    ).join('');
}

function clearHistory() { state.history = []; renderHistory(); saveState(); }

function openZoom(type) {
    document.getElementById('modalOverlay').style.display = 'flex';
    // Logique simplifiée pour l'exemple : on pourrait cloner les éléments dans le modal
    document.getElementById('modalTitle').innerText = type.toUpperCase();
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

function updateAccent(c) {
    document.documentElement.style.setProperty('--accent', c);
    document.documentElement.style.setProperty('--accent-fg', getContrastColor(c));
    state.accent = c;
    saveState();
    if(!state.wheel.isSpinning) drawWheel();
}

function getContrastColor(hex) {
    const r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
    return (r*299 + g*587 + b*114)/1000 >= 128 ? '#000000' : '#ffffff';
}

function setTheme(t) { document.body.className = t; state.theme = t; saveState(); }

function resetApp() { if(confirm('Réinitialiser ?')) { localStorage.clear(); location.reload(); } }

// Confetti simple
let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    c.width = window.innerWidth; c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
}
function fireConfetti() {
    // Implémentation simplifiée pour éviter le lag
    console.log("Confetti!"); 
}