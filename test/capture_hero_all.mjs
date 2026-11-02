import { chromium } from '@playwright/test'
import path from 'path'

const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d6f4bda-2512-452b-ab07-21635d0d612b'

const viewports = [
  { width: 1440, height: 900, name: '1440' },
  { width: 1024, height: 768, name: '1024' },
  { width: 768, height: 1024, name: '768' },
  { width: 390, height: 844, name: '390' },
]

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  })

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Check light theme
    await page.evaluate(() => document.documentElement.removeAttribute('data-theme'))
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(artifactDir, `screenshot-hero-${vp.name}-light.png`), fullPage: false })

    // Check dark theme
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(artifactDir, `screenshot-hero-${vp.name}-dark.png`), fullPage: false })

    const scrollCheck = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      pass: document.documentElement.scrollWidth <= window.innerWidth
    }))
    console.log(`Viewport ${vp.name}: scroll check:`, scrollCheck)

    await page.close()
  }

  await browser.close()
  console.log('All 8 screenshots captured successfully!')
}

run().catch(console.error)
