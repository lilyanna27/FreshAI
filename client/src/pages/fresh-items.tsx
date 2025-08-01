import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import { CheckCircle, Calendar, MapPin } from "lucide-react";

export default function FreshItems() {
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const freshItems = foodItems.filter(item => {
    const status = getExpirationStatus(new Date(item.expirationDate));
    return status.status === 'fresh';
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

      <div className="px-6 pt-8">
        <div className="mb-6">
          {freshItems.length === 0 && (
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="text-green-400" size={32} />
              </div>
              <h3 className="text-white font-semibold mb-2">No fresh items yet</h3>
              <p className="text-gray-400 text-sm">Add some ingredients to start tracking freshness</p>
            </div>
          )}
        </div>

        {/* Fresh Items List */}
        <div className="space-y-4">
        {freshItems.map((item) => {
          const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
          const daysLeft = Math.ceil((new Date(item.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={item.id} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mr-4">
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
                      <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-green-400 text-sm font-medium">Fresh</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Quantity: {item.quantity}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Expires in {daysLeft} days</span>
                    </div>
                    {item.category && (
                      <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {item.storageTips && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs">
                    <span className="text-green-400 font-medium">💡 Tip:</span> {item.storageTips}
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}