'use client'

import { ClerkProvider } from '@clerk/nextjs'

// Check if Clerk is properly configured
const isClerkConfigured = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return key && key !== 'pk_test_your_key_here' && key.startsWith('pk_')
}

export function Providers({ children }: { children: React.ReactNode }) {
  // If Clerk is not configured, just render children without auth
  if (!isClerkConfigured()) {
    return <>{children}</>
  }

  return <ClerkProvider>{children}</ClerkProvider>
}
