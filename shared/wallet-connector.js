// ==================================================
// CONEXÃO COM CARTEIRA BITCOIN
// ==================================================

let currentWallet = null;
let currentAddress = null;
let currentPubkey = null;

// ==========================================
// DETECTAR PROVEDOR DE CARTEIRA
// ==========================================
function getBitcoinProvider() {
  if (window.unisat) return window.unisat;
  if (window.xverse) return window.xverse;
  if (window.btc) return window.btc;
  if (window.leather) return window.leather;
  if (window.hiro) return window.hiro;
  if (window.bitcoinProvider) return window.bitcoinProvider;
  return null;
}

// ==========================================
// CONECTAR CARTEIRA
// ==========================================
async function connectWallet() {
  const provider = getBitcoinProvider();
  
  if (!provider) {
    showNotification(
      '⚠️ Nenhuma carteira Bitcoin detectada.<br>' +
      'Instale <strong>Unisat</strong>, <strong>Xverse</strong> ou <strong>Leather</strong> para participar.',
      8000
    );
    showLog('Nenhuma carteira Bitcoin detectada', 'error');
    return null;
  }
  
  try {
    showLog('🔄 Solicitando conexão com carteira...', 'info');
    
    const accounts = await provider.requestAccounts();
    currentAddress = accounts[0];
    currentPubkey = await provider.getPublicKey();
    currentWallet = provider;
    
    showLog(`✅ Carteira conectada: ${formatAddress(currentAddress)}`, 'success');
    
    saveToLocalStorage('wallet_address', currentAddress);
    saveToLocalStorage('wallet_pubkey', currentPubkey);
    
    updateWalletUI();
    await checkExistingParticipations();
    
    return {
      address: currentAddress,
      pubkey: currentPubkey,
      provider: currentWallet
    };
    
  } catch (error) {
    console.error('Erro ao conectar carteira:', error);
    showLog(`Erro ao conectar: ${error.message}`, 'error');
    return null;
  }
}

// ==========================================
// DESCONECTAR CARTEIRA
// ==========================================
function disconnectWallet() {
  currentWallet = null;
  currentAddress = null;
  currentPubkey = null;
  
  saveToLocalStorage('wallet_address', null);
  saveToLocalStorage('wallet_pubkey', null);
  
  updateWalletUI();
  showLog('Carteira desconectada', 'info');
}

// ==========================================
// ATUALIZAR UI DA CARTEIRA
// ==========================================
function updateWalletUI() {
  const walletStatus = document.getElementById('walletStatus');
  const walletButton = document.getElementById('connectWalletBtn');
  
  if (!walletStatus) return;
  
  if (currentAddress) {
    walletStatus.innerHTML = `
      <span class="wallet-connected">
        🔑 ${formatAddress(currentAddress)}
        <button class="wallet-disconnect" onclick="disconnectWallet()">✕</button>
      </span>
    `;
    if (walletButton) walletButton.style.display = 'none';
  } else {
    walletStatus.innerHTML = `
      <span class="wallet-disconnected">
        ⚠️ Carteira não conectada
      </span>
    `;
    if (walletButton) walletButton.style.display = 'block';
  }
}

// ==========================================
// VERIFICAR PARTICIPAÇÕES ANTERIORES
// ==========================================
async function checkExistingParticipations() {
  if (!currentAddress) return;
  
  showLog('🔍 Verificando participações anteriores...', 'info');
  
  for (let i = 1; i <= 6; i++) {
    const participated = await hasParticipatedInScene(currentAddress, i);
    if (participated) {
      showLog(`✓ Você já participou da Cena ${i}`, 'info');
      
      const fraction = loadFromLocalStorage(`scene_${i}_fraction`);
      if (fraction) {
        showLog(`  → Fração #${fraction.fraction_number} disponível`, 'info');
      }
    }
  }
  
  // Temporário - função será implementada depois
  const fragments = 0;
  
  if (fragments > 0) {
    showLog(`💎 Você possui ${formatNumber(fragments)} fragmentos do protocolo`, 'success');
  }
}

// ==========================================
// ASSINAR MENSAGEM
// ==========================================
async function signMessage(message) {
  if (!currentWallet) {
    showLog('Conecte a carteira primeiro', 'error');
    return null;
  }
  
  try {
    const signature = await currentWallet.signMessage(message);
    showLog('✅ Mensagem assinada com sucesso!', 'success');
    return signature;
  } catch (error) {
    showLog(`Erro ao assinar: ${error.message}`, 'error');
    return null;
  }
}

// ==========================================
// EXPORTA
// ==========================================
window.getBitcoinProvider = getBitcoinProvider;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.signMessage = signMessage;
window.checkExistingParticipations = checkExistingParticipations;