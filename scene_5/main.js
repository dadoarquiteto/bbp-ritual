// ==================================================
// CENA 5 - FASE DA CONVERGÊNCIA
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 5;
const SCENE_NAME = 'Fase da Convergência';
const SEEDS_REQUIRED = 10000;

let player = { x: 100, y: 100, moving: false };
let seedsCollected = 0;
let convergencePoints = [];
let vehicles = [];
let followers = [];
let animationId = null;
let walletAddress = null;
let currentTimelineIndex = 0;
let convergenceLevel = 0;
let dogPosition = { x: 200, y: 300, following: false };
let carPosition = { x: 600, y: 400, moving: false };

let canvas, ctx, timelineEl, seedCountEl, statusEl, convergenceEl, convergenceBar;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('🚗 Iniciando Cena 5:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    convergenceEl = document.getElementById('convergenceText');
    convergenceBar = document.getElementById('convergenceBar');
    
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
    generateConvergencePoints();
    startTimeline();
    startGameLoop();
    setupControls();
    startConvergenceEffect();
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
= CONVERGÊNCIA
// ==========================================

function generateConvergencePoints() {
    const pointPositions = [
        { x: 150, y: 120, name: 'PONTO DE ENCONTRO', radius: 25, activated: false },
        { x: 400, y: 80, name: 'CRUZAMENTO', radius: 25, activated: false },
        { x: 650, y: 150, name: 'ROTATÓRIA', radius: 25, activated: false },
        { x: 100, y: 380, name: 'ESTAÇÃO CENTRAL', radius: 25, activated: false },
        { x: 350, y: 440, name: 'TERMINAL NORTE', radius: 25, activated: false },
        { x: 600, y: 420, name: 'TERMINAL SUL', radius: 25, activated: false }
    ];
    
    convergencePoints = pointPositions.map((point, index) => ({
        ...point,
        id: index,
        activated: false,
        activationProgress: 0
    }));
}

function startConvergenceEffect() {
    setInterval(() => {
        if (carPosition.moving) {
            carPosition.x += carPosition.vx || 0;
            carPosition.y += carPosition.vy || 0;
            
            carPosition.x = Math.max(50, Math.min(canvas.width - 50, carPosition.x));
            carPosition.y = Math.max(50, Math.min(canvas.height - 50, carPosition.y));
        }
    }, 50);
    
    setInterval(() => {
        if (dogPosition.following) {
            const dx = player.x - dogPosition.x;
            const dy = player.y - dogPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 30) {
                dogPosition.x += dx * 0.05;
                dogPosition.y += dy * 0.05;
            }
        }
    }, 100);
}

function increaseConvergence(amount) {
    convergenceLevel = Math.min(100, convergenceLevel + amount);
    updateConvergenceDisplay();
    
    if (convergenceBar) {
        convergenceBar.style.width = `${convergenceLevel}%`;
        convergenceBar.style.backgroundColor = `rgb(${Math.floor(255 * convergenceLevel / 100)}, ${Math.floor(100 * (1 - convergenceLevel / 100))}, 0)`;
    }
    
    if (convergenceLevel >= 20 && convergencePoints[0] && !convergencePoints[0].activated) {
        activateConvergencePoint(0);
    }
    if (convergenceLevel >= 40 && convergencePoints[1] && !convergencePoints[1].activated) {
        activateConvergencePoint(1);
    }
    if (convergenceLevel >= 60 && convergencePoints[2] && !convergencePoints[2].activated) {
        activateConvergencePoint(2);
        startCar();
    }
    if (convergenceLevel >= 80 && convergencePoints[3] && !convergencePoints[3].activated) {
        activateConvergencePoint(3);
        startDogFollowing();
    }
    if (convergenceLevel >= 100 && convergencePoints[4] && !convergencePoints[4].activated) {
        activateConvergencePoint(4);
        completeScene();
    }
}

function activateConvergencePoint(pointId) {
    if (convergencePoints[pointId] && !convergencePoints[pointId].activated) {
        convergencePoints[pointId].activated = true;
        
        showLog(`📍 Ponto de convergência ${pointId + 1} ativado: ${convergencePoints[pointId].name}`, 'success');
        showTimelineMessage(`🚦 ${convergencePoints[pointId].name} - todos convergem para o mesmo destino`);
        
        for (let i = 0; i < 30; i++) {
            collectSeed();
        }
    }
}

function startCar() {
    carPosition.moving = true;
    carPosition.vx = 2;
    carPosition.vy = 1;
    showLog('🚗 O carro começa a se mover na estrada da convergência', 'success');
}

function startDogFollowing() {
    dogPosition.following = true;
    showLog('🐕 O cão agora segue seus passos', 'success');
}

function updateConvergenceDisplay() {
    if (convergenceEl) {
        convergenceEl.textContent = `Convergência: ${Math.floor(convergenceLevel)}%`;
    }
    
    const activeCount = convergencePoints.filter(p => p.activated).length;
    if (document.getElementById('activePoints')) {
        document.getElementById('activePoints').textContent = `${activeCount}/${convergencePoints.length}`;
    }
}

// ==========================================
= PROGRESSO
// ==========================================

function loadProgress() {
    const sceneCompleted = loadFromLocalStorage(`scene_${SCENE_ID}_completed`);
    if (sceneCompleted) {
        seedsCollected = SEEDS_REQUIRED;
        updateSeedDisplay();
        showLog('Você já completou a Fase da Convergência', 'info');
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
    
    const savedConvergence = loadFromLocalStorage(`scene_${SCENE_ID}_convergence`);
    if (savedConvergence) {
        convergenceLevel = savedConvergence;
        updateConvergenceDisplay();
        
        convergencePoints.forEach((point, idx) => {
            if (idx === 0 && convergenceLevel >= 20) point.activated = true;
            if (idx === 1 && convergenceLevel >= 40) point.activated = true;
            if (idx === 2 && convergenceLevel >= 60) { point.activated = true; startCar(); }
            if (idx === 3 && convergenceLevel >= 80) { point.activated = true; startDogFollowing(); }
            if (idx === 4 && convergenceLevel >= 100) point.activated = true;
        });
    }
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    saveToLocalStorage(`scene_${SCENE_ID}_convergence`, convergenceLevel);
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
    }
}

// ==========================================
= COLETA
// ==========================================

function collectSeed() {
    if (seedsCollected >= SEEDS_REQUIRED) return;
    
    seedsCollected++;
    updateSeedDisplay();
    saveProgress();
    
    showLog(`🌱 Seed coletada! ${seedsCollected}/${SEEDS_REQUIRED}`, 'success');
    createSeedEffect();
    
    increaseConvergence(0.5);
    
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
    effect.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #00ff88, #00aa44);
        border-radius: 50%;
        pointer-events: none;
        animation: convergeExpand 0.5s ease-out forwards;
        z-index: 1000;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ==========================================
= CONCLUSÃO
// ==========================================

async function completeScene() {
    if (seedsCollected >= SEEDS_REQUIRED && convergenceLevel >= 100) {
        showLog(`✅ Cena ${SCENE_ID} completa!`, 'success');
        showTimelineMessage('🎉 Tudo se move junto. O carro, o cão, a estrada. Convergência total.');
        
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
        
        showNextSceneButton();
        return true;
    } else if (seedsCollected >= SEEDS_REQUIRED && convergenceLevel < 100) {
        showTimelineMessage('⚠️ Seeds coletadas, mas a convergência ainda é fraca. Reúna mais participantes.');
    }
    return false;
}

function showNextSceneButton() {
    const button = document.createElement('button');
    button.textContent = '▶ PRÓXIMA CENA - FASE DA MANIFESTAÇÃO';
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
        window.location.href = '../scene_6/';
    };
    document.body.appendChild(button);
}

// ==========================================
= TIMELINE
// ==========================================

const timelineMessages = [
    "Tudo começa a se mover junto.",
    "O carro surge na estrada digital.",
    "O cão segue os passos do bonequinho.",
    "Cada participante é parte de um mesmo fluxo.",
    "A convergência transforma muitos em um.",
    "O protocolo agora respira como um organismo."
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
        
        for (let point of convergencePoints) {
            if (!point.activated) {
                const dx = player.x - point.x;
                const dy = player.y - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < point.radius + 30) {
                    increaseConvergence(1.5);
                    point.activationProgress = Math.min(100, point.activationProgress + 2);
                    
                    if (point.activationProgress >= 100 && !point.activated) {
                        activateConvergencePoint(convergencePoints.indexOf(point));
                    }
                }
            }
        }
        
        if (Math.random() < 0.02) {
            collectSeed();
        }
    }
}

function draw() {
    if (!ctx) return;
    
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(0, canvas.height / 2 - 50, canvas.width, 100);
    
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 30]);
    for (let y = canvas.height / 2 - 30; y <= canvas.height / 2 + 30; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    for (let point of convergencePoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        
        if (point.activated) {
            ctx.fillStyle = `rgba(0, 255, 100, ${0.3 + Math.sin(Date.now() * 0.005) * 0.1})`;
            ctx.fill();
            ctx.strokeStyle = '#00ff66';
        } else {
            ctx.fillStyle = `rgba(100, 100, 200, ${0.2 + point.activationProgress / 500})`;
            ctx.fill();
            ctx.strokeStyle = '#6688ff';
        }
        ctx.stroke();
        
        if (point.activationProgress > 0 && !point.activated) {
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(point.x - 20, point.y - 35, 40 * (point.activationProgress / 100), 4);
        }
        
        ctx.fillStyle = point.activated ? '#00ff88' : '#88aaff';
        ctx.font = '9px monospace';
        ctx.fillText(point.name, point.x - 40, point.y - 40);
        
        if (point.activated) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('✓ CONVERGIDO', point.x - 35, point.y + 35);
        }
    }
    
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(carPosition.x - 20, carPosition.y - 10, 40, 20);
    ctx.fillStyle = '#ff8888';
    ctx.fillRect(carPosition.x - 15, carPosition.y - 15, 30, 5);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(carPosition.x - 15, carPosition.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(carPosition.x + 15, carPosition.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    if (dogPosition.following || dogPosition.x) {
        ctx.fillStyle = '#aa8866';
        ctx.beginPath();
        ctx.ellipse(dogPosition.x, dogPosition.y, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#886644';
        ctx.beginPath();
        ctx.ellipse(dogPosition.x + 8, dogPosition.y - 3, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(dogPosition.x + 10, dogPosition.y - 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (let follower of followers) {
        ctx.fillStyle = `rgba(100, 200, 255, ${0.3 + follower.convergenceLevel * 0.3})`;
        ctx.beginPath();
        ctx.arc(follower.position.x, follower.position.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#88aaff';
        ctx.font = '8px monospace';
        ctx.fillText(formatAddress(follower.address), follower.position.x - 20, follower.position.y - 15);
        
        if (convergenceLevel > 50) {
            const dx = player.x - follower.position.x;
            const dy = player.y - follower.position.y;
            follower.position.x += dx * 0.01;
            follower.position.y += dy * 0.01;
        }
    }
    
    ctx.shadowBlur = convergenceLevel / 5;
    ctx.shadowColor = '#00ff88';
    
    ctx.strokeStyle = '#00ff88';
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
    
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    if (convergenceLevel > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y - 10, 25, 0, (convergenceLevel / 100) * Math.PI * 2);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.stroke();
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
        @keyframes convergeExpand {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        .status-success { color: #00ff88; }
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