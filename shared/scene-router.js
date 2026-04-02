// ==================================================
// ROTEAMENTO ENTRE CENAS
// ==================================================

const SCENE_ROUTES = {
  1: '/scene1/',
  2: '/scene2/',
  3: '/scene3/',
  4: '/scene4/',
  5: '/scene5/',
  6: '/scene6/'
};

// ==========================================
// OBTER CENA ATUAL BASEADO NO CONTADOR
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
// VERIFICAR E REDIRECIONAR
// ==========================================
function checkAndRedirect(seedCount) {
  const currentScene = getCurrentSceneBySeedCount(seedCount);
  const currentPath = window.location.pathname;
  const expectedPath = SCENE_ROUTES[currentScene];
  
  // Se já está na página correta, não redireciona
  if (currentPath.includes(expectedPath)) {
    return;
  }
  
  // Salva estado antes do redirecionamento
  saveToLocalStorage('redirect_from', currentPath);
  saveToLocalStorage('seed_count_before_redirect', seedCount);
  
  showLog(`🔄 Redirecionando para ${expectedPath} (Cena ${currentScene})`, 'info');
  
  // Redireciona
  window.location.href = expectedPath;
}

// ==========================================
// VERIFICAR SE A CENA ESTÁ COMPLETA
// ==========================================
async function isSceneComplete(sceneNumber) {
  const state = await getSceneState(sceneNumber);
  return state.completed;
}

// ==========================================
// OBTER URL DA PRÓXIMA CENA
// ==========================================
function getNextSceneUrl(currentSceneNumber) {
  const nextScene = currentSceneNumber + 1;
  if (nextScene <= 6) {
    return SCENE_ROUTES[nextScene];
  }
  return null;
}

// ==========================================
// REDIRECIONAR PARA PRÓXIMA CENA
// ==========================================
function redirectToNextScene(currentSceneNumber) {
  const nextUrl = getNextSceneUrl(currentSceneNumber);
  if (nextUrl) {
    showLog(`🚪 Avançando para a Cena ${currentSceneNumber + 1}...`, 'info');
    setTimeout(() => {
      window.location.href = nextUrl;
    }, 3000);
  }
}

// ==========================================
// RESTAURAR ESTADO APÓS REDIRECIONAMENTO
// ==========================================
function restoreStateAfterRedirect() {
  const redirectFrom = loadFromLocalStorage('redirect_from');
  const seedCount = loadFromLocalStorage('seed_count_before_redirect');
  
  if (redirectFrom && seedCount) {
    showLog(`↩️ Retornando de ${redirectFrom} com ${seedCount} seeds`, 'info');
    // Limpa após restaurar
    saveToLocalStorage('redirect_from', null);
    saveToLocalStorage('seed_count_before_redirect', null);
  }
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.getCurrentSceneBySeedCount = getCurrentSceneBySeedCount;
  window.checkAndRedirect = checkAndRedirect;
  window.isSceneComplete = isSceneComplete;
  window.getNextSceneUrl = getNextSceneUrl;
  window.redirectToNextScene = redirectToNextScene;
  window.restoreStateAfterRedirect = restoreStateAfterRedirect;
  
  // Restaura estado ao carregar a página
  restoreStateAfterRedirect();
}