import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitiseReturnTo } from '../return-to.ts'

describe('sanitiseReturnTo', () => {
  it('keeps a relative path with a query', () => {
    assert.equal(
      sanitiseReturnTo('/roadmap?skills=Python%2CSQL&source=careeros'),
      '/roadmap?skills=Python%2CSQL&source=careeros',
    )
  })

  it('refuses an absolute url', () => {
    assert.equal(sanitiseReturnTo('https://evil.example/steal'), null)
  })

  it('refuses a protocol-relative url', () => {
    assert.equal(sanitiseReturnTo('//evil.example/steal'), null)
  })

  it('refuses a backslash path, which some browsers read as a slash', () => {
    assert.equal(sanitiseReturnTo('/\\evil.example'), null)
  })

  it('refuses a javascript url', () => {
    assert.equal(sanitiseReturnTo('javascript:alert(1)'), null)
  })

  it('refuses control characters', () => {
    assert.equal(sanitiseReturnTo('/ok\nSet-Cookie: x=1'), null)
  })

  it('refuses anything that is not a string', () => {
    assert.equal(sanitiseReturnTo(undefined), null)
    assert.equal(sanitiseReturnTo(['/a', '/b']), null)
    assert.equal(sanitiseReturnTo(42), null)
  })

  it('refuses an empty or oversized value', () => {
    assert.equal(sanitiseReturnTo('   '), null)
    assert.equal(sanitiseReturnTo(`/${'x'.repeat(600)}`), null)
  })

  it('keeps a hash', () => {
    assert.equal(sanitiseReturnTo('/skills/react#anatomy'), '/skills/react#anatomy')
  })
})
