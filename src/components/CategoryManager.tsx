import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, Check, CircleDot } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getUserCategories, saveUserCategories } from '@/lib/db';

// Expanded color options to 25 distinct colors
const COLOR_OPTIONS = ['#9b87f5',
// Primary Purple
'#F97316',
// Bright Orange
'#0EA5E9',
// Ocean Blue
'#D946EF',
// Magenta Pink
'#8B5CF6',
// Vivid Purple
'#22C55E',
// Green
'#EF4444',
// Red
'#F59E0B',
// Amber
'#6366F1',
// Indigo
'#EC4899',
// Pink
'#8E9196',
// Neutral Gray
'#0891B2',
// Cyan
'#4338CA',
// Deep Indigo
'#7C3AED',
// Violet
'#DB2777',
// Pink
'#16A34A',
// Forest Green
'#A855F7',
// Lavender
'#FB7185',
// Coral
'#14B8A6',
// Teal
'#F43F5E',
// Rose
'#8B5CF6',
// Purple
'#84CC16',
// Lime
'#3B82F6',
// Blue
'#FACC15',
// Yellow
'#10B981' // Emerald
];
const CategoryManager = () => {
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [newIncomeCategory, setNewIncomeCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0]);
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
    if (defaultExpenseCategories.includes(formattedCategory) || customExpenseCategories.includes(formattedCategory)) {
      toast({
        title: 'Category already exists',
        description: 'Please enter a unique category name.',
        variant: 'destructive'
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
      description: `Added expense category "${formattedCategory}" with color ${selectedColor}`
    });
  };
  const handleAddIncomeCategory = () => {
    if (!newIncomeCategory.trim()) return;
    const formattedCategory = newIncomeCategory.trim().toLowerCase().replace(/\s+/g, '-');
    if (defaultIncomeCategories.includes(formattedCategory) || customIncomeCategories.includes(formattedCategory)) {
      toast({
        title: 'Category already exists',
        description: 'Please enter a unique category name.',
        variant: 'destructive'
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
      description: `Added income category "${formattedCategory}" with color ${selectedColor}`
    });
  };
  const handleRemoveExpenseCategory = (category: string) => {
    const updatedCategories = customExpenseCategories.filter(c => c !== category);
    setCustomExpenseCategories(updatedCategories);
    saveCategories('expense', updatedCategories, categoryColors);
    toast({
      title: 'Category removed',
      description: `Removed expense category "${category}"`
    });
  };
  const handleRemoveIncomeCategory = (category: string) => {
    const updatedCategories = customIncomeCategories.filter(c => c !== category);
    setCustomIncomeCategories(updatedCategories);
    saveCategories('income', updatedCategories, categoryColors);
    toast({
      title: 'Category removed',
      description: `Removed income category "${category}"`
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
      description: `Updated color for category "${category}" to ${color}`
    });
  };
  const saveCategories = async (type: 'expense' | 'income', categories: string[], colors: Record<string, string>) => {
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
        variant: 'destructive'
      });
    }
  };
  const getCategoryColor = (category: string) => {
    return categoryColors[category] || '#8E9196';
  };
  return <Card className="mx-0 my-0">
      <CardHeader className="mx-[3px]">
        <CardTitle>Manage Categories</CardTitle>
      </CardHeader>
      <CardContent className="py-0 px-0 mx-0">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'expense' | 'income')}>
          <TabsList className="mb-4 mx-[18px] my-0 py-0 px-0">
            <TabsTrigger value="expense">Expense Categories</TabsTrigger>
            <TabsTrigger value="income">Income Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="expense" className="my-[13px] py-0 px-0">
            <div className="space-y-4 px-0 mx-[12px] my-px py-[7px]">
              <div className="flex items-center space-x-2">
                <Input value={newExpenseCategory} onChange={e => setNewExpenseCategory(e.target.value)} placeholder="New expense category" onKeyDown={e => e.key === 'Enter' && handleAddExpenseCategory()} className="flex-1" />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-10 p-0" style={{
                    backgroundColor: selectedColor
                  }}>
                      <span className="sr-only">Pick a color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                      {COLOR_OPTIONS.map(color => <Button key={color} variant="outline" className="w-8 h-8 p-0 flex items-center justify-center" style={{
                      backgroundColor: color
                    }} onClick={() => setSelectedColor(color)}>
                          {selectedColor === color && <Check className="h-4 w-4 text-white" />}
                          <span className="sr-only">{color}</span>
                        </Button>)}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleAddExpenseCategory} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-center">Default Categories (Cannot be removed)</p>
                <div className="flex flex-wrap gap-2">
                  {defaultExpenseCategories.map(category => <div key={category} className="px-3 py-1 bg-secondary rounded-md text-sm capitalize">
                      {category}
                    </div>)}
                </div>
              </div>
              
              {customExpenseCategories.length > 0 && <div className="space-y-1">
                  <p className="text-sm font-medium">Custom Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customExpenseCategories.map(category => <div key={category} className="flex items-center px-3 py-1 rounded-md text-sm" style={{
                  backgroundColor: getCategoryColor(category),
                  color: '#fff'
                }}>
                        <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20">
                              <CircleDot className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                              {COLOR_OPTIONS.map(color => <Button key={color} variant="outline" className="w-8 h-8 p-0 flex items-center justify-center" style={{
                          backgroundColor: color
                        }} onClick={() => updateCategoryColor(category, color)}>
                                  {getCategoryColor(category) === color && <Check className="h-4 w-4 text-white" />}
                                  <span className="sr-only">{color}</span>
                                </Button>)}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20" onClick={() => handleRemoveExpenseCategory(category)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>
          </TabsContent>
          
          <TabsContent value="income">
            <div className="space-y-4 mx-[12px] px-0 my-px py-[7px]">
              <div className="flex items-center space-x-2">
                <Input value={newIncomeCategory} onChange={e => setNewIncomeCategory(e.target.value)} placeholder="New income category" onKeyDown={e => e.key === 'Enter' && handleAddIncomeCategory()} className="flex-1" />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-10 p-0" style={{
                    backgroundColor: selectedColor
                  }}>
                      <span className="sr-only">Pick a color</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                      {COLOR_OPTIONS.map(color => <Button key={color} variant="outline" className="w-8 h-8 p-0 flex items-center justify-center" style={{
                      backgroundColor: color
                    }} onClick={() => setSelectedColor(color)}>
                          {selectedColor === color && <Check className="h-4 w-4 text-white" />}
                          <span className="sr-only">{color}</span>
                        </Button>)}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button onClick={handleAddIncomeCategory} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-center">Default Categories (Cannot be removed)</p>
                <div className="flex flex-wrap gap-2">
                  {defaultIncomeCategories.map(category => <div key={category} className="px-3 py-1 bg-secondary rounded-md text-sm capitalize">
                      {category}
                    </div>)}
                </div>
              </div>
              
              {customIncomeCategories.length > 0 && <div className="space-y-1">
                  <p className="text-sm font-medium">Custom Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {customIncomeCategories.map(category => <div key={category} className="flex items-center px-3 py-1 rounded-md text-sm" style={{
                  backgroundColor: getCategoryColor(category),
                  color: '#fff'
                }}>
                        <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20">
                              <CircleDot className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <div className="grid grid-cols-5 gap-2 max-h-[250px] overflow-y-auto">
                              {COLOR_OPTIONS.map(color => <Button key={color} variant="outline" className="w-8 h-8 p-0 flex items-center justify-center" style={{
                          backgroundColor: color
                        }} onClick={() => updateCategoryColor(category, color)}>
                                  {getCategoryColor(category) === color && <Check className="h-4 w-4 text-white" />}
                                  <span className="sr-only">{color}</span>
                                </Button>)}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 text-white hover:text-white hover:bg-white/20" onClick={() => handleRemoveIncomeCategory(category)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>;
};
export default CategoryManager;