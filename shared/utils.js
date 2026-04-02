// ==================================================
// UTILITÁRIOS GLOBAIS
// ==================================================

// ==========================================
// LOGS
// ==========================================
function showLog(message, type = 'info') {
  const logContainer = document.getElementById('verificationLog');
  if (logContainer) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// ==========================================
// NOTIFICAÇÕES
// ==========================================
function showNotification(message, duration = 5000) {
  const notification = document.createElement('div');
  notification.className = 'bbp-notification';
  notification.innerHTML = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0,0,0,0.9);
    border: 1px solid #f7931a;
    border-radius: 8px;
    padding: 12px 20px;
    color: white;
    font-family: monospace;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

// ==========================================
// STORAGE
// ==========================================
function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(`bbp_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(`bbp_${key}`);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    console.error('Erro ao carregar do localStorage:', e);
    return defaultValue;
  }
}

// ==========================================
// FORMATAÇÃO
// ==========================================
function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatNumber(num) {
  return num.toLocaleString();
}

// ==========================================
// ANIMAÇÕES
// ==========================================
function addAnimationStyles() {
  if (document.getElementById('bbp-animation-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'bbp-animation-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }
    .bbp-pulse {
      animation: pulse 1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// EXPORTA
// ==========================================
if (typeof window !== 'undefined') {
  window.showLog = showLog;
  window.showNotification = showNotification;
  window.saveToLocalStorage = saveToLocalStorage;
  window.loadFromLocalStorage = loadFromLocalStorage;
  window.formatAddress = formatAddress;
  window.formatNumber = formatNumber;
  
  // Inicializa
  addAnimationStyles();
}