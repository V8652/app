import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { requestExportDirectory, isAndroidDevice } from '@/lib/export-path';
import { toast } from '@/hooks/use-toast';

const MasterExportPathSelector = () => {
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [exportPath, setExportPath] = React.useState<string>("");
  const isAndroid = isAndroidDevice();

  React.useEffect(() => {
    // On component mount, check if we're on Android and set the default path
    const checkAndroidPath = async () => {
      if (isAndroid) {
        try {
          // Set a default path for Android devices
          setExportPath("/storage/emulated/0/Download");
        } catch (error) {
          console.error("Error setting Android directory:", error);
          setExportPath("/storage/emulated/0/Download");
        }
      }
    };
    
    checkAndroidPath();
  }, [isAndroid]);

  const handleSelectExportPath = async () => {
    try {
      setIsSelecting(true);
      console.log('Starting export directory selection process...');
      
      const dirHandle = await requestExportDirectory();
      
      if (dirHandle) {
        console.log('Directory selected:', dirHandle);
        toast({
          title: "Export Path Set",
          description: "Your export path has been set successfully.",
        });
      } else {
        console.log('No directory selected or operation cancelled');
      }
    } catch (error) {
      console.error('Error selecting export directory:', error);
      toast({
        title: "Error",
        description: `Failed to set export path: ${(error as Error).message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Settings</CardTitle>
        <CardDescription>
          Manage your application storage preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAndroid ? (
          <div className="space-y-4">
            <p className="text-sm">
              On Android devices, files will be exported to your Download folder.
              Files can be found in your Downloads directory or your file manager app.
            </p>
            <p className="text-sm font-medium text-green-500">
              ✓ Export path is set to your Download folder
            </p>
            {exportPath && (
              <p className="text-xs text-muted-foreground">
                Path: {exportPath}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm">
              You can choose where to export your files. Click the button below to select a folder.
              When importing, you'll be able to select files from your device storage.
            </p>
            
            <Button 
              onClick={handleSelectExportPath} 
              disabled={isSelecting}
              className="w-full"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {isSelecting ? "Selecting..." : "Select Export Folder"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MasterExportPathSelector;
