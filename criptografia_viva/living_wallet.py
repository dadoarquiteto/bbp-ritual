"""
Living Wallet — BBP Integration
Tecnologia Viva v3.0 | Autor: Léo Ramalho

Arquitetura:
  1. BehavioralEntropyCollector — captura entropia comportamental da rede P2P
  2. LiveSetupID               — fingerprint do dispositivo (nunca sai da máquina)
  3. OracleClient              — comunica com o Oráculo Vivo para obter context_snapshot
  4. LivingKey                 — deriva chave efêmera, usa, destrói
  5. LivingWallet              — wallet que nunca armazena chave privada
  6. LiveDataFractal           — fragmentação com ordem derivada do oráculo

Mudanças v3.0 em relação à v2.0:
  - BehavioralEntropyCollector adicionado (novo — entropia comportamental distribuída)
  - SHA3-256 / SHAKE-256 substituem SHA-256 em todas as operações críticas
  - HMAC migra para HMAC-SHA3-256
  - genesis_seed adicionado ao ContextSnapshot (âncora da hash chain)
  - behavioral_contribution adicionado ao ContextSnapshot
  - KDF atualizado para usar SHA3-256
  - Zero curvas elípticas em qualquer ponto do código
"""

import hashlib
import hmac
import time
import json
import os
import uuid
import secrets
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# UTILITÁRIOS — SHA3 como padrão em todo o protocolo
# ---------------------------------------------------------------------------

def sha3_256(data: bytes) -> bytes:
    """SHA3-256 — substitui SHA-256 em todas as operações críticas."""
    return hashlib.sha3_256(data).digest()

def sha3_hex(data: bytes) -> str:
    return hashlib.sha3_256(data).hexdigest()

def hmac_sha3(key: bytes, msg: bytes) -> bytes:
    """HMAC com SHA3-256 — substitui HMAC-SHA256."""
    return hmac.new(key, msg, hashlib.sha3_256).digest()

def hmac_sha3_hex(key: bytes, msg: bytes) -> str:
    return hmac.new(key, msg, hashlib.sha3_256).hexdigest()


# ---------------------------------------------------------------------------
# 1. BEHAVIORAL ENTROPY COLLECTOR — Entropia comportamental distribuída
# ---------------------------------------------------------------------------

class BehavioralEntropyCollector:
    """
    Coleta padrões de comportamento humano e os converte em entropia
    criptográfica para alimentar a hash chain do oráculo.

    PRINCÍPIO DE PRIVACIDADE:
    Nunca armazena o comportamento do usuário.
    Coleta o padrão matemático e descarta o dado original imediatamente.
    O que alimenta a chain é um hash — não o comportamento em si.

    FONTES DE ENTROPIA:
    - Timing: intervalo entre eventos, velocidade de interação
    - Hardware: temperatura de CPU, clock do dispositivo
    - Rede: latência local, jitter
    - Contexto: tipo de evento, timestamp de nanosegundo

    PRECEDENTE:
    A Cloudflare usa lava lamps para gerar entropia real.
    O Linux /dev/random coleta eventos de teclado e mouse.
    O BBP generaliza e distribui esse conceito entre todos os usuários.
    """

    def __init__(self):
        self._last_event_ns: int = time.time_ns()
        self._event_count: int = 0
        self._session_entropy_buffer: list = []

    def collect_event(
        self,
        event_type: str,
        event_metadata: Optional[dict] = None
    ) -> str:
        """
        Processa um evento de interação do usuário e retorna
        a contribuição de entropia (hash de 32 bytes em hex).

        O dado original é descartado após o hash ser calculado.

        Args:
            event_type: tipo do evento ('click', 'reveal', 'comment',
                        'transaction', 'scroll', 'keypress', etc.)
            event_metadata: metadados opcionais do evento (timing,
                           posição, etc.) — nunca dados pessoais

        Returns:
            hex string de 64 chars — contribuição de entropia
        """
        now_ns = time.time_ns()
        delay_ns = now_ns - self._last_event_ns
        self._last_event_ns = now_ns
        self._event_count += 1

        # Coleta hardware local no momento do evento
        hw_entropy = self._collect_hardware_snapshot()

        # Monta o padrão do evento — nunca o conteúdo
        pattern = {
            "event_type": event_type,
            "delay_ns": delay_ns,           # timing — irreproduzível
            "timestamp_ns": now_ns,
            "event_seq": self._event_count,
            "cpu_temp": hw_entropy["cpu_temp"],
            "net_jitter_us": hw_entropy["net_jitter_us"],
            "process_noise": hw_entropy["process_noise"],
        }

        # Adiciona metadados se fornecidos (apenas padrões, não dados)
        if event_metadata:
            if "duration_ms" in event_metadata:
                pattern["duration_ms"] = event_metadata["duration_ms"]
            if "interaction_type" in event_metadata:
                pattern["interaction_type"] = event_metadata["interaction_type"]

        # Calcula contribuição de entropia
        raw = json.dumps(pattern, sort_keys=True).encode()
        contribution = sha3_hex(raw)

        # Dado original descartado aqui — apenas o hash é mantido
        del pattern, raw

        # Acumula no buffer de sessão (máx. 32 contribuições)
        self._session_entropy_buffer.append(contribution)
        if len(self._session_entropy_buffer) > 32:
            self._session_entropy_buffer.pop(0)

        return contribution

    def get_session_entropy(self) -> str:
        """
        Combina todas as contribuições da sessão em um único hash.
        Representa a entropia acumulada desta sessão de uso.
        """
        if not self._session_entropy_buffer:
            return sha3_hex(secrets.token_bytes(32))

        combined = "".join(self._session_entropy_buffer).encode()
        return sha3_hex(combined)

    def _collect_hardware_snapshot(self) -> dict:
        """Lê valores de hardware no momento exato do evento."""
        return {
            "cpu_temp": self._read_cpu_temp(),
            "net_jitter_us": self._measure_net_jitter(),
            "process_noise": os.getpid() ^ (time.time_ns() & 0xFFFF),
        }

    def _read_cpu_temp(self) -> float:
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                return int(f.read().strip()) / 1000.0
        except Exception:
            # Fallback: variação de tempo como proxy de carga
            t1 = time.perf_counter_ns()
            _ = sha3_256(b"temp_probe")
            t2 = time.perf_counter_ns()
            return (t2 - t1) / 1000.0

    def _measure_net_jitter(self) -> int:
        """Jitter local em microsegundos — varia com carga do sistema."""
        t1 = time.perf_counter_ns()
        _ = sha3_256(b"jitter_probe")
        t2 = time.perf_counter_ns()
        return (t2 - t1) // 1000


# ---------------------------------------------------------------------------
# 2. LIVE SETUP ID — Fingerprint do dispositivo
# ---------------------------------------------------------------------------

class LiveSetupID:
    """
    Gera e valida a identidade viva do dispositivo.
    A chave nunca sai desta classe.
    O que vai ao oráculo é apenas o hash-assinado (referência de validação).

    v3.0: usa SHA3-256 em todas as operações internas.
    """

    def __init__(self, user_id: str, secret_pin: str,
                 behavioral_collector: Optional[BehavioralEntropyCollector] = None):
        self.user_id = user_id
        self._secret_pin = secret_pin
        self._behavioral = behavioral_collector or BehavioralEntropyCollector()
        self._device_hash = self._collect_device_entropy()
        self._session_salt = secrets.token_hex(16)
        self.setup_id = self._derive_setup_id()

    def _collect_device_entropy(self) -> str:
        """
        Coleta entropia do hardware local.
        v3.0: inclui entropia comportamental da sessão atual.
        Produção: substituir por TPM / Secure Enclave.
        """
        # Contribuição comportamental desta sessão
        behavioral_entropy = self._behavioral.collect_event(
            "setup_init",
            {"interaction_type": "device_fingerprint"}
        )

        components = {
            "machine_id": self._get_machine_id(),
            "cpu_temp_approx": self._get_cpu_temp(),
            "network_jitter_us": self._get_network_jitter(),
            "behavioral_entropy": behavioral_entropy,   # NOVO v3.0
            "process_noise": os.getpid(),
            "timestamp_ns": time.time_ns(),
        }
        raw = json.dumps(components, sort_keys=True).encode()
        return sha3_hex(raw)   # SHA3-256 em vez de SHA-256

    def _get_machine_id(self) -> str:
        try:
            with open("/etc/machine-id") as f:
                return f.read().strip()
        except FileNotFoundError:
            return str(uuid.getnode())

    def _get_cpu_temp(self) -> float:
        try:
            with open("/sys/class/thermal/thermal_zone0/temp") as f:
                return int(f.read().strip()) / 1000.0
        except Exception:
            return 42.0

    def _get_network_jitter(self) -> int:
        t1 = time.perf_counter_ns()
        _ = sha3_256(b"jitter")
        t2 = time.perf_counter_ns()
        return (t2 - t1) // 1000

    def _derive_setup_id(self) -> str:
        """
        Combina device_hash + user_id + pin + session_salt.
        v3.0: HMAC-SHA3-256 em vez de HMAC-SHA256.
        """
        key = sha3_256(self._secret_pin.encode())
        msg = f"{self._device_hash}|{self.user_id}|{self._session_salt}".encode()
        return hmac_sha3_hex(key, msg)

    def get_oracle_reference(self) -> dict:
        """O que é enviado ao oráculo — apenas referência, sem segredos."""
        return {
            "setup_id_ref": self.setup_id[:16],
            "owner": self.user_id,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "valid_until": self._valid_until_iso(),
        }

    def _valid_until_iso(self) -> str:
        ts = time.time() + 7 * 24 * 3600
        return datetime.fromtimestamp(ts, timezone.utc).isoformat()

    def verify_against_snapshot(self, snapshot: "ContextSnapshot") -> bool:
        ref = snapshot.setup_id_ref
        return hmac.compare_digest(self.setup_id[:len(ref)], ref)


# ---------------------------------------------------------------------------
# 3. CONTEXT SNAPSHOT — O artefato determinístico do oráculo
# ---------------------------------------------------------------------------

@dataclass
class ContextSnapshot:
    """
    O snapshot determinístico que o oráculo retorna.
    Não contém a chave — contém os ingredientes verificáveis para recriá-la.

    v3.0: inclui genesis_seed e behavioral_contribution.
    """
    oracle_id: str
    beacon_round: int
    beacon_random: str           # hex — do drand ou equivalente
    block_height: int            # altura do bloco BTC no momento
    block_hash_prefix: str       # primeiros 16 chars do hash do bloco
    event_hash: str              # SHA3-256 do evento que gerou o snapshot
    timestamp_utc: str
    setup_id_ref: str            # referência (prefixo 16 chars do setup_id)
    genesis_seed: str = ""       # NOVO v3.0 — âncora na hash chain do oráculo
    behavioral_contribution: str = ""  # NOVO v3.0 — entropia comportamental
    snapshot_sig: str = ""       # assinatura do oráculo sobre este snapshot

    def to_bytes(self) -> bytes:
        raw = (
            f"{self.oracle_id}|{self.beacon_round}|{self.beacon_random}|"
            f"{self.block_height}|{self.block_hash_prefix}|"
            f"{self.event_hash}|{self.timestamp_utc}|{self.setup_id_ref}|"
            f"{self.genesis_seed}|{self.behavioral_contribution}"
        )
        return raw.encode()

    def fingerprint(self) -> str:
        """SHA3-256 do snapshot completo."""
        return sha3_hex(self.to_bytes())


# ---------------------------------------------------------------------------
# 4. ORACLE CLIENT — Comunica com o Oráculo Vivo
# ---------------------------------------------------------------------------

class OracleClient:
    """
    Cliente do Oráculo Vivo.

    v3.0:
    - Aceita contribuição de entropia comportamental no snapshot
    - genesis_seed derivado da hash chain viva
    - SHA3-256 em todas as operações
    - Assinatura usa HMAC-SHA3-256 (substitui HMAC-SHA256)
    
    Produção: substituir _fetch_beacon e _fetch_chain por chamadas reais
    ao drand network e a um nó Bitcoin.
    """

    def __init__(self, oracle_url: str = "http://localhost:8000"):
        self.oracle_url = oracle_url
        self._oracle_id = sha3_hex(oracle_url.encode())[:16]
        # Hash chain viva — estado interno que avança com cada contribuição
        self._living_chain_state = secrets.token_hex(32)

    def get_context_snapshot(
        self,
        setup: LiveSetupID,
        event_data: bytes,
        behavioral_collector: Optional[BehavioralEntropyCollector] = None
    ) -> ContextSnapshot:
        """
        Solicita um snapshot de contexto ao oráculo.

        v3.0: incorpora entropia comportamental na derivação do genesis_seed.
        """
        beacon = self._fetch_beacon()
        chain = self._fetch_chain_state()

        # Entropia comportamental da sessão atual
        behavioral_entropy = ""
        if behavioral_collector:
            behavioral_entropy = behavioral_collector.collect_event(
                "snapshot_request",
                {"interaction_type": "oracle_call"}
            )
        else:
            behavioral_entropy = sha3_hex(secrets.token_bytes(16))

        # event_hash usa SHA3-256
        event_hash = sha3_hex(event_data)

        # genesis_seed: âncora do usuário na hash chain viva
        # Combina: chain atual + behavioral + setup_ref + beacon
        genesis_input = (
            self._living_chain_state
            + behavioral_entropy
            + setup.setup_id[:16]
            + str(beacon["round"])
        ).encode()
        genesis_seed = sha3_hex(genesis_input)

        # Avança a hash chain com esta contribuição (ratcheting)
        self._advance_chain(behavioral_entropy, genesis_seed)

        snapshot = ContextSnapshot(
            oracle_id=self._oracle_id,
            beacon_round=beacon["round"],
            beacon_random=beacon["randomness"],
            block_height=chain["height"],
            block_hash_prefix=chain["hash"][:16],
            event_hash=event_hash,
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
            setup_id_ref=setup.setup_id[:16],
            genesis_seed=genesis_seed,
            behavioral_contribution=behavioral_entropy,
        )
        snapshot.snapshot_sig = self._sign_snapshot(snapshot)
        return snapshot

    def reconstruct_key_from_snapshot(
        self, snapshot: ContextSnapshot, setup: LiveSetupID
    ) -> bytes:
        """
        Reconstrói a chave efêmera a partir do snapshot + setup.
        A chave só existe em memória durante esta chamada.

        v3.0: KDF usa SHA3-256 via HKDF simplificado.
        """
        # Verifica assinatura do snapshot
        expected_sig = self._sign_snapshot(snapshot)
        if not hmac.compare_digest(snapshot.snapshot_sig, expected_sig):
            raise ValueError("Snapshot inválido ou adulterado.")

        # Verifica que o setup bate com o snapshot
        if not setup.verify_against_snapshot(snapshot):
            raise ValueError("Setup ID não corresponde ao snapshot.")

        # KDF com SHA3-256:
        # material = snapshot completo + setup_id completo (local, secreto)
        material = snapshot.to_bytes() + setup.setup_id.encode()

        # HKDF simplificado com SHA3-256
        prk = hmac_sha3(b"living-wallet-v3", material)
        okm = hmac_sha3(prk, b"ephemeral-private-key-dilithium\x01")

        # Nota: em produção, 'okm' é usado como seed para geração
        # do par de chaves Dilithium3 via liboqs:
        #   import oqs
        #   with oqs.Signature("Dilithium3") as signer:
        #       public_key = signer.generate_keypair_from_seed(okm)
        #       signature = signer.sign(message)
        # A chave é destruída ao sair do bloco 'with'.

        return okm  # 32 bytes — chave efêmera

    def _advance_chain(self, behavioral: str, genesis: str):
        """
        Avança o estado da hash chain viva com novas contribuições.
        Ratcheting: estado avança irreversivelmente, nunca retrocede.
        """
        chain_input = (
            self._living_chain_state
            + behavioral
            + genesis
            + str(time.time_ns())
        ).encode()
        self._living_chain_state = sha3_hex(chain_input)

    def _sign_snapshot(self, snapshot: ContextSnapshot) -> str:
        """
        Assina o snapshot com HMAC-SHA3-256.
        Produção: substituir por assinatura Dilithium3 real (liboqs).
        """
        oracle_key = sha3_256(
            (self._oracle_id + self._living_chain_state).encode()
        )
        return hmac_sha3_hex(oracle_key, snapshot.to_bytes())

    def _fetch_beacon(self) -> dict:
        """
        Mock. Produção: GET https://drand.cloudflare.com/public/latest
        Resposta real inclui: round, randomness, signature, previous_signature.
        """
        pseudo_round = int(time.time()) // 30
        pseudo_random = sha3_hex(
            (str(pseudo_round) + self._living_chain_state).encode()
        )
        return {"round": pseudo_round, "randomness": pseudo_random}

    def _fetch_chain_state(self) -> dict:
        """
        Mock. Produção: consultar nó Bitcoin via RPC ou API pública.
        Ex: GET https://blockstream.info/api/blocks/tip/height
        """
        pseudo_height = int(time.time()) // 600 + 900000
        pseudo_hash = sha3_hex(str(pseudo_height).encode())
        return {"height": pseudo_height, "hash": pseudo_hash}


# ---------------------------------------------------------------------------
# 5. LIVING KEY — Chave efêmera com destruição garantida
# ---------------------------------------------------------------------------

class LivingKey:
    """
    Encapsula a chave efêmera e garante destruição após uso.
    Usada como context manager: 'with LivingKey(...) as key:'

    v3.0: criptografia simétrica com AES-256-GCM (via XOR simplificado
    nesta versão de referência — produção usa cryptography.hazmat).
    """

    def __init__(self, key_bytes: bytes, snapshot: ContextSnapshot):
        assert len(key_bytes) == 32, "Chave deve ter 32 bytes."
        self._key = bytearray(key_bytes)
        self.snapshot = snapshot
        self._used = False
        self._destroyed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.destroy()

    def sign(self, data: bytes) -> bytes:
        """
        Assina dados com a chave efêmera.
        Produção: usar liboqs Dilithium3.sign(data) com chave derivada de self._key.
        """
        self._check_usable()
        # Referência: HMAC-SHA3-256 como proxy da assinatura Dilithium3
        sig = hmac_sha3(bytes(self._key), data)
        self._used = True
        return sig

    def encrypt(self, plaintext: bytes) -> bytes:
        """
        Criptografa dados com a chave efemera.
        Nonce derivado do fingerprint do snapshot — deterministico.
        Producao: AES-256-GCM via cryptography.hazmat.
        """
        self._check_usable()
        nonce = sha3_256(self.snapshot.fingerprint().encode())
        keystream = sha3_256(bytes(self._key) + nonce)
        result = bytes(a ^ b for a, b in zip(
            plaintext,
            (keystream * (len(plaintext) // 32 + 1))[:len(plaintext)]
        ))
        self._used = True
        return result

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Descriptografa — mesmo nonce do snapshot garante simetria."""
        self._check_usable()
        nonce = sha3_256(self.snapshot.fingerprint().encode())
        keystream = sha3_256(bytes(self._key) + nonce)
        result = bytes(a ^ b for a, b in zip(
            ciphertext,
            (keystream * (len(ciphertext) // 32 + 1))[:len(ciphertext)]
        ))
        self._used = True
        return result


    def destroy(self):
        """Sobrescreve a chave com zeros. Irreversível."""
        if not self._destroyed:
            for i in range(len(self._key)):
                self._key[i] = 0
            self._destroyed = True
            del self._key

    def _check_usable(self):
        if self._destroyed:
            raise RuntimeError("Chave já foi destruída.")


# ---------------------------------------------------------------------------
# 6. LIVING WALLET — Carteira que nunca armazena chave privada
# ---------------------------------------------------------------------------

class LivingWallet:
    """
    Wallet blockchain que nunca armazena chave privada.

    v3.0:
    - BehavioralEntropyCollector integrado
    - SHA3-256 em todas as operações
    - genesis_seed e behavioral_contribution no snapshot
    - Modo stealth preservado
    """

    WALLET_FORMAT_VERSION = "living-wallet-v3.0"

    def __init__(self, setup: LiveSetupID, oracle: OracleClient,
                 behavioral_collector: Optional[BehavioralEntropyCollector] = None):
        self.setup = setup
        self.oracle = oracle
        self.behavioral = behavioral_collector or BehavioralEntropyCollector()
        self._snapshots: list = []
        self._stealth_mode = False

    def sign_transaction(self, tx: dict) -> dict:
        """
        Assina uma transação blockchain com chave efêmera.
        A chave não existe antes nem depois desta chamada.
        """
        # Registra a interação como evento de entropia
        self.behavioral.collect_event("sign_transaction", {"interaction_type": "tx_sign"})

        tx_bytes = json.dumps(tx, sort_keys=True).encode()
        snapshot = self.oracle.get_context_snapshot(
            self.setup, tx_bytes, self.behavioral
        )

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)

        with living_key:
            signature = living_key.sign(tx_bytes)

        # Registra snapshot (sem chave)
        self._snapshots.append(snapshot.__dict__)

        return {
            "tx": tx,
            "signature": signature.hex(),
            "living_proof": {
                "snapshot_fingerprint": snapshot.fingerprint(),
                "oracle_id": snapshot.oracle_id,
                "beacon_round": snapshot.beacon_round,
                "block_height": snapshot.block_height,
                "genesis_seed_ref": snapshot.genesis_seed[:16] + "...",
                "behavioral_contributed": bool(snapshot.behavioral_contribution),
            },
            "signed_at": snapshot.timestamp_utc,
        }

    def encrypt_data(self, data: bytes, label: str = "") -> dict:
        """
        Criptografa dados com chave efêmera.
        Retorna: ciphertext + snapshot (para descriptografia futura).
        """
        self.behavioral.collect_event("encrypt_data", {"interaction_type": "encrypt"})

        event_data = sha3_256(data[:64] + label.encode())
        snapshot = self.oracle.get_context_snapshot(
            self.setup, event_data, self.behavioral
        )

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)

        with living_key:
            ciphertext = living_key.encrypt(data)

        self._snapshots.append(snapshot.__dict__)

        return {
            "label": label,
            "ciphertext_hex": ciphertext.hex(),
            "snapshot": snapshot.__dict__,
            "encrypted_at": snapshot.timestamp_utc,
        }

    def decrypt_data(self, encrypted_package: dict) -> bytes:
        """
        Descriptografa dados reconstituindo a chave efêmera via snapshot.
        """
        self.behavioral.collect_event("decrypt_data", {"interaction_type": "decrypt"})

        snapshot_data = encrypted_package["snapshot"]
        snapshot = ContextSnapshot(**{
            k: v for k, v in snapshot_data.items()
            if k in ContextSnapshot.__dataclass_fields__
        })

        key_bytes = self.oracle.reconstruct_key_from_snapshot(snapshot, self.setup)
        living_key = LivingKey(key_bytes, snapshot)

        with living_key:
            ciphertext = bytes.fromhex(encrypted_package["ciphertext_hex"])
            return living_key.decrypt(ciphertext)

    def activate_stealth_mode(self):
        """
        Ativa modo stealth: wallet exibe dados falsos plausíveis.
        Ativado automaticamente se setup não bate com dispositivo atual.
        """
        self._stealth_mode = True

    def get_balances(self) -> dict:
        if self._stealth_mode:
            return self._generate_stealth_data()
        return {"status": "authenticated", "assets": "fetch from chain"}

    def _generate_stealth_data(self) -> dict:
        """Dados falsos plausíveis para confundir atacantes."""
        return {
            "status": "ok",
            "btc": secrets.randbelow(10000) / 100,
            "eth": secrets.randbelow(500) / 10,
            "_note": "stealth_mode_active"
        }

    def export_wallet_state(self) -> dict:
        """
        Exporta estado da wallet para backup.
        Nunca inclui chaves privadas.
        """
        return {
            "format": self.WALLET_FORMAT_VERSION,
            "owner": self.setup.user_id,
            "setup_id_ref": self.setup.setup_id[:16],
            "snapshots_count": len(self._snapshots),
            "session_entropy_accumulated": bool(self.behavioral.get_session_entropy()),
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# 7. FRAGMENTAÇÃO — LiveDataFractal
# ---------------------------------------------------------------------------

class LiveDataFractal:
    """
    Fragmenta dados em N partes com ordem determinada pelo oráculo.
    A ordem só pode ser reconstruída com setup + snapshot corretos.

    v3.0: SHA3-256 em todas as operações de hash.
    """

    def __init__(self, oracle: OracleClient, setup: LiveSetupID,
                 behavioral_collector: Optional[BehavioralEntropyCollector] = None):
        self.oracle = oracle
        self.setup = setup
        self.behavioral = behavioral_collector or BehavioralEntropyCollector()

    def fragment(self, data: bytes, n_fragments: int = 12) -> dict:
        """
        Divide os dados em n_fragments partes embaralhadas.
        """
        self.behavioral.collect_event("fragment_data", {"interaction_type": "fractal"})

        event_data = sha3_256(data[:64] + len(data).to_bytes(4, "big"))
        snapshot = self.oracle.get_context_snapshot(
            self.setup, event_data, self.behavioral
        )

        order = self._derive_fragment_order(snapshot, n_fragments)

        chunk_size = (len(data) + n_fragments - 1) // n_fragments
        raw_fragments = [
            data[i * chunk_size: (i + 1) * chunk_size]
            for i in range(n_fragments)
        ]

        shuffled = [None] * n_fragments
        for physical_pos, logical_pos in enumerate(order):
            shuffled[physical_pos] = raw_fragments[logical_pos]

        # SHA3-256 por fragmento para detecção de adulteração
        fragments_with_hash = [
            {
                "index": i,
                "data_hex": f.hex() if f else "",
                "hash": sha3_hex(f or b"")[:16],
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
        """Reconstrói os dados a partir dos fragmentos + snapshot."""
        snapshot_data = package["snapshot"]
        snapshot = ContextSnapshot(**{
            k: v for k, v in snapshot_data.items()
            if k in ContextSnapshot.__dataclass_fields__
        })
        n = package["n_fragments"]
        order = self._derive_fragment_order(snapshot, n)

        inverse_order = [0] * n
        for physical_pos, logical_pos in enumerate(order):
            inverse_order[logical_pos] = physical_pos

        fragments = package["fragments"]

        # Verifica integridade com SHA3-256
        for frag in fragments:
            data = bytes.fromhex(frag["data_hex"])
            computed_hash = sha3_hex(data)[:16]
            if not hmac.compare_digest(computed_hash, frag["hash"]):
                raise ValueError(f"Fragmento {frag['index']} adulterado.")

        ordered = [
            bytes.fromhex(fragments[inverse_order[i]]["data_hex"])
            for i in range(n)
        ]
        return b"".join(ordered)[: package["total_len"]]

    def _derive_fragment_order(self, snapshot: ContextSnapshot, n: int) -> list:
        """
        Deriva ordem de fragmentação deterministicamente.
        v3.0: seed combina snapshot + setup + genesis_seed + behavioral.
        """
        seed_material = (
            snapshot.to_bytes()
            + self.setup.setup_id.encode()
            + snapshot.genesis_seed.encode()
            + n.to_bytes(2, "big")
        )
        seed = sha3_256(seed_material)

        order = list(range(n))
        for i in range(n - 1, 0, -1):
            h = sha3_256(seed + i.to_bytes(2, "big"))
            j = int.from_bytes(h[:4], "big") % (i + 1)
            order[i], order[j] = order[j], order[i]
        return order


# ---------------------------------------------------------------------------
# DEMO — uso básico v3.0
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Tecnologia Viva v3.0 — Living Wallet Demo ===\n")

    # 1. Criar coletor de entropia comportamental
    print("Iniciando BehavioralEntropyCollector...")
    behavioral = BehavioralEntropyCollector()

    # Simula interações do usuário (em produção: eventos reais da UI)
    e1 = behavioral.collect_event("page_load")
    e2 = behavioral.collect_event("click", {"duration_ms": 120})
    e3 = behavioral.collect_event("reveal_asset", {"interaction_type": "nft_reveal"})
    print(f"Contribuicoes de entropia coletadas: 3")
    print(f"Entropia de sessao (hash): {behavioral.get_session_entropy()[:24]}...\n")

    # 2. Criar setup do usuário com entropia comportamental integrada
    setup = LiveSetupID(
        user_id="leo_admin",
        secret_pin="2478",
        behavioral_collector=behavioral
    )
    print(f"Setup ID (prefixo): {setup.setup_id[:24]}...")

    # 3. Conectar ao oráculo
    oracle = OracleClient(oracle_url="http://localhost:8000")

    # 4. Criar Living Wallet
    wallet = LivingWallet(setup=setup, oracle=oracle, behavioral_collector=behavioral)

    # 5. Criptografar um dado BBP
    bbp_dna = b"BBP:DNA:asset_id=42|owner=leo|type=nft|chain=btc"
    print("\nCriptografando dado BBP...")
    encrypted = wallet.encrypt_data(bbp_dna, label="bbp-asset-42")
    snap = encrypted["snapshot"]
    print(f"Ciphertext (hex, primeiros 32): {encrypted['ciphertext_hex'][:32]}...")
    print(f"genesis_seed (prefixo): {snap.get('genesis_seed','')[:24]}...")
    print(f"behavioral_contribution presente: {bool(snap.get('behavioral_contribution'))}")

    # 6. Descriptografar
    print("\nDescriptografando (reconstruindo chave via snapshot)...")
    decrypted = wallet.decrypt_data(encrypted)
    assert decrypted == bbp_dna, "ERRO: dado nao confere!"
    print(f"Dado original recuperado: {decrypted.decode()}")

    # 7. Assinar transação
    print("\nAssinando transacao blockchain...")
    tx = {"from": "leo_admin", "to": "0xABC123", "amount": "0.01 BTC", "nonce": 1}
    signed = wallet.sign_transaction(tx)
    print(f"Assinatura (hex, primeiros 32): {signed['signature'][:32]}...")
    print(f"genesis_seed_ref: {signed['living_proof']['genesis_seed_ref']}")
    print(f"behavioral_contributed: {signed['living_proof']['behavioral_contributed']}")

    # 8. Fragmentar dado
    print("\nFragmentando dado em 6 partes...")
    fractal = LiveDataFractal(oracle=oracle, setup=setup, behavioral_collector=behavioral)
    pkg = fractal.fragment(bbp_dna, n_fragments=6)
    reconstructed = fractal.reconstruct(pkg)
    assert reconstructed == bbp_dna, "ERRO: reconstrucao falhou!"
    print("Reconstrucao bem-sucedida!")

    # 9. Status da wallet
    print(f"\nEstado da wallet: {json.dumps(wallet.export_wallet_state(), indent=2)}")

    print("\n=== Chave privada nunca foi armazenada. ===")
    print("=== SHA3-256 em todas as operacoes. Zero curvas elipticas. ===")
    print("=== Entropia comportamental integrada. ===")
