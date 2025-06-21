from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS setup so frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ai-chatbot-vert-six-94.vercel.app",  # ✅ Your frontend URL
        "http://localhost:3000",                      # ✅ For local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter setup using the new OpenAI client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

class Prompt(BaseModel):
    prompt: str

@app.post("/generate")
def generate_tweet(data: Prompt):
    try:
        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",  
            messages=[{"role": "user", "content": f"Write a tweet about: {data.prompt}"}]
        )
        tweet = response.choices[0].message.content
        return {"result": tweet.strip()}
    except Exception as e:
        return {"error": str(e)}
