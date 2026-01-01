/**
 * SIMVIBE 3D - NPC Manager
 * Handles spawning and managing AI-powered NPCs with movement
 */

import * as THREE from 'three';
import { NPC_STORY_DATA } from './story.js';

// NPC personality definitions
const NPC_TEMPLATES = [
    {
        name: "Zara-7",
        title: "Street Vendor",
        color: 0x00f5ff,
        greeting: "Hey there, stranger. *glances around nervously* You're not with the corps, are you? Good. I've seen some strange things lately... people just vanishing. If you're looking into that, I might know something.",
        personality: "A street-smart vendor who sells cybernetic enhancements. Speaks in a casual, slightly paranoid manner. Always looking over their shoulder. Knows all the local gossip. Has seen people disappear mysteriously.",
        position: { x: 8, z: -5 },
        homePosition: { x: 8, z: -5 }
    },
    {
        name: "Marcus Chen",
        title: "Information Broker",
        color: 0xff00ff,
        greeting: "Ah, a new face in my territory. *studies you carefully* Information is currency, friend. But something tells me you're not here to buy... you're here to investigate. The Ghost Protocol, perhaps?",
        personality: "A cool and calculating information broker. Speaks formally and carefully. Values discretion above all else. Has connections everywhere. Knows about the Ghost Protocol and has data fragments.",
        position: { x: -15, z: 12 },
        homePosition: { x: -15, z: 12 }
    },
    {
        name: "Nova",
        title: "Rogue AI",
        color: 0xff2d95,
        greeting: "*holographic flicker* I detect elevated stress hormones and curiosity. You've heard about the erasures. I escaped from the same facility where they developed it. Perhaps we can help each other.",
        personality: "A sentient AI that escaped NeoCorp. Curious about human emotions. Speaks in a precise, slightly alien manner. Knows the technical details of the Ghost Protocol. Wants to stop it.",
        position: { x: 20, z: 25 },
        homePosition: { x: 20, z: 25 }
    },
    {
        name: "Jin 'Sparks' Tanaka",
        title: "Mechanic",
        color: 0x00ff66,
        greeting: "Yo! *wipes oil from hands* You don't look like you need a tune-up. Wait - are you the one asking about weird tech? I've been working on something that might help. A decoder for encrypted corp data!",
        personality: "An enthusiastic and skilled mechanic. Very energetic and talks fast. Loves anything mechanical. Can build devices to help with the mission.",
        position: { x: -25, z: -20 },
        homePosition: { x: -25, z: -20 }
    },
    {
        name: "The Oracle",
        title: "Truth Keeper",
        color: 0xffaa00,
        greeting: "*eyes glow with data streams* I knew you would come. I was the first, you see. The first they tried to erase. But instead of forgetting... I remember everything. Every. Single. Truth.",
        personality: "A mysterious figure who survived the Ghost Protocol. It gave them the ability to see all data. Speaks cryptically but knows the full truth. Can reveal how to stop the protocol.",
        position: { x: 35, z: 5 },
        homePosition: { x: 35, z: 5 }
    }
];

// Post-game NPC that appears after Protocol is destroyed
const POST_GAME_NPCS = [
    {
        name: "Elise",
        title: "The Returned",
        color: 0xaaffaa,
        greeting: "*looks around in amazement* I... I'm back? The last thing I remember is asking questions about NeoCorp and then... nothing. Months of nothing. But now everyone remembers me! Zara! Marcus! They remember! Did you... were you the one who stopped it?",
        personality: "A young woman who was erased by the Ghost Protocol. She's disoriented but grateful. Was investigating NeoCorp before she disappeared. Wants to know what happened and thank whoever saved her.",
        position: { x: 5, z: 0 }, // Near spawn - so player sees her immediately
        homePosition: { x: 5, z: 0 },
        postGameOnly: true
    }
];

export class NPCManager {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
        this.npcLeading = null; // NPC currently leading player
        this.leadTarget = null; // Where they're leading to
        this.onNPCArrived = null; // Callback when NPC arrives at destination
    }

    async spawnNPCs() {
        // Spawn regular NPCs
        for (const template of NPC_TEMPLATES) {
            const npc = this.createNPC(template);
            this.npcs.push(npc);
        }

        // Check if game is complete - spawn post-game NPCs
        const gameComplete = localStorage.getItem('simvibe-game-complete') === 'true';
        if (gameComplete) {
            console.log('🎉 Post-game mode: Spawning returned NPCs...');
            for (const template of POST_GAME_NPCS) {
                const npc = this.createNPC(template, true);
                this.npcs.push(npc);
            }

            // Trigger automatic character movements for the "Reunion"
            setTimeout(() => this.initPostGameEvents(), 2000);
        }
    }

    initPostGameEvents() {
        // Find Elise, Zara, and Marcus
        const elise = this.getNPC("Elise");
        const zara = this.getNPC("Zara-7");
        const marcus = this.getNPC("Marcus Chen");

        if (!elise || !zara || !marcus) return;

        // Target positions near Elise (5, 0)
        const zaraTarget = { x: 3, z: 2 };
        const marcusTarget = { x: 7, z: 2 };

        console.log("🎬 Starting Post-Game Reunion Event...");

        // Move them
        this.moveNPCTo("Zara-7", zaraTarget, () => {
            if (this.onEventTrigger) this.onEventTrigger("reunion_zara_arrived", { npc: zara, target: elise });
        });

        this.moveNPCTo("Marcus Chen", marcusTarget, () => {
            if (this.onEventTrigger) this.onEventTrigger("reunion_marcus_arrived", { npc: marcus, target: elise });
        });
    }

    createNPC(template, isPostGame = false) {
        const group = new THREE.Group();

        // Body - slightly different color for returned NPCs
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: isPostGame ? 0x3a4a3a : 0x2a2a3a,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.6
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        group.add(head);

        // Eyes (glowing)
        const eyeMat = new THREE.MeshBasicMaterial({ color: template.color });
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.65, 0.2);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.65, 0.2);
        group.add(rightEye);

        // Neon accent ring
        const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: template.color });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 1.4;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Floating name tag
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#' + template.color.toString(16).padStart(6, '0');
        ctx.fillText(template.name, 128, 40);

        const nameTexture = new THREE.CanvasTexture(canvas);
        const nameMat = new THREE.SpriteMaterial({
            map: nameTexture,
            transparent: true
        });
        const nameSprite = new THREE.Sprite(nameMat);
        nameSprite.position.y = 2.3;
        nameSprite.scale.set(2, 0.5, 1);
        group.add(nameSprite);

        // Point light for glow effect
        const glow = new THREE.PointLight(template.color, 1, 8);
        glow.position.y = 1;
        group.add(glow);

        // Position in world
        group.position.set(template.position.x, 0, template.position.z);

        // Get story data for this NPC
        const storyData = NPC_STORY_DATA[template.name] || {};

        // Store NPC data
        group.userData = {
            name: template.name,
            title: template.title,
            greeting: template.greeting,
            personality: template.personality,
            color: template.color,
            originalY: 0,
            bobPhase: Math.random() * Math.PI * 2,
            homePosition: { ...template.homePosition },
            // Story/interaction data
            storyRole: storyData.role || "Citizen",
            knowledge: storyData.knowledge || [],
            clues: storyData.clues || [],
            canLead: storyData.canLead || false,
            leadLocation: storyData.leadLocation || null,
            questTriggers: storyData.questTriggers || {},
            // Movement state
            isMoving: false,
            moveTarget: null,
            moveSpeed: 3,
            isLeading: false
        };

        this.scene.add(group);
        return group;
    }

    getNPC(name) {
        return this.npcs.find(npc => npc.userData.name === name);
    }

    getNearbyNPC(playerPosition, maxDistance) {
        let closest = null;
        let closestDist = maxDistance;

        for (const npc of this.npcs) {
            const dist = playerPosition.distanceTo(npc.position);
            if (dist < closestDist) {
                closestDist = dist;
                closest = {
                    ...npc.userData,
                    mesh: npc,
                    distance: dist
                };
            }
        }

        return closest;
    }

    // Make NPC walk to a location
    moveNPCTo(npcName, target, onArrival = null) {
        const npc = this.getNPC(npcName);
        if (!npc) return false;

        npc.userData.isMoving = true;
        npc.userData.moveTarget = new THREE.Vector3(target.x, 0, target.z);
        npc.userData.onArrival = onArrival;

        console.log(`${npcName} is moving to (${target.x}, ${target.z})`);
        return true;
    }

    // Make NPC lead player to a location
    startLeading(npcName, playerRef) {
        const npc = this.getNPC(npcName);
        if (!npc || !npc.userData.canLead) return false;

        const target = npc.userData.leadLocation;
        if (!target) return false;

        npc.userData.isLeading = true;
        this.npcLeading = npc;
        this.leadTarget = new THREE.Vector3(target.x, 0, target.z);

        console.log(`${npcName} is leading you to: ${target.label}`);
        return true;
    }

    stopLeading() {
        if (this.npcLeading) {
            this.npcLeading.userData.isLeading = false;
            this.npcLeading = null;
            this.leadTarget = null;
        }
    }

    // Return NPC to their home position
    returnHome(npcName) {
        const npc = this.getNPC(npcName);
        if (!npc) return;

        const home = npc.userData.homePosition;
        this.moveNPCTo(npcName, home);
    }

    update(delta, playerPosition) {
        const time = performance.now() * 0.001;

        for (const npc of this.npcs) {
            // Handle NPC movement
            if (npc.userData.isMoving && npc.userData.moveTarget) {
                const target = npc.userData.moveTarget;
                const direction = new THREE.Vector3()
                    .subVectors(target, npc.position)
                    .setY(0);

                const distance = direction.length();

                if (distance > 0.5) {
                    direction.normalize();
                    const moveAmount = npc.userData.moveSpeed * delta;
                    npc.position.add(direction.multiplyScalar(Math.min(moveAmount, distance)));

                    // Face movement direction
                    const lookTarget = new THREE.Vector3()
                        .copy(npc.position)
                        .add(direction);
                    npc.lookAt(lookTarget);
                } else {
                    // Arrived at destination
                    npc.userData.isMoving = false;
                    npc.userData.moveTarget = null;

                    if (npc.userData.onArrival) {
                        npc.userData.onArrival(npc);
                        npc.userData.onArrival = null;
                    }
                }
            }

            // Handle leading behavior
            if (npc.userData.isLeading && this.leadTarget) {
                const toTarget = new THREE.Vector3()
                    .subVectors(this.leadTarget, npc.position)
                    .setY(0);

                const toPlayer = new THREE.Vector3()
                    .subVectors(playerPosition, npc.position)
                    .setY(0);

                const distToTarget = toTarget.length();
                const distToPlayer = toPlayer.length();

                // If player is too far, wait for them
                if (distToPlayer > 8) {
                    // Turn to face player
                    const lookTarget = new THREE.Vector3(
                        playerPosition.x,
                        npc.position.y,
                        playerPosition.z
                    );
                    npc.lookAt(lookTarget);
                } else if (distToTarget > 2) {
                    // Move towards target
                    toTarget.normalize();
                    const moveAmount = npc.userData.moveSpeed * 0.8 * delta;
                    npc.position.add(toTarget.multiplyScalar(moveAmount));

                    // Face movement direction
                    const lookTarget = new THREE.Vector3()
                        .copy(npc.position)
                        .add(toTarget);
                    npc.lookAt(lookTarget);
                } else {
                    // Arrived!
                    npc.userData.isLeading = false;
                    this.npcLeading = null;

                    if (this.onNPCArrived) {
                        this.onNPCArrived(npc, this.leadTarget);
                    }
                    this.leadTarget = null;
                }
            } else if (!npc.userData.isMoving) {
                // Normal idle behavior - gentle bobbing
                npc.position.y = npc.userData.originalY +
                    Math.sin(time * 2 + npc.userData.bobPhase) * 0.05;

                // Look at player if nearby
                const dist = playerPosition.distanceTo(npc.position);
                if (dist < 10) {
                    const lookTarget = new THREE.Vector3(
                        playerPosition.x,
                        npc.position.y,
                        playerPosition.z
                    );
                    npc.lookAt(lookTarget);
                }
            }

            // Pulse the ring
            const ring = npc.children.find(c => c.geometry?.type === 'TorusGeometry');
            if (ring) {
                const pulseIntensity = npc.userData.isLeading ? 0.2 : 0.1;
                const pulseSpeed = npc.userData.isLeading ? 5 : 3;
                ring.scale.setScalar(1 + Math.sin(time * pulseSpeed) * pulseIntensity);
            }
        }
    }

    // Check if any NPC is currently leading
    isAnyNPCLeading() {
        return this.npcLeading !== null;
    }

    // Get the NPC that's currently leading
    getLeadingNPC() {
        return this.npcLeading ? this.npcLeading.userData : null;
    }
}

