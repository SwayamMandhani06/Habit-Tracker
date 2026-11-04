import fs from 'fs'

const json = JSON.parse(fs.readFileSync('docs/lighthouse/before-homepage.json', 'utf8'))

for (const auditKey of ['color-contrast', 'heading-order', 'label-content-name-mismatch', 'target-size']) {
  const audit = json.audits[auditKey]
  console.log(`\n=================== ${auditKey} ===================`)
  console.log(audit.description)
  if (audit.details?.items) {
    audit.details.items.forEach((it, i) => {
      console.log(`--- [Item ${i + 1}] ---`)
      console.log('Snippet:', it.node?.snippet)
      console.log('Selector:', it.node?.selector)
      console.log('Explanation:', it.node?.explanation || it.explanation)
      if (it.subItems?.items) {
        it.subItems.items.forEach(s => console.log('  SubItem:', s.relatedNode?.snippet, s.relatedNode?.selector))
      }
    })
  }
}
