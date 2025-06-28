from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import requests
import os
from dotenv import load_dotenv

# 🔐 Load environment variables from .env file (like OPENROUTER_API_KEY)
load_dotenv()

# 🚀 Initialize FastAPI app
app = FastAPI()

# 🌐 Allow frontend to access backend APIs (CORS config)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 Connect to OpenRouter (OpenAI-compatible) with base URL and API key
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),  # Load API key from .env
    base_url="https://openrouter.ai/api/v1"   # OpenRouter endpoint
)

# 📦 Request model for generating tweet
class Prompt(BaseModel):
    prompt: str           # What the tweet is about
    hashtag: bool = False # Include a hashtag?
    emoji: bool = False   # Include an emoji?

# 📦 Request model for posting a tweet
class Tweet(BaseModel):
    username: str         # Tweet author's username
    text: str             # Actual tweet text

# 🔁 Generate tweet using LLM (via OpenRouter)
@app.post("/generate")
def generate_tweet(data: Prompt):
    try:
        # 🔧 Build prompt to send to model
        final_prompt = f"Write a tweet about: {data.prompt}."
        final_prompt += " Include a relevant hashtag at the end." if data.hashtag else " Do not include any hashtags."
        final_prompt += " Include a relevant emoji." if data.emoji else " Do not include any emojis."

        print(f"📩 Final prompt to OpenAI: {final_prompt}")

        # 🧠 Call OpenRouter model
        response = client.chat.completions.create(
            model="google/gemma-3n-e4b-it:free",  # Use a free OpenRouter model
            messages=[{"role": "user", "content": final_prompt}]
        )

        # ✅ Extract generated tweet
        tweet = response.choices[0].message.content if response.choices else None
        if not tweet:
            raise ValueError("OpenAI returned an empty tweet")

        return {"result": tweet.strip()}  # Send tweet to frontend

    except Exception as e:
        print("🚨 Error from OpenAI:", str(e))
        raise HTTPException(status_code=500, detail=f"Error generating tweet: {str(e)}")

# 📤 Post tweet to Twitter Clone server (via proxy)
@app.post("/post_tweet")
def proxy_post_tweet(tweet: Tweet, api_key: str = Header(...)):
    try:
        # 📨 Send tweet to Twitter Clone backend
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

        # ❌ If posting fails, log the error
        if not response.ok:
            print("🔴 TwitterClone server response:", response.text)
            raise HTTPException(status_code=500, detail="Failed to post tweet to TwitterClone")

        return {"status": "Tweet posted via proxy"}

    except Exception as e:
        print("🚨 Internal error posting tweet:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
