import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import type { Citation, Conversation, Message, ToolCall } from "@/types";

export default function Assistant() {
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("q") ?? "";

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState(initialPrompt);
  const [sending, setSending] = React.useState(false);
  const [agentRunning, setAgentRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sources, setSources] = React.useState<Citation[]>([]);
  const [toolCalls, setToolCalls] = React.useState<ToolCall[]>([]);
  const [evidenceFound, setEvidenceFound] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getConversations();
        if (cancelled) return;

        const loadedConversations = response.conversations ?? [];
        setConversations(loadedConversations);

        if (loadedConversations.length > 0 && !activeConvId) {
          setActiveConvId(loadedConversations[0].id);
        }
      } catch {
        setError("The AI assistant is in demo mode. Connect a backend to enable live responses.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  React.useEffect(() => {
    if (!initialPrompt || !activeConvId) return;
    void handleSend(initialPrompt);
  }, [initialPrompt, activeConvId]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!activeConvId) {
      setError("Select or create a conversation before asking a question.");
      return;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInputValue("");
    setSending(true);
    setError(null);
    setSources([]);
    setToolCalls([]);

    try {
      const response = await api.ragChat(trimmed);
      const assistantMessage = response.message;
      setMessages((previous) => [...previous, assistantMessage]);
      setSources(assistantMessage.sources ?? []);
      setEvidenceFound(response.evidenceFound ?? false);
      if (response.citations) {
        setSources(response.citations.map((c: any) => ({
          documentId: c.documentId,
          documentName: c.documentName,
          page: c.page,
          chunkIndex: c.chunkIndex,
          snippet: c.snippet,
        })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send your message right now.");
    } finally {
      setSending(false);
    }
  };

  const handleRunAgent = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!activeConvId) {
      setError("Select or create a conversation before running the agent.");
      return;
    }

    setAgentRunning(true);
    setError(null);

    try {
      const response = await api.runAgent(activeConvId, trimmed);
      if (response.finalAnswer) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: response.finalAnswer,
          createdAt: new Date().toISOString(),
          toolCalls: response.steps.map((s: any) => ({
            id: `step_${s.step}`,
            name: s.tool,
            status: s.status,
            input: s.input,
            output: s.output,
            error: s.error,
          })),
        };
        setMessages((previous) => [...previous, assistantMessage]);
        setToolCalls(
          response.steps.map((s: any) => ({
            id: `step_${s.step}`,
            name: s.tool,
            status: s.status,
            input: s.input,
            output: s.output,
            error: s.error,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setAgentRunning(false);
    }
  };

  const activeConversation = conversations.find((item) => item.id === activeConvId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">AI assistant</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Ask for business answers</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMessages([])}>
          New chat
        </Button>
      </div>

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-base text-[#172033]">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 rounded-xl"
              onClick={() => {
                setActiveConvId(null);
                setMessages([]);
              }}
            >
              <Bot className="h-4 w-4" />
              Start fresh
            </Button>

            <div className="space-y-2">
              {conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveConvId(conversation.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      activeConvId === conversation.id
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className="mt-0.5 rounded-lg bg-white p-1.5 text-[#6D5EF7] shadow-sm">
                      <MessageSquareText className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#172033]">{conversation.title}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage ?? "No messages yet"}</div>
                    </div>
                    <Badge variant="secondary" className="ml-auto bg-white text-slate-600">
                      {conversation.messageCount}
                    </Badge>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No conversations yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#172033]">
                <Sparkles className="h-4 w-4 text-[#14B8A6]" />
                Saved workflows
              </div>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">Monthly expense review</div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">Customer follow-up generation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[680px] flex-col border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-slate-500">Active chat</div>
              <div className="font-medium text-[#172033]">{activeConversation?.title ?? "New conversation"}</div>
            </div>
            <Badge variant="success">Live</Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-slate-500">
                <div>
                  <Bot className="mx-auto mb-3 h-10 w-10 text-[#6D5EF7]" />
                  <p className="text-sm">Ask a grounded business question to get started.</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role !== "user" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6D5EF7] text-xs font-bold text-white">
                      K
                    </div>
                  ) : (
                    <Avatar fallback="JD" className="h-8 w-8" />
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                      message.role === "user"
                        ? "bg-[#6D5EF7] text-white"
                        : "border border-slate-200 bg-slate-50 text-[#172033]"
                    )}
                  >
                    <div className="whitespace-pre-wrap leading-6">{message.content}</div>
                    {message.sources && message.sources.length > 0 ? (
                      <div className="mt-3 border-t border-slate-200 pt-3 text-xs">
                        <div className="mb-1 font-medium text-slate-500">Sources</div>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <div key={`${source.documentId}-${index}`} className="rounded-lg bg-white/70 px-2 py-1 text-slate-600">
                              {source.documentName}
                              {source.page ? ` • Page ${source.page}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 p-4">
            {error ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            {evidenceFound === false && !sending && messages.length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No relevant information was found in your uploaded documents for this question. Try uploading related documents or rephrasing your question.
              </div>
            )}

            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend(inputValue);
                  }
                }}
                placeholder="Ask KaamAI a question…"
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
              <Button
                type="button"
                onClick={() => void handleSend(inputValue)}
                disabled={sending || !inputValue.trim()}
                className="h-12 rounded-xl px-4"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                onClick={() => void handleRunAgent()}
                disabled={agentRunning || !inputValue.trim()}
                className="h-12 rounded-xl px-4 bg-[#6D5EF7] text-white hover:bg-violet-600"
              >
                {agentRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-base text-[#172033]">Sources & tool activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-[#172033]">Retrieved sources</div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {sources.length}
                </Badge>
              </div>
              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source, index) => (
                    <div key={`${source.documentId}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-medium text-[#172033]">{source.documentName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {source.page ? `Page ${source.page}` : "Document preview"}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  Ask a question to retrieve sources.
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-[#172033]">Agent activity</div>
              {toolCalls.length > 0 ? (
                <div className="space-y-2">
                  {toolCalls.map((tool) => (
                    <div key={tool.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[#172033]">{tool.name}</span>
                        <Badge
                          variant={tool.status === "completed" ? "success" : tool.status === "error" ? "destructive" : "secondary"}
                        >
                          {tool.status}
                        </Badge>
                      </div>
                      {tool.output ? (
                        <div className="mt-2 text-xs text-slate-600">
                          {JSON.stringify(tool.output).slice(0, 120)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No tool execution has started yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}