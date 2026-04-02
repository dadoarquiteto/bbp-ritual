// PEER NODE 01 - Simula um nó da rede P2P
// Este arquivo será copiado para serviços gratuitos depois

const FRAGMENTS = {};

// Gera 50 fragmentos de exemplo
for (let i = 1; i <= 50; i++) {
  const num = i.toString().padStart(4, '0');
  // Aqui você coloca os dados reais dos fragmentos
  FRAGMENTS[`f${num}`] = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...`; // placeholder
}

async function getFragment(id) {
  return FRAGMENTS[id] || null;
}

// Exporta para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFragment, FRAGMENTS };
}