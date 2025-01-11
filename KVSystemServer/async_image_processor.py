import uuid
import json
import os
import aiohttp
import websockets
import random
import base64
import time
import urllib.request
import urllib.parse
from typing import BinaryIO, Dict, Any, List, Union
from datetime import datetime
import logging
from supabase_client import SupabaseClient
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class AsyncImageProcessor:
    #def __init__(self, server_address="127.0.0.1:8188", output_dir=None):
    def __init__(self, server_address="kv-g.1240865249176120.ap-southeast-1.pai-eas.aliyuncs.com", output_dir=None):
        self.server_address = server_address.rstrip('/')  # Remove trailing slash if present
        self.client_id = str(uuid.uuid4())
        self.session = None
        self.output_dir = output_dir or os.path.join("D:", "ComfyUI", "ComfyUI", "output")
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=='
        }
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            
    async def queue_prompt(self, prompt) -> Dict[str, Any]:
        """Queue a prompt with the ComfyUI server"""
        try:
            data = {"prompt": prompt, "client_id": self.client_id}
            async with self.session.post(
                f"http://{self.server_address}/prompt",
                json=data,
                headers=self.headers
            ) as response:
                if response.status != 200:
                    return {
                        "success": False,
                        "step": "queue_prompt",
                        "error": f"Server returned status {response.status}"
                    }
                return {
                    "success": True,
                    "step": "queue_prompt",
                    "data": await response.json()
                }
        except Exception as e:
            return {
                "success": False,
                "step": "queue_prompt",
                "error": str(e)
            }

    async def get_history(self, prompt_id) -> Dict[str, Any]:
        """Get the history of a prompt execution"""
        try:
            async with self.session.get(
                f"http://{self.server_address}/history/{prompt_id}",
                headers=self.headers
            ) as response:
                if response.status != 200:
                    return {
                        "success": False,
                        "step": "get_history",
                        "error": f"Server returned status {response.status}"
                    }
                return {
                    "success": True,
                    "step": "get_history",
                    "data": await response.json()
                }
        except Exception as e:
            return {
                "success": False,
                "step": "get_history",
                "error": str(e)
            }

    async def get_image(self, filename, subfolder, folder_type) -> bytes:
        """Get an image from the server"""
        try:
            params = {
                "filename": filename,
                "subfolder": subfolder,
                "type": folder_type
            }
            async with self.session.get(
                f"http://{self.server_address}/view",
                params=params,
                headers=self.headers
            ) as response:
                if response.status != 200:
                    raise Exception(f"Server returned status {response.status}")
                return await response.read()
        except Exception as e:
            print(f"Error getting image: {str(e)}")
            return None

    '''
    def get_history(prompt_id):
        req = urllib.request.Request("http://{}/history/{}".format(server_address, prompt_id))
        req.add_header('Authorization', 'MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ==')
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    '''        

    async def upload_file(self, file_data: BinaryIO, subfolder="", overwrite=False) -> Dict[str, Any]:
        """Upload a file to the ComfyUI server"""
        try:
            data = aiohttp.FormData()
            data.add_field('image', file_data)
            
            params = {}
            if overwrite:
                params["overwrite"] = "true"
            if subfolder:
                params["subfolder"] = subfolder

            # For file upload, we only need the Authorization header
            headers = {'Authorization': self.headers['Authorization']}

            async with self.session.post(
                f"http://{self.server_address}/upload/image",
                data=data,
                params=params,
                headers=headers
            ) as response:
                if response.status != 200:
                    return {
                        "success": False,
                        "step": "upload_file",
                        "error": f"Server returned status {response.status}"
                    }
                data = await response.json()
                path = data["name"]
                if "subfolder" in data and data["subfolder"]:
                    path = f"{data['subfolder']}/{path}"
                return {
                    "success": True,
                    "step": "upload_file",
                    "data": path
                }
        except Exception as e:
            return {
                "success": False,
                "step": "upload_file",
                "error": str(e)
            }

    async def get_prompt_result(self, prompt) -> Dict[str, Any]:
        """Get the result of a prompt execution using websockets"""
        try:
            queue_result = await self.queue_prompt(prompt)
            if not queue_result["success"]:
                return queue_result
                
            prompt_id = queue_result["data"]["prompt_id"]
            generated_prompt = None
            
            try:
                ws_url = f"ws://{self.server_address}/ws?clientId={self.client_id}"
                print(f"Connecting to websocket at: {ws_url}")
                
                async with websockets.connect(ws_url, extra_headers={'Authorization': self.headers['Authorization']}) as websocket:
                    while True:
                        try:
                            message = await websocket.recv()
                            if isinstance(message, str):
                                try:
                                    data = json.loads(message)
                                    print(f"Received message type: {data.get('type')}")
                                    
                                    if data['type'] == 'executing':
                                        execution_data = data['data']
                                        print(f"Executing node: {execution_data.get('node')}")
                                        if execution_data.get('node') is None and execution_data.get('prompt_id') == prompt_id:
                                            print("Workflow execution completed")
                                            break
                                except json.JSONDecodeError as e:
                                    print(f"Failed to decode JSON message: {e}")
                                    continue
                        except Exception as e:
                            print(f"Error receiving message: {e}")
                            continue

                # Get the final result from history
                history_result = await self.get_history(prompt_id)
                if history_result["success"] and prompt_id in history_result["data"]:
                    result = history_result["data"][prompt_id]
                    print(f"Got history result for prompt {prompt_id}")
                    
                    # Extract prompt from the result
                    if ('outputs' in result and 
                        '19' in result['outputs'] and 
                        'text' in result['outputs']['19'] and    
                        isinstance(result['outputs']['19']['text'], list) and 
                        len(result['outputs']['19']['text']) > 0):
                        generated_prompt = result['outputs']['19']['text'][0]
                        print(f"Found prompt in final result: {generated_prompt}")
                        return {
                            'success': True,
                            'prompt': generated_prompt  # Return in format expected by frontend
                        }
                    else:
                        print("No prompt found in history result structure")
                        return {
                            'success': False,
                            'error': 'No prompt was found in history result'
                        }
                else:
                    print("Failed to get history result")
                    return {
                        'success': False,
                        'error': 'Failed to get history result'
                    }
                    
            except Exception as e:
                return {
                    'success': False,
                    'error': f"WebSocket error: {str(e)}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


    async def process_image_prompt(self, image_data: BinaryIO) -> Dict[str, Any]:
        """Process an image and return the generated prompt with status information"""
        logger.debug("Starting image processing")
        status = {
            "steps": [],
            "success": False,
            "error": None
        }

        try:
            # Upload the image
            logger.debug("Uploading image")
            upload_result = await self.upload_file(image_data)
            
            if not upload_result["success"]:
                status["steps"].append({
                    "name": "upload_image",
                    "success": False,
                    "error": upload_result["error"]
                })
                status["error"] = upload_result["error"]
                return status
                
            image_path = upload_result["data"]
            logger.debug(f"Image uploaded successfully to: {image_path}")
            status["steps"].append({
                "name": "upload_image",
                "success": True
            })
            
            try:
                # Load the workflow template
                workflow_path = os.path.join(os.path.dirname(__file__), "workflow", "MiniCPMV-Prompt-Inference-Ali.json")
                if not os.path.exists(workflow_path):
                    error_msg = f"Workflow file not found: {workflow_path}"
                    logger.error(error_msg)
                    status["steps"].append({
                        "name": "load_workflow",
                        "success": False,
                        "error": error_msg
                    })
                    status["error"] = error_msg
                    return status

                with open(workflow_path, "r") as f:
                    workflow = json.load(f)
                logger.debug("Workflow loaded successfully")
                    
                # Update the workflow with our parameters
                workflow["3"]["inputs"]["image"] = image_path  # Update LoadImage node with our image
                logger.debug("Workflow updated with image path and parameters")
                
                status["steps"].append({
                    "name": "update_workflow",
                    "success": True
                })
                
                # Execute the workflow
                logger.debug("Requesting prompt generation")
                result = await self.get_prompt_result(workflow)
                logger.debug(f"Prompt generation result: {result}")
                
                if result["success"]:
                    #logger.debug(f"Checking result structure: {result}")
                    if 'prompt' in result:
                        prompt_text = result['prompt']
                        #logger.debug("Found text output: %s", prompt_text[:1] + "...")  # Only log first character for debug
                        status["success"] = True
                        status["final_prompt"] = prompt_text  # Store the full prompt
                        status["steps"].append({
                            "name": "generate_prompt",
                            "success": True
                        })
                        return status
                    else:
                        error_msg = "No prompt field in result"
                        logger.error(error_msg)
                        status["steps"].append({
                            "name": "generate_prompt",
                            "success": False,
                            "error": error_msg
                        })
                        status["error"] = error_msg
                else:
                    error_msg = result.get("error", "Unknown error in prompt generation")
                    logger.error(error_msg)
                    status["steps"].append({
                        "name": "generate_prompt",
                        "success": False,
                        "error": error_msg
                    })
                    status["error"] = error_msg
                    
            except Exception as e:
                error_msg = f"Failed to generate prompt: {str(e)}"
                logger.error(error_msg)
                status["steps"].append({
                    "name": "generate_prompt",
                    "success": False,
                    "error": error_msg
                })
                status["error"] = error_msg
                
        except Exception as e:
            error_msg = f"General error in process_image: {str(e)}"
            logger.error(error_msg)
            status["error"] = error_msg
            
        return status

    async def process_flux_lora(self, width: int, height: int, lora_name: str, 
                              positive_prompt: str, negative_prompt: str, batch_size: int) -> Dict[str, Any]:
                              
        """Process a Flux GGUF Lora request and return the generated images"""
        print(f"Starting process_flux_lora with parameters:")
        print(f"- width: {width}")
        print(f"- height: {height}")
        print(f"- lora_name: {lora_name}")
        #print(f"- model_name: {model_name}")
        print(f"- batch_size: {batch_size}")
        
        status = {
            "steps": [],
            "success": False,
            "images": [],
            "error": None
        }
        
        try:
            # Load the workflow template
            workflow_path = os.path.join(os.path.dirname(__file__), "workflow", "Flux_GGUF_Lora_Basic_Ali.json")
            if not os.path.exists(workflow_path):
                logger.error(f"Workflow file not found: {workflow_path}")
                return {
                    'success': False,
                    'error': f"Workflow file not found: {workflow_path}"
                }

            with open(workflow_path, 'r') as f:
                workflow = json.load(f)

            # Generate a random seed
            random_seed = random.randint(0, 2**32 - 1)
            print(f"Using random seed: {random_seed}")
            
            try:
                # Update the workflow with our parameters
                # Update KSampler parameters
                workflow["3"]["inputs"]["seed"] = random_seed
                
                # Update Empty Latent Image parameters
                workflow["5"]["inputs"]["width"] = width
                workflow["5"]["inputs"]["height"] = height
                workflow["5"]["inputs"]["batch_size"] = batch_size

                # Update prompts
                workflow["6"]["inputs"]["text"] = positive_prompt
                workflow["7"]["inputs"]["text"] = negative_prompt

                # Update model and lora
                # workflow["10"]["inputs"]["unet_name"] = model_name
                workflow["15"]["inputs"]["lora_name"] = lora_name

                status["steps"].append({
                    "name": "update_workflow",
                    "success": True
                })
            except Exception as e:
                error_msg = f"Failed to update workflow: {str(e)}"
                print(error_msg)
                status["steps"].append({
                    "name": "update_workflow",
                    "success": False,
                    "error": error_msg
                })
                status["error"] = error_msg
                return status

            try:
                print(f"Executing workflow with seed {random_seed}")
                result = await self.get_flux_lora_result(workflow)  # Using the new dedicated method
                
                status["steps"].append({
                    "name": "execute_workflow",
                    "success": result["success"],
                    "error": result.get("error")
                })

                if not result["success"]:
                    error_msg = f"Workflow execution failed: {result.get('error')}"
                    print(error_msg)
                    status["error"] = error_msg
                    return status

                print("Processing results...")
                if "images" in result:
                    status["success"] = True
                    status["images"] = result["images"]
                    status["steps"].append({
                        "name": "process_results",
                        "success": True
                    })
                else:
                    error_msg = "No images were found in the output"
                    print(error_msg)
                    status["error"] = error_msg
                    return status

            except Exception as e:
                error_msg = f"Failed to execute workflow: {str(e)}"
                print(error_msg)
                status["steps"].append({
                    "name": "execute_workflow",
                    "success": False,
                    "error": error_msg
                })
                status["error"] = error_msg
                return status

        except Exception as e:
            error_msg = f"General error in process_flux_lora: {str(e)}"
            print(error_msg)
            status["error"] = error_msg
            
        return status

    async def get_flux_lora_result(self, prompt) -> Dict[str, Any]:
        """Get the result of a Flux Lora workflow execution using websockets"""
        try:
            queue_result = await self.queue_prompt(prompt)
            if not queue_result["success"]:
                return queue_result
                
            prompt_id = queue_result["data"]["prompt_id"]
            images = []
            
            try:
                ws_url = f"ws://{self.server_address}/ws?clientId={self.client_id}"
                print(f"Connecting to websocket at: {ws_url}")
                
                async with websockets.connect(ws_url, extra_headers={'Authorization': self.headers['Authorization']}) as websocket:
                    while True:
                        try:
                            message = await websocket.recv()
                            if isinstance(message, str):
                                try:
                                    data = json.loads(message)
                                    print(f"Received message type: {data.get('type')}")
                                    
                                    if data['type'] == 'executing':
                                        execution_data = data['data']
                                        print(f"Executing node: {execution_data.get('node')}")
                                        if execution_data['node'] == "9" and execution_data['prompt_id'] == prompt_id:  # Wait for SaveImage node
                                            print("Save image node completed")
                                            break
                                    elif data['type'] == 'executed':
                                        execution_data = data['data']
                                        if 'output' in execution_data:
                                            output = execution_data['output']
                                            if 'images' in output:
                                                # Process each image and convert to base64 with data URL prefix
                                                for img_path in output['images']:
                                                    try:
                                                        full_path = os.path.join(self.output_dir, img_path)
                                                        if os.path.exists(full_path):
                                                            with open(full_path, 'rb') as img_file:
                                                                img_data = img_file.read()
                                                                base64_data = base64.b64encode(img_data).decode('utf-8')
                                                                images.append(f"data:image/png;base64,{base64_data}")
                                                        else:
                                                            print(f"Image file not found: {full_path}")
                                                    except Exception as e:
                                                        print(f"Error processing image {img_path}: {e}")
                                                print(f"Processed {len(output['images'])} images")
                                except json.JSONDecodeError as e:
                                    print(f"Failed to decode JSON message: {e}")
                                    continue
                        except Exception as e:
                            print(f"Error receiving message: {e}")
                            continue

                if images:
                    return {
                        'success': True,
                        'images': images
                    }
                else:
                    return {
                        'success': False,
                        'error': 'No images were generated'
                    }
                    
            except Exception as e:
                return {
                    'success': False,
                    'error': f"WebSocket error: {str(e)}"
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    async def process_flux_gguf_lora_basic(self, width: int, height: int, lora_name: str, 
                    positive_prompt: str, negative_prompt: str, batch_size: int,
                    style: str = "dummy", product: str = "dummy"):
        try:
            # Load the workflow
            print("Loading workflow...")
            workflow_path = os.path.join(os.path.dirname(__file__), "workflow", "Flux_GGUF_Lora_Basic_Ali.json")
            with open(workflow_path, "r", encoding="utf-8") as f:
                workflow = json.loads(f.read())
            
            # Update workflow parameters
            workflow["5"]["inputs"]["width"] = width
            workflow["5"]["inputs"]["height"] = height
            workflow["5"]["inputs"]["batch_size"] = batch_size
            workflow["15"]["inputs"]["lora_name"] = lora_name
            workflow["6"]["inputs"]["text"] = positive_prompt
            workflow["7"]["inputs"]["text"] = negative_prompt
            
            # Randomize seed for filename
            import random
            seed = random.randint(0, 2**32 - 1)
            workflow["3"]["inputs"]["seed"] = seed
            
            # Connect to websocket
            print("Connecting to ComfyUI server...")
            ws = await websockets.connect(
                "ws://{}/ws?clientId={}".format(self.server_address, self.client_id),
                extra_headers={"Authorization": "MjA0YWI0Y2RlZWQ2ZGUyYWZlYjdlNGYyNDFhN2E3Y2MxYmFjNmEwZQ=="}
            )
            
            print("Getting images...")
            images = await self.process_flux_gguf_lora_basic_result(ws, workflow)

            # Process and save the output images
            processed_images = {}
            for node_id in images:
                processed_images[node_id] = []
                for image_data in images[node_id]:
                    try:
                        # Generate unique filename
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"generated_image_{timestamp}_{seed}.png"
                        
                        # Upload to Supabase storage
                        supabase = SupabaseClient()
                        image_url = supabase.upload_image(image_data, filename)
                        
                        # Prepare metadata
                        metadata = {
                            "filename": filename,
                            "prompt": positive_prompt,
                            "negative_prompt": negative_prompt,
                            "style": style,
                            "product": product,
                            "resolution": f"{width}x{height}",
                            "lora_model": lora_name,
                            "generated_at": datetime.now().isoformat(),
                            "image_url": image_url,
                            "seed": seed,
                            "node_id": node_id
                        }
                        
                        # Save metadata to database
                        db_record = supabase.save_generation_metadata(metadata)
                        print(f"Image uploaded and metadata saved: {filename}")
                        print("Database record:", json.dumps(db_record, indent=2))
                        
                        processed_images[node_id].append(metadata)
                        
                    except Exception as e:
                        print(f"Error processing image: {str(e)}")
            
            await ws.close()
            return processed_images
            
        except Exception as e:
            await ws.close()
            print(f"Error in main: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
            
    async def process_flux_gguf_lora_basic_result(self, ws, prompt):
        try:
            # Queue the prompt and get prompt_id
            queue_result = await self.queue_prompt(prompt)
            prompt_id = queue_result['data']['prompt_id']
            output_images = {}
            
            while True:
                try:
                    out = await ws.recv()
                    if isinstance(out, str):
                        message = json.loads(out)
                        print(message)
                        if message['type'] == 'executing':
                            data = message['data']
                            if data['node'] is None and data['prompt_id'] == prompt_id:
                                break  # Execution is done
                    else:
                        continue  # previews are binary data
                except Exception as e:
                    print(f"Error receiving websocket message: {str(e)}")
                    break

            history_result = await self.get_history(prompt_id)
            if not history_result.get('success'):
                print(f"Error getting history: {history_result.get('error')}")
                return None
                
            history = history_result['data'][prompt_id]
            print(history)
            
            for node_id in history['outputs']:
                node_output = history['outputs'][node_id]
                if 'images' in node_output:
                    images_output = []
                    for image in node_output['images']:
                        image_data = await self.get_image(image['filename'], image['subfolder'], image['type'])
                        images_output.append(image_data)
                    output_images[node_id] = images_output
                    
            return output_images
        except Exception as e:
            print(f"Error in process_flux_gguf_lora_basic_result: {str(e)}")
            import traceback
            traceback.print_exc()
            return None