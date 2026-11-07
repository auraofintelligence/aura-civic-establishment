const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const modulePath=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=require(modulePath);
const root=path.resolve(__dirname,'..');const output=path.join(root,'checks');fs.mkdirSync(output,{recursive:true});
const base=process.env.SITE_URL||'http://127.0.0.1:8768/';const pages=JSON.parse(fs.readFileSync(path.join(root,'data/pages.json'),'utf8'));
let activeBrowser;
(async()=>{
 const browser=activeBrowser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const errors=[];const results=[];const runtimeErrors=[];
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});const page=await context.newPage();
  page.on('pageerror',err=>runtimeErrors.push(String(err)));
  for(const entry of pages){
   const response=await page.goto(base+entry.file,{waitUntil:'networkidle'});
   await page.locator('img').evaluateAll(async imgs=>{for(const im of imgs)im.loading='eager';await Promise.race([Promise.all(imgs.map(im=>im.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,5000))]);});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   const bad=await page.locator('img').evaluateAll(imgs=>imgs.filter(im=>im.naturalWidth===0).map(im=>im.getAttribute('src')));
   if(response.status()!==200)errors.push(`${entry.file} returned ${response.status()}`);
   if(overflow)errors.push(`${entry.file} horizontal overflow at ${width}px`);
   if(bad.length)errors.push(`${entry.file} broken images ${bad.join(', ')}`);
   results.push({page:entry.file,width,status:response.status(),overflow,brokenImages:bad});
   if(['index.html','capacity.html','economics.html','overlaps.html','partners.html','access.html'].includes(entry.file))await page.screenshot({path:path.join(output,`${entry.file.replace('.html','')}-${width}.png`),fullPage:true});
  }
  await page.goto(base+'index.html');await page.locator('.all-pages summary').click();assert.equal(await page.locator('.all-pages').getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await page.locator('.all-pages').getAttribute('open'),null);
  assert.equal(await page.locator('[data-day]').count(),0);
  assert.match(await page.locator('main').innerText(),/system is still in development/);
  await page.goto(base+'capacity.html',{waitUntil:'networkidle'});
  await page.locator('[data-calculator="capacity"] input[name="area"]').fill('1000');
  await page.waitForFunction(()=>document.querySelector('[data-results="capacity"] [data-output="planningPeople"]').textContent.trim()==='58');
  await page.locator('[data-reset]').click();await page.waitForFunction(()=>document.querySelector('[data-results="capacity"] [data-output="planningPeople"]').textContent.trim()==='291');
  await page.locator('[data-calculator="rooms"] input[name="sessionHours"]').fill('1');
  await page.waitForFunction(()=>document.querySelector('[data-results="rooms"] [data-output="wholeSessions"]').textContent.trim()==='258');
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-save]').click();const download=await downloadPromise;const downloadPath=await download.path();const scenario=JSON.parse(fs.readFileSync(downloadPath,'utf8'));assert.equal(scenario.version,1);assert.equal(Object.keys(scenario.inputs).length,5);
  await page.locator('[data-import-file]').setInputFiles({name:'scenario.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...scenario,inputs:{...scenario.inputs,capacity:{...scenario.inputs.capacity,area:2000}}}))});
  await page.waitForFunction(()=>document.querySelector('[data-results="capacity"] [data-output="planningPeople"]').textContent.trim()==='116');
  await page.goto(base+'economics.html',{waitUntil:'networkidle'});
  assert.match(await page.locator('[data-results="economics"] [data-output="fundingGapAnnual"]').innerText(),/524,000/);
  await page.locator('[data-calculator="economics"] input[name="memberMonthly"]').fill('0');await page.waitForFunction(()=>/fee/i.test(document.querySelector('[data-results="economics"] [data-output="breakEvenMembers"]').textContent));
  await page.locator('[data-calculator="lease"] input[name="year"]').fill('1');await page.waitForFunction(()=>/483,333/.test(document.querySelector('[data-results="lease"] [data-output="monthly"]').textContent));
  await page.goto(base+'sources.html',{waitUntil:'networkidle'});await page.locator('[data-source-query]').fill('teacher training');assert.ok(await page.locator('[data-source-item]:visible').count()>=1);await page.locator('[data-source-query]').fill('zzzz-no-such-source');assert.equal(await page.locator('[data-source-item]:visible').count(),0);assert.equal(await page.locator('[data-source-empty]').isVisible(),true);
  await page.goto(base+'overlaps.html',{waitUntil:'networkidle'});for(const cb of await page.locator('[data-programme]').all())await cb.uncheck();assert.match(await page.locator('[data-overlap-result]').innerText(),/choose|select/i);await page.locator('[data-programme="women"]').check();await page.locator('[data-programme="teaching"]').check();assert.match(await page.locator('[data-overlap-result]').innerText(),/Shared desks|Teaching rooms/i);
  await page.goto(base+'access.html',{waitUntil:'networkidle'});await page.locator('[data-access-space]').selectOption('compute');assert.match(await page.locator('[data-access-result]').innerText(),/technical|operator|restricted/i);
  await page.goto(base+'guide.html',{waitUntil:'networkidle'});await page.locator('[data-guide-check]').first().check();assert.match(await page.locator('[data-guide-count]').innerText(),/1 of 10/);
  await context.close();
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});const plain=await nojs.newPage();await plain.goto(base+'capacity.html');assert.match(await plain.locator('[data-results="capacity"] [data-output="planningPeople"]').innerText(),/291/);assert.match(await plain.locator('[data-results="capacity"] [data-output="availableDeskHours"]').innerText(),/6,720/);await plain.locator('.all-pages summary').click();assert.equal(await plain.locator('.nav-drawer').isVisible(),true);await nojs.close();
 await browser.close();
 const report={pageChecks:results,interactionWidths:[390,1440],runtimeErrors:[...new Set(runtimeErrors)],errors};fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pageChecks:results.length,runtimeErrors:report.runtimeErrors,errors},null,2));if(errors.length||runtimeErrors.length)process.exitCode=1;
})().catch(async err=>{console.error(err.stack||err);if(activeBrowser)await activeBrowser.close().catch(()=>{});process.exitCode=1;});
