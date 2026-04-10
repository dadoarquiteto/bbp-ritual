// ==================================================
// BBP NETWORK - FIREBASE REAL
// ==================================================

const BBPRitual = (function() {
    'use strict';

    let walletAddress = null;
    let currentScene = 1;
    let currentSeedCount = 0;

    // ==========================================
    // TOAST INTERNO — PRIVADO AO MÓDULO
    // Não usa window.showNotification para evitar
    // conflito com a função de mesmo nome no main.js
    // ==========================================

    function showBBPToast(message, duration) {
        duration = duration || 5000;
        const toast = document.createElement('div');
        toast.innerHTML = message;
        toast.style.cssText = [
            'position:fixed',
            'bottom:20px',
            'right:20px',
            'background:rgba(0,0,0,0.92)',
            'border:1px solid #f7931a',
            'border-radius:8px',
            'padding:12px 20px',
            'color:#fff',
            'font-family:monospace',
            'font-size:13px',
            'z-index:99999',
            'max-width:320px',
            'box-shadow:0 0 15px rgba(247,147,26,0.3)',
            'line-height:1.5'
        ].join(';');
        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, duration);
    }

    // ==========================================
    // CONECTAR CARTEIRA E REGISTRAR
    // ==========================================

    async function connectAndRegister() {
        if (typeof connectWallet !== 'function') {
            console.error('❌ wallet-connector.js não carregado');
            return null;
        }

        const wallet = await connectWallet();
        if (!wallet || !wallet.address) {
            return null;
        }

        walletAddress = wallet.address;

        const alreadyParticipated = await hasParticipatedInScene(walletAddress, currentScene);
        if (alreadyParticipated) {
            showBBPToast('✅ Você já participou da Cena ' + currentScene + '!', 3000);
            return wallet;
        }

        const success = await registerSeedInFirebase(walletAddress, currentScene);

        if (success) {
            // Cena 6: sem NFT fracionado — o Genesis pertence ao protocolo
            if (currentScene < 6) {
                await distributeSceneNFT(currentScene, walletAddress);
            }
            await distributeProtocolFractions(10, walletAddress);
            localStorage.setItem('scene_' + currentScene + '_completed', 'true');

            if (currentScene < 6) {
                // Toasts padrão para cenas 1-5
                showBBPToast('✅ Participação Registrada!<br>🌱 Seed ativa na rede BBP', 3000);
                setTimeout(function() {
                    showBBPToast('🎨 NFT da Cena ' + currentScene + ' recebido!', 3000);
                }, 3500);
                setTimeout(function() {
                    var fractions = localStorage.getItem('bbp_fractions_' + walletAddress) || '0';
                    showBBPToast('💎 +10 BBP Fractions!<br>Saldo total: ' + fractions + ' BBP', 4000);
                }, 7000);
            } else {
                // Toasts especiais para Cena 6
                showBBPToast('⚡ Carteira ativada na rede BBP!<br>Você faz parte da Manifestação.', 3500);
                setTimeout(function() {
                    showBBPToast('🌐 NFT Genesis pertence ao protocolo.<br>Você testemunhou o nascimento.', 3500);
                }, 4000);
                setTimeout(function() {
                    var fractions = localStorage.getItem('bbp_fractions_' + walletAddress) || '0';
                    showBBPToast('💎 +10 BBP Fractions na sua carteira.<br>Saldo total: ' + fractions + ' BBP', 4000);
                }, 8000);
            }
        }

        return wallet;
    }

    // ==========================================
    // REGISTRAR SEED NO FIREBASE
    // ==========================================

    async function registerSeedInFirebase(address, sceneNumber) {
        if (!window.BBPFirebase) {
            console.error('❌ Firebase não inicializado');
            return false;
        }

        try {
            const { database, increment, participantsRef, activeSeedsRef } = window.BBPFirebase;

            const participantNode = database.ref('ritual/scene_' + sceneNumber + '/participants/' + address);
            const snapshot = await participantNode.once('value');

            if (snapshot.exists()) {
                return true;
            }

            const fractionsSnapshot = await activeSeedsRef(sceneNumber).once('value');
            const currentFractions = fractionsSnapshot.val() || 0;
            const nextFraction = currentFractions + 1;

            await participantNode.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                fraction: nextFraction,
                address: address
            });

            await activeSeedsRef(sceneNumber).transaction(function(current) {
                return (current || 0) + 1;
            });

            currentSeedCount = currentFractions + 1;
            localStorage.setItem('bbp_active_seeds', currentSeedCount);

            console.log('🌱 Seed registrada: ' + address + ' | Total: ' + currentSeedCount);

            if (currentSeedCount >= 2000) {
                await completeScene(sceneNumber);
            }

            return true;

        } catch (error) {
            console.error('Erro ao registrar seed:', error);
            return false;
        }
    }

    // ==========================================
    // COMPLETAR CENA
    // ==========================================

    async function completeScene(sceneNumber) {
        const completed = localStorage.getItem('scene_' + sceneNumber + '_global_completed');
        if (completed) return;

        try {
            await window.BBPFirebase.completedRef(sceneNumber).set(true);
            localStorage.setItem('scene_' + sceneNumber + '_global_completed', 'true');
            console.log('🎉 Cena ' + sceneNumber + ' completada! 2000 seeds atingidas.');

            const overlay = document.getElementById('sceneOverlay');
            if (overlay) {
                setTimeout(function() {
                    overlay.style.display = 'flex';
                }, 1000);
            }
        } catch (error) {
            console.error('Erro ao completar cena:', error);
        }
    }

    // ==========================================
    // ESCUTAR MUDANÇAS
    // ==========================================

    function listenToSeedCount(sceneNumber, callback) {
        if (!window.BBPFirebase) return function() {};

        const seedRef = window.BBPFirebase.activeSeedsRef(sceneNumber);

        const onValueChange = seedRef.on('value', function(snapshot) {
            const count = snapshot.val() || 0;
            currentSeedCount = count;
            localStorage.setItem('bbp_active_seeds', count);

            const seedEl = document.getElementById('seedCount');
            if (seedEl) seedEl.textContent = count;

            if (callback) callback(count);
        });

        return function() { seedRef.off('value', onValueChange); };
    }

    // ==========================================
    // DISTRIBUIR NFT
    // ==========================================

    async function distributeSceneNFT(sceneId, address) {
        const nftData = {
            type: 'BBP_SCENE_NFT',
            scene: sceneId,
            sceneName: getSceneName(sceneId),
            owner: address,
            timestamp: Date.now(),
            dna: await generateDNA('scene_' + sceneId + '_' + address + '_' + Date.now())
        };

        const nfts = JSON.parse(localStorage.getItem('bbp_nfts') || '[]');
        nfts.push(nftData);
        localStorage.setItem('bbp_nfts', JSON.stringify(nfts));

        console.log('🎨 NFT da Cena ' + sceneId + ' distribuído');
        return nftData;
    }

    // ==========================================
    // DISTRIBUIR FRAÇÕES
    // ==========================================

    async function distributeProtocolFractions(amount, address) {
        let fractions = parseInt(localStorage.getItem('bbp_fractions_' + address) || '0');
        fractions += amount;
        localStorage.setItem('bbp_fractions_' + address, fractions);

        console.log('💎 ' + amount + ' frações distribuídas. Saldo total: ' + fractions + ' BBP');

        await checkCompletionBonus(address);
        return fractions;
    }

    async function checkCompletionBonus(address) {
        let completedScenes = 0;
        for (let i = 1; i <= 6; i++) {
            if (localStorage.getItem('scene_' + i + '_completed') === 'true') {
                completedScenes++;
            }
        }

        if (completedScenes === 6) {
            const bonusGiven = localStorage.getItem('bbp_bonus_given_' + address);
            if (!bonusGiven) {
                await distributeProtocolFractions(10, address);
                localStorage.setItem('bbp_bonus_given_' + address, 'true');
                console.log('🎉 BÔNUS: +10 frações!');
            }
        }
    }

    // ==========================================
    // VERIFICAR PARTICIPAÇÃO
    // ==========================================

    async function hasParticipatedInScene(address, sceneNumber) {
        const localParticipated = localStorage.getItem('scene_' + sceneNumber + '_completed') === 'true';
        if (localParticipated) return true;

        if (window.BBPFirebase) {
            try {
                const participantNode = window.BBPFirebase.database.ref('ritual/scene_' + sceneNumber + '/participants/' + address);
                const snapshot = await participantNode.once('value');
                if (snapshot.exists()) {
                    localStorage.setItem('scene_' + sceneNumber + '_completed', 'true');
                    return true;
                }
            } catch (error) {
                console.error('Erro ao verificar participação:', error);
            }
        }

        return false;
    }

    async function getCurrentSeedCount(sceneNumber) {
        if (window.BBPFirebase) {
            try {
                const snapshot = await window.BBPFirebase.activeSeedsRef(sceneNumber).once('value');
                return snapshot.val() || 0;
            } catch (error) {
                console.error('Erro ao obter seed count:', error);
            }
        }
        return parseInt(localStorage.getItem('bbp_active_seeds') || '0');
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

    async function generateDNA(data) {
        const encoder = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        return Array.from(new Uint8Array(hash)).map(function(b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    // ==========================================
    // API PÚBLICA
    // ==========================================

    return {
        connectAndRegister,
        distributeSceneNFT,
        distributeProtocolFractions,
        getWalletAssets: function(address) {
            const nfts = JSON.parse(localStorage.getItem('bbp_nfts') || '[]');
            const myNfts = nfts.filter(function(n) { return n.owner === address; });
            const fractions = localStorage.getItem('bbp_fractions_' + address) || '0';
            return { address: address, nfts: myNfts, protocolFractions: parseInt(fractions) };
        },
        setCurrentScene,
        registerSeed: registerSeedInFirebase,
        listenToSeedCount,
        hasParticipatedInScene,
        getCurrentSeedCount
    };

})();

if (typeof window !== 'undefined') {
    window.BBPRitual = BBPRitual;
}