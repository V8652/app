
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Save, RefreshCw, Check } from 'lucide-react';
import { ExpenseCategory } from '@/types';
import { toast } from '@/hooks/use-toast';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getUniqueMerchants, applyMerchantNotesToTransactions } from '@/lib/db';
import { MerchantNote, getMerchantNotes, saveMerchantNote, deleteMerchantNote } from '@/lib/merchant-notes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MerchantNotesImportExport from './MerchantNotesImportExport';

// Form schema for merchant notes
const formSchema = z.object({
  merchantName: z.string().min(1, 'Merchant name is required'),
  category: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const MerchantNotesManager = () => {
  const [notes, setNotes] = useState<MerchantNote[]>([]);
  const [merchants, setMerchants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<MerchantNote | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<MerchantNote | null>(null);
  const [applyToTransactions, setApplyToTransactions] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("manage");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchantName: '',
      category: 'none',
      note: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentNote) {
      form.reset({
        merchantName: currentNote.merchantName,
        category: currentNote.category || 'none',
        note: currentNote.note || '',
      });
    }
  }, [currentNote, form]);

  useEffect(() => {
    if (selectedMerchant) {
      form.setValue('merchantName', selectedMerchant);
    }
  }, [selectedMerchant, form]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedNotes, loadedMerchants] = await Promise.all([
        getMerchantNotes(),
        getUniqueMerchants(),
      ]);
      
      setNotes(loadedNotes.sort((a, b) => a.merchantName.localeCompare(b.merchantName)));
      setMerchants(loadedMerchants);
    } catch (error) {
      console.error('Failed to load merchant notes data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load merchant data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMerchants = async () => {
    setIsRefreshing(true);
    try {
      const merchants = await getUniqueMerchants();
      setMerchants(merchants);
      toast({
        title: 'Success',
        description: `Found ${merchants.length} unique merchants`,
      });
    } catch (error) {
      console.error('Failed to refresh merchants:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh merchants',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddNote = () => {
    setCurrentNote(null);
    form.reset({
      merchantName: selectedMerchant || '',
      category: 'none',
      note: '',
    });
    setApplyToTransactions(true);
    setIsDialogOpen(true);
  };

  const handleEditNote = (note: MerchantNote) => {
    setCurrentNote(note);
    setApplyToTransactions(false);
    setIsDialogOpen(true);
  };

  const handleDeleteNote = (note: MerchantNote) => {
    setNoteToDelete(note);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteMerchantNote(noteToDelete.id);
      setNotes(notes.filter(n => n.id !== noteToDelete.id));
      toast({
        title: 'Success',
        description: 'Merchant note deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete merchant note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete merchant note',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const category = values.category === 'none' ? undefined : values.category as ExpenseCategory;
      
      const noteData = {
        merchantName: values.merchantName,
        category: category,
        note: values.note && values.note.trim() !== '' ? values.note : undefined,
      };
      
      const savedNote = await saveMerchantNote(noteData);
      
      if (applyToTransactions && (noteData.category || noteData.note)) {
        const updatedCount = await applyMerchantNotesToTransactions(
          noteData.merchantName,
          noteData.category || "",
          noteData.note || ""
        );
        
        if (updatedCount > 0) {
          toast({
            title: 'Success',
            description: `Updated ${updatedCount} transactions with this merchant`,
          });
        }
      }
      
      if (currentNote) {
        setNotes(
          notes.map(n => n.id === savedNote.id ? savedNote : n)
            .sort((a, b) => a.merchantName.localeCompare(b.merchantName))
        );
      } else {
        setNotes(
          [...notes, savedNote]
            .sort((a, b) => a.merchantName.localeCompare(b.merchantName))
        );
      }
      
      toast({
        title: 'Success',
        description: 'Merchant note saved successfully',
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save merchant note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save merchant note',
        variant: 'destructive',
      });
    }
  };

  const handleSelectMerchant = (merchant: string) => {
    setSelectedMerchant(merchant);
    const existingNote = notes.find(n => n.merchantName === merchant);
    if (existingNote) {
      handleEditNote(existingNote);
    } else {
      handleAddNote();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merchant Notes</CardTitle>
        <CardDescription>
          Associate notes and categories with merchants for automatic categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manage">Manage Notes</TabsTrigger>
            <TabsTrigger value="import-export">Import & Export</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manage" className="space-y-6">
            <div className="mb-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Configure Merchants</h3>
                  <p className="text-sm text-muted-foreground">
                    Create notes and default categories for your frequent merchants
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshMerchants}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh Merchants
                  </Button>
                  <Button size="sm" onClick={handleAddNote}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Note
                  </Button>
                </div>
              </div>
              
              {merchants.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="mb-2 text-sm font-medium">Select a merchant to configure:</div>
                  <ScrollArea className="h-[150px] rounded-md border">
                    <div className="p-2 flex flex-wrap gap-2">
                      {merchants.map(merchant => {
                        const hasNote = notes.some(n => n.merchantName === merchant);
                        return (
                          <Badge
                            key={merchant}
                            variant={hasNote ? "default" : "outline"}
                            className="cursor-pointer hover:bg-primary/20"
                            onClick={() => handleSelectMerchant(merchant)}
                          >
                            {merchant}
                            {hasNote && <Check className="ml-1 h-3 w-3" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <p className="text-muted-foreground">No merchant notes found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create notes to automatically categorize transactions by merchant
                </p>
                <Button variant="outline" onClick={handleAddNote} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create First Note
                </Button>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="font-medium">{note.merchantName}</TableCell>
                        <TableCell>
                          {note.category ? (
                            <Badge variant="secondary">
                              {note.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {note.note ? (
                            <span className="text-sm">{note.note.length > 30 ? note.note.substring(0, 30) + '...' : note.note}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditNote(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteNote(note)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="import-export">
            <MerchantNotesImportExport onDataChanged={loadData} />
          </TabsContent>
        </Tabs>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {currentNote ? `Edit note for ${currentNote.merchantName}` : 'Create Merchant Note'}
              </DialogTitle>
              <DialogDescription>
                Set a default category and note for this merchant
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="merchantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Name</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!!currentNote} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          <SelectItem value="groceries">Groceries</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="transportation">Transportation</SelectItem>
                          <SelectItem value="dining">Dining</SelectItem>
                          <SelectItem value="shopping">Shopping</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="housing">Housing</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="subscriptions">Subscriptions</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add details about this merchant" 
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional note to include with transactions from this merchant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!currentNote && (
                  <div className="flex items-center space-x-2 rounded-md border p-4">
                    <input
                      type="checkbox"
                      id="apply-to-transactions"
                      checked={applyToTransactions}
                      onChange={(e) => setApplyToTransactions(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="leading-none">
                      <label
                        htmlFor="apply-to-transactions"
                        className="text-sm font-medium"
                      >
                        Apply to existing transactions
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Update existing transactions with this merchant (only if they have no category or notes)
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </Form>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Merchant Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the note for "{noteToDelete?.merchantName}"? This will not affect existing transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteNote} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default MerchantNotesManager;
