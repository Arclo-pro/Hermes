import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RecommendationFeedbackProps {
  recommendationId: string;
  onFeedback: (helpful: boolean, reason?: string) => void;
}

export function RecommendationFeedback({ recommendationId, onFeedback }: RecommendationFeedbackProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleThumbsUp = () => {
    if (feedbackGiven) return;
    setFeedbackGiven("up");
    onFeedback(true);
  };

  const handleThumbsDownClick = () => {
    if (feedbackGiven) return;
    setIsPopoverOpen(true);
  };

  const handleSubmitNegativeFeedback = async () => {
    if (feedbackGiven) return;
    setIsSubmitting(true);
    try {
      await onFeedback(false, reason.trim() || undefined);
      setFeedbackGiven("down");
      setIsPopoverOpen(false);
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipReason = () => {
    if (feedbackGiven) return;
    onFeedback(false);
    setFeedbackGiven("down");
    setIsPopoverOpen(false);
  };

  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-1">
        {feedbackGiven === "up" ? (
          <ThumbsUp className="w-4 h-4 text-semantic-success" data-testid={`feedback-confirmed-up-${recommendationId}`} />
        ) : (
          <ThumbsDown className="w-4 h-4 text-semantic-danger" data-testid={`feedback-confirmed-down-${recommendationId}`} />
        )}
        <span className="text-xs text-muted-foreground">
          {feedbackGiven === "up" ? "Thanks!" : "Noted"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 text-muted-foreground hover:text-semantic-success hover:bg-semantic-success-soft transition-colors"
        )}
        onClick={handleThumbsUp}
        data-testid={`feedback-up-${recommendationId}`}
        title="Helpful recommendation"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </Button>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 text-muted-foreground hover:text-semantic-danger hover:bg-semantic-danger-soft transition-colors"
            )}
            onClick={handleThumbsDownClick}
            data-testid={`feedback-down-${recommendationId}`}
            title="Mark as incorrect"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">Why is this unhelpful?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Your feedback helps improve recommendations
              </p>
            </div>
            <Textarea
              placeholder="Optional: Tell us what's wrong..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[60px] text-sm"
              data-testid={`feedback-reason-${recommendationId}`}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipReason}
                disabled={isSubmitting}
                data-testid={`feedback-skip-${recommendationId}`}
              >
                Skip
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitNegativeFeedback}
                disabled={isSubmitting}
                data-testid={`feedback-submit-${recommendationId}`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
