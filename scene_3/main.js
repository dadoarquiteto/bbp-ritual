// ==================================================
// CENA 3 - FASE DA INSCRIÇÃO
// COM BBP RITUAL NETWORK
// ==================================================

const SCENE_ID = 3;
const SCENE_NAME = 'Fase da Inscrição';
const SEEDS_REQUIRED = 6000;

let player = { x: 100, y: 100, moving: false };
let seedsCollected = 0;
let inscriptions = [];
let animationId = null;
let walletAddress = null;
let currentTimelineIndex = 0;
let inscriptionProgress = 0;
let currentInscription = null;

let canvas, ctx, timelineEl, seedCountEl, statusEl, inscriptionEl, inscriptionProgressEl;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function init() {
    console.log('📝 Iniciando Cena 3:', SCENE_NAME);
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    timelineEl = document.getElementById('timelineText');
    seedCountEl = document.getElementById('seedCount');
    statusEl = document.getElementById('connectionStatus');
    inscriptionEl = document.getElementById('inscriptionText');
    inscriptionProgressEl = document.getElementById('inscriptionProgress');
    
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
    generateInscriptions();
    startTimeline();
    startGameLoop();
    setupControls();
    startInscriptionProcess();
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
= INSCRIÇÕES
// ==========================================

function generateInscriptions() {
    const inscriptionTypes = [
        { name: 'BBP:GENESIS', text: 'O primeiro registro do protocolo', seedsBonus: 1000, difficulty: 1 },
        { name: 'BBP:IDENTITY', text: 'Identidade universal para ativos', seedsBonus: 1000, difficulty: 1 },
        { name: 'BBP:RESOLVER', text: 'O resolvedor descentralizado', seedsBonus: 1000, difficulty: 1 },
        { name: 'BBP:ORACLE', text: 'Rede de oráculos vivos', seedsBonus: 1000, difficulty: 1 },
        { name: 'BBP:LIVING', text: 'Criptografia viva', seedsBonus: 1000, difficulty: 1 },
        { name: 'BBP:QUANTUM', text: 'Segurança pós-quântica', seedsBonus: 1000, difficulty: 1 }
    ];
    
    inscriptions = inscriptionTypes.map((ins, index) => ({
        ...ins,
        id: index,
        x: 100 + (index % 3) * 200,
        y: 150 + Math.floor(index / 3) * 150,
        width: 160,
        height: 80,
        collected: false,
        inscriptionData: {
            type: 'bbp_protocol_inscription',
            version: '1.0.0',
            content: ins.text,
            timestamp: Date.now()
        }
    }));
}

function startInscriptionProcess() {
    setInterval(() => {
        if (currentInscription && inscriptionProgress < 100) {
            inscriptionProgress += 2;
            updateInscriptionDisplay();
            
            if (inscriptionProgress >= 100) {
                completeInscription();
            }
        }
    }, 100);
}

function startInscription(inscription) {
    if (currentInscription || inscription.collected) return;
    
    currentInscription = inscription;
    inscriptionProgress = 0;
    updateInscriptionDisplay();
    
    showTimelineMessage(`📝 Inscrevendo: ${inscription.name}...`);
    showLog(`Iniciando inscrição de ${inscription.name}`, 'info');
}

function updateInscriptionDisplay() {
    if (inscriptionProgressEl) {
        inscriptionProgressEl.style.width = `${inscriptionProgress}%`;
    }
    
    if (inscriptionEl && currentInscription) {
        inscriptionEl.textContent = `${currentInscription.name}: ${inscriptionProgress}%`;
    }
}

async function completeInscription() {
    if (!currentInscription) return;
    
    showLog(`✅ Inscrição completa: ${currentInscription.name}`, 'success');
    showTimelineMessage(`✨ ${currentInscription.name} inscrito no protocolo! +${currentInscription.seedsBonus} seeds`);
    
    currentInscription.collected = true;
    
    for (let i = 0; i < currentInscription.seedsBonus / 100; i++) {
        collectSeed();
    }
    
    currentInscription = null;
    inscriptionProgress = 0;
    
    if (inscriptionEl) {
        inscriptionEl.textContent = 'Aguardando nova inscrição...';
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
        showLog('Você já completou a Fase da Inscrição', 'info');
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
    
    const collectedInscriptions = loadFromLocalStorage(`scene_${SCENE_ID}_inscriptions`);
    if (collectedInscriptions) {
        inscriptions.forEach(ins => {
            if (collectedInscriptions.includes(ins.id)) {
                ins.collected = true;
            }
        });
    }
}

function saveProgress() {
    saveToLocalStorage(`scene_${SCENE_ID}_seeds`, seedsCollected);
    saveToLocalStorage(`scene_${SCENE_ID}_position`, { x: player.x, y: player.y });
    
    const collectedIds = inscriptions.filter(ins => ins.collected).map(ins => ins.id);
    saveToLocalStorage(`scene_${SCENE_ID}_inscriptions`, collectedIds);
    
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
        width: 25px;
        height: 25px;
        background: radial-gradient(circle, #00ff88, #008844);
        border-radius: 50%;
        pointer-events: none;
        animation: inscriptionGlow 0.5s ease-out forwards;
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
        showTimelineMessage('🎉 O protocolo está inscrito. Cada passo agora é registro imutável.');
        
        saveToLocalStorage(`scene_${SCENE_ID}_completed`, true);
        
        showNextSceneButton();
        return true;
    }
    return false;
}

function showNextSceneButton() {
    const button = document.createElement('button');
    button.textContent = '▶ PRÓXIMA CENA - FASE DA RESSONÂNCIA';
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
        window.location.href = '../scene_4/';
    };
    document.body.appendChild(button);
}

// ==========================================
= TIMELINE
// ==========================================

const timelineMessages = [
    "O protocolo começa a ganhar forma escrita.",
    "Cada movimento é um caractere, cada passo uma inscrição.",
    "O bonequinho não anda mais — ele registra.",
    "As primeiras inscrições aparecem no vazio digital.",
    "O BBP começa a ser inscrito no tecido da rede.",
    "O registro é imutável. O protocolo respira."
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
        
        for (let ins of inscriptions) {
            if (!ins.collected && 
                player.x > ins.x && player.x < ins.x + ins.width &&
                player.y > ins.y && player.y < ins.y + ins.height) {
                startInscription(ins);
                break;
            }
        }
        
        if (Math.random() < 0.015) {
            collectSeed();
        }
    }
}

function draw() {
    if (!ctx) return;
    
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#1a3a5a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    ctx.fillStyle = '#2a6a9a';
    ctx.font = '12px monospace';
    for (let i = 0; i < 20; i++) {
        const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        ctx.fillText(char, (Date.now() * 0.001 + i * 37) % canvas.width, (i * 25) % canvas.height);
    }
    
    for (let ins of inscriptions) {
        if (ins.collected) {
            ctx.fillStyle = '#00aa44';
            ctx.strokeStyle = '#00ff88';
        } else if (currentInscription === ins) {
            ctx.fillStyle = '#ffaa00';
            ctx.strokeStyle = '#ffcc44';
        } else {
            ctx.fillStyle = '#1a2a3a';
            ctx.strokeStyle = '#3a6a9a';
        }
        
        ctx.fillRect(ins.x, ins.y, ins.width, ins.height);
        ctx.strokeRect(ins.x, ins.y, ins.width, ins.height);
        
        ctx.fillStyle = ins.collected ? '#00ff88' : '#88aaff';
        ctx.font = '10px monospace';
        ctx.fillText(ins.name, ins.x + 10, ins.y + 25);
        
        ctx.font = '8px monospace';
        ctx.fillStyle = '#88aaff';
        ctx.fillText(ins.text.substring(0, 18), ins.x + 10, ins.y + 45);
        
        if (ins.collected) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('✓ INSCRITO', ins.x + 10, ins.y + 65);
        }
    }
    
    ctx.strokeStyle = '#88aaff';
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
    
    ctx.beginPath();
    ctx.moveTo(player.x + 12, player.y + 5);
    ctx.lineTo(player.x + 22, player.y);
    ctx.stroke();
    
    ctx.fillStyle = '#88aaff';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 4, player.y - 18, 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (currentInscription && inscriptionProgress > 0 && inscriptionProgress < 100) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(player.x - 50, player.y - 40, 100, 10);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(player.x - 50, player.y - 40, inscriptionProgress, 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(`${inscriptionProgress}%`, player.x - 10, player.y - 42);
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
        @keyframes inscriptionGlow {
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