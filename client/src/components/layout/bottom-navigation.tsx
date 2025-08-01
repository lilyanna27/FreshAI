import { Link, useLocation } from "wouter";
import { Home, Refrigerator, ChefHat, Bot, User, ScanLine } from "lucide-react";
import texturedBackground from "@assets/download_1753924929079.jpg";

const navigationItems = [
  { path: "/", icon: Home, label: "Home", emoji: "🏠" },
  { path: "/fridge", icon: Refrigerator, label: "Fridge", emoji: "🥬" },
  { path: "/receipt-scan", icon: ScanLine, label: "Scan", emoji: "📷", isCenter: true },
  { path: "/ai-agent", icon: Bot, label: "AI Chat", emoji: "🤖" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-80 max-w-sm border border-gray-200 z-30 relative rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#1e3a2e'
      }}
    >
      <div className="flex justify-around items-center px-4 py-3 relative z-10">
        {navigationItems.map(({ path, icon: Icon, label, emoji, isCenter }) => {
          const isActive = location === path;
          
          if (isCenter) {
            return (
              <Link key={path} href={path}>
                <button className="flex flex-col items-center transition-all duration-200">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 shadow-lg" 
                       style={{backgroundColor: '#1e3a2e'}}>
                    <Icon size={24} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-white" style={{fontFamily: 'Times New Roman, serif'}}>{label}</span>
                </button>
              </Link>
            );
          }
          
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
                <span className="text-xs font-medium" style={{fontFamily: 'Times New Roman, serif'}}>{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
