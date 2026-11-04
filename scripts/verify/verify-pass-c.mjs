import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d6f4bda-2512-452b-ab07-21635d0d612b'

const viewports = [
  { name: '320x568 (iPhone SE)', width: 320, height: 568 },
  { name: '375x812 (iPhone 12 Mini)', width: 375, height: 812 },
  { name: '390x844 (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7)', width: 412, height: 915 },
]

const testRoutes = [
  '/',
  '/dashboard',
  '/today',
  '/calendar',
  '/grid',
  '/focus',
  '/insights',
  '/review',
  '/settings',
]

async function run() {
  console.log('=== FIX PASS C: AUTOMATED VERIFICATION ===')

  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
  })

  // 1. First test unauthenticated (/) and login to get auth cookies
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  console.log('Signing in to establish session...')
  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(600)
  await page.fill('input[type="email"]', 'audit_test_verify_882@gmail.com')
  await page.fill('input[type="password"]', 'Password123!')
  await page.click('#auth-submit')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('Signed in successfully!')

  // 2. Element-level overflow test across 4 viewports
  console.log('\n--- 1. ELEMENT-LEVEL OVERFLOW AUDIT ---')
  const overflowResults = []

  for (const vp of viewports) {
    console.log(`\nTesting viewport ${vp.name}...`)
    await page.setViewportSize({ width: vp.width, height: vp.height })

    for (const route of testRoutes) {
      await page.goto(`http://localhost:3000${route}`)
      await page.waitForTimeout(800)

      // Inject simulated safe area overrides (50px)
      await page.addStyleTag({
        content: `
          :root {
            --safe-top: 50px !important;
            --safe-bottom: 50px !important;
          }
        `,
      })
      await page.waitForTimeout(300)

      // Test element-level overflow
      const overflowDetails = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth
        const failingElements = []
        const allElements = Array.from(document.querySelectorAll('*'))

        for (const el of allElements) {
          const style = window.getComputedStyle(el)
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0'
          )
            continue

          const rect = el.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) continue

          const parent = el.parentElement
          if (!parent) continue
          const parentStyle = window.getComputedStyle(parent)
          const parentOverflowX = parentStyle.overflowX

          // If element is absolute/fixed and pointer-events: none (e.g. decorative ring or glow), skip unless it blows out document width
          const isAbsolute = style.position === 'absolute' || style.position === 'fixed'

          // If parent allows horizontal scroll or clips, it's not a layout leak
          const isScrollContainer =
            parentOverflowX === 'auto' ||
            parentOverflowX === 'scroll' ||
            parentOverflowX === 'hidden'

          // Check if right edge exceeds parent by > 1.5px (when parent is not scroll container)
          if (!isScrollContainer && !isAbsolute) {
            const parentRect = parent.getBoundingClientRect()
            if (rect.right - parentRect.right > 1.5 && parentRect.width > 0) {
              failingElements.push({
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString().slice(0, 40),
                rectRight: Math.round(rect.right * 10) / 10,
                parentRight: Math.round(parentRect.right * 10) / 10,
                diff: Math.round((rect.right - parentRect.right) * 10) / 10,
                type: 'exceeds-parent',
              })
              if (failingElements.length >= 5) break
            }
          }

          // Check viewport blowout: any element passing docWidth
          if (rect.right > docWidth + 1.5 && !style.transform?.includes('matrix3d')) {
            failingElements.push({
              tag: el.tagName.toLowerCase(),
              className: (el.className || '').toString().slice(0, 40),
              rectRight: Math.round(rect.right * 10) / 10,
              docWidth,
              diff: Math.round((rect.right - docWidth) * 10) / 10,
              type: 'exceeds-viewport',
            })
            if (failingElements.length >= 5) break
          }

          // Check scrollWidth > clientWidth for non-scroll containers
          if (
            !isAbsolute &&
            style.overflowX !== 'auto' &&
            style.overflowX !== 'scroll' &&
            style.overflowX !== 'hidden' &&
            style.overflow !== 'hidden'
          ) {
            if (el.scrollWidth > el.clientWidth + 1.5 && el.clientWidth > 0) {
              if (rect.right > docWidth + 1.0) {
                failingElements.push({
                  tag: el.tagName.toLowerCase(),
                  className: (el.className || '').toString().slice(0, 40),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  type: 'scrollWidth-exceeds-doc',
                })
                if (failingElements.length >= 5) break
              }
            }
          }
        }

        return {
          pageScrollWidth: document.documentElement.scrollWidth,
          pageClientWidth: docWidth,
          failingCount: failingElements.length,
          failingElements,
        }
      })

      const passed =
        overflowDetails.failingCount === 0 &&
        overflowDetails.pageScrollWidth <= overflowDetails.pageClientWidth + 1.0

      overflowResults.push({
        viewport: vp.name,
        route,
        passed,
        ...overflowDetails,
      })

      console.log(
        `  ${route.padEnd(12)} -> ${passed ? '✓ PASS' : '✗ FAIL'} (scroll: ${overflowDetails.pageScrollWidth}/${overflowDetails.pageClientWidth}, element violations: ${overflowDetails.failingCount})`
      )
    }
  }

  // 3. Evidence Screenshots & Computed Styles at 375x812
  console.log('\n--- 2. EVIDENCE SCREENSHOTS & COMPUTED STYLES (375x812) ---')
  await page.setViewportSize({ width: 375, height: 812 })

  // Function to set theme
  async function setTheme(theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t)
      document.documentElement.classList.toggle('dark', t === 'dark')
      localStorage.setItem('theme', t)
    }, theme)
    await page.waitForTimeout(400)
  }

  // Function to measure dot computed styles
  async function getDotMetrics() {
    return await page.evaluate(() => {
      const body = document.body
      const s = window.getComputedStyle(body)
      const dotColorVar = getComputedStyle(document.documentElement).getPropertyValue('--dot-color').trim()
      const bgBaseVar = getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim()
      return {
        backgroundImage: s.backgroundImage,
        backgroundSize: s.backgroundSize,
        backgroundColor: s.backgroundColor,
        dotColorVar,
        bgBaseVar,
      }
    })
  }

  // A. Homepage Hero Light & Dark
  await page.goto('http://localhost:3000/')
  await setTheme('light')
  const heroLightMetrics = await getDotMetrics()
  const heroLightPath = path.join(outDir, 'screenshot-pass-c-hero-375-light.png')
  await page.screenshot({ path: heroLightPath, fullPage: false })
  console.log('Saved Homepage Hero Light:', heroLightPath)

  await setTheme('dark')
  const heroDarkMetrics = await getDotMetrics()
  const heroDarkPath = path.join(outDir, 'screenshot-pass-c-hero-375-dark.png')
  await page.screenshot({ path: heroDarkPath, fullPage: false })
  console.log('Saved Homepage Hero Dark:', heroDarkPath)

  // B. Today Screen Light & Dark
  await page.goto('http://localhost:3000/today')
  await setTheme('light')
  const todayLightPath = path.join(outDir, 'screenshot-pass-c-today-375-light.png')
  await page.screenshot({ path: todayLightPath, fullPage: false })
  console.log('Saved Today Screen Light:', todayLightPath)

  await setTheme('dark')
  const todayDarkPath = path.join(outDir, 'screenshot-pass-c-today-375-dark.png')
  await page.screenshot({ path: todayDarkPath, fullPage: false })
  console.log('Saved Today Screen Dark:', todayDarkPath)

  // C. Dashboard Screen Light & Dark
  await page.goto('http://localhost:3000/dashboard')
  await setTheme('light')
  const dashLightPath = path.join(outDir, 'screenshot-pass-c-dash-375-light.png')
  await page.screenshot({ path: dashLightPath, fullPage: false })
  console.log('Saved Dashboard Screen Light:', dashLightPath)

  await setTheme('dark')
  const dashDarkPath = path.join(outDir, 'screenshot-pass-c-dash-375-dark.png')
  await page.screenshot({ path: dashDarkPath, fullPage: false })
  console.log('Saved Dashboard Screen Dark:', dashDarkPath)

  // D. Zoomed Background Dot Crop (Dark & Light)
  await page.setViewportSize({ width: 375, height: 300 })
  await page.goto('http://localhost:3000/today')
  await setTheme('dark')
  const dotsDarkCropPath = path.join(outDir, 'screenshot-pass-c-dots-crop-dark.png')
  await page.screenshot({ path: dotsDarkCropPath, clip: { x: 50, y: 50, width: 120, height: 120 } })
  console.log('Saved Dots Dark Crop:', dotsDarkCropPath)

  await setTheme('light')
  const dotsLightCropPath = path.join(outDir, 'screenshot-pass-c-dots-crop-light.png')
  await page.screenshot({ path: dotsLightCropPath, clip: { x: 50, y: 50, width: 120, height: 120 } })
  console.log('Saved Dots Light Crop:', dotsLightCropPath)

  // 4. Verify Habit Card Below 480px Layout & Touch Targets
  console.log('\n--- 3. HABIT CARD 375px TOUCH TARGET & LAYOUT AUDIT ---')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('http://localhost:3000/today')
  await page.waitForTimeout(600)

  const habitCardAudit = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-habit-card="true"], .group\\/card'))
    const habitCardsInfo = []

    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect()
      const buttons = Array.from(card.querySelectorAll('button, a'))
      const touchTargets = buttons.map(b => {
        const r = b.getBoundingClientRect()
        return {
          ariaLabel: b.getAttribute('aria-label') || b.textContent?.trim().slice(0, 15),
          width: Math.round(r.width * 10) / 10,
          height: Math.round(r.height * 10) / 10,
          valid: r.width >= 43.5 && r.height >= 43.5,
        }
      })

      const nameEl = card.querySelector('h4, a')
      const nameRect = nameEl ? nameEl.getBoundingClientRect() : null

      habitCardsInfo.push({
        idx,
        cardWidth: Math.round(cardRect.width),
        nameWidth: nameRect ? Math.round(nameRect.width) : 0,
        touchTargets,
      })
    })

    return habitCardsInfo
  })

  console.log(`Audited ${habitCardAudit.length} habit cards on Today screen.`)
  habitCardAudit.slice(0, 3).forEach(c => {
    console.log(`Card ${c.idx} (width: ${c.cardWidth}px): targets ->`, c.touchTargets.map(t => `${t.ariaLabel}: ${t.width}x${t.height} (${t.valid ? 'OK' : 'FAIL'})`).join(', '))
  })

  // 5. Verify Copy & Nav on Homepage
  console.log('\n--- 4. HOMEPAGE TRUST ROW & HERO VERIFICATION ---')
  await page.goto('http://localhost:3000/')
  const copyCheck = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      hasFreeToStart: text.includes('Free To Start:') && text.includes('No credit card, no paywall.'),
      hasPrivate: text.includes('Private To Your Account:') && text.includes('Only you can see your habits and notes.'),
      hasWorksPhone: text.includes('Works On Phone And Laptop:') && text.includes('Installable, and your data follows your account across devices.'),
      heroCtaText: document.querySelector('a[href*="/login"], a[href*="/dashboard"]')?.textContent || '',
    }
  })
  console.log('Copy verification:', copyCheck)

  // 6. Dot Metrics Summary
  console.log('\n--- 5. BACKGROUND DOT METRICS ---')
  console.log('Light Mode:', heroLightMetrics)
  console.log('Dark Mode:', heroDarkMetrics)

  await browser.close()
  console.log('\n=== ALL PASS C VERIFICATIONS COMPLETE ===')
}

run().catch((err) => {
  console.error('Audit run error:', err)
  process.exit(1)
})

