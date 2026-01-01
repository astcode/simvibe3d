/**
 * SIMVIBE 3D - Procedural Cyberpunk City Generator
 */

import * as THREE from 'three';

export class CityGenerator {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.neonLights = [];
    }

    async generate() {
        this.createGround();
        this.createBuildings();
        this.createStreetLights();
        this.createNeonSigns();
        this.createStoryLocations();
        this.createSkybox();
    }

    createStoryLocations() {
        // Secret entrance to the data center (The Oracle leads here)
        this.createSecretEntrance(0, -40);

        // Add some landmark buildings at key NPC meeting spots
        this.createLandmark(8, -5, 'Zara\'s Corner', 0x00f5ff);
        this.createLandmark(-15, 12, 'The Broker\'s Den', 0xff00ff);
        this.createLandmark(20, 25, 'Nova\'s Hideout', 0xff2d95);
        this.createLandmark(-25, -20, 'Sparks Garage', 0x00ff66);
        this.createLandmark(35, 5, 'Oracle\'s Sanctuary', 0xffaa00);
    }

    createSecretEntrance(x, z) {
        const group = new THREE.Group();

        // Underground entrance structure
        const entranceGeo = new THREE.BoxGeometry(6, 3, 6);
        const entranceMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            roughness: 0.6,
            metalness: 0.4
        });
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.y = 1.5;
        group.add(entrance);

        // Glowing door frame
        const frameMat = new THREE.MeshBasicMaterial({ color: 0xff2d95 });

        // Door opening (dark)
        const doorGeo = new THREE.BoxGeometry(2, 2.5, 0.1);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.25, 3.01);
        group.add(door);

        // Door frame pieces
        const frameGeo = new THREE.BoxGeometry(0.15, 2.8, 0.2);
        const leftFrame = new THREE.Mesh(frameGeo, frameMat);
        leftFrame.position.set(-1.1, 1.4, 3.05);
        group.add(leftFrame);

        const rightFrame = new THREE.Mesh(frameGeo, frameMat);
        rightFrame.position.set(1.1, 1.4, 3.05);
        group.add(rightFrame);

        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.2), frameMat);
        topFrame.position.set(0, 2.75, 3.05);
        group.add(topFrame);

        // Pulsing warning light
        const warningLight = new THREE.PointLight(0xff2d95, 2, 15);
        warningLight.position.set(0, 3.5, 3);
        group.add(warningLight);

        // Ambient glow from inside
        const interiorLight = new THREE.PointLight(0x00f5ff, 1, 8);
        interiorLight.position.set(0, 1, 0);
        group.add(interiorLight);

        // Holographic sign
        const signCanvas = document.createElement('canvas');
        const ctx = signCanvas.getContext('2d');
        signCanvas.width = 256;
        signCanvas.height = 64;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, signCanvas.width, signCanvas.height);
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2d95';
        ctx.fillText('⚠ RESTRICTED ACCESS ⚠', 128, 40);

        const signTexture = new THREE.CanvasTexture(signCanvas);
        const signMat = new THREE.SpriteMaterial({ map: signTexture, transparent: true });
        const sign = new THREE.Sprite(signMat);
        sign.position.set(0, 4.5, 3);
        sign.scale.set(4, 1, 1);
        group.add(sign);

        // Stairs going down
        const stairMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a });
        for (let i = 0; i < 5; i++) {
            const stair = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.3, 0.8),
                stairMat
            );
            stair.position.set(0, -0.15 - i * 0.3, 2 - i * 0.8);
            group.add(stair);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Store for potential interaction
        group.userData = { type: 'story_location', name: 'Secret Entrance' };
    }

    createLandmark(x, z, name, color) {
        // Small glowing pillar/marker at important locations
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
        const pillarMat = new THREE.MeshBasicMaterial({ color: color });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(x, 0.25, z);
        this.scene.add(pillar);

        // Glowing ring around base
        const ringGeo = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: color });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(x, 0.05, z);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // Small light
        const light = new THREE.PointLight(color, 0.5, 5);
        light.position.set(x, 1, z);
        this.scene.add(light);
    }

    createGround() {
        // Main ground plane - brighter for visibility
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a35,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Road network
        this.createRoads();
    }

    createRoads() {
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x3a3a40,
            roughness: 0.85
        });

        // Main roads (grid pattern)
        const roadWidth = 8;
        const gridSize = 40;

        for (let i = -2; i <= 2; i++) {
            // Horizontal roads
            const hRoad = new THREE.Mesh(
                new THREE.PlaneGeometry(200, roadWidth),
                roadMat
            );
            hRoad.rotation.x = -Math.PI / 2;
            hRoad.position.set(0, 0.01, i * gridSize);
            this.scene.add(hRoad);

            // Vertical roads
            const vRoad = new THREE.Mesh(
                new THREE.PlaneGeometry(roadWidth, 200),
                roadMat
            );
            vRoad.rotation.x = -Math.PI / 2;
            vRoad.position.set(i * gridSize, 0.01, 0);
            this.scene.add(vRoad);

            // Road markings
            this.addRoadMarkings(i * gridSize, 'horizontal');
            this.addRoadMarkings(i * gridSize, 'vertical');
        }
    }

    addRoadMarkings(position, direction) {
        const markingMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const markingGeo = new THREE.PlaneGeometry(3, 0.3);

        for (let j = -25; j <= 25; j++) {
            const marking = new THREE.Mesh(markingGeo, markingMat);
            marking.rotation.x = -Math.PI / 2;
            if (direction === 'horizontal') {
                marking.position.set(j * 4, 0.02, position);
            } else {
                marking.rotation.z = Math.PI / 2;
                marking.position.set(position, 0.02, j * 4);
            }
            this.scene.add(marking);
        }
    }

    createBuildings() {
        const gridSize = 40;
        const buildingSpacing = 15;

        // Building materials palette
        const materials = this.createBuildingMaterials();

        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                // Skip center area (player spawn)
                if (Math.abs(x) <= 0 && Math.abs(z) <= 0) continue;

                // 4 buildings per block
                const blockX = x * gridSize;
                const blockZ = z * gridSize;

                const positions = [
                    [blockX - buildingSpacing / 2, blockZ - buildingSpacing / 2],
                    [blockX + buildingSpacing / 2, blockZ - buildingSpacing / 2],
                    [blockX - buildingSpacing / 2, blockZ + buildingSpacing / 2],
                    [blockX + buildingSpacing / 2, blockZ + buildingSpacing / 2]
                ];

                positions.forEach(([px, pz]) => {
                    if (Math.random() > 0.2) {
                        this.createBuilding(px, pz, materials);
                    }
                });
            }
        }
    }

    createBuildingMaterials() {
        return {
            dark: new THREE.MeshStandardMaterial({
                color: 0x3a3a4a, roughness: 0.7, metalness: 0.3
            }),
            glass: new THREE.MeshStandardMaterial({
                color: 0x4a5a7a, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.9
            }),
            concrete: new THREE.MeshStandardMaterial({
                color: 0x5a5a5a, roughness: 0.9, metalness: 0.1
            }),
            neonFrame: new THREE.MeshStandardMaterial({
                color: 0x3a3a3a, roughness: 0.5, metalness: 0.5
            })
        };
    }

    createBuilding(x, z, materials) {
        const height = 15 + Math.random() * 60;
        const width = 6 + Math.random() * 8;
        const depth = 6 + Math.random() * 8;

        // Main building body
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const matArray = [materials.dark, materials.glass, materials.concrete];
        const material = matArray[Math.floor(Math.random() * matArray.length)].clone();

        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        this.buildings.push(building);

        // Add windows
        this.addBuildingWindows(building, width, height, depth);

        // Add neon accents
        if (Math.random() > 0.5) {
            this.addBuildingNeon(building, width, height, depth);
        }

        // Add rooftop details
        this.addRooftopDetails(building, width, height, depth);
    }

    addBuildingWindows(building, width, height, depth) {
        const windowMat = new THREE.MeshBasicMaterial({
            color: 0x334455,
            transparent: true,
            opacity: 0.8
        });

        const litWindowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44
        });

        const windowWidth = 1.2;
        const windowHeight = 1.5;
        const floorHeight = 4;
        const floors = Math.floor(height / floorHeight);

        for (let floor = 1; floor < floors; floor++) {
            const y = floor * floorHeight - height / 2 + 1;

            // Front and back windows
            for (let wx = -width / 2 + 2; wx < width / 2 - 1; wx += 2.5) {
                const isLit = Math.random() > 0.6;
                const mat = isLit ? litWindowMat : windowMat;

                // Front
                const wf = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHeight), mat);
                wf.position.set(building.position.x + wx, y + height / 2, building.position.z + depth / 2 + 0.01);
                this.scene.add(wf);

                // Back
                const wb = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHeight), mat);
                wb.position.set(building.position.x + wx, y + height / 2, building.position.z - depth / 2 - 0.01);
                wb.rotation.y = Math.PI;
                this.scene.add(wb);
            }
        }
    }

    addBuildingNeon(building, width, height, depth) {
        const colors = [0x00f5ff, 0xff00ff, 0xff2d95, 0x00ff66, 0xff6600];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Neon edge lights
        const neonMat = new THREE.MeshBasicMaterial({ color: color });
        const tubeRadius = 0.08;

        // Vertical neon strips on corners
        const stripHeight = Math.min(height * 0.6, 30);
        const stripGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, stripHeight, 8);

        const corners = [
            [width / 2, depth / 2],
            [-width / 2, depth / 2],
            [width / 2, -depth / 2],
            [-width / 2, -depth / 2]
        ];

        corners.forEach(([cx, cz]) => {
            if (Math.random() > 0.5) {
                const strip = new THREE.Mesh(stripGeo, neonMat);
                strip.position.set(
                    building.position.x + cx,
                    height - stripHeight / 2,
                    building.position.z + cz
                );
                this.scene.add(strip);

                // Add point light
                const light = new THREE.PointLight(color, 2, 15);
                light.position.copy(strip.position);
                this.scene.add(light);
                this.neonLights.push(light);
            }
        });
    }

    addRooftopDetails(building, width, height, depth) {
        // AC units, antennas, etc.
        const detailMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // AC unit
        if (Math.random() > 0.3) {
            const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.5), detailMat);
            ac.position.set(
                building.position.x + (Math.random() - 0.5) * width * 0.5,
                height + 0.5,
                building.position.z + (Math.random() - 0.5) * depth * 0.5
            );
            this.scene.add(ac);
        }

        // Antenna
        if (Math.random() > 0.6) {
            const antenna = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 5, 8),
                detailMat
            );
            antenna.position.set(building.position.x, height + 2.5, building.position.z);
            this.scene.add(antenna);

            // Red warning light
            const warningLight = new THREE.PointLight(0xff0000, 0.5, 10);
            warningLight.position.set(building.position.x, height + 5, building.position.z);
            this.scene.add(warningLight);
        }
    }

    createStreetLights() {
        const gridSize = 40;
        const lightColor = 0xff9944;

        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                const px = x * gridSize + 4;
                const pz = z * gridSize + 4;
                this.createStreetLight(px, pz, lightColor);
            }
        }
    }

    createStreetLight(x, z, color) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 6, 8), poleMat);
        pole.position.set(x, 3, z);
        this.scene.add(pole);

        // Arm
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), poleMat);
        arm.position.set(x - 1, 6, z);
        this.scene.add(arm);

        // Light fixture
        const fixture = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8),
            new THREE.MeshBasicMaterial({ color: color })
        );
        fixture.position.set(x - 2, 5.8, z);
        this.scene.add(fixture);

        // Actual light
        const light = new THREE.PointLight(color, 1, 20);
        light.position.set(x - 2, 5.5, z);
        this.scene.add(light);
    }

    createNeonSigns() {
        const signs = [
            { text: 'CYBER', color: 0x00f5ff },
            { text: 'NEON', color: 0xff00ff },
            { text: 'ZONE', color: 0xff2d95 },
            { text: '24/7', color: 0x00ff66 }
        ];

        // Place signs on random buildings
        this.buildings.slice(0, 8).forEach((building, i) => {
            if (Math.random() > 0.5) {
                const sign = signs[i % signs.length];
                this.createNeonSign(building, sign.text, sign.color);
            }
        });
    }

    createNeonSign(building, text, color) {
        const signMat = new THREE.MeshBasicMaterial({ color: color });
        const signGeo = new THREE.BoxGeometry(4, 1.5, 0.2);

        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(
            building.position.x,
            building.position.y + 3,
            building.position.z + 4
        );
        this.scene.add(sign);

        // Glow light
        const glow = new THREE.PointLight(color, 2, 10);
        glow.position.copy(sign.position);
        glow.position.z += 1;
        this.scene.add(glow);
    }

    createSkybox() {
        // Brighter gradient sky
        const skyGeo = new THREE.SphereGeometry(400, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x1a1a40) },
                bottomColor: { value: new THREE.Color(0x4a2a5a) },
                offset: { value: 20 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }
}
