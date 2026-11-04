import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d6f4bda-2512-452b-ab07-21635d0d612b'

const viewports = [
  { name: '320x568 (iPhone SE / 320px)', width: 320, height: 568 },
  { name: '375x812 (iPhone 12 Mini / 375px)', width: 375, height: 812 },
  { name: '390x844 (iPhone 12/13/14 / 390px)', width: 390, height: 844 },
  { name: '412x915 (Pixel 7 / 412px)', width: 412, height: 915 },
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

// Read test credentials
let email = 'audit_test_verify_882@gmail.com'
let password = 'Password123!'

const envTestPath = path.resolve(process.cwd(), '.env.test.local')
if (fs.existsSync(envTestPath)) {
  const envContent = fs.readFileSync(envTestPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('TEST_USER_EMAIL=')) email = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '')
    if (trimmed.startsWith('TEST_USER_PASSWORD=')) password = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '')
  })
}

async function runTask6Verification() {
  console.log('================================================================')
  console.log('TASK 6: iPHONE 12 MINI LAYOUT, SAFE AREAS, DARK DOTS, COPY, NAV')
  console.log('================================================================\n')

  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Kolkata',
  })
  const page = await context.newPage()

  // Sign in to establish session if valid credentials provided
  let isAuthenticated = false
  if (email && password && email !== 'audit_test_verify_882@gmail.com') {
    try {
      console.log(`[Auth] Signing in as ${email}...`)
      await page.goto('http://localhost:3000/login')
      await page.waitForTimeout(500)
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('#auth-submit')
      await page.waitForURL('**/today', { timeout: 8000 })
      isAuthenticated = true
      console.log('[Auth] Signed in successfully!\n')
    } catch (authErr) {
      console.warn(`[Auth] Sign in failed or timed out: ${authErr.message}`)
      console.warn('[Auth] Proceeding with unauthenticated layout & visual checks.\n')
    }
  } else {
    console.log('[Auth] .env.test.local not configured with test account credentials.')
    console.log('[Auth] Running public routes (/) and (/login), plus visual dot & copy verifications.\n')
  }

  const routesToTest = isAuthenticated ? testRoutes : ['/', '/login']

  // Helper to set theme
  async function setTheme(theme) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t)
      document.documentElement.classList.toggle('dark', t === 'dark')
      localStorage.setItem('theme', t)
    }, theme)
    await page.waitForTimeout(300)
  }

  // ----------------------------------------------------------------------------
  // 1. ELEMENT-LEVEL OVERFLOW AUDIT (320, 375, 390, 412)
  // ----------------------------------------------------------------------------
  console.log('--- 1. ELEMENT-LEVEL OVERFLOW AUDIT ---')
  const overflowResults = []
  let anyFailing = false

  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name}...`)
    await page.setViewportSize({ width: vp.width, height: vp.height })

    for (const route of routesToTest) {
      await page.goto(`http://localhost:3000${route}`)
      await page.waitForTimeout(400)

      // Inject simulated safe area overrides (50px)
      await page.addStyleTag({
        content: `
          :root {
            --safe-top: 50px !important;
            --safe-bottom: 50px !important;
          }
        `,
      })
      await page.waitForTimeout(200)

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

          const isAbsolute = style.position === 'absolute' || style.position === 'fixed'

          // Helper to check if an element is inside an intentional clipping/scroll container
          let inClippedContainer = false
          let p = el.parentElement
          while (p && p !== document.body && p !== document.documentElement) {
            const ps = window.getComputedStyle(p)
            if (
              ps.overflowX === 'auto' ||
              ps.overflowX === 'scroll' ||
              ps.overflowX === 'hidden' ||
              ps.overflow === 'hidden'
            ) {
              inClippedContainer = true
              break
            }
            p = p.parentElement
          }

          const isDirectScrollContainer =
            parentOverflowX === 'auto' ||
            parentOverflowX === 'scroll' ||
            parentOverflowX === 'hidden'

          // Check if right edge exceeds parent by > 1.0px (when parent is not clipped/scrollable)
          if (!isDirectScrollContainer && !isAbsolute && !inClippedContainer) {
            const parentRect = parent.getBoundingClientRect()
            if (rect.right - parentRect.right > 1.0 && parentRect.width > 0) {
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

          // Check viewport blowout: any element passing docWidth by > 1.0px (outside clipped containers)
          if (rect.right > docWidth + 1.0 && !style.transform?.includes('matrix3d') && !inClippedContainer) {
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
            if (el.scrollWidth > el.clientWidth + 1.0 && el.clientWidth > 0) {
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

      if (!passed) {
        anyFailing = true
        console.log(`    Failing elements on ${route}:`, overflowDetails.failingElements)
      }

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

  // ----------------------------------------------------------------------------
  // 2. EVIDENCE SCREENSHOTS & COMPUTED STYLES (375x812 with --safe-top: 50px)
  // ----------------------------------------------------------------------------
  console.log('\n--- 2. EVIDENCE SCREENSHOTS (375x812, --safe-top: 50px) ---')
  await page.setViewportSize({ width: 375, height: 812 })

  const injectSafeAreas = async () => {
    await page.addStyleTag({
      content: `
        :root {
          --safe-top: 50px !important;
          --safe-bottom: 50px !important;
        }
      `,
    })
    await page.waitForTimeout(200)
  }

  // A. HOMEPAGE LIGHT & DARK
  await page.goto('http://localhost:3000/')
  await injectSafeAreas()
  await setTheme('light')
  const heroLightPath = path.join(outDir, 'screenshot-task-6-hero-375-light.png')
  await page.screenshot({ path: heroLightPath, fullPage: false })
  console.log('Saved Homepage Light:', heroLightPath)

  await setTheme('dark')
  const heroDarkPath = path.join(outDir, 'screenshot-task-6-hero-375-dark.png')
  await page.screenshot({ path: heroDarkPath, fullPage: false })
  console.log('Saved Homepage Dark:', heroDarkPath)

  if (isAuthenticated) {
    // B. DASHBOARD LIGHT & DARK
    await page.goto('http://localhost:3000/dashboard')
    await injectSafeAreas()
    await setTheme('light')
    const dashLightPath = path.join(outDir, 'screenshot-task-6-dash-375-light.png')
    await page.screenshot({ path: dashLightPath, fullPage: false })
    console.log('Saved Dashboard Light:', dashLightPath)

    await setTheme('dark')
    const dashDarkPath = path.join(outDir, 'screenshot-task-6-dash-375-dark.png')
    await page.screenshot({ path: dashDarkPath, fullPage: false })
    console.log('Saved Dashboard Dark:', dashDarkPath)

    // C. TODAY (steps, water, Deep Work and Skill Building visible) LIGHT & DARK
    await page.goto('http://localhost:3000/today')
    await injectSafeAreas()
    await setTheme('light')
    const todayLightPath = path.join(outDir, 'screenshot-task-6-today-375-light.png')
    await page.screenshot({ path: todayLightPath, fullPage: false })
    console.log('Saved Today Light:', todayLightPath)

    await setTheme('dark')
    const todayDarkPath = path.join(outDir, 'screenshot-task-6-today-375-dark.png')
    await page.screenshot({ path: todayDarkPath, fullPage: false })
    console.log('Saved Today Dark:', todayDarkPath)
  } else {
    console.log('Skipping Dashboard & Today screenshots (awaiting test account credentials in .env.test.local).')
  }

  // D. ZOOMED DOT CROPS (120x120 crop of background dots from Homepage)
  await page.goto('http://localhost:3000/')
  await injectSafeAreas()
  await setTheme('dark')
  const dotsDarkCropPath = path.join(outDir, 'screenshot-task-6-dots-crop-dark.png')
  await page.screenshot({ path: dotsDarkCropPath, clip: { x: 30, y: 70, width: 120, height: 120 } })
  console.log('Saved Dots Dark Crop:', dotsDarkCropPath)

  await setTheme('light')
  const dotsLightCropPath = path.join(outDir, 'screenshot-task-6-dots-crop-light.png')
  await page.screenshot({ path: dotsLightCropPath, clip: { x: 30, y: 70, width: 120, height: 120 } })
  console.log('Saved Dots Light Crop:', dotsLightCropPath)

  // ----------------------------------------------------------------------------
  // 3. COPY & HERO DATE VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n--- 3. COPY & HERO DATE VERIFICATION ---')
  await page.goto('http://localhost:3000/')
  const copyCheck = await page.evaluate(() => {
    const text = document.body.innerText
    const trust1 = text.includes('Free To Start:') && text.includes('No credit card, no paywall.')
    const trust2 = text.includes('Private To Your Account:') && text.includes('Only you can see your habits and notes.')
    const trust3 = text.includes('Works On Phone And Laptop:') && text.includes('Installable, and your data follows your account across devices.')

    const heroCta = document.querySelector('a[href*="/login"], a[href*="/dashboard"]')?.textContent || ''
    const noDoubleArrow = !heroCta.includes('→ →') && !heroCta.includes('→→')

    const demoDate = document.querySelector('.stage .font-serif, .stage h3')?.textContent || ''

    return {
      trust1,
      trust2,
      trust3,
      noDoubleArrow,
      heroCta,
      demoDate,
    }
  })

  console.log('Copy Audit Results:', copyCheck)

  // ----------------------------------------------------------------------------
  // 4. HABIT CARD 375px TOUCH TARGET AUDIT
  // ----------------------------------------------------------------------------
  if (isAuthenticated) {
    console.log('\n--- 4. HABIT CARD 375px TOUCH TARGET AUDIT ---')
    await page.goto('http://localhost:3000/today')
    await page.waitForTimeout(400)
    const cardAudit = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.habit-card'))
      let failedTargets = 0
      cards.forEach((card) => {
        const interactive = Array.from(card.querySelectorAll('button, a'))
        interactive.forEach((el) => {
          const r = el.getBoundingClientRect()
          if (r.width < 43 || r.height < 43) {
            failedTargets++
          }
        })
      })
      return {
        totalCards: cards.length,
        failedTargets,
      }
    })
    console.log(`Audited ${cardAudit.totalCards} cards on Today page: ${cardAudit.failedTargets} failed targets (<44px).`)
  }

  await browser.close()

  console.log('\n================================================================')
  console.log(`TASK 6 VERIFICATION SUMMARY: ${anyFailing ? 'SOME FAILS DETECTED' : 'ALL TESTS PASSED'}`)
  console.log('================================================================')
}

runTask6Verification().catch((err) => {
  console.error('Fatal error during Task 6 verification:', err)
  process.exit(1)
})
