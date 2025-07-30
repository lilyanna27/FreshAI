import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-24 right-6 w-14 h-14 bg-apple-green text-white rounded-full shadow-lg hover:bg-cal-poly-green transition-colors flex items-center justify-center z-40"
    >
      <Plus size={24} />
    </button>
  );
}
