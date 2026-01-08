import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/analyze',       // Allow analyze without login
  '/trucks',        // Allow truck specs without login
  '/api/analyze',   // API for email parsing
  '/api/trucks',    // API for truck data
])

// Define protected routes (require authentication)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/customers(.*)',
  '/quotes(.*)',
  '/loads(.*)',
  '/settings(.*)',
  '/api/customers(.*)',
  '/api/quotes(.*)',
  '/api/loads(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // If it's a protected route, require authentication
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
