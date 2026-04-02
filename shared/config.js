// ==================================================
// CONFIGURAÇÃO GLOBAL DO RITUAL BBP
// ==================================================

const CONFIG = {
  // ==========================================
  // AMBIENTE
  // ==========================================
  ENV: 'local', // 'local' ou 'production'
  
  // ==========================================
  // DATAS DO RITUAL
  // ==========================================
  RITUAL_START_DATE: '2025-04-01T09:00:00-03:00',
  
  // ==========================================
  // ACUMULADOS PARA ANIMAÇÃO
  // ==========================================
  ACCUMULATED_SEEDS: {
    1: 2000,
    2: 6000,
    3: 12000,
    4: 20000,
    5: 30000,
    6: 60000
  },
  
  ACCUMULATED_FRAMES: {
    1: 500,
    2: 1050,
    3: 1620,
    4: 2270,
    5: 3020,
    6: 7405
  },
  
  // ==========================================
  // CONFIGURAÇÃO DAS CENAS
  // ==========================================
  SCENES: {
    1: {
      name: 'Silêncio',
      subtitle: 'Invocação Inicial',
      seedsNeeded: 2000,
      frames: 500,
      startFrame: 0,
      startSeed: 0,
      nftName: 'NFT do Silêncio',
      nftId: 'BBP:id:ritual:silence',
      fractionCount: 2000,
      arweavePath: 'scene1_fragments',
      bgImage: 'BG_01.png'
    },
    2: {
      name: 'Ignição',
      subtitle: 'Despertar do Protocolo',
      seedsNeeded: 4000,
      frames: 550,
      startFrame: 500,
      startSeed: 2000,
      nftName: 'NFT da Ignição',
      nftId: 'BBP:id:ritual:ignition',
      fractionCount: 4000,
      arweavePath: 'scene2_fragments',
      bgImage: 'BG_02.png'
    },
    3: {
      name: 'Inscrição',
      subtitle: 'Alinhamento dos Fragmentos',
      seedsNeeded: 6000,
      frames: 570,
      startFrame: 1050,
      startSeed: 6000,
      nftName: 'NFT da Inscrição',
      nftId: 'BBP:id:ritual:inscription',
      fractionCount: 6000,
      arweavePath: 'scene3_fragments',
      bgImage: 'BG_03.png'
    },
    4: {
      name: 'Ressonância',
      subtitle: 'Amplificação do Chamado',
      seedsNeeded: 8000,
      frames: 650,
      startFrame: 1620,
      startSeed: 12000,
      nftName: 'NFT da Ressonância',
      nftId: 'BBP:id:ritual:resonance',
      fractionCount: 8000,
      arweavePath: 'scene4_fragments',
      bgImage: 'BG_07.png'
    },
    5: {
      name: 'Convergência',
      subtitle: 'Unificação Ativa',
      seedsNeeded: 10000,
      frames: 750,
      startFrame: 2270,
      startSeed: 20000,
      nftName: 'NFT da Convergência',
      nftId: 'BBP:id:ritual:convergence',
      fractionCount: 10000,
      arweavePath: 'scene5_fragments',
      bgImage: 'BG_09.png'
    },
    6: {
      name: 'Manifestação',
      subtitle: 'Blueprint Ativo',
      seedsNeeded: 30000,
      frames: 4385,
      startFrame: 3020,
      startSeed: 30000,
      nftName: 'NFT Genesis do Protocolo',
      nftId: 'BBP:id:ritual:genesis',
      fractionCount: 1,
      arweavePath: 'genesis_nft.png',
      bgImage: 'BG_01.png'
    }
  },
  
  // ==========================================
  // RECOMPENSAS (VALORES PROVISÓRIOS)
  // ==========================================
  REWARDS: {
    base_per_scene: 10,           // Fragmentos base por participação
    first_100_bonus: 50,          // Bônus para primeiros 100 de cada cena
    share_bonus: 5,               // Bônus por compartilhamento
    max_shares_bonus: 3,          // Máximo de compartilhamentos que dão bônus
    complete_all_scenes_bonus: 100, // Bônus por completar as 5 cenas
    invite_bonus: 10,             // Bônus por convidar amigo
    max_per_participant: 1000     // Máximo de fragmentos por participante no ritual
  },
  
  // ==========================================
  // FRAGMENTOS DO PROTOCOLO
  // ==========================================
  PROTOCOL_FRAGMENTS: {
    total: 21000000,               // 21 milhões de fragmentos
    fractions_per_fragment: 100000000  // 100 milhões de frações por fragmento
  },
  
  // ==========================================
  // MOCK BITCOIN (LOCAL)
  // ==========================================
  BITCOIN: {
    local: {
      type: 'mock',
      inscriptionsFile: './mock_btc/inscriptions.json',
      anchorImage: './mock_btc/anchor_10x10.png'
    },
    production: {
      type: 'real',
      api: 'https://mempool.space/api',
      anchorTxid: ''  // Será preenchido após inscrição real
    }
  },
  
  // ==========================================
  // MOCK ARWEAVE (LOCAL)
  // ==========================================
  ARWEAVE: {
    local: {
      type: 'mock',
      basePath: './mock_arweave/'
    },
    production: {
      type: 'real',
      gateway: 'https://arweave.net'
    }
  },
  
  // ==========================================
  // SEEDS FANTASMAS (PEER NODES)
  // ==========================================
  PEER_NODES: {
    local: [
      './mock_peers/peer_01.js',
      './mock_peers/peer_02.js',
      './mock_peers/peer_03.js'
    ],
    production: [
      'https://bbp-peer-01.netlify.app/peer.js',
      'https://bbp-peer-02.vercel.app/peer.js',
      'https://bbp-peer-03.netlify.app/peer.js',
      'https://bbp-peer-04.workers.dev/peer.js'
    ]
  },
  
  // ==========================================
  // GUN.JS PEERS (SEMPRE REAIS)
  // ==========================================
  GUN_PEERS: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun',
    'https://relay.gun.network/gun'
  ],
  
  // ==========================================
  // REDES SUPORTADAS PELOS INDEXADORES
  // ==========================================
  SUPPORTED_NETWORKS: [
    'bitcoin', 'ethereum', 'polygon', 'solana',
    'arbitrum', 'optimism', 'base', 'avalanche', 'bsc'
  ],
  
  NETWORK_ENDPOINTS: {
    bitcoin: 'https://mempool.space/api/address',
    ethereum: 'https://api.etherscan.io/api',
    polygon: 'https://api.polygonscan.com/api',
    solana: 'https://api.solscan.io/account',
    arbitrum: 'https://api.arbiscan.io/api',
    optimism: 'https://api-optimistic.etherscan.io/api',
    base: 'https://api.basescan.org/api',
    avalanche: 'https://api.snowtrace.io/api',
    bsc: 'https://api.bscscan.com/api'
  },
  
  // ==========================================
  // LINKS
  // ==========================================
  LINKS: {
    twitter: 'https://x.com/BitcoinBBP',
    discord: 'https://discord.gg/bbp',
    gamma: 'https://gamma.io/collections/fredo',
    github: 'https://github.com/bitcoinbbp'
  }
};

// Exporta para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}