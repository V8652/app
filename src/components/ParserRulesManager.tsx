
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2, Search, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SmsParserRule, SmsParserRuleFormData } from '@/types/sms-parser';
import { getSmsParserRules, addSmsParserRule, updateSmsParserRule, deleteSmsParserRule } from '@/lib/sms-parser-rules';
import { Dialog } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SmsParserRuleForm from '@/components/parser/SmsParserRuleForm';
import { dbEvents, DatabaseEvent } from '@/lib/db-event';

const ParserRulesManager = () => {
  const [rules, setRules] = useState<SmsParserRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SmsParserRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadRules = async () => {
    try {
      const loadedRules = await getSmsParserRules();
      setRules(loadedRules);
      setLoading(false);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error loading SMS parser rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SMS parser rules',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();

    const handleRuleChanged = () => {
      loadRules();
    };

    const unsubscribe = dbEvents.subscribe(DatabaseEvent.SMS_RULES_REFRESH, handleRuleChanged);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleAddRule = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: SmsParserRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    setDeleteRuleId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteRuleId) {
      try {
        await deleteSmsParserRule(deleteRuleId);
        setRules(prevRules => prevRules.filter(rule => rule.id !== deleteRuleId));
        toast({
          title: 'Rule Deleted',
          description: 'The SMS parser rule has been deleted successfully.'
        });
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete the rule.',
          variant: 'destructive',
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setDeleteRuleId(null);
      }
    }
  };

  const handleRuleSaved = async (rule: SmsParserRuleFormData) => {
    try {
      let savedRule: SmsParserRule;
      
      if (editingRule) {
        savedRule = await updateSmsParserRule({
          ...editingRule,
          ...rule
        });
        
        setRules(prevRules => 
          prevRules.map(r => r.id === savedRule.id ? savedRule : r)
        );
        
        toast({
          title: 'Rule Updated',
          description: 'SMS parser rule updated successfully'
        });
      } else {
        savedRule = await addSmsParserRule(rule);
        setRules(prevRules => [...prevRules, savedRule]);
        
        toast({
          title: 'Rule Created',
          description: 'New SMS parser rule created successfully'
        });
      }
      
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SMS parser rule',
        variant: 'destructive'
      });
    }
  };

  const handleToggleRuleEnabled = async (rule: SmsParserRule, enabled: boolean) => {
    try {
      const updatedRule = await updateSmsParserRule({
        ...rule,
        enabled
      });
      
      setRules(prevRules => 
        prevRules.map(r => r.id === updatedRule.id ? updatedRule : r)
      );
      
      toast({
        title: enabled ? 'Rule Enabled' : 'Rule Disabled',
        description: `SMS parser rule "${rule.name}" has been ${enabled ? 'enabled' : 'disabled'}.`
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive'
      });
    }
  };

  const handleInlinePriorityChange = async (rule: SmsParserRule, priority: number) => {
    try {
      const updatedRule = await updateSmsParserRule({
        ...rule,
        priority
      });
      
      setRules(prevRules => 
        prevRules.map(r => r.id === updatedRule.id ? updatedRule : r)
      );
      
      toast({
        title: 'Priority Updated',
        description: `Priority for "${rule.name}" has been set to ${priority}.`
      });
    } catch (error) {
      console.error('Error updating rule priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule priority',
        variant: 'destructive'
      });
    }
  };

  // Safely convert different types to string for searching
  const safeString = (value: string | string[] | undefined): string => {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.join(' ');
    return value;
  };

  const filteredRules = rules.filter(rule => {
    const search = searchTerm.toLowerCase();
    return (
      safeString(rule.name).toLowerCase().includes(search) ||
      safeString(rule.paymentBank).toLowerCase().includes(search) ||
      safeString(rule.senderMatch).toLowerCase().includes(search)
    );
  });

  // Sort rules by enabled status and name
  const sortedRules = [...filteredRules].sort((a, b) => {
    // First sort by enabled status
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1;
    }

    // Then sort by priority
    if ((a.priority || 0) !== (b.priority || 0)) {
      return (b.priority || 0) - (a.priority || 0);
    }

    // Then sort by name (with null checks)
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight">SMS Parser Rules</h2>
          <Button onClick={handleAddRule} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
        <p className="text-muted-foreground">
          Configure rules to extract expenses from SMS messages
        </p>
      </div>

      {rules.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center mb-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground ml-auto mr-4">
            Rules are processed in order of priority (higher numbers first).
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-muted/30 rounded-lg h-20 animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No SMS Parser Rules Yet</h3>
            <p className="text-sm text-muted-foreground">
              SMS Parser rules help identify expenses in your SMS messages. Create your first rule to start scanning messages for
              expenses.
            </p>
            <Button onClick={handleAddRule}>Create Your First Rule</Button>
          </CardContent>
        </Card>
      ) : filteredRules.length === 0 ? (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No rules match your search term "{searchTerm}"
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Payment Bank</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Badge 
                      variant={rule.enabled ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleRuleEnabled(rule, !rule.enabled)}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{rule.paymentBank}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      className="w-16 h-8 text-center"
                      value={rule.priority}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value > 0 && value <= 100) {
                          handleInlinePriorityChange(rule, value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SmsParserRuleForm 
          isOpen={true}
          initialRule={editingRule || undefined}
          onClose={() => setIsFormOpen(false)}
          onSave={handleRuleSaved}
        />
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this parser rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ParserRulesManager;
