/**
 * SIMVIBE 3D - AI Chat System
 * Facade for the modular AI system
 */

import { MemoryManager } from './ai/MemoryManager.js';
import { TTSService } from './ai/TTSService.js';
import { OllamaService } from './ai/OllamaService.js';
import { ConversationManager } from './ai/ConversationManager.js';

export class AIChat {
    constructor() {
        // Initialize subsystems
        this.memory = new MemoryManager();
        this.tts = new TTSService();
        this.ollama = new OllamaService();
        this.conversation = new ConversationManager(this.ollama, this.memory);
    }

    // --- Initialization ---

    async init() {
        await this.ollama.init();
    }

    async testConnection() {
        // Main.js calls this directly mostly for debugging or status checks
        // We'll run both checks
        await this.ollama.testConnection();
        // TTS connection is tested in constructor of TTSService, but we can re-verify if needed
        // For API compatibility we return Ollama status usually
        return this.ollama.isConnected;
    }

    async testTTSConnections() {
        return this.tts.testTTSConnections();
    }

    // --- Conversation Properties & Methods ---

    startConversation(npc) {
        this.conversation.startConversation(npc);
    }

    async chat(userMessage) {
        return this.conversation.chat(userMessage);
    }

    endConversation() {
        this.conversation.endConversation();
    }

    addToHistory(role, content) {
        this.conversation.addToHistory(role, content);
    }

    // --- Memory Access ---

    // Properties accessed directly by main.js
    get npcMemories() {
        return this.memory.npcMemories;
    }

    getMemory(npcName) {
        return this.memory.getMemory(npcName);
    }

    updateMemory(npcName, currentHistory, offeredToLead = false) {
        this.memory.updateMemory(npcName, currentHistory, offeredToLead);
    }

    clearLeadOffer(npcName) {
        this.memory.clearLeadOffer(npcName);
    }

    // --- TTS Access ---

    get ttsEnabled() {
        return this.tts.ttsEnabled;
    }

    setTTSEnabled(enabled) {
        this.tts.setTTSEnabled(enabled);
    }

    async speak(text, npcName) {
        return this.tts.speak(text, npcName);
    }

    stopSpeaking() {
        this.tts.stopSpeaking();
    }

    // --- Other Properties for Compatibility ---

    get currentNPC() {
        return this.conversation.currentNPC;
    }

    set currentNPC(value) {
        this.conversation.currentNPC = value;
    }

    get isConnected() {
        return this.ollama.isConnected;
    }
}
