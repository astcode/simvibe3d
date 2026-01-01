# SimVibe 3D

**SimVibe 3D** is a narrative-driven 3D game prototype that blends AI-powered NPC conversations, persistent memory, and spatial exploration into a cohesive cyberpunk experience.  
Instead of scripted dialog trees, NPCs act as memory-aware agents that guide the player through story progression using conversation, movement, and environmental cues.

This project is designed as a **local-first, privacy-safe prototype** focused on immersion, narrative coherence, and system-driven storytelling.

---

## Core Features

- **AI-Powered NPCs**
  - NPCs have personality, role, knowledge, and memory
  - Conversations persist across sessions
  - NPCs can lead the player to story locations
  - Relationship state evolves over time

- **Narrative Quest System**
  - Story progression driven by conversation semantics
  - Multi-stage main quest with objectives and clues
  - Quest state persists via local storage

- **3D Cyberpunk City**
  - Procedurally generated city layout
  - Story-relevant landmarks and locations
  - NPCs exist and move within the world

- **Text-to-Speech Integration**
  - Natural NPC voices via Edge TTS (local server)
  - Automatic fallback to browser TTS
  - NPC-specific voice tuning (rate, pitch)

- **Diegetic UI**
  - Minimal menus
  - In-world speech bubbles
  - HUD-based guidance instead of overlays

- **Local-Only & Secure**
  - No external analytics or telemetry
  - No API keys or secrets
  - All state stored locally

---

## Controls & Interactions (Complete List)

### Movement & Camera
| Control | Action |
|------|------|
| **W** | Move forward |
| **A** | Move left |
| **S** | Move backward |
| **D** | Move right |
| **Mouse Move** | Look around |
| **Pointer Lock** | Automatically enabled when gameplay starts |

---

### Interaction
| Control | Action |
|------|------|
| **E** | Interact / Talk to NPC when in range |
| **Mouse Click (UI)** | Press buttons, confirm actions |
| **Follow Button (UI)** | Accept NPC offer to lead you to a location |

---

### Chat System
| Control | Action |
|------|------|
| **Enter** | Send chat message to NPC |
| **ESC** | Exit NPC chat |
| **Chat Close (×)** | Close NPC chat window |
| **Typing Indicator** | Shows NPC is generating a response |

---

### Quest System
| Control | Action |
|------|------|
| **Q** | Open Mission / Quest Log |
| **Quest Close Button** | Close quest log |
| **Objective Completion** | Triggered automatically via conversation |
| **Clue Discovery** | Logged automatically based on NPC dialog |

---

### Story & Progression
| Interaction | Behavior |
|------|------|
| **Story Intro Modal** | Appears at game start |
| **ACKNOWLEDGE Button** | Continue into the game |
| **NPC Leads Player** | NPC physically walks to destination |
| **Scripted Events** | Triggered when NPCs arrive at targets |

---

### HUD & World Feedback
| Element | Description |
|------|------|
| **Crosshair** | Indicates interaction focus |
| **Location Display** | Shows current district |
| **Quest Objective HUD** | Displays current goal |
| **Speech Bubbles** | NPC dialog in-world |
| **Follow Indicator** | Shows active NPC guidance |

---

### Settings & Game State
| Control | Action |
|------|------|
| **ESC (outside chat)** | Unlock pointer / pause interaction |
| **Settings Panel (UI)** | Toggle features |
| **TTS Toggle** | Enable / disable spoken NPC dialog |
| **New Game Button** | Reset all progress |
| **Confirmation Modal** | Prevents accidental resets |

---

### Audio / Text-to-Speech
| Feature | Behavior |
|------|------|
| **Edge TTS Server** | Used if running locally |
| **Piper TTS** | Optional fallback |
| **Browser TTS** | Automatic fallback if servers unavailable |
| **NPC Voice Profiles** | Unique voice behavior per character |

---

## Technical Overview

- **Engine:** Three.js
- **Controls:** PointerLockControls
- **AI Backend:** Ollama (local)
- **TTS Backend:** Edge TTS (Flask server)
- **Persistence:** `localStorage`
- **Networking:** Localhost only
- **Security:** No secrets, keys, or PII

---

## Running the Project

### Requirements
- Modern browser (Chrome / Edge recommended)
- Local Ollama instance
- Optional: Edge TTS server (`tts_server.py`)

### Optional TTS Server
```bash
pip install edge-tts flask flask-cors
python tts_server.py
