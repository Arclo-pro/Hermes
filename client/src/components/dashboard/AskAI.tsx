import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface AskAIProps {
  mode?: "diagnostic" | "operational";
  siteId?: string;
}

export function AskAI({ mode = "diagnostic", siteId }: AskAIProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [context, setContext] = useState<{ rollups?: any } | null>(null);

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const endpoint = mode === "operational" ? "/api/hermes/ask" : "/api/ai/ask";
      const body = mode === "operational" 
        ? { question: q, siteId } 
        : { question: q };
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }
      
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setResponse(data.response);
      setContext(data.context || null);
    },
    onError: (error: Error) => {
      setResponse(error.message || "Sorry, I couldn't process your question. Please try again.");
      setContext(null);
    },
  });

  const handleSubmit = () => {
    if (!question.trim() || askMutation.isPending) return;
    askMutation.mutate(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isHermes = mode === "operational";
  const title = isHermes ? "Ask Hermes" : "Ask Traffic Doctor AI";
  const placeholder = isHermes
    ? "Ask about service status, what's running, what's blocked... (e.g., 'What is the current operational state?' or 'Which services need attention?')"
    : "Ask about your traffic, ads, or tickets... (e.g., 'Why did my search clicks drop?' or 'What should I prioritize first?')";

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isHermes ? (
            <Bot className="w-5 h-5 text-primary" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder={placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[80px] resize-none bg-background"
            data-testid="input-ai-question"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || askMutation.isPending}
              size="sm"
              variant="secondary"
              className="gap-2"
              data-testid="button-ask-ai"
            >
              {askMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {response && (
          <div className="bg-background border rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" data-testid="text-ai-response">
              {response}
            </div>
            {context?.rollups && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Context: {context.rollups.totalServices} services, {context.rollups.built} built, {context.rollups.neverRan} never ran
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
