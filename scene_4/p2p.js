// ==================================================
// SISTEMA P2P - CENA 4 (Conectar = Participar)
// ==================================================

// CONFIGURAÇÃO DA CENA
const SCENE_NUMBER = 4;
const TOTAL_SEEDS = 8000;

// Variáveis P2P
let currentSeedCount = 0;
let currentAddress = null;
let currentWallet = null;
let gun = null;
let ritualDB = null;
let stepCounter = null;
let participants = null;
let protocolFragments = null;
let sceneFractions = null;
let sceneCompleted = false;

// ==================================================
// FUNÇÕES DE CARTEIRA
// ==================================================

function getBitcoinProvider() {
  if (typeof window !== 'undefined') {
    if (window.unisat) return window.unisat;
    if (window.xverse) return window.xverse;
    if (window.leather) return window.leather;
    if (window.hiro) return window.hiro;
    if (window.btc) return window.btc;
    if (window.BitcoinProvider) return window.BitcoinProvider;
    if (window.ethereum && window.ethereum.isBitcoin) return window.ethereum;
    if (window.btcProvider) return window.btcProvider;
  }
  return null;
}

function formatAddress(address) {
  if (!address) return '';
  return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

function showNotification(message, duration = 4000) {
  const notification = document.createElement('div');
  notification.className = 'bbp-notification';
  notification.innerHTML = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0,0,0,0.95);
    border: 1px solid #f7931a;
    border-radius: 8px;
    padding: 14px 20px;
    color: white;
    font-family: monospace;
    font-size: 13px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 350px;
    box-shadow: 0 0 15px rgba(247,147,26,0.3);
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, duration);
}

// ==================================================
// PARTICIPAÇÃO AUTOMÁTICA
// ==================================================

async function hasParticipatedInScene(address, sceneNumber) {
  return new Promise((resolve) => {
    participants.get(address).once((data) => {
      const scenesJoined = data?.scenes_joined || [];
      resolve(scenesJoined.includes(sceneNumber));
    });
  });
}

async function registerParticipation(address, sceneNumber) {
  return new Promise((resolve) => {
    const participantRef = participants.get(address);
    participantRef.once((data) => {
      const scenesJoined = data?.scenes_joined || [];
      if (!scenesJoined.includes(sceneNumber)) {
        scenesJoined.push(sceneNumber);
      }
      participantRef.put({
        address: address,
        scenes_joined: scenesJoined,
        first_seen: data?.first_seen || Date.now(),
        last_seen: Date.now(),
        total_participations: (data?.total_participations || 0) + 1,
        step_when_joined: currentSeedCount
      });
      resolve();
    });
  });
}

async function grantProtocolFragments(address, amount) {
  return new Promise((resolve) => {
    const fragmentRef = protocolFragments.get(address);
    fragmentRef.once((data) => {
      const currentAmount = data?.amount || 0;
      fragmentRef.put({
        amount: currentAmount + amount,
        last_updated: Date.now(),
        history: [...(data?.history || []), {
          amount: amount,
          reason: 'ritual_participation',
          scene: SCENE_NUMBER,
          timestamp: Date.now()
        }]
      });
      resolve();
    });
  });
}

async function grantSceneFraction(address, sceneNumber, fractionNumber) {
  return new Promise((resolve) => {
    const userFractionRef = sceneFractions.get(address);
    const sceneRef = userFractionRef.get(`scene_${sceneNumber}`);
    
    sceneRef.put({
      fraction_number: fractionNumber,
      claimed_at: Date.now(),
      scene: sceneNumber
    }, (ack) => {
      if (ack && ack.err) {
        console.error('Erro ao salvar fração no GUN:', ack.err);
      } else {
        console.log(`✅ Fração #${fractionNumber} da Cena ${sceneNumber} salva no GUN`);
      }
    });
    
    localStorage.setItem(`bbp_scene_${sceneNumber}_fraction`, JSON.stringify({
      fraction_number: fractionNumber,
      claimed_at: Date.now()
    }));
    
    console.log(`✅ Fração #${fractionNumber} da Cena ${sceneNumber} concedida`);
    resolve();
  });
}

async function getNextFraction(sceneNumber) {
  return new Promise((resolve) => {
    let maxFraction = 0;
    let processed = 0;
    let totalEntries = 0;
    
    sceneFractions.map().once((data, key) => {
      totalEntries++;
    });
    
    sceneFractions.map().once((data, key) => {
      processed++;
      const fraction = data?.[`scene_${sceneNumber}`];
      if (fraction && fraction.fraction_number > maxFraction) {
        maxFraction = fraction.fraction_number;
      }
      
      if (processed === totalEntries || totalEntries === 0) {
        const nextFraction = maxFraction + 1;
        console.log(`📊 Próxima fração disponível: ${nextFraction} / ${TOTAL_SEEDS}`);
        resolve(nextFraction <= TOTAL_SEEDS ? nextFraction : null);
      }
    });
    
    setTimeout(() => {
      if (processed === 0) {
        console.log(`📊 Nenhuma fração encontrada, próxima será: 1`);
        resolve(1);
      }
    }, 2000);
  });
}

async function incrementStepCounter() {
  return new Promise((resolve) => {
    stepCounter.once((value) => {
      const newValue = (value || 1) + 1;
      stepCounter.put(newValue);
      resolve(newValue);
    });
  });
}

// ==================================================
// CONECTAR E PARTICIPAR
// ==================================================

async function connectAndParticipate() {
  console.log('🔍 Provedores disponíveis:', {
    unisat: !!window.unisat,
    xverse: !!window.xverse,
    leather: !!window.leather,
    hiro: !!window.hiro,
    btc: !!window.btc,
    BitcoinProvider: !!window.BitcoinProvider,
    ethereum: !!window.ethereum,
    ethereumIsBitcoin: window.ethereum?.isBitcoin || false
  });
  
  const provider = getBitcoinProvider();
  
  if (!provider) {
    console.error('❌ Nenhum provedor Bitcoin encontrado');
    showNotification(
      '⚠️ Nenhuma carteira Bitcoin detectada.\n\n' +
      'Extensões suportadas:\n' +
      '• Unisat\n' +
      '• Xverse\n' +
      '• Leather\n\n' +
      'Se você já tem uma instalada, tente recarregar a página.',
      8000
    );
    return;
  }
  
  console.log('✅ Provedor encontrado:', provider);
  
  try {
    const accounts = await provider.requestAccounts();
    currentAddress = accounts[0];
    currentWallet = provider;
    
    localStorage.setItem('bbp_wallet_address', currentAddress);
    
    const walletStatus = document.getElementById('walletStatus');
    const connectBtn = document.getElementById('connectWalletBtn');
    
    if (walletStatus) {
      walletStatus.innerHTML = `<span style="color: #44ff44;">🔑 ${formatAddress(currentAddress)}</span>`;
    }
    if (connectBtn) {
      connectBtn.style.display = 'none';
    }
    
    console.log('✅ Carteira conectada:', currentAddress);
    showNotification(`✅ Carteira conectada: ${formatAddress(currentAddress)}`, 3000);
    
    // Aguarda 2 segundos antes de prosseguir
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const alreadyParticipated = await hasParticipatedInScene(currentAddress, SCENE_NUMBER);
    
    if (!alreadyParticipated) {
      const newSeedCount = await incrementStepCounter();
      await registerParticipation(currentAddress, SCENE_NUMBER);
      await grantProtocolFragments(currentAddress, 10);
      
      const nextFraction = await getNextFraction(SCENE_NUMBER);
      console.log('nextFraction retornou:', nextFraction);
      
      if (nextFraction) {
        await grantSceneFraction(currentAddress, SCENE_NUMBER, nextFraction);
        showNotification(`🎨 +1 fração do NFT da Cena ${SCENE_NUMBER} conquistada!`, 10000);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
      showNotification(`✨ Seed ativada!\n\n🪙 +10 tokens do protocolo\n(utilidade revelada em breve...)\n\n📊 Total: ${newSeedCount} seeds`, 10000);
    } else {
      showNotification(`🔁 Você já participou da Cena ${SCENE_NUMBER}!`, 3000);
    }
    
  } catch (error) {
    console.error('Erro:', error);
    showNotification('Erro ao conectar carteira: ' + (error.message || 'Erro desconhecido'), 5000);
  }
}

function disconnectWallet() {
  currentAddress = null;
  currentWallet = null;
  localStorage.removeItem('bbp_wallet_address');
  
  const walletStatus = document.getElementById('walletStatus');
  const connectBtn = document.getElementById('connectWalletBtn');
  
  if (walletStatus) walletStatus.innerHTML = '';
  if (connectBtn) connectBtn.style.display = 'inline-block';
  
  console.log('Carteira desconectada');
  showNotification('Carteira desconectada', 2000);
}

// ==================================================
// INICIALIZAÇÃO GUN.JS
// ==================================================

function initGun() {
  if (gun) return gun;
  
  console.log('🔗 Inicializando GUN.js...');
  
  gun = Gun({
    peers: [
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gun-us.herokuapp.com/gun',
      'https://relay.gun.network/gun'
    ],
    localStorage: true,
    radisk: true
  });
  
  ritualDB = gun.get('bbp_ritual');
  stepCounter = ritualDB.get('step_counter');
  participants = ritualDB.get('participants');
  protocolFragments = ritualDB.get('protocol_fragments');
  sceneFractions = ritualDB.get('scene_fractions');
  
  stepCounter.once((value) => {
    if (value === undefined) {
      stepCounter.put(1);
      currentSeedCount = 1;
    } else {
      currentSeedCount = value;
    }
    console.log(`📊 P2P Ready - Contador: ${currentSeedCount}`);
    
    const seedText = document.getElementById('seedCount');
    if (seedText) {
      const sceneSeeds = Math.min(currentSeedCount, TOTAL_SEEDS);
      seedText.innerText = `${sceneSeeds} / ${TOTAL_SEEDS}`;
    }
  });
  
  stepCounter.on((value) => {
    if (value === currentSeedCount) return;
    currentSeedCount = value;
    console.log(`📈 P2P Update: ${currentSeedCount} seeds`);
    
    const seedText = document.getElementById('seedCount');
    if (seedText) {
      const sceneSeeds = Math.min(currentSeedCount, TOTAL_SEEDS);
      seedText.innerText = `${sceneSeeds} / ${TOTAL_SEEDS}`;
    }
    
    if (currentSeedCount >= TOTAL_SEEDS && !sceneCompleted) {
      sceneCompleted = true;
      console.log('🎉 Cena 4 completada! Redirecionando para Cena 5...');
      showNotification('🎉 Cena 4 concluída! Avançando para a Cena 5...', 3000);
      setTimeout(() => {
        window.location.href = '/scene5/';
      }, 3000);
    }
  });
  
  return gun;
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
  console.log(`🚀 P2P System - Cena ${SCENE_NUMBER} iniciado`);
  
  setTimeout(() => {
    initGun();
  }, 500);
  
  const connectBtn = document.getElementById('connectWalletBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectAndParticipate);
    console.log('✅ Botão Conectar configurado');
  }
});

window.connectWallet = connectAndParticipate;
window.disconnectWallet = disconnectWallet;