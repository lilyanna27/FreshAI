import { Link, useLocation } from "wouter";
import { Home, Snowflake, Book, Clock } from "lucide-react";

const navigationItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/fridge", icon: Snowflake, label: "Fridge" },
  { path: "/recipes", icon: Book, label: "Recipes" },
  { path: "/expiring", icon: Clock, label: "Expiring" },
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-900 border-t border-gray-700 z-50">
      <div className="flex justify-around px-6">
        {navigationItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-4 nav-item ${isActive ? 'active' : ''}`}>
                <Icon className="text-lg mb-2" size={28} />
                <span className="text-xs">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
