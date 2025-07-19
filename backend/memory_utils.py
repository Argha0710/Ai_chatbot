import os
import json
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error
from langchain.memory import ConversationBufferMemory, ChatMessageHistory
from langchain.schema import messages_from_dict, messages_to_dict

load_dotenv()

# MinIO client configuration
minio_client = Minio(
    endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ACCESS_KEY", ""),
    secret_key=os.getenv("MINIO_SECRET_KEY", ""),
    secure=os.getenv("MINIO_SECURE", "false").lower() == "true"
)

# Bucket names
CHAT_BUCKET = os.getenv("MINIO_CHAT_BUCKET", "chat-memory")
IMAGE_BUCKET = os.getenv("MINIO_BUCKET", "tweet-images")

# Object keys
MEMORY_OBJECT_NAME = "chat_memory.json"
IMAGE_OBJECT_NAME = "image_url.json"  # Not used directly, for reference

def ensure_bucket_exists(bucket_name: str):
    """Ensure a MinIO bucket exists; create if not."""
    try:
        if not minio_client.bucket_exists(bucket_name):
            print(f"[MinIO] Creating bucket: {bucket_name}")
            minio_client.make_bucket(bucket_name)
        else:
            print(f"[MinIO] Bucket already exists: {bucket_name}")
    except S3Error as e:
        print(f"[MinIO] Error checking/creating bucket '{bucket_name}':", e)
        raise

def load_memory_from_minio() -> ConversationBufferMemory:
    """Load conversation memory from MinIO."""
    ensure_bucket_exists(CHAT_BUCKET)
    try:
        data = minio_client.get_object(CHAT_BUCKET, MEMORY_OBJECT_NAME)
        messages = messages_from_dict(json.load(data))
        chat_history = ChatMessageHistory()
        chat_history.messages = messages
        return ConversationBufferMemory(memory_key="history", return_messages=True, chat_memory=chat_history)
    except Exception as e:
        print("[MinIO] Could not load memory, starting fresh:", e)
        return ConversationBufferMemory(memory_key="history", return_messages=True)

def save_memory_to_minio(memory: ConversationBufferMemory):
    """Save conversation memory to MinIO."""
    ensure_bucket_exists(CHAT_BUCKET)
    try:
        messages_dict = messages_to_dict(memory.chat_memory.messages)
        json_bytes = json.dumps(messages_dict).encode("utf-8")
        minio_client.put_object(
            CHAT_BUCKET,
            MEMORY_OBJECT_NAME,
            data=BytesIO(json_bytes),
            length=len(json_bytes),
            content_type="application/json"
        )
        print(f"[MinIO] Saved chat memory to '{CHAT_BUCKET}/{MEMORY_OBJECT_NAME}'")
    except Exception as e:
        print("[MinIO] Failed to save chat memory:", e)

def get_memory() -> ConversationBufferMemory:
    """Wrapper to load memory (entry point)."""
    return load_memory_from_minio()

def save_image_url_to_minio(url: str):
    """Save an image URL to MinIO using a timestamp-based key."""
    ensure_bucket_exists(IMAGE_BUCKET)
    try:
        timestamp = datetime.utcnow().isoformat().replace(":", "-")
        object_name = f"image_{timestamp}.json"
        url_data = json.dumps({"url": url, "timestamp": timestamp}).encode("utf-8")
        minio_client.put_object(
            IMAGE_BUCKET,
            object_name,
            data=BytesIO(url_data),
            length=len(url_data),
            content_type="application/json"
        )
        print(f"[MinIO] Saved image URL to '{IMAGE_BUCKET}/{object_name}'")
    except Exception as e:
        print("[MinIO] Failed to save image URL:", e)

def load_all_image_urls_from_minio() -> list:
    ensure_bucket_exists(IMAGE_BUCKET)
    try:
        urls = []
        public_url_base = os.getenv("MINIO_PUBLIC_URL")
        for obj in minio_client.list_objects(IMAGE_BUCKET, recursive=True):
            if obj.object_name:
                url = f"{public_url_base}/{obj.object_name}"
                timestamp = obj.last_modified.isoformat() if obj.last_modified else "unknown"
                urls.append({"url": url, "timestamp": timestamp})
        return urls
    except Exception as e:
        print("Error loading image URLs:", e)
        return []


  # You can keep this or remove if unused
def upload_image_and_get_url(image_bytes: bytes) -> str:
    ensure_bucket_exists(IMAGE_BUCKET)

    timestamp = datetime.utcnow().isoformat().replace(":", "-")
    object_name = f"image_{timestamp}.png"

    try:
        minio_client.put_object(
            IMAGE_BUCKET,
            object_name,
            data=BytesIO(image_bytes),
            length=len(image_bytes),
            content_type="image/png"
        )
        print(f"[MinIO] Uploaded image to '{IMAGE_BUCKET}/{object_name}'")

        # ✅ Use presigned URL to ensure access
        public_url_base = os.getenv("MINIO_PUBLIC_URL")
        url = f"{public_url_base}/{object_name}"



        # Save the URL to history
        save_image_url_to_minio(url)

        return url
    except Exception as e:
        print("[MinIO] Failed to upload image:", e)
        return ""
