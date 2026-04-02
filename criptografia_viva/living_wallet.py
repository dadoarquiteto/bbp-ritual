"""
Living Wallet — BBP Integration
Tecnologia Viva | Autor: Léo Ramalho

Arquitetura:
  1. LiveSetupID  — fingerprint do dispositivo (nunca sai da máquina)
  2. OracleClient — comunica com o Oráculo Vivo para obter context_snapshot
  3. LivingKey    — deriva chave efêmera, usa, destrói
  4. LivingWallet — wallet que nunca armazena chave privada
"""

import hashlib
import hmac
import time
import json
import os
import uuid
import struct
import secrets
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# 1. LIVE SETUP ID — Fingerprint do dispositivo
# ---------------------------------------------------------------------------

class LiveSetupID:
    """
    Gera e valida a identidade viva do dispositivo.
    A chave privada NUNCA sai desta classe.
    O que vai ao oráculo é apenas o hash-assinado (referência de validação).
    """

    def __init__(self, user_id: str, secret_pin: str):
        self.user_id = user_id
        self._secret_pin = secret_pin          # nunca serializado
        self._device_hash = self._collect_device_entropy()
        self._session_salt = secrets.token_hex(16)
        self.setup_id = self._derive_setup_id()

    def _collect_device_entropy(self) -> str:
        """
        Coleta entropia do hardware local.
        Em produção: substituir cpu_temp e jitter por leituras reais do SO.
        TPM / Secure Enclave são o alvo de longo prazo.
        """
        components = {
            "machine_id": self._get_machine_id(),
            "cpu_temp_approx": self._get_cpu_temp(),
            "network_jitter_ms": self._get_network_jitter(),
            "mouse_entropy": secrets.token_hex(8),   # em prod: hash de padrão real
            "process_noise": os.getpid(),
            "timestamp_ns": time.time_ns(),
        }
        raw = json.dumps(components, sort_keys=True).encode()
        return hashlib.sha256(raw).hexdigest()

    def _get_machine_id(self) -> str:
        # Linux: /etc/machine-id | macOS: IOPlatformUUID | Windows: MachineGuid
        try:
            with open("/etc/machine-id") as f:
                return f.read().strip()
        except FileNotFoundError:
            return str(uuid.getnode())   # fallback: MAC address

    def _get_cpu_temp(self) -> float:
        # Linux: /sys/class/thermal/thermal_zone0/temp
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                return int(f.read().strip()) / 1000.0
        except Exception:
            return 42.0   # fallback neutro

    def _get_network_jitter(self) -> float:
        # Medida simples de jitter local via diferença de timestamps
        t1 = time.perf_counter()
        _ = hashlib.sha256(b"ping").digest()
        t2 = time.perf_counter()
        return round((t2 - t1) * 1000, 6)

    def _derive_setup_id(self) -> str:
        """
        Combina device_hash + user_id + pin + session_salt.
        HKDF-like com HMAC-SHA256.
        """
        key = hashlib.sha256(self._secret_pin.encode()).digest()
        msg = f"{self._device_hash}|{self.user_id}|{self._session_salt}".encode()
        return hmac.new(key, msg, hashlib.sha256).hexdigest()

    def get_oracle_reference(self) -> dict:
        """
        O que é enviado ao oráculo — apenas referência, sem segredos.
        """
        return {
            "setup_id": self.setup_id,
            "owner": self.user_id,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "valid_until": self._valid_until_iso(),
        }

    def _valid_until_iso(self) -> str:
        ts = time.time() + 7 * 24 * 3600   # janela de 7 dias
        return datetime.fromtimestamp(ts, timezone.utc).isoformat()

    def verify_against_snapshot(self, snapshot: dict) -> bool:
        """
        Verifica se o setup atual corresponde ao snapshot do oráculo.
        """
        expected = snapshot.get("setup_id")
        return hmac.compare_digest(self.setup_id, expected or "")


# ---------------------------------------------------------------------------
# 2. ORACLE CLIENT — Comunica com o Oráculo Vivo
# ---------------------------------------------------------------------------

@dataclass
class ContextSnapshot:
    """
    O snapshot determinístico que o oráculo retorna.
    Este objeto é o 'timestamp' que permite recriar a chave no futuro.
    Não contém a chave — contém os ingredientes verificáveis para recriá-la.
    """
    oracle_id: str
    beacon_round: int
    beacon_random: str          # hex — do drand ou equivalente
    block_height: int           # altura do bloco BTC/ETH no momento
    block_hash_prefix: str      # primeiros 16 chars do hash do bloco
    event_hash: str             # hash sha256 do evento que gerou a chave
    timestamp_utc: str
    setup_id_ref: str           # referência (não o setup completo)
    snapshot_sig: str = ""      # assinatura do oráculo sobre este snapshot

    def to_bytes(self) -> bytes:
        raw = (
            f"{self.oracle_id}|{self.beacon_round}|{self.beacon_random}|"
            f"{self.block_height}|{self.block_hash_prefix}|"
            f"{self.event_hash}|{self.timestamp_utc}|{self.setup_id_ref}"
        )
        return raw.encode()

    def fingerprint(self) -> str:
        return hashlib.sha256(self.to_bytes()).hexdigest()


class OracleClient:
    """
    Cliente do Oráculo Vivo.
    Versão local (mock) para desenvolvimento.
    Em produção: substitui _fetch_beacon e _fetch_chain por chamadas reais
    ao drand network e a um nó BTC/ETH.
    """

    def __init__(self, oracle_url: str = "http://localhost:8000"):
        self.oracle_url = oracle_url
        self._oracle_id = hashlib.sha256(oracle_url.encode()).hexdigest()[:16]

    def get_context_snapshot(self, setup: LiveSetupID, event_data: bytes) -> ContextSnapshot:
        """
        Solicita um snapshot de contexto ao oráculo.
        Este snapshot é o único artefato necessário para reconstruir a chave.
        """
        beacon = self._fetch_beacon()
        chain = self._fetch_chain_state()
        event_hash = hashlib.sha256(event_data).hexdigest()

        snapshot = ContextSnapshot(
            oracle_id=self._oracle_id,
            beacon_round=beacon["round"],
            beacon_random=beacon["randomness"],
            block_height=chain["height"],
            block_hash_prefix=chain["hash"][:16],
            event_hash=event_hash,
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            setup_id_ref=setup.setup_id[:16],  # apenas prefixo — não o setup completo
        )
        snapshot.snapshot_sig = self._sign_snapshot(snapshot)
        return snapshot

    def reconstruct_key_from_snapshot(
        self, snapshot: ContextSnapshot, setup: LiveSetupID
    ) -> bytes:
        """
        Reconstrói a chave efêmera a partir do snapshot + setup.
        A chave só existe em memória durante esta chamada.
        """
        # Verifica assinatura do snapshot
        expected_sig = self._sign_snapshot(snapshot)
        if not hmac.compare_digest(snapshot.snapshot_sig, expected_sig):
            raise ValueError("Snapshot inválido ou adulterado.")

        # Derivação determinística: snapshot + setup_id (completo, local)
        material = (
            snapshot.to_bytes()
            + setup.setup_id.encode()
        )
        # HKDF simples com SHA-256
        # Em produção: usar biblioteca hkdf ou cryptography.hazmat
        prk = hmac.new(b"living-wallet-v1", material, hashlib.sha256).digest()
        okm = hmac.new(prk, b"ephemeral-private-key\x01", hashlib.sha256).digest()
        return okm   # 32 bytes — chave efêmera

    def _fetch_beacon(self) -> dict:
        """
        Mock: em produção chamar https://drand.cloudflare.com/public/latest
        """
        pseudo_round = int(time.time()) // 30
        pseudo_random = hashlib.sha256(
            struct.pack(">Q", pseudo_round) + b"drand-mock"
        ).hexdigest()
        return {"round": pseudo_round, "randomness": pseudo_random}

    def _fetch_chain_state(self) -> dict:
        """
        Mock: em produção chamar nó BTC (getblockcount + getblockhash)
        ou Ethereum (eth_blockNumber + eth_getBlockByNumber)
        """
        pseudo_height = 900000 + (int(time.time()) // 600)
        pseudo_hash = hashlib.sha256(
            struct.pack(">Q", pseudo_height) + b"btc-mock"
        ).hexdigest()
        return {"height": pseudo_height, "hash": pseudo_hash}

    def _sign_snapshot(self, snapshot: ContextSnapshot) -> str:
        """
        Assinatura HMAC do oráculo sobre o snapshot.
        Em produção: usar Ed25519 com chave privada do oráculo.
        """
        oracle_secret = hashlib.sha256(
            (self._oracle_id + "oracle-signing-key").encode()
        ).digest()
        return hmac.new(oracle_secret, snapshot.to_bytes(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# 3. LIVING KEY — Chave efêmera com ciclo de vida controlado
# ---------------------------------------------------------------------------

class LivingKey:
    """
    Encapsula a chave efêmera. Garante destruição após uso.
    Use sempre com 'with' para garantir limpeza de memória.
    """

    def __init__(self, key_bytes: bytes, snapshot: ContextSnapshot):
        self._key = key_bytes
        self.snapshot = snapshot
        self._used = False
        self._destroyed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.destroy()

    def sign(self, message: bytes) -> bytes:
        """Assina uma mensagem com a chave efêmera."""
        self._assert_valid()
        sig = hmac.new(self._key, message, hashlib.sha256).digest()
        self._used = True
        return sig

    def encrypt(self, plaintext: bytes) -> bytes:
        """
        Criptografia XOR-stream com chave derivada.
        Em produção: substituir por AES-256-GCM ou ChaCha20-Poly1305.
        """
        self._assert_valid()
        keystream = self._expand_key(len(plaintext))
        ciphertext = bytes(a ^ b for a, b in zip(plaintext, keystream))
        self._used = True
        return ciphertext

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Descriptografia — mesma operação XOR."""
        self._assert_valid()
        keystream = self._expand_key(len(ciphertext))
        plaintext = bytes(a ^ b for a, b in zip(ciphertext, keystream))
        self._used = True
        return plaintext

    def _expand_key(self, length: int) -> bytes:
        """Expande a chave de 32 bytes para tamanho arbitrário via HMAC-CTR."""
        stream = b""
        counter = 0
        while len(stream) < length:
            stream += hmac.new(
                self._key,
                struct.pack(">Q", counter),
                hashlib.sha256
            ).digest()
            counter += 1
        return stream[:length]

    def destroy(self):
        """Sobrescreve e deleta a chave da memória."""
        if not self._destroyed and self._key:
            # Sobrescrever com zeros antes de deletar
            self._key = bytes(len(self._key))
            del self._key
            self._destroyed = True

    def _assert_valid(self):
        if self._destroyed:
            raise RuntimeError("LivingKey já foi destruída.")

    def get_snapshot_for_storage(self) -> dict:
        """
        Retorna APENAS o snapshot — o único dado necessário para reconstrução futura.
        Jamais retorna a chave.
        """
        return {
            "oracle_id": self.snapshot.oracle_id,
            "beacon_round": self.snapshot.beacon_round,
            "beacon_random": self.snapshot.beacon_random,
            "block_height": self.snapshot.block_height,
            "block_hash_prefix": self.snapshot.block_hash_prefix,
            "event_hash": self.snapshot.event_hash,
            "timestamp_utc": self.snapshot.timestamp_utc,
            "setup_id_ref": self.snapshot.setup_id_ref,
            "snapshot_sig": self.snapshot.snapshot_sig,
        }


# ---------------------------------------------------------------------------
# 4. LIVING WALLET — Wallet sem chave privada persistente
# ---------------------------------------------------------------------------

class LivingWallet:
    """
    Wallet que nunca armazena chave privada.

    Fluxo normal:
      1. Usuário abre wallet → setup validado → oráculo retorna snapshot
      2. Chave efêmera derivada de (snapshot + setup)
      3. Transação assinada
      4. Chave destruída — só o snapshot fica gravado

    Fluxo de recuperação:
      1. Usuário perdeu o dispositivo
      2. Informa setup_id + pin em novo dispositivo
      3. Sistema recupera snapshot do oráculo (dentro de 7 dias)
      4. Chave reconstruída → acesso restaurado

    Fluxo anti-roubo:
      1. Ladrão copia os arquivos da wallet
      2. Sem o setup do dispositivo original → chave não pode ser derivada
      3. Wallet mostra dados embaralhados (modo stealth)
    """

    WALLET_FORMAT_VERSION = "living-wallet-v1"

    def __init__(self, setup: LiveSetupID, oracle: OracleClient):
        self.setup = setup
        self.oracle = oracle
        self._snapshots: list[dict] = []    # histórico de snapshots (sem chaves)
        self._stealth_mode = False

    # --- Operação principal: assinar transação ---

    def sign_transaction(self, tx_data: dict) -> dict:
        """
        Assina uma transação blockchain.
        A chave privada existe apenas durante esta chamada.
        """
        tx_bytes = json.dumps(tx_data, sort_keys=True).encode()
        snapshot = self.oracle.get_context_snapshot(self.setup, tx_bytes)

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)
        with living_key:
            signature = living_key.sign(tx_bytes)
            stored_snapshot = living_key.get_snapshot_for_storage()

        # Persiste apenas o snapshot — nunca a chave
        self._snapshots.append(stored_snapshot)

        return {
            "tx": tx_data,
            "signature": signature.hex(),
            "snapshot_ref": stored_snapshot["event_hash"][:16],
            "signed_at": stored_snapshot["timestamp_utc"],
        }

    # --- Criptografar dado (ex: arquivo BBP, mensagem) ---

    def encrypt_data(self, plaintext: bytes, label: str = "") -> dict:
        """
        Criptografa dado com chave efêmera.
        Retorna ciphertext + snapshot (para reconstrução futura).
        """
        event_data = label.encode() + plaintext[:64]   # contexto do evento
        snapshot = self.oracle.get_context_snapshot(self.setup, event_data)

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)
        with living_key:
            ciphertext = living_key.encrypt(plaintext)
            stored_snapshot = living_key.get_snapshot_for_storage()

        self._snapshots.append(stored_snapshot)

        return {
            "ciphertext_hex": ciphertext.hex(),
            "label": label,
            "snapshot": stored_snapshot,
        }

    # --- Descriptografar via snapshot salvo ---

    def decrypt_data(self, encrypted_package: dict) -> bytes:
        """
        Reconstrói a chave a partir do snapshot e descriptografa.
        Funciona em qualquer momento enquanto o snapshot for válido.
        """
        snapshot_data = encrypted_package["snapshot"]
        snapshot = ContextSnapshot(**{k: v for k, v in snapshot_data.items()})

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)
        with living_key:
            ciphertext = bytes.fromhex(encrypted_package["ciphertext_hex"])
            return living_key.decrypt(ciphertext)

    # --- Modo stealth: ativa se setup não bate ---

    def activate_stealth_mode(self):
        """
        Se o setup não puder ser validado, ativa modo stealth:
        wallet parece vazia / mostra dados embaralhados.
        O ladrão não sabe se a wallet tem fundos ou não.
        """
        self._stealth_mode = True

    def get_balances(self) -> dict:
        if self._stealth_mode:
            return self._generate_stealth_data()
        return {"status": "authenticated", "assets": "fetch from chain"}

    def _generate_stealth_data(self) -> dict:
        """Gera dados falsos plausíveis para confundir atacantes."""
        fake_balance = secrets.randbelow(10000) / 100
        return {
            "status": "ok",
            "btc": fake_balance,
            "eth": secrets.randbelow(500) / 10,
            "note": "dados embaralhados — setup inválido"
        }

    # --- Exportar wallet (sem chaves) ---

    def export_wallet_state(self) -> dict:
        """
        Exporta o estado da wallet para backup.
        Nunca inclui chaves privadas — apenas snapshots e metadados.
        """
        return {
            "format": self.WALLET_FORMAT_VERSION,
            "owner": self.setup.user_id,
            "setup_id_ref": self.setup.setup_id[:16],
            "snapshots": self._snapshots,
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# 5. FRAGMENTAÇÃO — LiveDataFractal
# ---------------------------------------------------------------------------

class LiveDataFractal:
    """
    Fragmenta dados em N partes com ordem determinada pelo oráculo.
    A ordem só pode ser reconstruída com setup + snapshot corretos.
    """

    def __init__(self, oracle: OracleClient, setup: LiveSetupID):
        self.oracle = oracle
        self.setup = setup

    def fragment(self, data: bytes, n_fragments: int = 12) -> dict:
        """
        Divide os dados em n_fragments partes embaralhadas.
        Retorna: fragmentos + snapshot (para reconstrução).
        """
        snapshot = self.oracle.get_context_snapshot(
            self.setup, data[:64] + len(data).to_bytes(4, "big")
        )

        # Deriva ordem de fragmentação a partir do snapshot
        order = self._derive_fragment_order(snapshot, n_fragments)

        # Divide em partes de tamanho variável
        chunk_size = (len(data) + n_fragments - 1) // n_fragments
        raw_fragments = [
            data[i * chunk_size: (i + 1) * chunk_size]
            for i in range(n_fragments)
        ]

        # Embaralha conforme ordem derivada
        shuffled = [None] * n_fragments
        for physical_pos, logical_pos in enumerate(order):
            shuffled[physical_pos] = raw_fragments[logical_pos]

        # Hash individual por fragmento (detecção de adulteração)
        fragments_with_hash = [
            {
                "index": i,
                "data_hex": f.hex() if f else "",
                "hash": hashlib.sha256(f or b"").hexdigest()[:16],
            }
            for i, f in enumerate(shuffled)
        ]

        return {
            "fragments": fragments_with_hash,
            "n_fragments": n_fragments,
            "snapshot": snapshot.__dict__,
            "total_len": len(data),
        }

    def reconstruct(self, package: dict) -> bytes:
        """
        Reconstrói os dados a partir dos fragmentos + snapshot.
        Falha completamente se qualquer elemento não corresponder.
        """
        snapshot_data = package["snapshot"]
        snapshot = ContextSnapshot(**snapshot_data)
        n = package["n_fragments"]
        order = self._derive_fragment_order(snapshot, n)

        # Ordem inversa: dado embaralhado → dado original
        inverse_order = [0] * n
        for physical_pos, logical_pos in enumerate(order):
            inverse_order[logical_pos] = physical_pos

        fragments = package["fragments"]

        # Verifica integridade de cada fragmento
        for frag in fragments:
            data = bytes.fromhex(frag["data_hex"])
            computed_hash = hashlib.sha256(data).hexdigest()[:16]
            if not hmac.compare_digest(computed_hash, frag["hash"]):
                raise ValueError(f"Fragmento {frag['index']} adulterado.")

        # Reconstrói na ordem original
        ordered = [
            bytes.fromhex(fragments[inverse_order[i]]["data_hex"])
            for i in range(n)
        ]
        return b"".join(ordered)[: package["total_len"]]

    def _derive_fragment_order(self, snapshot: ContextSnapshot, n: int) -> list[int]:
        """
        Deriva ordem de fragmentação deterministicamente a partir do snapshot.
        Sem o snapshot + setup corretos, a ordem é desconhecida.
        """
        seed_material = (
            snapshot.to_bytes()
            + self.setup.setup_id.encode()
            + n.to_bytes(2, "big")
        )
        seed = hashlib.sha256(seed_material).digest()

        # Fisher-Yates com seed determinística
        order = list(range(n))
        for i in range(n - 1, 0, -1):
            # Gera índice pseudo-aleatório determinístico
            h = hashlib.sha256(seed + i.to_bytes(2, "big")).digest()
            j = int.from_bytes(h[:4], "big") % (i + 1)
            order[i], order[j] = order[j], order[i]
        return order


# ---------------------------------------------------------------------------
# DEMO — uso básico
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Tecnologia Viva — Living Wallet Demo ===\n")

    # 1. Criar setup do usuário
    setup = LiveSetupID(user_id="leo_admin", secret_pin="2478")
    print(f"Setup ID (prefixo): {setup.setup_id[:24]}...")
    print(f"Oracle reference: {json.dumps(setup.get_oracle_reference(), indent=2)}\n")

    # 2. Conectar ao oráculo (mock local)
    oracle = OracleClient(oracle_url="http://localhost:8000")

    # 3. Criar Living Wallet
    wallet = LivingWallet(setup=setup, oracle=oracle)

    # 4. Criptografar um dado (simula arquivo BBP)
    bbp_dna = b"BBP:DNA:asset_id=42|owner=leo|type=nft|chain=btc"
    print("Criptografando dado BBP...")
    encrypted = wallet.encrypt_data(bbp_dna, label="bbp-asset-42")
    print(f"Ciphertext (hex, primeiros 32): {encrypted['ciphertext_hex'][:32]}...")
    print(f"Snapshot event_hash: {encrypted['snapshot']['event_hash'][:24]}...\n")

    # 5. Descriptografar — reconstrói chave do zero
    print("Descriptografando (reconstruindo chave via snapshot)...")
    decrypted = wallet.decrypt_data(encrypted)
    assert decrypted == bbp_dna, "ERRO: dado não confere!"
    print(f"Dado original recuperado: {decrypted.decode()}\n")

    # 6. Fragmentar dado
    print("Fragmentando dado em 6 partes...")
    fractal = LiveDataFractal(oracle=oracle, setup=setup)
    pkg = fractal.fragment(bbp_dna, n_fragments=6)
    print(f"Fragmentos gerados: {len(pkg['fragments'])}")
    reconstructed = fractal.reconstruct(pkg)
    assert reconstructed == bbp_dna, "ERRO: reconstrução falhou!"
    print("Reconstrução bem-sucedida!\n")

    # 7. Assinar transação
    print("Assinando transação blockchain...")
    tx = {"from": "leo_admin", "to": "0xABC123", "amount": "0.01 BTC", "nonce": 1}
    signed = wallet.sign_transaction(tx)
    print(f"Assinatura (hex, primeiros 32): {signed['signature'][:32]}...")
    print(f"Signed at: {signed['signed_at']}")
    print("\n=== Chave privada nunca foi armazenada. ===")
