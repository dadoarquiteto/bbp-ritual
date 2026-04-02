// ==================================================
// CONFIGURAÇÕES DA CENA 5
// ==================================================
let currentFrameNumber = 0;
const totalFrames = 750; // Total de frames da Cena 5
let totalSeeds = 10000; // 10.000 seeds para Cena 5
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
    const availableTexts = [1, 2, 3];
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
  console.log('📜 Ritual da Convergência eterno iniciado');
  inEternalLoop = true;
  
  // 1. MUDA O TÍTULO DA TABELA CENTRAL
  if (loreTitle) {
    loreTitle.textContent = 'A CONVERGÊNCIA É ETERNA';
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
    ritualPhase.textContent = '📜 Cena 5: Convergência Bem Sucedida';
  }
  
  // 9. RESETA ANIMAÇÃO PARA INÍCIO
  currentFrameNumber = 1;
  animationFrameIndex = 0;
  accumulatedSeeds = totalSeeds;
  bgX = 0;
  
  if (seedText) {
    seedText.innerText = totalSeeds;
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
// CARREGAR FRAMES (CENA 5 - SUA ANIMAÇÃO)
// ==================================================
function loadFrames(path, prefix, start, end) {
  const frames = [];
  for (let i = start; i <= end; i++) {
    frames.push(`${path}/${prefix}_${String(i).padStart(2, "0")}.png`);
  }
  return frames;
}

// ==================================================
// ANIMAÇÕES DA CENA 5 (SUA ANIMAÇÃO)
// ==================================================
const ANIMATIONS = {
  walking: loadFrames("character/walking", "walking", 1, 16),
  car: loadFrames("character/car", "car", 1, 8),
  dog_entering: loadFrames("character/dog_entering", "dog_entering", 1, 16),
  walking_dog: loadFrames("character/walking_dog", "walking_dog", 1, 16),
  dog_leaving: loadFrames("character/dog_leaving", "dog_leaving", 1, 16),
  car_dog: loadFrames("character/car_dog", "car_dog", 1, 8)
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

// ==================================================
// CENA 5 (SEU ROTEIRO)
// ==================================================
const SCENES = [
  {
    start: 1,
    end: 750,
    bg: "BG_09.png", // Fundo da Cena 5
    steps: [
      // Seed 1-100: walking (loop)
      { 
        from: 1, 
        to: 100, 
        animation: "walking", 
        loop: true 
      },
      // Seed 101-300: car (loop) - 8 frames, 200 seeds
      { 
        from: 101, 
        to: 300, 
        animation: "car", 
        loop: true 
      },
      // Seed 301-400: walking (loop) - 100 seeds
      { 
        from: 301, 
        to: 400, 
        animation: "walking", 
        loop: true 
      },
      // Seed 401-416: dog_entering (não loop) - 16 frames
      { 
        from: 401, 
        to: 416, 
        animation: "dog_entering", 
        loop: false 
      },
      // Seed 417-550: walking_dog (loop) - 134 seeds
      { 
        from: 417, 
        to: 550, 
        animation: "walking_dog", 
        loop: true 
      },
      // Seed 551-566: dog_leaving (não loop) - 16 frames
      { 
        from: 551, 
        to: 566, 
        animation: "dog_leaving", 
        loop: false 
      },
      // Seed 567-600: walking (loop) - 34 seeds
      { 
        from: 567, 
        to: 600, 
        animation: "walking", 
        loop: true 
      },
      // Seed 601-750: car_dog (loop) - 8 frames, 150 seeds
      { 
        from: 601, 
        to: 750, 
        animation: "car_dog", 
        loop: true 
      }
    ]
  }
];

// ==================================================
// MOSTRAR OVERLAY
// ==================================================
function showRitualOverlay() {
  if (overlayShown) return;
  
  console.log('📜 Mostrando overlay da Cena 5');
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
// LOOP PRINCIPAL OTIMIZADO
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
      }
      
      currentFrameNumber++;
      
      if (!inEternalLoop) {
        const targetSeeds = frameToSeedOrganic(currentFrameNumber);
        
        if (accumulatedSeeds < targetSeeds) {
          const remaining = targetSeeds - accumulatedSeeds;
          const increment = Math.max(1, Math.ceil(remaining / (totalFrames - currentFrameNumber + 1)));
          accumulatedSeeds = Math.min(accumulatedSeeds + increment, targetSeeds);
          
          if (seedText) {
            seedText.innerText = accumulatedSeeds;
          }
        }
        
        if (currentFrameNumber >= totalFrames && !overlayShown) {
          accumulatedSeeds = totalSeeds;
          
          if (seedText) {
            seedText.innerText = totalSeeds;
          }
          
          setTimeout(() => {
            if (!overlayShown) {
              showRitualOverlay();
            }
          }, 800);
          
          currentFrameNumber = totalFrames;
          return;
        }
      }
      
      for (const scene of SCENES) {
        if (currentFrameNumber >= scene.start && currentFrameNumber <= scene.end) {
          if (background) {
            background.style.backgroundImage = `url("backgrounds/${scene.bg}")`;
          }
          
          for (const step of scene.steps) {
            if (currentFrameNumber >= step.from && currentFrameNumber <= step.to) {
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
      
      bgX -= bgSpeed;
      if (bgX <= -3000) {
        bgX = 0;
      }
      
      if (background) {
        background.style.backgroundPositionX = bgX + "px";
      }
      
      if (currentAnimation && currentAnimation[animationFrameIndex] && character) {
        character.src = currentAnimation[animationFrameIndex];
      }
      
      if (currentStep && (currentStep.loop || animationFrameIndex < currentAnimation.length - 1)) {
        animationFrameIndex++;
        if (animationFrameIndex >= currentAnimation.length) {
          animationFrameIndex = currentStep.loop ? 0 : currentAnimation.length - 1;
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
  console.log('🚀 BBP Ritual - Cena 5 iniciada');
  
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
    }
  });
  
  window.addEventListener('beforeunload', cleanupIntervals);
  
  if (seedText) {
    seedText.innerText = accumulatedSeeds;
  }
  
  startMainLoop();
  
  window.closeOverlay = closeOverlay;
  window.closeNotification = closeNotification;
});