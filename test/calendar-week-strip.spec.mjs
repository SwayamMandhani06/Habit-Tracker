import { test, expect, chromium } from '@playwright/test'
import path from 'path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

test('Calendar week strip displays correct local dates across timezone boundaries with fixed clock', async () => {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  })

  // Case 1: Asia/Kolkata at 2026-11-02T19:00:00Z (00:30 IST on Nov 3)
  const contextKolkata = await browser.newContext({
    timezoneId: 'Asia/Kolkata',
    viewport: { width: 1280, height: 800 },
  })
  const pageKolkata = await contextKolkata.newPage()
  await pageKolkata.clock.setFixedTime(new Date('2026-11-02T19:00:00Z'))

  // Verify browser's evaluated date in Kolkata is Nov 3, 2026
  const kolkataDate = await pageKolkata.evaluate(() => {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  })
  expect(kolkataDate).toBe('2026-11-03')

  // Case 2: America/Los_Angeles during DST change week (2026-11-01)
  const contextLA = await browser.newContext({
    timezoneId: 'America/Los_Angeles',
    viewport: { width: 1280, height: 800 },
  })
  const pageLA = await contextLA.newPage()
  await pageLA.clock.setFixedTime(new Date('2026-11-01T19:00:00Z')) // 11:00 AM PST on Nov 1

  const laDate = await pageLA.evaluate(() => {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  })
  expect(laDate).toBe('2026-11-01')

  // Case 3: Pacific/Auckland at 2026-11-02T11:30:00Z (00:30 NZDT on Nov 3)
  const contextNZ = await browser.newContext({
    timezoneId: 'Pacific/Auckland',
    viewport: { width: 1280, height: 800 },
  })
  const pageNZ = await contextNZ.newPage()
  await pageNZ.clock.setFixedTime(new Date('2026-11-02T11:30:00Z'))

  const nzDate = await pageNZ.evaluate(() => {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  })
  expect(nzDate).toBe('2026-11-03')

  await browser.close()
})
