import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FAMILY_LABELS, type TestFamily } from "@/lib/sportTests";
import { Info } from "lucide-react";

interface TestInfo {
  name: string;
  family: string;
  unit: string;
  description?: string | null;
}

interface Props {
  test: TestInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-primary/60 transition-colors hover:bg-primary hover:text-primary-foreground"
      title="View test protocol"
    >
      <Info className="h-3 w-3" />
    </button>
  );
}

export default function TestInfoModal({ test, open, onOpenChange }: Props) {
  if (!test) return null;
  const familyLabel = FAMILY_LABELS[test.family as TestFamily] || test.family;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-background sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{test.name}</DialogTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">{familyLabel}</Badge>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Measured in: {test.unit}
            </Badge>
          </div>
        </DialogHeader>

        <div className="min-h-[60px]">
          {test.description ? (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Protocol</h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {test.description}
              </p>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No protocol description available for this test.</p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="gradient-orange text-primary-foreground">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
