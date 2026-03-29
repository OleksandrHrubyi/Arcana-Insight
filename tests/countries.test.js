import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

const validateCountryList = (list) => {
  assert.ok(Array.isArray(list))
  assert.ok(list.length > 150)

  const codes = new Set()
  for (const item of list) {
    assert.equal(typeof item.code, 'string')
    assert.equal(typeof item.name, 'string')
    assert.match(item.code, /^[A-Z]{2}$/)
    assert.ok(item.name.trim().length > 0)
    assert.equal(codes.has(item.code), false, `duplicate code: ${item.code}`)
    codes.add(item.code)
  }

  return codes
}

test('countries and countriesUk are valid, unique and aligned by code set', async () => {
  const { countries, countriesUk } = await importModule('src/constants/countries.js')

  const enCodes = validateCountryList(countries)
  const ukCodes = validateCountryList(countriesUk)

  assert.equal(enCodes.size, ukCodes.size)
  for (const code of enCodes) {
    assert.equal(ukCodes.has(code), true, `missing uk translation for code: ${code}`)
  }

  assert.equal(enCodes.has('US'), true)
  assert.equal(enCodes.has('UA'), true)
  assert.equal(enCodes.has('GB'), true)
})
