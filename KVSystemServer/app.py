from flask import Flask, render_template, request, jsonify
from async_image_processor import AsyncImageProcessor
import os
import asyncio

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

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
                return await processor.process_image(image_file.stream)

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
        
        required_fields = ['width', 'height', 'lora_name', 'model_name', 'positive_prompt', 'negative_prompt', 'batch_size']
        
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
                return await processor.process_flux_lora(
                    width=data['width'],
                    height=data['height'],
                    lora_name=data['lora_name'],
                    model_name=data['model_name'],
                    positive_prompt=data['positive_prompt'],
                    negative_prompt=data['negative_prompt'],
                    batch_size=data['batch_size']
                )

        print("Running async process...")
        result = run_async(process())
        #print(f"Process result: {result}")
            
        if result['success']:
            print(f"Success! Generated {len(result['images'])} images")
            return jsonify({
                'success': True,
                'images': result['images']
            }), 200
        else:
            error_msg = result.get('error', 'Unknown error occurred')
            print(f"Error: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg,
                'steps': result.get('steps', [])
            }), 500
        
    except Exception as e:
        error_msg = f"Server error in generate_flux_lora: {str(e)}"
        print(f"Error: {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg,
            'steps': []
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
