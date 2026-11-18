from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math
root=Path(__file__).resolve().parent.parent
N=1200
im=Image.new('RGB',(N,N)); px=im.load()
spots=[(1000,70,480,(115,34,193)),(140,400,440,(140,14,107)),(1080,950,420,(0,125,153)),(340,1250,500,(30,56,170))]
for y in range(N):
 for x in range(N):
  rgb=[4.,6.,15.]
  for cx,cy,r,c in spots:
   a=.58*math.exp(-((x-cx)**2+(y-cy)**2)/(r*r))
   rgb=[v+a*z for v,z in zip(rgb,c)]
  px[x,y]=tuple(min(255,int(v)) for v in rgb)
d=ImageDraw.Draw(im)
d.rounded_rectangle((100,100,1100,1100),radius=150,fill=(30,25,64),outline=(99,90,142),width=2)
# Keep the same cyan-blue-violet-pink wordmark as the live navigation.
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def gradient_text(canvas,text,size,center,spacing=-5):
 f=ImageFont.truetype(font,size)
 widths=[f.getlength(c)+spacing for c in text];w=int(sum(widths)-spacing)
 mask=Image.new('L',(w,size*2));md=ImageDraw.Draw(mask);x=0
 for c,width in zip(text,widths):md.text((x,0),c,font=f,fill=255,stroke_width=0);x+=width
 bounds=mask.getbbox();mask=mask.crop(bounds);w,h=mask.size
 g=Image.new('RGB',(w,h));gd=ImageDraw.Draw(g)
 colors=[(0,(34,211,238)),(.30,(59,130,246)),(.62,(168,85,247)),(1,(255,47,176))]
 for xx in range(w):
  t=xx/max(1,w-1)
  for i in range(3):
   a,ca=colors[i];b,cb=colors[i+1]
   if a<=t<=b:
    q=(t-a)/(b-a);co=tuple(int(v+(z-v)*q) for v,z in zip(ca,cb));break
  gd.line((xx,0,xx,h),fill=co)
 canvas.paste(g,(int(center[0]-w/2),int(center[1]-h/2)),mask)
gradient_text(im,'facePay',194,(600,570),-10)
d=ImageDraw.Draw(im)
f=ImageFont.truetype(font,27)
for text,y,color in [('LOOK. SCAN. CONFIRM.',735,(222,224,255)),('INTERACTIVE DEMO · NO REAL PAYMENTS',970,(171,182,218))]:
 bb=d.textbbox((0,0),text,font=f);d.text(((1200-(bb[2]-bb[0]))/2,y),text,font=f,fill=color)
im.save(root/'og.jpg',quality=94,optimize=True)
# App icons: facePay's compact fP monogram, not a new symbol.
ic=im.copy()
# Remove the social text while retaining a square glass tile.
ImageDraw.Draw(ic).rounded_rectangle((100,100,1100,1100),radius=180,fill=(30,25,64),outline=(99,90,142),width=4)
gradient_text(ic,'fP',590,(600,590),-42)
for size,name in [(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:ic.resize((size,size),Image.Resampling.LANCZOS).save(root/name)
ic.resize((64,64),Image.Resampling.LANCZOS).save(root/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
(root/'favicon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g"><stop stop-color="#22d3ee"/><stop offset=".5" stop-color="#a855f7"/><stop offset="1" stop-color="#ff2fb0"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#13102b"/><rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="#5d4e7e"/><text x="29" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="43" letter-spacing="-4" fill="url(#g)">fP</text></svg>''')
