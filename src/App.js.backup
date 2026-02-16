import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './App.css';

const API_URL = 'https://backend-agente-ia.onrender.com/api';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar histórico do localStorage
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('emergent-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Erro ao carregar histórico');
    }
  };

  // Salvar no localStorage
  const saveToHistory = (prompt, code, language) => {
    const newItem = {
      _id: Date.now().toString(),
      prompt,
      code,
      language,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [newItem, ...history].slice(0, 20); // Máximo 20
    setHistory(updatedHistory);
    localStorage.setItem('emergent-history', JSON.stringify(updatedHistory));
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
      
      // Salvar no localStorage (navegador)
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
    alert('✅ Código copiado!');
  };

  const downloadCode = (code, filename = 'code.js') => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
    setShowHistory(false);
  };

  // Limpar histórico
  const clearHistory = () => {
    if (window.confirm('Deseja limpar todo o histórico?')) {
      setHistory([]);
      localStorage.removeItem('emergent-history');
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>🤖 Emergent AI Code Generator</h1>
          <button 
            className="history-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            📚 Histórico ({history.length})
          </button>
        </div>
      </header>

      <div className="main-container">
        {/* Sidebar - Histórico */}
        {showHistory && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>📚 Histórico</h2>
              <div>
                <button onClick={clearHistory} title="Limpar" style={{marginRight: '8px'}}>🗑️</button>
                <button onClick={() => setShowHistory(false)}>✕</button>
              </div>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="empty-history">Nenhum histórico ainda</p>
              ) : (
                history.map((item, index) => (
                  <div 
                    key={item._id || index} 
                    className="history-item"
                    onClick={() => loadFromHistory(item)}
                  >
                    <p className="history-prompt">{item.prompt}</p>
                    <small className="history-time">
                      {new Date(item.timestamp).toLocaleString('pt-BR')}
                    </small>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Chat Area */}
        <main className="chat-container">
          <div className="messages">
            {messages.length === 0 ? (
              <div className="welcome">
                <h2>👋 Bem-vindo ao Emergent AI!</h2>
                <p>Digite o que você quer gerar e pressione Enter</p>
                <div className="examples">
                  <p><strong>Exemplos:</strong></p>
                  <button onClick={() => setInput('criar função para validar CPF')}>Validar CPF</button>
                  <button onClick={() => setInput('criar API REST com Express')}>API REST</button>
                  <button onClick={() => setInput('criar componente React de login')}>Componente React</button>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`message message-${msg.type}`}>
                  {msg.type === 'user' && (
                    <div className="message-content">
                      <strong>💬 Você:</strong>
                      <p>{msg.content}</p>
                    </div>
                  )}

                  {msg.type === 'ai' && (
                    <div className="message-content">
                      <strong>🤖 IA:</strong>
                      <div className="code-block">
                        <div className="code-header">
                          <span className="language">{msg.language}</span>
                          <div className="code-actions">
                            <button onClick={() => copyToClipboard(msg.content)} title="Copiar">
                              📋 Copiar
                            </button>
                            <button onClick={() => downloadCode(msg.content)} title="Baixar">
                              ⬇️ Baixar
                            </button>
                          </div>
                        </div>
                        <SyntaxHighlighter 
                          language={msg.language} 
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
                        >
                          {msg.content}
                        </SyntaxHighlighter>
                      </div>
                      {msg.tokens && (
                        <small className="tokens">Tokens: {msg.tokens.input} in / {msg.tokens.output} out</small>
                      )}
                    </div>
                  )}

                  {msg.type === 'error' && (
                    <div className="message-content error">
                      <strong>❌ Erro:</strong>
                      <p>{msg.content}</p>
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="message message-ai">
                <div className="message-content">
                  <strong>🤖 IA:</strong>
                  <div className="loading">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite o que você quer gerar..."
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? '⏳' : '▶️'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

export default App;
