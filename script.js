const state = {
    participants: [],
    history: [],
    theme: 'theme-auto',
    accent: '#007aff',
    perfMode: false,
    wheel: { angle: 0, isSpinning: false, currentCanvasId: 'wheelCanvas' }
};

window.addEventListener('load', () => {
    loadState();
    setupConfetti();
    renderHistory();
    setTimeout(() => updateParticipants(), 100);
});

function togglePerformance() {
    state.perfMode = !state.perfMode;
    document.body.classList.toggle('perf-mode', state.perfMode);
    document.getElementById('perfBtn').innerText = state.perfMode ? "🚀 MODE ÉCO : ON" : "🚀 MODE ÉCO : OFF";
}

function resizeCanvas(canvas) {
    const dpr = state.perfMode ? 1 : (window.devicePixelRatio || 1);
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

function drawWheel() {
    const canvas = document.getElementById(state.wheel.currentCanvasId);
    if (!canvas) return;
    const ctx = resizeCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height, cx = w / 2, cy = h / 2, radius = (w / 2) - 10;
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    
    ctx.clearRect(0, 0, w, h);
    if (participants.length === 0) {
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(127,127,127,0.1)"; ctx.fill();
        return;
    }

    const arc = (Math.PI * 2) / participants.length;
    participants.forEach((name, i) => {
        const angle = state.wheel.angle + (i * arc);
        ctx.beginPath();
        ctx.fillStyle = `hsl(${(i * 360 / participants.length)}, 75%, 60%)`;
        ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, angle, angle + arc);
        ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right"; ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillText(name.substring(0, 12), radius - 15, 5);
        ctx.restore();
    });
}

function spinWheel() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    if (participants.length < 2) return showMessage("Il faut au moins 2 joueurs !");
    if (state.wheel.isSpinning) return;
    state.wheel.isSpinning = true;
    const duration = state.perfMode ? 2000 : 4000;
    const startAngle = state.wheel.angle;
    const endAngle = startAngle + (10 + Math.random() * 10) * Math.PI * 2;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        state.wheel.angle = startAngle + (endAngle - startAngle) * ease;
        drawWheel();
        if (progress < 1) requestAnimationFrame(animate);
        else {
            state.wheel.isSpinning = false;
            const arc = (Math.PI * 2) / participants.length;
            const normalized = (1.5 * Math.PI - (state.wheel.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            showWin(participants[Math.floor(normalized / arc)]);
        }
    }
    requestAnimationFrame(animate);
}

function generateTeams() {
    const participants = listInput.value.split('\n').map(x => x.trim()).filter(x => x !== "");
    const count = parseInt(document.getElementById('teamCount').value);
    if (participants.length < count) return showMessage("Pas assez de joueurs !");
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const teams = Array.from({ length: count }, () => []);
    shuffled.forEach((p, i) => teams[i % count].push(p));
    const html = teams.map((t, i) => `<div class="team-item"><h4>ÉQUIPE ${i + 1}</h4><p>${t.join(', ')}</p></div>`).join('');
    const displays = [document.getElementById('teamDisplay'), document.querySelector('#modalBody .grid-content')];
    displays.forEach(d => { if(d) d.innerHTML = html; });
}

function rollDice() {
    const qty = Math.min(Math.max(parseInt(document.getElementById('diceCount').value), 1), 12);
    let total = 0, html = '';
    for(let i=0; i<qty; i++) {
        const val = Math.floor(Math.random() * 6) + 1;
        total += val;
        html += `<div class="die" data-val="${val}">${Array(val).fill('<div class="dot"></div>').join('')}</div>`;
    }
    const displays = [document.getElementById('diceDisplay'), document.querySelector('#modalBody .dice-container')];
    displays.forEach(d => { if(d) d.innerHTML = html; });
    document.getElementById('diceTotalValue').innerText = total;
    document.getElementById('diceResult').classList.remove('hidden');
    addToHistory(`Dés (${qty}) : Total ${total}`);
    if (!state.perfMode) fireConfetti();
}

function flipCoin() {
    const coins = document.querySelectorAll('.coin');
    const result = Math.random() < 0.5 ? 'PILE' : 'FACE';
    coins.forEach(c => {
        c.classList.remove('animate'); void c.offsetWidth;
        c.classList.add('animate');
        setTimeout(() => {
            c.querySelector('.front').innerText = result;
            c.querySelector('.back').innerText = result;
        }, 750);
    });
    setTimeout(() => {
        addToHistory(`Pièce : ${result}`);
        if (!state.perfMode) fireConfetti();
        showMessage(`Résultat : ${result}`);
    }, 1500);
}

function openZoom(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    overlay.style.display = 'flex';
    if (type === 'wheel') {
        title.innerText = "ROULETTE";
        body.innerHTML = `<div class="wheel-wrapper" style="width:300px;height:300px"><div class="indicator"></div><canvas id="zoomCanvas"></canvas></div><button class="btn-main" onclick="spinWheel()" style="margin-top:20px">LANCER</button>`;
        state.wheel.currentCanvasId = 'zoomCanvas';
        drawWheel();
    } else if (type === 'teams') {
        title.innerText = "ÉQUIPES";
        body.innerHTML = `<button class="btn-main small" onclick="generateTeams()" style="margin-bottom:20px">Générer</button><div class="grid-content" style="width:100%">${document.getElementById('teamDisplay').innerHTML}</div>`;
    } else if (type === 'dice') {
        title.innerText = "DÉS";
        body.innerHTML = `<button class="btn-main small" onclick="rollDice()" style="margin-bottom:20px">Relancer</button><div class="dice-container">${document.getElementById('diceDisplay').innerHTML}</div>`;
    } else if (type === 'coin') {
        title.innerText = "PILE OU FACE";
        body.innerHTML = `<div class="coin-wrapper"><div class="coin animate"><div class="side front">?</div><div class="side back"></div></div></div><button class="btn-main" onclick="flipCoin()" style="margin-top:20px">Lancer</button>`;
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    state.wheel.currentCanvasId = 'wheelCanvas';
    drawWheel();
}

function showWin(winner) {
    if(!state.perfMode) fireConfetti();
    addToHistory(`Roulette : ${winner}`);
    showMessage(`🏆 ${winner} !`);
}

function addToHistory(text) {
    const date = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    state.history.unshift({ text, date });
    if (state.history.length > 20) state.history.pop();
    saveState(); renderHistory();
}

function renderHistory() {
    document.getElementById('historyList').innerHTML = state.history.map(h => `<div class="history-item"><span>${h.text}</span><span class="history-time">${h.date}</span></div>`).join('');
}

function clearHistory() { state.history = []; saveState(); renderHistory(); }
function resetApp() { if(confirm('Tout réinitialiser ?')) { localStorage.removeItem('randomizer_data'); location.reload(); } }
function setTheme(t) { document.body.className = t; state.theme = t; saveState(); }

function updateAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    const r = parseInt(color.substr(1,2),16), g = parseInt(color.substr(3,2),16), b = parseInt(color.substr(5,2),16);
    const contrast = ((r*299)+(g*587)+(b*114))/1000 >= 128 ? '#000' : '#fff';
    document.documentElement.style.setProperty('--accent-fg', contrast);
    state.accent = color; saveState(); drawWheel();
}

let confettiCtx;
function setupConfetti() {
    const c = document.getElementById('confettiCanvas');
    c.width = window.innerWidth; c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
}

function fireConfetti() {
    if(state.perfMode) return;
    const particles = Array.from({length: 60}, () => ({
        x: Math.random() * window.innerWidth, y: -10, r: Math.random() * 5 + 2, d: Math.random() * 4 + 2,
        color: `hsl(${Math.random()*360}, 70%, 50%)`, tilt: Math.random() * 10
    }));
    function draw() {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        let active = false;
        particles.forEach(p => {
            p.y += p.d; if(p.y < window.innerHeight) {
                active = true; confettiCtx.fillStyle = p.color;
                confettiCtx.fillRect(p.x, p.y, p.r, p.r);
            }
        });
        if(active) requestAnimationFrame(draw);
    }
    draw();
}