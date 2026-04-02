// resolver.js - BBP Resolver (USA AS LAYERS DA PASTA ./layers/)

class BBPResolver {
  constructor(config = {}) {
    this.registry = new Map();
    this.basePath = config.basePath || '.';
  }

  async resolve(address) {
    console.log('BBP Resolver: resolving', address);
    const bbpId = this.addressToId(address);
    return this.resolveById(bbpId);
  }

  addressToId(address) {
    const match = address.match(/bbp:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid BBP address');
    
    const [_, type, namespace, identifier] = match;
    return `BBP:id:${type}:${namespace}:${identifier}`;
  }

  async resolveById(bbpId) {
    try {
      const parsed = this.parseBBPId(bbpId);
      
      // Tenta buscar manifesto BBP-0002 individual
      const manifest = await this.fetchManifest(parsed);
      
      if (!manifest) {
        throw new Error('Manifest not found');
      }
      
      return {
        id: bbpId,
        parsed: parsed,
        manifest: manifest,
        resolved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Resolution failed:', error);
      throw error;
    }
  }

  parseBBPId(bbpId) {
    const parts = bbpId.split(':');
    return {
      protocol: parts[0],
      dnaType: parts[1],
      type: parts[2],
      namespace: parts[3],
      collection: parts[3],
      identifier: parts[4],
      full: bbpId
    };
  }

  async fetchManifest(parsed) {
    // Caminho: ./output/manifests/mannequin/1.json
    const path = `${this.basePath}/output/manifests/${parsed.collection}/${parsed.identifier}.json`;
    console.log('Loading manifest:', path);
    
    try {
      const response = await fetch(`${path}?t=${Date.now()}`);
      if (response.ok) {
        const manifest = await response.json();
        return this.prepareManifest(manifest, parsed);
      }
    } catch (e) {
      console.log('Manifest not found');
    }
    return null;
  }

  prepareManifest(manifest, parsed) {
    // Verifica se o manifesto tem o formato esperado
    if (!manifest.render || !manifest.render.layers) {
      console.warn('Manifest missing render layers');
      return manifest;
    }

    // Converte o objeto de layers para array e ajusta os caminhos
    const layersArray = [];
    
    for (const [layerName, layerData] of Object.entries(manifest.render.layers)) {
      let layerPath = layerData.path;
      
      // Se o path não começar com './', adiciona
      if (!layerPath.startsWith('./')) {
        layerPath = './' + layerPath;
      }
      
      layersArray.push({
        name: layerName,
        path: layerPath,
        z_index: layerData.z_index || 0,
        dna: layerData.dna || ''
      });
    }
    
    // Ordena por z_index
    layersArray.sort((a, b) => a.z_index - b.z_index);
    
    // Substitui o objeto layers pelo array ordenado
    manifest.render.layers = layersArray;
    
    return manifest;
  }
}

// Exporta para uso no viewer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BBPResolver;
}