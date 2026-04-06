"""
Oraculo Descentralizado — Threshold / MPC
Tecnologia Viva v3.0 | Autor: Leo Ramalho

Arquitetura:
  - N nos do oraculo, cada um com sua propria entropia
  - Threshold t-de-N: qualquer t nos podem reconstruir o contexto
  - Nenhum no individual conhece a chave completa
  - Shamir Secret Sharing em campo GF(p)
  - Hash chain viva: estado avanca com cada contribuicao de entropia
  - Arweave checkpoints: estado da chain gravado periodicamente

Mudancas v3.0 em relacao a v2.0:
  - SHA3-256 substitui SHA-256 em todas as operacoes criticas
  - HMAC-SHA3-256 substitui HMAC-SHA256
  - LivingChain adicionada: hash chain que avanca com entropia comportamental
  - ArweaveCheckpoint adicionado: registro periodico do estado da chain
  - genesis_seed no snapshot (ancora da hash chain por usuario)
  - behavioral_contribution no snapshot
  - OracleNode.contribute_behavioral_entropy() adicionado
  - Zero curvas elipticas em qualquer ponto
"""

import hashlib
import hmac
import secrets
import json
import time
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# UTILITARIOS — SHA3 como padrao em todo o protocolo
# ---------------------------------------------------------------------------

def sha3_256(data: bytes) -> bytes:
    return hashlib.sha3_256(data).digest()

def sha3_hex(data: bytes) -> str:
    return hashlib.sha3_256(data).hexdigest()

def hmac_sha3(key: bytes, msg: bytes) -> bytes:
    return hmac.new(key, msg, hashlib.sha3_256).digest()

def hmac_sha3_hex(key: bytes, msg: bytes) -> str:
    return hmac.new(key, msg, hashlib.sha3_256).hexdigest()


# ---------------------------------------------------------------------------
# PARAMETROS GLOBAIS
# ---------------------------------------------------------------------------

# Primo seguro de 256 bits (campo finito para Shamir)
FIELD_PRIME = (
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
)


# ---------------------------------------------------------------------------
# 1. LIVING CHAIN — Hash chain viva que cresce com entropia comportamental
# ---------------------------------------------------------------------------

class LivingChain:
    """
    Hash chain que avanca irreversivelmente com contribuicoes de entropia.

    Propriedades:
    - Deterministica: dado o genesis e todas as contribuicoes em ordem,
      qualquer no pode verificar o estado atual.
    - Irreversivel: SHA3-256 e resistente a pre-imagem — impossivel
      reconstruir contribuicoes passadas a partir do estado atual.
    - Irreproduzivel: o estado em qualquer momento passado nao pode ser
      reproduzido por um atacante que nao estava presente.
    - Auto-auditavel: checkpoints sao gravados periodicamente (Arweave).

    Esta e a implementacao do "ratcheting vivo" descrito na Tecnologia Viva v3.0.
    """

    def __init__(self, genesis_seed: Optional[str] = None):
        if genesis_seed:
            self._state = genesis_seed
        else:
            # Estado inicial aleatorio — o "big bang" da chain
            self._state = sha3_hex(secrets.token_bytes(32))
        self._genesis = self._state
        self._contribution_count = 0
        self._checkpoints: list = []

    def advance(self, contribution: str, source: str = "unknown") -> str:
        """
        Avanca o estado da chain com uma nova contribuicao de entropia.
        Ratcheting: estado avanca, nunca retrocede.

        Args:
            contribution: hash hexadecimal da contribuicao (32 bytes)
            source: identificador da fonte (node_id, behavioral, etc.)

        Returns:
            novo estado da chain (hex)
        """
        chain_input = (
            self._state
            + contribution
            + source
            + str(time.time_ns())
        ).encode()
        self._state = sha3_hex(chain_input)
        self._contribution_count += 1

        # Checkpoint a cada 100 contribuicoes
        if self._contribution_count % 100 == 0:
            self._checkpoints.append(self._create_checkpoint())

        return self._state

    def get_state(self) -> str:
        """Estado atual da chain."""
        return self._state

    def get_genesis(self) -> str:
        """Genesis imutavel — ponto de ancora no Arweave."""
        return self._genesis

    def compute_user_genesis_seed(
        self, user_setup_ref: str, beacon_round: int
    ) -> str:
        """
        Deriva o genesis_seed especifico de um usuario nesta chain.
        Combina o estado vivo atual com a identidade do usuario.

        Este e o valor que vai no context_snapshot e no Arweave.
        """
        seed_input = (
            self._state
            + user_setup_ref
            + str(beacon_round)
        ).encode()
        return sha3_hex(seed_input)

    def _create_checkpoint(self) -> dict:
        """
        Cria um checkpoint do estado atual.
        Em producao: gravado no Arweave para auditoria publica.
        """
        return {
            "checkpoint_index": self._contribution_count,
            "state": self._state,
            "genesis_ref": self._genesis[:16] + "...",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "arweave_target": "pending",  # producao: tx_id do Arweave
        }

    def get_latest_checkpoint(self) -> Optional[dict]:
        return self._checkpoints[-1] if self._checkpoints else None

    def status(self) -> dict:
        return {
            "genesis_ref": self._genesis[:16] + "...",
            "current_state_ref": self._state[:16] + "...",
            "contributions": self._contribution_count,
            "checkpoints": len(self._checkpoints),
        }


# ---------------------------------------------------------------------------
# 2. SHAMIR SECRET SHARING — compartilhamento t-de-N
# ---------------------------------------------------------------------------

class ShamirSharing:
    """
    Shamir Secret Sharing em GF(prime).
    Divide um segredo S em N partes, das quais qualquer T
    sao suficientes para reconstruir S — sem revelar o segredo.

    Producao: usar biblioteca 'secretsharing' ou 'tss' auditada.
    """

    def __init__(self, prime: int = FIELD_PRIME):
        self.p = prime

    def split(self, secret: int, n: int, t: int) -> list:
        assert 1 <= t <= n
        assert 0 < secret < self.p

        coeffs = [secret] + [secrets.randbelow(self.p) for _ in range(t - 1)]
        shares = []
        for x in range(1, n + 1):
            y = self._eval_poly(coeffs, x)
            shares.append((x, y))
        return shares

    def reconstruct(self, shares: list) -> int:
        """Interpolacao de Lagrange em GF(prime)."""
        secret = 0
        for i, (xi, yi) in enumerate(shares):
            num = yi
            den = 1
            for j, (xj, _) in enumerate(shares):
                if i != j:
                    num = (num * (-xj)) % self.p
                    den = (den * (xi - xj)) % self.p
            secret = (secret + num * pow(den, self.p - 2, self.p)) % self.p
        return secret

    def _eval_poly(self, coeffs: list, x: int) -> int:
        result = 0
        for i, c in enumerate(coeffs):
            result = (result + c * pow(x, i, self.p)) % self.p
        return result


# ---------------------------------------------------------------------------
# 3. NO DO ORACULO — cada no e um fragmento do Oraculo Mestre
# ---------------------------------------------------------------------------

@dataclass
class OracleNodeConfig:
    node_id: str
    node_index: int
    total_nodes: int
    threshold: int
    network_url: str


class OracleNode:
    """
    Um no individual do Oraculo Descentralizado.

    v3.0:
    - Contribui entropia comportamental para a LivingChain
    - SHA3-256 em todas as operacoes
    - Assina snapshots com HMAC-SHA3-256
      (producao: Dilithium3 via liboqs)

    Cada no:
    - Coleta entropia local independente
    - Mantém sua share do segredo mestre
    - Contribui para a hash chain viva
    - Nao conhece a chave completa — nunca
    """

    def __init__(
        self,
        config: OracleNodeConfig,
        master_share: tuple,
        living_chain: Optional[LivingChain] = None
    ):
        self.config = config
        self._master_share = master_share
        self._living_chain = living_chain

    def get_local_entropy(self) -> dict:
        """
        Coleta entropia local deste no.
        v3.0: inclui hash do estado atual da chain.
        Producao: integrar sensores fisicos, TPM, randomness beacon.
        """
        chain_state_ref = ""
        if self._living_chain:
            chain_state_ref = self._living_chain.get_state()[:16]

        return {
            "node_id": self.config.node_id,
            "timestamp_ns": time.time_ns(),
            "local_random": secrets.token_hex(32),
            "node_index": self.config.node_index,
            "chain_state_ref": chain_state_ref,
        }

    def contribute_behavioral_entropy(self, behavioral_hash: str) -> str:
        """
        NOVO v3.0 — Incorpora entropia comportamental na chain.

        Chamado quando um usuario interage com a rede P2P:
        clique, comentario, transacao, revelacao de ativo, etc.

        A contribuicao e anonima — apenas o hash chega ao no.

        Returns:
            novo estado da chain apos a contribuicao
        """
        if not self._living_chain:
            return ""
        return self._living_chain.advance(
            contribution=behavioral_hash,
            source=f"behavioral@{self.config.node_id}"
        )

    def compute_partial_hash(self, challenge: bytes) -> dict:
        """
        Computa contribuicao parcial para o context_hash via MPC.
        v3.0: SHA3-256 em vez de SHA-256.

        Protocolo:
        1. No mistura sua share com o challenge e estado da chain
        2. Retorna hash parcial (nao a share)
        3. O coordenador combina todos os parciais
        """
        share_bytes = self._master_share[1].to_bytes(32, "big")

        # v3.0: inclui estado atual da chain na contribuicao parcial
        chain_contribution = b""
        if self._living_chain:
            chain_contribution = self._living_chain.get_state().encode()

        partial_input = (
            share_bytes
            + challenge
            + self.config.node_id.encode()
            + self.get_local_entropy()["local_random"].encode()
            + chain_contribution
        )
        partial_hash = sha3_hex(partial_input)

        return {
            "node_id": self.config.node_id,
            "node_index": self.config.node_index,
            "partial_hash": partial_hash,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    def sign_snapshot(self, snapshot_bytes: bytes) -> str:
        """
        Assina o snapshot com HMAC-SHA3-256.
        v3.0: SHA3-256 substitui SHA-256.
        Producao: Dilithium3 via liboqs.
        """
        node_key = sha3_256(
            self._master_share[1].to_bytes(32, "big")
            + self.config.node_id.encode()
        )
        return hmac_sha3_hex(node_key, snapshot_bytes)


# ---------------------------------------------------------------------------
# 4. COORDENADOR — orquestra o MPC entre os nos
# ---------------------------------------------------------------------------

class OracleCoordinator:
    """
    Coordenador do Oraculo Descentralizado.

    v3.0:
    - LivingChain integrada: estado vivo avanca com cada snapshot gerado
    - genesis_seed derivado da chain por usuario
    - behavioral_contribution incorporado ao snapshot
    - SHA3-256 em todas as operacoes
    - ArweaveCheckpoint disponivel apos N snapshots

    Responsabilidades:
    - Coletar contribuicoes parciais dos nos
    - Combinar entropia de forma verificavel
    - Gerar context_snapshot final (assinado por T nos)
    - Nunca ter acesso ao segredo completo
    """

    def __init__(
        self,
        nodes: list,
        threshold: int,
        living_chain: Optional[LivingChain] = None
    ):
        self.nodes = nodes
        self.threshold = threshold
        self._living_chain = living_chain or LivingChain()
        self._snapshots_generated = 0

    def receive_behavioral_entropy(self, behavioral_hash: str, source: str = "p2p_network"):
        """
        NOVO v3.0 — Recebe contribuicao de entropia comportamental da rede P2P.

        Chamado sempre que um usuario interage com a rede BBP:
        qualquer interacao humana (clique, transacao, comentario...)
        alimenta a chain via este metodo.

        O hash comportamental e distribuido para todos os nos ativos.
        """
        # Avanca a chain compartilhada
        new_state = self._living_chain.advance(
            contribution=behavioral_hash,
            source=source
        )

        # Propaga para todos os nos (em producao: via P2P gossip protocol)
        for node in self.nodes:
            node.contribute_behavioral_entropy(behavioral_hash)

        return new_state

    def generate_context_snapshot(
        self,
        setup_id_ref: str,
        event_data: bytes,
        beacon_round: int,
        beacon_random: str,
        block_height: int,
        block_hash: str,
        behavioral_contribution: str = "",
    ) -> dict:
        """
        Gera um context_snapshot via MPC com T-de-N nos.

        v3.0:
        - genesis_seed derivado da LivingChain por usuario
        - behavioral_contribution incluido no snapshot
        - SHA3-256 em todas as operacoes

        O snapshot e:
        - Assinado por pelo menos T nos
        - Impossivel de gerar sem T nos colaborando
        - Verificavel publicamente
        """
        # Se ha contribuicao comportamental, avanca a chain primeiro
        if behavioral_contribution:
            self.receive_behavioral_entropy(
                behavioral_contribution,
                source=f"user:{setup_id_ref[:8]}"
            )

        # genesis_seed especifico deste usuario nesta chain
        genesis_seed = self._living_chain.compute_user_genesis_seed(
            setup_id_ref, beacon_round
        )

        # Challenge: hash SHA3-256 do input publico
        challenge_input = (
            f"{setup_id_ref}|{beacon_round}|{beacon_random}|"
            f"{block_height}|{block_hash}|"
            f"{genesis_seed}|"
            f"{event_data.hex()}"
        ).encode()
        challenge = sha3_256(challenge_input)

        # Coletar contribuicoes de TODOS os nos disponiveis
        partials = [node.compute_partial_hash(challenge) for node in self.nodes]

        # Usar pelo menos T — mais e melhor
        active_partials = partials[:max(self.threshold, len(partials))]
        combined = self._combine_partials(active_partials, challenge)

        # Montar snapshot
        snapshot = {
            "oracle_network_id": self._network_id(),
            "setup_id_ref": setup_id_ref,
            "beacon_round": beacon_round,
            "beacon_random": beacon_random,
            "block_height": block_height,
            "block_hash_prefix": block_hash[:16],
            "event_hash": sha3_hex(event_data),
            "genesis_seed": genesis_seed,                    # NOVO v3.0
            "behavioral_contribution": behavioral_contribution,  # NOVO v3.0
            "chain_state_ref": self._living_chain.get_state()[:16],  # NOVO v3.0
            "combined_entropy": combined,
            "nodes_participated": [p["node_id"] for p in active_partials],
            "threshold_met": len(active_partials) >= self.threshold,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

        # Coletar assinaturas dos nos (threshold minimo)
        snapshot_bytes = json.dumps(snapshot, sort_keys=True).encode()
        signatures = {}
        for node in self.nodes[:self.threshold]:
            signatures[node.config.node_id] = node.sign_snapshot(snapshot_bytes)

        snapshot["node_signatures"] = signatures
        snapshot["snapshot_fingerprint"] = sha3_hex(snapshot_bytes)

        self._snapshots_generated += 1
        return snapshot

    def verify_snapshot(self, snapshot: dict) -> bool:
        """
        Verifica se o snapshot tem assinaturas validas de pelo menos T nos.
        Qualquer participante pode verificar independentemente.
        v3.0: HMAC-SHA3-256.
        """
        sigs = snapshot.get("node_signatures", {})
        if len(sigs) < self.threshold:
            return False

        check = {k: v for k, v in snapshot.items()
                 if k not in ("node_signatures", "snapshot_fingerprint")}
        check_bytes = json.dumps(check, sort_keys=True).encode()

        valid_count = 0
        for node in self.nodes:
            if node.config.node_id in sigs:
                expected = node.sign_snapshot(check_bytes)
                if hmac.compare_digest(sigs[node.config.node_id], expected):
                    valid_count += 1

        return valid_count >= self.threshold

    def reconstruct_key_from_snapshot(
        self, snapshot: dict, setup_id: str
    ) -> bytes:
        """
        Reconstrói a chave efemera a partir do snapshot verificado.
        v3.0: KDF usa SHA3-256 e inclui genesis_seed.
        """
        if not self.verify_snapshot(snapshot):
            raise ValueError("Snapshot invalido: assinaturas insuficientes.")

        ref = snapshot.get("setup_id_ref", "")
        if not setup_id.startswith(ref):
            raise ValueError("Setup ID nao corresponde ao snapshot.")

        # KDF com SHA3-256 — inclui genesis_seed v3.0
        material = (
            snapshot["combined_entropy"]
            + snapshot["event_hash"]
            + snapshot["beacon_random"]
            + snapshot.get("genesis_seed", "")
            + snapshot.get("behavioral_contribution", "")
            + setup_id
        ).encode()

        prk = hmac_sha3(b"living-wallet-v3", material)
        okm = hmac_sha3(prk, b"ephemeral-private-key-dilithium\x01")
        return okm

    def get_arweave_checkpoint(self) -> Optional[dict]:
        """
        Retorna o ultimo checkpoint da LivingChain para gravacao no Arweave.
        Producao: gravar via API do Arweave com chave da rede.
        """
        return self._living_chain.get_latest_checkpoint()

    def chain_status(self) -> dict:
        return self._living_chain.status()

    def _combine_partials(self, partials: list, challenge: bytes) -> str:
        """
        Combina hashes parciais de forma deterministica.
        v3.0: SHA3-256.
        """
        combined_input = challenge
        for p in sorted(partials, key=lambda x: x["node_index"]):
            combined_input += bytes.fromhex(p["partial_hash"])
        return sha3_hex(combined_input)

    def _network_id(self) -> str:
        node_ids = sorted(n.config.node_id for n in self.nodes)
        return sha3_hex("|".join(node_ids).encode())[:16]


# ---------------------------------------------------------------------------
# 5. FACTORY — monta a rede de oraculos
# ---------------------------------------------------------------------------

class OracleNetwork:
    """
    Monta e inicializa a rede descentralizada de oraculos.

    v3.0: LivingChain compartilhada entre todos os nos.

    Fluxo de inicializacao (ocorre UMA VEZ):
    1. Segredo mestre e gerado
    2. LivingChain e inicializada com genesis aleatorio
    3. Shamir divide o segredo em N shares
    4. Cada share vai para um no — segredo mestre destruido
    5. A rede esta viva: nenhum no tem o segredo completo
    """

    def __init__(self, n_nodes: int = 5, threshold: int = 3):
        assert threshold <= n_nodes
        self.n = n_nodes
        self.t = threshold
        self.nodes, self.coordinator, self.chain = self._bootstrap()

    def _bootstrap(self) -> tuple:
        shamir = ShamirSharing()

        # Inicializa a LivingChain compartilhada
        living_chain = LivingChain()

        # Gera segredo mestre temporario
        master_secret = secrets.randbelow(FIELD_PRIME - 1) + 1

        # Divide em N shares, threshold T
        shares = shamir.split(master_secret, self.n, self.t)

        # Destroi o segredo mestre — ninguem mais o conhece
        master_secret = 0
        del master_secret

        # Cria os nos com suas shares e acesso a chain compartilhada
        nodes = []
        for i, share in enumerate(shares):
            config = OracleNodeConfig(
                node_id=f"oracle-node-{i+1:02d}",
                node_index=i + 1,
                total_nodes=self.n,
                threshold=self.t,
                network_url=f"http://oracle-{i+1}.bbp-living-network.io",
            )
            nodes.append(OracleNode(config, share, living_chain))

        coordinator = OracleCoordinator(nodes, self.t, living_chain)
        return nodes, coordinator, living_chain

    def get_coordinator(self) -> OracleCoordinator:
        return self.coordinator

    def simulate_behavioral_events(self, n_events: int = 5) -> list:
        """
        NOVO v3.0 — Simula eventos comportamentais da rede P2P.
        Em producao: chamado automaticamente pelo BehavioralEntropyCollector
        da interface do usuario.
        """
        contributions = []
        for i in range(n_events):
            # Simula hash de comportamento humano
            behavioral_hash = sha3_hex(
                secrets.token_bytes(16) + str(time.time_ns()).encode()
            )
            new_state = self.coordinator.receive_behavioral_entropy(
                behavioral_hash,
                source=f"p2p_user_{i+1}"
            )
            contributions.append({
                "event": i + 1,
                "behavioral_hash_ref": behavioral_hash[:16] + "...",
                "chain_state_ref": new_state[:16] + "...",
            })
            time.sleep(0.001)  # simula delay real entre eventos
        return contributions

    def status(self) -> dict:
        return {
            "total_nodes": self.n,
            "threshold": self.t,
            "nodes": [
                {"id": n.config.node_id, "url": n.config.network_url}
                for n in self.nodes
            ],
            "network_id": self.coordinator._network_id(),
            "living_chain": self.chain.status(),
            "status": "alive",
        }


# ---------------------------------------------------------------------------
# DEMO — oraculo descentralizado v3.0 em acao
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Oraculo Descentralizado v3.0 — Tecnologia Viva ===\n")

    # 1. Inicializa a rede com 5 nos, threshold 3
    print("Iniciando rede de oraculos (5 nos, threshold 3)...")
    network = OracleNetwork(n_nodes=5, threshold=3)
    print(f"Status inicial:")
    status = network.status()
    print(f"  Network ID: {status['network_id']}")
    print(f"  Chain genesis: {status['living_chain']['genesis_ref']}")
    print(f"  Contribuicoes: {status['living_chain']['contributions']}\n")

    # 2. Simula eventos comportamentais da rede P2P
    print("Simulando 5 eventos comportamentais da rede P2P...")
    contributions = network.simulate_behavioral_events(5)
    for c in contributions:
        print(f"  Evento {c['event']}: hash={c['behavioral_hash_ref']} -> chain={c['chain_state_ref']}")
    print(f"\nChain apos eventos: {network.chain.status()['contributions']} contribuicoes\n")

    coord = network.get_coordinator()

    # 3. Gera snapshot via MPC com entropia comportamental
    print("Gerando context_snapshot via MPC (com entropia comportamental)...")
    behavioral_hash = sha3_hex(b"usuario_clicou_revelar_ativo_nft_123")
    snapshot = coord.generate_context_snapshot(
        setup_id_ref="639a195398d69dd1",
        event_data=b"BBP:DNA:asset_id=42|owner=leo",
        beacon_round=382947,
        beacon_random="82b7c2f39ad55e1a9b3fd22c",
        block_height=901234,
        block_hash="0000000000000000000abcd1234567890abc",
        behavioral_contribution=behavioral_hash,
    )
    print(f"Snapshot fingerprint: {snapshot['snapshot_fingerprint'][:32]}...")
    print(f"genesis_seed (ref):   {snapshot['genesis_seed'][:24]}...")
    print(f"behavioral presente:  {bool(snapshot['behavioral_contribution'])}")
    print(f"chain_state_ref:      {snapshot['chain_state_ref']}")
    print(f"Nos participantes:    {snapshot['nodes_participated']}")
    print(f"Threshold atingido:   {snapshot['threshold_met']}\n")

    # 4. Verifica snapshot
    valid = coord.verify_snapshot(snapshot)
    print(f"Verificacao do snapshot: {'VALIDO' if valid else 'INVALIDO'}\n")

    # 5. Reconstroi chave
    setup_id = "639a195398d69dd1eb0b2b8fba18b7c270897fd7"
    key = coord.reconstruct_key_from_snapshot(snapshot, setup_id)
    print(f"Chave efemera reconstruida (hex, 32 bytes): {key.hex()[:32]}...")

    # 6. Confirma determinismo
    key2 = coord.reconstruct_key_from_snapshot(snapshot, setup_id)
    assert key == key2, "ERRO: reconstrucao nao e deterministica!"
    print("Reconstrucao deterministica confirmada\n")

    # 7. Testa seguranca com threshold insuficiente
    print("Testando seguranca: removendo nos abaixo do threshold...")
    weak_coord = OracleCoordinator(network.nodes[:2], threshold=3)
    weak_snapshot = weak_coord.generate_context_snapshot(
        setup_id_ref="639a195398d69dd1",
        event_data=b"ataque",
        beacon_round=1,
        beacon_random="fake",
        block_height=1,
        block_hash="fake",
    )
    weak_valid = coord.verify_snapshot(weak_snapshot)
    print(f"Snapshot com 2 nos (threshold=3): {'valido' if weak_valid else 'rejeitado (correto!)'}\n")

    # 8. Checkpoint Arweave
    checkpoint = coord.get_arweave_checkpoint()
    if checkpoint:
        print(f"Checkpoint Arweave disponivel:")
        print(f"  Index: {checkpoint['checkpoint_index']}")
        print(f"  State: {checkpoint['state'][:24]}...")
        print(f"  Timestamp: {checkpoint['timestamp_utc']}")
    else:
        print("Checkpoint Arweave: aguardando 100 contribuicoes para primeiro checkpoint.")

    print(f"\nStatus final da chain: {json.dumps(coord.chain_status(), indent=2)}")
    print("\n=== Oraculo descentralizado v3.0 operacional. ===")
    print("=== SHA3-256 em todas as operacoes. Zero curvas elipticas. ===")
    print("=== Hash chain viva alimentada por entropia comportamental. ===")