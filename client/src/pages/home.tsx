import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus, getCurrentDateTime } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock, MapPin, Search } from "lucide-react";

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
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        {/* Illustrated Food Basket */}
        <div className="bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500 rounded-3xl p-6 mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-white text-xl font-semibold mb-2">Fresh ingredients await!</h2>
            <p className="text-white/90 text-sm">
              You have {stats.totalItems} items ready to cook
            </p>
          </div>
          {/* Decorative organic shape */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>
        

      </div>

      {/* My Meal Plans Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">My meal plans</h3>
          <button className="text-apple-green text-sm font-medium">View all</button>
        </div>
        
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mr-4 flex items-center justify-center">
              <div className="text-white text-xs font-bold">🥗</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full mr-2">BREAKFAST</span>
                <span className="text-xs text-orange-400 font-medium">🔥 125 kcal</span>
              </div>
              <h4 className="text-white font-semibold mb-1">Fresh Garden Salad</h4>
              <p className="text-gray-400 text-xs mb-2">Mixed greens with seasonal vegetables</p>
              <div className="flex items-center text-xs text-gray-400">
                <span className="mr-3">🚗 Ready to prepare</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      

      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-apple-green/20 rounded-2xl flex items-center justify-center mr-3">
              <CheckCircle className="text-apple-green" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.freshItems}</p>
              <p className="text-xs text-gray-400">Fresh items</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mr-3">
              <AlertTriangle className="text-orange-400" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.expiringItems}</p>
              <p className="text-xs text-gray-400">Expiring soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 text-center relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-apple-green to-emerald-500 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl">🍽️</span>
              </div>
              <p className="text-gray-300 font-medium mb-2">Your kitchen story begins here</p>
              <p className="text-sm text-gray-500">Add your first ingredient and start cooking!</p>
            </div>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full"></div>
          </div>
        ) : (
          recentActivity.map((item) => {
            const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
            return (
              <div key={item.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 mb-3">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-apple-green to-emerald-500 rounded-2xl flex items-center justify-center mr-3">
                    <Plus className="text-white" size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Added {item.name}</p>
                    <p className="text-xs text-gray-400">Recently added</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-medium ${expirationInfo.color}`}>
                      {expirationInfo.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
