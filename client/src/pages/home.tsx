import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus, getCurrentDateTime } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock, MapPin, Search, User } from "lucide-react";
import { Link } from "wouter";
import texturedBackground from "@assets/download_1753924929079.jpg";
import abstractPatternImage from "@assets/download (2)_1754078671579.jpg";

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
      <div className="px-6 pt-8 pb-6 relative overflow-hidden">
        {/* Solid dark green background */}
        <div 
          className="absolute inset-0 bg-green-800"
          style={{
            backgroundColor: '#1e3a2e'
          }}
        ></div>
        <div className="relative z-10">
        {/* Header with Profile Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="text-center">
              <h1 className="text-white text-3xl font-bold mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Hi, Anika!</h1>
              <p className="text-white/90 text-base" style={{fontFamily: 'Times New Roman, serif'}}>Smart food management for modern kitchens</p>
            </div>
          </div>
          <Link href="/profile">
            <button className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
              <User className="text-white" size={20} strokeWidth={1.5} />
            </button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white" style={{fontFamily: 'Times New Roman, serif'}}>{stats.totalItems}</div>
            <div className="text-white/80 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white" style={{fontFamily: 'Times New Roman, serif'}}>{stats.freshItems}</div>
            <div className="text-white/80 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Fresh</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white" style={{fontFamily: 'Times New Roman, serif'}}>{stats.expiringItems}</div>
            <div className="text-white/80 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Expiring</div>
          </div>
        </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-6 pt-8 rounded-t-3xl -mt-6 relative z-10" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4" style={{fontFamily: 'Times New Roman, serif'}}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/receipt-scan">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <Search className="text-blue-600" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-gray-800 text-base mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Scan Receipt</h3>
                <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Add items quickly</p>
              </div>
            </Link>
            
            <Link href="/ai-agent">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-3">
                  <CheckCircle className="text-green-600" size={24} strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-gray-800 text-base mb-1" style={{fontFamily: 'Times New Roman, serif'}}>AI Assistant</h3>
                <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Get recipe ideas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Inventory Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4" style={{fontFamily: 'Times New Roman, serif'}}>Inventory Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/fresh-items">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-2xl font-bold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{stats.freshItems}</span>
                </div>
                <h3 className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>Fresh Items</h3>
                <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Good condition</p>
              </div>
            </Link>
            
            <Link href="/expiring-items">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="text-yellow-600" size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-2xl font-bold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{stats.expiringItems}</span>
                </div>
                <h3 className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>Expiring Soon</h3>
                <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Needs attention</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4" style={{fontFamily: 'Times New Roman, serif'}}>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                <Plus className="text-gray-400" size={24} strokeWidth={1.5} />
              </div>
              <p className="text-gray-600 font-medium mb-1" style={{fontFamily: 'Times New Roman, serif'}}>No items yet</p>
              <p className="text-gray-500 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Start by adding your first food item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-lg">
                          {item.category === 'vegetables' ? '🥬' : 
                           item.category === 'fruits' ? '🍎' :
                           item.category === 'dairy' ? '🥛' :
                           item.category === 'meat' ? '🥩' : '🍽️'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{item.name}</h3>
                        <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>{item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500" style={{fontFamily: 'Times New Roman, serif'}}>Added recently</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
