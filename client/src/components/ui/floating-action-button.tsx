import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
}

export default function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-28 right-6 w-16 h-16 bg-gradient-to-br from-apple-green to-emerald-500 text-white rounded-3xl shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-40"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  );
}
