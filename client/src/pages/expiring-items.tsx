import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Link } from "wouter";

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
    <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Header */}
      <div className="px-6 py-4" style={{backgroundColor: '#1e3a2e'}}>
        <div className="text-center">
          <h1 className="text-white text-xl font-bold" style={{fontFamily: 'Times New Roman, serif'}}>FreshAI</h1>
        </div>
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Expiring Items</h1>
          <p className="text-gray-600" style={{fontFamily: 'Times New Roman, serif'}}>{expiringItems.length} items need your attention</p>
        </div>

      {/* Expiration Tracker */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4" style={{fontFamily: 'Times New Roman, serif'}}>Expiration Tracker</h2>
        <div className="bg-gray-50 rounded-3xl p-6 border-2 border-gray-200">
          {foodItems.length === 0 ? (
            <p className="text-gray-500 text-center" style={{fontFamily: 'Times New Roman, serif'}}>No items in your fridge yet</p>
          ) : expiringItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Clock className="text-green-600" size={32} />
              </div>
              <h3 className="text-gray-800 font-semibold mb-2" style={{fontFamily: 'Times New Roman, serif'}}>All items are fresh!</h3>
              <p className="text-gray-600" style={{fontFamily: 'Times New Roman, serif'}}>No items are expiring soon. Great job managing your food!</p>
            </div>
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
            </div>
          )}
          
          {/* Recipe Suggestions */}
          {foodItems.filter(item => {
            const status = getExpirationStatus(new Date(item.expirationDate));
            return ['expired', 'today', 'tomorrow'].includes(status.status);
          }).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                Recipe Suggestions
              </h3>
              <div className="space-y-2">
                {foodItems
                  .filter(item => {
                    const status = getExpirationStatus(new Date(item.expirationDate));
                    return ['expired', 'today', 'tomorrow'].includes(status.status);
                  })
                  .slice(0, 3)
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