from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error
from langchain.schema import AIMessage, HumanMessage
from tweet_chain import generate_tweet_with_memory
from memory_utils import *
from datetime import timedelta  # ✅ This is missing in your imports!

import os
import random
import threading
import time
import requests
from uuid import uuid4
from io import BytesIO
from urllib.parse import quote
from pathlib import Path

# 🔐 Load environment variables
load_dotenv()
DELETE_DELAY = int(os.getenv("DELETE_DELAY_SECONDS", "300"))  # default 5 mins

# 🌐 FastAPI app
app = FastAPI()

# 🔓 CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-chatbot-vert-six-94.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
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
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "tweet-images")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

# ✅ Ensure bucket exists
def ensure_bucket():
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
    except S3Error as e:
        print("❌ MinIO Error:", e)
        raise HTTPException(status_code=500, detail="MinIO bucket check failed")

def delete_image_from_minio(filename: str):
    try:
        minio_client.remove_object(MINIO_BUCKET, filename)
        print(f"✅ Deleted {filename} from MinIO.")
    except Exception as e:
        print(f"❌ Failed to delete {filename}: {e}")

def schedule_deletion(filename: str, delay: int = DELETE_DELAY):
    def delete_later():
        time.sleep(delay)
        delete_image_from_minio(filename)
    threading.Thread(target=delete_later, daemon=True).start()

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
        temp_map = {
            "precise": 0.2,
            "balanced": 0.7,
            "creative": 0.9,
            "wild": 1.2
        }

        tweet = generate_tweet_with_memory(
            prompt=data.prompt,
            hashtag=data.hashtag,
            emoji=data.emoji,
            temperature=temp_map.get(data.temperature, 0.7)
        )

                # Memory already updated inside generate_tweet_with_memory
        pass


        return {"result": tweet}

    except Exception as e:
        print("🚨 Tweet Generation Error:", e)
        raise HTTPException(status_code=500, detail="Error generating tweet")

@app.post("/clear_memory")
def clear_memory():
    fresh_memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
    save_memory_to_minio(fresh_memory)
    return {"message": "Memory cleared"}

# 🖼️ Image generation
@app.post("/generate_image")
def generate_image(data: ImagePrompt):
    try:
        ensure_bucket()
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
        image_uuid = uuid4().hex
        image_name = f"{image_uuid}.png"
        image_data.seek(0)

        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=image_name,
            data=image_data,
            length=image_data.getbuffer().nbytes,
            content_type="image/png"
        )

        public_url = f"{MINIO_PUBLIC_URL}/{quote(image_name)}"

        memory = get_memory()
        memory.chat_memory.add_message(
            AIMessage(
                content="",
                additional_kwargs={
                    "image_url": public_url,
                    "timestamp": time.time(),
                    "type": "image"  # ✅ Add a special marker
                }
            )
)

        save_memory_to_minio(memory)

        return {
            "image_url": public_url,
            "uuid": image_uuid
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 📤 Post tweet
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

        if tweet.image:
            try:
                image_name = tweet.image.split("/")[-1].split("?")[0]
                minio_client.remove_object(MINIO_BUCKET, image_name)
                print(f"🗑️ Image deleted from MinIO: {image_name}")
            except Exception as delete_err:
                print("⚠️ Could not delete image:", delete_err)

        return {"status": "Tweet posted"}

    except Exception as e:
        print("🚨 Post Tweet Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

# 📜 Chat history
@app.get("/history")
def get_chat_history():
    memory = get_memory()
    history = []

    for m in memory.chat_memory.messages:
        is_ai = isinstance(m, AIMessage)
        msg_type = "ai" if is_ai else "human"
        timestamp = None
        image_url = None
        custom_type = None

        if hasattr(m, "additional_kwargs"):
            timestamp = m.additional_kwargs.get("timestamp")
            image_url = m.additional_kwargs.get("image_url")
            custom_type = m.additional_kwargs.get("type")

        history.append({
            "type": custom_type or msg_type,  # ✅ Use special type if provided
            "content": m.content,
            "image_url": image_url,
            "timestamp": timestamp
        })

    return {"history": history}

# 📁 All image URLs
@app.get("/image_urls")
def get_image_urls():
    try:
        objects = minio_client.list_objects(MINIO_BUCKET)
        image_data = []

        for obj in objects:
            if obj.object_name is None:
                continue

            presigned_url = minio_client.presigned_get_object(
                MINIO_BUCKET, obj.object_name, expires=timedelta(seconds=604800) # ✅ Add here too
            )
            uuid = Path(obj.object_name).stem
            image_data.append({
                "uuid": uuid,
                "url": presigned_url
            })

        return {"images": image_data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# 🔁 Uvicorn runner
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
# 🎯 Fetch presigned image URL by UUID
# 📜 Single image URL by UUID
@app.get("/image_url/{uuid}")
def get_image_url(uuid: str):
    object_name = f"{uuid}.png"
    try:
        url = minio_client.presigned_get_object(
            MINIO_BUCKET, object_name, expires=timedelta(seconds=604800)  # ✅ Pass expires
        )
        return {"url": url}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})