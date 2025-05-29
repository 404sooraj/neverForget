import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">NeverForget</span>
          </Link>
        </div>
        <nav className="hidden md:flex gap-6">
         
        </nav>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" size="sm" className="hidden md:flex">
            Sign In
          </Button> */}
          {/* <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            Get Started
          </Button> */}
        </div>
      </div>
    </header>
  )
}
