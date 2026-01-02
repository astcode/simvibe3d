/**
 * SIMVIBE 3D - Ollama Service
 * Handles communication with the local Ollama AI API
 */

export class OllamaService {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.model = null; // Will be auto-detected
        this.availableModels = [];
        this.isConnected = false;
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

        // Update UI
        this.updateModelSelector();

        // Update URL input
        const urlInput = document.getElementById('ollama-url');
        if (urlInput) {
            urlInput.value = this.baseUrl;
            // Listen for settings changes
            urlInput.addEventListener('change', (e) => {
                this.baseUrl = e.target.value;
                localStorage.setItem('ollama-url', this.baseUrl);
                this.testConnection(); // Re-test with new URL
            });
        }
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
                this.updateModelSelector(); // Update UI with fresh list
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Ollama connection failed:', error.message);
            console.log('NPCs will use fallback responses. Start Ollama for AI-powered chat.');
            this.isConnected = false;
            this.availableModels = [];
            this.updateModelSelector();
        }
        return false;
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

        // Listen for model changes (ensure listener isn't added multiple times if called repeatedly? 
        // Actually element likely persists. Better to set onchange or remove old listener.
        // For simplicity in this refactor, I'll rely on assignment since typical use is one-time init or rare updates).
        modelSelect.onchange = (e) => {
            this.model = e.target.value;
            localStorage.setItem('ollama-model', this.model);
            console.log(`Switched to model: ${this.model}`);
        };
    }

    async generateResponse(messages) {
        if (!this.isConnected) {
            throw new Error("Ollama not connected");
        }

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
}
