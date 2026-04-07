// ==================================================
// CENA 1 - FASE DO SILÊNCIO
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 1;
const SCENE_NAME = 'Fase do Silêncio';
const SEEDS_REQUIRED = 2000;

let player = { x: 100, y: 100, moving: false };
let seedsCollected = 0;
let animationId = null;
let currentTimelineIndex = 0;
let walletAddress = null;

let canvas, ctx, timelineEl, seedCountEl, statusEl;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('🎮 Iniciando Cena 1:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    
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
    startTimeline();
    startGameLoop();
    setupControls();
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
// PROGRESSO
// ==========================================

function loadProgress() {
    const sceneCompleted = loadFromLocalStorage(`scene_${SCENE_ID}_completed`);
    if (sceneCompleted) {
        seedsCollected = SEEDS_REQUIRED;
        updateSeedDisplay();
        showLog('Você já completou esta cena anteriormente', 'info');
        showTimelineMessage('Você já despertou as seeds do silêncio. O protocolo te reconhece.');
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
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
    }
}

// ==========================================
// COLETA DE SEEDS
// ==========================================

function collectSeed() {
    if (seedsCollected >= SEEDS_REQUIRED) return;
    
    seedsCollected++;
    updateSeedDisplay();
    saveProgress();
    
    showLog(`🌱 Seed coletada! ${seedsCollected}/${SEEDS_REQUIRED}`, 'success');
    showTimelineMessage(`✨ Você coletou uma seed. ${seedsCollected}/${SEEDS_REQUIRED} seeds despertaram.`);
    
    createSeedEffect();
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        completeScene();
    }
}

function updateSeedDisplay() {
    if (seedCountEl) {
        seedCountEl.textContent = `${seedsCollected}/${SEEDS_REQUIRED}`;
    }
}

function createSeedEffect() {
    const effect = document.createElement('div');
    effect.className = 'seed-effect';
    effect.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        background: #ff8c00;
        border-radius: 50%;
        pointer-events: none;
        animation: seedPulse 0.5s ease-out forwards;
        z-index: 1000;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ==========================================
= CONCLUSÃO DA CENA
// ==========================================

async function completeScene() {
    if (seedsCollected >= SEEDS_REQUIRED) {
        showLog(`✅ Cena ${SCENE_ID} completa!`, 'success');
        showTimelineMessage('🎉 O silêncio foi quebrado. O protocolo reconhece sua intenção.');
        
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
        
        showNextSceneButton();
        return true;
    }
    return false;
}

function showNextSceneButton() {
    const button = document.createElement('button');
    button.textContent = '▶ PRÓXIMA CENA - FASE DA IGNIÇÃO';
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
        window.location.href = '../scene_2/';
    };
    document.body.appendChild(button);
}

// ==========================================
= TIMELINE NARRATIVA
// ==========================================

const timelineMessages = [
    "No silêncio, algo se move...",
    "As primeiras seeds despertam, ainda sem forma.",
    "O bonequinho dá os primeiros passos no vazio.",
    "Cada passo é uma intenção. Cada intenção, uma seed.",
    "O protocolo começa a ganhar forma.",
    "O silêncio é quebrado. O ritual começou."
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
        player.x += player.vx || 0;
        player.y += player.vy || 0;
        
        player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
        player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
        
        if (Math.random() < 0.01) {
            collectSeed();
        }
    }
}

function draw() {
    if (!ctx) return;
    
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#2a2a2a';
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
    
    for (let i = 0; i < 10; i++) {
        if (seedsCollected < SEEDS_REQUIRED) {
            ctx.fillStyle = '#ff8c00';
            ctx.beginPath();
            ctx.arc(100 + i * 60, 400, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px monospace';
            ctx.fillText(`${i + 1}`, 96 + i * 60, 404);
        }
    }
    
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 3;
    
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
    
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ==========================================
= CONTROLES
// ==========================================

function setupControls() {
    window.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                player.moving = true;
                player.vy = -3;
                break;
            case 'ArrowDown':
            case 's':
                player.moving = true;
                player.vy = 3;
                break;
            case 'ArrowLeft':
            case 'a':
                player.moving = true;
                player.vx = -3;
                break;
            case 'ArrowRight':
            case 'd':
                player.moving = true;
                player.vx = 3;
                break;
        }
    });
    
    window.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'w':
            case 's':
                player.vy = 0;
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'a':
            case 'd':
                player.vx = 0;
                break;
        }
        if (!player.vx && !player.vy) {
            player.moving = false;
        }
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
        @keyframes seedPulse {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .status-success { color: #00ff00; }
        .status-warning { color: #ffaa00; }
        .status-error { color: #ff0000; }
        .next-scene-btn:hover {
            background: #ffb347;
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    init();
});