from quart import Quart, render_template, request, jsonify
from async_image_processor import AsyncImageProcessor
from async_llm_processor import AsyncLLMProcessor
import os
import logging
from datetime import datetime

app = Quart(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configure logging to suppress noisy modules
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)

# Configure the output directory path
COMFYUI_OUTPUT_DIR = os.path.join("D:", "ComfyUI", "ComfyUI", "output")  # Adjust this path to match your ComfyUI installation

@app.route('/')
async def home():
    return await render_template('index.html')

@app.route('/promptgenerator')
async def promptgenerator():
    return await render_template('promptgenerator.html')

@app.route('/flux_lora_test')
async def flux_lora_test():
    return await render_template('flux_lora_test.html')

@app.route('/llm_test')
async def llm_test():
    return await render_template('llm_test.html')

@app.route('/generate_prompt', methods=['POST'])
async def generate_prompt():
    try:
        files = await request.files
        if 'image' not in files:
            return jsonify({
                'success': False,
                'error': 'No image file provided',
                'steps': []
            }), 400
            
        image_file = files['image']
        if image_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file',
                'steps': []
            }), 400

        async with AsyncImageProcessor(output_dir=COMFYUI_OUTPUT_DIR) as processor:
            result = await processor.process_image_prompt(image_file.stream)
            
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
async def generate_flux_lora():
    try:
        print("\nReceived generate_flux_lora request")
        data = await request.get_json()
        print(f"Request data: {data}")
        
        required_fields = ['width', 'height', 'lora_name', 'positive_prompt', 'negative_prompt', 'batch_size', 'product','style']
        
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
        async with AsyncImageProcessor(output_dir=COMFYUI_OUTPUT_DIR) as processor:
            result = await processor.process_flux_gguf_lora_basic(
                width=data['width'],
                height=data['height'],
                lora_name=data['lora_name'],
                positive_prompt=data['positive_prompt'],
                negative_prompt=data['negative_prompt'],
                batch_size=data['batch_size'],
                product=data['product'],
                style=data['style']
            )
        
        if result is not None:
            return jsonify(result), 200
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
async def run_llm():
    try:
        data = await request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({
                'success': False,
                'error': 'No prompt provided'
            }), 400

        prompt = data['prompt']
        processor = AsyncLLMProcessor()
        response = await processor.process(prompt)
        
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
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
