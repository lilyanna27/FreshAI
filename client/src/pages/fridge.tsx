import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import FoodItemCard from "@/components/ui/food-item-card";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

type FilterType = 'all' | 'vegetables' | 'fruits' | 'dairy' | 'meat';

export default function Fridge() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    
    return matchesSearch && item.category === activeFilter;
  });

  const filterButtons = [
    { key: 'all' as const, label: 'All' },
    { key: 'vegetables' as const, label: 'Vegetables' },
    { key: 'fruits' as const, label: 'Fruits' },
    { key: 'dairy' as const, label: 'Dairy' },
    { key: 'meat' as const, label: 'Meat' },
  ];

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
    <div className="pb-24 px-6 pt-8 min-h-screen" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      <div>
        {/* Header with title and add button */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1" style={{fontFamily: 'Times New Roman, serif'}}>My Fridge</h1>
          <p className="text-gray-500" style={{fontFamily: 'Times New Roman, serif'}}>{stats.totalItems} items stored</p>
        </div>
        <button 
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{backgroundColor: '#1e3a2e'}}
        >
          <Plus className="text-white" size={24} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6 mt-8">
        <div className="bg-gray-100 rounded-full px-4 py-3 flex items-center">
          <Search className="text-gray-400 mr-3" size={20} />
          <input 
            type="text" 
            placeholder="Search your fridge..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-gray-700 placeholder-gray-400 flex-1 outline-none"
            style={{fontFamily: 'Times New Roman, serif'}}
          />
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeFilter === key
                ? 'text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{
              backgroundColor: activeFilter === key ? '#1e3a2e' : '',
              fontFamily: 'Times New Roman, serif'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          {searchTerm ? (
            <p className="text-gray-400" style={{fontFamily: 'Times New Roman, serif'}}>No items match your search</p>
          ) : foodItems.length === 0 ? (
            <div className="flex flex-col items-center">
              {/* Green lettuce icon */}
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="35" fill="#4ade80"/>
                  <path d="M25 35 Q30 25, 40 30 Q50 25, 55 35 Q50 45, 40 40 Q30 45, 25 35" fill="#22c55e"/>
                  <path d="M35 30 Q40 25, 45 30 Q40 35, 35 30" fill="#16a34a"/>
                  <path d="M30 40 Q35 35, 40 40 Q35 45, 30 40" fill="#16a34a"/>
                  <path d="M40 40 Q45 35, 50 40 Q45 45, 40 40" fill="#16a34a"/>
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-800 mb-2" style={{fontFamily: 'Times New Roman, serif'}}>
                Your fridge is empty
              </h2>
              <p className="text-gray-500 mb-8" style={{fontFamily: 'Times New Roman, serif'}}>
                Add some items to get recipe suggestions
              </p>
              
              <button 
                className="px-6 py-3 rounded-full text-white font-medium shadow-lg flex items-center"
                style={{backgroundColor: '#1e3a2e', fontFamily: 'Times New Roman, serif'}}
              >
                <Plus className="mr-2" size={18} />
                Add Your First Item
              </button>
            </div>
          ) : (
            <p className="text-gray-400" style={{fontFamily: 'Times New Roman, serif'}}>No items in this category</p>
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
    </div>
  );
}
