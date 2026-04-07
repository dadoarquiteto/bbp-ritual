// ==================================================
// CENA 2 - FASE DA IGNIÇÃO
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 2;
const SCENE_NAME = 'Fase da Ignição';
const SEEDS_REQUIRED = 4000;

let player = { x: 100, y: 100, moving: false, health: 100 };
let seedsCollected = 0;
let obstacles = [];
let fireParticles = [];
let animationId = null;
let walletAddress = null;
let currentTimelineIndex = 0;

let canvas, ctx, timelineEl, seedCountEl, statusEl, healthEl;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('🔥 Iniciando Cena 2:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    healthEl = document.getElementById('healthBar');
    
    canvas.width = 800;
    canvas.height = 500;
    
    await connectWalletIfNeeded();
    
    // REGISTRAR NA REDE BBP RITUAL
    if (typeof BBPRitual !== 'undefined') {
        BBPRitual.setCurrentScene(SCENE_ID);
        
        if (walletAddress) {
            await BBPRitual.registerSeed(walletAddress);
            await BBPRitual.distributeSceneNFT(SCENE_ID, walletAddress);
            await BBPRitual.distributeProtocolFractions(10, walletAddress);
            showLog('✅ Registrado na rede BBP', 'success');
        }
    } else {
        showLog('⚠️ BBPRitual não carregado', 'warning');
    }
    
    loadProgress();
    createObstacles();
    startTimeline();
    startGameLoop();
    setupControls();
    startFireEffect();
}

// ==========================================
// CONEXÃO COM CARTEIRA
// ==========================================

async function connectWalletIfNeeded() {
    const savedAddress = loadFromLocalStorage('wallet_address');
    
    if (savedAddress && savedAddress !== 'null') {
        walletAddress = savedAddress;
        updateStatus(`✅ Carteira: ${formatAddress(walletAddress)}`, 'success');
        showLog(`Carteira conectada: ${walletAddress}`, 'info');
        return true;
    }
    
    updateStatus('⚠️ Conecte sua carteira Bitcoin', 'warning');
    
    if (typeof connectWallet === 'function') {
        const wallet = await connectWallet();
        if (wallet && wallet.address) {
            walletAddress = wallet.address;
            updateStatus(`✅ Carteira: ${formatAddress(walletAddress)}`, 'success');
            return true;
        }
    }
    
    return false;
}

// ==========================================
= OBSTÁCULOS E FOGO
// ==========================================

function createObstacles() {
    obstacles = [
        { x: 200, y: 150, width: 40, height: 40, damage: 10 },
        { x: 500, y: 300, width: 40, height: 40, damage: 10 },
        { x: 350, y: 400, width: 40, height: 40, damage: 10 },
        { x: 600, y: 100, width: 40, height: 40, damage: 10 },
        { x: 100, y: 350, width: 40, height: 40, damage: 10 }
    ];
}

function startFireEffect() {
    setInterval(() => {
        if (player.moving && Math.random() < 0.3) {
            fireParticles.push({
                x: player.x + (Math.random() - 0.5) * 20,
                y: player.y + 20,
                life: 1,
                size: Math.random() * 5 + 2
            });
        }
        
        fireParticles = fireParticles.filter(p => {
            p.life -= 0.05;
            p.y -= 2;
            return p.life > 0;
        });
    }, 100);
}

// ==========================================
= PROGRESSO
// ==========================================

function loadProgress() {
    const sceneCompleted = loadFromLocalStorage(`scene_${SCENE_ID}_completed`);
    if (sceneCompleted) {
        seedsCollected = SEEDS_REQUIRED;
        updateSeedDisplay();
        showLog('Você já completou a Fase da Ignição', 'info');
    }
    
    const savedSeeds = loadFromLocalStorage(`scene_${SCENE_ID}_seeds`);
    if (savedSeeds && !sceneCompleted) {
        seedsCollected = Math.min(savedSeeds, SEEDS_REQUIRED);
        updateSeedDisplay();
    }
    
    const savedPosition = loadFromLocalStorage(`scene_${SCENE_ID}_position`);
    if (savedPosition) {
        player.x = savedPosition.x;
        player.y = savedPosition.y;
    }
    
    const savedHealth = loadFromLocalStorage(`scene_${SCENE_ID}_health`);
    if (savedHealth) {
        player.health = savedHealth;
        updateHealthDisplay();
    }
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    saveToLocalStorage(`scene_${SCENE_ID}_health`, player.health);
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
    }
}

// ==========================================
= COLETA E DANO
// ==========================================

function collectSeed() {
    if (seedsCollected >= SEEDS_REQUIRED) return;
    
    seedsCollected++;
    updateSeedDisplay();
    saveProgress();
    
    showLog(`🌱 Seed coletada! ${seedsCollected}/${SEEDS_REQUIRED}`, 'success');
    createSeedEffect();
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        completeScene();
    }
}

function takeDamage(amount) {
    player.health = Math.max(0, player.health - amount);
    updateHealthDisplay();
    saveProgress();
    
    showLog(`💔 Colidiu com obstáculo! Saúde: ${player.health}`, 'error');
    showTimelineMessage(`⚠️ O caos queima... Saúde: ${player.health}%`);
    
    if (player.health <= 0) {
        resetScene();
    }
}

function resetScene() {
    showTimelineMessage('💀 Você sucumbiu ao caos. Recomeçando...');
    player.health = 100;
    player.x = 100;
    player.y = 100;
    seedsCollected = Math.max(0, seedsCollected - 500);
    updateSeedDisplay();
    updateHealthDisplay();
    saveProgress();
}

function updateHealthDisplay() {
    if (healthEl) {
        const percent = (player.health / 100) * 100;
        healthEl.style.width = `${percent}%`;
        healthEl.style.backgroundColor = percent > 50 ? '#00ff00' : (percent > 25 ? '#ffaa00' : '#ff0000');
    }
}

function updateSeedDisplay() {
    if (seedCountEl) {
        seedCountEl.textContent = `${seedsCollected}/${SEEDS_REQUIRED}`;
    }
}

function createSeedEffect() {
    const effect = document.createElement('div');
    effect.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 30px;
        height: 30px;
        background: radial-gradient(circle, #ff8c00, #ff4400);
        border-radius: 50%;
        pointer-events: none;
        animation: explosion 0.5s ease-out forwards;
        z-index: 1000;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ==========================================
= CONCLUSÃO
// ==========================================

async function completeScene() {
    if (seedsCollected >= SEEDS_REQUIRED) {
        showLog(`✅ Cena ${SCENE_ID} completa!`, 'success');
        showTimelineMessage('🎉 A ignição ocorreu. O caos agora tem forma.');
        
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
        
        showNextSceneButton();
        return true;
    }
    return false;
}

function showNextSceneButton() {
    const button = document.createElement('button');
    button.textContent = '▶ PRÓXIMA CENA - FASE DA INSCRIÇÃO';
    button.className = 'next-scene-btn';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #ff8c00;
        color: #0d0d0d;
        border: none;
        padding: 12px 24px;
        font-family: monospace;
        font-weight: bold;
        cursor: pointer;
        z-index: 100;
        clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    `;
    button.onclick = () => {
        window.location.href = '../scene_3/';
    };
    document.body.appendChild(button);
}

// ==========================================
= TIMELINE
// ==========================================

const timelineMessages = [
    "O caos começa a se manifestar.",
    "Chamas dançam nas bordas do protocolo.",
    "Ele escorrega, tropeça, mas continua.",
    "Cada queda queima uma seed, mas também aquece a alma.",
    "A ignição transforma o silêncio em energia.",
    "O bonequinho agora carrega fogo dentro de si."
];

function startTimeline() {
    currentTimelineIndex = 0;
    showNextTimelineMessage();
}

function showNextTimelineMessage() {
    if (currentTimelineIndex < timelineMessages.length) {
        showTimelineMessage(timelineMessages[currentTimelineIndex]);
        currentTimelineIndex++;
        setTimeout(() => showNextTimelineMessage(), 5000);
    }
}

function showTimelineMessage(message) {
    if (timelineEl) {
        timelineEl.textContent = message;
        timelineEl.style.opacity = '1';
        setTimeout(() => {
            if (timelineEl.textContent === message) {
                timelineEl.style.opacity = '0.5';
            }
        }, 4000);
    }
}

// ==========================================
= LOOP DO JOGO
// ==========================================

function startGameLoop() {
    function gameLoop() {
        update();
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }
    gameLoop();
}

function update() {
    if (player.moving) {
        const newX = player.x + (player.vx || 0);
        const newY = player.y + (player.vy || 0);
        
        let collided = false;
        for (let obs of obstacles) {
            if (newX > obs.x && newX < obs.x + obs.width &&
                newY > obs.y && newY < obs.y + obs.height) {
                collided = true;
                break;
            }
        }
        
        if (!collided) {
            player.x = Math.max(20, Math.min(canvas.width - 20, newX));
            player.y = Math.max(20, Math.min(canvas.height - 20, newY));
        } else {
            takeDamage(10);
            player.x = Math.max(20, Math.min(canvas.width - 20, player.x - (player.vx || 0)));
            player.y = Math.max(20, Math.min(canvas.height - 20, player.y - (player.vy || 0)));
        }
        
        if (Math.random() < 0.02) {
            collectSeed();
        }
    }
}

function draw() {
    if (!ctx) return;
    
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    for (let obs of obstacles) {
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(obs.x + 5, obs.y + 5, obs.width - 10, obs.height - 10);
    }
    
    for (let p of fireParticles) {
        ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 100)}, 0, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.strokeStyle = '#ff8c00';
    ctx.lineWidth = 3;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4400';
    
    ctx.beginPath();
    ctx.arc(player.x, player.y - 15, 10, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 5);
    ctx.lineTo(player.x, player.y + 15);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x - 12, player.y + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + 12, player.y + 8);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 15);
    ctx.lineTo(player.x - 10, player.y + 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 15);
    ctx.lineTo(player.x + 10, player.y + 30);
    ctx.stroke();
    
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    for (let i = 0; i < Math.min(10, Math.floor(seedsCollected / 400)); i++) {
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.arc(50 + i * 30, 450, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==========================================
= CONTROLES
// ==========================================

function setupControls() {
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp': case 'w': player.moving = true; player.vy = -3; break;
            case 'ArrowDown': case 's': player.moving = true; player.vy = 3; break;
            case 'ArrowLeft': case 'a': player.moving = true; player.vx = -3; break;
            case 'ArrowRight': case 'd': player.moving = true; player.vx = 3; break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp': case 'ArrowDown': case 'w': case 's': player.vy = 0; break;
            case 'ArrowLeft': case 'ArrowRight': case 'a': case 'd': player.vx = 0; break;
        }
        if (!player.vx && !player.vy) player.moving = false;
    });
    
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            const dx = clickX - player.x;
            const dy = clickY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.min(30, Math.floor(distance / 10));
            
            if (steps > 0) {
                const stepX = dx / steps;
                const stepY = dy / steps;
                let step = 0;
                const interval = setInterval(() => {
                    if (step >= steps) {
                        clearInterval(interval);
                        player.moving = false;
                        return;
                    }
                    player.x += stepX;
                    player.y += stepY;
                    step++;
                    if (Math.random() < 0.05) collectSeed();
                }, 50);
            }
        });
    }
}

function updateStatus(message, type = 'info') {
    if (statusEl) {
        statusEl.innerHTML = message;
        statusEl.className = `status-${type}`;
    }
    if (typeof showLog === 'function') showLog(message, type);
}

function addAnimationStyles() {
    if (document.getElementById('bbp-scene-styles')) return;
    const style = document.createElement('style');
    style.id = 'bbp-scene-styles';
    style.textContent = `
        @keyframes explosion {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .status-success { color: #00ff00; }
        .status-warning { color: #ffaa00; }
        .status-error { color: #ff0000; }
        .next-scene-btn:hover { background: #ffb347; transform: translateY(-1px); }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    init();
});