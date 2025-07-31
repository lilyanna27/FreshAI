import { Link, useLocation } from "wouter";
import { Home, Refrigerator, ChefHat, Bot } from "lucide-react";

const navigationItems = [
  { path: "/", icon: Home, label: "Home", emoji: "🏠" },
  { path: "/fridge", icon: Refrigerator, label: "Fridge", emoji: "🥬" },
  { path: "/recipes", icon: ChefHat, label: "Recipes", emoji: "👨‍🍳" },
  { path: "/ai-agent", icon: Bot, label: "AI Agent", emoji: "🤖" },
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-30">
      <div className="max-w-md mx-auto flex justify-around px-4 py-3">
        {navigationItems.map(({ path, icon: Icon, label, emoji }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-green-500 text-white' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
                <div className="w-6 h-6 flex items-center justify-center mb-1">
                  <Icon size={20} className={isActive ? 'text-white' : 'text-gray-500'} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
