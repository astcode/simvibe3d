/**
 * SIMVIBE 3D - Main Entry Point
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CityGenerator } from './city.js';
import { NPCManager } from './npc.js';
import { AIChat } from './ai.js';
import { QuestManager, STORY } from './story.js';

class SimVibe3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.cityGenerator = null;
        this.npcManager = null;
        this.aiChat = null;
        this.questManager = null;

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.isPlaying = false;
        this.isChatOpen = false;
        this.isQuestLogOpen = false;
        this.isSettingsOpen = false;
        this.currentNPC = null;
        this.npcCanLead = false;
        this.clock = new THREE.Clock();

        // Game completion state
        this.gameComplete = localStorage.getItem('simvibe-game-complete') === 'true';

        this.loadingScreen = document.getElementById('loading-screen');
        this.startScreen = document.getElementById('start-screen');
        this.storyIntro = document.getElementById('story-intro');
        this.questLog = document.getElementById('quest-log');
        this.settingsPanel = document.getElementById('settings-panel');
        this.hud = document.getElementById('hud');
        this.chatContainer = document.getElementById('chat-container');
        this.interactionHint = document.getElementById('interaction-hint');
        this.followIndicator = document.getElementById('follow-indicator');
        this.chatActions = document.getElementById('chat-actions');
        this.bubblesContainer = document.getElementById('speech-bubbles');

        this.activeBubbles = new Map(); // Map npcName -> bubbleElement

        this.init();
    }

    async init() {
        this.updateLoadingStatus('Initializing renderer...');
        await this.initThreeJS();
        this.updateLoadingProgress(20);

        this.updateLoadingStatus('Generating city...');
        await this.initCity();
        this.updateLoadingProgress(50);

        this.updateLoadingStatus('Spawning NPCs...');
        await this.initNPCs();
        this.updateLoadingProgress(70);

        this.updateLoadingStatus('Connecting AI systems...');
        await this.initAI();
        this.updateLoadingProgress(85);

        this.updateLoadingStatus('Initializing story...');
        this.initQuestSystem();

        this.updateLoadingStatus('Setting up controls...');
        this.initControls();
        this.initEventListeners();
        this.updateLoadingProgress(100);
        this.updateLoadingStatus('Ready!');

        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
            this.startScreen.classList.remove('hidden');
        }, 500);

        this.animate();
    }

    initQuestSystem() {
        this.questManager = new QuestManager();
        this.updateQuestHUD();
    }

    showStoryIntro() {
        // Show the story intro message
        document.getElementById('story-message').textContent = STORY.intro;
        this.storyIntro.classList.remove('hidden');
    }

    updateQuestHUD() {
        const objectives = this.questManager.getCurrentObjectives();
        if (objectives.length > 0) {
            document.getElementById('quest-objective').textContent = objectives[0].description;
        }
    }

    updateQuestLog() {
        const objectives = this.questManager.story.mainQuest.stages[this.questManager.story.mainQuest.currentStage]?.objectives || [];
        const objectivesContainer = document.getElementById('quest-objectives');

        objectivesContainer.innerHTML = '<h4>CURRENT OBJECTIVES</h4>';
        objectives.forEach(obj => {
            const div = document.createElement('div');
            div.className = `objective-item${obj.completed ? ' completed' : ''}`;
            div.innerHTML = `
                <div class="objective-check">${obj.completed ? '✓' : ''}</div>
                <span class="objective-text">${obj.description}</span>
            `;
            objectivesContainer.appendChild(div);
        });

        // Update clues
        const cluesList = document.getElementById('clues-list');
        const clues = this.questManager.discoveredClues;

        if (clues.length > 0) {
            cluesList.innerHTML = '';
            clues.forEach(clue => {
                const li = document.createElement('li');
                li.textContent = `${clue.text} (from ${clue.source})`;
                cluesList.appendChild(li);
            });
        }
    }

    updateLoadingStatus(status) {
        const el = document.querySelector('.loader-status');
        if (el) el.textContent = status;
    }

    updateLoadingProgress(percent) {
        const bar = document.querySelector('.loader-progress-bar');
        if (bar) bar.style.width = `${percent}%`;
    }

    async initThreeJS() {
        this.scene = new THREE.Scene();
        // Brighter blue-purple sky for better visibility
        this.scene.background = new THREE.Color(0x1a1a35);
        // Much lighter fog - can see further
        this.scene.fog = new THREE.FogExp2(0x1a1a35, 0.004);

        // Wider FOV for better view
        this.camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // Higher exposure for brighter image
        this.renderer.toneMappingExposure = 1.8;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.setupLighting();
    }

    setupLighting() {
        // Much brighter ambient light
        const ambient = new THREE.AmbientLight(0x4466aa, 1.2);
        this.scene.add(ambient);

        // Brighter moonlight
        const moon = new THREE.DirectionalLight(0x8888ff, 1.5);
        moon.position.set(50, 100, 50);
        moon.castShadow = true;
        this.scene.add(moon);

        // Strong hemisphere light for overall brightness
        const hemi = new THREE.HemisphereLight(0x6699ff, 0xff9966, 0.8);
        this.scene.add(hemi);

        // Add a secondary fill light from below/front
        const fill = new THREE.DirectionalLight(0xffffff, 0.5);
        fill.position.set(0, 30, 100);
        this.scene.add(fill);
    }

    async initCity() {
        this.cityGenerator = new CityGenerator(this.scene);
        await this.cityGenerator.generate();
    }

    async initNPCs() {
        this.npcManager = new NPCManager(this.scene);
        this.npcManager.onEventTrigger = (eventName, data) => this.handleGameEvent(eventName, data);
        await this.npcManager.spawnNPCs();
    }

    handleGameEvent(eventName, data) {
        if (eventName === 'reunion_zara_arrived') {
            // Start the reunion conversation
            if (this.reunionStarted) return;
            this.reunionStarted = true;

            this.playScriptedConversation([
                { speaker: "Zara-7", text: "Elise? Is that really you?", delay: 1000 },
                { speaker: "Elise", text: "Zara! I... I'm back. I don't know how, but I'm back.", delay: 4000 },
                { speaker: "Marcus Chen", text: "The data stream... it's restored. The destruction of the Protocol reversed the erasures.", delay: 8000 },
                { speaker: "Zara-7", text: "I thought you were gone forever.", delay: 13000 },
                { speaker: "Elise", text: "I saw... nothingness. But then I heard a voice. And I woke up here.", delay: 16000 },
                { speaker: "The Oracle", text: "The truth cannot be deleted. Welcome home, child.", delay: 20000 }
            ]);
        }
    }

    playScriptedConversation(lines) {
        lines.forEach(line => {
            setTimeout(() => {
                this.showSpeechBubble(line.speaker, line.text);
            }, line.delay);
        });
    }

    async initAI() {
        this.aiChat = new AIChat();
        await this.aiChat.init();
    }

    initControls() {
        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.addEventListener('lock', () => {
            if (!this.isChatOpen && !this.isQuestLogOpen) {
                this.isPlaying = true;
                this.hud.classList.remove('hidden');
            }
        });
        this.controls.addEventListener('unlock', () => {
            if (!this.isChatOpen && !this.isQuestLogOpen) this.isPlaying = false;
        });
    }

    initEventListeners() {
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('resize', () => this.onWindowResize());
        document.getElementById('chat-close').addEventListener('click', () => this.closeChat());
        document.getElementById('chat-send').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Story intro continue button
        document.getElementById('story-continue')?.addEventListener('click', () => {
            this.storyIntro.classList.add('hidden');
            this.controls.lock();
        });

        // Quest log close button
        document.getElementById('quest-close')?.addEventListener('click', () => {
            this.closeQuestLog();
        });

        // Follow button
        document.getElementById('follow-btn')?.addEventListener('click', () => {
            this.followNPC();
        });

        // Settings panel
        document.getElementById('settings-close')?.addEventListener('click', () => {
            this.closeSettings();
        });

        // New Game button
        document.getElementById('new-game-btn')?.addEventListener('click', () => {
            this.confirmNewGame();
        });

        // TTS Toggle
        const ttsToggle = document.getElementById('tts-toggle');
        if (ttsToggle) {
            // Set initial state
            ttsToggle.checked = this.aiChat.ttsEnabled;

            ttsToggle.addEventListener('change', (e) => {
                this.aiChat.setTTSEnabled(e.target.checked);
            });
        }

        // Update game status display
        this.updateGameStatus();
    }

    openSettings() {
        this.isSettingsOpen = true;
        this.controls.unlock();
        this.updateGameStatus();
        this.settingsPanel.classList.remove('hidden');
    }

    closeSettings() {
        this.isSettingsOpen = false;
        this.settingsPanel.classList.add('hidden');
        setTimeout(() => this.controls.lock(), 100);
    }

    updateGameStatus() {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            if (this.gameComplete) {
                statusText.textContent = 'COMPLETE ✓';
                statusText.classList.add('complete');
            } else {
                statusText.textContent = 'In Progress';
                statusText.classList.remove('complete');
            }
        }
    }

    displayConfirmModal(title, text, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const textEl = document.getElementById('confirm-text');
        const yesBtn = document.getElementById('confirm-yes');
        const cancelBtn = document.getElementById('confirm-cancel');

        if (!modal) return;

        titleEl.textContent = title;
        textEl.textContent = text;

        // Remove old listeners to prevent stacking
        const newYes = yesBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYes, yesBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newYes.addEventListener('click', () => {
            onConfirm();
            modal.classList.add('hidden');
        });

        newCancel.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.classList.remove('hidden');
    }

    confirmNewGame() {
        this.displayConfirmModal(
            'START NEW GAME?',
            'This will erase ALL progress (NPC memories, quests, story). Are you sure?',
            () => this.resetGame()
        );
    }

    resetGame() {
        // Clear all saved data
        localStorage.removeItem('simvibe-game-complete');
        localStorage.removeItem('simvibe-quest-save');
        localStorage.removeItem('simvibe-npc-memories');
        localStorage.removeItem('simvibe-seen-intro');

        console.log('🔄 Game reset! Reloading...');

        // Reload the page
        location.reload();
    }

    startGame() {
        this.startScreen.classList.add('hidden');
        // Show story intro first time (or if game was completed, show post-game intro)
        const hasSeenIntro = localStorage.getItem('simvibe-seen-intro');
        if (!hasSeenIntro) {
            if (this.gameComplete) {
                this.showPostGameIntro();
            } else {
                this.showStoryIntro();
            }
            localStorage.setItem('simvibe-seen-intro', 'true');
        } else {
            this.controls.lock();
        }
    }

    showPostGameIntro() {
        this.showStoryMessage(
            "THE WORLD AFTER",
            `It's been days since you destroyed the Ghost Protocol.

The news feeds are buzzing with stories of people "waking up" - remembering friends, family, lovers they had forgotten.

NeoCorp is in chaos. Investigations are underway. The CEO has vanished.

You're a legend now, though few know your name. The Oracle sends you cryptic messages of gratitude.

The city feels different. Lighter. The NPCs you helped remember what you did for them. Some even remember things differently now...

But shadows still lurk in Neon District. This may not be the end.`,
            "Return to the City"
        );
    }

    onKeyDown(e) {
        // Handle settings with Tab
        if (e.code === 'Tab' && !this.isChatOpen && !this.isQuestLogOpen) {
            e.preventDefault();
            if (this.isSettingsOpen) {
                this.closeSettings();
            } else {
                this.openSettings();
            }
            return;
        }

        // Handle settings escape
        if (this.isSettingsOpen) {
            if (e.code === 'Escape') this.closeSettings();
            return;
        }

        // Handle quest log
        if (e.code === 'KeyQ' && !this.isChatOpen) {
            if (this.isQuestLogOpen) {
                this.closeQuestLog();
            } else {
                this.openQuestLog();
            }
            return;
        }

        if (this.isChatOpen) {
            if (e.code === 'Escape') this.closeChat();
            return;
        }

        if (this.isQuestLogOpen) {
            if (e.code === 'Escape') this.closeQuestLog();
            return;
        }

        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.moveForward = true; break;
            case 'KeyS': case 'ArrowDown': this.moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': this.moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = true; break;
            case 'KeyE': this.tryInteract(); break;
            case 'Escape': if (this.controls.isLocked) this.controls.unlock(); break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.moveForward = false; break;
            case 'KeyS': case 'ArrowDown': this.moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': this.moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': this.moveRight = false; break;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    openQuestLog() {
        this.isQuestLogOpen = true;
        this.controls.unlock();
        this.updateQuestLog();
        this.questLog.classList.remove('hidden');
    }

    closeQuestLog() {
        this.isQuestLogOpen = false;
        this.questLog.classList.add('hidden');
        setTimeout(() => this.controls.lock(), 100);
    }

    tryInteract() {
        // Check for NPC first
        const npc = this.npcManager?.getNearbyNPC(this.camera.position, 5);
        if (npc) {
            this.openChat(npc);
            return;
        }

        // Check for secret entrance (located at 0, -40)
        const entrancePos = new THREE.Vector3(0, 0, -40);
        const distToEntrance = this.camera.position.distanceTo(entrancePos);

        if (distToEntrance < 8) {
            this.enterSecretArea();
        }
    }

    enterSecretArea() {
        // Check if player has talked to The Oracle (completed the main investigation)
        const oracleObjectiveComplete = this.questManager.completedObjectives.has('talk_oracle');

        if (!oracleObjectiveComplete) {
            // Show a message that they're not ready yet
            this.showStoryMessage(
                "ACCESS DENIED",
                `The door scans your neural signature and flashes red.

"UNAUTHORIZED. KNOWLEDGE REQUIREMENT NOT MET."

You sense you need to learn more before you can enter. Perhaps The Oracle knows the way...`,
                "I need to find more answers first..."
            );
            return;
        }

        // Player has completed the investigation - show the finale!
        this.showStoryMessage(
            "THE FINAL TRUTH",
            `The door scans you and flashes green. As it slides open, cold air rushes out.

You descend the stairs into darkness. Emergency lights flicker to life, revealing rows of servers humming with sinister purpose.

In the center of the room, a terminal glows. On the screen:

"GHOST PROTOCOL v2.7 - SUBJECTS PROCESSED: 2,847"
"NEXT SCHEDULED ERASURE: [YOUR NAME]"

Your blood runs cold. You were never just investigating - you were the next target.

But now you're here. The kill switch is within reach. One command could end it all...

Or you could take control of it yourself.

THE CHOICE IS YOURS.`,
            "End the Protocol",
            () => this.endingChoice('destroy')
        );
    }

    showStoryMessage(title, message, buttonText, callback = null) {
        const storyIntro = document.getElementById('story-intro');
        const storyHeader = document.querySelector('.story-header h2');
        const storyMessage = document.getElementById('story-message');
        const storyButton = document.getElementById('story-continue');

        storyHeader.textContent = title;
        storyMessage.textContent = message;
        storyButton.textContent = buttonText;

        // Remove old listener and add new one
        const newButton = storyButton.cloneNode(true);
        storyButton.parentNode.replaceChild(newButton, storyButton);

        newButton.addEventListener('click', () => {
            storyIntro.classList.add('hidden');
            if (callback) {
                callback();
            } else {
                this.controls.lock();
            }
        });

        this.controls.unlock();
        storyIntro.classList.remove('hidden');
    }

    endingChoice(choice) {
        if (choice === 'destroy') {
            this.showStoryMessage(
                "PROTOCOL TERMINATED",
                `Your fingers fly across the keyboard.

> INITIATE KILL SWITCH
> CONFIRM: Y
> ERASING GHOST PROTOCOL...
> ...
> PROTOCOL DESTROYED
> MEMORY RESTORATION INITIATED
> 2,847 SUBJECTS RECOVERING

The servers around you spark and die. Somewhere in the city, people are waking up, their memories flooding back.

You've done it. The Ghost Protocol is no more.

As you climb back to the surface, your neural feed buzzes with a new message:

"Well done, Fixer. We knew you were the one. The resistance thanks you.
- The Oracle"

The neon lights of the city seem a little brighter now. There's still corruption, still megacorps, still a thousand problems...

But tonight, you made a difference.

[THE END... FOR NOW]`,
                "Return to the City",
                () => {
                    // Mark the game as complete
                    localStorage.setItem('simvibe-game-complete', 'true');
                    console.log('🎉 Congratulations! You completed The Ghost Protocol!');
                    // Reload to initialize post-game state (spawn Elise, etc.)
                    location.reload();
                }
            );
        }
    }

    openChat(npc) {
        this.currentNPC = npc;
        this.isChatOpen = true;
        this.npcCanLead = false;
        this.controls.unlock();
        document.getElementById('npc-name').textContent = npc.name;
        document.getElementById('npc-title').textContent = npc.storyRole || npc.title;
        document.getElementById('npc-avatar').textContent = npc.name.charAt(0);
        document.getElementById('chat-messages').innerHTML = '';
        this.chatActions.classList.add('hidden');

        // Start conversation first (loads memory)
        this.aiChat.startConversation(npc);

        // Check if we have memory
        const memory = this.aiChat.getMemory(npc.name);

        if (memory.conversationCount > 0 && memory.recentMessages && memory.recentMessages.length > 0) {
            // They've met before - show previous conversation
            console.log(`📝 ${npc.name} remembers you! (${memory.conversationCount} previous chats)`);

            // Add a separator showing this is previous conversation
            this.addSystemMessage("--- Previous Conversation ---");

            // Display previous messages
            memory.recentMessages.forEach(msg => {
                this.addChatMessage(msg.content, msg.role === 'user' ? 'user' : 'npc');
            });

            // Add separator for new conversation
            this.addSystemMessage("--- Continuing Conversation ---");

            // Check if they offered to lead before - restore the button
            if (memory.offeredToLead && npc.canLead) {
                this.npcCanLead = true;
                this.chatActions.classList.remove('hidden');
                console.log(`🚶 ${npc.name} still offers to lead you`);
            }
        } else {
            // First meeting - show greeting
            let greeting = npc.greeting;

            // Add greeting to conversation history so AI has context
            this.aiChat.addToHistory('assistant', greeting);
            this.addChatMessage(greeting, 'npc', true); // Speak the greeting
        }

        this.chatContainer.classList.remove('hidden');
        document.getElementById('chat-input').focus();
    }

    addChatMessage(text, sender, speak = false) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;
        msg.textContent = text;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;

        if (speak && this.aiChat) {
            this.aiChat.speak(text, sender === 'npc' && this.currentNPC ? this.currentNPC.name : null);
        }
    }

    addSystemMessage(text) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = 'chat-message system';
        msg.textContent = text;
        msg.style.cssText = 'color: #888; font-style: italic; font-size: 0.8em; text-align: center; opacity: 0.7;';
        container.appendChild(msg);
    }

    closeChat() {
        this.isChatOpen = false;

        // Stop any ongoing speech
        this.aiChat.stopSpeaking();

        // Save the lead offer state to memory before ending
        if (this.currentNPC && this.npcCanLead) {
            const memory = this.aiChat.getMemory(this.currentNPC.name);
            memory.offeredToLead = true;
            this.aiChat.npcMemories[this.currentNPC.name] = memory;
        }

        this.npcCanLead = false;
        this.chatActions.classList.add('hidden');
        this.currentNPC = null;
        this.chatContainer.classList.add('hidden');
        this.aiChat.endConversation();
        setTimeout(() => this.controls.lock(), 100);
    }

    followNPC() {
        if (!this.currentNPC || !this.currentNPC.canLead) return;

        const success = this.npcManager.startLeading(this.currentNPC.name, this.camera);
        if (success) {
            // Clear the lead offer from memory since they're now following
            this.aiChat.clearLeadOffer(this.currentNPC.name);

            const npcName = this.currentNPC.name;
            this.closeChat();
            this.followIndicator.classList.remove('hidden');
            document.getElementById('follow-name').textContent = `Following ${npcName}`;

            // Set up arrival callback
            this.npcManager.onNPCArrived = (npc, destination) => {
                this.followIndicator.classList.add('hidden');
                console.log(`Arrived at destination with ${npc.userData.name}`);
            };
        }
    }

    addChatMessage(text, sender, speak = false) {
        const container = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;

        // Clean up any command tags for display
        let displayText = text
            .replace(/\[LEAD\]/gi, '')
            .replace(/\[CLUE:\s*([^\]]+)\]/gi, '')
            .trim();

        msg.textContent = displayText;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;

        // Speak the message if it's from an NPC and TTS is enabled
        if (speak && sender === 'npc' && this.currentNPC) {
            this.aiChat.speak(displayText, this.currentNPC.name);
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;
        this.addChatMessage(message, 'user');
        input.value = '';
        document.getElementById('typing-indicator').classList.remove('hidden');
        try {
            const response = await this.aiChat.chat(message);
            document.getElementById('typing-indicator').classList.add('hidden');

            // Check for special commands in response
            this.processAIResponse(response);

            // Add message AND speak it
            this.addChatMessage(response, 'npc', true);
        } catch (e) {
            document.getElementById('typing-indicator').classList.add('hidden');
            this.addChatMessage("*static* ...connection unstable...", 'npc', true);
        }
    }

    processAIResponse(response) {
        // Check for [LEAD] command
        if (response.toLowerCase().includes('[lead]')) {
            if (this.currentNPC?.canLead) {
                this.npcCanLead = true;
                this.chatActions.classList.remove('hidden');
            }
        }

        // Check for [CLUE: ...] command
        const clueMatch = response.match(/\[CLUE:\s*([^\]]+)\]/i);
        if (clueMatch && clueMatch[1]) {
            const clueText = clueMatch[1].trim();
            this.questManager.addClue(clueText, this.currentNPC?.name || 'Unknown');
            console.log(`🔍 Clue discovered: ${clueText}`);
        }

        // Check if this conversation completes a quest objective
        if (this.currentNPC) {
            const triggers = this.currentNPC.questTriggers || {};
            for (const [objectiveId, trigger] of Object.entries(triggers)) {
                if (!this.questManager.completedObjectives.has(objectiveId)) {
                    // Check if any trigger keywords were mentioned
                    const mentioned = trigger.keywords?.some(keyword =>
                        response.toLowerCase().includes(keyword.toLowerCase())
                    );
                    if (mentioned) {
                        this.questManager.completeObjective(objectiveId);
                        this.updateQuestHUD();
                    }
                }
            }
        }
    }

    showSpeechBubble(npcName, text) {
        // Find existing bubble or create new one
        let bubble = this.activeBubbles.get(npcName);

        if (bubble) {
            // Update existing
            bubble.element.querySelector('.bubble-text').textContent = text;
            clearTimeout(bubble.timeout);
            bubble.element.classList.add('npc-speaking');
            setTimeout(() => bubble.element.classList.remove('npc-speaking'), 500);
        } else {
            // Create new bubble
            const el = document.createElement('div');
            el.className = 'speech-bubble npc-speaking';
            el.innerHTML = `<span class="npc-name">${npcName}</span><span class="bubble-text">${text}</span>`;
            this.bubblesContainer.appendChild(el);

            bubble = {
                element: el,
                npcName: npcName,
                timeout: null
            };
            this.activeBubbles.set(npcName, bubble);

            setTimeout(() => el.classList.remove('npc-speaking'), 500);
        }

        // Auto-remove after time based on length
        const duration = Math.max(3000, text.length * 50);
        bubble.timeout = setTimeout(() => {
            this.hideSpeechBubble(npcName);
        }, duration);

        // Also speak the audio!
        this.aiChat.speak(text, npcName);
    }

    hideSpeechBubble(npcName) {
        const bubble = this.activeBubbles.get(npcName);
        if (bubble) {
            bubble.element.style.opacity = '0';
            setTimeout(() => {
                if (bubble.element.parentNode) {
                    bubble.element.parentNode.removeChild(bubble.element);
                }
                this.activeBubbles.delete(npcName);
            }, 300);
        }
    }

    updateBubbles() {
        if (!this.npcManager || this.activeBubbles.size === 0) return;

        this.activeBubbles.forEach((bubble, npcName) => {
            // Find NPC position
            const npc = this.npcManager.npcs.find(n => n.userData.name === npcName);
            if (npc) {
                // Project 3D position to 2D screen
                const headPos = npc.position.clone().add(new THREE.Vector3(0, 2.2, 0)); // Above head
                headPos.project(this.camera);

                // Convert to screen coords
                const x = (headPos.x * .5 + .5) * window.innerWidth;
                const y = (-(headPos.y * .5) + .5) * window.innerHeight;

                // Check if behind camera
                if (headPos.z < 1) {
                    bubble.element.style.display = 'block';
                    bubble.element.style.left = `${x}px`;
                    bubble.element.style.top = `${y}px`;

                    // Simple distance scaling/fading
                    const dist = this.camera.position.distanceTo(npc.position);
                    if (dist > 20) {
                        bubble.element.style.opacity = '0';
                    } else {
                        bubble.element.style.opacity = '1';
                    }
                } else {
                    bubble.element.style.display = 'none';
                }
            }
        });
    }

    updatePlayer(delta) {
        if (!this.controls.isLocked || this.isChatOpen) return;
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();
        const speed = 50.0;
        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * delta;
        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);
        this.camera.position.y = 2;
    }

    updateInteractionHint() {
        if (!this.npcManager || this.isChatOpen) return;

        // Check for nearby NPC
        const npc = this.npcManager.getNearbyNPC(this.camera.position, 5);
        if (npc) {
            this.interactionHint.textContent = `Press E to talk to ${npc.name}`;
            this.interactionHint.classList.add('visible');
            return;
        }

        // Check for secret entrance
        const entrancePos = new THREE.Vector3(0, 0, -40);
        const distToEntrance = this.camera.position.distanceTo(entrancePos);

        if (distToEntrance < 8) {
            this.interactionHint.textContent = `Press E to enter the data center`;
            this.interactionHint.classList.add('visible');
            return;
        }

        this.interactionHint.classList.remove('visible');
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        this.updatePlayer(delta);
        this.npcManager?.update(delta, this.camera.position);
        this.updateBubbles(); // Update speech bubble positions
        this.updateInteractionHint();
        this.renderer.render(this.scene, this.camera);
    }
}

window.game = new SimVibe3D();
