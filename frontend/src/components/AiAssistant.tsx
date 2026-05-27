import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import api from '@/api/api';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const AiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async (override?: string) => {
    const trimmed = (override || input).trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/assistant/chat', {
        message: trimmed,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages([...updated, { role: 'model', content: res.data.reply }]);
    } catch {
      setMessages([...updated, { role: 'model', content: "⚠️ Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-accent/30"
            style={{ background: 'linear-gradient(135deg, hsl(174,62%,38%), hsl(174,62%,50%))' }}
            id="ai-assistant-fab"
          >
            <Sparkles size={24} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[520px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/50"
            style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(20px)' }}
            id="ai-assistant-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50"
              style={{ background: 'linear-gradient(135deg, hsl(174,62%,38%), hsl(174,62%,28%))' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">SmartRoad Assistant</p>
                  <p className="text-white/70 text-xs">Powered by Gemini AI</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3 opacity-70">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'hsl(174,62%,38%/0.15)' }}>
                    <Bot size={28} style={{ color: 'hsl(174,62%,38%)' }} />
                  </div>
                  <p className="text-sm font-medium text-foreground">Hi! I'm your SmartRoad Assistant</p>
                  <p className="text-xs text-muted-foreground">Ask me about reporting potholes, using the live camera, or understanding AI severity.</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['How to report?', 'What is severity?', 'Setup IP Webcam'].map((q) => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-secondary transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'hsl(174,62%,38%/0.15)' }}>
                      <Bot size={14} style={{ color: 'hsl(174,62%,38%)' }} />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                  }`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-primary/10">
                      <User size={14} className="text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'hsl(174,62%,38%/0.15)' }}>
                    <Bot size={14} style={{ color: 'hsl(174,62%,38%)' }} />
                  </div>
                  <div className="bg-secondary px-3 py-2 rounded-xl rounded-bl-sm flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-1.5">
                <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown} placeholder="Ask me anything..." disabled={loading}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-1" id="ai-assistant-input" />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: input.trim() ? 'hsl(174,62%,38%)' : 'transparent', color: input.trim() ? 'white' : 'hsl(var(--muted-foreground))' }}
                  id="ai-assistant-send">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
