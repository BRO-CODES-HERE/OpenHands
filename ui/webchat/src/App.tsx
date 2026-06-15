import React, { useState, useEffect, useRef } from "react";
import { GatewayClientBrowser } from "./gateway-client-browser";
import "./App.css";

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}


interface ChatInputProps {
  connected: boolean;
  activeSessionId: string | null;
  isSending: boolean;
  onSendMessage: (text: string) => void;
}

// ⚡ Bolt: Isolate volatile input state into a memoized component
// This prevents expensive O(N) global re-renders of the entire App (including the large messages list)
// on every single keystroke.
const ChatInput = React.memo(({ connected, activeSessionId, isSending, onSendMessage }: ChatInputProps) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !inputText.trim() || !activeSessionId || isSending) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <footer className="chat-footer">
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder={!connected ? "Disconnected" : !activeSessionId ? "Select a chat session..." : isSending ? "Waiting for agent..." : "Ask anything, e.g. Calculate 2 + 2 * (10 / 5) or read a file..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!connected || !activeSessionId || isSending}
          aria-label="Message"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!connected || !activeSessionId || !inputText.trim() || isSending}
          title={!connected ? "Connect to Gateway to send messages" : !activeSessionId ? "Select a session to send messages" : ""}
        >
          Send
        </button>
      </form>
    </footer>
  );
});


interface ChatInputProps {
  connected: boolean;
  activeSessionId: string | null;
  isSending: boolean;
  onSendMessage: (text: string) => void;
}

// ⚡ Bolt: Isolate volatile input state into a memoized component
// This prevents expensive O(N) global re-renders of the entire App (including the large messages list)
// on every single keystroke.
const ChatInput = React.memo(({ connected, activeSessionId, isSending, onSendMessage }: ChatInputProps) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !inputText.trim() || !activeSessionId || isSending) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <footer className="chat-footer">
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder={!connected ? "Disconnected" : !activeSessionId ? "Select a chat session..." : isSending ? "Waiting for agent..." : "Ask anything, e.g. Calculate 2 + 2 * (10 / 5) or read a file..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!connected || !activeSessionId || isSending}
          aria-label="Message"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!connected || !activeSessionId || !inputText.trim() || isSending}
          title={!connected ? "Connect to Gateway to send messages" : !activeSessionId ? "Select a session to send messages" : ""}
        >
          Send
        </button>
      </form>
    </footer>
  );
});

const client = new GatewayClientBrowser();

export default function App() {
  const [gatewayUrl, setGatewayUrl] = useState("ws://127.0.0.1:18999");
  const [connected, setConnected] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Configuration States
  const [provider, setProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");
  
  // Cache inputs locally to avoid loss during dropdown switches
  const [cachedConfigs, setCachedConfigs] = useState<Record<string, { apiKey: string; model: string; baseUrl: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect helper
  const handleConnect = async () => {
    try {
      const payload = await client.connect(gatewayUrl);
      setConnected(true);
      setConnectionId(payload.connectionId);
      
      // Load sessions and configuration after successful connection
      await loadSessions();
      await loadConfigData();
    } catch (err: unknown) {
      alert(`Connection failed: ${(err as Error).message}`);
    }
  };

  const handleDisconnect = () => {
    client.close();
    setConnected(false);
    setConnectionId(null);
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
  };

  // Load list of sessions from gateway
  const loadSessions = async () => {
    try {
      const list = (await client.request("session.list")) as Session[];
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        selectSession(list[0].id);
      }
    } catch (err: unknown) {
      console.error("Failed to load sessions:", err);
    }
  };

  // Select active session
  const selectSession = async (id: string) => {
    setActiveSessionId(id);
    try {
      const session = (await client.request("session.get", { sessionId: id })) as Session;
      setMessages(session.messages || []);
    } catch (err: unknown) {
      console.error("Failed to load session details:", err);
    }
  };

  // Load config data
  const loadConfigData = async () => {
    try {
      const config = (await client.request("config.get")) as Record<string, unknown>;
      if (config && config.llm) {
        const prov = config.llm.provider || "openai";
        setProvider(prov);
        
        // Cache loaded config items
        const cache: Record<string, { apiKey: string; model: string; baseUrl: string }> = {};
        const providersList = ["openai", "gemini", "anthropic", "deepseek", "qwen", "meta"];
        for (const p of providersList) {
          if (config.llm[p]) {
            cache[p] = {
              apiKey: config.llm[p].apiKey || "",
              model: config.llm[p].model || "",
              baseUrl: config.llm[p].baseUrl || ""
            };
          }
        }
        setCachedConfigs(cache);

        const current = cache[prov] || { apiKey: "", model: "", baseUrl: "" };
        setApiKey(current.apiKey);
        setModel(current.model);
        setBaseUrl(current.baseUrl);
      }
    } catch (err: unknown) {
      console.error("Failed to load configuration details:", err);
    }
  };

  // Switch config display when provider changes
  const handleProviderChange = (newProv: string) => {
    // Save current fields to cache first
    setCachedConfigs(prev => ({
      ...prev,
      [provider]: { apiKey, model, baseUrl }
    }));

    setProvider(newProv);
    const cached = cachedConfigs[newProv] || { apiKey: "", model: "", baseUrl: "" };
    setApiKey(cached.apiKey);
    setModel(cached.model);
    setBaseUrl(cached.baseUrl);
  };

  // Save Config
  const handleSaveConfig = async () => {
    try {
      const updatedCache = {
        ...cachedConfigs,
        [provider]: { apiKey, model, baseUrl }
      };
      setCachedConfigs(updatedCache);

      const llmSection: Record<string, unknown> = { provider };
      for (const [p, details] of Object.entries(updatedCache)) {
        if (details.apiKey || details.model || details.baseUrl) {
          llmSection[p] = {
            apiKey: details.apiKey,
            model: details.model || undefined,
            baseUrl: details.baseUrl || undefined
          };
        }
      }

      const fullConfig = {
        gateway: { host: "127.0.0.1", port: 18999 },
        llm: llmSection
      };

      await client.request("config.set", { config: fullConfig });
      alert("Configuration saved successfully!");
    } catch (err: unknown) {
      alert(`Failed to save configuration: ${(err as Error).message}`);
    }
  };

  // Create new session
  const handleCreateSession = async () => {
    if (!connected) return;
    try {
      const title = prompt("Enter conversation title:", `Chat ${sessions.length + 1}`) || "New Chat";
      const session = (await client.request("session.create", { title })) as Session;
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch (err: unknown) {
      alert(`Failed to create session: ${(err as Error).message}`);
    }
  };

  // Delete session
  const handleDeleteSession = async (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await client.request("session.delete", { sessionId: id });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (err: unknown) {
      alert(`Failed to delete session: ${(err as Error).message}`);
    }
  };

  // Listen for agent incoming replies
  useEffect(() => {
    const unsubscribe = client.onEvent((event) => {
      if (event === "agent.message.reply") {
        setIsSending(false);
        // Refresh active session messages from gateway
        if (activeSessionId) {
          if (activeSessionId) selectSession(activeSessionId);
        }
      }
    });
    return () => unsubscribe();
  }, [activeSessionId]);

  // Send message
  const handleSendMessageWithText = async (userMsg: string) => {
    setIsSending(true);

    // Optimistically update message history on UI
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      await client.request("channel.message.send", {
        channelId: "webchat-chan",
        userId: "webchat-user",
        messageId: `msg-${Date.now()}`,
        content: userMsg,
        sessionId: activeSessionId
      });
    } catch (err: unknown) {
      alert(`Failed to send message: ${(err as Error).message}`);
      setIsSending(false);
      // Reload session to sync correct state
      if (activeSessionId) selectSession(activeSessionId);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>OpenHands</h2>
          <button 
            className="btn btn-primary" 
            onClick={handleCreateSession}
            disabled={!connected}
            title={!connected ? "Connect to Gateway to create a new chat" : ""}
          >
            + New Chat
          </button>
        </div>
        <nav className="sessions-list">
          {sessions.map((sess) => (
            <div 
              key={sess.id} 
              className={`session-item ${sess.id === activeSessionId ? "active" : ""}`}
              onClick={() => selectSession(sess.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectSession(sess.id);
                }
              }}
            >
              <span className="session-title">{sess.title}</span>
              <button 
                className="delete-btn" 
                onClick={(e) => handleDeleteSession(sess.id, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                  }
                }}
                aria-label="Delete session"
                title="Delete session"
              >
                ✕
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="empty-state">
              {connected ? "No chats yet. Create one!" : "Connect to Gateway first."}
            </div>
          )}
        </nav>

        {/* Configuration settings panel */}
        <div className="sidebar-config">
          <h3>LLM Settings</h3>
          <div className="config-group">
            <label htmlFor="config-provider">Provider</label>
            <select 
              id="config-provider"
              value={provider} 
              onChange={(e) => handleProviderChange(e.target.value)} 
              disabled={!connected}
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="anthropic">Anthropic</option>
              <option value="deepseek">DeepSeek</option>
              <option value="qwen">Qwen</option>
              <option value="meta">Llama (Meta)</option>
            </select>
          </div>
          <div className="config-group">
            <label htmlFor="config-apikey">API Key</label>
            <input
              id="config-apikey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!connected}
            />
          </div>
          <div className="config-group">
            <label htmlFor="config-model">Model</label>
            <input
              id="config-model"
              type="text"
              placeholder="e.g. gpt-4o / deepseek-chat"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!connected}
            />
          </div>
          <div className="config-group">
            <label htmlFor="config-baseurl">Base URL (Optional)</label>
            <input
              id="config-baseurl"
              type="text"
              placeholder="e.g. https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={!connected}
            />
          </div>
          <button 
            className="btn btn-primary save-config-btn" 
            onClick={handleSaveConfig} 
            disabled={!connected}
            title={!connected ? "Connect to Gateway to save configuration" : ""}
          >
            Save Configuration
          </button>
        </div>
      </aside>

      {/* Main chat layout */}
      <main className="main-content">
        <header className="gateway-header">
          <div className="connection-info">
            <span className={`status-dot ${connected ? "connected" : "disconnected"}`} />
            <span>
              {connected ? `Connected [ID: ${connectionId}]` : "Disconnected"}
            </span>
          </div>
          <div className="connection-form">
            <input 
              type="text" 
              value={gatewayUrl} 
              onChange={(e) => setGatewayUrl(e.target.value)} 
              disabled={connected}
              aria-label="Gateway URL"
            />
            {connected ? (
              <button className="btn btn-danger" onClick={handleDisconnect}>
                Disconnect
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleConnect}>
                Connect
              </button>
            )}
          </div>
        </header>

        {/* Messages list */}
        <div className="messages-container" role="log" aria-live="polite" aria-atomic="false">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-bubble ${msg.role}`}>
              <div className="message-header">
                <strong>{msg.role === "user" ? "You" : msg.role === "tool" ? `Tool (${msg.name})` : "Agent"}</strong>
              </div>
              <div className="message-body">
                {msg.content}
                {msg.tool_calls && (
                  <div className="tool-calls">
                    {msg.tool_calls.map((tc: { function?: { name?: string } }, tcIdx: number) => (
                      <div key={tcIdx} className="tool-call-block">
                        🛠️ Executing: <code>{tc.function?.name}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="message-bubble assistant typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
          {messages.length === 0 && (
            <div className="welcome-container">
              <h1>Welcome to OpenHands</h1>
              <p>Type a message below to start pair programming with your AI assistant!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <ChatInput
          connected={connected}
          activeSessionId={activeSessionId}
          isSending={isSending}
          onSendMessage={handleSendMessageWithText}
        />
      </main>
    </div>
  );
}
