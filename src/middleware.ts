// Middleware disabled - authentication not in use
// To re-enable Clerk auth, restore the clerkMiddleware configuration
// and set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY env vars

export default function middleware() {
  // No-op - all routes are public
}

export const config = {
  matcher: [],
}
