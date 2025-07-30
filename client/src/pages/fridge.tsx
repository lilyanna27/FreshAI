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
          <div className="bg-gray-200 animate-pulse rounded-xl h-12"></div>
          <div className="flex gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-full h-8 w-16"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-xl h-40"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Search and Filter */}
      <div className="mb-4">
        <div className="relative mb-3">
          <Input
            type="text"
            placeholder="Search your fridge..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-green/20 focus:border-apple-green"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === key
                  ? 'bg-apple-green text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Food Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          {searchTerm ? (
            <p className="text-gray-500">No items match your search</p>
          ) : foodItems.length === 0 ? (
            <>
              <p className="text-gray-500 text-lg mb-2">Your fridge is empty</p>
              <p className="text-gray-400">Add your first item to get started!</p>
            </>
          ) : (
            <p className="text-gray-500">No items in this category</p>
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
