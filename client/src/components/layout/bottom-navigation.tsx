import { Link, useLocation } from "wouter";
import { Home, Refrigerator, ChefHat, Bot } from "lucide-react";
import texturedBackground from "@assets/download_1753924929079.jpg";

const navigationItems = [
  { path: "/", icon: Home, label: "Home", emoji: "🏠" },
  { path: "/fridge", icon: Refrigerator, label: "Fridge", emoji: "🥬" },
  { path: "/recipes", icon: ChefHat, label: "Recipes", emoji: "👨‍🍳" },
  { path: "/ai-agent", icon: Bot, label: "AI Agent", emoji: "🤖" },
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-4 left-4 right-4 border border-gray-200 z-30 relative rounded-2xl overflow-hidden"
      style={{
        backgroundImage: `url(${texturedBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for content readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="max-w-md mx-auto flex justify-around px-4 py-3 relative z-10">
        {navigationItems.map(({ path, icon: Icon, label, emoji }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-white/20 text-white backdrop-blur-sm' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}>
                <div className="w-6 h-6 flex items-center justify-center mb-1">
                  <Icon size={20} className={isActive ? 'text-white' : 'text-white/80'} strokeWidth={1.5} />
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
