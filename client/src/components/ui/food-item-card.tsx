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
      className={`rounded-3xl p-5 border relative cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 ${
        expirationInfo.status === 'expired' ? 'opacity-75' : ''
      }`}
      style={{backgroundColor: '#1e3a2e', borderColor: '#2d4a3e'}}
    >
      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${expirationInfo.dotColor}`}></div>
      
      {item.imageUrl ? (
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-28 object-cover rounded-2xl mb-4"
        />
      ) : (
        <div className="w-full h-28 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden" style={{backgroundColor: '#2d4a3e'}}>
          <div className="text-2xl font-bold text-white opacity-30" style={{fontFamily: 'Times New Roman, serif'}}>
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/5 rounded-full"></div>
        </div>
      )}
      
      <h4 className="font-semibold text-white mb-1 text-sm">{item.name}</h4>
      <p className="text-xs text-gray-400 mb-3">{item.quantity}</p>
      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
        expirationInfo.status === 'fresh' ? 'bg-emerald-500/20 text-emerald-400' :
        expirationInfo.status === 'expired' ? 'bg-red-500/20 text-red-400' :
        'bg-orange-500/20 text-orange-400'
      }`}>
        {expirationInfo.message}
      </div>
    </div>
  );
}
