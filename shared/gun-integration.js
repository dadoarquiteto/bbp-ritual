// ==================================================
// INTEGRAÇÃO GUN.JS - REDE P2P
// ==================================================

let gun = null;
let ritualDB = null;
let stepCounter = null;
let participants = null;
let sceneFractions = null;
let protocolFragments = null;
let sceneState = null;
let networkState = null;

let currentSeedCount = 0;
let currentSceneNumber = 1;

// ==========================================
// INICIALIZAÇÃO
// ==========================================
function initGun() {
  if (gun) return gun;
  
  console.log('🔗 Inicializando GUN.js...');
  
  gun = Gun({
    peers: CONFIG.GUN_PEERS,
    localStorage: true,
    radisk: true
  });
  
  ritualDB = gun.get('bbp_ritual');
  stepCounter = ritualDB.get('step_counter');
  participants = ritualDB.get('participants');
  sceneFractions = ritualDB.get('scene_fractions');
  protocolFragments = ritualDB.get('protocol_fragments');
  sceneState = ritualDB.get('scene_state');
  networkState = ritualDB.get('network_state');
  
  // Inicializa contador
  stepCounter.once((value) => {
    if (value === undefined) {
      stepCounter.put(1);
      currentSeedCount = 1;
      showLog(`🌱 Primeira seed ativada!`, 'success');
    } else {
      currentSeedCount = value;
      showLog(`📊 Contador atual: ${formatNumber(currentSeedCount)} seeds`, 'info');
    }
    
    // Dispara callback de inicialização
    if (window.onSeedCountUpdate) {
      window.onSeedCountUpdate(currentSeedCount);
    }
  });
  
  // Escuta mudanças em tempo real
  stepCounter.on((value) => {
    if (value === currentSeedCount) return;
    
    currentSeedCount = value;
    showLog(`📈 ${formatNumber(currentSeedCount)} seeds ativadas!`, 'info');
    
    if (window.onSeedCountUpdate) {
      window.onSeedCountUpdate(currentSeedCount);
    }
  });
  
  return gun;
}

// ==========================================
// INCREMENTAR CONTADOR
// ==========================================
async function incrementStepCounter() {
  return new Promise((resolve) => {
    stepCounter.once((value) => {
      const newValue = (value || 1) + 1;
      stepCounter.put(newValue);
      showLog(`✨ Nova seed ativada! Total: ${formatNumber(newValue)}`, 'success');
      resolve(newValue);
    });
  });
}

// ==========================================
// REGISTRAR PARTICIPAÇÃO
// ==========================================
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
      
      showLog(`👤 ${formatAddress(address)} participou da Cena ${sceneNumber}`, 'success');
      resolve();
    });
  });
}

// ==========================================
// CONCEDER FRAÇÃO DO NFT DA CENA
// ==========================================
async function grantSceneFraction(address, sceneNumber, fractionNumber, fragmentUrl) {
  return new Promise((resolve) => {
    const fractionRef = sceneFractions.get(address).get(`scene_${sceneNumber}`);
    
    fractionRef.put({
      fraction_number: fractionNumber,
      fragment_url: fragmentUrl,
      claimed_at: Date.now(),
      scene: sceneNumber
    });
    
    // Salva localmente
    saveToLocalStorage(`scene_${sceneNumber}_fraction`, {
      fraction_number: fractionNumber,
      fragment_url: fragmentUrl,
      claimed_at: Date.now()
    });
    
    showLog(`🎨 Fração #${fractionNumber} da Cena ${sceneNumber} concedida!`, 'success');
    resolve();
  });
}

// ==========================================
// CONCEDER FRAGMENTOS DO PROTOCOLO
// ==========================================
async function grantProtocolFragments(address, amount, reason = 'ritual_participation') {
  return new Promise((resolve) => {
    const fragmentRef = protocolFragments.get(address);
    
    fragmentRef.once((data) => {
      const currentAmount = data?.amount || 0;
      let newAmount = currentAmount + amount;
      
      // Limita ao máximo por participante
      newAmount = Math.min(newAmount, CONFIG.REWARDS.max_per_participant);
      
      fragmentRef.put({
        amount: newAmount,
        last_updated: Date.now(),
        history: [...(data?.history || []), {
          amount: amount,
          reason: reason,
          timestamp: Date.now()
        }]
      });
      
      showLog(`💎 +${amount} fragmentos do protocolo! Total: ${formatNumber(newAmount)}`, 'success');
      resolve(newAmount);
    });
  });
}

// ==========================================
// VERIFICAR SE JÁ PARTICIPOU DA CENA
// ==========================================
async function hasParticipatedInScene(address, sceneNumber) {
  return new Promise((resolve) => {
    participants.get(address).once((data) => {
      const scenesJoined = data?.scenes_joined || [];
      resolve(scenesJoined.includes(sceneNumber));
    });
  });
}

// ==========================================
// OBTER TOTAL DE FRAGMENTOS DO PROTOCOLO
// ==========================================
async function getProtocolFragments(address) {
  return new Promise((resolve) => {
    protocolFragments.get(address).once((data) => {
      resolve(data?.amount || 0);
    });
  });
}

// ==========================================
// OBTER ESTADO DA CENA
// ==========================================
async function getSceneState(sceneNumber) {
  return new Promise((resolve) => {
    sceneState.get(`scene_${sceneNumber}`).once((state) => {
      resolve(state || { completed: false, completed_at: null });
    });
  });
}

// ==========================================
// COMPLETAR CENA
// ==========================================
async function completeScene(sceneNumber) {
  const state = await getSceneState(sceneNumber);
  if (state.completed) return;
  
  sceneState.get(`scene_${sceneNumber}`).put({
    completed: true,
    completed_at: Date.now(),
    total_seeds: CONFIG.SCENES[sceneNumber].seedsNeeded,
    total_frames: CONFIG.SCENES[sceneNumber].frames
  });
  
  showLog(`🎉 CENA ${sceneNumber} COMPLETADA!`, 'success');
  
  if (window.onSceneComplete) {
    window.onSceneComplete(sceneNumber);
  }
  
  // Se completou todas as 5 primeiras cenas, dá bônus
  if (sceneNumber === 5) {
    const address = loadFromLocalStorage('wallet_address');
    if (address) {
      await grantProtocolFragments(address, CONFIG.REWARDS.complete_all_scenes_bonus, 'complete_all_scenes');
      showNotification(`🎉 Parabéns! Você ganhou ${CONFIG.REWARDS.complete_all_scenes_bonus} fragmentos extras por completar as 5 cenas!`);
    }
  }
  
  // Se completou a Cena 6 (interruptor)
  if (sceneNumber === 6) {
    await activateNetwork();
  }
}

// ==========================================
// ATIVAR REDE (INTERRUPTOR)
// ==========================================
async function activateNetwork() {
  networkState.put({
    active: true,
    activated_at: Date.now(),
    total_seeds: currentSeedCount,
    genesis_nft: CONFIG.SCENES[6].nftId
  });
  
  showLog(`🔌 INTERRUPTOR ATIVADO! A rede está viva!`, 'success');
  showLog(`🌟 NFT Genesis do Protocolo revelado!`, 'success');
  
  if (window.onNetworkActivated) {
    window.onNetworkActivated();
  }
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.initGun = initGun;
  window.incrementStepCounter = incrementStepCounter;
  window.registerParticipation = registerParticipation;
  window.grantSceneFraction = grantSceneFraction;
  window.grantProtocolFragments = grantProtocolFragments;
  window.hasParticipatedInScene = hasParticipatedInScene;
  window.getProtocolFragments = getProtocolFragments;
  window.getSceneState = getSceneState;
  window.completeScene = completeScene;
  window.activateNetwork = activateNetwork;
  
  // Expor variáveis globais
  window.gun = gun;
  window.ritualDB = ritualDB;
  window.stepCounter = stepCounter;
  window.currentSeedCount = currentSeedCount;
}