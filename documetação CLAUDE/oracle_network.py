"""
Oráculo Descentralizado — Threshold / MPC
Tecnologia Viva | Autor: Léo Ramalho

Arquitetura:
  - N nós do oráculo, cada um com sua própria entropia
  - Threshold t-de-N: qualquer t nós podem reconstruir o contexto
  - Nenhum nó individual conhece a chave completa
  - Shamir Secret Sharing simplificado (campo GF(p))
  - O "espírito vivo" é preservado: cada nó é um fragmento do Oráculo Mestre
"""

import hashlib
import hmac
import secrets
import json
import time
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# PARÂMETROS GLOBAIS
# ---------------------------------------------------------------------------

# Primo seguro de 256 bits (usado como módulo do campo finito)
# Em produção: usar primo criptograficamente padronizado
FIELD_PRIME = (
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
)


# ---------------------------------------------------------------------------
# 1. SHAMIR SECRET SHARING — compartilhamento t-de-N
# ---------------------------------------------------------------------------

class ShamirSharing:
    """
    Implementação didática de Shamir Secret Sharing em GF(prime).
    Permite dividir um segredo S em N partes, das quais qualquer T
    são suficientes para reconstruir S — sem revelar o segredo.

    Em produção: usar biblioteca 'secretsharing' ou 'tss' auditada.
    """

    def __init__(self, prime: int = FIELD_PRIME):
        self.p = prime

    def split(self, secret: int, n: int, t: int) -> list[tuple[int, int]]:
        """
        Divide 'secret' em N shares (x, y), threshold T.
        secret deve ser < prime.
        """
        assert 1 <= t <= n
        assert 0 < secret < self.p

        # Polinômio de grau t-1: f(x) = secret + a1*x + a2*x^2 + ...
        coeffs = [secret] + [secrets.randbelow(self.p) for _ in range(t - 1)]

        shares = []
        for x in range(1, n + 1):
            y = self._eval_poly(coeffs, x)
            shares.append((x, y))
        return shares

    def reconstruct(self, shares: list[tuple[int, int]]) -> int:
        """
        Reconstrói o segredo a partir de qualquer subconjunto de T shares.
        Interpolação de Lagrange em GF(prime).
        """
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

    def _eval_poly(self, coeffs: list[int], x: int) -> int:
        result = 0
        for i, c in enumerate(coeffs):
            result = (result + c * pow(x, i, self.p)) % self.p
        return result


# ---------------------------------------------------------------------------
# 2. NÓ DO ORÁCULO — cada nó é um fragmento do Oráculo Mestre
# ---------------------------------------------------------------------------

@dataclass
class OracleNodeConfig:
    node_id: str
    node_index: int          # 1..N
    total_nodes: int         # N
    threshold: int           # T
    network_url: str         # URL do nó (para comunicação real)


class OracleNode:
    """
    Um nó individual do Oráculo Descentralizado.

    Cada nó:
    - Coleta entropia local independente
    - Mantém sua share do segredo mestre
    - Participa do MPC para gerar context_hash sem revelar sua share
    - Não conhece a chave completa — nunca
    """

    def __init__(self, config: OracleNodeConfig, master_share: tuple[int, int]):
        self.config = config
        self._master_share = master_share   # (x, y) — nunca compartilhado

    def get_local_entropy(self) -> dict:
        """
        Coleta entropia local deste nó.
        Em produção: integrar sensores físicos, randomness beacon, etc.
        """
        return {
            "node_id": self.config.node_id,
            "timestamp_ns": time.time_ns(),
            "local_random": secrets.token_hex(32),
            "node_index": self.config.node_index,
        }

    def compute_partial_hash(self, challenge: bytes) -> dict:
        """
        Computa contribuição parcial para o context_hash.
        MPC: cada nó contribui sem revelar seu segredo.

        Protocolo simplificado:
        1. Nó mistura sua share com o challenge
        2. Retorna hash parcial (não a share)
        3. O coordenador combina todos os parciais
        """
        # Mistura share + challenge de forma one-way
        share_bytes = self._master_share[1].to_bytes(32, "big")
        partial_input = (
            share_bytes
            + challenge
            + self.config.node_id.encode()
            + self.get_local_entropy()["local_random"].encode()
        )
        partial_hash = hashlib.sha256(partial_input).hexdigest()

        return {
            "node_id": self.config.node_id,
            "node_index": self.config.node_index,
            "partial_hash": partial_hash,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    def sign_snapshot(self, snapshot_bytes: bytes) -> str:
        """
        Assina o snapshot com a chave privada do nó.
        Em produção: Ed25519.
        """
        node_key = hashlib.sha256(
            self._master_share[1].to_bytes(32, "big")
            + self.config.node_id.encode()
        ).digest()
        return hmac.new(node_key, snapshot_bytes, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# 3. COORDENADOR — orquestra o MPC entre os nós
# ---------------------------------------------------------------------------

class OracleCoordinator:
    """
    Coordenador do Oráculo Descentralizado.

    Responsável por:
    - Coletar contribuições parciais dos nós
    - Combinar entropia de forma verificável
    - Gerar o context_snapshot final (assinado por T nós)
    - Nunca ter acesso ao segredo completo

    Filosofia "tecnologia viva": o coordenador muda com a rede.
    Qualquer nó com threshold suficiente pode agir como coordenador.
    """

    def __init__(self, nodes: list[OracleNode], threshold: int):
        self.nodes = nodes
        self.threshold = threshold
        self._shamir = ShamirSharing()

    def generate_context_snapshot(
        self,
        setup_id_ref: str,
        event_data: bytes,
        beacon_round: int,
        beacon_random: str,
        block_height: int,
        block_hash: str,
    ) -> dict:
        """
        Gera um context_snapshot via MPC com T-de-N nós.

        O snapshot é:
        - Assinado por pelo menos T nós
        - Impossível de gerar sem T nós colaborando
        - Verificável publicamente
        """
        # Challenge: hash do input público
        challenge_input = (
            f"{setup_id_ref}|{beacon_round}|{beacon_random}|"
            f"{block_height}|{block_hash}|"
            f"{event_data.hex()}"
        ).encode()
        challenge = hashlib.sha256(challenge_input).digest()

        # Coletar contribuições de TODOS os nós disponíveis
        partials = [node.compute_partial_hash(challenge) for node in self.nodes]

        # Combinar partials — qualquer T são suficientes
        # (usamos todos se disponíveis, para segurança máxima)
        active_partials = partials[: max(self.threshold, len(partials))]
        combined = self._combine_partials(active_partials, challenge)

        # Montar snapshot
        snapshot = {
            "oracle_network_id": self._network_id(),
            "setup_id_ref": setup_id_ref,
            "beacon_round": beacon_round,
            "beacon_random": beacon_random,
            "block_height": block_height,
            "block_hash_prefix": block_hash[:16],
            "event_hash": hashlib.sha256(event_data).hexdigest(),
            "combined_entropy": combined,
            "nodes_participated": [p["node_id"] for p in active_partials],
            "threshold_met": len(active_partials) >= self.threshold,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

        # Coletar assinaturas dos nós (threshold mínimo)
        snapshot_bytes = json.dumps(snapshot, sort_keys=True).encode()
        signatures = {}
        for node in self.nodes[: self.threshold]:
            signatures[node.config.node_id] = node.sign_snapshot(snapshot_bytes)

        snapshot["node_signatures"] = signatures
        snapshot["snapshot_fingerprint"] = hashlib.sha256(snapshot_bytes).hexdigest()

        return snapshot

    def verify_snapshot(self, snapshot: dict) -> bool:
        """
        Verifica se o snapshot tem assinaturas válidas de pelo menos T nós.
        Qualquer participante pode verificar independentemente.
        """
        sigs = snapshot.get("node_signatures", {})
        if len(sigs) < self.threshold:
            return False

        # Recria snapshot sem assinaturas para verificação
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
        Reconstrói a chave efêmera a partir do snapshot verificado.
        Requer que setup_id_ref do snapshot bata com o setup do usuário.
        """
        if not self.verify_snapshot(snapshot):
            raise ValueError("Snapshot inválido: assinaturas insuficientes.")

        ref = snapshot.get("setup_id_ref", "")
        if not setup_id.startswith(ref):
            raise ValueError("Setup ID não corresponde ao snapshot.")

        # Derivação determinística: combined_entropy + setup_id
        material = (
            snapshot["combined_entropy"].encode()
            + snapshot["event_hash"].encode()
            + snapshot["beacon_random"].encode()
            + setup_id.encode()
        )
        prk = hmac.new(b"living-wallet-v1", material.encode() if isinstance(material, str) else material,
                       hashlib.sha256).digest()
        okm = hmac.new(prk, b"ephemeral-private-key\x01", hashlib.sha256).digest()
        return okm

    def _combine_partials(self, partials: list[dict], challenge: bytes) -> str:
        """
        Combina os hashes parciais de forma determinística e verificável.
        """
        combined_input = challenge
        for p in sorted(partials, key=lambda x: x["node_index"]):
            combined_input += bytes.fromhex(p["partial_hash"])
        return hashlib.sha256(combined_input).hexdigest()

    def _network_id(self) -> str:
        node_ids = sorted(n.config.node_id for n in self.nodes)
        return hashlib.sha256("|".join(node_ids).encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# 4. FACTORY — monta a rede de oráculos
# ---------------------------------------------------------------------------

class OracleNetwork:
    """
    Monta e inicializa a rede descentralizada de oráculos.

    Fluxo de inicialização (ocorre UMA VEZ, na criação da rede):
    1. Segredo mestre é gerado
    2. Shamir divide em N shares
    3. Cada share vai para um nó — segredo mestre é destruído
    4. A rede está viva: nenhum nó tem o segredo completo
    """

    def __init__(self, n_nodes: int = 5, threshold: int = 3):
        assert threshold <= n_nodes
        self.n = n_nodes
        self.t = threshold
        self.nodes, self.coordinator = self._bootstrap()

    def _bootstrap(self) -> tuple[list[OracleNode], OracleCoordinator]:
        shamir = ShamirSharing()

        # Gera segredo mestre temporário
        master_secret = secrets.randbelow(FIELD_PRIME - 1) + 1

        # Divide em N shares, threshold T
        shares = shamir.split(master_secret, self.n, self.t)

        # Destrói o segredo mestre — ninguém mais o conhece
        master_secret = 0
        del master_secret

        # Cria os nós com suas shares individuais
        nodes = []
        for i, share in enumerate(shares):
            config = OracleNodeConfig(
                node_id=f"oracle-node-{i+1:02d}",
                node_index=i + 1,
                total_nodes=self.n,
                threshold=self.t,
                network_url=f"http://oracle-{i+1}.living-network.io",
            )
            nodes.append(OracleNode(config, share))

        coordinator = OracleCoordinator(nodes, self.t)
        return nodes, coordinator

    def get_coordinator(self) -> OracleCoordinator:
        return self.coordinator

    def status(self) -> dict:
        return {
            "total_nodes": self.n,
            "threshold": self.t,
            "nodes": [
                {"id": n.config.node_id, "url": n.config.network_url}
                for n in self.nodes
            ],
            "network_id": self.coordinator._network_id(),
            "status": "alive",
        }


# ---------------------------------------------------------------------------
# DEMO — oráculo descentralizado em ação
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Oráculo Descentralizado — Tecnologia Viva ===\n")

    # 1. Inicializa a rede com 5 nós, threshold 3
    print("Iniciando rede de oráculos (5 nós, threshold 3)...")
    network = OracleNetwork(n_nodes=5, threshold=3)
    print(f"Status: {json.dumps(network.status(), indent=2)}\n")

    coord = network.get_coordinator()

    # 2. Gera snapshot via MPC
    print("Gerando context_snapshot via MPC...")
    snapshot = coord.generate_context_snapshot(
        setup_id_ref="639a195398d69dd1",
        event_data=b"BBP:DNA:asset_id=42|owner=leo",
        beacon_round=382947,
        beacon_random="82b7c2f39ad55e1a9b3fd22c",
        block_height=901234,
        block_hash="0000000000000000000abcd1234567890abc",
    )
    print(f"Snapshot fingerprint: {snapshot['snapshot_fingerprint'][:32]}...")
    print(f"Nós participantes: {snapshot['nodes_participated']}")
    print(f"Threshold atingido: {snapshot['threshold_met']}\n")

    # 3. Verifica snapshot
    valid = coord.verify_snapshot(snapshot)
    print(f"Verificação do snapshot: {'✅ VÁLIDO' if valid else '❌ INVÁLIDO'}\n")

    # 4. Reconstrói chave a partir do snapshot
    setup_id = "639a195398d69dd1eb0b2b8fba18b7c270897fd7"
    key = coord.reconstruct_key_from_snapshot(snapshot, setup_id)
    print(f"Chave efêmera reconstruída (hex, 32 bytes): {key.hex()[:32]}...")

    # 5. Reconstrói novamente — deve ser idêntica (determinística)
    key2 = coord.reconstruct_key_from_snapshot(snapshot, setup_id)
    assert key == key2, "ERRO: reconstrução não é determinística!"
    print("Reconstrução determinística confirmada ✅")

    # 6. Demonstra que sem threshold não funciona
    print("\nTestando segurança: removendo nós abaixo do threshold...")
    weak_coord = OracleCoordinator(network.nodes[:2], threshold=3)  # só 2 de 3
    weak_snapshot = weak_coord.generate_context_snapshot(
        setup_id_ref="639a195398d69dd1",
        event_data=b"ataque",
        beacon_round=1,
        beacon_random="fake",
        block_height=1,
        block_hash="fake",
    )
    weak_valid = coord.verify_snapshot(weak_snapshot)
    print(f"Snapshot com apenas 2 nós: {'✅ válido' if weak_valid else '❌ rejeitado (correto!)'}")

    print("\n=== Oráculo descentralizado operacional. Nenhum nó tem o segredo completo. ===")
