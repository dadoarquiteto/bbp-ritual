// ==================================================
// CENA 4 - FASE DA RESSONÂNCIA
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 4;
const SCENE_NAME = 'Fase da Ressonância';
const SEEDS_REQUIRED = 8000;

let player = { x: 100, y: 100, moving: false };
let seedsCollected = 0;
let resonanceNodes = [];
let soundWaves = [];
let connectedNodes = [];
let animationId = null;
let walletAddress = null;
let currentTimelineIndex = 0;
let resonanceIntensity = 0;

let canvas, ctx, timelineEl, seedCountEl, statusEl, resonanceEl, intensityBar;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('📡 Iniciando Cena 4:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    resonanceEl = document.getElementById('resonanceText');
    intensityBar = document.getElementById('intensityBar');
    
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
    generateResonanceNodes();
    startTimeline();
    startGameLoop();
    setupControls();
    startResonanceEffect();
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
= RESSONÂNCIA
// ==========================================

function generateResonanceNodes() {
    const nodePositions = [
        { x: 150, y: 120, frequency: '7.83 Hz', intensity: 0 },
        { x: 400, y: 80, frequency: '14.3 Hz', intensity: 0 },
        { x: 650, y: 150, frequency: '20.5 Hz', intensity: 0 },
        { x: 100, y: 350, frequency: '33.2 Hz', intensity: 0 },
        { x: 350, y: 420, frequency: '40.1 Hz', intensity: 0 },
        { x: 600, y: 380, frequency: '55.8 Hz', intensity: 0 },
        { x: 250, y: 250, frequency: '77.0 Hz', intensity: 0 },
        { x: 550, y: 280, frequency: '92.5 Hz', intensity: 0 }
    ];
    
    resonanceNodes = nodePositions.map((node, index) => ({
        ...node,
        id: index,
        radius: 30,
        activated: false,
        activationProgress: 0
    }));
}

function startResonanceEffect() {
    setInterval(() => {
        if (resonanceIntensity > 0 && Math.random() < resonanceIntensity / 100) {
            soundWaves.push({
                x: player.x,
                y: player.y,
                radius: 5,
                intensity: resonanceIntensity / 50,
                life: 1
            });
        }
        
        soundWaves = soundWaves.filter(wave => {
            wave.radius += 3 * wave.intensity;
            wave.life -= 0.02;
            return wave.life > 0;
        });
        
        if (resonanceIntensity < 100 && seedsCollected > 0) {
            increaseResonance(0.5);
        }
    }, 100);
}

function increaseResonance(amount) {
    resonanceIntensity = Math.min(100, resonanceIntensity + amount);
    updateResonanceDisplay();
    
    if (intensityBar) {
        intensityBar.style.width = `${resonanceIntensity}%`;
        intensityBar.style.backgroundColor = `rgb(${Math.floor(255 * resonanceIntensity / 100)}, ${Math.floor(100 * (1 - resonanceIntensity / 100))}, 0)`;
    }
    
    if (resonanceIntensity >= 25 && resonanceNodes[0] && !resonanceNodes[0].activated) {
        activateNode(0);
    }
    if (resonanceIntensity >= 40 && resonanceNodes[1] && !resonanceNodes[1].activated) {
        activateNode(1);
    }
    if (resonanceIntensity >= 55 && resonanceNodes[2] && !resonanceNodes[2].activated) {
        activateNode(2);
    }
    if (resonanceIntensity >= 70 && resonanceNodes[3] && !resonanceNodes[3].activated) {
        activateNode(3);
    }
    if (resonanceIntensity >= 85 && resonanceNodes[4] && !resonanceNodes[4].activated) {
        activateNode(4);
    }
    if (resonanceIntensity >= 100 && resonanceNodes[5] && !resonanceNodes[5].activated) {
        activateNode(5);
        completeScene();
    }
}

function activateNode(nodeId) {
    if (resonanceNodes[nodeId] && !resonanceNodes[nodeId].activated) {
        resonanceNodes[nodeId].activated = true;
        resonanceNodes[nodeId].activationProgress = 100;
        
        showLog(`📡 Nó de ressonância ${nodeId + 1} ativado!`, 'success');
        showTimelineMessage(`🌀 Frequência ${resonanceNodes[nodeId].frequency} ressoando...`);
        
        for (let i = 0; i < 20; i++) {
            collectSeed();
        }
    }
}

function updateResonanceDisplay() {
    if (resonanceEl) {
        resonanceEl.textContent = `Ressonância: ${Math.floor(resonanceIntensity)}%`;
    }
    
    const activeCount = resonanceNodes.filter(n => n.activated).length;
    if (document.getElementById('activeNodes')) {
        document.getElementById('activeNodes').textContent = `${activeCount}/${resonanceNodes.length}`;
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
        showLog('Você já completou a Fase da Ressonância', 'info');
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
    
    const savedIntensity = loadFromLocalStorage(`scene_${SCENE_ID}_intensity`);
    if (savedIntensity) {
        resonanceIntensity = savedIntensity;
        updateResonanceDisplay();
        
        resonanceNodes.forEach((node, idx) => {
            if (idx === 0 && resonanceIntensity >= 25) node.activated = true;
            if (idx === 1 && resonanceIntensity >= 40) node.activated = true;
            if (idx === 2 && resonanceIntensity >= 55) node.activated = true;
            if (idx === 3 && resonanceIntensity >= 70) node.activated = true;
            if (idx === 4 && resonanceIntensity >= 85) node.activated = true;
            if (idx === 5 && resonanceIntensity >= 100) node.activated = true;
        });
    }
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    saveToLocalStorage(`scene_${SCENE_ID}_intensity`, resonanceIntensity);
    
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
        background: radial-gradient(circle, #ff6600, #ffaa00);
        border-radius: 50%;
        pointer-events: none;
        animation: waveExpand 0.5s ease-out forwards;
        z-index: 1000;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ==========================================
= CONCLUSÃO
// ==========================================

async function completeScene() {
    if (seedsCollected >= SEEDS_REQUIRED && resonanceIntensity >= 100) {
        showLog(`✅ Cena ${SCENE_ID} completa!`, 'success');
        showTimelineMessage('🎉 A rede vibra em uníssono. A ressonância é perfeita.');
        
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
        
        showNextSceneButton();
        return true;
    } else if (seedsCollected >= SEEDS_REQUIRED && resonanceIntensity < 100) {
        showTimelineMessage('⚠️ Seeds coletadas, mas a ressonância ainda é fraca. Aproxime-se dos nós.');
    }
    return false;
}

function showNextSceneButton() {
    const button = document.createElement('button');
    button.textContent = '▶ PRÓXIMA CENA - FASE DA CONVERGÊNCIA';
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
        window.location.href = '../scene_5/';
    };
    document.body.appendChild(button);
}

// ==========================================
= TIMELINE
// ==========================================

const timelineMessages = [
    "A rede começa a vibrar.",
    "Cada participante é um ponto de ressonância.",
    "As frequências se encontram no vazio.",
    "O patinete aparece — símbolo do movimento coletivo.",
    "A ressonância conecta o que antes estava isolado.",
    "O protocolo agora é uma orquestra."
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
        
        for (let node of resonanceNodes) {
            if (!node.activated) {
                const dx = player.x - node.x;
                const dy = player.y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < node.radius + 20) {
                    increaseResonance(2);
                    node.activationProgress = Math.min(100, node.activationProgress + 3);
                    
                    if (node.activationProgress >= 100 && !node.activated) {
                        activateNode(resonanceNodes.indexOf(node));
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
    
    ctx.fillStyle = '#0a0a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 100, 255, ${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.05})`;
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
            const y = canvas.height / 2 + Math.sin(x * 0.02 + Date.now() * 0.002 + i) * 50;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    for (let node of resonanceNodes) {
        const pulseSize = node.activated ? 1 + Math.sin(Date.now() * 0.005) * 0.2 : 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseSize, 0, Math.PI * 2);
        
        if (node.activated) {
            ctx.fillStyle = `rgba(0, 255, 100, ${0.3 + Math.sin(Date.now() * 0.008) * 0.1})`;
            ctx.fill();
            ctx.strokeStyle = '#00ff66';
        } else {
            ctx.fillStyle = `rgba(100, 100, 200, ${0.2 + node.activationProgress / 500})`;
            ctx.fill();
            ctx.strokeStyle = '#6688ff';
        }
        ctx.stroke();
        
        if (node.activationProgress > 0 && !node.activated) {
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(node.x - 25, node.y - 40, 50 * (node.activationProgress / 100), 4);
        }
        
        ctx.fillStyle = node.activated ? '#00ff88' : '#88aaff';
        ctx.font = '10px monospace';
        ctx.fillText(node.frequency, node.x - 25, node.y - 45);
        
        if (node.activated) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('✓ RESSONANTE', node.x - 30, node.y + 35);
        }
    }
    
    for (let wave of soundWaves) {
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${wave.life * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    const activeNodes = resonanceNodes.filter(n => n.activated);
    for (let i = 0; i < activeNodes.length; i++) {
        for (let j = i + 1; j < activeNodes.length; j++) {
            ctx.beginPath();
            ctx.moveTo(activeNodes[i].x, activeNodes[i].y);
            ctx.lineTo(activeNodes[j].x, activeNodes[j].y);
            ctx.strokeStyle = `rgba(0, 255, 100, ${0.3 + Math.sin(Date.now() * 0.002) * 0.1})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    for (let node of connectedNodes) {
        if (node.position) {
            ctx.fillStyle = `rgba(100, 200, 255, ${0.3 + node.resonanceLevel * 0.3})`;
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#88aaff';
            ctx.font = '8px monospace';
            ctx.fillText(formatAddress(node.address), node.position.x - 20, node.position.y - 10);
        }
    }
    
    ctx.shadowBlur = resonanceIntensity / 5;
    ctx.shadowColor = '#ff6600';
    
    ctx.strokeStyle = '#ffaa44';
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
    
    ctx.fillStyle = '#ffaa44';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    if (resonanceIntensity > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y - 10, 25, 0, (resonanceIntensity / 100) * Math.PI * 2);
        ctx.strokeStyle = '#ff6600';
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
        @keyframes waveExpand {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
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