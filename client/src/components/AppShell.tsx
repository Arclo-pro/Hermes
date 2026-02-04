import { useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  LayoutDashboard,
  Bot,
  Ticket,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Loader2,
  TrendingUp,
  Users,
  Bell,
  Plus,
  Gauge,
  Wrench,
  Sparkles,
  Link2,
  Contact,
  Trophy,
} from "lucide-react";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/app/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/app/competitive-analysis", label: "Competitive Analysis", icon: Users },
  { path: "/app/rankings", label: "Keyword Rankings", icon: TrendingUp },
  { path: "/app/performance", label: "Site Performance", icon: Gauge },
  { path: "/app/technical-seo", label: "Technical SEO", icon: Wrench },
  { path: "/app/content", label: "Content & On-Page", icon: FileText },
  { path: "/app/ai-search", label: "AI Search", icon: Sparkles },
  { path: "/app/link-building", label: "Link Building", icon: Link2 },
  { path: "/app/automation", label: "Automation & Agents", icon: Bot },
  { path: "/app/leads", label: "Leads", icon: Contact },
  { path: "/app/achievements", label: "Achievements", icon: Trophy },
];

interface AppShellProps {
  children: ReactNode;
  lightMode?: boolean;
}

export default function AppShell({ children, lightMode = false }: AppShellProps) {
  const { authenticated, user, loading, logout, activeWebsiteId, selectWebsite } = useAuth();
  const { sites } = useSiteContext();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    
    if (!authenticated) {
      navigate("/login");
      return;
    }
    
    if (!activeWebsiteId) {
      if (sites && sites.length > 0) {
        selectWebsite(sites[0].siteId);
      }
    }
  }, [loading, authenticated, activeWebsiteId, location, navigate, sites, selectWebsite]);

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        lightMode ? "bg-muted" : "bg-background"
      )}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className={lightMode ? "text-muted-foreground" : "text-muted-foreground"}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const currentSite = sites?.find(s => s.siteId === activeWebsiteId);

  return (
    <div className={cn(
      "min-h-screen flex",
      lightMode ? "bg-muted" : "bg-background"
    )}>
      <aside className={cn(
        "w-64 border-r flex flex-col",
        "bg-sidebar border-sidebar-border"
      )}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href="/app/overview" className="flex items-center">
            <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Site selector: single site = static label, multi = dropdown, zero = add CTA */}
        <div className="p-3 border-b border-sidebar-border">
          {sites && sites.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
                  data-testid="button-site-selector"
                >
                  <span className="flex items-center space-x-2 truncate">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{currentSite?.displayName || "Select site"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border-border">
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.siteId}
                    onClick={() => selectWebsite(site.siteId)}
                    className={cn(
                      "cursor-pointer text-foreground/80 focus:bg-secondary focus:text-foreground",
                      site.siteId === activeWebsiteId && "bg-secondary text-gold"
                    )}
                    data-testid={`menu-item-site-${site.siteId}`}
                  >
                    {site.displayName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : sites && sites.length === 1 ? (
            <div
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg bg-sidebar-accent border border-sidebar-border text-sidebar-foreground text-sm"
              data-testid="site-label-single"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{currentSite?.displayName}</span>
            </div>
          ) : (
            <Link href="/app/sites/new">
              <span className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground text-sm cursor-pointer transition-colors">
                <Plus className="h-4 w-4" />
                Add Website
              </span>
            </Link>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                data-testid="button-user-menu"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-sidebar-accent">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="truncate">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-border">
              <div className="px-2 py-1.5">
                <p className="text-sm text-foreground">{user?.display_name || user?.email}</p>
                <p className="text-xs capitalize text-muted-foreground">{user?.plan || "Free"} Plan</p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => navigate("/app/settings")}
                className="cursor-pointer text-foreground/80 focus:bg-secondary focus:text-foreground"
                data-testid="menu-item-settings"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/app/tickets")}
                className="cursor-pointer text-foreground/80 focus:bg-secondary focus:text-foreground"
                data-testid="menu-item-tickets"
              >
                <Ticket className="mr-2 h-4 w-4" />
                Tickets
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/app/notifications")}
                className="cursor-pointer text-foreground/80 focus:bg-secondary focus:text-foreground"
                data-testid="menu-item-notifications"
              >
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:bg-secondary focus:text-destructive"
                data-testid="menu-item-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
