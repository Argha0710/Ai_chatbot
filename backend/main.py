from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
import requests
from io import BytesIO
from uuid import uuid4
from minio import Minio
from urllib.parse import quote
import random

# 🔐 Load environment variables
load_dotenv()

# 🌐 FastAPI app
app = FastAPI()

# 🔓 CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ai-chatbot-vert-six-94.vercel.app",  # Replace this with your actual frontend domain
    "http://localhost:3000",             # For local testing
    "http://127.0.0.1:3000"],  # ⚠️ Use specific origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 OpenRouter client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

# 🪣 MinIO setup
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "tweet-images")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

# Ensure bucket exists
from minio.error import S3Error

try:
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)
except S3Error as e:
    print("MinIO Error:", e)


# 📦 Data models
class Prompt(BaseModel):
    prompt: str
    hashtag: bool = False
    emoji: bool = False
    temperature: str = "balanced"

class ImagePrompt(BaseModel):
    prompt: str

class Tweet(BaseModel):
    username: str
    text: str
    image: str | None = None

# 🧠 Tweet generation
@app.post("/generate")
def generate_tweet(data: Prompt):
    try:
        prompt_text = f"Write a tweet about: {data.prompt}."
        prompt_text += " Include a relevant hashtag." if data.hashtag else " No hashtags."
        prompt_text += " Include a relevant emoji." if data.emoji else " No emojis."

        temp_map = {
            "precise": 0.2,
            "balanced": 0.7,
            "creative": 0.9,
            "wild": 1.2
        }

        response = client.chat.completions.create(
            model="google/gemma-3n-e4b-it:free",
            messages=[{"role": "user", "content": prompt_text}],
            temperature=temp_map.get(data.temperature, 0.7)
        )

        content = response.choices[0].message.content
        if not content:
            raise HTTPException(status_code=500, detail="OpenRouter returned empty content")

        return {"result": content.strip()}
    except Exception as e:
        print("🚨 Tweet Generation Error:", e)
        raise HTTPException(status_code=500, detail="Error generating tweet")

# 🖼️ Image generation and MinIO upload
@app.post("/generate_image")
def generate_image(data: ImagePrompt):
    try:
        poll_token = os.getenv("POLLINATIONS_TOKEN")
        if not poll_token:
            raise Exception("Missing POLLINATIONS_TOKEN")

        prompt_encoded = quote(data.prompt)
        seed = random.randint(1, 999999)
        url = f"https://image.pollinations.ai/prompt/{prompt_encoded}?model=flux&width=1024&height=1024&seed={seed}&nologo=true"

        response = requests.get(url, headers={"Authorization": f"Bearer {poll_token}"})
        if response.status_code != 200:
            raise Exception(f"Pollinations error: {response.status_code} - {response.text}")

        image_data = BytesIO(response.content)
        image_name = f"{uuid4().hex}.png"

        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=image_name,
            data=image_data,
            length=image_data.getbuffer().nbytes,
            content_type="image/png"
        )

        public_url = minio_client.presigned_get_object(MINIO_BUCKET, image_name)
        return {"image_url": public_url}

    except Exception as e:
        print("🚨 Image Generation Error:", e)
        raise HTTPException(status_code=500, detail="Image generation failed")

# 📤 Post tweet to Twitter Clone
@app.post("/post_tweet")
def post_tweet(tweet: Tweet, api_key: str = Header(...)):
    try:
        payload = {
            "username": tweet.username,
            "text": tweet.text
        }
        if tweet.image:
            payload["image"] = tweet.image

        res = requests.post(
            "https://twitterclone-server-2xz2.onrender.com/post_tweet",
            headers={
                "Content-Type": "application/json",
                "api-key": api_key
            },
            json=payload
        )

        if not res.ok:
            raise Exception(f"Twitter Clone error: {res.text}")

        return {"status": "Tweet posted"}
    except Exception as e:
        print("🚨 Post Tweet Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
# if __name__ == "__main__":
#     import uvicorn
#     port = int(os.environ.get("PORT", 8000))  # Use PORT env from Render
#     uvicorn.run("main:app", host="0.0.0.0", port=port)
