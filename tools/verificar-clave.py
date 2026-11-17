#!/usr/bin/env python3
"""Comprueba, en tu equipo, que una clave AES abre tus .bin. No sube ni envía nada.
Uso (desde la carpeta del repo, con audio/*.bin):   python3 tools/verificar-clave.py
Necesita:  pip install cryptography"""
import base64, glob, getpass, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k = getpass.getpass("Pega la clave AES (base64; no se muestra al escribir): ").strip().strip('"').strip("'")
try:
    key = base64.b64decode(k, validate=True)
except Exception:
    sys.exit("La clave no es base64 válido (¿copiaste algo de más o de menos?).")
if len(key) not in (16, 24, 32):
    sys.exit(f"La clave mide {len(key)} bytes; debe ser 16, 24 o 32.")
bins = sorted(glob.glob(os.path.join(R, "audio", "*.bin")))
if not bins:
    sys.exit("No hay audio/*.bin: ejecuta el script desde el repo.")
ok, bad = 0, []
for f in bins:
    raw = open(f, "rb").read()
    try:
        AESGCM(key).decrypt(raw[:12], raw[12:], None); ok += 1
    except Exception:
        bad.append(os.path.basename(f))
print(f"\n{ok} de {len(bins)} archivos abren con esta clave.")
if bad:
    print("No abren:", *bad, sep="\n  ")
print("\n✅ Clave correcta: úsala en el SQL." if not bad else
      "\n⚠️ Si no abre NINGUNO, es otra clave. Si abren casi todos, esos pocos están cifrados con otra clave.")
