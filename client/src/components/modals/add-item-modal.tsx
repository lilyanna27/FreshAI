import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertFoodItem } from "@shared/schema";
import { estimateShelfLife, getStorageTips, categorizeFood } from "@shared/food-data";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    expirationDate: "",
    imageUrl: "",
    category: "",
    storageTips: "",
  });
  
  const [showStorageTips, setShowStorageTips] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addItemMutation = useMutation({
    mutationFn: async (data: InsertFoodItem) => {
      const response = await apiRequest("POST", "/api/food-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Success",
        description: "Food item added successfully",
      });
      onClose();
      setFormData({
        name: "",
        quantity: "",
        expirationDate: "",
        imageUrl: "",
        category: "",
        storageTips: "",
      });
      setShowStorageTips(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food item",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity || !formData.expirationDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate({
      name: formData.name,
      quantity: formData.quantity,
      expirationDate: new Date(formData.expirationDate),
      imageUrl: formData.imageUrl || undefined,
      category: formData.category || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-gray-800 rounded-t-3xl p-6 border-t border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add New Item</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center"
          >
            <X className="text-gray-400" size={16} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="block text-sm font-medium text-white mb-2">
              Item Name *
            </Label>
            <Input
              type="text"
              placeholder="e.g., Organic Apples"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-4 border border-gray-600 bg-gray-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-green/30 focus:border-apple-green transition-all"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-white mb-2">
              Quantity *
            </Label>
            <Input
              type="text"
              placeholder="e.g., 5 pieces, 1 bag"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full p-4 border border-gray-600 bg-gray-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-green/30 focus:border-apple-green transition-all"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-white mb-2">
              Expiration Date *
            </Label>
            <Input
              type="date"
              value={formData.expirationDate}
              onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              className="w-full p-4 border border-gray-600 bg-gray-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-green/30 focus:border-apple-green transition-all"
            />
          </div>

          <div>
            <Label className="block text-sm font-medium text-white mb-2">
              Image URL (optional)
            </Label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full p-4 border border-gray-600 bg-gray-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-apple-green/30 focus:border-apple-green transition-all"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="py-4 px-6 bg-gray-700 text-gray-300 border-gray-600 rounded-2xl font-medium hover:bg-gray-600 transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addItemMutation.isPending}
              className="py-4 px-6 bg-gradient-to-r from-apple-green to-emerald-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
            >
              {addItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
