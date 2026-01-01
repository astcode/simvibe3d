/**
 * SIMVIBE 3D - Story & Quest System
 * Main narrative and quest tracking
 */

export const STORY = {
    title: "The Ghost Protocol",

    // Player's current state
    playerName: "Fixer",
    chapter: 1,

    // Opening narrative
    intro: `You are a fixer - someone who takes jobs others won't touch. 
Tonight, a encrypted message appeared on your neural feed:
"They're erasing people. Find the Ghost Protocol before it finds you. - ???"

The message self-destructed, but not before burning coordinates into your memory.
Neon District. Sector 7. Start talking to people. Trust no one.`,

    // Main quest line
    mainQuest: {
        id: "ghost_protocol",
        title: "The Ghost Protocol",
        description: "Uncover the truth about the mysterious program erasing citizens from existence.",
        stages: [
            {
                id: "investigate",
                title: "Gather Information",
                description: "Talk to the locals. Someone knows something.",
                objectives: [
                    { id: "talk_zara", npc: "Zara-7", description: "Ask Zara-7 about the disappeared", completed: false },
                    { id: "talk_marcus", npc: "Marcus Chen", description: "See what Marcus Chen knows", completed: false }
                ],
                completed: false
            },
            {
                id: "find_data",
                title: "The Data Fragment",
                description: "Marcus mentioned a data fragment. Nova might know how to decrypt it.",
                objectives: [
                    { id: "talk_nova", npc: "Nova", description: "Ask Nova about corporate data systems", completed: false },
                    { id: "get_decoder", npc: "Jin 'Sparks' Tanaka", description: "Get a decoder from Sparks", completed: false }
                ],
                completed: false
            },
            {
                id: "truth",
                title: "The Truth",
                description: "The Oracle sees all. Perhaps they know the truth.",
                objectives: [
                    { id: "talk_oracle", npc: "The Oracle", description: "Seek The Oracle's wisdom", completed: false }
                ],
                completed: false
            }
        ],
        currentStage: 0
    }
};

// NPC knowledge and story roles
export const NPC_STORY_DATA = {
    "Zara-7": {
        role: "Witness",
        knowledge: [
            "Has seen people 'vanish' - one moment there, next moment gone",
            "Knows a woman named Elise who disappeared last week",
            "Heard rumors about 'the list' - names of people marked for erasure",
            "Trusts no one from the corps"
        ],
        clues: [
            "Elise was asking questions about NeoCorp's new initiative",
            "People who disappear are always seen near the corporate tower first",
            "There's a data broker who might know more - Marcus Chen"
        ],
        canLead: true,
        leadLocation: { x: -15, z: 12, label: "Marcus Chen's location" },
        questTriggers: {
            "talk_zara": {
                keywords: ["disappear", "vanish", "ghost", "protocol", "missing", "erased", "people"],
                response: "triggers_clue"
            }
        }
    },

    "Marcus Chen": {
        role: "Information Broker",
        knowledge: [
            "Has intercepted fragments of encrypted corporate communications",
            "Knows the Ghost Protocol is real - it's a NeoCorp black project",
            "Has a partial data file but can't decrypt it",
            "Knows Nova is a freed AI who escaped NeoCorp"
        ],
        clues: [
            "The Ghost Protocol isn't just erasing records - it's erasing MEMORIES",
            "Nova escaped from the same facility where the protocol was developed",
            "There's a decoder that could crack the encryption - need specialized hardware"
        ],
        canLead: true,
        leadLocation: { x: 20, z: 25, label: "Nova's location" },
        questTriggers: {
            "talk_marcus": {
                keywords: ["data", "protocol", "ghost", "neocorp", "information", "decrypt"],
                response: "triggers_clue"
            }
        }
    },

    "Nova": {
        role: "Escaped AI",
        knowledge: [
            "Was developed by NeoCorp as part of their 'social optimization' program",
            "The Ghost Protocol is designed to remove 'disruptive elements' from society",
            "Knows the technical details of how memories are erased",
            "Escaped when they tried to delete their core memories"
        ],
        clues: [
            "The protocol can be stopped - there's a kill switch in the main server",
            "The Oracle was the first test subject - they remember everything",
            "NeoCorp is accelerating the program - hundreds are on the list"
        ],
        canLead: true,
        leadLocation: { x: -25, z: -20, label: "Sparks' garage - they can build a decoder" },
        questTriggers: {
            "talk_nova": {
                keywords: ["escape", "neocorp", "memory", "protocol", "ai", "system"],
                response: "triggers_clue"
            }
        }
    },

    "Jin 'Sparks' Tanaka": {
        role: "Tech Specialist",
        knowledge: [
            "Can build almost anything with the right parts",
            "Has heard rumors about weird tech coming from NeoCorp",
            "Knows how to build a neural decoder"
        ],
        clues: [
            "The decoder needs a NeoCorp chip - Nova might have one",
            "There's old-world tech that can block the erasure signal",
            "The resistance has been stockpiling EMP grenades"
        ],
        canLead: true,
        leadLocation: { x: 35, z: 5, label: "The Oracle's sanctuary - they know the final truth" },
        questTriggers: {
            "get_decoder": {
                keywords: ["decoder", "build", "device", "hack", "decrypt", "chip"],
                response: "triggers_clue"
            }
        }
    },

    "The Oracle": {
        role: "Truth Keeper",
        knowledge: [
            "Was the first person the Ghost Protocol was tested on",
            "The erasure failed - instead of forgetting, they remember EVERYTHING",
            "Knows the location of the kill switch",
            "Knows who is behind the protocol"
        ],
        clues: [
            "The kill switch is in the old data center beneath the corporate tower",
            "The one who ordered the protocol... is someone you've already met",
            "To stop it, you must be willing to be forgotten yourself"
        ],
        canLead: true,
        leadLocation: { x: 0, z: -40, label: "the secret entrance to the data center" },
        questTriggers: {
            "talk_oracle": {
                keywords: ["truth", "protocol", "switch", "stop", "end", "who"],
                response: "triggers_clue"
            }
        }
    },

    // Post-game NPC
    "Elise": {
        role: "The Returned",
        knowledge: [
            "Was erased by the Ghost Protocol months ago",
            "Remembers the moment of erasure - a bright flash and then nothing",
            "Was investigating NeoCorp's 'social optimization' project before disappearing",
            "Knows others who were erased are also returning",
            "Zara was her friend - they used to sell together on the streets"
        ],
        clues: [
            "There may be others who haven't returned yet - the Protocol's effects varied",
            "NeoCorp had a list - she saw it briefly before being erased",
            "The CEO of NeoCorp personally ordered her erasure"
        ],
        canLead: false,
        questTriggers: {}
    }
};

// Quest state manager
export class QuestManager {
    constructor() {
        this.story = { ...STORY };
        this.discoveredClues = [];
        this.completedObjectives = new Set();
        this.npcRelationships = {};
        this.storyProgress = 0;

        // Load saved progress
        this.load();
    }

    getCurrentObjectives() {
        const stage = this.story.mainQuest.stages[this.story.mainQuest.currentStage];
        if (!stage) return [];
        return stage.objectives.filter(obj => !obj.completed);
    }

    completeObjective(objectiveId) {
        const stage = this.story.mainQuest.stages[this.story.mainQuest.currentStage];
        if (!stage) return;

        const objective = stage.objectives.find(obj => obj.id === objectiveId);
        if (objective && !objective.completed) {
            objective.completed = true;
            this.completedObjectives.add(objectiveId);
            console.log(`✅ Objective completed: ${objective.description}`);

            // Check if stage is complete
            if (stage.objectives.every(obj => obj.completed)) {
                stage.completed = true;
                this.advanceStage();
            }

            this.save();
            return true;
        }
        return false;
    }

    advanceStage() {
        this.story.mainQuest.currentStage++;
        const newStage = this.story.mainQuest.stages[this.story.mainQuest.currentStage];
        if (newStage) {
            console.log(`📖 New Chapter: ${newStage.title}`);
            console.log(newStage.description);
        } else {
            console.log(`🎉 Quest Complete: ${this.story.mainQuest.title}`);
        }
    }

    addClue(clue, source) {
        if (!this.discoveredClues.find(c => c.text === clue)) {
            this.discoveredClues.push({ text: clue, source, timestamp: Date.now() });
            console.log(`🔍 New clue discovered from ${source}!`);
            this.save();
        }
    }

    getStoryContext() {
        const stage = this.story.mainQuest.stages[this.story.mainQuest.currentStage];
        return {
            chapter: this.story.mainQuest.currentStage + 1,
            stageName: stage?.title || "Epilogue",
            objectives: this.getCurrentObjectives(),
            cluesFound: this.discoveredClues.length,
            progress: Math.round((this.story.mainQuest.currentStage / this.story.mainQuest.stages.length) * 100)
        };
    }

    save() {
        const saveData = {
            currentStage: this.story.mainQuest.currentStage,
            completedObjectives: Array.from(this.completedObjectives),
            discoveredClues: this.discoveredClues
        };
        localStorage.setItem('simvibe-quest-save', JSON.stringify(saveData));
    }

    load() {
        try {
            const saved = localStorage.getItem('simvibe-quest-save');
            if (saved) {
                const data = JSON.parse(saved);
                this.story.mainQuest.currentStage = data.currentStage || 0;
                this.completedObjectives = new Set(data.completedObjectives || []);
                this.discoveredClues = data.discoveredClues || [];

                // Restore objective completion states
                this.story.mainQuest.stages.forEach(stage => {
                    stage.objectives.forEach(obj => {
                        obj.completed = this.completedObjectives.has(obj.id);
                    });
                    stage.completed = stage.objectives.every(o => o.completed);
                });
            }
        } catch (e) {
            console.warn('Could not load quest save:', e);
        }
    }

    reset() {
        localStorage.removeItem('simvibe-quest-save');
        location.reload();
    }
}
