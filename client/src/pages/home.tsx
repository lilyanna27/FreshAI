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
      {/* Illustrated Header Section */}
      <div className="bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 px-6 pt-8 pb-6 rounded-b-3xl relative overflow-hidden">
        {/* Decorative Food Illustrations - Hand-drawn style */}
        <div className="absolute top-4 left-4 text-4xl opacity-70 transform rotate-12 filter drop-shadow-lg">🥑</div>
        <div className="absolute top-12 right-8 text-3xl opacity-60 transform -rotate-12 filter drop-shadow-lg">🍊</div>
        <div className="absolute bottom-8 left-8 text-3xl opacity-50 transform rotate-45 filter drop-shadow-lg">🍇</div>
        <div className="absolute bottom-4 right-4 text-2xl opacity-60 transform -rotate-12 filter drop-shadow-lg">🥕</div>
        <div className="absolute top-20 left-20 text-2xl opacity-40 transform rotate-90 filter drop-shadow-lg">🍌</div>
        <div className="absolute bottom-16 right-16 text-3xl opacity-50 transform -rotate-45 filter drop-shadow-lg">🍅</div>
        
        {/* Header with Profile Button */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2 drop-shadow-lg" style={{fontFamily: 'Times New Roman, serif'}}>Fresh & Creative! 🎨</h1>
            <p className="text-white/90 text-sm drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>What delicious art will you create today?</p>
          </div>
          <Link href="/profile">
            <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg border-2 border-white/30">
              <User className="text-white" size={20} strokeWidth={1.5} />
            </button>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10">
          <Link href="/receipt-scan" className="flex-1">
            <button className="w-full bg-gradient-to-r from-orange-400 to-orange-500 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center hover:from-orange-500 hover:to-orange-600 transition-all duration-300 shadow-lg border-2 border-white/20 transform hover:scale-105">
              <div className="flex items-center">
                <span className="text-2xl mr-3 filter drop-shadow-sm">📋</span>
                <span className="text-white font-medium drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>Scan Receipt</span>
              </div>
            </button>
          </Link>
          
          <Link href="/ai-agent" className="flex-1">
            <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg border-2 border-white/20 transform hover:scale-105">
              <div className="flex items-center">
                <span className="text-2xl mr-3 filter drop-shadow-sm">🤖</span>
                <span className="text-white font-medium drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>AI Chef</span>
              </div>
            </button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 mt-6">

        {/* Recipe Cards Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>Most recent recipes</h3>
            <button className="text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors" style={{fontFamily: 'Times New Roman, serif'}}>View all</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="w-full h-24 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-2xl mb-3 flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-yellow-100/50 rounded-2xl"></div>
                <span className="text-3xl relative z-10 filter drop-shadow-sm">🍳</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1 drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>Scrambled Eggs</h4>
              <p className="text-orange-100 text-xs mb-2" style={{fontFamily: 'Times New Roman, serif'}}>5 min • Easy</p>
              <div className="flex items-center">
                <span className="text-xs text-yellow-200" style={{fontFamily: 'Times New Roman, serif'}}>⭐ 4.8</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="w-full h-24 bg-gradient-to-br from-green-200 to-emerald-200 rounded-2xl mb-3 flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-green-100/50 rounded-2xl"></div>
                <span className="text-3xl relative z-10 filter drop-shadow-sm">🥗</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1 drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>Garden Salad</h4>
              <p className="text-green-100 text-xs mb-2" style={{fontFamily: 'Times New Roman, serif'}}>10 min • Fresh</p>
              <div className="flex items-center">
                <span className="text-xs text-green-200" style={{fontFamily: 'Times New Roman, serif'}}>⭐ 4.6</span>
              </div>
            </div>
          </div>
        </div>
        

      

        {/* Your Kitchen Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/fresh-items">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl filter drop-shadow-sm">✨</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>{stats.freshItems}</p>
                  <p className="text-xs text-emerald-100" style={{fontFamily: 'Times New Roman, serif'}}>Fresh items</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/expiring-items">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl filter drop-shadow-sm">⏰</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white drop-shadow-sm" style={{fontFamily: 'Times New Roman, serif'}}>{stats.expiringItems}</p>
                  <p className="text-xs text-orange-100" style={{fontFamily: 'Times New Roman, serif'}}>Expiring soon</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
