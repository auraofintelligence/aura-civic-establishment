from pathlib import Path
import shutil

r=Path(__file__).resolve().parents[1]
out=r/'_site'
out.mkdir(exist_ok=True)
for path in r.glob('*.html'):shutil.copy2(path,out/path.name)
for name in ['.nojekyll','favicon.ico','apple-touch-icon.png','site.webmanifest','robots.txt','sitemap.xml','llms.txt','LICENCE.md','RIGHTS.md','AI-TRANSPARENCY.md']:
    shutil.copy2(r/name,out/name)
for name in ['assets','data','downloads']:
    shutil.copytree(r/name,out/name,dirs_exist_ok=True)
print('Packaged explicit public static output in _site')
