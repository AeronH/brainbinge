"use client";

import { BookOpen, User, Settings, Moon, Sun, LogOut, ChevronUp } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { SettingsModal } from "@/components/modals/SettingsModal";

interface AppSidebarProps {
  onSignInClick?: () => void;
  onAuthStateChange?: (loading: boolean) => void;
}

const AppSidebar = ({ onSignInClick, onAuthStateChange }: AppSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        setIsAuthenticated(true);
        // Try to get user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          setUser(profile);
        } else {
          // Fallback to auth user metadata
          setUser({
            name: authUser.user_metadata.name || authUser.user_metadata.full_name || 'User',
            email: authUser.email || '',
          });
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
      onAuthStateChange?.(false);
    };

    fetchUser();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthStateChange]);

  const navItems = [
    { icon: BookOpen, label: "Lessons", path: "/dashboard", iconColor: "text-blue", bgColor: "bg-blue/20" },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    // TODO: Implement actual theme switching with next-themes
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    } catch (error: any) {
      toast.error("Failed to log out");
    }
  };

  return (
    <aside className="w-[200px] min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-sidebar-border">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 w-full">
          <div className="w-8 h-8 rounded-xl brand-logo-icon flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold brand-logo-text truncate">
            BrainBinge
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.label}>
                <button
                  onClick={() => router.push(item.path)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-base",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isActive ? item.bgColor : "bg-muted/50"
                  )}>
                    <item.icon className={cn("w-6 h-6", isActive ? item.iconColor : "text-muted-foreground")} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile Section */}
      <div className="p-4 border-t border-sidebar-border">
        {/* Profile Section - show different content based on auth status */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-sidebar-accent transition-all text-sidebar-foreground">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <User className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top" 
              align="end" 
              className="w-56 mb-2 rounded-xl bg-card border-border"
            >
              <DropdownMenuItem 
                onClick={() => setShowSettingsModal(true)}
                className="cursor-pointer rounded-lg px-3 py-2.5"
              >
                <Settings className="w-4 h-4 mr-3" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={toggleTheme}
                className="cursor-pointer rounded-lg px-3 py-2.5"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4 mr-3" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-3" />
                    <span>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-3" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={onSignInClick}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-primary hover:bg-primary/90 transition-all text-primary-foreground font-medium text-base shadow-lg"
          >
            <User className="w-5 h-5" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
      />
    </aside>
  );
};

export default AppSidebar;
