import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Upload,
    File,
    FileText,
    LogOut,
    AppWindow,
    Brain,
    Clock,
    Settings,
    ChevronLeft,
    ChevronRight,
    Home,
    PenTool,
    Share2
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import simplifyLogo from "@/assets/simplify-logo.png";
import { cn } from "@/lib/utils";

interface SidebarProps {
    collapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export const Sidebar = ({ collapsed = false, onCollapsedChange }: SidebarProps) => {
    const [isCollapsed, setIsCollapsed] = useState(collapsed);
    const location = useLocation();
    const { user, signOut } = useAuth();

    const navItems = [
        { href: "/", label: "Home", icon: Home },
        { href: "/templates", label: "Templates", icon: File },
        { href: "/upload", label: "Transform", icon: Upload },
        { href: "/forms", label: "Forms", icon: FileText },
        { href: "/applications", label: "Applications", icon: AppWindow },
        { href: "/documents", label: "SimplifyDrive", icon: Brain },
        { href: "/history", label: "History", icon: Clock },
    ];

    const bottomNavItems = [
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

    const toggleCollapsed = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        onCollapsedChange?.(newState);
    };

    return (
        <aside
            className={cn(
                "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[72px]" : "w-[240px]"
            )}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center px-4 border-b border-border">
                <Link to="/" className="flex items-center gap-3 overflow-hidden">
                    <img src={simplifyLogo} alt="SimplifyAI DocFlow" className="h-8 w-8 flex-shrink-0" />
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-base font-bold text-foreground truncate">SimplifyAI DocFlow</span>
                            <span className="text-xs text-muted-foreground truncate">Smart Document Processing</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                <div className="space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                                isActive(item.href)
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                                isCollapsed && "justify-center px-2"
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && (
                                <span className="text-sm font-medium truncate">{item.label}</span>
                            )}
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto border-t border-border py-4 px-3">
                {/* Settings */}
                {bottomNavItems.map((item) => (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 mb-2",
                            isActive(item.href)
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent",
                            isCollapsed && "justify-center px-2"
                        )}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && (
                            <span className="text-sm font-medium truncate">{item.label}</span>
                        )}
                    </Link>
                ))}

                {/* User Section */}
                <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/50",
                    isCollapsed && "justify-center px-2"
                )}>
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                            {user?.email?.charAt(0).toUpperCase() || "U"}
                        </span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="h-8 w-8 flex-shrink-0"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>

                {/* Collapse Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCollapsed}
                    className={cn(
                        "w-full mt-3 flex items-center justify-center gap-2",
                        isCollapsed && "px-2"
                    )}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <>
                            <ChevronLeft className="h-4 w-4" />
                            <span className="text-xs">Collapse</span>
                        </>
                    )}
                </Button>
            </div>
        </aside>
    );
};
