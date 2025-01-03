import uuid
import json
import urllib.request
import urllib.parse
import requests
import argparse
import os
import logging
from websocket import create_connection, WebSocketTimeoutException
import time

# Initialize logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

server_address = "kv-g.1240865249176120.ap-southeast-1.pai-eas.aliyuncs.com"
client_id = str(uuid.uuid4())

headers = {
    'Content-Type': 'application/json',
    'Authorization': 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=='
}

def queue_prompt(prompt):
    p = {"prompt": prompt, "client_id": client_id}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"http://{server_address}/prompt", data=data, headers=headers)
    try:
        response = urllib.request.urlopen(req)
        return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print("Response:", e.read().decode())
        raise

def get_history(prompt_id):
    req = urllib.request.Request(f"http://{server_address}/history/{prompt_id}", headers=headers)
    try:
        response = urllib.request.urlopen(req)
        return json.loads(response.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print("Response:", e.read().decode())
        raise

def upload_file(file, subfolder="", overwrite=False):
    try:
        # Normalize the file path
        file = os.path.normpath(file)
        print(f"Attempting to upload file: {file}")
        
        if not os.path.exists(file):
            print(f"Error: File does not exist: {file}")
            return None
            
        with open(file, 'rb') as f:
            files = {'image': ('image.jpg', f, 'image/jpeg')}
            data = {}
            
            if overwrite:
                data["overwrite"] = "true"
            if subfolder:
                data["subfolder"] = subfolder

            # Create upload-specific headers without Content-Type (requests will set it automatically for multipart/form-data)
            upload_headers = {
                'Authorization': headers['Authorization']
            }

            print(f"Sending request to: http://{server_address}/upload/image")
            resp = requests.post(f"http://{server_address}/upload/image", files=files, data=data, headers=upload_headers)
            print(f"Request headers: {upload_headers}")
            
            if resp.status_code == 200:
                data = resp.json()
                path = data["name"]
                if "subfolder" in data and data["subfolder"]:
                    path = f"{data['subfolder']}/{path}"
                return path
            else:
                print(f"{resp.status_code} - {resp.reason}")
                print("Response content:", resp.text)
                print("Response headers:", resp.headers)
    except Exception as error:
        print(f"Error: {error}")
        return None

def check_history(prompt_id):
    """Check if workflow results are ready in history."""
    history = get_history(prompt_id)
    print("Checking history...")
    if prompt_id not in history:
        return None
    
    result = history[prompt_id]
    if 'outputs' in result:
        print("Workflow completed!")
        return result
    return None

def get_prompt_result(ws, workflow):
    try:
        # Queue the prompt and get prompt_id
        prompt_id = queue_prompt(workflow)['prompt_id']
        print(f"Prompt queued with ID: {prompt_id}")
        
        # Wait for execution to complete
        start_time = time.time()
        timeout = 120  # 120 seconds timeout
        last_history_check = 0
        history_check_interval = 5  # Check history every 5 seconds
        
        while True:
            if time.time() - start_time > timeout:
                raise Exception("Timeout waiting for workflow completion")
            
            # Check if it's time to check history
            current_time = time.time()
            should_check_history = current_time - last_history_check > history_check_interval
            
            try:
                ws.settimeout(5)  # 5 second timeout for each receive
                out = ws.recv()
                if isinstance(out, str):
                    message = json.loads(out)
                    print(f"Received: {message}")
                    
                    # Check for execution completion
                    if message['type'] == 'executing':
                        data = message['data']
                        print(data)
                        if data.get('node') is None and data.get('prompt_id') == prompt_id:
                            print("Workflow execution completed signal received")
                            should_check_history = True
                    
                    # Check for error messages
                    elif message['type'] == 'error':
                        raise Exception(f"Workflow error: {message.get('data', {}).get('error', 'Unknown error')}")
                        
            except WebSocketTimeoutException:
                pass  # Just continue to history check if needed
            
            # Check history if needed
            if should_check_history:
                result = check_history(prompt_id)
                if result:
                    return result
                last_history_check = current_time
                
    except Exception as e:
        print(f"Error in get_prompt_result: {str(e)}")
        return None

def main():
    try:
        parser = argparse.ArgumentParser()
        parser.add_argument('--path', help='Path to workflow JSON file')
        parser.add_argument('--image', required=True, help='Path to image file')
        args = parser.parse_args()
        
        image_path = args.image
        print(f"Processing image: {image_path}")
        
        # Upload your image
        uploaded_path = upload_file(image_path, "", True)
        
        if not uploaded_path:
            print("Failed to upload image!")
            return

        print("Image uploaded successfully:", uploaded_path)
        
        # Load the workflow
        print("Loading workflow...")
        
        # Initialize status tracking
        status = {
            "steps": [],
            "error": None
        }

        # Load the workflow
        try:
            workflow_path = os.path.join("", "MiniCPMV Prompt CreatorV2.json")
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.loads(f.read())
            logger.debug("Workflow loaded successfully")
            status["steps"].append({
                "name": "load_workflow",
                "success": True
            })
        except Exception as e:
            logger.error(f"Workflow loading failed: {str(e)}")
            status["steps"].append({
                "name": "load_workflow",
                "success": False,
                "error": str(e)
            })
            status["error"] = f"Failed to load workflow: {str(e)}"
            return status

        # Update workflow with dynamic values
        workflow.update({
            "3": {  # LoadImage node
                "class_type": "LoadImage",
                "inputs": {
                    "image": uploaded_path
                }
            },
            "1": {  # Prompt Generator node
                "class_type": "Prompt_Generator",
                "inputs": {
                    "folder_path": "",
                    "caption_method": "long_prompt",
                    "max_new_tokens": 2048,
                    "num_beams": 3,
                    "prefix_caption": "",
                    "suffix_caption": "",
                    "replace_tags": "",
                    "images": [
                        "3",
                        0
                    ]
                }
            },
            "4": {  # Show Text node
                "class_type": "ShowText|pysssss",
                "inputs": {
                    "text": [
                        "1",
                        2
                    ],
                    "text2": ""
                }
            }
        })

        print("Connecting to ComfyUI server...")
        # Create a WebSocket connection with authorization header
        ws = create_connection(
            f"ws://{server_address}/ws",
            header=[f"Authorization: {headers['Authorization']}"]
        )
        
        # Send the workflow
        print("Sending workflow...")
        ws.send(json.dumps(workflow))
        
        # Get the result
        result = get_prompt_result(ws, workflow)
        if result:
            print("\nWorkflow Result:")
            if 'outputs' in result and '4' in result['outputs']:
                # Print just the generated text
                print("Generated Text:")
                print(result['outputs']['4']['text'][0])
            else:
                # Print full result if structure is different
                print(json.dumps(result, indent=2))
        else:
            print("No result received")
        
        # Close the connection
        ws.close()
        
    except Exception as e:
        print(f"An error occurred: {e}")
        return

if __name__ == "__main__":
    main()
