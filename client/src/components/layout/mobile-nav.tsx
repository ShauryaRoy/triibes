import { Calendar, Search, Users, User, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileNav() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { icon: Calendar, label: "Events", path: "/" },
    { icon: Search, label: "Discover", path: "/discover" },
    { icon: Users, label: "Groups", path: "/groups" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center py-2 px-3 transition-all ${
                  isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500 hover:text-violet-500 dark:hover:text-violet-400"
                }`}
              >
                <item.icon className={`h-6 w-6 ${isActive ? 'drop-shadow-sm' : ''}`} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                {isActive && <span className="absolute -bottom-0.5 w-8 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />}
              </button>
            </Link>
          );
        })}
        
      </div>
    </nav>
  );
}
