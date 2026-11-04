import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const executablePath = fs.existsSync(chromePath) ? chromePath : undefined

export default defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.(ts|mjs)/,
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    launchOptions: {
      executablePath,
    },
    trace: 'on-first-retry',
  },
})

