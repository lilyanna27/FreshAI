import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus, getCurrentDateTime } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock, MapPin, Search, User } from "lucide-react";
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
        {/* Header with Profile Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Welcome to FreshAI!</h1>
            <p className="text-white/90 text-sm">What is in your fridge today?</p>
          </div>
          <Link href="/profile">
            <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <User className="text-white" size={20} />
            </button>
          </Link>
        </div>



        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link href="/receipt-scan" className="flex-1">
            <button className="w-full bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center hover:bg-white/30 transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📋</span>
                <span className="text-white font-medium">Scan Receipt</span>
              </div>
            </button>
          </Link>
          
          <Link href="/ai-agent" className="flex-1">
            <button className="w-full bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center hover:bg-white/30 transition-colors">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🤖</span>
                <span className="text-white font-medium">AI Chef</span>
              </div>
            </button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 mt-6">

        {/* Recipe Cards Section */}
        <div className="mb-6 bg-green-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Most recent recipes</h3>
            <button className="text-green-200 text-sm font-medium hover:text-white transition-colors">View all</button>
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
