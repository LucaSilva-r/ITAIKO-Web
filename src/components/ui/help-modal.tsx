import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

export interface HelpContent {
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface HelpButtonProps {
  helpKey: string;
  className?: string;
}

// Central registry for help content
const helpRegistry: Record<string, HelpContent> = {};

export function registerHelp(key: string, content: HelpContent) {
  helpRegistry[key] = content;
}

export function getHelp(key: string): HelpContent | undefined {
  return helpRegistry[key];
}

export function HelpButton({ helpKey, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const help = getHelp(helpKey);

  if (!help) {
    console.warn(`No help content registered for key: ${helpKey}`);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 rounded-full text-muted-foreground hover:text-foreground ${className}`}
          title={`Help: ${help.title}`}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{help.title}</DialogTitle>
          {help.description && (
            <DialogDescription>{help.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4 prose prose-sm dark:prose-invert max-w-none">
          {help.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for inline help that can be used in card headers
interface CardTitleWithHelpProps {
  children: React.ReactNode;
  helpKey: string;
  className?: string;
}

export function CardTitleWithHelp({ children, helpKey, className }: CardTitleWithHelpProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{children}</span>
      <HelpButton helpKey={helpKey} />
    </div>
  );
}
