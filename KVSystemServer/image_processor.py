import websocket
import uuid
import json
import urllib.request
import urllib.parse
import requests
import os

class ImageProcessor:
    def __init__(self, server_address="127.0.0.1:8188"):
        self.server_address = server_address
        self.client_id = str(uuid.uuid4())
        
    def queue_prompt(self, prompt):
        p = {"prompt": prompt, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        req = urllib.request.Request(f"http://{self.server_address}/prompt", data=data)
        return json.loads(urllib.request.urlopen(req).read())

    def get_history(self, prompt_id):
        with urllib.request.urlopen(f"http://{self.server_address}/history/{prompt_id}") as response:
            return json.loads(response.read())

    def upload_file(self, file_data, subfolder="", overwrite=False):
        try:
            body = {"image": file_data}
            data = {}
            
            if overwrite:
                data["overwrite"] = "true"
            if subfolder:
                data["subfolder"] = subfolder

            resp = requests.post(f"http://{self.server_address}/upload/image", files=body, data=data)
            
            if resp.status_code == 200:
                data = resp.json()
                path = data["name"]
                if "subfolder" in data and data["subfolder"]:
                    path = f"{data['subfolder']}/{path}"
                return path
            else:
                raise Exception(f"{resp.status_code} - {resp.reason}")
        except Exception as error:
            raise Exception(f"Upload failed: {str(error)}")

    def get_prompt_result(self, ws, prompt):
        prompt_id = self.queue_prompt(prompt)['prompt_id']
        
        while True:
            out = ws.recv()
            if isinstance(out, str):
                message = json.loads(out)
                if message['type'] == 'executing':
                    data = message['data']
                    if data['node'] is None and data['prompt_id'] == prompt_id:
                        break

        history = self.get_history(prompt_id)[prompt_id]
        return history

    def process_image(self, image_data):
        try:
            # Upload the image
            uploaded_path = self.upload_file(image_data, "", True)
            
            # Load the workflow
            workflow_path = os.path.join("workflow", "MiniCPMV Prompt Creator.json")
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.loads(f.read())

            # Update the workflow with our image
            workflow["3"]["inputs"]["image"] = uploaded_path

            # Configure parameters
            workflow["1"]["inputs"].update({
                "caption_method": "long_prompt",
                "max_new_tokens": 2048,
                "num_beams": 3,
                "prefix_caption": "",
                "suffix_caption": "",
                "replace_tags": ""
            })

            # Connect to websocket and execute
            ws = websocket.WebSocket()
            ws.connect(f"ws://{self.server_address}/ws?clientId={self.client_id}")

            # Get the results
            result = self.get_prompt_result(ws, workflow)
            ws.close()

            # Extract the generated prompt
            if "outputs" in result:
                for node_id in result["outputs"]:
                    if node_id == "4":  # ShowText node
                        text_output = result["outputs"][node_id].get("text", "")
                        if text_output:
                            return text_output

            raise Exception("No prompt was generated in the output.")

        except Exception as e:
            raise Exception(f"Image processing failed: {str(e)}")
