export const CARD_DATABASE = [
    { //example cards, can export this from google sheets
        id: "card-0",
        name: "Sprint",
        texture: "card-0",
        type: "speed",
        description: "A quick burst of speed.",
        stats: {
            speedBoost: 15,
            staminaCost: 10,
            luckModifier: 0.0
        }
    },
    {
        id: "card-1",
        name: "Catch Breath",
        texture: "card-1",
        type: "stamina",
        description: "Recover stamina at the cost of a slight speed drop.",
        stats: {
            speedBoost: -3,
            staminaCost: -25, // negative cost = recovery
            luckModifier: 0.0
        }
    }
];