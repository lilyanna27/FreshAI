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
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 z-50">
      <div className="flex justify-around px-4 py-2">
        {navigationItems.map(({ path, icon: Icon, label, emoji }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-3 px-4 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-apple-green text-white' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}>
                {isActive ? (
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <Icon size={20} />
                  </div>
                ) : (
                  <span className="text-xl mb-1">{emoji}</span>
                )}
                <span className="text-xs font-medium">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
