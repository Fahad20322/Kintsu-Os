import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Natural-language search across your products, inventory, sales, and customers.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
