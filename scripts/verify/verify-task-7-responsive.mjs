import { chromium } from '@playwright/test'
import fs from 'fs'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const viewports = [
  { name: '320px', width: 320, height: 568 },
  { name: '375px', width: 375, height: 812 },
  { name: '390px', width: 390, height: 844 },
  { name: '412px', width: 412, height: 915 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1024px', width: 1024, height: 768 },
  { name: '1440px', width: 1440, height: 900 },
]

const routes = ['/', '/login']

async function main() {
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
  })

  console.log('=== TASK 7.E: RESPONSIVE & ACCESSIBILITY AUDIT ===\n')

  // 1. OVERFLOW ACROSS ALL 7 VIEWPORTS (LIGHT & DARK)
  console.log('--- 1. OVERFLOW TEST (320, 375, 390, 412, 768, 1024, 1440) ---')
  for (const vp of viewports) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      })
      const page = await context.newPage()

      for (const route of routes) {
        await page.goto(`http://localhost:3000${route}`)
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t)
          document.documentElement.classList.toggle('dark', t === 'dark')
        }, theme)
        await page.waitForTimeout(300)

        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.clientWidth
          const scrollW = document.documentElement.scrollWidth
          return {
            scrollW,
            docW,
            hasOverflow: scrollW > docW + 1.0,
          }
        })

        const status = overflow.hasOverflow ? 'FAIL' : 'PASS'
        console.log(`[${vp.name} | ${theme.padEnd(5)}] ${route.padEnd(8)} -> ${status} (scroll: ${overflow.scrollW}/${overflow.docW})`)
      }
      await context.close()
    }
  }

  // 2. FIVE SMALLEST TAP TARGETS AT 375PX
  console.log('\n--- 2. FIVE SMALLEST TAP TARGETS AT 375PX ---')
  const ctx375 = await browser.newContext({ viewport: { width: 375, height: 812 } })
  const page375 = await ctx375.newPage()
  await page375.goto('http://localhost:3000/')
  await page375.waitForTimeout(500)

  const targets = await page375.evaluate(() => {
    const clickable = Array.from(document.querySelectorAll('button, a, input, select'))
      .filter((el) => {
        const style = window.getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      })
      .map((el) => {
        const r = el.getBoundingClientRect()
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || '').trim().slice(0, 30),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          area: Math.round(r.width * r.height),
        }
      })
      .sort((a, b) => a.area - b.area)

    return clickable.slice(0, 5)
  })

  console.log('5 Smallest Interactive Targets on Homepage at 375px:')
  targets.forEach((t, i) => {
    console.log(`  #${i + 1}: <${t.tag}> "${t.text}" -> ${t.width}x${t.height}px (area: ${t.area}px²)`)
  })

  // 3. INPUT FONT SIZES (MUST BE >= 16PX)
  console.log('\n--- 3. INPUT FONT SIZES (IOS 16PX MINIMUM TEST) ---')
  await page375.goto('http://localhost:3000/login')
  await page375.waitForTimeout(500)

  const inputStyles = await page375.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'))
    return inputs.map((inp) => {
      const s = window.getComputedStyle(inp)
      return {
        type: inp.getAttribute('type') || 'text',
        name: inp.getAttribute('name') || inp.getAttribute('id') || '',
        fontSize: parseFloat(s.fontSize),
        fontSizeRaw: s.fontSize,
      }
    })
  })

  let allInputsPass = true
  inputStyles.forEach((inp) => {
    const pass = inp.fontSize >= 16.0
    if (!pass) allInputsPass = false
    console.log(`  Input [${inp.type}] (${inp.name}): ${inp.fontSizeRaw} -> ${pass ? 'PASS (>= 16px)' : 'FAIL (< 16px)'}`)
  })
  console.log(`Input 16px test result: ${allInputsPass ? 'PASS' : 'FAIL'}`)

  await ctx375.close()
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

