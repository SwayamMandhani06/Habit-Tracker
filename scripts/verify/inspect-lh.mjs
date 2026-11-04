import fs from 'fs'

for (const path of [
  'docs/lighthouse/before-homepage.json',
  'docs/lighthouse/after-homepage.json',
  'docs/lighthouse/before-login.json',
  'docs/lighthouse/after-login.json',
]) {
  if (!fs.existsSync(path)) continue
  const json = JSON.parse(fs.readFileSync(path, 'utf8'))
  console.log('=== ' + path + ' ===')
  console.log('Performance:', Math.round(json.categories.performance?.score * 100))
  console.log('Accessibility:', Math.round(json.categories.accessibility?.score * 100))
  const audits = json.audits
  for (const [id, a] of Object.entries(audits)) {
    if (a.score !== null && a.score < 1 && json.categories.accessibility?.auditRefs?.some((r) => r.id === id)) {
      console.log(`  - [${id}] (score: ${a.score}): ${a.title}`)
    }
  }
}
