import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// QA findings #18/#19: required funnel events were defined but never emitted —
// first_action_complete (onboarding funnel read 0%) and the canonical login/
// sign_up for the email/OTP path (the most common method went uncounted).

const collectFiles = (dir, ext, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(full, ext, out)
    else if (entry.name.endsWith(ext)) out.push(full)
  }
  return out
}

test('first_action_complete is emitted from at least one component (funnel not stuck at 0%)', () => {
  const srcRoot = path.resolve(process.cwd(), 'src')
  const vueFiles = collectFiles(srcRoot, '.vue')
  const emitted = vueFiles.some((f) =>
    /firstActionComplete|first_action_complete/.test(readFileSync(f, 'utf8')),
  )
  assert.equal(emitted, true)
})

test('email OTP confirmation fires the canonical login/sign_up events', () => {
  const file = path.resolve(process.cwd(), 'src/components/auth/ConfirmEmailCode.vue')
  const code = readFileSync(file, 'utf8')
  assert.match(code, /logLogin\(\s*['"]email['"]\s*\)/)
  assert.match(code, /logSignUp\(\s*['"]email['"]\s*\)/)
})
