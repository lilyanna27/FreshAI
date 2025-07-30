import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus, getCurrentDateTime } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock, MapPin, Search } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const stats = {
    totalItems: foodItems.length,
    freshItems: foodItems.filter(item => {
      const status = getExpirationStatus(new Date(item.expirationDate));
      return status.status === 'fresh';
    }).length,
    expiringItems: foodItems.filter(item => {
      const status = getExpirationStatus(new Date(item.expirationDate));
      return ['today', 'tomorrow', 'soon'].includes(status.status);
    }).length,
  };

  const recentActivity = foodItems
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-gray-700 animate-pulse rounded-xl h-24 mb-6"></div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 animate-pulse rounded-xl h-20"></div>
          <div className="bg-gray-700 animate-pulse rounded-xl h-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Green Header Section */}
      <div className="bg-gradient-to-br from-green-400 to-green-600 px-6 pt-8 pb-6 rounded-b-3xl">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-2">Hey there! 👋</h1>
          <p className="text-white/90 text-sm">What are you cooking today?</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="bg-white rounded-2xl flex items-center px-4 py-3 shadow-lg">
            <Search className="text-gray-400 mr-3" size={20} />
            <input
              type="text"
              placeholder="Search for recipes, ingredients..."
              className="flex-1 text-gray-700 placeholder-gray-400 bg-transparent outline-none"
            />
            <div className="bg-apple-green rounded-xl p-2">
              <Search className="text-white" size={16} />
            </div>
          </div>
        </div>

        {/* Category Circles */}
        <div className="flex justify-between">
          <Link href="/fridge">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <span className="text-2xl">🥬</span>
              </div>
              <span className="text-white text-xs font-medium">Fresh</span>
            </div>
          </Link>
          
          <Link href="/recipes">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <span className="text-2xl">🍝</span>
              </div>
              <span className="text-white text-xs font-medium">Recipes</span>
            </div>
          </Link>
          
          <Link href="/expiring-items">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <span className="text-2xl">⏰</span>
              </div>
              <span className="text-white text-xs font-medium">Expiring</span>
            </div>
          </Link>
          
          <Link href="/ai-agent">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <span className="text-2xl">🤖</span>
              </div>
              <span className="text-white text-xs font-medium">AI Chef</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 mt-6">

        {/* Recipe Cards Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Popular recipes</h3>
            <button className="text-apple-green text-sm font-medium">View all</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="w-full h-24 bg-gradient-to-br from-orange-200 to-orange-300 rounded-2xl mb-3 flex items-center justify-center">
                <span className="text-3xl">🍳</span>
              </div>
              <h4 className="text-gray-800 font-bold text-sm mb-1">Scrambled Eggs</h4>
              <p className="text-gray-500 text-xs mb-2">5 min • Easy</p>
              <div className="flex items-center">
                <span className="text-xs text-green-500">⭐ 4.8</span>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="w-full h-24 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl mb-3 flex items-center justify-center">
                <span className="text-3xl">🥗</span>
              </div>
              <h4 className="text-gray-800 font-bold text-sm mb-1">Garden Salad</h4>
              <p className="text-gray-500 text-xs mb-2">10 min • Fresh</p>
              <div className="flex items-center">
                <span className="text-xs text-green-500">⭐ 4.6</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Featured Recipe */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-3xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Recipe of the week</span>
              <h3 className="text-white text-xl font-bold mb-2">Healthy Pasta Bowl</h3>
              <p className="text-white/90 text-sm mb-3">Fresh ingredients, bold flavors</p>
              <button className="bg-white text-green-600 px-4 py-2 rounded-xl text-sm font-bold">
                Cook now
              </button>
            </div>
            <div className="absolute -bottom-4 -right-4 text-6xl opacity-20">🍝</div>
          </div>
        </div>
      

        {/* Your Kitchen Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/fresh-items">
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mr-3">
                  <CheckCircle className="text-green-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.freshItems}</p>
                  <p className="text-xs text-gray-500">Fresh items</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/expiring-items">
            <div className="bg-white rounded-3xl p-4 shadow-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mr-3">
                  <AlertTriangle className="text-orange-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.expiringItems}</p>
                  <p className="text-xs text-gray-500">Expiring soon</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
