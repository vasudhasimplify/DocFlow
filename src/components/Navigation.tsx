import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  File,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileText,
  Menu,
  X,
  LogOut,
  AppWindow,
  Brain,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { BackendIndicator } from "./BackendIndicator";
import { LockNotificationsList } from "@/components/notifications/LockNotificationsList";
import simplifyLogo from "@/assets/simplify-logo.png";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: FileText },
    { href: "/templates", label: "Templates", icon: File },
    { href: "/upload", label: "Transform", icon: Upload },
    { href: "/forms", label: "Forms", icon: FileText },
    { href: "/applications", label: "Applications", icon: AppWindow },
    { href: "/documents", label: "SimplifyDrive", icon: Brain },
    { href: "/history", label: "Processing History", icon: Clock },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully"
    });
  };

  const updateScrollButtons = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = tabsRef.current;
    if (!el) return;
    const onScroll = () => updateScrollButtons();
    const onResize = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.6);
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <nav className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={simplifyLogo} alt="SimplifyAI DocFlow" className="h-8 w-8" />
            <div>
              <span className="text-xl font-bold text-foreground">SimplifyAI DocFlow</span>
              <div className="text-xs text-muted-foreground">Smart Document Processing</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 relative flex-1 min-w-0">
            {canScrollLeft && (
              <button
                aria-label="Scroll left"
                onClick={() => scrollTabs('left')}
                className="absolute left-0 z-10 h-8 w-8 flex items-center justify-center rounded-md bg-card/80 shadow-soft hover:bg-accent transition-smooth"
                style={{ transform: 'translateX(-50%)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              ref={tabsRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 px-6"
            >
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-smooth ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            </div>
            {canScrollRight && (
              <button
                aria-label="Scroll right"
                onClick={() => scrollTabs('right')}
                className="absolute right-0 z-10 h-8 w-8 flex items-center justify-center rounded-md bg-card/80 shadow-soft hover:bg-accent transition-smooth"
                style={{ transform: 'translateX(50%)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <LockNotificationsList />
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-accent/50">
              <BackendIndicator />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t border-border">
                <div className="text-sm text-muted-foreground mb-2">{user?.email}</div>
                <div className="mb-2">
                  <LockNotificationsList />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="w-full justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};