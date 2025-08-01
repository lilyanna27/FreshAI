import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import FoodItemCard from "@/components/ui/food-item-card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type FilterType = 'all' | 'fresh' | 'expiring' | 'expired';

export default function Fridge() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    
    const status = getExpirationStatus(new Date(item.expirationDate));
    
    switch (activeFilter) {
      case 'fresh':
        return matchesSearch && status.status === 'fresh';
      case 'expiring':
        return matchesSearch && ['today', 'tomorrow', 'soon'].includes(status.status);
      case 'expired':
        return matchesSearch && status.status === 'expired';
      default:
        return matchesSearch;
    }
  });

  const filterButtons = [
    { key: 'all' as const, label: 'All' },
    { key: 'fresh' as const, label: 'Fresh' },
    { key: 'expiring' as const, label: 'Expiring' },
    { key: 'expired' as const, label: 'Expired' },
  ];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4 space-y-3">
          <div className="bg-gray-700 animate-pulse rounded-xl h-12"></div>
          <div className="flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-700 animate-pulse rounded-full h-8 w-16"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-700 animate-pulse rounded-xl h-40"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-6 pt-8" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Search and Filters Section */}
      
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="bg-gray-800 rounded-2xl p-4 flex items-center border border-gray-700">
          <Search className="text-gray-400 mr-3" size={20} />
          <input 
            type="text" 
            placeholder="Search for your query"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-white placeholder-gray-400 flex-1 outline-none"
          />
          <div className="w-10 h-10 bg-apple-green rounded-xl flex items-center justify-center">
            <Search className="text-white" size={16} />
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-6 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === key
                ? 'bg-apple-green text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Latest Recipes Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Latest Recipes</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-3xl p-4 border border-gray-700">
            <div className="w-full h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mb-3 flex items-center justify-center">
              <span className="text-white text-2xl">🍔</span>
            </div>
            <h4 className="text-white font-medium text-sm mb-1">Special Burger</h4>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">❤️ 45</span>
              <span className="text-gray-400 text-xs">⭐ 4.8</span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-3xl p-4 border border-gray-700">
            <div className="w-full h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-3 flex items-center justify-center">
              <span className="text-white text-2xl">☕</span>
            </div>
            <h4 className="text-white font-medium text-sm mb-1">Filter Coffee</h4>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">❤️ 32</span>
              <span className="text-gray-400 text-xs">⭐ 4.6</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe of the Week */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recipe of the week</h3>
        <div className="bg-gradient-to-br from-pink-400 to-orange-400 rounded-3xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-white font-semibold text-lg mb-1">Summer Smoothie</h4>
                <p className="text-white/80 text-sm">Fresh and healthy drink</p>
              </div>
              <div className="bg-white/20 rounded-2xl px-3 py-1">
                <span className="text-white text-sm font-bold">4.9 ⭐</span>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full"></div>
        </div>
      </div>
      
      {/* Food Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
            <p className="text-gray-400">No items match your search</p>
          ) : foodItems.length === 0 ? (
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 text-center relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-apple-green to-emerald-500 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                  <span className="text-white text-2xl">🥬</span>
                </div>
                <p className="text-gray-300 font-medium mb-2">Your fridge is empty</p>
                <p className="text-sm text-gray-500">Add your first item to get started!</p>
              </div>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full"></div>
            </div>
          ) : (
            <p className="text-gray-400">No items in this category</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <FoodItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
