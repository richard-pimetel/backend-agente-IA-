import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  SendHorizontal, 
  Copy, 
  Download, 
  History, 
  Trash2, 
  Menu, 
  X,
  Loader2,
  Code2,
  Sparkles,
  Check,
  Terminal,
  Braces,
  FileCode
} from 'lucide-react';
import './App.css';

const API_URL = 'https://backend-agente-ia.onrender.com/api';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadHistory();
    // Check screen size
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('richardev-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Erro ao carregar histórico');
    }
  };

  const saveToHistory = (prompt, code, language) => {
    const newItem = {
      _id: Date.now().toString(),
      prompt,
      code,
      language,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newItem, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('richardev-history', JSON.stringify(updatedHistory));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/generate`, {
        prompt: input,
        language: 'javascript'
      });

      const aiMessage = {
        type: 'ai',
        content: response.data.code,
        language: response.data.language,
        tokens: response.data.tokens,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      saveToHistory(input, response.data.code, response.data.language);

    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: `Erro: ${error.response?.data?.message || error.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    showToast('Código copiado!');
  };

  const downloadCode = (code, filename = 'code.js') => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download iniciado!');
  };

  const loadFromHistory = (item) => {
    const userMessage = {
      type: 'user',
      content: item.prompt,
      timestamp: new Date(item.timestamp)
    };

    const aiMessage = {
      type: 'ai',
      content: item.code,
      language: item.language,
      timestamp: new Date(item.timestamp)
    };

    setMessages([userMessage, aiMessage]);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Deseja limpar todo o histórico?')) {
      setHistory([]);
      localStorage.removeItem('richardev-history');
      showToast('Histórico limpo!');
    }
  };

  return (
    <div className="app">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} data-testid="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Bot size={24} />
            </div>
            <div className="logo-text">
              <h1>RichardEv</h1>
              <span>Agente de Código</span>
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="section-title">
            <span><History size={14} /> Histórico</span>
            {history.length > 0 && (
              <button 
                onClick={clearHistory} 
                title="Limpar histórico"
                data-testid="clear-history-btn"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          
          <div className="history-list">
            {history.length === 0 ? (
              <p className="empty-history">Nenhum histórico ainda</p>
            ) : (
              history.map((item, index) => (
                <motion.div
                  key={item._id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="history-item"
                  onClick={() => loadFromHistory(item)}
                  data-testid={`history-item-${index}`}
                >
                  <p className="history-prompt">{item.prompt}</p>
                  <small className="history-time">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </small>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <button 
            className="mobile-menu-btn" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="header-title">
            <Sparkles size={18} />
            <span>Gerador de Código com IA</span>
          </div>
          <div style={{ width: 40 }} />
        </header>

        {/* Messages */}
        <div className="messages-container">
          <div className="messages-wrapper">
            {messages.length === 0 ? (
              <div className="welcome">
                <motion.div 
                  className="welcome-icon"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Bot size={40} />
                </motion.div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Olá, eu sou RichardEv
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Seu assistente de IA para geração de código. O que você quer criar?
                </motion.p>
                <motion.div 
                  className="examples"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <button 
                    className="example-btn" 
                    onClick={() => setInput('criar função para validar CPF')}
                    data-testid="example-cpf"
                  >
                    <Terminal size={16} />
                    Validar CPF
                  </button>
                  <button 
                    className="example-btn" 
                    onClick={() => setInput('criar API REST com Express')}
                    data-testid="example-api"
                  >
                    <Braces size={16} />
                    API REST
                  </button>
                  <button 
                    className="example-btn" 
                    onClick={() => setInput('criar componente React de login')}
                    data-testid="example-react"
                  >
                    <FileCode size={16} />
                    Componente React
                  </button>
                </motion.div>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`message message-${msg.type}`}
                  >
                    {msg.type === 'user' && (
                      <div className="message-content">
                        <p>{msg.content}</p>
                      </div>
                    )}

                    {msg.type === 'ai' && (
                      <>
                        <div className="message-label">
                          <Bot size={18} />
                          <span>RichardEv</span>
                        </div>
                        <div className="code-block">
                          <div className="code-header">
                            <span className="code-language">
                              <Code2 size={14} />
                              {msg.language}
                            </span>
                            <div className="code-actions">
                              <button 
                                className="code-action-btn"
                                onClick={() => copyToClipboard(msg.content)}
                                data-testid={`copy-btn-${index}`}
                              >
                                <Copy size={14} />
                                Copiar
                              </button>
                              <button 
                                className="code-action-btn"
                                onClick={() => downloadCode(msg.content)}
                                data-testid={`download-btn-${index}`}
                              >
                                <Download size={14} />
                                Baixar
                              </button>
                            </div>
                          </div>
                          <div className="code-content">
                            <SyntaxHighlighter
                              language={msg.language}
                              style={vscDarkPlus}
                              customStyle={{ 
                                margin: 0, 
                                background: 'transparent',
                                padding: '1rem'
                              }}
                            >
                              {msg.content}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                        {msg.tokens && (
                          <small className="tokens-info">
                            Tokens: {msg.tokens.input} in / {msg.tokens.output} out
                          </small>
                        )}
                      </>
                    )}

                    {msg.type === 'error' && (
                      <div className="message-content">
                        <p>{msg.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="message message-ai"
              >
                <div className="message-label">
                  <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>RichardEv está pensando...</span>
                </div>
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Descreva o código que você quer gerar..."
                disabled={loading}
                autoFocus
                data-testid="chat-input"
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={loading || !input.trim()}
                data-testid="send-btn"
              >
                {loading ? (
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <SendHorizontal size={20} />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Check size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
