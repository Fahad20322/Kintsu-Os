"use client";

import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { askAssistant } from "@/actions/assistant";

type QaPair = {
  question: string;
  answer: string;
  data?: Record<string, unknown>[];
};

const EXAMPLE_QUERIES = [
  "What were today's sales?",
  "What needs restocking?",
  "Do we have Rani Pink Lehenga in stock?",
];

export function AssistantChat() {
  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<QaPair[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  async function handleAsk(question: string) {
    if (!question.trim() || isLoading) return;
    setIsLoading(true);
    setInput("");
    try {
      const result = await askAssistant(question);
      setHistory((prev) => [...prev, { question, answer: result.answer, data: result.data }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { question, answer: "Something went wrong answering that. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q) => (
          <Badge
            key={q}
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleAsk(q)}
          >
            {q}
          </Badge>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="max-h-[28rem] space-y-4 overflow-y-auto">
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <Sparkles className="size-6" />
                <p>Ask me about stock, sales, customers, or restocking.</p>
              </div>
            )}
            {history.map((qa, i) => (
              <div key={i} className="space-y-2">
                <div className="ml-auto w-fit max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                  {qa.question}
                </div>
                <div className="w-fit max-w-[90%] rounded-lg bg-muted px-3 py-2 text-sm">
                  {qa.answer}
                  {qa.data && qa.data.length > 0 && (
                    <div className="mt-2 overflow-x-auto rounded-md border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(qa.data[0]).map((key) => (
                              <TableHead key={key} className="text-xs">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {qa.data.map((row, ri) => (
                            <TableRow key={ri}>
                              {Object.values(row).map((val, vi) => (
                                <TableCell key={vi} className="text-xs">
                                  {String(val)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about stock, sales, customers..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              <Send />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Structured search over your store data — not a general AI chat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
