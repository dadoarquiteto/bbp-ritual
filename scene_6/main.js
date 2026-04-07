// ==================================================
// CONFIGURAÇÕES DA CENA 6
// ==================================================
let currentFrameNumber = 0;
const totalFrames = 4385; // Total de frames da Cena 6 (seu ritual completo)
let totalSeeds = 4385; // Seeds desta cena específica
let accumulatedTotalSeeds = 30000; // TOTAL ACUMULADO de todas as cenas (2k+4k+6k+8k+10k+4.385k ≈ 30k)
const frameSpeed = 100;
let isMoving = true;
let overlayShown = false;
let accumulatedSeeds = 1;
let inEternalLoop = false;
let mainInterval = null;
let countdownInterval = null;
let notificationTimeout = null;

// ==================================================
// INTEGRAÇÃO COM TIMELINE
// ==================================================
let timelineData = window.Timeline ? window.Timeline.data : null;

if (timelineData && timelineData.phases) {
  const currentPhase = timelineData.phases.find(p => p.status === 'active');
  if (currentPhase && currentPhase.seeds) {
    totalSeeds = currentPhase.seeds;
    console.log(`🎯 Total de seeds atualizado para: ${totalSeeds}`);
  }
}

// ==================================================
// SISTEMA DE TEXTO AUTOMÁTICO
// ==================================================
let currentLoreIndex = 0;
let loreInterval = null;
let loreCarouselActive = false;

// FUNÇÃO PARA MUDAR TEXTO COM ANIMAÇÃO
function changeLoreText(nextIndex) {
  const texts = document.querySelectorAll('.lore-text');
  
  if (texts[currentLoreIndex]) {
    texts[currentLoreIndex].classList.remove('active');
  }
  
  currentLoreIndex = nextIndex;
  
  if (texts[currentLoreIndex]) {
    texts[currentLoreIndex].classList.add('active');
  }
}

// FUNÇÃO PARA INICIAR CARROSSEL AUTOMÁTICO
function startLoreCarousel() {
  if (loreCarouselActive) return;
  
  console.log('🌀 Iniciando carrossel automático de textos');
  loreCarouselActive = true;
  
  changeLoreText(1);
  
  loreInterval = setInterval(() => {
    const availableTexts = [1, 2, 3, 4];
    let nextIndex;
    
    do {
      nextIndex = availableTexts[Math.floor(Math.random() * availableTexts.length)];
    } while (nextIndex === currentLoreIndex && availableTexts.length > 1);
    
    changeLoreText(nextIndex);
  }, 8000);
}

// ==================================================
// ELEMENTOS DO DOM
// ==================================================
const character = document.getElementById("character");
const background = document.getElementById("background");
const seedText = document.getElementById("seedCount");
const overlay = document.getElementById("sceneOverlay");
const eternalMsg = document.getElementById("eternalRitualMsg");
const ritualPhase = document.querySelector('.ritual-phase');
const loreTitle = document.getElementById('loreTitle');
const seedBeforeOverlay = document.getElementById('seedBeforeOverlay');
const fragmentBeforeOverlay = document.getElementById('fragmentBeforeOverlay');
const nftStatus = document.getElementById('nftStatus');
const fragmentStatus = document.getElementById('fragmentStatus');
const nftCountdown = document.getElementById('nftCountdown');
const fragmentCountdown = document.getElementById('fragmentCountdown');
const notificationOverlay = document.getElementById('notificationOverlay');

// ==================================================
// FUNÇÃO PARA DESATIVAR CLIQUE NA IMAGEM DA SEED
// ==================================================
function disableSeedImageClick() {
  const seedImage = document.querySelector('.seed-image');
  if (seedImage) {
    seedImage.style.cursor = 'default';
    seedImage.style.opacity = '0.6';
    seedImage.style.filter = 'grayscale(70%)';
    seedImage.onclick = null;
    seedImage.title = 'Limite de seeds atingido';
    seedImage.style.boxShadow = '0 0 8px rgba(255, 68, 68, 0.5)';
    seedImage.style.borderColor = '#ff4444';
  }
}

// ==================================================
// FUNÇÃO PARA AGENDAR NOTIFICAÇÃO
// ==================================================
function scheduleNotification() {
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  notificationTimeout = setTimeout(() => {
    showNotification();
  }, 9000);
}

// ==================================================
// FUNÇÃO PARA MOSTRAR NOTIFICAÇÃO
// ==================================================
function showNotification() {
  console.log('📢 Mostrando overlay de notificação');
  
  if (notificationOverlay) {
    notificationOverlay.style.display = 'flex';
  }
}

// ==================================================
// FUNÇÃO PARA FECHAR NOTIFICAÇÃO
// ==================================================
function closeNotification() {
  console.log('Fechando notificação...');
  
  if (notificationOverlay) {
    notificationOverlay.style.display = 'none';
  }
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
}

// ==================================================
// FUNÇÃO ORGÂNICA: CONVERTE FRAME PARA SEED
// ==================================================
function frameToSeedOrganic(frame) {
  const progress = frame / totalFrames;
  const curvedProgress = progress < 0.5 
    ? 2 * progress * progress
    : 1 - 2 * (1 - progress) * (1 - progress);
  
  const seeds = Math.round(totalSeeds * curvedProgress);
  return frame >= totalFrames ? totalSeeds : seeds;
}

// ==================================================
// FUNÇÃO PARA REINICIAR CENA EM LOOP ETERNO
// ==================================================
function startEternalRitualLoop() {
  console.log('📜 Ritual da Manifestação eterno iniciado');
  inEternalLoop = true;
  
  // 1. MUDA O TÍTULO DA TABELA CENTRAL
  if (loreTitle) {
    loreTitle.textContent = 'A MANIFESTAÇÃO É ETERNA';
    loreTitle.style.color = '#ffaa33';
  }
  
  // 2. INICIA CARROSSEL AUTOMÁTICO DE TEXTOS
  startLoreCarousel();
  
  // 3. MOSTRA MENSAGEM SIMPLES
  if (eternalMsg) {
    eternalMsg.style.display = 'flex';
  }
  
  // 4. ESCONDE CONTEÚDO ANTES DO OVERLAY DOS CARDS
  if (seedBeforeOverlay) {
    seedBeforeOverlay.style.display = 'none';
  }
  
  if (fragmentBeforeOverlay) {
    fragmentBeforeOverlay.style.display = 'none';
  }
  
  // 5. MOSTRA STATUS DOS CARDS
  if (nftStatus) {
    nftStatus.style.display = 'flex';
  }
  
  if (fragmentStatus) {
    fragmentStatus.style.display = 'flex';
  }
  
  // 6. DESATIVA CLIQUE NA IMAGEM DA SEED
  disableSeedImageClick();
  
  // 7. INICIA OS COUNTDOWNS NOS CARDS
  startAllCountdowns();
  
  // 8. ATUALIZA O HUD
  if (ritualPhase) {
    ritualPhase.textContent = '📜 Cena 6: Manifestação Bem Sucedida';
  }
  
  // 9. RESETA ANIMAÇÃO PARA INÍCIO
  currentFrameNumber = 1;
  animationFrameIndex = 0;
  accumulatedSeeds = totalSeeds;
  bgX = 0;
  
  if (seedText) {
    seedText.innerText = accumulatedTotalSeeds.toLocaleString(); // Mostra 30.000
  }
  
  // 10. REATIVA MOVIMENTO
  isMoving = true;
  
  // 11. AGENDA NOTIFICAÇÃO PARA 9 SEGUNDOS DEPOIS
  scheduleNotification();
}

// ==================================================
// FUNÇÕES DO OVERLAY
// ==================================================
function closeOverlay() {
  console.log('Fechando overlay...');
  
  if (overlay) {
    overlay.style.display = 'none';
  }
  
  if (!inEternalLoop) {
    startEternalRitualLoop();
  } else {
    isMoving = true;
  }
}

// ==================================================
// FUNÇÃO PARA ATUALIZAR TODOS OS COUNTDOWNS
// ==================================================
function updateAllCountdowns() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  const targetTime = tomorrow.getTime();
  
  function updateCountdown(element) {
    if (!element) return;
    
    const now = new Date().getTime();
    const distance = targetTime - now;
    
    if (distance < 0) {
      element.textContent = "00:00:00";
      return;
    }
    
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    element.textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  updateCountdown(nftCountdown);
  updateCountdown(fragmentCountdown);
  updateCountdown(document.getElementById('countdownTimer'));
}

// FUNÇÃO PARA INICIAR TODOS OS COUNTDOWNS
function startAllCountdowns() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  updateAllCountdowns();
  countdownInterval = setInterval(updateAllCountdowns, 1000);
}

// ==================================================
// CARREGAR FRAMES (CENA 6 - ANIMAÇÃO COMPLETA)
// ==================================================
function loadFrames(path, prefix, start, end) {
  const frames = [];
  for (let i = start; i <= end; i++) {
    frames.push(`${path}/${prefix}_${String(i).padStart(2, "0")}.png`);
  }
  return frames;
}

// ==================================================
// ANIMAÇÕES DA CENA 6 (RITUAL COMPLETO)
// ==================================================
const ANIMATIONS = {
  // Cena 1
  walking: loadFrames("character/walking", "walking", 1, 16),
  dog_entering: loadFrames("character/dog_entering", "dog_entering", 1, 16),
  walking_dog: loadFrames("character/walking_dog", "walking_dog", 1, 16),
  dog_leaving: loadFrames("character/dog_leaving", "dog_leaving", 1, 16),
  
  // Cena 2
  banana_slip: loadFrames("character/banana_slip", "banana_slip", 1, 36),
  stumble_stone: loadFrames("character/stumble_stone", "stumble_stone", 1, 30),
  
  // Cena 3
  ball_obstacle: loadFrames("character/ball_obstacle", "ball_obstacle", 1, 16),
  dog_skate: loadFrames("character/dog_skate", "dog_skate", 1, 14),
  
  // Cena 4
  getting_scooter: loadFrames("character/getting_scooter", "getting_scooter", 1, 9),
  scooter: loadFrames("character/scooter", "scooter", 1, 85),
  hand_box: loadFrames("character/hand_box", "hand_box", 1, 45),
  
  // Cena 5
  car: loadFrames("character/car", "car", 1, 8),
  car_dog: loadFrames("character/car_dog", "car_dog", 1, 8),
  
  // Cenas UFO
  abduction: loadFrames("character/abduction", "abduction", 1, 24),
  ufo_flying: loadFrames("character/ufo_flying", "ufo_flying", 1, 25),
  ufo_landing: loadFrames("character/ufo_landing", "ufo_landing", 1, 18),
  
  // Cenas finais
  walk_activation_white: loadFrames("character/walk_activation_white", "walk_activation_white", 1, 38),
  walk_activation_black: loadFrames("character/walk_activation_black", "walk_activation_black", 1, 47)
};

// ==================================================
// VARIÁVEIS DE ANIMAÇÃO
// ==================================================
let currentAnimation = ANIMATIONS.walking;
let currentAnimationName = "walking";
let currentStep = null;
let animationFrameIndex = 0;
let bgX = 0;
let bgSpeed = 2;
let lastBg = "";
let isInStaticScene = false;
let isInHandBoxScene = false;

// ==================================================
// PRÉ-CARREGAMENTO DE IMAGENS (FIX NETLIFY)
// ==================================================
let allImagesPreloaded = false;

function preloadAllImages() {
  return new Promise((resolve) => {
    const allFrames = [
      ...ANIMATIONS.walking,
      ...ANIMATIONS.dog_entering,
      ...ANIMATIONS.walking_dog,
      ...ANIMATIONS.dog_leaving,
      ...ANIMATIONS.banana_slip,
      ...ANIMATIONS.stumble_stone,
      ...ANIMATIONS.ball_obstacle,
      ...ANIMATIONS.dog_skate,
      ...ANIMATIONS.getting_scooter,
      ...ANIMATIONS.scooter,
      ...ANIMATIONS.hand_box,
      ...ANIMATIONS.car,
      ...ANIMATIONS.car_dog,
      ...ANIMATIONS.abduction,
      ...ANIMATIONS.ufo_flying,
      ...ANIMATIONS.ufo_landing,
      ...ANIMATIONS.walk_activation_white,
      ...ANIMATIONS.walk_activation_black,
    ];

    const bgImages = [
      'backgrounds/BG_01.png',
      'backgrounds/BG_02.png',
      'backgrounds/BG_08.png',
      'backgrounds/BG_07.png',
      'backgrounds/BG_09.png',
      'backgrounds/BG_10.png',
      'backgrounds/BG_11.png',
      'backgrounds/BG_12.png',
    ];
    const allImages = [...allFrames, ...bgImages];

    let loaded = 0;
    const total = allImages.length;

    if (total === 0) {
      allImagesPreloaded = true;
      resolve();
      return;
    }

    console.log(`🖼️ Pré-carregando ${total} imagens...`);

    allImages.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === total) {
          console.log('✅ Todas as imagens pré-carregadas. Animação iniciando.');
          allImagesPreloaded = true;
          resolve();
        }
      };
      img.src = src;
    });
  });
}



// ==================================================
// CENA 6 - RITUAL COMPLETO (COM CONTROLE DE CENAS ESTÁTICAS E HAND_BOX)
// ==================================================
const SCENES = [
  // ========== PARTE 1 (BG_01) ==========
  {
    start: 1,
    end: 500,
    bg: "BG_01.png",
    steps: [
      { from: 1, to: 200, animation: "walking", loop: true },
      { from: 201, to: 216, animation: "dog_entering", loop: false },
      { from: 217, to: 408, animation: "walking_dog", loop: true },
      { from: 409, to: 424, animation: "dog_leaving", loop: false },
      { from: 425, to: 500, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 2 (BG_02) ==========
  {
    start: 501,
    end: 1250,
    bg: "BG_02.png",
    steps: [
      { from: 501, to: 700, animation: "walking", loop: true },
      { from: 701, to: 736, animation: "banana_slip", loop: false },
      { from: 737, to: 938, animation: "walking", loop: true },
      { from: 939, to: 968, animation: "stumble_stone", loop: false },
      { from: 969, to: 1250, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 3 (BG_08) ==========
  {
    start: 1251,
    end: 1970,
    bg: "BG_08.png",
    steps: [
      { from: 1251, to: 1400, animation: "walking", loop: true },
      { from: 1401, to: 1416, animation: "ball_obstacle", loop: false },
      { from: 1417, to: 1480, animation: "walking", loop: true },
      { from: 1481, to: 1650, animation: "dog_skate", loop: true },
      { from: 1651, to: 1970, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 4 (BG_07) ==========
  {
    start: 1971,
    end: 2600,
    bg: "BG_07.png",
    steps: [
      { from: 1971, to: 2170, animation: "walking", loop: true },
      { from: 2171, to: 2179, animation: "getting_scooter", loop: false },
      { from: 2180, to: 2420, animation: "scooter", loop: true },
      { from: 2421, to: 2500, animation: "walking", loop: true },
      { from: 2501, to: 2545, animation: "hand_box", loop: false, special: "pause_bg" },
      { from: 2546, to: 2600, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 5 (BG_09) ==========
  {
    start: 2601,
    end: 4000,
    bg: "BG_09.png",
    steps: [
      { from: 2601, to: 2700, animation: "walking", loop: true },
      { from: 2701, to: 3000, animation: "car", loop: true },
      { from: 3001, to: 3400, animation: "walking", loop: true },
      { from: 3401, to: 3416, animation: "dog_entering", loop: false },
      { from: 3417, to: 3550, animation: "walking_dog", loop: true },
      { from: 3551, to: 3566, animation: "dog_leaving", loop: false },
      { from: 3567, to: 3620, animation: "walking", loop: true },
      { from: 3621, to: 3930, animation: "car_dog", loop: true },
      { from: 3931, to: 4000, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 6 (BG_10) ==========
  {
    start: 4001,
    end: 4300,
    bg: "BG_10.png",
    steps: [
      { from: 4001, to: 4024, animation: "abduction", loop: false },
      { from: 4025, to: 4200, animation: "ufo_flying", loop: true },
      { from: 4201, to: 4218, animation: "ufo_landing", loop: false },
      { from: 4219, to: 4300, animation: "walking", loop: true }
    ]
  },
  
  // ========== PARTE 7 (BG_11 - ESTÁTICO) ==========
  {
    start: 4301,
    end: 4338,
    bg: "BG_11.png",
    steps: [
      { from: 4301, to: 4338, animation: "walk_activation_white", loop: false }
    ],
    isStatic: true // PROPRIEDADE: cena estática
  },
  
  // ========== PARTE 8 (BG_12 - ESTÁTICO) ==========
  {
    start: 4339,
    end: 4385,
    bg: "BG_12.png",
    steps: [
      { from: 4339, to: 4385, animation: "walk_activation_black", loop: false }
    ],
    isStatic: true // PROPRIEDADE: cena estática
  }
];

// ==================================================
// FUNÇÃO PARA APLICAR/REMOVER ANIMAÇÃO FLOAT NO PERSONAGEM
// ==================================================
function updateCharacterAnimation() {
  if (!character) return;
  
  // Remove todas as animações CSS existentes
  character.style.animation = '';
  character.style.transform = 'translateX(-50%)';
  
  // Aplica animação float APENAS se NÃO estiver em cena estática E NÃO estiver em hand_box
  if (!isInStaticScene && !isInHandBoxScene) {
    character.style.animation = 'float 6s ease-in-out infinite';
    console.log('🌀 Animação FLOAT ATIVADA');
  } else {
    console.log('🌀 Animação FLOAT DESATIVADA (cena estática ou hand_box)');
  }
}

// ==================================================
// FUNÇÃO PARA ATUALIZAR CONTADOR DE SEEDS ACUMULADO
// ==================================================
function updateAccumulatedSeedCounter() {
  if (!seedText) return;
  
  const progress = currentFrameNumber / totalFrames;
  const curvedProgress = progress < 0.5 
    ? 2 * progress * progress
    : 1 - 2 * (1 - progress) * (1 - progress);
  
  // Calcula seeds acumulados baseado no progresso da animação atual
  const currentSceneSeeds = Math.round(totalSeeds * curvedProgress);
  
  // Para a Cena 6, queremos mostrar o total acumulado (30.000)
  // Mas ainda mostrar progresso durante a animação
  const displayValue = accumulatedTotalSeeds; // Sempre 30.000
  
  seedText.innerText = displayValue.toLocaleString();
}

// ==================================================
// MOSTRAR OVERLAY
// ==================================================
function showRitualOverlay() {
  if (overlayShown) return;
  
  console.log('📜 Mostrando overlay da Cena 6');
  overlayShown = true;
  isMoving = false;
  
  const countdownTimer = document.getElementById('countdownTimer');
  if (countdownTimer) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const targetTime = tomorrow.getTime();
    
    function updateOverlayCountdown() {
      const now = new Date().getTime();
      const distance = targetTime - now;
      
      if (distance < 0) {
        countdownTimer.textContent = "00:00:00";
        return;
      }
      
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      countdownTimer.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateOverlayCountdown();
    setInterval(updateOverlayCountdown, 1000);
  }
  
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

// ==================================================
// LOOP PRINCIPAL OTIMIZADO (COM CORREÇÕES COMPLETAS)
// ==================================================
function startMainLoop() {
  if (mainInterval) {
    clearInterval(mainInterval);
  }
  
  mainInterval = setInterval(() => {
    try {
      if (!isMoving) return;
      
      if (inEternalLoop && currentFrameNumber >= totalFrames) {
        currentFrameNumber = 1;
        animationFrameIndex = 0;
        bgX = 0;
        isInStaticScene = false;
        isInHandBoxScene = false;
        updateCharacterAnimation();
      }
      
      currentFrameNumber++;
      
      // ATUALIZA CONTADOR DE SEEDS ACUMULADO
      updateAccumulatedSeedCounter();
      
      if (!inEternalLoop) {
        const targetSeeds = frameToSeedOrganic(currentFrameNumber);
        
        if (accumulatedSeeds < targetSeeds) {
          const remaining = targetSeeds - accumulatedSeeds;
          const increment = Math.max(1, Math.ceil(remaining / (totalFrames - currentFrameNumber + 1)));
          accumulatedSeeds = Math.min(accumulatedSeeds + increment, targetSeeds);
        }
        
        if (currentFrameNumber >= totalFrames && !overlayShown) {
          accumulatedSeeds = totalSeeds;
          
          setTimeout(() => {
            if (!overlayShown) {
              showRitualOverlay();
            }
          }, 800);
          
          currentFrameNumber = totalFrames;
          return;
        }
      }
      
      // DETECTAR MUDANÇAS DE ESTADO
      let sceneChanged = false;
      let newIsInStaticScene = false;
      let newIsInHandBoxScene = false;
      let currentStepAnimation = "";
      
      for (const scene of SCENES) {
        if (currentFrameNumber >= scene.start && currentFrameNumber <= scene.end) {
          // VERIFICA SE O FUNDO MUDOU
          if (lastBg !== scene.bg) {
            sceneChanged = true;
            lastBg = scene.bg;
            
            // CARREGA O FUNDO COM ANTECEDÊNCIA PARA EVITAR FLASH
            const img = new Image();
            img.src = `backgrounds/${scene.bg}`;
            
            // APLICA O FUNDO IMEDIATAMENTE
            if (background) {
              background.style.backgroundImage = `url("backgrounds/${scene.bg}")`;
            }
          }
          
          // VERIFICA SE É CENA ESTÁTICA
          newIsInStaticScene = scene.isStatic === true;
          
          // VERIFICA SE ESTÁ NA ANIMAÇÃO hand_box
          for (const step of scene.steps) {
            if (currentFrameNumber >= step.from && currentFrameNumber <= step.to) {
              currentStepAnimation = step.animation;
              
              // DETECTA hand_box (frames 2501-2545)
              if (step.animation === "hand_box") {
                newIsInHandBoxScene = true;
              }
              
              if (currentStep !== step) {
                currentAnimation = ANIMATIONS[step.animation];
                currentAnimationName = step.animation;
                currentStep = step;
                animationFrameIndex = 0;
              }
              
              break;
            }
          }
          break;
        }
      }
      
      // ATUALIZA ESTADOS E ANIMAÇÃO DO PERSONAGEM
      if (newIsInStaticScene !== isInStaticScene || newIsInHandBoxScene !== isInHandBoxScene) {
        isInStaticScene = newIsInStaticScene;
        isInHandBoxScene = newIsInHandBoxScene;
        updateCharacterAnimation();
      }
      
      // CONTROLE DE MOVIMENTO DO FUNDO
      // Se estiver em cena estática OU na animação hand_box, para o fundo
      if (isInStaticScene || isInHandBoxScene) {
        bgSpeed = 0;
        bgX = 0; // Centraliza o fundo
      } else {
        bgSpeed = 2;
      }
      
      // Movimenta o fundo (exceto em cenas estáticas e hand_box)
      if (!isInStaticScene && !isInHandBoxScene) {
        bgX -= bgSpeed;
        if (bgX <= -3000) {
          bgX = 0;
        }
      }
      
      // Aplica posição do fundo
      if (background) {
        background.style.backgroundPositionX = bgX + "px";
      }
      
      // VERIFICAÇÃO DE SEGURANÇA PARA ÍNDICE DE ANIMAÇÃO
      if (animationFrameIndex >= currentAnimation.length) {
        animationFrameIndex = currentAnimation.length - 1;
      }
      
      // MOSTRA O FRAME DO PERSONAGEM
      if (currentAnimation && currentAnimation[animationFrameIndex] && character) {
        // CORREÇÃO: Usa requestAnimationFrame para evitar flicker
        requestAnimationFrame(() => {
          character.src = currentAnimation[animationFrameIndex];
        });
      }
      
      // AVANÇA O FRAME DA ANIMAÇÃO
      if (currentStep && (currentStep.loop || animationFrameIndex < currentAnimation.length - 1)) {
        animationFrameIndex++;
        
        if (animationFrameIndex >= currentAnimation.length) {
          if (currentStep.loop) {
            animationFrameIndex = 0;
          } else {
            animationFrameIndex = currentAnimation.length - 1;
          }
        }
      }
      
    } catch (error) {
      console.error('Erro no loop principal:', error);
      clearInterval(mainInterval);
      setTimeout(() => {
        startMainLoop();
      }, 1000);
    }
  }, frameSpeed);
  
  return mainInterval;
}

// ==================================================
// LIMPEZA DE INTERVALOS
// ==================================================
function cleanupIntervals() {
  if (mainInterval) {
    clearInterval(mainInterval);
    mainInterval = null;
  }
  
  if (loreInterval) {
    clearInterval(loreInterval);
    loreInterval = null;
  }
  
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 BBP Ritual - Cena 6 iniciada');
  console.log('📊 RITUAL COMPLETO - 30.000 seeds acumulados');
  console.log('   Cena 1: 2.000 seeds');
  console.log('   Cena 2: 4.000 seeds');
  console.log('   Cena 3: 6.000 seeds');
  console.log('   Cena 4: 8.000 seeds');
  console.log('   Cena 5: 10.000 seeds');
  console.log('   Cena 6: 4.385 seeds');
  console.log('   TOTAL: 30.000 seeds');
  console.log('🎯 CORREÇÕES APLICADAS:');
  console.log('  1. Mostrando total acumulado de 30.000 seeds');
  console.log('  2. Animação "float" removida durante BG_11 e BG_12');
  console.log('  3. Animação "float" removida durante hand_box (mão e caixa)');
  console.log('  4. Prevenção de flash entre transições de fundo');
  
  if (overlay) {
    overlay.addEventListener('click', function(event) {
      if (event.target === overlay) {
        closeOverlay();
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      isMoving = !isMoving;
      console.log(isMoving ? '▶️ Ritual continuando' : '⏸️ Ritual pausado');
    }
  });
  
  window.addEventListener('beforeunload', cleanupIntervals);
  
  if (seedText) {
    seedText.innerText = accumulatedTotalSeeds.toLocaleString();
  }
  
  // Inicializa a animação do personagem
  updateCharacterAnimation();
  
  preloadAllImages().then(() => {
    startMainLoop();
  });
  
  window.closeOverlay = closeOverlay;
  window.closeNotification = closeNotification;
});