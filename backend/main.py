from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

class Prompt(BaseModel):
    prompt: str
    hashtag: bool = False
    emoji: bool = False

class Tweet(BaseModel):
    username: str
    text: str

@app.post("/generate")
def generate_tweet(data: Prompt):
    try:
        final_prompt = f"Write a tweet about: {data.prompt}."
        final_prompt += " Include a relevant hashtag at the end." if data.hashtag else " Do not include any hashtags."
        final_prompt += " Include a relevant emoji." if data.emoji else " Do not include any emojis."

        print(f"📩 Final prompt to OpenAI: {final_prompt}")

        response = client.chat.completions.create(
            model="google/gemma-3n-e4b-it:free",
            messages=[{"role": "user", "content": final_prompt}]
        )

        tweet = response.choices[0].message.content if response.choices else None
        if not tweet:
            raise ValueError("OpenAI returned an empty tweet")

        return {"result": tweet.strip()}
    except Exception as e:
        print("🚨 Error from OpenAI:", str(e))
        raise HTTPException(status_code=500, detail=f"Error generating tweet: {str(e)}")

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
            print("🔴 TwitterClone server response:", response.text)
            raise HTTPException(status_code=500, detail="Failed to post tweet to TwitterClone")

        return {"status": "Tweet posted via proxy"}
    except Exception as e:
        print("🚨 Internal error posting tweet:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
