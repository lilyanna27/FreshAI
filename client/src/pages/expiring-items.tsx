import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

export default function ExpiringItems() {
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const expiringItems = foodItems.filter(item => {
    const status = getExpirationStatus(new Date(item.expirationDate));
    return ['today', 'tomorrow', 'soon', 'expired'].includes(status.status);
  });

  // Sort by urgency: expired first, then by expiration date
  const sortedItems = expiringItems.sort((a, b) => {
    const statusA = getExpirationStatus(new Date(a.expirationDate));
    const statusB = getExpirationStatus(new Date(b.expirationDate));
    
    if (statusA.status === 'expired' && statusB.status !== 'expired') return -1;
    if (statusA.status !== 'expired' && statusB.status === 'expired') return 1;
    
    return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-700 animate-pulse rounded-2xl h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 mb-4">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mr-4">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Expiring Items</h1>
              <p className="text-white/90">{expiringItems.length} items need your attention</p>
            </div>
          </div>
        </div>

        {expiringItems.length === 0 && (
          <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <Clock className="text-green-400" size={32} />
            </div>
            <h3 className="text-white font-semibold mb-2">All items are fresh!</h3>
            <p className="text-gray-400 text-sm">No items are expiring soon. Great job managing your food!</p>
          </div>
        )}
      </div>

      {/* Expiring Items List */}
      <div className="space-y-4">
        {sortedItems.map((item) => {
          const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
          const daysLeft = Math.ceil((new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          const getUrgencyColor = (status: string) => {
            switch (status) {
              case 'expired': return 'from-red-500 to-red-600';
              case 'today': return 'from-red-400 to-orange-500';
              case 'tomorrow': return 'from-orange-400 to-yellow-500';
              case 'soon': return 'from-yellow-400 to-orange-400';
              default: return 'from-gray-500 to-gray-600';
            }
          };

          const getStatusIcon = (status: string) => {
            switch (status) {
              case 'expired': return '⚠️';
              case 'today': return '🔴';
              case 'tomorrow': return '🟡';
              case 'soon': return '🟠';
              default: return '⏰';
            }
          };

          return (
            <div key={item.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center">
                <div className={`w-14 h-14 bg-gradient-to-br ${getUrgencyColor(expirationInfo.status)} rounded-2xl flex items-center justify-center mr-4`}>
                  <span className="text-white text-lg">
                    {item.category === 'vegetables' ? '🥬' : 
                     item.category === 'fruits' ? '🍎' :
                     item.category === 'dairy' ? '🥛' :
                     item.category === 'meat' ? '🥩' : '🍽️'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white">{item.name}</h3>
                    <div className="flex items-center">
                      <span className="mr-2">{getStatusIcon(expirationInfo.status)}</span>
                      <span className={`text-sm font-medium ${expirationInfo.color}`}>
                        {expirationInfo.message}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Quantity: {item.quantity}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>
                        {expirationInfo.status === 'expired' 
                          ? `Expired ${Math.abs(daysLeft)} days ago`
                          : expirationInfo.status === 'today'
                          ? 'Expires today'
                          : expirationInfo.status === 'tomorrow'
                          ? 'Expires tomorrow'
                          : `Expires in ${daysLeft} days`
                        }
                      </span>
                    </div>
                    {item.category && (
                      <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {expirationInfo.status === 'expired' && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-red-400 text-xs">
                    <span className="font-medium">⚠️ Action needed:</span> This item has expired and should be disposed of safely.
                  </p>
                </div>
              )}
              
              {item.storageTips && expirationInfo.status !== 'expired' && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs">
                    <span className="text-orange-400 font-medium">💡 Tip:</span> {item.storageTips}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}