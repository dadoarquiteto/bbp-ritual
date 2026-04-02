// ==================================================
// SISTEMA DE RECOMPENSAS
// ==================================================

// ==========================================
// CALCULAR FRAGMENTOS GANHOS
// ==========================================
async function calculateFragmentsEarned(address, sceneNumber, position) {
  let fragments = CONFIG.REWARDS.base_per_scene;
  
  // Bônus para primeiros 100
  if (position <= 100) {
    fragments += CONFIG.REWARDS.first_100_bonus;
    showLog(`🎁 Bônus de primeiros 100! +${CONFIG.REWARDS.first_100_bonus} fragmentos`, 'success');
  }
  
  // Bônus por compartilhamentos
  const shares = await getShareCount(address);
  const shareBonus = Math.min(shares, CONFIG.REWARDS.max_shares_bonus) * CONFIG.REWARDS.share_bonus;
  if (shareBonus > 0) {
    fragments += shareBonus;
    showLog(`📢 Bônus por compartilhamentos! +${shareBonus} fragmentos`, 'success');
  }
  
  return fragments;
}

// ==========================================
// OBTER PRÓXIMA FRAÇÃO DISPONÍVEL
// ==========================================
async function getNextAvailableFraction(sceneNumber) {
  return new Promise((resolve) => {
    let maxFraction = 0;
    
    sceneFractions.map().once((data, key) => {
      const fraction = data?.[`scene_${sceneNumber}`];
      if (fraction && fraction.fraction_number > maxFraction) {
        maxFraction = fraction.fraction_number;
      }
    });
    
    setTimeout(() => {
      const nextFraction = maxFraction + 1;
      const totalFractions = CONFIG.SCENES[sceneNumber].fractionCount;
      
      if (nextFraction <= totalFractions) {
        resolve(nextFraction);
      } else {
        resolve(null); // Sem frações disponíveis
      }
    }, 1000);
  });
}

// ==========================================
// OBTER POSIÇÃO DO PARTICIPANTE NA CENA
// ==========================================
async function getParticipantPosition(address, sceneNumber) {
  return new Promise((resolve) => {
    let position = 0;
    const participantsInScene = [];
    
    participants.map().once((data, key) => {
      if (data && data.scenes_joined && data.scenes_joined.includes(sceneNumber)) {
        participantsInScene.push({
          address: key,
          step_when_joined: data.step_when_joined || 0
        });
      }
    });
    
    setTimeout(() => {
      participantsInScene.sort((a, b) => a.step_when_joined - b.step_when_joined);
      position = participantsInScene.findIndex(p => p.address === address) + 1;
      resolve(position);
    }, 1000);
  });
}

// ==========================================
// REGISTRAR COMPARTILHAMENTO
// ==========================================
async function registerShare(address, sceneNumber) {
  const sharesRef = gun.get('bbp_ritual').get('shares').get(address);
  
  return new Promise((resolve) => {
    sharesRef.once((data) => {
      const shares = data?.shares || [];
      shares.push({
        scene: sceneNumber,
        timestamp: Date.now()
      });
      
      sharesRef.put({
        shares: shares,
        total: shares.length
      });
      
      resolve(shares.length);
    });
  });
}

// ==========================================
// OBTER NÚMERO DE COMPARTILHAMENTOS
// ==========================================
async function getShareCount(address) {
  return new Promise((resolve) => {
    gun.get('bbp_ritual').get('shares').get(address).once((data) => {
      resolve(data?.total || 0);
    });
  });
}

// ==========================================
// REGISTRAR CONVITE
// ==========================================
async function registerInvite(inviterAddress, inviteeAddress) {
  const invitesRef = gun.get('bbp_ritual').get('invites').get(inviterAddress);
  
  return new Promise((resolve) => {
    invitesRef.once((data) => {
      const invites = data?.invites || [];
      if (!invites.includes(inviteeAddress)) {
        invites.push(inviteeAddress);
      }
      
      invitesRef.put({
        invites: invites,
        total: invites.length
      });
      
      // Concede bônus para quem convidou
      grantProtocolFragments(inviterAddress, CONFIG.REWARDS.invite_bonus, 'invite');
      
      resolve(invites.length);
    });
  });
}

// ==========================================
// GERAR CÓDIGO DE CONVITE
// ==========================================
function generateInviteCode(address) {
  const hash = address.substring(2, 10);
  return `BBP-${hash.toUpperCase()}`;
}

// ==========================================
// COMPARTILHAR NO TWITTER
// ==========================================
async function shareOnTwitter(sceneNumber) {
  const text = encodeURIComponent(
    `🎨 Acabei de participar da Cena ${sceneNumber} do Ritual BBP!\n\n` +
    `O bonequinho já deu ${currentSeedCount} passos em direção ao interruptor.\n\n` +
    `Participe também: https://bbp.network/ritual\n\n` +
    `#BitcoinBlueprintProtocol #BBP #RitualBBP`
  );
  
  const url = `https://twitter.com/intent/tweet?text=${text}`;
  window.open(url, '_blank');
  
  if (currentAddress) {
    await registerShare(currentAddress, sceneNumber);
    await grantProtocolFragments(currentAddress, CONFIG.REWARDS.share_bonus, 'share');
    showNotification(`🎉 +${CONFIG.REWARDS.share_bonus} fragmentos do protocolo por compartilhar!`);
  }
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.calculateFragmentsEarned = calculateFragmentsEarned;
  window.getNextAvailableFraction = getNextAvailableFraction;
  window.getParticipantPosition = getParticipantPosition;
  window.registerShare = registerShare;
  window.getShareCount = getShareCount;
  window.registerInvite = registerInvite;
  window.generateInviteCode = generateInviteCode;
  window.shareOnTwitter = shareOnTwitter;
}