import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock } from "lucide-react";

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
    <div className="p-4">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-apple-green to-cal-poly-green rounded-xl p-6 text-white mb-6">
        <h2 className="text-xl font-semibold mb-2">Welcome back, John!</h2>
        <p className="text-sm opacity-90">
          You have <span className="font-medium">{stats.totalItems} items</span> in your fridge
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-apple-green/10 rounded-lg flex items-center justify-center mr-3">
              <CheckCircle className="text-apple-green" size={16} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.freshItems}</p>
              <p className="text-xs text-gray-400">Fresh items</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-vermillion/10 rounded-lg flex items-center justify-center mr-3">
              <AlertTriangle className="text-vermillion" size={16} />
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
        <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-700 text-center">
            <p className="text-gray-400">No items in your fridge yet</p>
            <p className="text-sm text-gray-500 mt-2">Add your first item to get started!</p>
          </div>
        ) : (
          recentActivity.map((item) => {
            const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
            return (
              <div key={item.id} className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700 mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-apple-green/20 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="text-apple-green" size={16} />
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
