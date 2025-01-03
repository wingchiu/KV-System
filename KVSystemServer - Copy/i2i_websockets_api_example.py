#This is an example that uses the websockets api to know when a prompt execution is done
#Once the prompt execution is done it downloads the images using the /history endpoint

from websocket import create_connection #NOTE: websocket-client (https://github.com/websocket-client/websocket-client)
import uuid
import json
import urllib.request
import urllib.parse
import requests
import os

server_address = "kv-g.1240865249176120.ap-southeast-1.pai-eas.aliyuncs.com"
client_id = str(uuid.uuid4())

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


#upload an image
with open("example.png", "rb") as f:
    comfyui_path_image = upload_file(f,"",True)
    print(comfyui_path_image)

#load workflow from file
with open("i2i_workflow_ali.json", "r", encoding="utf-8") as f:
    workflow_data = f.read()

workflow = json.loads(workflow_data)

#set the text prompt for our positive CLIPTextEncode
workflow["6"]["inputs"]["text"]  = "masterpiece, best quality, a wide angle shot from the front of a girl posing on a pool in a beautiful meadow,:o face, long and rose hair,perfect legs, perfect arms, perfect eyes,perfect body, perfect feet,blue day sky,shorts, beautiful eyes,sharp focus, full body shot"
workflow["7"]["inputs"]["text"]  = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry , deformed,nsfw, deformed legs"

#random seed
import random

seed = random.randint(1, 1000000000)
#set the seed for our KSampler node
workflow["3"]["inputs"]["seed"] = seed

#set the image name for our LoadImage node
workflow["10"]["inputs"]["image"] = comfyui_path_image

# Set model to the known available model
workflow["14"]["inputs"]["ckpt_name"] = "SD1.5/动物世界.safetensors"

ws = create_connection(
    "ws://{}/ws?clientId={}".format(server_address, client_id),
    header={
        'Authorization': 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=='
    }
)
images = get_images(ws, workflow)

#Commented out code to display the output images:

for node_id in images:
    for image_data in images[node_id]:
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_data))
        image.show()
        # save image
        image.save(f"{node_id}-{seed}.png")
