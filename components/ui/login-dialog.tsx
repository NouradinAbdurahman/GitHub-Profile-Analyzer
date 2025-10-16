import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming Dialog components are here
import { Button } from "@/components/ui/button";
import { Github } from 'lucide-react'; // Import GitHub icon

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void; // Function to trigger GitHub login
}

export function LoginDialog({ isOpen, onClose, onLogin }: LoginDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">GitHub Login Required</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            You need to be logged in with GitHub to save analysis results.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-foreground/80">
          Logging in with GitHub allows you to save analysis results across devices and sessions.
        </div>
        <DialogFooter className="gap-2 sm:justify-end"> {/* Align buttons better */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
             type="button"
             onClick={() => {
               onLogin(); // Call the passed login function
               onClose(); // Close the dialog after initiating login
             }}
             variant="default" // Make login primary
          >
            <Github className="mr-2 h-4 w-4" /> Login with GitHub
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 