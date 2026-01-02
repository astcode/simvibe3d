/**
 * SIMVIBE 3D - Memory Manager
 * Handles persistent storage of NPC interactions and state
 */

export class MemoryManager {
    constructor() {
        this.npcMemories = this.loadMemories();
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
}
