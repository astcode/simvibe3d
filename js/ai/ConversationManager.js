/**
 * SIMVIBE 3D - Conversation Manager
 * Orchestrates dialogue flow, context building, and prompt generation
 */

export class ConversationManager {
    constructor(ollamaService, memoryManager) {
        this.ollama = ollamaService;
        this.memory = memoryManager;

        this.currentNPC = null;
        this.conversationHistory = [];
        this.systemPrompt = '';
    }

    startConversation(npc) {
        this.currentNPC = npc;

        // Load previous conversation context from memory
        const npcMemory = this.memory.getMemory(npc.name);

        console.log(`🗣️ Starting conversation with ${npc.name}`);
        console.log(`   Memory: ${npcMemory.conversationCount} previous chats, relationship: ${npcMemory.relationship}`);

        // Start with recent messages from last conversation if available
        if (npcMemory.recentMessages && npcMemory.recentMessages.length > 0) {
            this.conversationHistory = [...npcMemory.recentMessages];
            console.log(`   Loaded ${npcMemory.recentMessages.length} messages from memory`);
        } else {
            this.conversationHistory = [];
            console.log(`   No previous messages in memory`);
        }

        // Build system prompt for this NPC with story context and memory
        this.systemPrompt = this.buildSystemPrompt(npc, npcMemory);
    }

    async chat(userMessage) {
        // Add user message to history
        this.addToHistory('user', userMessage);

        // Try Ollama first
        if (this.ollama.isConnected) {
            try {
                // Prepare messages for API
                const messages = [
                    { role: 'system', content: this.systemPrompt },
                    ...this.conversationHistory
                ];

                const responseText = await this.ollama.generateResponse(messages);

                this.addToHistory('assistant', responseText);
                return responseText;
            } catch (error) {
                console.error('Ollama error:', error);
                // Fall through to fallback
            }
        }

        // Fallback response
        const fallback = this.getFallbackResponse(userMessage);
        // Note: We don't necessarily add fallback to history if it's just a generic "hmm", 
        // but original code didn't specify. Assumed yes.
        // Actually original code falling back didn't push to history explicitly in the catch block 
        // effectively, wait.
        // Original code:
        // catch { fall through }
        // return this.getFallbackResponse()
        // It RETURNS it, but doesn't push to history?
        // Let's check original.
        // Line 551: return this.getFallbackResponse(userMessage);
        // It does NOT push to history. Correct.
        // But for consistency I might want to? 
        // I will stick to original logic: Fallback is ephemeral if connection is broken.
        return fallback;
    }

    endConversation() {
        if (this.currentNPC && this.conversationHistory.length > 0) {
            console.log(`💾 Saving memory for ${this.currentNPC.name}...`);
            this.memory.updateMemory(this.currentNPC.name, this.conversationHistory);

            // Log current state
            const npcMemory = this.memory.getMemory(this.currentNPC.name);
            console.log(`   Total chats now: ${npcMemory.conversationCount}`);
        } else {
            console.log(`⚠️ No conversation to save`);
        }

        this.currentNPC = null;
        this.conversationHistory = [];
    }

    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
    }

    buildSystemPrompt(npc, memory = null) {
        // Get memory if not provided
        if (!memory) {
            memory = this.memory.getMemory(npc.name);
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

    getFallbackResponse(userMessage) {
        const npc = this.currentNPC;

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

        return responses[Math.floor(Math.random() * responses.length)];
    }
}
