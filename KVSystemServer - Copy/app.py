from flask import Flask, render_template, request, jsonify
from async_image_processor import AsyncImageProcessor
from async_llm_processor import AsyncLLMProcessor
import os
import asyncio
import logging
from datetime import datetime

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure logging
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)

# Configure the output directory path
COMFYUI_OUTPUT_DIR = os.path.join("D:", "ComfyUI", "ComfyUI", "output")  # Adjust this path to match your ComfyUI installation

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/flux_lora_test')
def flux_lora_test():
    return render_template('flux_lora_test.html')

@app.route('/generate_prompt', methods=['POST'])
def generate_prompt():
    try:
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided',
                'steps': []
            }), 400
            
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file',
                'steps': []
            }), 400

        async def process():
            async with AsyncImageProcessor(output_dir=COMFYUI_OUTPUT_DIR) as processor:
                return await processor.process_image_prompt(image_file.stream)

        result = run_async(process())
            
        response = {
            'success': result['success'],
            'steps': result['steps'],
            'error': result['error']
        }
            
        if result['success']:
            response['prompt'] = result['final_prompt']
                
        return jsonify(response), 200 if result['success'] else 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'steps': []
        }), 500

@app.route('/generate_flux_lora', methods=['POST'])
def generate_flux_lora():
    try:
        print("\nReceived generate_flux_lora request")
        data = request.get_json()
        print(f"Request data: {data}")
        
        required_fields = ['width', 'height', 'lora_name', 'positive_prompt', 'negative_prompt', 'batch_size']
        
        # Validate required fields
        for field in required_fields:
            if field not in data:
                error_msg = f'Missing required field: {field}'
                print(f"Error: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': error_msg,
                    'steps': []
                }), 400

        print("All required fields present, processing request...")
        async def process():
            async with AsyncImageProcessor(output_dir=COMFYUI_OUTPUT_DIR) as processor:
                return await processor.process_flux_gguf_lora_basic(
                    width=data['width'],
                    height=data['height'],
                    lora_name=data['lora_name'],
                    positive_prompt=data['positive_prompt'],
                    negative_prompt=data['negative_prompt'],
                    batch_size=data['batch_size']
                )

        print("Running async process...")
        result = run_async(process())
        
        if result is not None:
            # Convert the raw image data into the expected format
            processed_result = {}
            for node_id, images in result.items():
                processed_result[node_id] = []
                for image_data in images:
                    # Create metadata for each image
                    image_info = {
                        'image_url': f"data:image/png;base64,{image_data}",
                        'generated_at': datetime.now().isoformat(),
                        'resolution': f"{data['width']}x{data['height']}",
                        'seed': 'N/A'  # Add if available
                    }
                    processed_result[node_id].append(image_info)
            return jsonify(processed_result), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to generate images',
                'steps': []
            }), 500
        
    except Exception as e:
        error_msg = f"Server error in generate_flux_lora: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg,
            'steps': []
        }), 500

@app.route('/run_llm', methods=['POST'])
def run_llm():
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'No prompt provided'
            }), 400

        prompt = data['prompt']

        async def process():
            processor = AsyncLLMProcessor()
            return await processor.process(prompt)

        response = run_async(process())
        
        return jsonify({
            'success': True,
            'response': response
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
