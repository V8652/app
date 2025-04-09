
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, Check, CircleDot, Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserCategories, saveUserCategories } from '@/lib/db';
import { pickFile } from '@/lib/import-export';
import { checkAndRequestStoragePermissions } from '@/lib/import-export';
import { isAndroidDevice, isCapacitorApp } from '@/lib/export-path';

// Expanded color options to 25 distinct colors
const COLOR_OPTIONS = [
  '#9b87f5', // Primary Purple
  '#F97316', // Bright Orange
  '#0EA5E9', // Ocean Blue
  '#D946EF', // Magenta Pink
  '#8B5CF6', // Vivid Purple
  '#22C55E', // Green
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8E9196', // Neutral Gray
  '#0891B2', // Cyan
  '#4338CA', // Deep Indigo
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#16A34A', // Forest Green
  '#A855F7', // Lavender
  '#FB7185', // Coral
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#8B5CF6', // Purple
  '#84CC16', // Lime
  '#3B82F6', // Blue
  '#FACC15', // Yellow
  '#10B981'  // Emerald
];

const CategoryManager = () => {
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const defaultExpenseCategories = ['other'];
  const defaultIncomeCategories = ['other'];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const userCategories = await getUserCategories();
        if (userCategories.expenseCategories) {
          setCustomExpenseCategories(userCategories.expenseCategories);
        }
        if (userCategories.incomeCategories) {
          setCustomIncomeCategories(userCategories.incomeCategories);
        }
        if (userCategories.categoryColors) {
          setCategoryColors(userCategories.categoryColors);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    
    loadCategories();
  }, []);

  const handleAddExpenseCategory = () => {
    if (!newExpenseCategory.trim()) return;
    
    const formattedCategory = newExpenseCategory.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (defaultExpenseCategories.includes(formattedCategory) || 
        customExpenseCategories.includes(formattedCategory)) {
      toast({
        title: 'Category already exists',
        description: 'Please enter a unique category name.',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedCategories = [...customExpenseCategories, formattedCategory];
    setCustomExpenseCategories(updatedCategories);
    
    const updatedColors = {
      ...categoryColors,
      [formattedCategory]: selectedColor
    };
    setCategoryColors(updatedColors);
    
    saveCategories('expense', updatedCategories, updatedColors);
    setNewExpenseCategory('');
    
    toast({
      title: 'Category added',
      description: `Added expense category "${formattedCategory}" with color ${selectedColor}`,
    });
  };
  
  const handleAddIncomeCategory = () => {
    if (!newIncomeCategory.trim()) return;
    
    const formattedCategory = newIncomeCategory.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (defaultIncomeCategories.includes(formattedCategory) || 
        customIncomeCategories.includes(formattedCategory)) {
      toast({
        title: 'Category already exists',
        description: 'Please enter a unique category name.',
        variant: 'destructive',
      });
      return;
    }
    
    const updatedCategories = [...customIncomeCategories, formattedCategory];
    setCustomIncomeCategories(updatedCategories);
    
    const updatedColors = {
      ...categoryColors,
      [formattedCategory]: selectedColor
    };
    setCategoryColors(updatedColors);
    
    saveCategories('income', updatedCategories, updatedColors);
    setNewIncomeCategory('');
    
    toast({
      title: 'Category added',
      description: `Added income category "${formattedCategory}" with color ${selectedColor}`,
    });
  };
  
  const handleRemoveExpenseCategory = (category: string) => {
    const updatedCategories = customExpenseCategories.filter(c => c !== category);
    setCustomExpenseCategories(updatedCategories);
    saveCategories('expense', updatedCategories, categoryColors);
    
    toast({
      title: 'Category removed',
      description: `Removed expense category "${category}"`,
    });
  };
  
  const handleRemoveIncomeCategory = (category: string) => {
    const updatedCategories = customIncomeCategories.filter(c => c !== category);
    setCustomIncomeCategories(updatedCategories);
    saveCategories('income', updatedCategories, categoryColors);
    
    toast({
      title: 'Category removed',
      description: `Removed income category "${category}"`,
    });
  };
  
  const updateCategoryColor = (category: string, color: string) => {
    const updatedColors = {
      ...categoryColors,
      [category]: color
    };
    setCategoryColors(updatedColors);
    
    if (customExpenseCategories.includes(category)) {
      saveCategories('expense', customExpenseCategories, updatedColors);
    } else if (customIncomeCategories.includes(category)) {
      saveCategories('income', customIncomeCategories, updatedColors);
    }
    
    toast({
      title: 'Color updated',
      description: `Updated color for category "${category}" to ${color}`,
    });
  };
  
  const saveCategories = async (
    type: 'expense' | 'income', 
    categories: string[], 
    colors: Record<string, string>
  ) => {
    try {
      const currentUserCategories = await getUserCategories();
      
      await saveUserCategories({
        id: 'user-categories',
        expenseCategories: type === 'expense' ? categories : currentUserCategories.expenseCategories,
        incomeCategories: type === 'income' ? categories : currentUserCategories.incomeCategories,
        categoryColors: colors
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: 'Error saving categories',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || '#8E9196';
  };

  // Export categories to CSV
  const handleExportCategories = async () => {
    try {
      setIsExporting(true);
      console.log('Starting categories export...');
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to export categories.",
          variant: "destructive",
        });
        return;
      }
      
      // Create CSV content
      let csvContent = "category_name,category_type,color\n";
      
      // Add expense categories
      customExpenseCategories.forEach(category => {
        const color = getCategoryColor(category);
        csvContent += `${category},expense,${color}\n`;
      });
      
      // Add income categories
      customIncomeCategories.forEach(category => {
        const color = getCategoryColor(category);
        csvContent += `${category},income,${color}\n`;
      });
      
      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const isAndroid = isAndroidDevice();
      const isCapacitor = isCapacitorApp();
      
      if (isAndroid && isCapacitor) {
        // Use Capacitor to save the file on Android
        const { Filesystem } = await import('@capacitor/filesystem');
        const { Directory } = await import('@capacitor/filesystem');
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async function() {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];
          
          try {
            const date = new Date();
            const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const fileName = `categories_${timestamp}.csv`;
            
            // Write to downloads directory
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Content,
              directory: Directory.Documents,
              recursive: true
            });
            
            toast({
              title: "Export Complete",
              description: `Categories exported to ${result.uri || fileName}`,
            });
            
          } catch (error) {
            console.error('Error saving file:', error);
            toast({
              title: "Export Failed",
              description: `Error saving file: ${(error as Error).message}`,
              variant: "destructive",
            });
          }
        };
      } else {
        // Browser download
        const link = document.createElement("a");
        const date = new Date();
        const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        link.download = `categories_${timestamp}.csv`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "Export Complete",
          description: "Categories exported successfully",
        });
      }
    } catch (error) {
      console.error('Error exporting categories:', error);
      toast({
        title: "Export Failed",
        description: `Failed to export categories: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import categories from CSV
  const handleImportCategories = async () => {
    try {
      setIsImporting(true);
      console.log('Starting categories import...');
      
      // Request storage permissions first on Android
      const hasPermissions = await checkAndRequestStoragePermissions();
      
      if (!hasPermissions) {
        toast({
          title: "Permission Denied",
          description: "Storage permissions are required to import categories.",
          variant: "destructive",
        });
        return;
      }
      
      // Pick CSV file
      const file = await pickFile(['text/csv']);
      
      if (!file) {
        console.log('No file selected, cancelling import');
        setIsImporting(false);
        return;
      }
      
      console.log(`Selected file for import: ${file.name}, size: ${file.size} bytes`);
      
      // Read file content
      const text = await file.text();
      const lines = text.split('\n');
      
      // Validate header
      const header = lines[0].trim().toLowerCase();
      if (!header.includes('category_name') || !header.includes('category_type') || !header.includes('color')) {
        toast({
          title: "Invalid Format",
          description: "The CSV file does not have the required columns: category_name, category_type, color",
          variant: "destructive",
        });
        return;
      }
      
      // Parse CSV
      const newExpenseCategories = [...customExpenseCategories];
      const newIncomeCategories = [...customIncomeCategories];
      const newCategoryColors = {...categoryColors};
      let added = 0;
      let skipped = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 3) continue;
        
        const categoryName = parts[0].trim();
        const categoryType = parts[1].trim().toLowerCase();
        const color = parts[2].trim();
        
        // Skip default categories
        if (categoryName === 'other') {
          skipped++;
          continue;
        }
        
        // Add to appropriate array if not already present
        if (categoryType === 'expense') {
          if (!newExpenseCategories.includes(categoryName) && !defaultExpenseCategories.includes(categoryName)) {
            newExpenseCategories.push(categoryName);
            newCategoryColors[categoryName] = color;
            added++;
          } else {
            skipped++;
          }
        } else if (categoryType === 'income') {
          if (!newIncomeCategories.includes(categoryName) && !defaultIncomeCategories.includes(categoryName)) {
            newIncomeCategories.push(categoryName);
            newCategoryColors[categoryName] = color;
            added++;
          } else {
            skipped++;
          }
        }
      }
      
      // Save imported categories
      setCustomExpenseCategories(newExpenseCategories);
      setCustomIncomeCategories(newIncomeCategories);
      setCategoryColors(newCategoryColors);
      
      await saveUserCategories({
        id: 'user-categories',
        expenseCategories: newExpenseCategories,
        incomeCategories: newIncomeCategories,
        categoryColors: newCategoryColors
      });
      
      toast({
        title: "Import Complete",
        description: `Added ${added} categories, skipped ${skipped} duplicates.`,
      });
      
    } catch (error) {
      console.error('Error importing categories:', error);
      toast({
        title: "Import Failed",
        description: `Failed to import categories: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
          <TabsList className="mb-4">
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
            <TabsTrigger value="income">Income Categories</TabsTrigger>
          </TabsList>
          
          <div className="flex justify-between mb-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Import/Export Categories</p>
              <p className="text-xs text-muted-foreground">
                Backup or restore your custom categories
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleExportCategories} 
                disabled={isExporting || (!customExpenseCategories.length && !customIncomeCategories.length)}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Categories"}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleImportCategories} 
                disabled={isImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Importing..." : "Import Categories"}
              </Button>
            </div>
          </div>
          
          <TabsContent value="expense">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  placeholder="New expense category"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                  className="flex-1"
                />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-10 p-0" style={{ backgroundColor: selectedColor }}>
                      <span className="sr-only">Pick a color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                      {COLOR_OPTIONS.map((color) => (
                        <Button
                          key={color}
                          variant="outline"
                          className="w-8 h-8 p-0 flex items-center justify-center"
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        >
                          {selectedColor === color && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                          <span className="sr-only">{color}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleAddExpenseCategory} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Default Categories (Cannot be removed)</p>
                <div className="flex flex-wrap gap-2">
                  {defaultExpenseCategories.map(category => (
                    <div key={category} className="px-3 py-1 bg-secondary rounded-md text-sm capitalize">
                      {category}
                    </div>
                  ))}
                </div>
              </div>
              
              {customExpenseCategories.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Custom Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customExpenseCategories.map(category => (
                      <div key={category} className="flex items-center px-3 py-1 rounded-md text-sm"
                           style={{ backgroundColor: getCategoryColor(category), color: '#fff' }}>
                        <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20"
                            >
                              <CircleDot className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                              {COLOR_OPTIONS.map((color) => (
                                <Button
                                  key={color}
                                  variant="outline"
                                  className="w-8 h-8 p-0 flex items-center justify-center"
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateCategoryColor(category, color)}
                                >
                                  {getCategoryColor(category) === color && (
                                    <Check className="h-4 w-4 text-white" />
                                  )}
                                  <span className="sr-only">{color}</span>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20"
                          onClick={() => handleRemoveExpenseCategory(category)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="income">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={newIncomeCategory}
                  onChange={(e) => setNewIncomeCategory(e.target.value)}
                  placeholder="New income category"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIncomeCategory()}
                  className="flex-1"
                />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-10 p-0" style={{ backgroundColor: selectedColor }}>
                      <span className="sr-only">Pick a color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                      {COLOR_OPTIONS.map((color) => (
                        <Button
                          key={color}
                          variant="outline"
                          className="w-8 h-8 p-0 flex items-center justify-center"
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        >
                          {selectedColor === color && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                          <span className="sr-only">{color}</span>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleAddIncomeCategory} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Default Categories (Cannot be removed)</p>
                <div className="flex flex-wrap gap-2">
                  {defaultIncomeCategories.map(category => (
                    <div key={category} className="px-3 py-1 bg-secondary rounded-md text-sm capitalize">
                      {category}
                    </div>
                  ))}
                </div>
              </div>
              
              {customIncomeCategories.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Custom Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customIncomeCategories.map(category => (
                      <div key={category} className="flex items-center px-3 py-1 rounded-md text-sm"
                           style={{ backgroundColor: getCategoryColor(category), color: '#fff' }}>
                        <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20"
                            >
                              <CircleDot className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                              {COLOR_OPTIONS.map((color) => (
                                <Button
                                  key={color}
                                  variant="outline"
                                  className="w-8 h-8 p-0 flex items-center justify-center"
                                  style={{ backgroundColor: color }}
                                  onClick={() => updateCategoryColor(category, color)}
                                >
                                  {getCategoryColor(category) === color && (
                                    <Check className="h-4 w-4 text-white" />
                                  )}
                                  <span className="sr-only">{color}</span>
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20"
                          onClick={() => handleRemoveIncomeCategory(category)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
