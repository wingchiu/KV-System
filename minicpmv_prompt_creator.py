import websocket
import uuid
import json
import urllib.request
import urllib.parse
import requests
import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
server_address = "127.0.0.1:8188"
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def queue_prompt(prompt, client_id):
    p = {"prompt": prompt, "client_id": client_id}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"http://{server_address}/prompt", data=data)
    return json.loads(urllib.request.urlopen(req).read())

def get_history(prompt_id):
    with urllib.request.urlopen(f"http://{server_address}/history/{prompt_id}") as response:
        return json.loads(response.read())

def upload_file(file, subfolder="", overwrite=False):
    try:
        body = {"image": file}
        data = {}
        
        if overwrite:
            data["overwrite"] = "true"
        if subfolder:
            data["subfolder"] = subfolder

        resp = requests.post(f"http://{server_address}/upload/image", files=body, data=data)
        
        if resp.status_code == 200:
            data = resp.json()
            path = data["name"]
            if "subfolder" in data and data["subfolder"]:
                path = f"{data['subfolder']}/{path}"
            return path
        else:
            print(f"{resp.status_code} - {resp.reason}")
    except Exception as error:
        print(error)
        return None

def get_prompt_result(ws, prompt, client_id):
    prompt_id = queue_prompt(prompt, client_id)['prompt_id']
    
    while True:
        out = ws.recv()
        if isinstance(out, str):
            message = json.loads(out)
            if message['type'] == 'executing':
                data = message['data']
                if data['node'] is None and data['prompt_id'] == prompt_id:
                    break  # Execution is done

    history = get_history(prompt_id)[prompt_id]
    return history

def generate_prompt(image_path):
    try:
        client_id = str(uuid.uuid4())
        
        # Upload image to ComfyUI
        with open(image_path, "rb") as f:
            uploaded_path = upload_file(f, "", True)
        
        if not uploaded_path:
            return {"error": "Failed to upload image"}, 500

        # Load the workflow
        workflow_path = os.path.join(os.path.dirname(__file__), "app", "static", "workflows", "MiniCPMV Prompt Creator.json")
        with open(workflow_path, "r", encoding="utf-8") as f:
            workflow = json.loads(f.read())

        # Update workflow with image path
        workflow["3"]["inputs"]["image"] = uploaded_path

        # Configure workflow parameters
        workflow["1"]["inputs"].update({
            "caption_method": "long_prompt",
            "max_new_tokens": 2048,
            "num_beams": 3,
            "prefix_caption": "",
            "suffix_caption": "",
            "replace_tags": ""
        })

        # Connect to websocket
        ws = websocket.WebSocket()
        ws.connect(f"ws://{server_address}/ws?clientId={client_id}")

        # Get results
        result = get_prompt_result(ws, workflow, client_id)
        ws.close()

        # Extract prompt from result
        if "outputs" in result:
            for node_id in result["outputs"]:
                if node_id == "4":  # ShowText node
                    text_output = result["outputs"][node_id].get("text", "")
                    if text_output:
                        return {"prompt": text_output}
            
            return {"error": "No prompt generated"}, 500
        else:
            return {"error": "No outputs found in result"}, 500

    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/generate_prompt', methods=['POST'])
def api_generate_prompt():
    # Check if image file is present in request
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    
    # Check if a file was actually selected
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Check if file type is allowed
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400
    
    try:
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(temp_path)
        
        # Generate prompt
        result = generate_prompt(temp_path)
        
        # Clean up temporary file
        os.remove(temp_path)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Disable reloader when running in debug mode
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False) 