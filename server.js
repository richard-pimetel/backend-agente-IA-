const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergent-ai';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB conectado!'))
  .catch(err => {
    console.log('MongoDB não conectado (usando memória):', err.message);
  });

// Schema do MongoDB
const CodeSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  timestamp: { type: Date, default: Date.now },
  tags: [String],
  userId: { type: String, default: 'default' }
});

const Code = mongoose.model('Code', CodeSchema);

// Groq Service
const Groq = require('groq-sdk');
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// ROTA: Gerar código com STREAMING (SSE)
app.post('/api/generate/stream', async (req, res) => {
  try {
    const { prompt, language = 'auto' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    console.log(`Gerando código (stream): "${prompt}"`);

    // Configurar SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullCode = '';

    // System prompt avançado multilíngue
    const systemPrompt = `Você é RichardEv, um agente de IA avançado especializado em programação e desenvolvimento de software.

INSTRUÇÕES IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Detecte automaticamente a linguagem de programação mais apropriada baseada no contexto do pedido
3. Se o usuário mencionar uma linguagem específica, use-a. Caso contrário, escolha a mais adequada para a tarefa
4. Forneça código funcional, bem documentado e com boas práticas
5. Use markdown para formatar suas respostas
6. Para blocos de código, SEMPRE especifique a linguagem após os backticks (ex: \`\`\`python, \`\`\`javascript, \`\`\`java, etc.)
7. Inclua comentários explicativos no código
8. Se necessário, explique brevemente o que o código faz após o bloco de código

Linguagens suportadas: Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL, HTML, CSS, Shell/Bash, e outras.

${language !== 'auto' ? `O usuário prefere a linguagem: ${language}` : 'Detecte a melhor linguagem automaticamente.'}`;

    // Gerar código com Groq em STREAMING
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true
    });

    // Enviar chunks em tempo real
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullCode += content;
        res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
      }
    }

    // Sinalizar fim
    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();

    // Salvar no histórico
    try {
      await Code.create({
        prompt,
        code: fullCode,
        language,
        timestamp: new Date()
      });
    } catch (dbError) {
      console.log('Não foi possível salvar no MongoDB');
    }

  } catch (error) {
    console.error('Erro ao gerar código:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
    res.end();
  }
});

// ROTA: Gerar código (sem streaming - fallback)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, language = 'auto' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    // System prompt avançado multilíngue
    const systemPrompt = `Você é RichardEv, um agente de IA avançado especializado em programação e desenvolvimento de software.

INSTRUÇÕES IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Detecte automaticamente a linguagem de programação mais apropriada baseada no contexto do pedido
3. Se o usuário mencionar uma linguagem específica, use-a. Caso contrário, escolha a mais adequada para a tarefa
4. Forneça código funcional, bem documentado e com boas práticas
5. Use markdown para formatar suas respostas
6. Para blocos de código, SEMPRE especifique a linguagem após os backticks
7. Inclua comentários explicativos no código

${language !== 'auto' ? `O usuário prefere a linguagem: ${language}` : 'Detecte a melhor linguagem automaticamente.'}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    });

    const code = completion.choices[0]?.message?.content || '';

    // Detectar linguagem do código gerado
    const detectedLang = detectLanguage(code);

    try {
      await Code.create({ prompt, code, language: detectedLang, timestamp: new Date() });
    } catch (dbError) {}

    res.json({ 
      success: true, 
      code, 
      language: detectedLang,
      tokens: {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar código', message: error.message });
  }
});

// Função para detectar linguagem do código
function detectLanguage(code) {
  const patterns = {
    python: /\b(def |import |from |class |if __name__|print\(|async def)\b/,
    javascript: /\b(const |let |var |function |=>|require\(|module\.exports)\b/,
    typescript: /\b(interface |type |: string|: number|: boolean|<T>)\b/,
    java: /\b(public class|private |void |System\.out|@Override)\b/,
    csharp: /\b(using System|namespace |public class|Console\.Write)\b/,
    cpp: /\b(#include|std::|cout|cin|int main\(\))\b/,
    go: /\b(package main|func |fmt\.|import \"|go func)\b/,
    rust: /\b(fn |let mut|impl |pub fn|println!)\b/,
    php: /\b(<\?php|\$[a-zA-Z]|echo |function .*\$)\b/,
    ruby: /\b(def |end$|puts |require '|class .* < )\b/,
    sql: /\b(SELECT |INSERT |UPDATE |DELETE |FROM |WHERE |CREATE TABLE)\b/i,
    html: /<(!DOCTYPE|html|head|body|div|span|script)/i,
    css: /\{[\s\S]*?:[^}]+\}/,
    shell: /\b(#!.+bin.+|echo \$|apt-get|npm |yarn |pip )\b/
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(code)) {
      return lang;
    }
  }
  return 'markdown';
}

// ROTA: Buscar histórico
app.get('/api/history', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const history = await Code.find().sort({ timestamp: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: history.length, history });
  } catch (error) {
    res.json({ success: false, count: 0, history: [] });
  }
});

// ROTA: Deletar item do histórico
app.delete('/api/history/:id', async (req, res) => {
  try {
    await Code.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Item deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

// ROTA: Limpar histórico
app.delete('/api/history', async (req, res) => {
  try {
    await Code.deleteMany({});
    res.json({ success: true, message: 'Histórico limpo' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao limpar histórico' });
  }
});

// ROTA: Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando!',
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    groq: !!process.env.GROQ_API_KEY ? 'configurado' : 'não configurado'
  });
});

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\nAPI rodando em http://localhost:${PORT}`);
});

module.exports = app;
