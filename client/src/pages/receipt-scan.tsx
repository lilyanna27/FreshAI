import { useState, useRef } from "react";
import { Camera, Upload, FileText, Check, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { receiptScanner, type ScanResult } from "../services/ocr/receiptScanner";
import type { FoodItem } from "../types/food";
import { apiRequest } from "@/lib/queryClient";

export default function ReceiptScan() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'processing' | 'results'>('idle');
  const [scannedItems, setScannedItems] = useState<FoodItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // OCR scanning mutation
  const scanReceiptMutation = useMutation({
    mutationFn: async (file: File): Promise<ScanResult> => {
      console.log('Starting OCR scan...');
      try {
        await receiptScanner.initialize();
        console.log('OCR initialized, processing file...');
        const result = await receiptScanner.scanReceipt(file);
        console.log('OCR result:', result);
        return result;
      } catch (error) {
        console.error('OCR processing error:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Scan successful, found items:', result.items);
      if (result.items.length === 0) {
        toast.error('No food items found in the receipt. Try a clearer image.');
        setScanState('idle');
      } else {
        setScannedItems(result.items);
        setScanState('results');
        toast.success(`Found ${result.items.length} food items in your receipt!`);
      }
    },
    onError: (error) => {
      console.error('OCR scan failed:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Show specific error messages for different types of failures
      if (errorMessage.includes('Unable to read receipt clearly')) {
        toast.error('📷 Image unclear - Try a clearer photo or different angle');
      } else if (errorMessage.includes('No food items found')) {
        toast.error('🛒 No groceries detected - Make sure the receipt contains food items');
      } else if (errorMessage.includes('Failed to initialize')) {
        toast.error('⚠️ Scanner initialization failed - Please try again');
      } else {
        toast.error(`❌ Scan failed: ${errorMessage}`);
      }
      
      setScanState('idle');
    }
  });

  // Save items to database mutation
  const saveItemsMutation = useMutation({
    mutationFn: async (items: FoodItem[]) => {
      const promises = items.map(item => 
        fetch('/api/food-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            quantity: item.quantity,
            expirationDate: item.expirationDate, // Send as Date object, not string
            category: item.category,
            isFromReceipt: true
          })
        })
      );
      await Promise.all(promises);
    },
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-items'] });
      const itemsByCategory = items.reduce((acc, item) => {
        const category = item.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const categoryText = Object.entries(itemsByCategory)
        .map(([category, count]) => `${count} ${category.toLowerCase()} item${count > 1 ? 's' : ''}`)
        .join(', ');
      
      toast.success(`Added ${items.length} items to your fridge by category: ${categoryText}`);
      setScanState('idle');
      setScannedItems([]);
    },
    onError: () => {
      toast.error('Failed to save items. Please try again.');
    }
  });

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      setSelectedFile(file);
      setScanState('processing');
      
      // Add basic validation
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        setScanState('idle');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image file too large. Please select a smaller image.');
        setScanState('idle');
        return;
      }
      
      scanReceiptMutation.mutate(file);
    }
  };

  const handleConfirmItems = () => {
    if (scannedItems.length > 0) {
      saveItemsMutation.mutate(scannedItems);
    }
  };

  const handleRetry = () => {
    setScanState('idle');
    setScannedItems([]);
  };

  // Test function with sample items for debugging
  const handleTestScan = () => {
    const mockItems: FoodItem[] = [
      {
        id: '1',
        name: 'Organic Bananas',
        quantity: '6 pieces',
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        freshness: 'fresh' as const,
        category: 'Fruit',
        confidence: 0.95
      },
      {
        id: '2',
        name: 'Whole Milk',
        quantity: '1 gallon',
        purchaseDate: new Date(),
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        freshness: 'fresh' as const,
        category: 'Dairy',
        confidence: 0.92
      }
    ];
    
    setScannedItems(mockItems);
    setScanState('results');
    toast.success(`Test scan complete! Found ${mockItems.length} items.`);
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
            <h1 className="text-2xl font-bold text-gray-800 mb-6" style={{fontFamily: 'Times New Roman, serif'}}>Processing Receipt</h1>
          <div className="bg-white rounded-3xl p-8 border border-gray-200 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl mx-auto mb-6 flex items-center justify-center animate-pulse">
                <Loader2 className="text-white animate-spin" size={48} />
              </div>
              <h3 className="text-gray-800 font-semibold mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Scanning your receipt...</h3>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Using AI to extract food items</p>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-800 mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Items Found ({scannedItems.length})</h1>
            <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Review and confirm the items to add to your fridge</p>
          </div>

        <div className="space-y-3 mb-6">
          {scannedItems.map((item, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mr-3" style={{backgroundColor: '#1e3a2e'}}>
                    <span className="text-white text-lg">
                      {item.category === 'Fruit' ? '🍎' : 
                       item.category === 'Vegetable' ? '🥬' :
                       item.category === 'Dairy' ? '🥛' :
                       item.category === 'Protein' ? '🥩' : 
                       item.category === 'Grains' ? '🌾' : '🛒'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-gray-800 font-medium" style={{fontFamily: 'Times New Roman, serif'}}>{item.name}</h4>
                    <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>{item.quantity}</p>
                    <p className="text-gray-500 text-xs" style={{fontFamily: 'Times New Roman, serif'}}>Expires: {item.expirationDate.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {item.freshness === 'fresh' && (
                    <CheckCircle2 className="text-green-500" size={16} />
                  )}
                  {item.freshness === 'warning' && (
                    <AlertTriangle className="text-yellow-500" size={16} />
                  )}
                  <div className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-200" style={{fontFamily: 'Times New Roman, serif'}}>
                    {Math.round((item.confidence || 0.8) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleRetry}
            className="py-4 px-6 bg-gray-200 text-gray-700 rounded-2xl font-medium hover:bg-gray-300 transition-all"
            style={{fontFamily: 'Times New Roman, serif'}}
          >
            <X className="mr-2" size={16} />
            Retry Scan
          </Button>
          <Button
            onClick={handleConfirmItems}
            disabled={saveItemsMutation.isPending}
            className="py-4 px-6 text-white rounded-2xl font-medium hover:shadow-lg transition-all duration-300"
            style={{backgroundColor: '#1e3a2e', fontFamily: 'Times New Roman, serif'}}
          >
            {saveItemsMutation.isPending ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : (
              <Check className="mr-2" size={16} />
            )}
            {saveItemsMutation.isPending ? 'Adding...' : `Add ${scannedItems.length} Items`}
          </Button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24" style={{backgroundColor: 'hsl(45, 20%, 97%)'}}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        capture="environment"
      />

      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Scan Receipt</h1>
          <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Quickly add items from your grocery receipt</p>
        </div>

      {/* Scan Options */}
      <div className="space-y-4 mb-8">
        <div 
          onClick={handleCameraCapture}
          className="bg-white rounded-3xl p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mr-4" style={{backgroundColor: '#1e3a2e'}}>
              <Camera className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-gray-800 font-semibold mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Take Photo</h3>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Use your camera to scan a receipt</p>
            </div>
          </div>
        </div>

        <div 
          onClick={handleFileUpload}
          className="bg-white rounded-3xl p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-all duration-300 relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mr-4">
              <Upload className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-gray-800 font-semibold mb-1" style={{fontFamily: 'Times New Roman, serif'}}>Upload Image</h3>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Choose a photo from your gallery</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 mb-4">
        <h3 className="text-gray-800 font-semibold mb-4" style={{fontFamily: 'Times New Roman, serif'}}>How it works</h3>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5" style={{backgroundColor: '#1e3a2e'}}>
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Scan or upload your grocery receipt</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5" style={{backgroundColor: '#1e3a2e'}}>
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>AI extracts food items automatically</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5" style={{backgroundColor: '#1e3a2e'}}>
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <p className="text-gray-600 text-sm" style={{fontFamily: 'Times New Roman, serif'}}>Review and add items to your fridge</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test button for debugging */}
      <div className="bg-yellow-50 rounded-3xl p-4 border border-yellow-200">
        <h4 className="text-gray-800 font-medium mb-2" style={{fontFamily: 'Times New Roman, serif'}}>Test Mode</h4>
        <p className="text-gray-600 text-sm mb-3" style={{fontFamily: 'Times New Roman, serif'}}>Click below to test the scanning results with sample items</p>
        <button
          onClick={handleTestScan}
          className="w-full py-3 px-4 bg-yellow-500 text-white rounded-2xl font-medium hover:bg-yellow-600 transition-all"
          style={{fontFamily: 'Times New Roman, serif'}}
        >
          Test Scan Feature
        </button>
      </div>
      </div>
    </div>
  );
}