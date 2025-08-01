import { useState } from "react";
import { Camera, Upload, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReceiptScan() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'processing' | 'results'>('idle');
  const [scannedItems, setScannedItems] = useState<any[]>([]);

  const mockScannedItems = [
    { name: "Organic Bananas", quantity: "6 pieces", category: "fruits", confidence: 0.95 },
    { name: "Whole Milk", quantity: "1 gallon", category: "dairy", confidence: 0.92 },
    { name: "Roma Tomatoes", quantity: "2 lbs", category: "vegetables", confidence: 0.88 },
    { name: "Ground Beef", quantity: "1 lb", category: "meat", confidence: 0.91 },
    { name: "Spinach", quantity: "5 oz bag", category: "vegetables", confidence: 0.87 }
  ];

  const handleCameraCapture = () => {
    setScanState('scanning');
    // Simulate scanning process
    setTimeout(() => {
      setScanState('processing');
      setTimeout(() => {
        setScannedItems(mockScannedItems);
        setScanState('results');
      }, 2000);
    }, 1000);
  };

  const handleFileUpload = () => {
    setScanState('processing');
    // Simulate processing uploaded file
    setTimeout(() => {
      setScannedItems(mockScannedItems);
      setScanState('results');
    }, 2000);
  };

  const handleConfirmItems = () => {
    // Here you would integrate with your actual receipt scanning API
    console.log('Items to add:', scannedItems);
    setScanState('idle');
    setScannedItems([]);
  };

  const handleRetry = () => {
    setScanState('idle');
    setScannedItems([]);
  };

  if (scanState === 'scanning') {
    return (
      <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
        {/* Header */}
        <div className="px-6 py-4" style={{backgroundColor: '#1e3a2e'}}>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold" style={{fontFamily: 'Times New Roman, serif'}}>FreshAI</h1>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-6">Scanning Receipt</h1>
          <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-32 h-32 bg-gradient-to-br from-apple-green to-emerald-500 rounded-3xl mx-auto mb-6 flex items-center justify-center animate-pulse">
                <Camera className="text-white" size={48} />
              </div>
              <h3 className="text-white font-semibold mb-2">Hold your receipt steady</h3>
              <p className="text-gray-400 text-sm">Make sure all text is clearly visible</p>
            </div>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (scanState === 'processing') {
    return (
      <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
        {/* Header */}
        <div className="px-6 py-4" style={{backgroundColor: '#1e3a2e'}}>
          <div className="text-center">
            <h1 className="text-white text-xl font-bold" style={{fontFamily: 'Times New Roman, serif'}}>FreshAI</h1>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-6">Processing Receipt</h1>
          <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl mx-auto mb-6 flex items-center justify-center">
                <FileText className="text-white animate-bounce" size={48} />
              </div>
              <h3 className="text-white font-semibold mb-2">Reading your receipt</h3>
              <p className="text-gray-400 text-sm">Using AI to extract food items...</p>
              <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-apple-green to-emerald-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  if (scanState === 'results') {
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
            <h1 className="text-2xl font-bold text-white mb-1">Items Found</h1>
            <p className="text-gray-400 text-sm">Review and confirm the items to add to your fridge</p>
          </div>

        <div className="space-y-3 mb-6">
          {scannedItems.map((item, index) => (
            <div key={index} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-apple-green to-emerald-500 rounded-2xl flex items-center justify-center mr-3">
                    <span className="text-white text-lg">
                      {item.category === 'fruits' ? '🍎' : 
                       item.category === 'vegetables' ? '🥬' :
                       item.category === 'dairy' ? '🥛' :
                       item.category === 'meat' ? '🥩' : '🛒'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-gray-400 text-sm">{item.quantity}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    item.confidence > 0.9 ? 'bg-emerald-500/20 text-emerald-400' :
                    item.confidence > 0.8 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}>
                    {Math.round(item.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleRetry}
            variant="outline"
            className="py-4 px-6 bg-gray-700 text-gray-300 border-gray-600 rounded-2xl font-medium hover:bg-gray-600 transition-all"
          >
            <X className="mr-2" size={16} />
            Retry Scan
          </Button>
          <Button
            onClick={handleConfirmItems}
            className="py-4 px-6 bg-gradient-to-r from-apple-green to-emerald-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
          >
            <Check className="mr-2" size={16} />
            Add Items
          </Button>
        </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-white mb-1">Scan Receipt</h1>
          <p className="text-gray-400 text-sm">Quickly add items from your grocery receipt</p>
        </div>

      {/* Scan Options */}
      <div className="space-y-4 mb-8">
        <div 
          onClick={handleCameraCapture}
          className="bg-gray-800 rounded-3xl p-6 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-apple-green to-emerald-500 rounded-2xl flex items-center justify-center mr-4">
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Take Photo</h3>
              <p className="text-gray-400 text-sm">Use your camera to scan a receipt</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full"></div>
        </div>

        <div 
          onClick={handleFileUpload}
          className="bg-gray-800 rounded-3xl p-6 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mr-4">
              <Upload className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Upload Image</h3>
              <p className="text-gray-400 text-sm">Choose a photo from your gallery</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full"></div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-800 rounded-3xl p-6 border border-gray-700">
        <h3 className="text-white font-semibold mb-4">How it works</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-apple-green rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Scan or upload your grocery receipt</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-apple-green rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-gray-300 text-sm">AI extracts food items automatically</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-apple-green rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Review and add items to your fridge</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}