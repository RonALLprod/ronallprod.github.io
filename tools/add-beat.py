#!/usr/bin/env python3
"""Añade un beat público: preview MP3 -> AES-GCM (.bin), portadas optimizadas y entrada en data/catalog.json.
Uso: python3 tools/add-beat.py --wav master.wav --cover portada.jpg --name "NOMBRE" --type "YN Jay Type Beat" --genre Detroit
El WAV original NUNCA se copia al repositorio. Requiere: ffmpeg, Pillow, cryptography."""
import argparse,json,os,re,subprocess,sys,base64,datetime,unicodedata
from PIL import Image
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap=argparse.ArgumentParser()
ap.add_argument('--wav',required=True);ap.add_argument('--cover',required=True);ap.add_argument('--name',required=True)
ap.add_argument('--type',default='');ap.add_argument('--genre',default='');ap.add_argument('--slug');ap.add_argument('--bpm',type=int);ap.add_argument('--key')
ap.add_argument('--preview-seconds',type=int,default=75,help='duración del preview público (0 = completo)')
a=ap.parse_args()
slug=a.slug or re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',a.name.lower()).encode('ascii','ignore').decode()).strip('-')
cfg=open(f'{R}/config/site-config.js').read()
m=re.search(r'previewKey:\s*"([^"]*)"',cfg)
if not m or not m.group(1):
    k=base64.b64encode(os.urandom(32)).decode(); cfg=re.sub(r'previewKey:\s*"[^"]*"',f'previewKey: "{k}"',cfg); open(f'{R}/config/site-config.js','w').write(cfg)
else: k=m.group(1)
key=base64.b64decode(k)
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',a.wav]).decode())
pv=a.preview_seconds
cmd=['ffmpeg','-y','-v','error','-i',a.wav,'-map_metadata','-1','-ac','2','-ar','44100']
if pv and pv<dur: cmd+=['-t',str(pv),'-af',f'afade=t=out:st={pv-3}:d=3']
tmp='/tmp/_preview.mp3'; subprocess.check_call(cmd+['-b:a','128k',tmp])
raw=open(tmp,'rb').read(); iv=os.urandom(12)
open(f'{R}/public-audio/{slug}.bin','wb').write(iv+AESGCM(key).encrypt(iv,raw,None)); os.remove(tmp)
im=Image.open(a.cover).convert('RGB')
for n,s,q in (('1200',1200,80),('640',640,78)):
    c=im.copy(); c.thumbnail((s,s),Image.LANCZOS); c.save(f'{R}/public-img/{slug}-{n}.jpg',quality=q,optimize=True,progressive=True)
p=f'{R}/data/catalog.json'; cat=json.load(open(p)) if os.path.exists(p) else {'beats':[]}
cat['beats']=[b for b in cat['beats'] if b['slug']!=slug]
cat['beats'].insert(0,{'id':slug,'slug':slug,'name':a.name.strip(),'type':a.type,'genre':a.genre,'bpm':a.bpm,'key':a.key,
 'duration':round(dur,1),'preview':f'public-audio/{slug}.bin','cover':f'public-img/{slug}-1200.jpg','thumb':f'public-img/{slug}-640.jpg',
 'visibility':'public','active':True,'exclusiveSold':False,'licenses':['basic','premium','unlimited','exclusive'],'prices':{},
 'created':datetime.date.today().isoformat(),'tags':[]})
json.dump(cat,open(p,'w'),ensure_ascii=False,indent=1)
print('OK',slug,'duración',round(dur,1),'s | preview',len(raw)//1024,'KB cifrado')
