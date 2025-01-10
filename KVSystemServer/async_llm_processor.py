import asyncio
import os
import aiohttp
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AsyncLLMProcessor:
    def __init__(self):
        """Initialize the LLM processor with DeepSeek configuration"""
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_base = "https://api.deepseek.com/v1"
        
    async def process(self, prompt: str) -> str:
        """
        Process a single prompt and return the response content.
        
        Args:
            prompt: The input prompt text
            
        Returns:
            The response content as a string
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 150
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"DeepSeek API error: {response.status} - {error_text}")
                        
                    data = await response.json()
                    return data["choices"][0]["message"]["content"].strip()
                    
        except Exception as e:
            print(f"Error generating response: {str(e)}")
            raise

# Example usage:
if __name__ == "__main__":
    async def test_llm():
        processor = AsyncLLMProcessor()
        response = await processor.process("Hello, how are you?")
        print(f"Response: {response}")
        
    asyncio.run(test_llm())
