import { describe, it, expect } from 'vitest'
import { sha256, imageKey, store, isStorageConfigured } from './storage'

describe('sha256', () => {
  it('is deterministic for the same bytes', () => {
    const buf = Buffer.from('hello receipt')
    expect(sha256(buf)).toBe(sha256(Buffer.from('hello receipt')))
  })

  it('differs for different bytes', () => {
    expect(sha256(Buffer.from('a'))).not.toBe(sha256(Buffer.from('b')))
  })
})

describe('imageKey', () => {
  it('picks an extension from the content type', () => {
    expect(imageKey('abc', 'image/png')).toBe('receipts/abc.png')
    expect(imageKey('abc', 'image/webp')).toBe('receipts/abc.webp')
    expect(imageKey('abc', 'image/jpeg')).toBe('receipts/abc.jpg')
  })
})

describe('store', () => {
  it('returns a null key but a real hash when no client is configured', async () => {
    const buf = Buffer.from('a fake image')
    const result = await store(buf, 'image/jpeg', null)
    expect(result.key).toBeNull()
    expect(result.sha256).toBe(sha256(buf))
  })

  it('uploads and returns a content-addressed key when a client is injected', async () => {
    const calls: { Bucket?: string; Key?: string; ContentType?: string }[] = []
    const fakeS3 = {
      send: async (cmd: { input: { Bucket?: string; Key?: string; ContentType?: string } }) => {
        calls.push(cmd.input)
        return {}
      },
    } as unknown as Parameters<typeof store>[2]

    const buf = Buffer.from('another fake image')
    const result = await store(buf, 'image/png', fakeS3)
    expect(result.key).toBe(`receipts/${sha256(buf)}.png`)
    expect(calls).toHaveLength(1)
    expect(calls[0].Key).toBe(result.key)
    expect(calls[0].ContentType).toBe('image/png')
  })
})

describe('isStorageConfigured', () => {
  it('is false in the test environment with no R2 env vars set', () => {
    expect(isStorageConfigured()).toBe(false)
  })
})
