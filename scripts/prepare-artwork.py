"""Director-approved deterministic preparation. Never overwrite source artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import json
SOURCE=Path('artwork-source'); OUT=Path('public/assets/reactions');OUT.mkdir(parents=True,exist_ok=True)
report=[]
def clean(name,background=None):
    im=Image.open(SOURCE/name).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
    if background:
        if background=='black': candidate=rgb.max(2)<18
        elif background=='white': candidate=rgb.min(2)>235
        else: candidate=(rgb.max(2)-rgb.min(2)<15)&(rgb.min(2)>170)
        mask=Image.fromarray((candidate*255).astype('uint8')).copy()
        if background=='black': mask=mask.filter(ImageFilter.MinFilter(7))
        # Flood only background connected to the image boundary, protecting enclosed details.
        for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]:
            if mask.getpixel(p)==255: ImageDraw.floodfill(mask,p,128)
        a[np.array(mask)==128,3]=0;im=Image.fromarray(a)
    return im
def save(im,name,box=(640,640)):
    a=np.array(im);a[a[:,:,3]<25,3]=0;im=Image.fromarray(a)
    bounds=im.getbbox()
    if not bounds: raise ValueError(name+' empty')
    crop=im.crop(bounds);crop.thumbnail((int(box[0]*.84),int(box[1]*.80)),Image.Resampling.LANCZOS)
    target=Image.new('RGBA',box);target.alpha_composite(crop,((box[0]-crop.width)//2,int(box[1]*.90)-crop.height))
    target.save(OUT/name,optimize=True)
    report.append({'file':name,'size':box,'alphaExtrema':target.getchannel('A').getextrema(),'bytes':(OUT/name).stat().st_size})
save(clean('Chibi Cats Hydrate Sticker.png'),'hydrate.png',(900,700))
save(clean('Cocoa & Chaos Mug Design.png'),'cocoa-cup.png')
save(clean('Fluffy Marshmallow Paw Print.png'),'cocoa-garnish.png',(192,192))
save(clean('Cozy Chaos & Cocoa Cat Stack.png'),'paper-stack.png',(500,600))
save(clean('Waving Calico Cat and Cocoa Sticker.png'),'hello.png')
for i,(n,bg) in enumerate([('Chibi Pink Plush Cat with Paw Pads.png',None),('Kawaii Pink Cat Tumble.png',None),('Flying Plush Pink Cat.png',None),('Sleeping Pink Marshmallow Cat.png',None),('Kawaii Pink Cat with Rosy Cheeks.png','checker'),('Upside-Down Kawaii Pink Kitten.png','checker')]):save(clean(n,bg),f'rain-{i+1}.png',(192,192))
for src,prefix,count,bg,box in [('Determined Black Cat Running Sequence.png','run',6,'white',(640,400)),('Flail - Chibi Catgirl Celebration Sprite Sheet.png','flail',4,'black',(768,768)),('chaos-mode-sprite.png','chaos',4,None,(640,480))]:
    sheet=clean(src,bg)
    if prefix=='chaos':
        for i in range(4):save(sheet.crop((1625,0,2172,724)),f'chaos-{i+1}.png',box)
        continue
    for i in range(count): save(sheet.crop((round(i*sheet.width/count)+8,0,round((i+1)*sheet.width/count)-16,sheet.height)),f'{prefix}-{i+1}.png',box)
papers=clean('Cute Cat-Themed Paper Sticker Sheet.png')
for i,box in enumerate([(1148,810,1306,914),(1210,910,1345,976),(1128,956,1294,1024),(320,802,590,1024),(596,802,864,1024)]):save(papers.crop(box),f'paper-{i+1}.png',(160,200))
save(clean('Glossy Scientific Calculator Icon.png'),'calculator.png',(640,800))
save(clean('Kawaii Calculator Explosion Burst.png'),'calculator-burst.png',(800,800))
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))

