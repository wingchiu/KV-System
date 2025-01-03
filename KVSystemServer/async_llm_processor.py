import asyncio
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AsyncLLMProcessor:
    def __init__(self):
        """Initialize the LLM processor with OpenAI configuration"""
        self.client = AsyncOpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
    async def process(self, prompt: str) -> str:
        """
        Process a single prompt and return the response content.
        
        Args:
            prompt: The input prompt text
            
        Returns:
            The response content as a string
        """
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
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
