// ==================================================
// CONFIGURAÇÃO DA TIMELINE
// ==================================================
const TIMELINE_DATA = {
  currentScene: 1,
  totalScenes: 9,

  phases: [
    {
      id: "scene1",
      title: "Cena 1",
      subtitle: "Fase do Silêncio — Invocação Inicial",
      type: "scene",
      status: "active",
      seeds: 2000,
      date: "2024-12-31",
      description: "Ativação inicial das primeiras 2.000 sementes ritualísticas.",
      icon: "scene",
      color: "#00ffff",
      unlocked: true
    },
    {
      id: "scene2",
      title: "Cena 2",
      subtitle: "Fase da Ignição — Despertar do Protocolo",
      type: "scene",
      status: "upcoming",
      seeds: 4000,
      date: "2025-01-01",
      description: "Expansão do ritual com 4.000 novas sementes ativadas.",
      icon: "scene",
      color: "#0080ff",
      unlocked: false
    },
    {
      id: "scene3",
      title: "Cena 3",
      subtitle: "Fase da Inscrição — Alinhamento dos Fragmentos",
      type: "scene",
      status: "upcoming",
      seeds: 6000,
      date: "2025-01-02",
      description: "Alinhamento coletivo de 6.000 sementes para ressonância.",
      icon: "scene",
      color: "#0080ff",
      unlocked: false
    },
    {
      id: "scene4",
      title: "Cena 4",
      subtitle: "Fase da Ressonância — Amplificação do Chamado",
      type: "scene",
      status: "upcoming",
      seeds: 8000,
      date: "2025-01-03",
      description: "Amplificação ritualística com 8.000 sementes em sincronia.",
      icon: "scene",
      color: "#0080ff",
      unlocked: false
    },
    {
      id: "scene5",
      title: "Cena 5",
      subtitle: "Fase da Convergência — Unificação Ativa",
      type: "scene",
      status: "upcoming",
      seeds: 10000,
      date: "2025-01-04",
      description: "Unificação final de 10.000 sementes para culminância.",
      icon: "scene",
      color: "#0080ff",
      unlocked: false
    },
    {
      id: "scene6",
      title: "Cena 6",
      subtitle: "Fase da Manifestação — Blueprint Ativo",
      type: "milestone",
      status: "upcoming",
      seeds: 30000,
      date: "2025-01-05",
      description: "Manifestação do ritual completo. NFT principal para tesouro do protocolo.",
      icon: "milestone",
      color: "#ff4444",
      unlocked: false
    },
    {
      id: "poc",
      title: "Teste POC",
      subtitle: "Prova de Conceito Pública",
      type: "test",
      status: "upcoming",
      date: "2025-01-06",
      description: "Demonstração pública do protocolo em funcionamento para o mercado.",
      icon: "test",
      color: "#8ab4f8",
      unlocked: false
    },
    {
      id: "fredo",
      title: "Coleção Fredo",
      subtitle: "Migração para BBP",
      type: "launch",
      status: "upcoming",
      date: "2025-06-01",
      description: "Última coleção no método tradicional. Primeira migração completa para BBP.",
      icon: "launch",
      color: "#44ff44",
      unlocked: false
    },
    {
      id: "circus",
      title: "Coleção Circus",
      subtitle: "DNA do Protocolo",
      type: "launch",
      status: "upcoming",
      date: "2025-12-01",
      description: "Primeira coleção nativa BBP. Rede completa e estabelecida.",
      icon: "launch",
      color: "#aa44ff",
      unlocked: false
    }
  ]
};

// ==================================================
// INICIALIZAÇÃO DA TIMELINE
// ==================================================
function initTimeline() {
  console.log('🕐 Inicializando timeline...');

  const timelineDots = document.getElementById('timelineDots');
  const timelineProgress = document.querySelector('.timeline-progress');

  if (!timelineDots) {
    console.error('Elemento timelineDots não encontrado');
    return;
  }

  const progressPercentage = ((TIMELINE_DATA.currentScene - 1) / (TIMELINE_DATA.totalScenes - 1)) * 100;
  if (timelineProgress) {
    timelineProgress.style.width = `${progressPercentage}%`;
  }

  timelineDots.innerHTML = '';

  TIMELINE_DATA.phases.forEach((phase, index) => {
    const dot = document.createElement('div');
    dot.className = `timeline-dot ${phase.type} ${phase.status}`;
    if (phase.status === 'active') {
      dot.classList.add('active');
    }
    dot.dataset.phaseId = phase.id;
    dot.dataset.index = index;

    dot.addEventListener('mouseenter', (e) => {
      showTooltip(e.target, phase);
    });

    dot.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    if (phase.unlocked || phase.status === 'active') {
      dot.style.cursor = 'pointer';
      dot.addEventListener('click', () => {
        handlePhaseClick(phase);
      });
    } else {
      dot.style.cursor = 'not-allowed';
    }

    timelineDots.appendChild(dot);
  });

  console.log('✅ Timeline inicializada');
}

// ==================================================
// TOOLTIP - VERSÃO ESTÁVEL E SIMPLES
// ==================================================
let tooltipTimeout = null;

function showTooltip(element, phase) {
  const tooltip = document.getElementById('timelineTooltip');
  if (!tooltip) return;

  if (tooltipTimeout) clearTimeout(tooltipTimeout);

  let statusText = '';
  let statusClass = '';

  switch (phase.status) {
    case 'active':
      statusText = 'EM ANDAMENTO';
      statusClass = 'active';
      break;
    case 'completed':
      statusText = 'CONCLUÍDO';
      statusClass = 'completed';
      break;
    case 'upcoming':
      statusText = 'EM BREVE';
      statusClass = 'upcoming';
      break;
  }

  tooltip.innerHTML = `
    <div class="tooltip-title">${phase.title} • ${phase.subtitle}</div>
    <div class="tooltip-description">${phase.description}</div>
    ${phase.seeds ? `<div class="tooltip-description">🎯 ${phase.seeds.toLocaleString()} seeds</div>` : ''}
    <div class="tooltip-description">🗓️ ${phase.date}</div>
    <div class="tooltip-status ${statusClass}">${statusText}</div>
  `;

  tooltip.style.display = 'block';
  updateTooltipPosition(element);
  tooltip.classList.add('show');
}

function updateTooltipPosition(element) {
  const tooltip = document.getElementById('timelineTooltip');
  if (!tooltip) return;

  // Posição da bolinha na tela
  const dotRect = element.getBoundingClientRect();

  // Centro horizontal da bolinha
  const dotCenterX = dotRect.left + dotRect.width / 2;

  // Largura do tooltip
  const tooltipWidth = tooltip.offsetWidth || 180;

  // Posição left centralizada
  let left = dotCenterX - (tooltipWidth / 2);

  // Limita para não sair da tela
  left = Math.max(10, Math.min(window.innerWidth - tooltipWidth - 10, left));

  // Posição top: abaixo da bolinha + espaço para seta
  const top = dotRect.bottom + 12;  // Ajuste o 12 se quiser mais ou menos espaço abaixo

  tooltip.style.position = 'fixed';
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideTooltip() {
  const tooltip = document.getElementById('timelineTooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
    setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.style.position = 'absolute'; // Volta ao normal
    }, 300);
  }

  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
}

// Permite hover no tooltip
document.addEventListener('DOMContentLoaded', () => {
  const tooltip = document.getElementById('timelineTooltip');
  if (tooltip) {
    tooltip.addEventListener('mouseenter', () => {
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
    });

    tooltip.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  }
});

// ==================================================
// CLIQUE NAS FASES DA TIMELINE
// ==================================================
function handlePhaseClick(phase) {
  console.log(`🎬 Clicou na fase: ${phase.title} - ${phase.subtitle}`);

  if (phase.status === 'active') return;

  if (phase.type === 'scene' && phase.status === 'completed') {
    showArchivedScene(phase);
    return;
  }

  if (phase.status === 'upcoming') {
    showUpcomingPhaseInfo(phase);
    return;
  }
}

// ==================================================
// CENA ARQUIVADA
// ==================================================
function showArchivedScene(phase) {
  console.log(`📜 Mostrando cena arquivada: ${phase.subtitle}`);

  if (typeof isMoving !== 'undefined') {
    isMoving = false;
  }

  const titleElement = document.getElementById('archivedSceneTitle');
  const seedsElement = document.getElementById('archivedSeedsCount');

  if (titleElement) {
    titleElement.textContent = `${phase.title}: ${phase.subtitle}`;
  }

  if (seedsElement) {
    seedsElement.textContent = `${phase.seeds.toLocaleString()}/${phase.seeds.toLocaleString()}`;
  }

  const overlay = document.getElementById('archivedSceneOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

// ==================================================
// INFORMAÇÃO DE FASE FUTURA
// ==================================================
function showUpcomingPhaseInfo(phase) {
  console.log(`⏳ Fase futura: ${phase.subtitle}`);

  const toast = document.createElement('div');
  toast.className = 'timeline-toast';
  toast.innerHTML = `
    <div class="toast-content">
      <strong>${phase.title}</strong><br>
      ${phase.subtitle}<br>
      <small>Disponível em: ${phase.date}</small>
    </div>
  `;

  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    border: 1px solid ${phase.color};
    border-radius: 6px;
    padding: 12px 16px;
    color: white;
    font-size: 12px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    max-width: 250px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    backdrop-filter: blur(5px);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3000);

  if (!document.querySelector('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ==================================================
// ATUALIZAÇÃO AUTOMÁTICA DA TIMELINE
// ==================================================
function updateTimelineProgress() {
  const timelineProgress = document.querySelector('.timeline-progress');
  if (!timelineProgress) return;

  const progressPercentage = ((TIMELINE_DATA.currentScene - 1) / (TIMELINE_DATA.totalScenes - 1)) * 100;
  timelineProgress.style.width = `${progressPercentage}%`;
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initTimeline, 500);
  setInterval(updateTimelineProgress, 10000);
});

// ==================================================
// EXPORTA FUNÇÕES
// ==================================================
window.Timeline = {
  init: initTimeline,
  update: updateTimelineProgress,
  data: TIMELINE_DATA
};