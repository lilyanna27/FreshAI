import { FoodItem } from "@shared/schema";
import { getExpirationStatus } from "@/lib/date-utils";

interface FoodItemCardProps {
  item: FoodItem;
  onClick?: () => void;
}

export default function FoodItemCard({ item, onClick }: FoodItemCardProps) {
  const expirationInfo = getExpirationStatus(new Date(item.expirationDate));
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative cursor-pointer hover:shadow-md transition-shadow ${
        expirationInfo.status === 'expired' ? 'opacity-75' : ''
      }`}
    >
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${expirationInfo.dotColor}`}></div>
      
      {item.imageUrl ? (
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-24 object-cover rounded-lg mb-3"
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
          <span className="text-gray-400 text-xs">No image</span>
        </div>
      )}
      
      <h4 className="font-medium text-rose-ebony mb-1">{item.name}</h4>
      <p className="text-xs text-gray-500 mb-2">{item.quantity}</p>
      <p className={`text-xs font-medium ${expirationInfo.color}`}>
        {expirationInfo.message}
      </p>
    </div>
  );
}
