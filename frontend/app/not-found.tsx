import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <h2 className="text-3xl font-bold mb-4">404 - Not Found</h2>
      <p className="text-muted-foreground mb-8">The workflow or page you're looking for doesn't exist.</p>
      <Link href="/">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  )
}
