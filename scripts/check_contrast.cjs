const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..')+path.sep;
const base=process.env.SITE_URL||'http://127.0.0.1:8770/';
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const failures=[];
 for(const entry of JSON.parse(fs.readFileSync(root+'data/pages.json','utf8'))){
  await page.goto(base+entry.file,{waitUntil:'networkidle'});
  const issues=await page.evaluate(()=>{
   const rgb=s=>s.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];
   const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   const output=[];
   const walker=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const text=walker.currentNode.textContent.trim();const el=walker.currentNode.parentElement;
    if(!text||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden'||el.closest('.hero, option, [hidden]'))continue;
    const style=getComputedStyle(el);let parent=el,bg=null,skip=false;
    while(parent){const s=getComputedStyle(parent);if(s.backgroundImage!=='none'){skip=true;break;}const c=rgb(s.backgroundColor);if(c.length<4||c[3]===1){bg=c;break;}if(c[3]>0){skip=true;break;}parent=parent.parentElement;}
    if(skip||!bg)continue;
    const fg=rgb(style.color),value=ratio(fg,bg),large=parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseInt(style.fontWeight)>=700);
    if(value+0.01<(large?3:4.5))output.push({text:text.slice(0,85),selector:el.tagName.toLowerCase()+'.'+el.className,ratio:Number(value.toFixed(2)),foreground:style.color,background:bg.join(',')});
   }
   return output;
  });
  if(issues.length)failures.push({page:entry.file,issues});
 }
 // This check covers visible text on opaque solid backgrounds. Hero photographs,
 // gradients and translucent backgrounds require separate visual inspection.
 fs.mkdirSync(root+'checks',{recursive:true});
 fs.writeFileSync(root+'checks/contrast-audit.json',JSON.stringify(failures,null,2));
 console.log(JSON.stringify({scope:'Visible main-content text on solid backgrounds',failures},null,2));
 if(failures.length)process.exitCode=1;
 await browser.close();
})().catch(async err=>{if(browser)await browser.close();console.error(err);process.exitCode=1;});
