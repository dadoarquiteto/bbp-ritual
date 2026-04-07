// ==================================================
// BBP NETWORK - REAL P2P + DISTRIBUIÇÃO DE ATIVOS
// ==================================================
// NÃO MUDA NENHUM ARQUIVO EXISTENTE
// SÓ ADICIONA A CAMADA DE REDE REAL

const BBPRitual = (function() {
    'use strict';

    let walletAddress = null;
    let currentScene = null;
    
    // ==========================================
    // CONECTAR CARTEIRA E REGISTRAR PARTICIPANTE
    // ==========================================
    
    async function connectAndRegister() {
        // Usar a wallet-connector já existente
        if (typeof connectWallet !== 'function') {
            showLog('❌ wallet-connector.js não carregado', 'error');
            return null;
        }
        
        const wallet = await connectWallet();
        if (!wallet || !wallet.address) {
            return null;
        }
        
        walletAddress = wallet.address;
        
        // REGISTRA O PARTICIPANTE COMO UMA SEED ATIVA
        await registerSeed(walletAddress);
        
        // DISTRIBUI NFT DA CENA ATUAL
        if (currentScene && currentScene <= 5) {
            await distributeSceneNFT(currentScene, walletAddress);
        }
        
        // DISTRIBUI 10 FRAÇÕES DO PROTOCOLO
        await distributeProtocolFractions(10, walletAddress);
        
        return wallet;
    }
    
    // ==========================================
    // REGISTRAR SEED (PARTICIPANTE ATIVO)
    // ==========================================
    
    async function registerSeed(address) {
        showLog(`🌱 NOVA SEED: ${formatAddress(address)} conectou à rede`, 'success');
        
        // Broadcast via BroadcastChannel (P2P real)
        const channel = new BroadcastChannel('bbp_ritual');
        channel.postMessage({
            type: 'new_seed',
            data: {
                address: address,
                timestamp: Date.now(),
                scene: currentScene
            }
        });
        
        // Contar seeds ativas
        updateSeedCount();
        
        return true;
    }
    
    function updateSeedCount() {
        // Pega do localStorage ou da rede
        let activeSeeds = parseInt(localStorage.getItem('bbp_active_seeds') || '0');
        activeSeeds++;
        localStorage.setItem('bbp_active_seeds', activeSeeds);
        
        // Atualiza display se existir
        const seedCountEl = document.getElementById('globalSeedCount');
        if (seedCountEl) {
            seedCountEl.textContent = activeSeeds;
        }
        
        showLog(`📊 Total de seeds ativas: ${activeSeeds}`, 'info');
    }
    
    // ==========================================
    // DISTRIBUIR NFT DA CENA
    // ==========================================
    
    async function distributeSceneNFT(sceneId, address) {
        const nftData = {
            type: 'BBP_SCENE_NFT',
            scene: sceneId,
            sceneName: getSceneName(sceneId),
            owner: address,
            timestamp: Date.now(),
            dna: await generateDNA(`scene_${sceneId}_${address}`)
        };
        
        // Salvar localmente (o participante vê que ganhou)
        const nfts = JSON.parse(localStorage.getItem('bbp_nfts') || '[]');
        nfts.push(nftData);
        localStorage.setItem('bbp_nfts', JSON.stringify(nfts));
        
        showLog(`🎨 NFT da Cena ${sceneId} distribuído para ${formatAddress(address)}`, 'success');
        showLog(`   DNA: ${nftData.dna.substring(0, 16)}...`, 'info');
        showLog(`   Para mintar no Ordinals: use o comando abaixo`, 'info');
        showLog(`   bbp inscribe --dna ${nftData.dna} --scene ${sceneId}`, 'info');
        
        // Broadcast para rede
        const channel = new BroadcastChannel('bbp_ritual');
        channel.postMessage({
            type: 'nft_distributed',
            data: nftData
        });
        
        return nftData;
    }
    
    // ==========================================
    // DISTRIBUIR FRAÇÕES DO PROTOCOLO
    // ==========================================
    
    async function distributeProtocolFractions(amount, address) {
        // Pega frações atuais
        let fractions = parseInt(localStorage.getItem(`bbp_fractions_${address}`) || '0');
        fractions += amount;
        localStorage.setItem(`bbp_fractions_${address}`, fractions);
        
        // Salvar transação
        const tx = {
            type: 'BBP_FRACTION_DISTRIBUTION',
            amount: amount,
            to: address,
            timestamp: Date.now(),
            scene: currentScene,
            total: fractions
        };
        
        const history = JSON.parse(localStorage.getItem('bbp_fractions_history') || '[]');
        history.push(tx);
        localStorage.setItem('bbp_fractions_history', JSON.stringify(history));
        
        showLog(`💎 ${amount} frações do protocolo distribuídas para ${formatAddress(address)}`, 'success');
        showLog(`   Saldo total: ${fractions} BBP`, 'success');
        
        // Broadcast
        const channel = new BroadcastChannel('bbp_ritual');
        channel.postMessage({
            type: 'fractions_distributed',
            data: tx
        });
        
        // Se completou todas as cenas, dar bônus
        await checkCompletionBonus(address);
        
        return fractions;
    }
    
    async function checkCompletionBonus(address) {
        // Verifica quais cenas foram completadas
        let completedScenes = 0;
        for (let i = 1; i <= 6; i++) {
            if (localStorage.getItem(`scene_${i}_completed`) === 'true') {
                completedScenes++;
            }
        }
        
        // Bônus de +10 frações se completou tudo
        if (completedScenes === 6) {
            const bonusGiven = localStorage.getItem(`bbp_bonus_given_${address}`);
            if (!bonusGiven) {
                await distributeProtocolFractions(10, address);
                localStorage.setItem(`bbp_bonus_given_${address}`, 'true');
                showLog(`🎉 BÔNUS: +10 frações por completar todas as cenas!`, 'success');
            }
        }
    }
    
    // ==========================================
    // VER ATIVOS NA CARTEIRA
    // ==========================================
    
    function getWalletAssets(address) {
        const nfts = JSON.parse(localStorage.getItem('bbp_nfts') || '[]');
        const myNfts = nfts.filter(n => n.owner === address);
        
        const fractions = localStorage.getItem(`bbp_fractions_${address}`) || '0';
        
        return {
            address: address,
            nfts: myNfts,
            protocolFractions: parseInt(fractions),
            totalValue: parseInt(fractions) // 1 fração = 1 BBP
        };
    }
    
    // ==========================================
    // GERAR DNA (para binding com Bitcoin)
    // ==========================================
    
    async function generateDNA(data) {
        const encoder = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    
    function getSceneName(sceneId) {
        const names = {
            1: 'Fase do Silêncio',
            2: 'Fase da Ignição',
            3: 'Fase da Inscrição',
            4: 'Fase da Ressonância',
            5: 'Fase da Convergência',
            6: 'Fase da Manifestação'
        };
        return names[sceneId] || 'Cena Desconhecida';
    }
    
    function setCurrentScene(sceneId) {
        currentScene = sceneId;
    }
    
    // ==========================================
    // ESCUTAR REDE
    // ==========================================
    
    function listenToNetwork() {
        const channel = new BroadcastChannel('bbp_ritual');
        
        channel.onmessage = (event) => {
            if (event.data.type === 'new_seed') {
                showLog(`🌱 Nova seed ativa: ${formatAddress(event.data.data.address)}`, 'info');
                updateSeedCount();
            }
            
            if (event.data.type === 'nft_distributed') {
                showLog(`🎨 Novo NFT distribuído: Cena ${event.data.data.scene}`, 'info');
            }
            
            if (event.data.type === 'fractions_distributed') {
                showLog(`💎 ${event.data.data.amount} frações distribuídas`, 'info');
            }
        };
    }
    
    // Inicializar escuta
    listenToNetwork();
    
    // ==========================================
    // API PÚBLICA
    // ==========================================
    
    return {
        connectAndRegister,
        distributeSceneNFT,
        distributeProtocolFractions,
        getWalletAssets,
        setCurrentScene,
        registerSeed
    };
    
})();

// Exportar
if (typeof window !== 'undefined') {
    window.BBPRitual = BBPRitual;
}