const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(3000);
  
  const beforeClick = await page.evaluate(() => {
    const scene = window.game?.scene?.getScene('GameScene');
    return { enemies: scene?.enemies?.getLength() || 0 };
  });
  
  await page.click('#start-wave');
  await page.waitForTimeout(2000);
  
  const afterClick = await page.evaluate(() => {
    const scene = window.game?.scene?.getScene('GameScene');
    return { enemies: scene?.enemies?.getLength() || 0 };
  });
  
  console.log('Before:', beforeClick.enemies, 'After:', afterClick.enemies);
  console.log(afterClick.enemies > 0 ? '✅ PASS' : '❌ FAIL');
  
  await browser.close();
})();
