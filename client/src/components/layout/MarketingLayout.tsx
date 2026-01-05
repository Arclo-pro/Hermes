import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href={ROUTES.LANDING}>
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-xl text-foreground">Arclo</span>
            </div>
          </Link>
          
          <nav className="flex items-center gap-4 md:gap-6">
            <Link href={ROUTES.HOW_IT_WORKS} className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-how-it-works">
                How It Works
              </span>
            </Link>
            <Link href={ROUTES.USE_CASES} className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-use-cases">
                Use Cases
              </span>
            </Link>
            <Link href="/login">
              <Button variant="default" size="sm" className="gap-2" data-testid="button-login">
                <LogIn className="h-4 w-4" />
                <span>Log In</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">A</span>
                </div>
                <span className="font-semibold text-foreground">Arclo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Fully automated SEO from audit to execution.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Product</h4>
              <div className="flex flex-col gap-2">
                <Link href={ROUTES.HOW_IT_WORKS}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">How It Works</span>
                </Link>
                <Link href={ROUTES.USE_CASES}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Use Cases</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href={ROUTES.PRIVACY}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Privacy Policy</span>
                </Link>
                <Link href={ROUTES.TERMS}>
                  <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Terms of Service</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Contact</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:hello@arclo.io" className="text-sm text-muted-foreground hover:text-foreground">
                  hello@arclo.io
                </a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
