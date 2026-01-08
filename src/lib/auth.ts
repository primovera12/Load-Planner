import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

/**
 * Get or create a user in our database based on Clerk authentication
 */
export async function getDbUser() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  // If no user exists, create one from Clerk data
  if (!user) {
    const clerkUser = await currentUser()

    if (!clerkUser) {
      return null
    }

    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    })
  }

  return user
}

/**
 * Require authenticated user - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getDbUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Get current user ID from Clerk
 */
export async function getCurrentUserId() {
  const { userId } = await auth()
  return userId
}
