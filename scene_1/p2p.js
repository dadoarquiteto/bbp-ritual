// ==================================================
// BBP NETWORK - CENA 1 (FIREBASE REAL)
// ==================================================

const SCENE_NUMBER = 1;
const TOTAL_SEEDS = 2000;

let currentSeedCount = 0;
// REMOVIDO: let currentAddress = null; (já declarado em wallet-connector.js)

// ==================================================
// AJUSTAR VELOCIDADE DO BONECO
// ==================================================

function adjustFrameSpeed(seedCount) {
    const progress = Math.min(seedCount / TOTAL_SEEDS, 1);
    let newSpeed = 200 - (progress * 150);
    newSpeed = Math.max(50, Math.min(200, newSpeed));
    
    if (typeof frameSpeed !== 'undefined' && window.frameSpeed !== newSpeed) {
        window.frameSpeed = newSpeed;
        console.log(`⚡ Velocidade: ${Math.round(newSpeed)}ms (${Math.round(progress * 100)}%)`);
        
        window.dispatchEvent(new CustomEvent('bbp:frameSpeedChange', { detail: { speed: newSpeed } }));
    }
}

// ==================================================
// INICIAR ESCUTA DO FIREBASE
// ==================================================

function initFirebaseListener() {
    if (!window.BBPRitual || typeof window.BBPRitual.listenToSeedCount !== 'function') {
        setTimeout(initFirebaseListener, 1000);
        return;
    }
    
    console.log('🎧 Escutando Firebase...');
    
    window.BBPRitual.listenToSeedCount(SCENE_NUMBER, (count) => {
        currentSeedCount = count;
        console.log(`🌍 Seeds: ${count}/${TOTAL_SEEDS}`);
        
        const seedEl = document.getElementById('seedCount');
        if (seedEl) seedEl.textContent = count;
        
        adjustFrameSpeed(count);
        
        if (count >= TOTAL_SEEDS) {
            const overlay = document.getElementById('sceneOverlay');
            if (overlay && overlay.style.display !== 'flex') {
                setTimeout(() => {
                    overlay.style.display = 'flex';
                }, 1000);
            }
        }
    });
}

// ==================================================
// CONECTAR E PARTICIPAR
// ==================================================

async function connectAndParticipate() {
    console.log('🚀 Conectando...');
    
    if (!window.BBPRitual) {
        showNotification('❌ Rede não inicializada. Recarregue.', 4000);
        return null;
    }
    
    const wallet = await window.BBPRitual.connectAndRegister();
    
    if (!wallet || !wallet.address) {
        showNotification('❌ Falha na conexão da carteira.', 4000);
        return null;
    }
    
    // Usar a variável global do wallet-connector
    window.currentAddress = wallet.address;
    
    const walletStatus = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWalletBtn');
    
    if (walletStatus) {
        walletStatus.innerHTML = `<span style="color: #44ff44;">✅ ${formatAddress(window.currentAddress)}</span>`;
    }
    if (connectBtn) {
        connectBtn.style.display = 'none';
    }
    
    const currentCount = await window.BBPRitual.getCurrentSeedCount(SCENE_NUMBER);
    currentSeedCount = currentCount;
    
    const seedEl = document.getElementById('seedCount');
    if (seedEl) seedEl.textContent = currentSeedCount;
    
    return wallet;
}

// ==================================================
// COMPATIBILIDADE
// ==================================================

async function hasParticipatedInScene(address, sceneNumber) {
    if (window.BBPRitual) {
        return await window.BBPRitual.hasParticipatedInScene(address, sceneNumber);
    }
    return localStorage.getItem(`scene_${sceneNumber}_completed`) === 'true';
}

function disconnectWallet() {
    window.currentAddress = null;
    const walletStatus = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWalletBtn');
    if (walletStatus) walletStatus.innerHTML = '';
    if (connectBtn) connectBtn.style.display = 'inline-block';
    showNotification('Carteira desconectada.', 3000);
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log(`🔥 BBP Ritual - Cena ${SCENE_NUMBER} (Firebase Real)`);
    setTimeout(initFirebaseListener, 500);
    
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);
        newBtn.addEventListener('click', connectAndParticipate);
    }
});

window.connectAndParticipate = connectAndParticipate;
window.hasParticipatedInScene = hasParticipatedInScene;
window.disconnectWallet = disconnectWallet;
window.getCurrentSeedCount = () => currentSeedCount;