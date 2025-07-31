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
      {/* Header Section */}
      <div className="px-6 pt-8 pb-6 rounded-b-3xl" style={{backgroundColor: '#35AB56'}}>
        {/* Header with Profile Button */}
        <div className="flex items-center justify-between mb-6">
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
        <div className="flex gap-3">
          <Link href="/receipt-scan" className="flex-1">
            <button className="w-full bg-orange-500 rounded-2xl p-4 flex items-center justify-center hover:bg-orange-600 transition-all duration-300 shadow-lg border-2 border-white/20 transform hover:scale-105">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📋</span>
                <span className="text-white font-medium" style={{fontFamily: 'Times New Roman, serif'}}>Scan Receipt</span>
              </div>
            </button>
          </Link>
          
          <Link href="/ai-agent" className="flex-1">
            <button className="w-full bg-emerald-600 rounded-2xl p-4 flex items-center justify-center hover:bg-emerald-700 transition-all duration-300 shadow-lg border-2 border-white/20 transform hover:scale-105">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🤖</span>
                <span className="text-white font-medium" style={{fontFamily: 'Times New Roman, serif'}}>AI Chef</span>
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
            <div className="bg-red-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="w-full h-24 bg-orange-200 rounded-2xl mb-3 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🍳</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Scrambled Eggs</h4>
              <p className="text-orange-100 text-xs mb-2" style={{fontFamily: 'Times New Roman, serif'}}>5 min • Easy</p>
              <div className="flex items-center">
                <span className="text-xs text-yellow-200" style={{fontFamily: 'Times New Roman, serif'}}>⭐ 4.8</span>
              </div>
            </div>
            
            <div className="bg-green-600 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="w-full h-24 bg-green-200 rounded-2xl mb-3 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🥗</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Garden Salad</h4>
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
            <div className="bg-emerald-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white" style={{fontFamily: 'Times New Roman, serif'}}>{stats.freshItems}</p>
                  <p className="text-xs text-emerald-100" style={{fontFamily: 'Times New Roman, serif'}}>Fresh items</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/expiring-items">
            <div className="bg-orange-500 rounded-3xl p-4 shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">⏰</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white" style={{fontFamily: 'Times New Roman, serif'}}>{stats.expiringItems}</p>
                  <p className="text-xs text-orange-100" style={{fontFamily: 'Times New Roman, serif'}}>Expiring soon</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Expiration Tracker */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{fontFamily: 'Times New Roman, serif'}}>Expiration Tracker</h3>
          <div className="bg-gray-50 rounded-3xl p-6 border-2 border-gray-200">
            {foodItems.length === 0 ? (
              <p className="text-gray-500 text-center" style={{fontFamily: 'Times New Roman, serif'}}>No items in your fridge yet</p>
            ) : (
              <div className="space-y-3">
                {foodItems
                  .map(item => ({
                    ...item,
                    expirationInfo: getExpirationStatus(new Date(item.expirationDate))
                  }))
                  .filter(item => item.expirationInfo.status !== 'fresh' || new Date(item.expirationDate).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000)
                  .sort((a, b) => {
                    const priorityOrder = { expired: 0, today: 1, tomorrow: 2, soon: 3, fresh: 4 };
                    return priorityOrder[a.expirationInfo.status] - priorityOrder[b.expirationInfo.status];
                  })
                  .slice(0, 5)
                  .map(item => {
                    const getColorByStatus = (status: string) => {
                      switch (status) {
                        case 'expired':
                        case 'today':
                          return 'text-red-600';
                        case 'tomorrow':
                        case 'soon':
                          return 'text-yellow-600';
                        default:
                          return 'text-green-600';
                      }
                    };

                    const getDaysText = (status: string, message: string) => {
                      if (status === 'expired') return message;
                      if (status === 'today') return '1 day left';
                      if (status === 'tomorrow') return '2 days left';
                      const match = message.match(/(\d+) days/);
                      return match ? `${match[1]} days left` : message;
                    };

                    return (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>
                              {item.name}
                            </span>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className={`font-medium ${getColorByStatus(item.expirationInfo.status)}`} style={{fontFamily: 'Times New Roman, serif'}}>
                              {getDaysText(item.expirationInfo.status, item.expirationInfo.message)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
                {foodItems.length > 5 && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-center text-gray-500 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>
                      View all items in Fridge
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Recipe Suggestions */}
            {foodItems.filter(item => {
              const status = getExpirationStatus(new Date(item.expirationDate));
              return ['expired', 'today', 'tomorrow'].includes(status.status);
            }).length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                  Recipe Suggestions
                </h4>
                <div className="space-y-2">
                  {foodItems
                    .filter(item => {
                      const status = getExpirationStatus(new Date(item.expirationDate));
                      return ['expired', 'today', 'tomorrow'].includes(status.status);
                    })
                    .slice(0, 2)
                    .map(item => (
                      <div key={`recipe-${item.id}`}>
                        <p className="text-gray-700 font-medium" style={{fontFamily: 'Times New Roman, serif'}}>
                          {item.name} Salad - <Link href="/recipes" className="text-blue-600 hover:underline">link</Link>
                        </p>
                        <p className="text-gray-600 text-sm ml-4" style={{fontFamily: 'Times New Roman, serif'}}>
                          • uses {item.name.toLowerCase()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
