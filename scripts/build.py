from pathlib import Path
import html
import json
import re
import xml.etree.ElementTree as ET

R=Path(__file__).resolve().parents[1]
BASE='https://auraofintelligence.github.io/aura-civic-establishment/'
REPO='https://github.com/auraofintelligence/aura-civic-establishment'
DATE='2026-11-08'
images=json.loads((R/'data/images.json').read_text(encoding='utf-8'))
defaults=json.loads((R/'data/default-results.json').read_text(encoding='utf-8'))
refs=json.loads((R/'data/references.json').read_text(encoding='utf-8'))
partners=json.loads((R/'data/partners.json').read_text(encoding='utf-8'))
programmes=json.loads((R/'data/programmes.json').read_text(encoding='utf-8'))
e=html.escape
def link(url,label,cls=''):
    ext=url.startswith('http')
    return f'<a href="{e(url,quote=True)}"'+(f' class="{cls}"' if cls else '')+(' target="_blank" rel="noopener noreferrer"' if ext else '')+f'>{label}</a>'
def section(eyebrow,title,body,cls='',ident=''):
    return f'<section class="section {cls}"'+(f' id="{ident}"' if ident else '')+f'><div class="wrap"><div class="section-heading"><p class="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{body}</div></section>'
def figure(slug,caption=None,cls=''):
    im=images[slug]
    return f'<figure class="image-frame {cls}"><img src="assets/images/{slug}-1536.webp" srcset="assets/images/{slug}-768.webp 768w, assets/images/{slug}-1536.webp 1536w" sizes="(max-width:760px) 100vw, 50vw" width="{im["width"]}" height="{im["height"]}" alt="{e(im["alt"],quote=True)}" loading="lazy"><figcaption>{e(caption or im["caption"])} {link("credits.html#"+slug,"Credit and source")}</figcaption></figure>'
def table(headers,rows):
    return '<div class="table-wrap"><table><thead><tr>'+''.join(f'<th scope="col">{x}</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(f'<td>{x}</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table></div>'
def panels(items):
    return '<div class="grid-3">'+''.join(f'<article class="panel"><span class="number">{i+1:02d}</span><h3>{title}</h3><p>{text}</p>'+link(url,'Explore →','text-link')+'</article>' for i,(title,text,url) in enumerate(items))+'</div>'
def source_line(text):return '<p class="source-inline">'+text+'</p>'
def field(name,label,kind='number',step='1',minimum='0',maximum=None,note='',wide=False,form='capacity'):
    val=defaults['inputs'][form][name]
    attrs=f' type="{kind}" name="{name}" value="{val}" step="{step}" min="{minimum}"'
    if maximum is not None:attrs+=f' max="{maximum}"'
    return f'<label'+(' class="full"' if wide else '')+f'>{label}<input{attrs}>'+ (f'<small>{note}</small>' if note else '')+'</label>'
def metric(key,label,small=''):return f'<div><dt>{label}</dt><dd data-output="{key}">'+str(small)+'</dd></div>'
def tool(form,title,description,fields,resultkey,resultlabel,metrics,formula,note):
    money={'premisesAnnual','staffAnnual','operatingAnnual','renewalAnnual','totalAnnual','incomeAnnual','memberAnnual','fundingGapAnnual','monthlyGap','surplusAnnual','annual','monthly','cumulativeTerm','capital','annualElectricity'}
    def display(key):
        value=defaults['results'][form].get(key,0)
        if key in money:return f'A${value:,.0f}'
        if key in ['memberEquivalents','sessionEquivalents','totalPowerKw']:return f'{value:,.1f}'
        return f'{value:,.0f}'
    metrics=re.sub(r'(data-output="([^"]+)">)[^<]*(</dd>)',lambda m:m.group(1)+display(m.group(2))+m.group(3),metrics)
    return f'<div class="tool-shell" id="tool-{form}"><form class="tool-inputs" data-calculator="{form}"><h3>{title}</h3><p class="small">{description}</p><div class="input-grid">{fields}</div></form><div class="tool-results" data-results="{form}"><p class="eyebrow">Your working scenario</p><div class="result-number" data-output="{resultkey}">{display(resultkey)}</div><p class="result-label">{resultlabel}</p><dl class="metric-list">{metrics}</dl><div class="formula">{formula}</div><p class="tool-note">{note}</p></div></div>'
def toolbar():return '<div class="tool-toolbar"><p>Keep your inputs on this device or take a scenario to another conversation.</p><button type="button" class="button compact" data-save>Save scenario</button><button type="button" class="button secondary compact" data-import>Load scenario</button><button type="button" class="button secondary compact" data-share>Copy scenario link</button><button type="button" class="button tertiary compact" data-reset>Reset</button><input type="file" accept=".json,application/json" data-import-file hidden></div><p class="status" data-scenario-status role="status" aria-live="polite"></p>'

P=[]
def page(file,nav,title,lede,hero,body,eyebrow='Exploring a civic establishment',tag='System in development · Brisbane · 8 November 2026'):
    P.append({'file':file,'nav':nav,'title':title,'lede':lede,'hero':hero,'body':body,'eyebrow':eyebrow,'tag':tag})

# Page content is kept in one source so every navigation and sitemap stays in step.
exec((R/'scripts/page_content.py').read_text(encoding='utf-8'))

def nav(current):
    links=''.join(link(p['file'],e(p['nav'])) .replace('<a ', '<a aria-current="page" ',1) if p['file']==current else link(p['file'],e(p['nav'])) for p in P)
    return '<header class="masthead"><div class="wrap masthead-inner">'+link('index.html','<img src="assets/brand/icon-192.png" alt="" width="43" height="43"><span>Aura civic establishment<small>Shared possibilities. In development.</small></span>','brand')+'<nav class="nav-actions" aria-label="Primary">'+link('overlaps.html','Explore overlaps')+link('capacity.html','Calculators')+link('guide.html','The guide')+'<details class="all-pages"><summary>All pages</summary><div class="nav-drawer">'+links+'<div class="nav-meta">'+link(REPO,'GitHub repository')+link('sources.html','Sources')+'</div></div></details></nav></div></header>'
def hero(p):
    im=images[p['hero']];slug=p['hero']
    title=p['title']
    actions=('<div class="actions">'+link('overlaps.html','Explore the overlaps ↗','button')+link('capacity.html','Try the calculators','button secondary')+'</div>') if p['file']=='index.html' else ''
    return f'<section class="hero'+(' home' if p['file']=='index.html' else '')+f'" aria-label="Page introduction"><picture class="hero-picture"><source media="(max-width:760px)" srcset="assets/images/{slug}-768.webp"><img src="assets/images/{slug}-1536.webp" width="{im["width"]}" height="{im["height"]}" alt="{e(im["alt"],quote=True)}" fetchpriority="high"></picture><div class="hero-shade"></div><div class="wrap hero-copy"><p class="eyebrow">{p["eyebrow"]}</p><h1>{title}</h1><p class="lead">{p["lede"]}</p>{actions}<p class="hero-tag">{p["tag"]}</p></div></section><div class="image-caption"><div class="wrap"><p>{e(im["caption"])}</p>{link("credits.html#"+slug,"Image credit ↗")}</div></div>'
def footer(p,i):
    prev=P[(i-1)%len(P)];nxt=P[(i+1)%len(P)]
    return '<aside class="page-end"><nav class="wrap page-turn" aria-label="Continue reading">'+link(prev['file'],'<small>Previous</small>'+e(prev['nav'])+' ←')+link(nxt['file'],'<small>Next</small>'+e(nxt['nav'])+' →')+'</nav></aside><footer class="footer"><div class="wrap"><div class="footer-top"><p><strong>Aura civic establishment</strong><br>A place-based exploration by Luke Nathan Hayes, Strange But True / Aura of Intelligence. Part of a wider system in development, with possible connections between people, places and ideas.</p><div class="footer-links">'+link('site-map.html','All pages')+link('sources.html','Sources')+link('credits.html','Images')+link('licence.html','Licence')+link(REPO,'GitHub')+'</div></div><div class="footer-bottom"><p>© 2026 Luke Nathan Hayes · Strange But True Public Source Licence</p><p>Working exploration · Updated 8 November 2026</p></div></div></footer><a class="back-top" href="#top" aria-label="Return to top">↑ Top</a>'
for i,p in enumerate(P):
    plain=' '.join(re.sub('<[^>]+>',' ',p['title']).split())
    description=re.sub('<[^>]+>','',p['lede'])
    canonical=BASE+p['file']
    schema={'@context':'https://schema.org','@type':'WebPage','name':plain,'description':description,'url':canonical,'dateModified':DATE,'inLanguage':'en-AU','author':{'@type':'Person','name':'Luke Nathan Hayes'},'isPartOf':{'@type':'WebSite','name':'Aura Civic Establishment','url':BASE}}
    body='<!doctype html>\n<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+e(plain)+' | Aura Civic Establishment</title><meta name="description" content="'+e(description,quote=True)+'"><meta name="theme-color" content="#091429"><link rel="canonical" href="'+canonical+'"><link rel="icon" href="favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="assets/brand/icon-32.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="manifest" href="site.webmanifest"><meta property="og:type" content="website"><meta property="og:title" content="'+e(plain,quote=True)+'"><meta property="og:description" content="'+e(description,quote=True)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+BASE+'assets/images/'+p['hero']+'-1536.webp"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="assets/site.css"><script type="module" src="assets/site.mjs"></script><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('</',r'<\/')+'</script></head><body id="top" data-page="'+p['file']+'"><a class="skip" href="#main">Skip to content</a>'+nav(p['file'])+'<main id="main">'+hero(p)+'<div class="breadcrumb"><div class="wrap">'+link('index.html','Home')+'<span aria-hidden="true">/</span><span>'+e(p['nav'])+'</span></div></div>'+p['body']+'</main>'+footer(p,i)+'</body></html>\n'
    (R/p['file']).write_text(body,encoding='utf-8')

# A useful error page uses the same visual and navigation system.
errorpage=(R/'guide.html').read_text(encoding='utf-8')
errorpage=errorpage.replace('<title>From interest to a site brief | Aura Civic Establishment</title>','<title>Find your way | Aura Civic Establishment</title>')
error_definition={'title':'Find your way','lede':'Follow the complete page guide to the place, the programmes, the tools and the source library.','hero':'csiro-compute','eyebrow':'This route is unavailable','tag':'Aura Civic Establishment · Public planning site','file':'404.html'}
errorbody=hero(error_definition)+section('Choose your route','A useful next page is close by.',panels([('The invitation','Return to the developing civic-place exploration.','index.html'),('The calculators','Explore space, time, costs and resources through an editable scenario.','capacity.html'),('The complete guide','Find every public page and source route.','site-map.html')]))
errorpage=re.sub(r'<main id="main">.*?</main>','<main id="main">'+errorbody+'</main>',errorpage,flags=re.S)
errorpage=errorpage.replace('data-page="guide.html"','data-page="404.html"')
errorpage=errorpage.replace('<link rel="canonical" href="'+BASE+'guide.html">','<meta name="robots" content="noindex">')
(R/'404.html').write_text(errorpage,encoding='utf-8')
ns='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',ns)
tree=ET.Element('{'+ns+'}urlset')
for p in P:
    u=ET.SubElement(tree,'{'+ns+'}url');ET.SubElement(u,'{'+ns+'}loc').text=BASE+p['file'];ET.SubElement(u,'{'+ns+'}lastmod').text=DATE
(R/'sitemap.xml').write_bytes(ET.tostring(tree,encoding='utf-8',xml_declaration=True))
(R/'robots.txt').write_text('# Project-path file. Origin-wide crawler rules belong at https://auraofintelligence.github.io/robots.txt\n# Public discovery does not grant reuse or training rights beyond LICENCE.md.\nSitemap: '+BASE+'sitemap.xml\n',encoding='utf-8')
(R/'llms.txt').write_text('# Aura Civic Establishment\n\nAn exploration of 24/7 overlap and shared spaces with KYC in Brisbane by Luke Nathan Hayes / Strange But True. Everything is still a system in development. 433 Logan Road, Stones Corner is a candidate location. There is no confirmed Dunwich programme. Linked websites and repositories document developing proposals, not confirmed programmes, partnerships or operating arrangements. Calculator outputs are editable planning scenarios. Personal Auras belong to their people; C-Hour has no monetary equivalent.\n\nRead the dated source context and preserve distinctions between historic evidence, developing author proposals and scenario assumptions. Discovery does not grant commercial or AI-training rights.\n\n'+ '\n'.join('- ['+p['nav']+']('+BASE+p['file']+')' for p in P)+'\n\n- [Licence]('+BASE+'LICENCE.md)\n- [Public source catalogue]('+BASE+'data/references.json)\n- [Formula source]('+BASE+'assets/model.mjs)\n',encoding='utf-8')
(R/'site.webmanifest').write_text(json.dumps({'name':'Aura Civic Establishment','short_name':'Aura Civic','description':'An exploration of a possible 24/7 shared civic place within a system in development.','start_url':'./index.html','scope':'./','display':'standalone','background_color':'#091429','theme_color':'#091429','icons':[{'src':'assets/brand/icon-192.png','sizes':'192x192','type':'image/png'},{'src':'assets/brand/icon-512.png','sizes':'512x512','type':'image/png'}]},indent=2),encoding='utf-8')
(R/'data/pages.json').write_text(json.dumps([{k:p[k] for k in ['file','nav','hero']} for p in P],indent=2),encoding='utf-8')
print(f'Built {len(P)} public pages, 404, complete navigation, source catalogue and discovery files')
