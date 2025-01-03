import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

class AsyncLLMProcessor:
    def __init__(self):
        """Initialize the LLM processor with DeepSeek configuration"""
        self.api_key = os.getenv('DEEPSEEK_API_KEY')
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment variables")
            
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
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
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant"},
                    {"role": "user", "content": prompt},
                ],
                stream=False
            )
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"Error generating response: {str(e)}")

# Example usage:
if __name__ == "__main__":
    import asyncio
    
    async def test_llm():
        processor = AsyncLLMProcessor()
        response = await processor.process("Hello, how are you?")
        print(f"Response: {response}")
        
    asyncio.run(test_llm())
