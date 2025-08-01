import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Expiring() {
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/food-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Success",
        description: "Item removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const categorizedItems = {
    today: foodItems.filter(item => {
      const status = getExpirationStatus(new Date(item.expirationDate));
      return status.status === 'today';
    }),
    soon: foodItems.filter(item => {
      const status = getExpirationStatus(new Date(item.expirationDate));
      return ['tomorrow', 'soon'].includes(status.status);
    }),
    expired: foodItems.filter(item => {
      const status = getExpirationStatus(new Date(item.expirationDate));
      return status.status === 'expired';
    }),
  };

  const handleMarkAsUsed = (id: string) => {
    deleteItemMutation.mutate(id);
  };

  const handleRemoveItem = (id: string) => {
    deleteItemMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <div className="bg-gray-700 animate-pulse rounded h-6 w-48 mb-2"></div>
          <div className="bg-gray-700 animate-pulse rounded h-4 w-32"></div>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-gray-700 animate-pulse rounded-xl h-16"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalExpiringItems = categorizedItems.today.length + categorizedItems.soon.length + categorizedItems.expired.length;

  return (
    <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Header */}
      <div className="px-6 py-4" style={{backgroundColor: '#1e3a2e'}}>
        <div className="text-center">
          <h1 className="text-white text-xl font-bold" style={{fontFamily: 'Times New Roman, serif'}}>FreshAI</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">About to Expire</h2>
          <p className="text-gray-400 text-sm">Items that need your attention</p>
        </div>

      {totalExpiringItems === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-700 text-center">
          <CheckCircle className="mx-auto text-apple-green mb-3" size={48} />
          <p className="text-gray-400 text-lg mb-2">All items are fresh!</p>
          <p className="text-gray-500">No items are expiring soon</p>
        </div>
      ) : (
        <>
          {/* Expiring Today */}
          {categorizedItems.today.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-vermillion mb-3">Expiring Today</h3>
              {categorizedItems.today.map((item) => {
                const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
                return (
                  <div key={item.id} className="bg-gray-800 rounded-xl p-4 shadow-sm border border-red-500/30 mb-3">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                        <AlertTriangle className="text-vermillion" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.quantity}</p>
                        <p className="text-xs text-vermillion font-medium">{expirationInfo.message}</p>
                      </div>
                      <Button
                        onClick={() => handleMarkAsUsed(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="px-3 py-1 bg-vermillion text-white text-xs rounded-full hover:bg-red-600"
                      >
                        Mark as Used
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expiring Soon */}
          {categorizedItems.soon.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-yellow-600 mb-3">Expiring Soon</h3>
              {categorizedItems.soon.map((item) => {
                const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
                return (
                  <div key={item.id} className="bg-gray-800 rounded-xl p-4 shadow-sm border border-yellow-500/30 mb-3">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                        <Clock className="text-yellow-600" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.quantity}</p>
                        <p className="text-xs text-yellow-600 font-medium">{expirationInfo.message}</p>
                      </div>
                      <Button
                        onClick={() => handleMarkAsUsed(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-full hover:bg-yellow-600"
                      >
                        Mark as Used
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Already Expired */}
          {categorizedItems.expired.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-600 mb-3">Already Expired</h3>
              {categorizedItems.expired.map((item) => {
                const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
                return (
                  <div key={item.id} className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-600 mb-3 opacity-75">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                        <X className="text-gray-500" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{item.name}</h4>
                        <p className="text-sm text-gray-400">{item.quantity}</p>
                        <p className="text-xs text-gray-400 font-medium">{expirationInfo.message}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded-full hover:bg-gray-600"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
