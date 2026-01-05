import { Link } from "wouter";
import { ROUTES } from "@shared/routes";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-card/50 py-4 px-6" data-testid="footer">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>&copy; {currentYear} Arclo.</span>
          <span className="hidden sm:inline">All rights reserved.</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href={ROUTES.TERMS} className="hover:text-foreground transition-colors" data-testid="link-terms">
            Terms & Conditions
          </Link>
          <Link href={ROUTES.PRIVACY} className="hover:text-foreground transition-colors" data-testid="link-privacy">
            Privacy Policy
          </Link>
          <Link href={ROUTES.HELP} className="hover:text-foreground transition-colors" data-testid="link-help">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
}
