import * as Phaser from 'phaser';
import { calculateRunnerStats, CARD_FRAME_MAP } from './cardsConfig';

export class Race extends Phaser.Scene {
    constructor() {
        super({ key: 'Race' });
    }

    init() {
        this.runners = this.registry.get('runners');
        this.qualificationTarget = this.registry.get('qualificationTarget');
        this.round = this.registry.get('round');

        // Debug mode checks
        this.isDebugMode = this.registry.get('isDebugMode') || false;
        this.timeScale = this.isDebugMode ? 0.6 : 1.0; // Slow down initial race during debug!

        // Track variables
        this.trackLength = this.isDebugMode ? 8000 : 4000; // 800m during debugging, 400m normally
        this.isRaceActive = false;
        this.raceFinished = false;
        this.finishOrder = []; // Track placement order

        // Setup Player Team State
        this.playerTeam = {
            name: "PLAYER",
            distance: 0,
            speed: 0,
            activeLeg: 0,
            stamina: this.runners[0].finalStats.stamina,
            stats: this.runners[0].finalStats,
            equippedCards: this.runners[0].equippedCards,
            usedActives: new Set(), // Track indices of spent active cards for current leg
            activeEffects: {
                speedBoost: 0,
                slowed: false,
                lastGaspActive: false
            }
        };

        // Setup AI Teams (3 opponents)
        this.aiTeams = [];
        const aiNames = ["USA", "JAM", "GBR"];
        const colors = [0xe74c3c, 0xf1c40f, 0x9b59b6];

        for (let i = 0; i < 3; i++) {
            // AI runners have slightly randomized stats scaling with round number
            const roundMultiplier = 1 + (this.round - 1) * 0.08;
            const aiRunners = Array.from({ length: 4 }).map((_, leg) => {
                const baseSpeed = (120 + Math.random() * 40) * roundMultiplier;
                const baseAccel = (110 + Math.random() * 40) * roundMultiplier;
                const baseStamina = (110 + Math.random() * 40) * roundMultiplier;
                const baseEndurance = baseSpeed * (0.7 + Math.random() * 0.1);

                return {
                    stats: {
                        speed: Math.min(256, baseSpeed),
                        acceleration: Math.min(256, baseAccel),
                        stamina: Math.min(256, baseStamina),
                        endurance: Math.min(256, baseEndurance)
                    }
                };
            });

            this.aiTeams.push({
                id: `ai-${i}`,
                name: aiNames[i],
                color: colors[i],
                distance: 0,
                speed: 0,
                activeLeg: 0,
                stamina: aiRunners[0].stats.stamina,
                runners: aiRunners,
                stats: aiRunners[0].stats,
                activeEffects: {
                    speedBoost: 0,
                    slowed: false
                },
                nextAiActionTime: 1000 + Math.random() * 2000 // when AI triggers their burst
            });
        }
        console.log(this.playerTeam, this.aiTeams);

        // Particle group for dust trails
        this.particles = [];
    }

    create() {
        // Draw Track background and lanes
        this.createTrack();

        // Create Athlete visual objects
        this.createAthletes();

        // Bottom HUD Panel
        this.createHUD();

        // Start Countdown Sequence
        this.startCountdown();

        // Keyboard debug speed controls
        if (this.input && this.input.keyboard) {
            this.input.keyboard.on('keydown-UP', () => {
                this.timeScale = Math.min(3.0, this.timeScale + 0.25);
                this.createFloaterText(`SPEED: ${this.timeScale.toFixed(2)}x`, 0x2ecc71);
            });
            this.input.keyboard.on('keydown-DOWN', () => {
                this.timeScale = Math.max(0.25, this.timeScale - 0.25);
                this.createFloaterText(`SPEED: ${this.timeScale.toFixed(2)}x`, 0xe74c3c);
            });
        }
    }

    createTrack() {
        const totalWidth = this.trackLength + 500;
        // Dark track area
        this.add.rectangle(0, 50, totalWidth, 380, 0x2c3e50).setOrigin(0);

        // Draw Lanes (4 lanes)
        this.laneY = [110, 190, 270, 350];

        // Draw Lane dividers
        for (let i = 0; i <= 4; i++) {
            const y = 70 + i * 80;
            const line = this.add.rectangle(totalWidth / 2, y, totalWidth, 2, 0x7f8c8d);
        }

        // Zone Markings
        // Start line
        this.add.rectangle(150, 230, 8, 320, 0xffffff);
        this.add.text(150, 60, "START", { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);

        // Leg pass zones (e.g. 1000px passes for 4000px length, 2000px passes for 8000px length)
        const legDistance = this.trackLength / 4;
        for (let leg = 1; leg <= 3; leg++) {
            const x = 150 + leg * legDistance;
            this.add.rectangle(x, 230, 4, 320, 0xf1c40f, 0.5);
            this.add.text(x, 60, `${leg * (this.trackLength / 40)}m PASS`, { fontSize: '10px', color: '#f1c40f' }).setOrigin(0.5);
        }

        // Finish Line
        this.finishLineX = 150 + this.trackLength;
        const finishLine = this.add.grid(this.finishLineX, 230, 20, 320, 10, 10, 0xffffff, 1, 0x000000);
        this.add.text(this.finishLineX, 60, "FINISH", { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    }

    createAthletes() {
        // Player runner sprite (Leg 1)
        this.playerSprite = this.add.container(150, this.laneY[0]);
        const pCircle = this.add.circle(0, 0, 18, 0x1abc9c).setStrokeStyle(2, 0xffffff);
        const pTxt = this.add.text(0, 0, "P", { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
        const pBaton = this.add.rectangle(12, 0, 10, 4, 0xf1c40f);
        this.playerSprite.add([pCircle, pTxt, pBaton]);

        // Name tag above runner
        this.playerNameTag = this.add.text(150, this.laneY[0] - 30, this.runners[0].name, {
            fontSize: '11px',
            color: '#ecf0f1',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // AI runner sprites
        this.aiSprites = [];
        this.aiNameTags = [];

        this.aiTeams.forEach((team, index) => {
            const y = this.laneY[index + 1];
            const sprite = this.add.container(150, y);
            const aCircle = this.add.circle(0, 0, 18, team.color).setStrokeStyle(1, 0xffffff);
            const aTxt = this.add.text(0, 0, team.name.substring(0, 1), { fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
            const aBaton = this.add.rectangle(12, 0, 10, 4, 0xf1c40f);
            sprite.add([aCircle, aTxt, aBaton]);

            this.aiSprites.push(sprite);

            const nameTag = this.add.text(150, y - 30, `${team.name} (1)`, {
                fontSize: '11px',
                color: '#bdc3c7'
            }).setOrigin(0.5);
            this.aiNameTags.push(nameTag);
        });

        // Set camera bounds & follow player
        this.cameras.main.setBounds(0, 0, this.trackLength + 500, 640);
        this.cameras.main.scrollX = 0;
    }

    createHUD() {
        // Bottom Panel Background (fixed relative to camera)
        this.hudPanel = this.add.container(0, 450).setScrollFactor(0);

        // 9-slice panel background
        const bg = this.add.nineslice(0, 0, 'bg-9slice', null, this.sys.game.scale.width, 190, 16, 16, 16, 16)
            .setOrigin(0);
        this.hudPanel.add(bg);

        // Runner Profile HUD
        this.hudRunnerName = this.add.text(30, 20, "", { fontSize: '18px', fontStyle: 'bold', color: '#00d2d3' });
        this.hudRunnerLeg = this.add.text(30, 42, "", { fontSize: '11px', color: '#7f8c8d' });
        this.hudPanel.add([this.hudRunnerName, this.hudRunnerLeg]);

        // Speed & Stamina Bars
        this.hudPanel.add(this.add.text(30, 65, "SPEED", { fontSize: '10px', color: '#95a5a6' }));
        this.speedBarBg = this.add.rectangle(100, 65, 150, 12, 0x2c3e50).setOrigin(0);
        this.speedBarFill = this.add.rectangle(100, 65, 0, 12, 0x2ecc71).setOrigin(0);
        this.speedValText = this.add.text(260, 64, "0", { fontSize: '11px', fontFamily: 'monospace', color: '#bdc3c7' });

        this.hudPanel.add(this.add.text(30, 85, "STAMINA", { fontSize: '10px', color: '#95a5a6' }));
        this.staminaBarBg = this.add.rectangle(100, 85, 150, 12, 0x2c3e50).setOrigin(0);
        this.staminaBarFill = this.add.rectangle(100, 85, 0, 12, 0xe74c3c).setOrigin(0);
        this.staminaValText = this.add.text(260, 84, "0", { fontSize: '11px', fontFamily: 'monospace', color: '#bdc3c7' });

        this.hudPanel.add([this.speedBarBg, this.speedBarFill, this.speedValText, this.staminaBarBg, this.staminaBarFill, this.staminaValText]);

        // Active Cards Section Title
        this.activeCardsTitle = this.add.text(420, 20, "ACTIVE CARDS (CLICK TO PLAY)", { fontSize: '11px', fontStyle: 'bold', color: '#ff9f43' });
        this.hudPanel.add(this.activeCardsTitle);

        // Set up slots for Active cards
        this.activeCardButtons = [];
        this.updateHUDValues();
    }

    updateHUDValues() {
        const leg = this.playerTeam.activeLeg;
        const runner = this.runners[leg];

        this.hudRunnerName.setText(runner.name);
        this.hudRunnerLeg.setText(`${runner.role} — Leg ${leg + 1}`);

        // Redraw Active cards
        this.activeCardButtons.forEach(btn => btn.destroy());
        this.activeCardButtons = [];

        const startX = 420;
        const spacingX = 75;
        const startY = 45;

        // Render card buttons for any "active" cards in runner's deck
        this.playerTeam.equippedCards.forEach((card, index) => {
            if (!card) return;

            const btnContainer = this.add.container(startX + index * spacingX, startY);
            this.activeCardButtons.push(btnContainer);
            this.hudPanel.add(btnContainer);

            const isSpent = this.playerTeam.usedActives.has(index);

            // Card background using spritesheet frame
            const frameIndex = CARD_FRAME_MAP[card.type] ?? 0;
            const btnBg = this.add.sprite(0, 0, 'card-backdrops', frameIndex)
                .setOrigin(0)
                .setDisplaySize(65, 80)
                .setInteractive();
            if (isSpent) {
                btnBg.setTint(0x555555); // Darken/Spent tint
            }
            btnContainer.add(btnBg);

            // Label with text outlines for readability over texture background
            const shortName = card.name.substring(0, 10);
            const label = this.add.text(32, 12, shortName, {
                fontSize: '9px',
                fontStyle: 'bold',
                align: 'center',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            const typeLabel = this.add.text(32, 28, card.type.toUpperCase(), {
                fontSize: '7px',
                color: '#ecf0f1',
                stroke: '#000000',
                strokeThickness: 1.5
            }).setOrigin(0.5);
            btnContainer.add([label, typeLabel]);

            // Interactive hover events (scaling, depth lift, and tooltip)
            btnBg.on('pointerover', () => {
                btnContainer.setScale(1.25);
                btnContainer.setDepth(100);

                // Position tooltip above the card relative to screen coordinates
                const worldX = startX + index * spacingX;
                const worldY = 450 + startY; // 450 is HUD panel Y position, startY is local offset
                this.showTooltip(card, worldX, worldY);

                if (card.type === 'active' && !isSpent) {
                    btnBg.setTint(0xbdc3c7);
                }
            });

            btnBg.on('pointerout', () => {
                btnContainer.setScale(1);
                btnContainer.setDepth(1);
                this.hideTooltip();

                if (card.type === 'active' && !isSpent) {
                    btnBg.setTint(0xffffff);
                } else if (isSpent) {
                    btnBg.setTint(0x555555);
                }
            });

            if (card.type === 'active') {
                const actionLabel = this.add.text(32, 50, isSpent ? "SPENT" : "USE", {
                    fontSize: '9px',
                    fontStyle: 'bold',
                    color: isSpent ? '#555' : '#f1c40f',
                    stroke: '#000000',
                    strokeThickness: 1.5
                }).setOrigin(0.5);
                btnContainer.add(actionLabel);

                if (!isSpent && this.isRaceActive) {
                    btnBg.on('pointerdown', () => {
                        this.hideTooltip();
                        this.useActiveCard(card, index);
                    });
                }
            } else {
                // Passive card indicator (Unclickable, but visible)
                const actionLabel = this.add.text(32, 50, "PASSIVE", {
                    fontSize: '8px',
                    color: '#2ecc71',
                    stroke: '#000000',
                    strokeThickness: 1.5
                }).setOrigin(0.5);
                btnContainer.add(actionLabel);
            }
        });
    }

    showTooltip(card, cardX, cardY) {
        if (this.tooltip) this.tooltip.destroy();

        // Position above the card, bounded to stay on screen (scrollFactor: 0 because HUD is fixed)
        const tx = Math.max(10, Math.min(this.sys.game.scale.width - 190, cardX - 52));
        const ty = Math.max(10, cardY - 65);

        this.tooltip = this.add.container(tx, ty).setDepth(1000).setScrollFactor(0);

        // Nineslice text frame background
        const bg = this.add.nineslice(0, 0, 'textframe-9slice', null, 180, 60, 16, 16, 16, 16)
            .setOrigin(0);

        const name = this.add.text(12, 10, `${card.name}`, {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ff9f43',
            fontFamily: 'monospace'
        });
        const desc = this.add.text(12, 26, card.description, {
            fontSize: '9px',
            color: '#ffffff',
            wordWrap: { width: 156 },
            fontFamily: 'monospace'
        });

        this.tooltip.add([bg, name, desc]);
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }

    useActiveCard(card, index) {
        this.playerTeam.usedActives.add(index);
        this.updateHUDValues(); // Refresh buttons to spent state

        this.sound.play("sfx_card_place");
        this.cameras.main.shake(200, 0.005);

        // Apply active stats
        const stats = card.stats;
        if (stats.activeEffect === 'boost') {
            this.playerTeam.activeEffects.speedBoost = stats.boostAmount;
            this.time.delayedCall(stats.duration, () => {
                this.playerTeam.activeEffects.speedBoost = 0;
            });
            this.createFloaterText("SPEED BOOST!", 0x2ecc71);
        } else if (stats.activeEffect === 'cheer') {
            this.playerTeam.stamina = Math.min(this.playerTeam.stats.stamina, this.playerTeam.stamina + stats.staminaRestore);
            this.createFloaterText("STAMINA RECOVERED!", 0xe74c3c);
        } else if (stats.activeEffect === 'sabotage') {
            // Apply slow debuff to all AI teams
            this.aiTeams.forEach(ai => {
                ai.activeEffects.slowed = true;
                this.time.delayedCall(stats.duration, () => {
                    ai.activeEffects.slowed = false;
                });
            });
            this.createFloaterText("AI SLOWED DOWN!", 0x3498db);
        } else if (stats.activeEffect === 'draft') {
            // Check if player is behind any AI team
            const playerPos = this.playerTeam.distance;
            const isBehind = this.aiTeams.some(ai => ai.distance > playerPos && ai.distance - playerPos < 400);

            if (isBehind) {
                this.playerTeam.activeEffects.speedBoost = stats.boostAmount;
                this.time.delayedCall(stats.duration, () => {
                    this.playerTeam.activeEffects.speedBoost = 0;
                });
                this.createFloaterText("DRAFT ACCEL!", 0xf1c40f);
            } else {
                this.createFloaterText("NO DRAFT TARGET!", 0x7f8c8d);
            }
        }
    }

    createFloaterText(text, color) {
        const x = this.playerSprite.x;
        const y = this.playerSprite.y - 45;
        const txt = this.add.text(x, y, text, {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#' + color.toString(16).padStart(6, '0')
        }).setOrigin(0.5);

        this.tweens.add({
            targets: txt,
            y: y - 50,
            alpha: 0,
            duration: 1200,
            onComplete: () => txt.destroy()
        });
    }

    startCountdown() {
        const text = this.add.text(this.sys.game.scale.width / 2, 220, "READY", {
            fontSize: '60px',
            fontStyle: 'bold',
            color: '#f1c40f'
        }).setOrigin(0.5).setScrollFactor(0);

        this.sound.play("sfx_card_draw");

        this.time.delayedCall(1000, () => {
            text.setText("SET");
            this.sound.play("sfx_card_draw");

            this.time.delayedCall(1000, () => {
                text.setText("GO!");
                text.setColor("#2ecc71");
                this.sound.play("sfx_starting_gun", { volume: 0.8 });
                this.isRaceActive = true;

                // Enable HUD buttons
                this.updateHUDValues();

                this.tweens.add({
                    targets: text,
                    alpha: 0,
                    scale: 1.5,
                    duration: 500,
                    onComplete: () => text.destroy()
                });
            });
        });
    }

    update(time, delta) {
        if (!this.isRaceActive) return;

        // Play runner footstep sounds
        if (this.playerTeam.speed > 10 && !this.playerTeam.finished) {
            this.stepTimer = (this.stepTimer || 0) + delta;
            const stepInterval = Math.max(80, 25000 / this.playerTeam.speed);
            if (this.stepTimer >= stepInterval) {
                this.stepTimer = 0;
                this.stepToggle = !this.stepToggle;
                this.sound.play(this.stepToggle ? "sfx_step_1" : "sfx_step_2", { volume: 0.1 });
            }
        }

        const dt = (delta / 1000) * this.timeScale;

        // --- UPDATE PLAYER PHYSICS ---
        this.updateTeamPhysics(this.playerTeam, dt);

        // Update visuals
        this.playerSprite.x = 150 + this.playerTeam.distance;
        this.playerNameTag.x = this.playerSprite.x;

        // Spawn dust particles
        if (Math.random() < 0.15 && this.playerTeam.speed > 50) {
            this.spawnDust(this.playerSprite.x - 20, this.playerSprite.y + 15);
        }

        // Camera follow (bounded)
        const maxScrollX = (this.trackLength + 500) - this.sys.game.scale.width;
        const cameraScrollX = Math.min(maxScrollX, Math.max(0, this.playerTeam.distance - 200));
        this.cameras.main.scrollX = cameraScrollX;

        // --- UPDATE AI TEAMS ---
        this.aiTeams.forEach((team, index) => {
            this.updateTeamPhysics(team, dt);

            // Handle AI Random active card bursts
            if (time > team.nextAiActionTime && !this.raceFinished) {
                // Trigger a temporary speed boost to mimic using cards
                team.activeEffects.speedBoost = 50 + Math.random() * 30;
                this.time.delayedCall(1500 + Math.random() * 1000, () => {
                    team.activeEffects.speedBoost = 0;
                });
                team.nextAiActionTime = time + 3000 + Math.random() * 5000;
            }

            const sprite = this.aiSprites[index];
            sprite.x = 150 + team.distance;
            this.aiNameTags[index].x = sprite.x;

            if (Math.random() < 0.15 && team.speed > 50) {
                this.spawnDust(sprite.x - 20, sprite.y + 15);
            }
        });

        // Update dust particles
        this.updateDust();

        // Update HUD display values
        const speedRatio = this.playerTeam.speed / 280;
        this.speedBarFill.width = Math.min(150, 150 * speedRatio);
        this.speedValText.setText(Math.round(this.playerTeam.speed));

        const maxStamina = this.playerTeam.stats.stamina;
        const staminaRatio = Math.max(0, this.playerTeam.stamina / maxStamina);
        this.staminaBarFill.width = 150 * staminaRatio;
        this.staminaValText.setText(Math.round(Math.max(0, this.playerTeam.stamina)));
    }

    updateTeamPhysics(team, dt) {
        if (team.finished) return;

        // Stamina Decay
        if (team.stamina > 0) {
            team.stamina -= dt * 20; // stamina drain rate
        }

        // Target Speed formula
        let baseMaxSpeed = team.stats.speed;
        if (team.stamina <= 0) {
            baseMaxSpeed = team.stats.endurance;
        }

        let targetSpeed = baseMaxSpeed;

        // Apply active effects
        if (team.activeEffects.speedBoost) {
            targetSpeed += team.activeEffects.speedBoost;
        }
        if (team.activeEffects.slowed) {
            targetSpeed *= 0.70; // 30% speed reduction from sabotage card
        }

        // Acceleration interpolation: speed += (targetSpeed - speed) * (acceleration/256) * dt * rate
        const accelNormalized = team.stats.acceleration / 256;
        const lerpSpeed = 5 * accelNormalized;
        team.speed += (targetSpeed - team.speed) * lerpSpeed * dt;

        // Move distance
        team.distance += team.speed * dt * 1.5; // multiplier scales speed to screen pixels

        // Check Baton Pass at legDistance increments
        const legDistance = this.trackLength / 4;
        const nextLegDistance = (team.activeLeg + 1) * legDistance;
        if (team.distance >= nextLegDistance && team.activeLeg < 3) {
            this.executeBatonPass(team);
        }

        // Check Race Finish
        if (team.distance >= this.trackLength) {
            team.distance = this.trackLength;
            team.speed = 0;
            team.finished = true;
            this.finishOrder.push(team.name);

            // Play final leg finish
            this.sound.play("sfx_card_place");

            if (team.name === "PLAYER") {
                this.handlePlayerFinish();
            }
        }
    }

    executeBatonPass(team) {
        team.activeLeg++;

        // Sound and particle effect
        this.sound.play("sfx_card_draw");

        if (team.name === "PLAYER") {
            const newRunner = this.runners[team.activeLeg];
            team.stats = newRunner.finalStats;
            team.stamina = newRunner.finalStats.stamina;
            team.equippedCards = newRunner.equippedCards;
            team.usedActives.clear();
            team.speed = team.speed * 0.3; // drop speed during pass standstill

            // Swap tag
            this.playerNameTag.setText(newRunner.name);

            // HUD refresh
            this.updateHUDValues();
            this.createFloaterText("BATON PASS!", 0xf1c40f);
        } else {
            // AI team pass
            const newRunner = team.runners[team.activeLeg];
            team.stats = newRunner.stats;
            team.stamina = newRunner.stats.stamina;
            team.speed = team.speed * 0.3;
            this.aiNameTags[this.aiTeams.indexOf(team)].setText(`${team.name} (${team.activeLeg + 1})`);
        }
    }

    spawnDust(x, y) {
        const dust = this.add.circle(x, y, 3 + Math.random() * 3, 0xbdc3c7, 0.6);
        this.particles.push({
            obj: dust,
            vx: -30 - Math.random() * 40,
            vy: -10 + Math.random() * 20,
            life: 1.0
        });
    }

    updateDust() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.obj.x += p.vx * 0.016;
            p.obj.y += p.vy * 0.016;
            p.life -= 0.016 * 2.5;
            p.obj.setAlpha(p.life);
            if (p.life <= 0) {
                p.obj.destroy();
                this.particles.splice(i, 1);
            }
        }
    }

    handlePlayerFinish() {
        this.raceFinished = true;
        this.isRaceActive = false;

        // Player placement is based on how many crossed before player
        const playerPlacement = this.finishOrder.indexOf("PLAYER") + 1;

        // Determine if player qualified
        const isQualified = playerPlacement <= this.qualificationTarget;

        this.time.delayedCall(1500, () => {
            this.showResults(playerPlacement, isQualified);
        });
    }

    showResults(placement, isQualified) {
        this.sound.stopAll();

        const resultsOverlay = this.add.container(0, 0).setScrollFactor(0);

        // Dim background
        const fade = this.add.rectangle(0, 0, this.sys.game.scale.width, this.sys.game.scale.height, 0x000000, 0.8).setOrigin(0);
        resultsOverlay.add(fade);

        // Win/loss sound
        if (isQualified) {
            this.sound.play("sfx_starting_gun");
        } else {
            this.sound.play("sfx_card_select");
        }

        // Placement Header
        const placeTxt = this.getPlacementString(placement);
        const header = this.add.text(this.sys.game.scale.width / 2, 180, `${placeTxt} PLACE`, {
            fontSize: '54px',
            fontStyle: 'bold',
            color: isQualified ? '#2ecc71' : '#e74c3c',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
        resultsOverlay.add(header);

        // Qualification status text
        const statusText = isQualified
            ? "QUALIFIED FOR THE NEXT ROUND!"
            : `FAILED TO REACH TOP ${this.qualificationTarget} place`;

        const subheader = this.add.text(this.sys.game.scale.width / 2, 250, statusText, {
            fontSize: '18px',
            color: '#ecf0f1',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
        resultsOverlay.add(subheader);

        // Display full placements list
        this.finishOrder.forEach((name, i) => {
            const rowText = `${i + 1}. ${name} ${name === 'PLAYER' ? '(YOU)' : ''}`;
            const row = this.add.text(this.sys.game.scale.width / 2, 300 + i * 25, rowText, {
                fontSize: '14px',
                color: name === 'PLAYER' ? '#00d2d3' : '#bdc3c7',
                fontFamily: 'monospace'
            }).setOrigin(0.5);
            resultsOverlay.add(row);
        });

        // Action Button using spr_button_9slice
        const btnY = 460;
        const btn = this.add.container(this.sys.game.scale.width / 2, btnY);

        const btnBg = this.add.nineslice(0, 0, 'button-9slice', null, 180, 40, 16, 16, 16, 16)
            .setOrigin(0.5)
            .setInteractive()
            .setTint(isQualified ? 0x27ae60 : 0xc0392b);

        const labelText = isQualified ? "Next Round" : "Try Again";
        const btnText = this.add.text(0, 0, labelText, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        btn.add([btnBg, btnText]);
        resultsOverlay.add(btn);

        btnBg.on('pointerover', () => btnBg.setTint(isQualified ? 0x2ecc71 : 0xe74c3c));
        btnBg.on('pointerout', () => btnBg.setTint(isQualified ? 0x27ae60 : 0xc0392b));

        btnBg.on('pointerdown', () => {
            resultsOverlay.destroy();

            if (isQualified) {
                // Setup next round
                this.setupNextRound();
            } else {
                // Restart from round 1
                this.registry.destroy(); // wipes runner decks & round counter
                this.scene.start('DeckBuilder');
            }
        });
    }

    setupNextRound() {
        const nextRound = this.round + 1;
        this.registry.set('round', nextRound);

        // Adjust qualification target to make it harder
        // E.g. Round 1: Top 4 (everyone), Round 2: Top 3, Round 3: Top 2, Round 4+: 1st place only
        let nextTarget = 4;
        if (nextRound === 2) nextTarget = 3;
        else if (nextRound === 3) nextTarget = 2;
        else nextTarget = 1;
        this.registry.set('qualificationTarget', nextTarget);

        // Mechanics Rule #5: At the start of subsequent rounds, player removes 1 card from 1-4 runners.
        // Let's implement that card discard/replacement flow before they build.
        // We'll set a state flag in the registry to show we need to run "discard mode" first.
        this.registry.set('needsDiscardDraft', true);

        // We also want to strip exactly one card from 1 to 4 runners.
        // We can transition back to DeckBuilder. Inside DeckBuilder init(), we'll detect 'needsDiscardDraft'
        // and prompt the user to select card(s) to discard from their runners, then draw 4 cards.
        this.scene.start('DeckBuilder');
    }

    getPlacementString(placement) {
        if (placement === 1) return "1st";
        if (placement === 2) return "2nd";
        if (placement === 3) return "3rd";
        return `${placement}th`;
    }
}
