// ==================================================
// MAPEAMENTO SEEDS → FRAMES DA ANIMAÇÃO
// ==================================================

// ==========================================
// MAPEAR SEEDS PARA FRAME (ACUMULADO)
// ==========================================
function mapSeedsToAccumulatedFrame(seedCount) {
  const scenes = CONFIG.SCENES;
  
  if (seedCount <= 2000) {
    // Cena 1
    const progress = seedCount / 2000;
    return Math.floor(progress * scenes[1].frames);
  }
  else if (seedCount <= 6000) {
    // Cena 2
    const sceneSeeds = seedCount - 2000;
    const progress = sceneSeeds / 4000;
    return scenes[1].frames + Math.floor(progress * scenes[2].frames);
  }
  else if (seedCount <= 12000) {
    // Cena 3
    const sceneSeeds = seedCount - 6000;
    const progress = sceneSeeds / 6000;
    const previousFrames = scenes[1].frames + scenes[2].frames;
    return previousFrames + Math.floor(progress * scenes[3].frames);
  }
  else if (seedCount <= 20000) {
    // Cena 4
    const sceneSeeds = seedCount - 12000;
    const progress = sceneSeeds / 8000;
    const previousFrames = scenes[1].frames + scenes[2].frames + scenes[3].frames;
    return previousFrames + Math.floor(progress * scenes[4].frames);
  }
  else if (seedCount <= 30000) {
    // Cena 5
    const sceneSeeds = seedCount - 20000;
    const progress = sceneSeeds / 10000;
    const previousFrames = scenes[1].frames + scenes[2].frames + scenes[3].frames + scenes[4].frames;
    return previousFrames + Math.floor(progress * scenes[5].frames);
  }
  else {
    // Cena 6 (acima de 30000)
    const sceneSeeds = Math.min(seedCount - 30000, 30000);
    const progress = sceneSeeds / 30000;
    const previousFrames = scenes[1].frames + scenes[2].frames + scenes[3].frames + scenes[4].frames + scenes[5].frames;
    return previousFrames + Math.floor(progress * scenes[6].frames);
  }
}

// ==========================================
// DETERMINAR CENA ATUAL BASEADO NO CONTADOR
// ==========================================
function getCurrentSceneBySeedCount(seedCount) {
  if (seedCount < 2000) return 1;
  if (seedCount < 6000) return 2;
  if (seedCount < 12000) return 3;
  if (seedCount < 20000) return 4;
  if (seedCount < 30000) return 5;
  return 6;
}

// ==========================================
// OBTER CONFIGURAÇÃO DA CENA ATUAL
// ==========================================
function getCurrentSceneConfig(seedCount) {
  const sceneNumber = getCurrentSceneBySeedCount(seedCount);
  return CONFIG.SCENES[sceneNumber];
}

// ==========================================
// CALCULAR PROGRESSO DA CENA ATUAL
// ==========================================
function getCurrentSceneProgress(seedCount) {
  const config = getCurrentSceneConfig(seedCount);
  if (!config) return 0;
  
  const sceneSeeds = Math.min(
    Math.max(0, seedCount - config.startSeed),
    config.seedsNeeded
  );
  
  return sceneSeeds / config.seedsNeeded;
}

// ==========================================
// ATUALIZAR BARRA DE PROGRESSO
// ==========================================
function updateProgressBar(seedCount) {
  const progressBar = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (!progressBar) return;
  
  const sceneNumber = getCurrentSceneBySeedCount(seedCount);
  const config = CONFIG.SCENES[sceneNumber];
  const sceneSeeds = Math.min(
    Math.max(0, seedCount - config.startSeed),
    config.seedsNeeded
  );
  
  const progress = (sceneSeeds / config.seedsNeeded) * 100;
  
  progressBar.style.width = `${progress}%`;
  
  if (progressText) {
    progressText.textContent = `${Math.floor(progress)}% (${formatNumber(sceneSeeds)}/${formatNumber(config.seedsNeeded)} seeds)`;
  }
}

// ==========================================
// ATUALIZAR ANIMAÇÃO DO PERSONAGEM
// ==========================================
let currentAnimationFrame = 0;
let animationFrameIndex = 0;
let currentAnimation = null;
let currentAnimationFrames = [];

function updateCharacterAnimation(seedCount, animations) {
  const frameNumber = mapSeedsToAccumulatedFrame(seedCount);
  
  if (frameNumber === currentAnimationFrame) return;
  
  currentAnimationFrame = frameNumber;
  
  // Determinar qual animação deve ser exibida baseado no frame
  const sceneNumber = getCurrentSceneBySeedCount(seedCount);
  const config = CONFIG.SCENES[sceneNumber];
  
  // Encontrar o step correto para este frame
  const steps = getAnimationStepsForScene(sceneNumber);
  
  for (const step of steps) {
    if (frameNumber >= step.from && frameNumber <= step.to) {
      const frameIndex = frameNumber - step.from;
      
      if (currentAnimation !== step.animation) {
        currentAnimation = step.animation;
        currentAnimationFrames = animations[step.animation] || [];
        animationFrameIndex = 0;
      }
      
      if (currentAnimationFrames[frameIndex]) {
        const character = document.getElementById('character');
        if (character) {
          character.src = currentAnimationFrames[frameIndex];
        }
      }
      
      break;
    }
  }
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.mapSeedsToAccumulatedFrame = mapSeedsToAccumulatedFrame;
  window.getCurrentSceneBySeedCount = getCurrentSceneBySeedCount;
  window.getCurrentSceneConfig = getCurrentSceneConfig;
  window.getCurrentSceneProgress = getCurrentSceneProgress;
  window.updateProgressBar = updateProgressBar;
  window.updateCharacterAnimation = updateCharacterAnimation;
}