from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS setup so frontend can connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-chatbot-vert-six-94.vercel.app",  # ✅ frontend
        "http://localhost:3000"                      # ✅ local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter setup
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# Models
class Prompt(BaseModel):
    prompt: str

class Tweet(BaseModel):
    username: str
    text: str

# Routes
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

@app.post("/post_tweet")
def proxy_post_tweet(tweet: Tweet, api_key: str = Header(...)):
    try:
        response = requests.post(
            "https://twitterclone-server-2xz2.onrender.com/post_tweet",
            headers={
                "Content-Type": "application/json",
                "api-key": api_key
            },
            json={
                "username": tweet.username,
                "text": tweet.text
            }
        )

        if not response.ok:
            raise HTTPException(status_code=500, detail="Failed to post tweet to TwitterClone")

        return {"status": "Tweet posted via proxy"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
