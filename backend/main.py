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
    hashtag: bool = False
    emoji: bool = False  

class Tweet(BaseModel):
    username: str
    text: str
    

# Routes
@app.post("/generate")
def generate_tweet(data: Prompt):
    try:
        # Build the prompt based on the two booleans
        final_prompt = f"Write a tweet about: {data.prompt}."

        if data.hashtag:
            final_prompt += " Include a relevant hashtag at the end. and also"
        else:
            final_prompt += " Do not include any hashtags.  and also"

        if data.emoji:
            final_prompt += " Include a relevant emoji."
        else:
            final_prompt += " Do not include any emojis."

        # print(f"📩 Final prompt to OpenAI: {final_prompt}")

        response = client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": final_prompt}]
        )

        tweet = response.choices[0].message.content
        if tweet is None:
            raise ValueError("Received empty tweet content from OpenAI")
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
            print("🔴 TwitterClone server response:", response.text)  # <-- log actual error
            raise HTTPException(status_code=500, detail="Failed to post tweet to TwitterClone")

        return {"status": "Tweet posted via proxy"}
    except Exception as e:
        print("🚨 Internal error posting tweet:", str(e))  # <-- log Python-side error
        raise HTTPException(status_code=500, detail=str(e))
