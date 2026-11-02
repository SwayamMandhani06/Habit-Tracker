import { chromium } from '@playwright/test'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

async function run() {
  console.log('--- 5.d AUTHENTICATED PAGES AUDIT WITH LIVE SESSION ---')
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile 390px
  })

  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() })
    }
  })

  // Sign in with the created account
  const email = 'audit_test_verify_882@gmail.com'
  const password = 'Password123!'
  console.log(`Signing in as ${email}...`)

  await page.goto('http://localhost:3000/login')
  await page.waitForTimeout(800)

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('#auth-submit')

  // Wait for redirect to /dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 })
  console.log('Successfully reached /dashboard!')

  // List of pages to audit
  const pagesToTest = [
    '/dashboard',
    '/today',
    '/calendar',
    '/grid',
    '/insights',
    '/review',
    '/settings',
    '/focus',
  ]

  const results = []

  for (const path of pagesToTest) {
    console.log(`Auditing ${path}...`)
    await page.goto(`http://localhost:3000${path}`)
    await page.waitForTimeout(1500)

    const auditData = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth
      const innerWidth = window.innerWidth
      const overflowPass = scrollWidth <= innerWidth

      // Check touch targets under 44x44
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input, select, textarea'))
      const smallTargets = []

      candidates.forEach((el) => {
        const s = window.getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return

        if (r.width < 43.5 || r.height < 43.5) {
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20),
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
          })
        }
      })

      return {
        scrollWidth,
        innerWidth,
        overflowPass,
        smallTargetsCount: smallTargets.length,
        smallTargets,
      }
    })

    results.push({
      path,
      ...auditData,
    })
  }

  // Audit /habits/[id]
  console.log('Auditing /habits/[id]...')
  await page.goto('http://localhost:3000/today')
  await page.waitForTimeout(1000)

  const habitLink = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/habits/"]')
    return link ? link.getAttribute('href') : null
  })

  if (habitLink) {
    console.log(`Auditing habit detail page: ${habitLink}...`)
    await page.goto(`http://localhost:3000${habitLink}`)
    await page.waitForTimeout(1200)

    const habitAudit = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth
      const innerWidth = window.innerWidth
      const overflowPass = scrollWidth <= innerWidth

      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input, select, textarea'))
      const smallTargets = []
      candidates.forEach((el) => {
        const s = window.getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return
        const r = el.getBoundingClientRect()
        if (r.width < 43.5 || r.height < 43.5) {
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 20),
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
          })
        }
      })

      return { scrollWidth, innerWidth, overflowPass, smallTargetsCount: smallTargets.length, smallTargets }
    })

    results.push({
      path: habitLink,
      ...habitAudit,
    })
  }

  console.log('\n--- AUDIT RESULTS SUMMARY ---')
  console.table(
    results.map((r) => ({
      path: r.path,
      'scrollWidth <= innerWidth': r.overflowPass ? 'PASS' : `FAIL (${r.scrollWidth} > ${r.innerWidth})`,
      smallTargets: r.smallTargetsCount,
    }))
  )

  console.log('\nConsole Errors caught during audit:', consoleErrors.length)
  if (consoleErrors.length > 0) {
    console.log(JSON.stringify(consoleErrors, null, 2))
  }

  await browser.close()
}

run().catch(console.error)
