// ==================================================
// CONFIGURAÇÃO GLOBAL DO BBP - REDE REAL
// ==================================================

window.BBP_CONFIG = {
    // Versão do protocolo
    version: '1.0.0',
    
    // Configuração de rede
    network: {
        name: 'BBP-LIVE-NET',
        type: 'p2p',  // p2p, testnet, mainnet
        decentralized: true,
        
        // Peers GUN.js públicos
        gunPeers: [
            'https://gun-manhattan.herokuapp.com/gun',
            'https://gun-eu.herokuapp.com/gun',
            'https://gun-us.herokuapp.com/gun',
            'https://gun-asia.herokuapp.com/gun'
        ]
    },
    
    // Configuração do ritual
    ritual: {
        totalScenes: 6,
        totalSeeds: 60000,
        scenes: {
            1: { name: 'Fase do Silêncio', seeds: 2000, required: true },
            2: { name: 'Fase da Ignição', seeds: 4000, required: true },
            3: { name: 'Fase da Inscrição', seeds: 6000, required: true },
            4: { name: 'Fase da Ressonância', seeds: 8000, required: true },
            5: { name: 'Fase da Convergência', seeds: 10000, required: true },
            6: { name: 'Fase da Manifestação', seeds: 30000, required: true }
        }
    },
    
    // Configuração de frações
    fractions: {
        totalSupply: 21000000,  // 21 milhões, como Bitcoin
        distribution: {
            ritual: 60000,       // 60k seeds = 60k frações iniciais
            community: 10000000, // 10M para comunidade
            development: 5000000, // 5M para desenvolvimento
            reserve: 5940000     // Restante
        }
    },
    
    // Configuração de carteira
    wallet: {
        supportedProviders: ['unisat', 'xverse', 'leather', 'hiro'],
        network: 'mainnet',  // mainnet para produção
        requiredConfirmations: 1
    },
    
    // DNA do protocolo (será preenchido após inscrição no BTC)
    protocolDNA: null,  // Hash do protocolo inscrito no Bitcoin
    
    // Flags de ambiente
    isDevelopment: false,
    isProduction: true,
    useRealNetwork: true
};

// Salvar configuração global
if (typeof window !== 'undefined') {
    window.bbpConfig = window.BBP_CONFIG;
}

console.log('⚙️ BBP Configuração carregada:', window.BBP_CONFIG.network.name);