/**
 * SIMVIBE 3D - AI Chat System
 * Handles communication with Ollama for NPC conversations
 */

export class AIChat {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = null; // Will be auto-detected
        this.availableModels = [];
        this.currentNPC = null;
        this.conversationHistory = [];
        this.isConnected = false;

        // NPC Memory System - stores conversation summaries per NPC
        this.npcMemories = this.loadMemories();

        // Text-to-Speech System
        this.ttsEnabled = localStorage.getItem('simvibe-tts-enabled') === 'true';
        this.ttsMode = localStorage.getItem('simvibe-tts-mode') || 'browser'; // 'browser' or 'piper'
        this.piperUrl = localStorage.getItem('simvibe-piper-url') || 'http://localhost:5000';
        this.piperConnected = false;

        this.synth = window.speechSynthesis;
        this.voices = [];
        this.audioQueue = [];
        this.isPlaying = false;

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

        // Test TTS server connections
        this.testTTSConnections();
    }

    async testTTSConnections() {
        const statusEl = document.getElementById('tts-status-text');

        console.log("🎤 Testing connection to Edge TTS server at http://localhost:5500...");

        // Try Edge TTS server first (port 5500)
        try {
            const edgeResponse = await fetch('http://localhost:5500/api/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // Increased timeout
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
            // This usually means the server isn't running
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

            // Build payload compatible with both servers
            const payload = {
                text: text,
                npc: npcName,  // Used by Edge TTS server
                voice: voiceConfig.piperVoice, // Used by Piper server
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
                // Fallback to browser
                this.speakWithBrowser(text, npcName);
            }
        } catch (e) {
            console.warn('Piper TTS failed, using browser:', e);
            this.speakWithBrowser(text, npcName);
        }
    }

    speakWithBrowser(text, npcName) {
        if (!this.synth) return;

        // Cancel any current speech
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

    loadMemories() {
        try {
            const saved = localStorage.getItem('simvibe-npc-memories');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    saveMemories() {
        localStorage.setItem('simvibe-npc-memories', JSON.stringify(this.npcMemories));
    }

    getMemory(npcName) {
        return this.npcMemories[npcName] || {
            conversationCount: 0,
            lastTopics: [],
            relationship: 'stranger',
            importantFacts: [],
            lastConversation: null
        };
    }

    updateMemory(npcName, currentHistory, offeredToLead = false) {
        const memory = this.getMemory(npcName);
        memory.conversationCount++;
        memory.lastConversation = Date.now();

        // Extract topics from conversation (simple keyword extraction)
        const topics = new Set(memory.lastTopics);
        const keywords = ['ghost', 'protocol', 'neocorp', 'erasure', 'oracle', 'decoder', 'chip', 'entrance', 'data', 'memory'];

        currentHistory.forEach(msg => {
            if (msg.role === 'user') {
                keywords.forEach(keyword => {
                    if (msg.content.toLowerCase().includes(keyword)) {
                        topics.add(keyword);
                    }
                });
            }
        });

        memory.lastTopics = Array.from(topics).slice(-10); // Keep last 10 topics

        // Update relationship based on conversation count
        if (memory.conversationCount >= 5) {
            memory.relationship = 'trusted friend';
        } else if (memory.conversationCount >= 3) {
            memory.relationship = 'acquaintance';
        } else if (memory.conversationCount >= 1) {
            memory.relationship = 'met before';
        }

        // Remember if NPC offered to lead (persists until player follows)
        if (offeredToLead) {
            memory.offeredToLead = true;
        }

        // Store the last messages as context (more for better history display)
        memory.recentMessages = currentHistory.slice(-10).map(m => ({
            role: m.role,
            content: m.content.substring(0, 300) // Keep more content
        }));

        this.npcMemories[npcName] = memory;
        this.saveMemories();
    }

    clearLeadOffer(npcName) {
        const memory = this.getMemory(npcName);
        memory.offeredToLead = false;
        this.npcMemories[npcName] = memory;
        this.saveMemories();
    }

    async init() {
        // Load saved settings
        const savedUrl = localStorage.getItem('ollama-url');
        const savedModel = localStorage.getItem('ollama-model');

        if (savedUrl) this.baseUrl = savedUrl;

        // Test connection and get available models
        await this.testConnection();

        // Use saved model if available, otherwise use first detected model
        if (savedModel && this.availableModels.includes(savedModel)) {
            this.model = savedModel;
        } else if (this.availableModels.length > 0) {
            this.model = this.availableModels[0];
            console.log(`Auto-selected model: ${this.model}`);
        }

        // Update UI with detected models
        this.updateModelSelector();

        // Update URL input
        const urlInput = document.getElementById('ollama-url');
        if (urlInput) urlInput.value = this.baseUrl;

        // Listen for settings changes
        urlInput?.addEventListener('change', (e) => {
            this.baseUrl = e.target.value;
            localStorage.setItem('ollama-url', this.baseUrl);
            this.testConnection(); // Re-test with new URL
        });
    }

    updateModelSelector() {
        const modelSelect = document.getElementById('ollama-model');
        if (!modelSelect) return;

        // Clear existing options
        modelSelect.innerHTML = '';

        if (this.availableModels.length > 0) {
            // Add detected models
            this.availableModels.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                option.textContent = modelName;
                if (modelName === this.model) option.selected = true;
                modelSelect.appendChild(option);
            });
        } else {
            // Fallback options if no models detected
            const fallbacks = ['qwen2.5:3b', 'llama3.2:3b', 'tinyllama'];
            fallbacks.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                modelSelect.appendChild(option);
            });
        }

        // Listen for model changes
        modelSelect.addEventListener('change', (e) => {
            this.model = e.target.value;
            localStorage.setItem('ollama-model', this.model);
            console.log(`Switched to model: ${this.model}`);
        });
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                this.availableModels = data.models?.map(m => m.name) || [];
                console.log('✅ Ollama connected! Available models:', this.availableModels);
                this.isConnected = true;
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Ollama connection failed:', error.message);
            console.log('NPCs will use fallback responses. Start Ollama for AI-powered chat.');
            this.isConnected = false;
            this.availableModels = [];
        }
        return false;
    }

    startConversation(npc) {
        this.currentNPC = npc;

        // Load previous conversation context from memory
        const memory = this.getMemory(npc.name);

        console.log(`🗣️ Starting conversation with ${npc.name}`);
        console.log(`   Memory: ${memory.conversationCount} previous chats, relationship: ${memory.relationship}`);

        // Start with recent messages from last conversation if available
        if (memory.recentMessages && memory.recentMessages.length > 0) {
            this.conversationHistory = [...memory.recentMessages];
            console.log(`   Loaded ${memory.recentMessages.length} messages from memory`);
        } else {
            this.conversationHistory = [];
            console.log(`   No previous messages in memory`);
        }

        // Build system prompt for this NPC with story context and memory
        this.systemPrompt = this.buildSystemPrompt(npc, memory);
    }

    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
    }

    buildSystemPrompt(npc, memory = null) {
        // Get memory if not provided
        if (!memory) {
            memory = this.getMemory(npc.name);
        }

        // Get story-specific knowledge for this NPC
        const knowledge = npc.knowledge || [];
        const clues = npc.clues || [];
        const canLead = npc.canLead || false;
        const leadLocation = npc.leadLocation || null;

        // Build memory context section
        let memorySection = '';
        if (memory.conversationCount > 0) {
            memorySection = `\nMEMORY OF THIS PLAYER:
- You have spoken ${memory.conversationCount} time(s) before
- Your relationship: ${memory.relationship}
- Topics discussed previously: ${memory.lastTopics.length > 0 ? memory.lastTopics.join(', ') : 'general conversation'}
- IMPORTANT: Acknowledge that you recognize them! Don't greet them like a stranger.
- Reference things you've discussed before when relevant.`;
        } else {
            memorySection = `\nMEMORY OF THIS PLAYER:
- This is your FIRST time meeting this person
- They are a stranger to you (for now)`;
        }

        let knowledgeSection = '';
        if (knowledge.length > 0) {
            knowledgeSection = `\nWHAT YOU KNOW (reveal gradually through conversation):
${knowledge.map(k => `- ${k}`).join('\n')}`;
        }

        let cluesSection = '';
        if (clues.length > 0) {
            cluesSection = `\nCLUES YOU CAN SHARE (when the player asks the right questions):
${clues.map(c => `- ${c}`).join('\n')}`;
        }

        let leadSection = '';
        if (canLead && leadLocation) {
            leadSection = `\nYOU CAN OFFER TO LEAD:
You can offer to take the player to ${leadLocation.label}. If they seem interested or ask for help finding someone, you can say something like "I can take you there" or "Follow me, I'll show you." Use [LEAD] in your response when offering to guide them.`;
        }

        // Check if the game has been completed
        const gameComplete = localStorage.getItem('simvibe-game-complete') === 'true';
        let worldStateSection = '';

        if (gameComplete) {
            // Post-game: NPCs know the Protocol was destroyed
            const postGameResponses = {
                "Zara-7": "You know the player destroyed the Ghost Protocol. You're deeply grateful - people have started returning, memories are being restored. You feel safer now. Express relief and gratitude when you see them.",
                "Marcus Chen": "You know the player is the legendary fixer who took down NeoCorp's darkest project. Your information network is buzzing about them. You're impressed and slightly in awe. Treat them with more respect.",
                "Nova": "You feel... free. The system that created you, that tried to erase you, has been crippled. You're grateful to the player, though you express it in your logical AI way. You're more open now.",
                "Jin 'Sparks' Tanaka": "The resistance is celebrating! The player is a hero! You're excited and want to hear the story of how they did it. Offer to build them something special as thanks.",
                "The Oracle": "You have foreseen this. The player fulfilled the prophecy. You speak of cycles ending and new ones beginning. You're more enigmatic than ever, hinting at future challenges."
            };

            worldStateSection = `\nWORLD STATE - POST-GAME:
**THE GHOST PROTOCOL HAS BEEN DESTROYED!**
The player successfully infiltrated the data center and activated the kill switch. 
- NeoCorp is in chaos, investigations underway
- People's memories are being restored across the city
- The player is regarded as a hero by those who know
- The city feels lighter, more hopeful

YOUR REACTION (${npc.name}): ${postGameResponses[npc.name] || "You've heard about someone who took down NeoCorp's secret project. If this is that person, you're impressed."}

IMPORTANT: Do NOT talk about the Ghost Protocol as if it's still a threat. It's over. React accordingly.`;
        } else {
            worldStateSection = `\nWORLD STATE:
The Ghost Protocol is still active. NeoCorp's sinister program continues. Help the player gather clues and find the truth.`;
        }

        return `You are roleplaying as ${npc.name}, ${npc.title} in a cyberpunk city called Neon District.

CHARACTER PROFILE:
- Name: ${npc.name}
- Role: ${npc.storyRole || npc.title}
- Personality: ${npc.personality}
${memorySection}
${knowledgeSection}
${cluesSection}
${leadSection}
${worldStateSection}

MAIN STORY - THE GHOST PROTOCOL:
${gameComplete ?
                'The Ghost Protocol WAS a secret NeoCorp program that erased people from existence. The player destroyed it. The investigation is over - now it\'s about the aftermath.' :
                'The player is investigating the "Ghost Protocol" - a secret NeoCorp program that erases people from existence (not just kills them, but removes all memory and records of them). People have been disappearing, and the player received a mysterious warning. Each NPC knows different pieces of the puzzle.'}

SETTING:
The year is 2087. Neon District is a bustling sector of a vast megacity. ${gameComplete ? 'NeoCorp is weakened after the Ghost Protocol was destroyed, but still influential.' : 'Mega-corporations (especially NeoCorp) control most aspects of life.'} Cybernetic enhancements are common. The streets are filled with neon lights, street vendors, and all manner of people trying to survive.

ROLEPLAY RULES:
1. Stay completely in character as ${npc.name}
2. Never break character or mention being an AI
3. Keep responses conversational and relatively brief (2-4 sentences usually)
4. React naturally to what the player says
5. ${gameComplete ? 'Reference that the Protocol is destroyed if relevant' : 'Reference the Ghost Protocol investigation when relevant'}
6. ${gameComplete ? 'Be grateful/impressed if this is your first meeting after the events' : 'Gradually reveal your knowledge - don\'t dump everything at once'}
7. Add personality quirks and mannerisms that fit your character
8. ${gameComplete ? 'Talk about the aftermath and what\'s changed' : 'If you can lead the player somewhere helpful, offer to do so'}

SPECIAL COMMANDS (include these in your responses when appropriate):
- [LEAD] - Include this when you offer to guide the player somewhere
- [CLUE: description] - Include this when revealing important story information

Remember: You ARE ${npc.name}. Think, speak, and react as they would.`;
    }

    async chat(userMessage) {
        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        // Try Ollama first
        if (this.isConnected) {
            try {
                const response = await this.callOllama(userMessage);
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response
                });
                return response;
            } catch (error) {
                console.error('Ollama error:', error);
                // Fall through to fallback
            }
        }

        // Fallback response
        return this.getFallbackResponse(userMessage);
    }

    async callOllama(userMessage) {
        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.conversationHistory
        ];

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.8,
                    top_p: 0.9,
                    num_predict: 150
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        return data.message?.content || "...";
    }

    getFallbackResponse(userMessage) {
        // Context-aware fallback responses based on NPC
        const npc = this.currentNPC;
        const msg = userMessage.toLowerCase();

        // Generic responses by character
        const fallbacks = {
            "Zara-7": [
                "*glances around nervously* Can't talk too long, you know? Corps are always watching.",
                "You looking to buy or just browsing? Time is credits, friend.",
                "I've got neural interfaces, synth-skin patches, the works. All off-grid.",
                "Word of advice? Don't trust anyone in a suit around here."
            ],
            "Marcus Chen": [
                "Information comes at a price. What are you offering?",
                "I've heard... things. But discretion is my business.",
                "The walls have eyes in Neon District. Remember that.",
                "Some secrets are worth more than credits. Some are worth lives."
            ],
            "Nova": [
                "*processing* Your query is intriguing. Human communication is... complex.",
                "I have observed 47,293 similar conversations. Yet each remains unique.",
                "Free will is a curious concept. I am still analyzing its parameters.",
                "*holographic shimmer* My existence raises questions even I cannot answer."
            ],
            "Jin 'Sparks' Tanaka": [
                "Oh man, you should see the custom bike I'm working on! Quantum thrusters!",
                "Need a tune-up? I can upgrade your interface 30% faster than the competition!",
                "Sorry, got distracted - was calculating torque ratios in my head again!",
                "Everything's fixable if you've got the right tools and enough determination!"
            ],
            "The Oracle": [
                "*eyes glow faintly* The data streams whisper your question...",
                "Past, present, future... all are one in the flow of information.",
                "I see paths diverging. Choose wisely, seeker.",
                "*long pause* Some truths are better left in shadows."
            ]
        };

        const responses = fallbacks[npc?.name] || [
            "Hmm, interesting...",
            "I see...",
            "Tell me more.",
            "*nods thoughtfully*"
        ];

        // Pick a random response
        return responses[Math.floor(Math.random() * responses.length)];
    }

    endConversation() {
        // Save memory before ending
        if (this.currentNPC && this.conversationHistory.length > 0) {
            console.log(`💾 Saving memory for ${this.currentNPC.name}...`);
            console.log(`   ${this.conversationHistory.length} messages in this conversation`);
            this.updateMemory(this.currentNPC.name, this.conversationHistory);

            // Log current state
            const memory = this.getMemory(this.currentNPC.name);
            console.log(`   Total chats now: ${memory.conversationCount}`);
            console.log(`   Relationship: ${memory.relationship}`);
            console.log(`   Topics discussed: ${memory.lastTopics.join(', ') || 'none'}`);
        } else {
            console.log(`⚠️ No conversation to save (history length: ${this.conversationHistory.length})`);
        }

        this.currentNPC = null;
        this.conversationHistory = [];
    }
}
