import uuid
import json
import os
import aiohttp
import websockets
import base64
import time
import random
from typing import BinaryIO, Dict, Any, List, Union

class AsyncImageProcessor:
    def __init__(self, server_address="127.0.0.1:8188", output_dir=None):
        self.server_address = server_address
        self.client_id = str(uuid.uuid4())
        self.session = None
        self.output_dir = output_dir or os.path.join("D:", "ComfyUI", "ComfyUI", "output")
        
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
                json=data
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
                f"http://{self.server_address}/history/{prompt_id}"
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

            async with self.session.post(
                f"http://{self.server_address}/upload/image",
                data=data,
                params=params
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
            output_images: List[str] = []  # Will store base64 encoded images
            
            try:
                ws_url = f"ws://{self.server_address}/ws?clientId={self.client_id}"
                print(f"Connecting to websocket at: {ws_url}")
                
                async with websockets.connect(ws_url) as websocket:
                    while True:
                        try:
                            message = await websocket.recv()
                            if isinstance(message, str):
                                try:
                                    data = json.loads(message)
                                    print(f"Received message type: {data.get('type')}")
                                    
                                    if data['type'] == 'executing':
                                        execution_data = data['data']
                                        if execution_data['node'] is None and execution_data['prompt_id'] == prompt_id:
                                            print("Execution completed")
                                            break
                                    elif data['type'] == 'executed':
                                        execution_data = data['data']
                                        if 'output' in execution_data and 'images' in execution_data['output']:
                                            print(f"Processing {len(execution_data['output']['images'])} images")
                                            for img_data in execution_data['output']['images']:
                                                try:
                                                    # Handle potential image data formats
                                                    if isinstance(img_data, bytes):
                                                        img_base64 = base64.b64encode(img_data).decode('utf-8')
                                                    elif isinstance(img_data, str):
                                                        # If it's already base64, validate it
                                                        try:
                                                            base64.b64decode(img_data)  # Test if valid base64
                                                            img_base64 = img_data
                                                        except:
                                                            # If not valid base64, try to encode it
                                                            img_base64 = base64.b64encode(img_data.encode()).decode('utf-8')
                                                    elif isinstance(img_data, dict):
                                                        # Handle dictionary format from ComfyUI
                                                        if 'filename' in img_data:
                                                            # Construct the ComfyUI view URL
                                                            filename = img_data['filename']
                                                            subfolder = img_data.get('subfolder', '')
                                                            timestamp = int(time.time() * 1000)
                                                            img_url = f"http://{self.server_address}/view?filename={filename}&type=output&subfolder={subfolder}&t={timestamp}"
                                                            print(f"Fetching image: {filename}")
                                                            
                                                            try:
                                                                async with aiohttp.ClientSession() as session:
                                                                    async with session.get(img_url) as response:
                                                                        if response.status == 200:
                                                                            img_bytes = await response.read()
                                                                            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                                                                            print(f"Successfully fetched image")
                                                                            if img_base64 not in output_images:
                                                                                output_images.append(img_base64)
                                                                            else:
                                                                                print(f"Image already exists in output_images")
                                                                        else:
                                                                            print(f"Failed to fetch image: HTTP {response.status}")
                                                                            continue
                                                            except Exception as e:
                                                                print(f"Error fetching image: {e}")
                                                                continue
                                                    else:
                                                        print(f"Unexpected image data type")
                                                        continue

                                                    if img_base64 not in output_images:
                                                        output_images.append(img_base64)
                                                except Exception as e:
                                                    print(f"Error processing image data: {e}")
                                                    continue
                                except json.JSONDecodeError as e:
                                    print(f"Failed to parse message: {e}")
                                    continue
                            else:
                                print("Received binary message")
                                try:
                                    img_base64 = base64.b64encode(message).decode('utf-8')
                                    if img_base64 not in output_images:
                                        output_images.append(img_base64)
                                except Exception as e:
                                    print(f"Error processing binary image: {e}")

                        except Exception as e:
                            print(f"Error processing message: {e}")
                            continue

                    try:
                        print(f"Total images collected: {len(output_images)}")
                        if not output_images:
                            return {
                                "success": False,
                                "error": "No valid images were generated"
                            }
                            
                        return {
                            "success": True,
                            "images": output_images
                        }
                    except Exception as e:
                        error_msg = f"Websocket communication error: {str(e)}"
                        print(error_msg)
                        return {
                            "success": False,
                            "error": error_msg
                        }

            except Exception as e:
                error_msg = f"General error in get_prompt_result: {str(e)}"
                print(error_msg)
                return {
                    "success": False,
                    "error": error_msg
                }

        except Exception as e:
            error_msg = f"General error in get_prompt_result: {str(e)}"
            print(error_msg)
            return {
                "success": False,
                "error": error_msg
            }

    async def process_image(self, image_data: BinaryIO) -> Dict[str, Any]:
        """Process an image and return the generated prompt with status information"""
        status = {
            "steps": [],
            "success": False,
            "final_prompt": None,
            "error": None
        }
        
        try:
            # Upload the image
            upload_result = await self.upload_file(image_data, "", True)
            status["steps"].append({
                "name": "upload_image",
                "success": upload_result["success"],
                "error": upload_result.get("error")
            })
            
            if not upload_result["success"]:
                status["error"] = f"Image upload failed: {upload_result['error']}"
                return status
                
            uploaded_path = upload_result["data"]
            
            # Load the workflow
            try:
                workflow_path = os.path.join("workflow", "MiniCPMV Prompt Creator.json")
                with open(workflow_path, "r", encoding="utf-8") as f:
                    workflow = json.loads(f.read())
                status["steps"].append({
                    "name": "load_workflow",
                    "success": True
                })
            except Exception as e:
                status["steps"].append({
                    "name": "load_workflow",
                    "success": False,
                    "error": str(e)
                })
                status["error"] = f"Failed to load workflow: {str(e)}"
                return status

            # Update the workflow with our image
            workflow["3"]["inputs"]["image"] = uploaded_path
            workflow["1"]["inputs"].update({
                "caption_method": "long_prompt",
                "max_new_tokens": 2048,
                "num_beams": 3,
                "prefix_caption": "",
                "suffix_caption": "",
                "replace_tags": ""
            })

            # Get the results
            result = await self.get_prompt_result(workflow)
            status["steps"].append({
                "name": "generate_prompt",
                "success": result["success"],
                "error": result.get("error")
            })
            
            if not result["success"]:
                status["error"] = f"Prompt generation failed: {result['error']}"
                return status

            # Extract the generated prompt
            if "outputs" in result["data"]:
                for node_id in result["data"]["outputs"]:
                    if node_id == "4":  # ShowText node
                        text_output = result["data"]["outputs"][node_id].get("text", "")
                        if text_output:
                            status["success"] = True
                            status["final_prompt"] = text_output
                            return status

            status["error"] = "No prompt was generated in the output"
            return status

        except Exception as e:
            status["error"] = f"Image processing failed: {str(e)}"
            return status

    async def process_flux_lora(self, width: int, height: int, lora_name: str, 
                              model_name: str, positive_prompt: str, 
                              negative_prompt: str, batch_size: int) -> Dict[str, Any]:
        """Process a Flux GGUF Lora request and return the generated images"""
        print(f"Starting process_flux_lora with parameters:")
        print(f"- width: {width}")
        print(f"- height: {height}")
        print(f"- lora_name: {lora_name}")
        print(f"- model_name: {model_name}")
        print(f"- batch_size: {batch_size}")
        
        status = {
            "steps": [],
            "success": False,
            "images": [],
            "error": None
        }
        
        try:
            # Load the workflow template
            workflow_path = os.path.join(os.path.dirname(__file__), "workflow", "Flux_GGUF_Lora_Basic.json")
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
                workflow["10"]["inputs"]["unet_name"] = model_name
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
                result = await self.get_prompt_result(workflow)
                ##print(f"Workflow execution result: {result}")
                
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
                    #print(f"Successfully processed {len(result['images'])} images")
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
