"""
SimVibe 3D - Edge TTS Server
Provides natural-sounding text-to-speech using Microsoft Edge's neural voices.

Install: pip install edge-tts flask flask-cors
Run: python tts_server.py
"""

import asyncio
import edge_tts
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import io

app = Flask(__name__)
CORS(app)  # Allow requests from the game

# Voice mapping for NPCs - using Edge TTS voice names
NPC_VOICES = {
    "Zara-7": "en-US-JennyNeural",        # Young, casual female
    "Marcus Chen": "en-US-GuyNeural",      # Deep, professional male
    "Nova": "en-US-AriaNeural",            # Clear, slightly robotic female (fits AI)
    "Jin 'Sparks' Tanaka": "en-US-ChristopherNeural",  # Energetic male
    "The Oracle": "en-US-SaraNeural",      # Mysterious, calm female
    "Elise": "en-US-JennyNeural"           # Warm, grateful female
}

# Default voice if NPC not found
DEFAULT_VOICE = "en-US-JennyNeural"


@app.route('/api/voices', methods=['GET'])
def list_voices():
    """List available voices"""
    return jsonify({
        "voices": list(NPC_VOICES.values()),
        "npc_mapping": NPC_VOICES
    })


@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio"""
    data = request.json
    text = data.get('text', '')
    npc_name = data.get('npc', '')
    speed = float(data.get('speed', 1.0))
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    # Get voice for this NPC
    voice = NPC_VOICES.get(npc_name, DEFAULT_VOICE)
    
    # Calculate relative rate string (e.g., "+10%")
    rate_str = "+0%"
    if speed != 1.0:
        rate_pct = int((speed - 1.0) * 100)
        rate_str = f"{rate_pct:+d}%"
    
    # Generate speech
    audio_data = asyncio.run(generate_speech(text, voice, rate_str))
    
    if audio_data:
        return Response(audio_data, mimetype='audio/mpeg')
    else:
        return jsonify({"error": "TTS generation failed"}), 500


async def generate_speech(text: str, voice: str, rate: str) -> bytes:
    """Generate speech using edge-tts with rate control"""
    try:
        # Use communicate with rate parameter (requires newer edge-tts)
        # Or construct SSML manually for better compatibility
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        audio_stream = io.BytesIO()
        
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        return audio_stream.getvalue()
    except Exception as e:
        print(f"TTS Error: {e}")
        return None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "edge-tts"})


if __name__ == '__main__':
    print("🎤 SimVibe 3D - Edge TTS Server")
    print("=" * 40)
    print("Natural voices powered by Microsoft Edge")
    print("")
    print("Available NPC voices:")
    for npc, voice in NPC_VOICES.items():
        print(f"  • {npc}: {voice}")
    print("")
    print("Starting server on http://localhost:5500")
    print("=" * 40)
    
    app.run(host='0.0.0.0', port=5500, debug=False)
