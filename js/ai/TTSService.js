/**
 * SIMVIBE 3D - TTS Service
 * Handles Text-to-Speech via Edge TTS Server, Piper, or Browser fallback
 */

export class TTSService {
    constructor() {
        this.ttsEnabled = localStorage.getItem('simvibe-tts-enabled') === 'true';
        this.ttsMode = localStorage.getItem('simvibe-tts-mode') || 'browser'; // 'browser' or 'piper'
        this.piperUrl = localStorage.getItem('simvibe-piper-url') || 'http://localhost:5000';
        this.ttsServerUrl = '';
        this.ttsServerConnected = false;
        this.piperConnected = false;

        this.synth = window.speechSynthesis;
        this.voices = [];
        this.audioQueue = [];
        this.isPlaying = false;
        this.currentAudio = null;

        // NPC voice configurations
        this.npcVoices = {
            // For Piper - use voice model names
            "Zara-7": { piperVoice: 'en_US-lessac-medium', pitch: 1.2, rate: 1.1 },
            "Marcus Chen": { piperVoice: 'en_US-ryan-medium', pitch: 0.9, rate: 0.95 },
            "Nova": { piperVoice: 'en_US-amy-medium', pitch: 1.0, rate: 1.2 },
            "Jin 'Sparks' Tanaka": { piperVoice: 'en_US-ryan-medium', pitch: 1.0, rate: 1.3 },
            "The Oracle": { piperVoice: 'en_US-lessac-medium', pitch: 0.7, rate: 0.8 },
            "Elise": { piperVoice: 'en_US-amy-medium', pitch: 1.1, rate: 1.0 }
        };

        // Load available voices
        this.loadVoices();

        // Test connections immediately
        this.testTTSConnections();
    }

    loadVoices() {
        // Voices load asynchronously in some browsers
        this.voices = this.synth.getVoices();
        if (this.voices.length === 0) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
                console.log(`🔊 Loaded ${this.voices.length} browser TTS voices`);
            };
        }
    }

    async testTTSConnections() {
        const statusEl = document.getElementById('tts-status-text');

        console.log("🎤 Testing connection to Edge TTS server at http://localhost:5500...");

        // Try Edge TTS server first (port 5500)
        try {
            const edgeResponse = await fetch('http://localhost:5500/api/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (edgeResponse.ok) {
                this.ttsServerUrl = 'http://localhost:5500';
                this.ttsServerConnected = true;
                this.ttsMode = 'edge';
                console.log('✅ Edge TTS connected - natural Microsoft voices available!');

                if (statusEl) {
                    statusEl.textContent = "Connected: Edge (Natural)";
                    statusEl.className = "status-online";
                }
                return;
            } else {
                console.warn('⚠️ Edge TTS reachable but returned error:', edgeResponse.status);
            }
        } catch (e) {
            console.warn('❌ Edge TTS connection failed:', e.message);
        }

        // Try Piper TTS (port 5000)
        try {
            const piperResponse = await fetch(`${this.piperUrl}/api/voices`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            if (piperResponse.ok) {
                this.ttsServerUrl = this.piperUrl;
                this.ttsServerConnected = true;
                this.ttsMode = 'piper';
                console.log('🎤 Piper TTS connected - natural voices available!');

                if (statusEl) {
                    statusEl.textContent = "Connected: Piper (Natural)";
                    statusEl.className = "status-online";
                }
                return;
            }
        } catch (e) {
            // Piper not available
        }

        // Fall back to browser TTS
        this.ttsServerConnected = false;
        this.ttsMode = 'browser';
        console.log('🔊 Using browser TTS (run tts_server.py for natural voices)');

        if (statusEl) {
            statusEl.textContent = "Browser (Robotic)";
            statusEl.className = "status-offline";
        }
    }

    setTTSEnabled(enabled) {
        this.ttsEnabled = enabled;
        localStorage.setItem('simvibe-tts-enabled', enabled ? 'true' : 'false');
        console.log(`🔊 TTS ${enabled ? 'enabled' : 'disabled'} (mode: ${this.ttsMode})`);
    }

    async speak(text, npcName) {
        if (!this.ttsEnabled) return;

        // Clean text (remove special tags)
        const cleanText = text
            .replace(/\[LEAD\]/gi, '')
            .replace(/\[CLUE:\s*[^\]]+\]/gi, '')
            .replace(/\*[^*]+\*/g, '') // Remove *actions*
            .trim();

        if (!cleanText) return;

        // Try server TTS first if connected
        if (this.ttsServerConnected) {
            await this.speakWithServer(cleanText, npcName);
        } else {
            this.speakWithBrowser(cleanText, npcName);
        }
    }

    async speakWithServer(text, npcName) {
        try {
            const voiceConfig = this.npcVoices[npcName] || { piperVoice: 'en_US-lessac-medium' };

            const payload = {
                text: text,
                npc: npcName,
                voice: voiceConfig.piperVoice,
                speed: voiceConfig.rate || 1.0
            };

            const response = await fetch(`${this.ttsServerUrl}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                };

                audio.play();
                this.currentAudio = audio;
            } else {
                this.speakWithBrowser(text, npcName);
            }
        } catch (e) {
            console.warn('TTS Server failed, using browser:', e);
            this.speakWithBrowser(text, npcName);
        }
    }

    speakWithBrowser(text, npcName) {
        if (!this.synth) return;

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voiceConfig = this.npcVoices[npcName] || { pitch: 1.0, rate: 1.0 };

        // Try to find a matching voice
        const preferredVoice = this.voices.find(v => {
            const name = v.name.toLowerCase();
            return name.includes('zira') || name.includes('samantha') ||
                name.includes('google') || name.includes('natural');
        }) || this.voices[0];

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.pitch = voiceConfig.pitch || 1.0;
        utterance.rate = voiceConfig.rate || 1.0;
        utterance.volume = 0.8;

        this.synth.speak(utterance);
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }
}
