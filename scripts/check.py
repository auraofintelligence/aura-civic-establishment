from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import json
import re
import sys
import xml.etree.ElementTree as ET

r=Path(__file__).resolve().parents[1]
errors=[]
class Page(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.ids=[];self.links=[];self.images=[];self.h1=0;self.canonical=[];self.title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='h1':self.h1+=1
        if tag=='title':self.title=True
        for key in ['href','src']:
            if a.get(key):self.links.append(a[key])
        if tag=='img':self.images.append(a)
        if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
pages=json.loads((r/'data/pages.json').read_text(encoding='utf-8'))
parsed={}
for file in r.glob('*.html'):
    p=Page();text=file.read_text(encoding='utf-8');p.feed(text);parsed[file.name]=p
    if p.h1!=1:errors.append(f'{file.name}: expected one h1, got {p.h1}')
    if len(p.ids)!=len(set(p.ids)):errors.append(f'{file.name}: duplicate IDs')
    if not p.title:errors.append(f'{file.name}: title missing')
    if file.name!='404.html' and len(p.canonical)!=1:errors.append(f'{file.name}: canonical missing')
    if '—' in text:errors.append(f'{file.name}: em dash in copy')
    if re.search(r'(?:C:|L:)[/\\]|Aura2020|source_original_path',text):errors.append(f'{file.name}: private local path')
    if any('alt' not in a or not a.get('width') or not a.get('height') for a in p.images):errors.append(f'{file.name}: image attributes incomplete')
for name,p in parsed.items():
    for href in p.links:
        u=urlparse(href)
        if u.scheme or u.netloc or href.startswith('//'):continue
        path=unquote(u.path)
        target=(r/name).parent/path if path else r/name
        if not target.exists():errors.append(f'{name}: missing {href}');continue
        if u.fragment and target.suffix=='.html':
            key=target.name
            if key in parsed and u.fragment not in parsed[key].ids:errors.append(f'{name}: missing anchor {href}')
    if name!='404.html':
        for page in pages:
            if page['file'] not in p.links:errors.append(f'{name}: nav missing {page["file"]}')
heroes=[p['hero'] for p in pages]
if len(heroes)!=len(set(heroes)):errors.append('Public page heroes are not distinct')
for file in (r/'data').glob('*.json'):
    text=file.read_text(encoding='utf-8');json.loads(text)
    if re.search(r'(?:C:|L:)[/\\]|Aura2020|source_original_path',text):errors.append(f'{file.name}: private local path')
for name in ['robots.txt','sitemap.xml','llms.txt','LICENCE.md','RIGHTS.md','AI-TRANSPARENCY.md','favicon.ico','site.webmanifest','downloads/site-brief-template.json']:
    if not (r/name).is_file():errors.append(f'Missing publication file {name}')
sm=ET.parse(r/'sitemap.xml')
if len(sm.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'))!=len(pages):errors.append('Sitemap count mismatch')
images=json.loads((r/'data/images.json').read_text(encoding='utf-8'))
for key,im in images.items():
    if im.get('kind')=='photograph' and not all(im.get(k) for k in ['creator','licence','licence_url']):errors.append(f'Incomplete photo credit {key}')
    for size in [768,1536]:
        if not (r/f'assets/images/{key}-{size}.webp').is_file():errors.append(f'Missing image {key}-{size}')
report={'pages':len(pages),'html_files':len(parsed),'documented_images':len(images),'errors':errors}
checks=r/'checks';checks.mkdir(exist_ok=True);(checks/'static-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
if errors:sys.exit(1)
