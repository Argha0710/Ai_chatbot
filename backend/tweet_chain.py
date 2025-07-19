from memory_utils import get_memory, save_memory_to_minio
from langchain_openai import ChatOpenAI
from langchain.chains import ConversationChain
import os
from dotenv import load_dotenv
from pydantic import SecretStr


load_dotenv()

def generate_tweet_with_memory(prompt: str, hashtag: bool = False, emoji: bool = False, temperature: float = 0.7) -> str:
    memory = get_memory()

    # Validate API key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not set.")

    # Get model name from environment
    model_name = os.getenv("OPENROUTER_MODEL")
    if not model_name:
        raise ValueError("OPENROUTER_MODEL not set in .env")

    # LLM config
    llm = ChatOpenAI(
        model=model_name,
        api_key=SecretStr(api_key),
        base_url="https://openrouter.ai/api/v1",
        temperature=temperature
    )

    # Memory chain
    convo = ConversationChain(
        llm=llm,
        memory=memory,
        verbose=False
    )

        # Internal prompt formatting
    final_prompt = f"Write a tweet about: {prompt.strip()}."
    if hashtag:
        final_prompt += " Include relevant hashtags."
    else:
        final_prompt += " Do not include any hashtags."
    if emoji:
        final_prompt += " Include relevant emojis."
    else:
        final_prompt += " Do not include any emojis."
    final_prompt += " Keep it concise and engaging. also only genarate the specific tweet without any additional text or explanation."
    # AI output
    result = convo.predict(input=final_prompt)

    # Save memory to MinIO
    save_memory_to_minio(memory)
    

    return result.strip()
