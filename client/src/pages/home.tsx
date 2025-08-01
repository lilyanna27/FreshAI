import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodItem, Recipe } from "@shared/schema";
import { getExpirationStatus, getCurrentDateTime } from "@/lib/date-utils";
import { CheckCircle, AlertTriangle, Plus, Clock, MapPin, Search, User, BookOpen, ChefHat } from "lucide-react";
import { Link } from "wouter";
import texturedBackground from "@assets/download_1753924929079.jpg";
import abstractPatternImage from "@assets/download (2)_1754078671579.jpg";

type HomeTab = 'actions' | 'inventory' | 'recipes';

export default function Home() {
  const [activeTab, setActiveTab] = useState<HomeTab>('actions');
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
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

  // Get recent recipes instead of food items
  const recentRecipes = recipes
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
    <div className="pb-8">
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
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'actions'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{
              backgroundColor: activeTab === 'actions' ? '#1e3a2e' : 'transparent',
              fontFamily: 'Times New Roman, serif'
            }}
          >
            Quick Actions
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'inventory'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{
              backgroundColor: activeTab === 'inventory' ? '#1e3a2e' : 'transparent',
              fontFamily: 'Times New Roman, serif'
            }}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === 'recipes'
                ? 'text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            style={{
              backgroundColor: activeTab === 'recipes' ? '#1e3a2e' : 'transparent',
              fontFamily: 'Times New Roman, serif'
            }}
          >
            Past Recipes
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'actions' && (
          <div className="mb-8">
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

              <Link href="/fridge">
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                    <Search className="text-purple-600" size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-base mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Browse Fridge</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>View all items</p>
                </div>
              </Link>

              <Link href="/recipes">
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                    <BookOpen className="text-orange-600" size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-gray-800 text-base mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Recipe Ideas</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Discover recipes</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="mb-8">
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

              <Link href="/fridge">
                <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Search className="text-blue-600" size={20} strokeWidth={1.5} />
                    </div>
                    <span className="text-2xl font-bold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{stats.totalItems}</span>
                  </div>
                  <h3 className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>All Items</h3>
                  <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>View complete inventory</p>
                </div>
              </Link>

              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Plus className="text-gray-400" size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-lg font-bold text-gray-400" style={{fontFamily: 'Times New Roman, serif'}}>+</span>
                </div>
                <h3 className="font-medium text-gray-600" style={{fontFamily: 'Times New Roman, serif'}}>Add Items</h3>
                <p className="text-gray-500 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Use floating + button</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="mb-8">
            {recentRecipes.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <ChefHat className="text-gray-400" size={24} strokeWidth={1.5} />
                </div>
                <p className="text-gray-800 font-medium mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Start Creating</p>
                <p className="text-gray-500 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Your recipe collection will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mr-3">
                          <BookOpen className="text-gray-600" size={20} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>{recipe.name}</h3>
                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="mr-1" size={12} />
                            <span style={{fontFamily: 'Times New Roman, serif'}}>{recipe.cookTime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500" style={{fontFamily: 'Times New Roman, serif'}}>Recently made</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
