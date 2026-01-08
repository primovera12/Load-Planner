'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Truck,
  LayoutDashboard,
  ScanSearch,
  Route,
  FileText,
  Settings,
  Box,
  FileSpreadsheet,
  Users,
  LogIn,
  Share2,
  Code,
} from 'lucide-react'

// Check if Clerk is properly configured
const isClerkConfigured = () => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return key && key !== 'pk_test_your_key_here' && key.startsWith('pk_')
}

// Conditionally import Clerk components
let SignInButton: React.ComponentType<{ mode?: string; children: React.ReactNode }> | null = null
let SignedIn: React.ComponentType<{ children: React.ReactNode }> | null = null
let SignedOut: React.ComponentType<{ children: React.ReactNode }> | null = null
let UserButton: React.ComponentType<{ afterSignOutUrl?: string; appearance?: object }> | null = null

if (isClerkConfigured()) {
  try {
    const clerk = require('@clerk/nextjs')
    SignInButton = clerk.SignInButton
    SignedIn = clerk.SignedIn
    SignedOut = clerk.SignedOut
    UserButton = clerk.UserButton
  } catch {
    // Clerk not available
  }
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, protected: true },
  { name: 'Analyze', href: '/analyze', icon: ScanSearch },
  { name: 'Trucks', href: '/trucks', icon: Truck },
  { name: 'Routes', href: '/routes', icon: Route },
  { name: 'Visualize', href: '/visualize', icon: Box },
  { name: 'Import', href: '/import', icon: FileSpreadsheet },
  { name: 'Customers', href: '/customers', icon: Users, protected: true },
  { name: 'Quotes', href: '/quotes', icon: FileText, protected: true },
  { name: 'Shares', href: '/shares', icon: Share2, protected: true },
  { name: 'Developers', href: '/developers', icon: Code, protected: true },
]

export function Navigation() {
  const pathname = usePathname()
  const clerkEnabled = isClerkConfigured()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none">Load Planner</span>
            <span className="text-[10px] text-muted-foreground leading-none">
              AI-Powered Freight
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            // For protected routes when Clerk is enabled, wrap in SignedIn
            if (item.protected && clerkEnabled && SignedIn) {
              return (
                <SignedIn key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </SignedIn>
              )
            }

            // When Clerk is not enabled, show protected routes with "Coming Soon" badge
            if (item.protected && !clerkEnabled) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Right side - Auth */}
        <div className="ml-auto flex items-center gap-3">
          {clerkEnabled && SignedOut && SignInButton ? (
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          ) : !clerkEnabled ? (
            <Link href="/sign-in">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          ) : null}
          {clerkEnabled && SignedIn && UserButton ? (
            <SignedIn>
              <Link
                href="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                  },
                }}
              />
            </SignedIn>
          ) : null}
        </div>
      </div>
    </header>
  )
}
