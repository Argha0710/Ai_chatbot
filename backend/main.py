from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.llms import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your Vercel domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = OpenAI(openai_api_key=os.getenv("OPENAI_API_KEY"))

class Prompt(BaseModel):
    prompt: str

@app.post("/generate")
def generate_tweet(data: Prompt):
    tweet = llm(f"Write a tweet about: {data.prompt}")
    return {"result": tweet.strip()} 