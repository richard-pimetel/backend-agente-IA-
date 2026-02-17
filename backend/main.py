from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from groq import Groq
from dotenv import load_dotenv
import os
import json
import asyncio
from typing import AsyncGenerator

load_dotenv()

app = FastAPI(title="RichardEv AI Agent API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# System prompt for the advanced agent
SYSTEM_PROMPT = """Você é RichardEv, um agente de IA avançado especializado em programação e desenvolvimento de software.

INSTRUÇÕES IMPORTANTES:
1. Responda SEMPRE em português brasileiro
2. Quando solicitado código, forneça código funcional e bem documentado
3. Detecte automaticamente a linguagem de programação mais apropriada baseada no contexto
4. Se o usuário não especificar a linguagem, escolha a mais adequada para a tarefa
5. Forneça explicações claras e concisas junto com o código
6. Use markdown para formatar suas respostas
7. Para blocos de código, sempre especifique a linguagem após os backticks (```python, ```javascript, etc.)

Você é capaz de gerar código em: Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, SQL, HTML, CSS, e muitas outras linguagens.

Seja útil, preciso e profissional."""


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "RichardEv AI Agent"}


@app.post("/api/generate")
async def generate_code(request: Request):
    """Non-streaming endpoint for backward compatibility"""
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        
        if not prompt:
            return {"error": "Prompt is required"}
        
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-70b-versatile",
            temperature=0.7,
            max_tokens=4096
        )
        
        response_content = completion.choices[0].message.content
        
        return {
            "code": response_content,
            "language": "markdown",
            "tokens": {
                "input": completion.usage.prompt_tokens,
                "output": completion.usage.completion_tokens
            }
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/generate/stream")
async def stream_generate(request: Request):
    """Streaming endpoint using SSE"""
    try:
        body = await request.json()
        prompt = body.get("prompt", "")
        
        if not prompt:
            return {"error": "Prompt is required"}
        
        async def event_stream() -> AsyncGenerator[str, None]:
            try:
                stream = await asyncio.to_thread(
                    client.chat.completions.create,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    model="llama-3.1-70b-versatile",
                    stream=True,
                    temperature=0.7,
                    max_tokens=4096
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                
                # Send completion signal
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
