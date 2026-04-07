// ==================================================
// CENA 6 - FASE DA MANIFESTAÇÃO
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 6;
const SCENE_NAME = 'Fase da Manifestação';
const SEEDS_REQUIRED = 10000;

let player = { x: 100, y: 100, moving: false };
let seedsCollected = 0;
let manifestationPoints = [];
let energyParticles = [];
let animationId = null;
let walletAddress = null;
let currentTimelineIndex = 0;
let manifestationLevel = 0;
let switchActivated = false;
let finalCountdown = 0;

let canvas, ctx, timelineEl, seedCountEl, statusEl, manifestationEl, manifestationBar, finalMessageEl;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('🔌 Iniciando Cena 6 - FASE FINAL:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    manifestationEl = document.getElementById('manifestationText');
    manifestationBar = document.getElementById('manifestationBar');
    finalMessageEl = document.getElementById('finalMessage');
    
    canvas.width = 800;
    canvas.height = 500;
    
    await connectWalletIfNeeded();
    
    // REGISTRAR NA REDE BBP RITUAL
    if (typeof BBPRitual !== 'undefined') {
        BBPRitual.setCurrentScene(SCENE_ID);
        
        if (walletAddress) {
            await BBPRitual.registerSeed(walletAddress);
            // Cena 6 não tem NFT, só frações
            await BBPRitual.distributeProtocolFractions(10, walletAddress);
            showLog('✅ Registrado na rede BBP', 'success');
        }
    } else {
        showLog('⚠️ BBPRitual não carregado', 'warning');
    }
    
    loadProgress();
    generateManifestationPoints();
    startTimeline();
    startGameLoop();
    setupControls();
    startManifestationEffect();
    checkAllScenesCompleted();
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
= MANIFESTAÇÃO
// ==========================================

function generateManifestationPoints() {
    const pointPositions = [
        { x: 200, y: 150, name: 'NÓ CENTRAL', radius: 30, activated: false, required: true },
        { x: 500, y: 100, name: 'PORTA DE ENTRADA', radius: 30, activated: false, required: true },
        { x: 650, y: 300, name: 'INTERRUPTOR PRINCIPAL', radius: 35, activated: false, required: true },
        { x: 150, y: 400, name: 'GERADOR DE ENERGIA', radius: 30, activated: false, required: true },
        { x: 400, y: 350, name: 'PAINEL DE CONTROLE', radius: 30, activated: false, required: true }
    ];
    
    manifestationPoints = pointPositions.map((point, index) => ({
        ...point,
        id: index,
        activated: false,
        activationProgress: 0
    }));
}

function startManifestationEffect() {
    setInterval(() => {
        if (manifestationLevel > 0) {
            for (let i = 0; i < Math.floor(manifestationLevel / 10); i++) {
                energyParticles.push({
                    x: player.x + (Math.random() - 0.5) * 50,
                    y: player.y + (Math.random() - 0.5) * 50,
                    life: 1,
                    size: Math.random() * 5 + 2,
                    color: `hsl(${Math.random() * 60 + 20}, 100%, 50%)`
                });
            }
        }
        
        energyParticles = energyParticles.filter(p => {
            p.life -= 0.02;
            p.x += (Math.random() - 0.5) * 2;
            p.y += (Math.random() - 0.5) * 2 - 1;
            return p.life > 0;
        });
    }, 100);
    
    setInterval(() => {
        if (manifestationLevel >= 100 && finalCountdown > 0) {
            finalCountdown--;
            if (finalMessageEl) {
                finalMessageEl.textContent = `MANIFESTAÇÃO EM ${finalCountdown}...`;
            }
            
            if (finalCountdown <= 0) {
                finalizeManifestation();
            }
        }
    }, 1000);
}

function increaseManifestation(amount) {
    manifestationLevel = Math.min(100, manifestationLevel + amount);
    updateManifestationDisplay();
    
    if (manifestationBar) {
        manifestationBar.style.width = `${manifestationLevel}%`;
        manifestationBar.style.backgroundColor = `hsl(${manifestationLevel * 1.2}, 100%, 50%)`;
    }
    
    if (manifestationLevel >= 20 && manifestationPoints[0] && !manifestationPoints[0].activated) {
        activateManifestationPoint(0);
    }
    if (manifestationLevel >= 40 && manifestationPoints[1] && !manifestationPoints[1].activated) {
        activateManifestationPoint(1);
    }
    if (manifestationLevel >= 60 && manifestationPoints[2] && !manifestationPoints[2].activated) {
        activateManifestationPoint(2);
    }
    if (manifestationLevel >= 80 && manifestationPoints[3] && !manifestationPoints[3].activated) {
        activateManifestationPoint(3);
    }
    if (manifestationLevel >= 100 && manifestationPoints[4] && !manifestationPoints[4].activated) {
        activateManifestationPoint(4);
        startFinalCountdown();
    }
}

function activateManifestationPoint(pointId) {
    if (manifestationPoints[pointId] && !manifestationPoints[pointId].activated) {
        manifestationPoints[pointId].activated = true;
        
        showLog(`🔌 Ponto de manifestação ativado: ${manifestationPoints[pointId].name}`, 'success');
        showTimelineMessage(`⚡ ${manifestationPoints[pointId].name} - a energia flui pelo protocolo`);
        
        for (let i = 0; i < 50; i++) {
            collectSeed();
        }
    }
}

function startFinalCountdown() {
    if (!switchActivated) {
        switchActivated = true;
        finalCountdown = 10;
        showLog('🔘 INTERRUPTOR ATIVADO! Protocolo sendo manifestado...', 'success');
        showTimelineMessage('🔴🔴🔴 O INTERRUPTOR FOI LIGADO. A REDE ESTÁ SENDO ATIVADA. 🔴🔴🔴');
        
        if (finalMessageEl) {
            finalMessageEl.style.display = 'block';
            finalMessageEl.style.animation = 'pulse 1s infinite';
        }
    }
}

async function finalizeManifestation() {
    showLog('✨✨✨ PROTOCOLO MANIFESTADO COM SUCESSO! ✨✨✨', 'success');
    showTimelineMessage('🎉🎉🎉 O BITCOIN BLUEPRINT PROTOCOL ESTÁ VIVO! 🎉🎉🎉');
    
    if (finalMessageEl) {
        finalMessageEl.innerHTML = '🎉 PROTOCOLO MANIFESTADO! 🎉<br>VOCÊ FAZ PARTE DA HISTÓRIA DO BITCOIN';
        finalMessageEl.style.background = 'linear-gradient(45deg, #ff8c00, #ff4400)';
        finalMessageEl.style.color = '#000';
        finalMessageEl.style.fontWeight = 'bold';
    }
    
    saveToLocalStorage('bbp_protocol_manifested', true);
    saveToLocalStorage('bbp_manifestation_date', Date.now());
    
    showClaimButton();
    showCelebration();
}

function showClaimButton() {
    const button = document.createElement('button');
    button.textContent = '🏆 REIVINDICAR FRAÇÃO DO BBP 🏆';
    button.className = 'claim-btn';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(45deg, #ff8c00, #ff4400);
        color: #000;
        border: none;
        padding: 16px 32px;
        font-family: monospace;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        z-index: 100;
        clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        animation: pulse 1s infinite;
    `;
    button.onclick = async () => {
        button.disabled = true;
        button.textContent = '🔄 REIVINDICANDO...';
        
        if (typeof generateStepToken === 'function') {
            const token = await generateStepToken();
            if (token) {
                button.textContent = '✅ FRAÇÃO REIVINDICADA! ✅';
                showNotification('Sua fração do BBP foi registrada! Guarde o token.');
            } else {
                button.textContent = '⚠️ ERRO - TENTE NOVAMENTE';
                button.disabled = false;
            }
        }
    };
    document.body.appendChild(button);
}

function showCelebration() {
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.style.cssText = `
                position: fixed;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                width: ${Math.random() * 10 + 5}px;
                height: ${Math.random() * 10 + 5}px;
                background: radial-gradient(circle, #ff8c00, #ff4400, #ffff00);
                border-radius: 50%;
                pointer-events: none;
                animation: explode 1s ease-out forwards;
                z-index: 9999;
            `;
            document.body.appendChild(firework);
            setTimeout(() => firework.remove(), 1000);
        }, i * 100);
    }
}

function updateManifestationDisplay() {
    if (manifestationEl) {
        manifestationEl.textContent = `Manifestação: ${Math.floor(manifestationLevel)}%`;
    }
    
    const activeCount = manifestationPoints.filter(p => p.activated).length;
    if (document.getElementById('activePoints')) {
        document.getElementById('activePoints').textContent = `${activeCount}/${manifestationPoints.length}`;
    }
}

function checkAllScenesCompleted() {
    let completedScenes = 0;
    for (let i = 1; i <= 5; i++) {
        if (loadFromLocalStorage(`scene_${i}_completed`)) {
            completedScenes++;
        }
    }
    
    if (completedScenes >= 5) {
        showLog('🌟 Todas as cenas anteriores foram completadas! A manifestação final está próxima.', 'success');
        increaseManifestation(20);
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
        showLog('Você já completou a Manifestação do Protocolo', 'info');
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
    
    const savedManifestation = loadFromLocalStorage(`scene_${SCENE_ID}_manifestation`);
    if (savedManifestation) {
        manifestationLevel = savedManifestation;
        updateManifestationDisplay();
        
        manifestationPoints.forEach((point, idx) => {
            if (idx === 0 && manifestationLevel >= 20) point.activated = true;
            if (idx === 1 && manifestationLevel >= 40) point.activated = true;
            if (idx === 2 && manifestationLevel >= 60) point.activated = true;
            if (idx === 3 && manifestationLevel >= 80) point.activated = true;
            if (idx === 4 && manifestationLevel >= 100) point.activated = true;
        });
    }
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    saveToLocalStorage(`scene_${SCENE_ID}_manifestation`, manifestationLevel);
    
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
    
    increaseManifestation(0.3);
    
    if (seedsCollected >= SEEDS_REQUIRED) {
        showTimelineMessage('⚠️ Seeds coletadas! Agora ative o INTERRUPTOR PRINCIPAL.');
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
        background: radial-gradient(circle, #ff8c00, #ffff00);
        border-radius: 50%;
        pointer-events: none;
        animation: manifestExpand 0.5s ease-out forwards;
        z-index: 1000;
    `;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

// ==========================================
= TIMELINE
// ==========================================

const timelineMessages = [
    "O momento final se aproxima.",
    "O interruptor está ali. A rede espera.",
    "Todas as seeds, todos os passos, todas as assinaturas.",
    "Uma última ação separa o potencial da realidade.",
    "O protocolo está prestes a nascer.",
    "Aperte o interruptor. Manifeste o BBP."
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
        
        for (let point of manifestationPoints) {
            if (!point.activated) {
                const dx = player.x - point.x;
                const dy = player.y - point.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < point.radius + 30) {
                    increaseManifestation(1);
                    point.activationProgress = Math.min(100, point.activationProgress + 1.5);
                    
                    if (point.activationProgress >= 100 && !point.activated) {
                        activateManifestationPoint(manifestationPoints.indexOf(point));
                    }
                }
            }
        }
        
        const switchPoint = manifestationPoints[2];
        if (switchPoint && switchPoint.activated && !switchActivated && seedsCollected >= SEEDS_REQUIRED) {
            const dx = player.x - switchPoint.x;
            const dy = player.y - switchPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 50) {
                startFinalCountdown();
            }
        }
        
        if (Math.random() < 0.02) {
            collectSeed();
        }
    }
}

function draw() {
    if (!ctx) return;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(1, '#1a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.sin(Date.now() * 0.001 + i) * 100)}, 0, 0.1)`;
        ctx.beginPath();
        ctx.arc((Date.now() * 0.01 + i * 50) % canvas.width, (Date.now() * 0.005 + i * 30) % canvas.height, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    for (let point of manifestationPoints) {
        const pulseScale = point.activated ? 1 + Math.sin(Date.now() * 0.01) * 0.2 : 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius * pulseScale, 0, Math.PI * 2);
        
        if (point.activated) {
            const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius);
            gradient.addColorStop(0, '#ffaa00');
            gradient.addColorStop(1, '#ff4400');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#ffff00';
        } else {
            ctx.fillStyle = `rgba(100, 50, 150, ${0.3 + point.activationProgress / 200})`;
            ctx.fill();
            ctx.strokeStyle = '#aa66ff';
        }
        ctx.stroke();
        
        if (point.activationProgress > 0 && !point.activated) {
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(point.x - 25, point.y - 45, 50 * (point.activationProgress / 100), 4);
        }
        
        ctx.fillStyle = point.activated ? '#ffff00' : '#aa88ff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(point.name, point.x - 40, point.y - 50);
        
        if (point.activated) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('⚡ ATIVADO ⚡', point.x - 35, point.y + 40);
        }
        
        if (point.id === 2 && point.activated && !switchActivated && seedsCollected >= SEEDS_REQUIRED) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.radius + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff4400';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('🔘 APERTE PARA LIGAR', point.x - 50, point.y - 65);
        }
    }
    
    for (let p of energyParticles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const glowIntensity = manifestationLevel / 20;
    ctx.shadowBlur = 20 + manifestationLevel / 2;
    ctx.shadowColor = '#ff6600';
    
    ctx.strokeStyle = manifestationLevel >= 100 ? '#ffff00' : '#ff8c00';
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
    
    ctx.fillStyle = manifestationLevel >= 100 ? '#ffff00' : '#ff8c00';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    if (manifestationLevel > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y - 10, 30, 0, (manifestationLevel / 100) * Math.PI * 2);
        ctx.strokeStyle = `hsl(${manifestationLevel * 1.2}, 100%, 50%)`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    
    if (finalCountdown > 0 && finalCountdown < 10) {
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 48px monospace';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        ctx.fillText(finalCountdown, canvas.width / 2 - 20, canvas.height / 2);
        ctx.shadowBlur = 0;
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
            case ' ':
                if (switchActivated === false && seedsCollected >= SEEDS_REQUIRED) {
                    const switchPoint = manifestationPoints[2];
                    if (switchPoint && switchPoint.activated) {
                        const dx = player.x - switchPoint.x;
                        const dy = player.y - switchPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 60) {
                            startFinalCountdown();
                        }
                    }
                }
                break;
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
            
            const switchPoint = manifestationPoints[2];
            if (switchPoint && switchPoint.activated && !switchActivated && seedsCollected >= SEEDS_REQUIRED) {
                const dx = clickX - switchPoint.x;
                const dy = clickY - switchPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 50) {
                    startFinalCountdown();
                    return;
                }
            }
            
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
        @keyframes manifestExpand {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
        }
        @keyframes explode {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(3); opacity: 0; }
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
        }
        .status-success { color: #00ff88; }
        .status-warning { color: #ffaa00; }
        .status-error { color: #ff0000; }
        .claim-btn:hover { transform: translateX(-50%) scale(1.05); }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    init();
});