from supabase import create_client, Client
from datetime import datetime
import io
from PIL import Image

class SupabaseClient:
    def __init__(self):
        self.url = "https://bzzmjbmhurbcmdisedvz.supabase.co"
        self.key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em1qYm1odXJiY21kaXNlZHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNzI3NjMsImV4cCI6MjA0NzY0ODc2M30.XzIDcjslhRwrLb2bey-_iDfsNNeWG8aSQkePy1RTCKs"
        
        # Create client without any extra arguments that might be injected by Railway
        self.client: Client = create_client(
            supabase_url=self.url,
            supabase_key=self.key
        )

    def upload_image(self, image_data: bytes, filename: str) -> str:
        """Upload image to Supabase storage and return the public URL"""
        try:
            # Upload to storage
            self.client.storage.from_('output').upload(
                path=filename,
                file=image_data,
                file_options={"content-type": "image/png"}
            )
            
            # Get public URL
            return self.client.storage.from_('output').get_public_url(filename)
        except Exception as e:
            print(f"Error uploading image: {str(e)}")
            raise

    def save_generation_metadata(self, metadata: dict) -> dict:
        """Save generation metadata to database"""
        try:
            response = self.client.table('image_generations').insert(metadata).execute()
            return response.data[0]
        except Exception as e:
            print(f"Error saving metadata: {str(e)}")
            raise
