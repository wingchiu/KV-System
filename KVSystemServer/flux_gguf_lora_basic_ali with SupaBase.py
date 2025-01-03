import json
import urllib.request
import urllib.parse
import websocket
import time
import os
import argparse
import uuid
import requests
from websocket import create_connection
from PIL import Image
import io
from datetime import datetime
from supabase_client import SupabaseClient

server_address = "kv-g.1240865249176120.ap-southeast-1.pai-eas.aliyuncs.com"
client_id = str(uuid.uuid4())

# Initialize Supabase client
supabase = SupabaseClient()

def queue_prompt(prompt):
    try:
        p = {
            "prompt": prompt,
            "client_id": client_id,
            "extra_data": {
                "client_info": {
                    "name": "ComfyExample",
                    "version": "1.0"
                }
            }
        }
        data = json.dumps(p, indent=2).encode('utf-8')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ==',
            'Accept': 'application/json'
        }
        req = urllib.request.Request(
            "http://{}/prompt".format(server_address),
            data=data,
            headers=headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        print(e.read().decode('utf-8'))
        raise
    except Exception as e:
        print(f"Error: {str(e)}")
        raise

def get_image(filename, subfolder, folder_type):
    data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
    url_values = urllib.parse.urlencode(data)
    req = urllib.request.Request("http://{}/view?{}".format(server_address, url_values))
    req.add_header('Authorization', 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ==')
    with urllib.request.urlopen(req) as response:
        return response.read()

def get_history(prompt_id):
    req = urllib.request.Request("http://{}/history/{}".format(server_address, prompt_id))
    req.add_header('Authorization', 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ==')
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def get_images(ws, prompt):
    prompt_id = queue_prompt(prompt)['prompt_id']
    output_images = {}
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            print(message)
            if message['type'] == 'executing':
                data = message['data']
                if data['node'] is None and data['prompt_id'] == prompt_id:
                    break #Execution is done
        else:
            continue #previews are binary data

    history = get_history(prompt_id)[prompt_id]
    print(history)
    for o in history['outputs']:
        for node_id in history['outputs']:
            node_output = history['outputs'][node_id]
            if 'images' in node_output:
                images_output = []
                for image in node_output['images']:
                    image_data = get_image(image['filename'], image['subfolder'], image['type'])
                    images_output.append(image_data)
            output_images[node_id] = images_output

    return output_images


def upload_file(file, subfolder="", overwrite=False):
    try:
        # Wrap file in formdata so it includes filename
        body = {"image": file}
        data = {}
        
        if overwrite:
            data["overwrite"] = "true"
  
        if subfolder:
            data["subfolder"] = subfolder

        headers = {
            'Authorization': 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=='
        }
        resp = requests.post(f"http://{server_address}/upload/image", files=body, data=data, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            # Add the file to the dropdown list and update the widget value
            path = data["name"]
            if "subfolder" in data:
                if data["subfolder"] != "":
                    path = data["subfolder"] + "/" + path
            return path
        else:
            error_msg = f"Image upload failed: {resp.status_code} - {resp.reason}"
            if resp.text:
                error_msg += f"\n{resp.text}"
            raise Exception(error_msg)
    except Exception as error:
        raise Exception(f"Image upload error: {str(error)}")

def main():
    parser = argparse.ArgumentParser(description='Generate images using Flux GGUF Lora workflow')
    parser.add_argument('--width', type=int, default=1280, help='Width of the generated image')
    parser.add_argument('--height', type=int, default=1024, help='Height of the generated image')
    parser.add_argument('--batch_size', type=int, default=1, help='Batch size for generation')
    parser.add_argument('--lora', type=str, default="NCMocha.safetensors", help='LoRA file name')
    parser.add_argument('--positive', type=str, 
                       default="Create a vibrant and engaging advertisement for a premium bottled coffee, with a warm, inviting atmosphere. "
                               "In the foreground, feature a close-up of a sleek, elegant bottle of coffee, highlighting its rich, dark color "
                               "and smooth texture. The bottle should be slightly tilted, with a gentle pour of coffee into a glass cup, "
                               "emphasizing its freshness and premium quality. The background should depict a picturesque landscape with "
                               "mountains and a clear blue sky, with hot air balloons floating in the distance, evoking a sense of adventure "
                               "and relaxation. The bottle of coffee should be prominently displayed, with the tagline 'Expertly Crafted with Care' "
                               "clearly visible. The overall composition should convey the message that this bottled coffee is not just a beverage, "
                               "but an experience that brings people together and creates memorable moments. The color palette should be warm and "
                               "inviting, with a mix of earthy tones and bright accents to draw the viewer's eye to the key elements of the image.",
                       help='Positive prompt')
    parser.add_argument('--negative', type=str, default="bad hands, bad anatomy, blurry, low quality, distorted", help='Negative prompt')
    parser.add_argument('--style', type=str, default="Life Style", help='Style category')
    parser.add_argument('--product', type=str, default="Nescafe Gold", help='Product name')
    
    args = parser.parse_args()
    
    try:
        # Load the workflow
        print("Loading workflow...")
        workflow_path = os.path.join(os.path.dirname(__file__), "workflow", "Flux_GGUF_Lora_Basic_Ali.json")
        with open(workflow_path, "r", encoding="utf-8") as f:
            workflow = json.loads(f.read())
        
        # Update workflow parameters
        workflow["5"]["inputs"]["width"] = args.width
        workflow["5"]["inputs"]["height"] = args.height
        workflow["5"]["inputs"]["batch_size"] = args.batch_size
        workflow["15"]["inputs"]["lora_name"] = args.lora
        workflow["6"]["inputs"]["text"] = args.positive
        workflow["7"]["inputs"]["text"] = args.negative
        
        # Randomize seed for filename
        import random
        seed = random.randint(0, 2**32 - 1)
        workflow["3"]["inputs"]["seed"] = seed
        
        # Connect to websocket
        print("Connecting to ComfyUI server...")
        ws = create_connection(
            "ws://{}/ws?clientId={}".format(server_address, client_id),
            header={"Authorization": "MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=="}
        )
        
        print("Getting images...")
        images = get_images(ws, workflow)

        # Process and save the output images
        for node_id in images:
            for image_data in images[node_id]:
                try:
                    # Generate unique filename
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"generated_image_{timestamp}_{seed}.png"
                    
                    # Upload to Supabase storage
                    image_url = supabase.upload_image(image_data, filename)
                    
                    # Prepare metadata
                    metadata = {
                        "filename": filename,
                        "prompt": args.positive,
                        "negative_prompt": args.negative,
                        "style": args.style,
                        "product": args.product,
                        "resolution": f"{args.width}x{args.height}",
                        "lora_model": args.lora,
                        "generated_at": datetime.now().isoformat(),
                        "image_url": image_url,
                        "seed": seed,
                        "node_id": node_id
                    }
                    
                    # Save metadata to database
                    db_record = supabase.save_generation_metadata(metadata)
                    print(f"Image uploaded and metadata saved: {filename}")
                    print("Database record:", json.dumps(db_record, indent=2))
                    
                    # Optionally save locally
                    '''
                    with open(filename, 'wb') as f:
                        f.write(image_data)
                    print(f"Saved local backup as: {filename}")
                    '''
                    
                except Exception as e:
                    print(f"Error processing image: {str(e)}")
        
        ws.close()
        
    except Exception as e:
        print(f"Error in main: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()