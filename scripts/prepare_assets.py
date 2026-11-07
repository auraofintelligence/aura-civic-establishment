from pathlib import Path
import json
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = Path('G:/GithubLocal-PC')
JRA = BASE / 'joyful-responsible-abundance'
ASSETS = ROOT / 'assets/images'
ASSETS.mkdir(parents=True, exist_ok=True)

hero_slugs = ['explore-hero','projects-hero','public-decisions-hero','library-hero','five-horizons-hero','tools-hero','start-here-hero','global-festival','people-practice-hero','state-library','rooftop-solar','parliament-dusk','earth-at-night','csiro-compute','parliament-chamber','point-lookout']
visuals = json.loads((JRA / 'data/visuals.json').read_text(encoding='utf-8'))['images']
credits_path = JRA / 'assets/images/image-credits.json'
credits = json.loads(credits_path.read_text(encoding='utf-8'))
registry = {}
for slug in hero_slugs:
    entry = dict(visuals[slug])
    for size in [768,1536]:
        shutil.copy2(JRA / f'assets/images/{slug}-{size}.webp', ASSETS / f'{slug}-{size}.webp')
    entry['id'] = slug
    entry['source_project'] = 'https://auraofintelligence.github.io/joyful-responsible-abundance/'
    entry['source_credit_register'] = 'https://auraofintelligence.github.io/joyful-responsible-abundance/assets/images/image-credits.json'
    credit_items=credits if isinstance(credits,list) else credits.get('images',[])
    entry['source_record'] = next((item for item in credit_items if item.get('id') == slug or item.get('file') == slug), None)
    if entry.get('provenance'):
        entry['provenance']='https://auraofintelligence.github.io/joyful-responsible-abundance/'+entry['provenance']
    if entry.get('kind') == 'concept':
        entry['licence'] = 'Strange But True Public Source Licence'
        entry['licence_url'] = 'LICENCE.md'
    registry[slug] = entry

extra = BASE / 'ready-set-co-op-cultural-intelligence-node/assets/heroes/digital-twin.webp'
image = Image.open(extra).convert('RGB')
for size in [768,1536]:
    variant=image.copy(); variant.thumbnail((size,10000)); variant.save(ASSETS / f'island-twin-{size}.webp','WEBP',quality=85)
registry['island-twin']={'id':'island-twin','kind':'concept','title':'A connected island model','alt':'An imagined layered island model on a table in a coastal studio.','caption':'AI-generated concept from Ready S.E.T. Co-op Cultural Intelligence Node.','creator':'AI-generated for Luke Nathan Hayes','licence':'Strange But True Public Source Licence','licence_url':'LICENCE.md','source_url':'https://auraofintelligence.github.io/ready-set-co-op-cultural-intelligence-node/digital-twin.html','width':image.width,'height':image.height}

brisbane_source=BASE/'i-C-infinity-music-universe/assets/img/site-archive/i-see-infinity-148-123415319-990825808077574-876916776874469367-n-17886778534781199.webp'
brisbane=Image.open(brisbane_source).convert('RGB')
for size in [768,1536]:
    variant=brisbane.copy();variant.thumbnail((size,10000));variant.save(ASSETS/f'brisbane-story-bridge-{size}.webp','WEBP',quality=88)
registry['brisbane-story-bridge']={'id':'brisbane-story-bridge','kind':'photograph','title':'Story Bridge, Brisbane, in a 360-degree view','alt':'A tiny-planet projection of a real 360-degree photograph around Story Bridge, Brisbane.','caption':'Story Bridge, Brisbane, in a 360-degree tiny-planet photograph by Luke Nathan Hayes / I See Infinity.','creator':'Luke Nathan Hayes / I See Infinity','licence':'Strange But True Public Source Licence','licence_url':'LICENCE.md','source_url':'https://iseeinfinity.com/wp-content/uploads/2021/04/123415319_990825808077574_876916776874469367_n_17886778534781199.jpg','source_credit_register':'https://auraofintelligence.github.io/i-C-infinity-music-universe/photo-archive.html','modifications':'Existing 360-degree tiny-planet photographic projection, resized into responsive WebP derivatives. Brisbane context; not a photograph of the candidate property.','width':brisbane.width,'height':brisbane.height}

generated_path=ROOT/'data/generated-image-provenance.json'
generated=json.loads(generated_path.read_text(encoding='utf-8'))
def scrub(value):
    if isinstance(value,dict):
        return {k:scrub(v) for k,v in value.items() if not ('path' in k.lower() and isinstance(v,str) and (':\\' in v or v.startswith('C:/') or v.startswith('G:/')))}
    if isinstance(value,list): return [scrub(v) for v in value]
    return value
generated_path.write_text(json.dumps(scrub(generated),ensure_ascii=False,indent=2),encoding='utf-8')
for slug,caption,alt in [
    ('generated-civic-hub-concept','AI-generated concept of an adapted Australian civic learning and enterprise space.','Adults share a welcoming civic interior with desks, glass meeting rooms and warm evening light.'),
    ('generated-night-learning-concept','AI-generated concept of an evening technical learning session in shared civic space.','Adults work together at a technical learning bench beside illuminated shared rooms at night.')]:
    im=Image.open(ASSETS/f'{slug}-1536.webp')
    registry[slug]={'id':slug,'kind':'concept','title':caption,'alt':alt,'caption':caption,'creator':'AI-generated for Luke Nathan Hayes using OpenAI image generation, 7 November 2026','licence':'Strange But True Public Source Licence','licence_url':'LICENCE.md','source_url':'data/generated-image-provenance.json','width':im.width,'height':im.height}

registry_path=ROOT/'data/images.json'
registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2),encoding='utf-8')
licence_text=(BASE/'installing-the-missing-middle/LICENCE.md').read_text(encoding='utf-8').replace('installing-the-missing-middle','aura-civic-establishment')
(ROOT/'LICENCE.md').write_text(licence_text,encoding='utf-8')
(ROOT/'RIGHTS.md').write_text('''# Rights and attribution

Original content and software: Luke Nathan Hayes / Strange But True / Aura of Intelligence, 2026.

The full Strange But True Public Source Licence is preserved in LICENCE.md. It follows the seven-section text used in Installing the Missing Middle, itself traced to strange-but-true revision b953391fc5596c2e66b3535c45ef6cf6175baa23. Only the project identifiers were changed.

Photographs retain their original licences and attributions in data/images.json and credits.html. CC BY-SA photographs remain CC BY-SA; the project's public-source restrictions do not replace their permissions. Generated concepts are labelled individually. Source prompts and generation metadata are in data/generated-image-provenance.json. Existing concept artwork credits its originating project.

Public discovery through robots.txt, sitemap.xml and llms.txt does not grant additional reuse, commercial or AI-training rights.
''',encoding='utf-8')

brand=ROOT/'assets/brand';brand.mkdir(exist_ok=True)
scale=4
icon=Image.new('RGBA',(256*scale,256*scale),(9,20,41,255)); draw=ImageDraw.Draw(icon)
draw.rounded_rectangle((18*scale,18*scale,238*scale,238*scale),radius=45*scale,outline='#7ea6ff',width=5*scale)
draw.rounded_rectangle((40*scale,40*scale,216*scale,216*scale),radius=28*scale,fill='#264ec4')
font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',110*scale)
box=draw.textbbox((0,0),'24',font=font)
draw.text(((256*scale-(box[2]-box[0]))/2,55*scale),'24',font=font,fill='#fff7df',stroke_width=0)
draw.ellipse((190*scale,23*scale,232*scale,65*scale),fill='#f6ba54')
for size in [32,192,512]:icon.resize((size,size),Image.Resampling.LANCZOS).save(brand/f'icon-{size}.png')
icon.resize((180,180),Image.Resampling.LANCZOS).save(ROOT/'apple-touch-icon.png')
icon.resize((256,256),Image.Resampling.LANCZOS).save(ROOT/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
(ROOT/'.nojekyll').touch()
print(f'Prepared {len(registry)} documented images, favicon variants and full licence')
