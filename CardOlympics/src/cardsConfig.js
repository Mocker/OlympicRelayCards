// Olympic Card Relay - Card and Runner Configurations

export const CARD_DATABASE = [
    // --- SAFE CARDS (Green) ---
    {
        id: "sprint-safe",
        name: "Sprint",
        texture: "card-0", // maps to assets/cards/card-0.png
        type: "safe",
        description: "Speed +15, Stamina -10. Safe boost.",
        stats: {
            speed: 15,
            acceleration: 0,
            stamina: -10,
            endurance: 0
        }
    },
    {
        id: "jog-safe",
        name: "Steady Jog",
        texture: "card-1", // maps to assets/cards/card-1.png
        type: "safe",
        description: "Speed +8, Stamina -3. Conserve energy.",
        stats: {
            speed: 8,
            acceleration: 0,
            stamina: -3,
            endurance: 0
        }
    },
    {
        id: "breath-safe",
        name: "Catch Breath",
        texture: "card-2", // maps to assets/cards/card-2.png
        type: "safe",
        description: "Recover Stamina +25, Speed -5.",
        stats: {
            speed: -5,
            acceleration: 0,
            stamina: 25,
            endurance: 5
        }
    },
    {
        id: "shoes-safe",
        name: "Spiked Shoes",
        texture: "card-3",
        type: "safe",
        description: "Acceleration +20. Strong start.",
        stats: {
            speed: 0,
            acceleration: 20,
            stamina: 0,
            endurance: 0
        }
    },

    // --- RISKY CARDS (Orange) ---
    {
        id: "dash-risky",
        name: "Adrenaline Dash",
        texture: "card-4",
        type: "risky",
        description: "Speed +30, Stamina -25. Burns fast.",
        stats: {
            speed: 30,
            acceleration: 10,
            stamina: -25,
            endurance: -5
        }
    },
    {
        id: "charge-risky",
        name: "Power Charge",
        texture: "card-5",
        type: "risky",
        description: "Acceleration +50, Stamina -15.",
        stats: {
            speed: 5,
            acceleration: 50,
            stamina: -15,
            endurance: 0
        }
    },
    {
        id: "heavy-risky",
        name: "Pace Setter",
        texture: "card-0", // recycle texture for prototype
        type: "risky",
        description: "Endurance +40, Speed -15.",
        stats: {
            speed: -15,
            acceleration: -5,
            stamina: 10,
            endurance: 40
        }
    },

    // --- DANGEROUS CARDS (Red) ---
    {
        id: "overdrive-danger",
        name: "Overdrive",
        texture: "card-1",
        type: "dangerous",
        description: "Speed +75, Accel +50, Stamina -60, Endurance -50.",
        stats: {
            speed: 75,
            acceleration: 50,
            stamina: -60,
            endurance: -50
        }
    },
    {
        id: "gamble-danger",
        name: "Gambler's Dash",
        texture: "card-2",
        type: "dangerous",
        description: "Speed +90, Stamina -30. 40% chance of stumble.",
        stats: {
            speed: 90,
            acceleration: 20,
            stamina: -30,
            endurance: -10,
            stumbleChance: 0.40
        }
    },
    {
        id: "collapse-danger",
        name: "Last Gasp",
        texture: "card-3",
        type: "dangerous",
        description: "Free sprint for 3s, but -50% Speed after.",
        stats: {
            speed: 100,
            acceleration: 80,
            stamina: -80,
            endurance: -80,
            lastGaspDuration: 3 // active seconds
        }
    },

    // --- ACTIVE CARDS (Blue) ---
    {
        id: "turbo-active",
        name: "Turbo Boost",
        texture: "card-4",
        type: "active",
        description: "Active: Click to gain +60 Speed for 2 seconds.",
        stats: {
            activeEffect: "boost",
            boostAmount: 60,
            duration: 2000
        }
    },
    {
        id: "trip-active",
        name: "Sabotage",
        texture: "card-5",
        type: "active",
        description: "Active: Click to slow nearest opponent by 30% for 2s.",
        stats: {
            activeEffect: "sabotage",
            slowAmount: 0.30,
            duration: 2000
        }
    },
    {
        id: "slipstream-active",
        name: "Drafting",
        texture: "card-0",
        type: "active",
        description: "Active: +35 Speed for 3s if drafting behind opponent.",
        stats: {
            activeEffect: "draft",
            boostAmount: 35,
            duration: 3000
        }
    },
    {
        id: "yell-active",
        name: "Cheer",
        texture: "card-1",
        type: "active",
        description: "Active: Restore 35 Stamina to the runner.",
        stats: {
            activeEffect: "cheer",
            staminaRestore: 35
        }
    }
];

// Base runner stats definitions (scale 1 - 256, starting in middle ~128 with variation)
export const RUNNER_TEMPLATES = [
    {
        id: "runner-1",
        name: "Dash",
        role: "The Sprinter (Leg 1)",
        baseStats: {
            speed: 160,       // Fast
            acceleration: 180, // Quick starter
            stamina: 100,      // Low stamina
            endurance: 110     // Weak recovery
        }
    },
    {
        id: "runner-2",
        name: "Pace",
        role: "The Middle-Distance (Leg 2)",
        baseStats: {
            speed: 130,
            acceleration: 120,
            stamina: 150,      // Steady
            endurance: 115
        }
    },
    {
        id: "runner-3",
        name: "Stamina",
        role: "The Workhorse (Leg 3)",
        baseStats: {
            speed: 110,
            acceleration: 100,
            stamina: 200,      // Deep pool
            endurance: 100
        }
    },
    {
        id: "runner-4",
        name: "Anchor",
        role: "The Finisher (Leg 4)",
        baseStats: {
            speed: 180,       // Top end speed
            acceleration: 130,
            stamina: 110,
            endurance: 120
        }
    }
];

// Helper to calculate final runner stats based on equipped cards
export function calculateRunnerStats(runnerBaseStats, equippedCards) {
    const finalStats = { ...runnerBaseStats };
    
    equippedCards.forEach(card => {
        if (!card || !card.stats) return;
        const s = card.stats;
        if (s.speed) finalStats.speed = Math.max(1, Math.min(256, finalStats.speed + s.speed));
        if (s.acceleration) finalStats.acceleration = Math.max(1, Math.min(256, finalStats.acceleration + s.acceleration));
        if (s.stamina) finalStats.stamina = Math.max(1, Math.min(256, finalStats.stamina + s.stamina));
        if (s.endurance) finalStats.endurance = Math.max(1, Math.min(256, finalStats.endurance + s.endurance));
    });

    return finalStats;
}

// Map card types to spr_card.png spritesheet frames (sorted by risky, safe, dangerous, active)
export const CARD_FRAME_MAP = {
    risky: 0,
    safe: 1,
    dangerous: 2,
    active: 3
};
