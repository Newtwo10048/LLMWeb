# llm_runner/llm_runner.py
# A minimal FastAPI SSE generator using llama-cpp-python
# Put model file into ../models/llama3.ggml (可替換)
# pip install fastapi "uvicorn[standard]" sse-starlette llama-cpp-python

from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
import urllib.parse
import os
import time

# 可選：使用 llama-cpp-python 套件 (pip install llama-cpp-python)
# 範例使用 llama-cpp-python 的 streaming generator API
try:
    from llama_cpp import Llama
except Exception as e:
    Llama = None
    print("llama_cpp import failed; please install llama-cpp-python if you want real model support.", e)

app = FastAPI()

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'llama3.ggml')

def token_stream_from_model(prompt: str):
    """
    如果有 llama_cpp，使用 streaming 回傳 token（yield）
    否則回傳簡單 echo 範例（for testing）。
    """
    if Llama and os.path.exists(MODEL_PATH):
        llm = Llama(model_path=MODEL_PATH)
        # llama_cpp 的流式輸出方式：stream=True 並 iterate generator
        for partial in llm.generate(prompt, stream=True):
            # partial 可能包含 .token 或 .choices
            # 以 partial.text 或 partial.delta 為例（依版本不同）
            text = ''
            try:
                # new llama-cpp-python interface returns 'token' or 'choices'
                text = partial.get('content', '') if isinstance(partial, dict) else getattr(partial, 'token', '')
            except:
                try:
                    text = partial.token
                except:
                    text = str(partial)
            if text:
                yield text
        # 完成
    else:
        # fallback demo: 慢慢回傳 prompt 的每個字（模擬逐字）
        for ch in prompt:
            time.sleep(0.02)
            yield ch
        yield "\n"  # done

@app.get("/generate")
async def generate(request: Request):
    # 支援從 query prompt 或 body
    qs = dict(request.query_params)
    prompt = qs.get('prompt', '')
    if not prompt:
        # 允許 POST，但此範例用 GET
        return {"error": "no prompt"}

    async def event_generator():
        # stream tokens as SSE
        for token in token_stream_from_model(prompt):
            # check client disconnected
            if await request.is_disconnected():
                break
            # each yield is one SSE "data"
            yield f"data: {token}\n\n"
        # send done event
        yield 'event: done\ndata: {"done": true}\n\n'

    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("llm_runner:app", host="127.0.0.1", port=8000, log_level="info")
