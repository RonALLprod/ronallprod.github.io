#!/usr/bin/env python3
"""Protege las pistas privadas que siguen publicadas como MP3 sin cifrar.
Convierte audio/*.mp3 -> audio/*.bin (IV 12 bytes + AES-GCM, compatible con el descifrado actual de private.html),
actualiza las referencias en private.html y MUEVE los MP3 originales fuera del repositorio.
Necesita la MISMA clave AES-256 que tu Supabase entrega a usuarios aprobados (no está en el repo, por diseño):
    PRIVATE_KEY_B64='...' python3 tools/encrypt-private.py [--dry-run]"""
import os,sys,re,base64,shutil,glob
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));dry='--dry-run' in sys.argv
mp3=sorted(glob.glob(f'{R}/audio/*.mp3'));print(len(mp3),'MP3 sin cifrar:',*[os.path.basename(f) for f in mp3],sep='\n  ')
if dry or not mp3: sys.exit(0)
k=os.environ.get('PRIVATE_KEY_B64');assert k,'Falta PRIVATE_KEY_B64';key=base64.b64decode(k);assert len(key) in(16,24,32),'clave AES inválida'
html=open(f'{R}/private.html',encoding='utf-8').read();out=os.path.join(os.path.dirname(R),'ronall-masters','private-mp3');os.makedirs(out,exist_ok=True)
for f in mp3:
    raw=open(f,'rb').read();iv=os.urandom(12);ct=AESGCM(key).encrypt(iv,raw,None);b=f[:-4]+'.bin'
    assert AESGCM(key).decrypt(ct[:0] or iv,ct,None)==raw   # verificación de ida y vuelta
    open(b,'wb').write(iv+ct);n=os.path.basename(f)
    assert f'audio/{n}' in html,f'{n} no está referenciado en private.html'
    html=html.replace(f'audio/{n}',f'audio/{n[:-4]}.bin');shutil.move(f,os.path.join(out,n));print('OK',n)
open(f'{R}/private.html','w',encoding='utf-8').write(html);print('Hecho. Originales en',out)
