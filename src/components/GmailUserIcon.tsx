
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestAuthorization, scanGmailForExpenses } from '@/lib/gmail-auth';

export function GmailUserIcon() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanRange, setScanRange] = useState<'week' | 'month' | 'all'>('month');
  
  // Check if user is logged in to Gmail
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Check if user is logged in by checking if we can get a token
        const token = window.gapi?.client?.getToken();
        if (token) {
          // If we have a token, try to get user profile from Gmail API
          if (window.gapi && window.gapi.client && window.gapi.client.gmail) {
            try {
              const response = await window.gapi.client.gmail.users.getProfile({
                userId: 'me'
              });
              setUserEmail(response.result.emailAddress);
              // Use a default profile picture as Gmail API doesn't provide one
              setProfilePicture(null);
              setIsLoggedIn(true);
            } catch (error) {
              console.error("Error getting Gmail profile:", error);
              setIsLoggedIn(false);
            }
          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
        setIsLoggedIn(false);
      }
    };
    
    checkLoginStatus();
  }, []);
  
  const handleLogin = () => {
    requestAuthorization(() => {
      // Callback after successful authorization
      setIsLoggedIn(true);
      toast({
        title: "Connected to Gmail",
        description: "Your account has been successfully connected.",
      });
      // After login, update user email
      if (window.gapi && window.gapi.client && window.gapi.client.gmail) {
        try {
          window.gapi.client.gmail.users.getProfile({
            userId: 'me'
          }).then(response => {
            setUserEmail(response.result.emailAddress);
          }).catch(error => {
            console.error("Error getting profile:", error);
          });
        } catch (error) {
          console.error("Error getting profile:", error);
        }
      }
    });
  };
  
  const handleLogout = () => {
    if (window.gapi && window.gapi.client) {
      // Just clear the token
      window.gapi.client.setToken(null);
      setIsLoggedIn(false);
      setUserEmail(null);
      setProfilePicture(null);
      toast({
        title: "Disconnected from Gmail",
        description: "Your Gmail account has been disconnected.",
      });
    }
  };
  
  const handleScanEmails = async () => {
    setIsScanning(true);
    try {
      // Define date range for scanning based on selected option
      let fromDate: number | undefined;
      let toDate: number | undefined;
      
      const now = new Date();
      
      if (scanRange === 'week') {
        // Set fromDate to 7 days ago
        fromDate = Math.floor(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime() / 1000);
      } else if (scanRange === 'month') {
        // Set fromDate to 30 days ago
        fromDate = Math.floor(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000);
      }
      
      // Set toDate to current time
      toDate = Math.floor(now.getTime() / 1000);
      
      // Convert fromDate and toDate to strings since the function expects strings
      const fromDateStr = fromDate?.toString();
      const toDateStr = toDate?.toString();
      
      const expenses = await scanGmailForExpenses(fromDateStr, toDateStr);
      
      if (expenses && expenses.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Found ${expenses.length} new expenses.`,
        });
      } else {
        toast({
          title: "Scan Complete",
          description: "No new expenses found in selected time range.",
        });
      }
      
      setIsScanDialogOpen(false);
    } catch (error) {
      console.error("Error scanning emails:", error);
      toast({
        title: "Error",
        description: "Failed to scan emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-9 w-9">
              {profilePicture ? (
                <AvatarImage src={profilePicture} alt={userEmail || "User"} />
              ) : (
                <AvatarFallback>
                  {isLoggedIn ? userEmail?.charAt(0).toUpperCase() || "U" : <User className="h-5 w-5" />}
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {isLoggedIn ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userEmail}</p>
                  <p className="text-xs leading-none text-muted-foreground">Connected to Gmail</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setIsScanDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Scan Gmail for Expenses</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <span>Disconnect Gmail</span>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleLogin}>
              <Mail className="mr-2 h-4 w-4" />
              <span>Connect to Gmail</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Scan Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Scan Gmail for Expenses</DialogTitle>
            <DialogDescription>
              Choose the time range for scanning your Gmail inbox for expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Button 
                variant={scanRange === 'week' ? 'default' : 'outline'} 
                onClick={() => setScanRange('week')}
                disabled={isScanning}
              >
                Last Week
              </Button>
              <Button 
                variant={scanRange === 'month' ? 'default' : 'outline'} 
                onClick={() => setScanRange('month')}
                disabled={isScanning}
              >
                Last Month
              </Button>
              <Button 
                variant={scanRange === 'all' ? 'default' : 'outline'} 
                onClick={() => setScanRange('all')}
                disabled={isScanning}
              >
                All Time
              </Button>
            </div>
            <Button onClick={handleScanEmails} disabled={isScanning}>
              {isScanning ? "Scanning..." : "Start Scan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
