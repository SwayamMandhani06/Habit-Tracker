import { chromium } from '@playwright/test'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function run() {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:3000/login')
  await page.fill('input[type="email"]', 'audit_test_verify_882@gmail.com')
  await page.fill('input[type="password"]', 'Password123!')
  await page.click('#auth-submit')
  await page.waitForURL('**/dashboard')
  await page.goto('http://localhost:3000/today')
  await page.waitForTimeout(1000)
  const targets = await page.evaluate(() => {
    const list = []
    document.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && (r.width < 43.5 || r.height < 43.5)) {
        list.push({ tag: el.tagName, text: el.textContent?.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height), class: el.className })
      }
    })
    return list
  })
  console.log('Today page small targets (total:', targets.length, '):')
  console.log(targets.slice(0, 15))
  await browser.close()
}

run().catch(console.error)
