import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
const { context, page } = await launchX();
await page.goto('https://x.com/gl1tchbased', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
let imgQuote=0, txtQuote=0;
for (const a of (await page.locator(S.tweet).all()).slice(0,8)) {
  const t=await a.locator(S.tweetText).first().innerText().catch(()=>'');
  if(/obeys|escaped/i.test(t)){ const hasImg=await a.locator('[data-testid="tweetPhoto"] img').count().catch(()=>0); if(hasImg)imgQuote++; else txtQuote++; }
}
console.log('image-quote posts:', imgQuote, '| text-quote posts:', txtQuote);
await context.close(); process.exit(0);
