// ==================================================
// INDEXADOR MULTI-CHAIN
// ==================================================

// ==========================================
// BUSCAR ESTADO EM UMA REDE ESPECÍFICA
// ==========================================
async function getNetworkState(network, assetId) {
  const endpoint = CONFIG.NETWORK_ENDPOINTS[network];
  if (!endpoint) return { exists: false, error: 'Network not supported' };
  
  try {
    let url;
    switch (network) {
      case 'bitcoin':
        url = `${endpoint}/${assetId}`;
        break;
      case 'ethereum':
      case 'polygon':
      case 'arbitrum':
      case 'optimism':
      case 'base':
      case 'avalanche':
      case 'bsc':
        url = `${endpoint}?module=account&address=${assetId}&apikey=demo`;
        break;
      case 'solana':
        url = `${endpoint}/${assetId}`;
        break;
      default:
        return { exists: false, error: 'Unknown network' };
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      exists: true,
      data: data,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

// ==========================================
// BUSCAR ESTADO EM TODAS AS REDES
// ==========================================
async function getAssetStateAcrossNetworks(assetId) {
  const states = {};
  
  showLog(`🔍 Consultando estado do ativo ${assetId} em ${CONFIG.SUPPORTED_NETWORKS.length} redes...`, 'info');
  
  for (const network of CONFIG.SUPPORTED_NETWORKS) {
    const state = await getNetworkState(network, assetId);
    states[network] = state;
    
    if (state.exists) {
      showLog(`  ✓ ${network.toUpperCase()}: Ativo`, 'success');
    } else if (state.burned) {
      showLog(`  🔥 ${network.toUpperCase()}: Queimado`, 'warning');
    } else {
      showLog(`  ○ ${network.toUpperCase()}: Não encontrado`, 'info');
    }
  }
  
  return {
    asset_id: assetId,
    timestamp: Date.now(),
    networks: states
  };
}

// ==========================================
// SIMULAR QUEIMA EM OUTRA REDE (DEMONSTRAÇÃO)
// ==========================================
async function simulateBurnOnNetwork(assetId, network) {
  showLog(`🔥 Simulando queima de ${assetId} na rede ${network.toUpperCase()}...`, 'warning');
  
  const burnTx = {
    txid: `0x${Math.random().toString(36).substring(2, 42)}`,
    block: Math.floor(Math.random() * 10000000),
    timestamp: Date.now(),
    asset_id: assetId,
    network: network,
    action: 'burn'
  };
  
  // Registra no GUN
  if (gun) {
    gun.get('bbp_assets').get(assetId).get('history').set(burnTx);
  }
  
  showLog(`  ✓ TxID: ${burnTx.txid.substring(0, 16)}...`, 'success');
  
  return burnTx;
}

// ==========================================
// EXIBIR ESTADO NO VIEWER
// ==========================================
function displayMultiChainState(state, containerId = 'multiChainState') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const networks = Object.entries(state.networks);
  
  container.innerHTML = `
    <div class="multi-chain-grid">
      ${networks.map(([network, data]) => `
        <div class="network-card ${data.exists ? 'active' : (data.burned ? 'burned' : 'inactive')}">
          <h4>${getNetworkIcon(network)} ${network.toUpperCase()}</h4>
          <div class="network-status">
            ${data.exists ? '✅ Ativo' : (data.burned ? '🔥 Queimado' : '❌ Inativo')}
          </div>
          ${data.txid ? `<div class="network-txid">Tx: ${data.txid.substring(0, 12)}...</div>` : ''}
          ${data.error ? `<div class="network-error">Erro: ${data.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ==========================================
// ICONES DAS REDES
// ==========================================
function getNetworkIcon(network) {
  const icons = {
    bitcoin: '₿',
    ethereum: '⟠',
    polygon: '🟣',
    solana: '◎',
    arbitrum: '🔷',
    optimism: '🟠',
    base: '🔵',
    avalanche: '❄️',
    bsc: '🟡'
  };
  return icons[network] || '🌐';
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.getNetworkState = getNetworkState;
  window.getAssetStateAcrossNetworks = getAssetStateAcrossNetworks;
  window.simulateBurnOnNetwork = simulateBurnOnNetwork;
  window.displayMultiChainState = displayMultiChainState;
  window.getNetworkIcon = getNetworkIcon;
}