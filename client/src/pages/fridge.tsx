import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FoodItem, insertFoodItemSchema } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import FoodItemCard from "@/components/ui/food-item-card";
import { Search, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findFoodItem } from "@/data/foodDatabase";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { addDays } from "date-fns";

type FilterType = 'all' | 'Vegetable' | 'Fruit' | 'Dairy' | 'Protein' | 'Grains';

export default function Fridge() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    category: "",
    expirationDate: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  // Add food item mutation
  const addFoodItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertFoodItemSchema>) => {
      const response = await fetch('/api/food-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add food item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      setShowAddModal(false);
      setFormData({ name: "", quantity: "", category: "", expirationDate: "" });
      toast({
        title: "Success!",
        description: "Food item added to your fridge",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food item",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.quantity || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in the name, quantity, and category",
        variant: "destructive",
      });
      return;
    }

    // Use selected category (now required)
    const category = formData.category;
    
    // Calculate expiration date if not provided
    let expirationDate: Date;
    if (formData.expirationDate) {
      expirationDate = new Date(formData.expirationDate);
    } else {
      // Auto-detect food item info for expiration calculation
      const foodInfo = findFoodItem(formData.name);
      if (foodInfo) {
        expirationDate = addDays(new Date(), foodInfo.shelfLife);
      } else {
        expirationDate = addDays(new Date(), 7); // Default 7 days
      }
    }

    const submitData = {
      name: formData.name,
      quantity: formData.quantity,
      category,
      expirationDate,
      isFromReceipt: false
    };

    addFoodItemMutation.mutate(submitData);
  };

  // Handle name change with auto-suggestion
  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    // Auto-suggest category and expiration if food is found in database
    const foodInfo = findFoodItem(name);
    if (foodInfo && !formData.category && !formData.expirationDate) {
      setFormData(prev => ({ 
        ...prev, 
        name,
        category: foodInfo.category,
        expirationDate: addDays(new Date(), foodInfo.shelfLife).toISOString().split('T')[0]
      }));
    } else if (foodInfo && !formData.expirationDate) {
      // Only auto-fill expiration if category is already selected
      setFormData(prev => ({ 
        ...prev, 
        name,
        expirationDate: addDays(new Date(), foodInfo.shelfLife).toISOString().split('T')[0]
      }));
    }
  };

  const filteredItems = foodItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    
    return matchesSearch && item.category === activeFilter;
  });

  const filterButtons = [
    { key: 'all' as const, label: 'All' },
    { key: 'Vegetable' as const, label: 'Vegetables' },
    { key: 'Fruit' as const, label: 'Fruits' },
    { key: 'Dairy' as const, label: 'Dairy' },
    { key: 'Protein' as const, label: 'Protein' },
    { key: 'Grains' as const, label: 'Grains' },
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
          onClick={() => setShowAddModal(true)}
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
                onClick={() => setShowAddModal(true)}
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

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800" style={{fontFamily: 'Times New Roman, serif'}}>
                Add Food Item
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700" style={{fontFamily: 'Times New Roman, serif'}}>
                  Food Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Bananas, Chicken Breast, Milk"
                  className="mt-1"
                  style={{fontFamily: 'Times New Roman, serif'}}
                  required
                />
              </div>

              <div>
                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700" style={{fontFamily: 'Times New Roman, serif'}}>
                  Quantity *
                </Label>
                <Input
                  id="quantity"
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="e.g., 2 pieces, 1 lb, 500ml"
                  className="mt-1"
                  style={{fontFamily: 'Times New Roman, serif'}}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700" style={{fontFamily: 'Times New Roman, serif'}}>
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger className="mt-1" style={{fontFamily: 'Times New Roman, serif'}}>
                    <SelectValue placeholder="Choose food category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fruit">Fruit</SelectItem>
                    <SelectItem value="Vegetable">Vegetable</SelectItem>
                    <SelectItem value="Protein">Protein</SelectItem>
                    <SelectItem value="Dairy">Dairy</SelectItem>
                    <SelectItem value="Grains">Grains</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1" style={{fontFamily: 'Times New Roman, serif'}}>
                  Select the category where this item will be organized in your fridge
                </p>
              </div>

              <div>
                <Label htmlFor="expirationDate" className="text-sm font-medium text-gray-700" style={{fontFamily: 'Times New Roman, serif'}}>
                  Expiration Date
                </Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                  className="mt-1"
                  style={{fontFamily: 'Times New Roman, serif'}}
                />
                <p className="text-xs text-gray-500 mt-1" style={{fontFamily: 'Times New Roman, serif'}}>
                  Leave blank for auto-calculation based on food type
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1"
                  style={{fontFamily: 'Times New Roman, serif'}}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addFoodItemMutation.isPending}
                  className="flex-1 text-white"
                  style={{backgroundColor: '#1e3a2e', fontFamily: 'Times New Roman, serif'}}
                >
                  {addFoodItemMutation.isPending ? 'Adding...' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
