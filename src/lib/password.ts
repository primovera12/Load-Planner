import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// Simple password hashing using SHA-256 with salt
// For production, consider using bcrypt or argon2

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':')
    if (!salt || !hash) return false

    const inputHash = createHash('sha256')
      .update(salt + password)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const storedBuffer = Buffer.from(hash, 'hex')
    const inputBuffer = Buffer.from(inputHash, 'hex')

    if (storedBuffer.length !== inputBuffer.length) return false

    return timingSafeEqual(storedBuffer, inputBuffer)
  } catch {
    return false
  }
}
