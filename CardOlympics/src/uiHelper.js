import * as Phaser from 'phaser';

/**
 * Returns absolute coordinates based on screen percentages.
 * Helps decouple positions from hardcoded pixel values for relative layouts.
 */
export function getRelativePos(scene, pctX, pctY) {
    const width = scene.sys.game.scale.width;
    const height = scene.sys.game.scale.height;
    return {
        x: Math.round(width * pctX),
        y: Math.round(height * pctY)
    };
}

/**
 * Enables interactive dragging on a game object to test and discover ideal positions.
 * 
 * How to use:
 * 1. Call this on any container or game object (e.g. `enableLayoutDebugger(this, this.startBtn, 'StartButton')`).
 * 2. Run the game, open the browser developer console (F12).
 * 3. Drag the element around. The console will log its x and y coordinates.
 * 
 * @param {Phaser.Scene} scene - The active scene
 * @param {Phaser.GameObjects.GameObject} gameObject - The Phaser object or container to make draggable
 * @param {string} label - A name used in the console logs
 */
export function enableLayoutDebugger(scene, gameObject, label) {
    // If it's a container, make sure child elements don't block dragging
    gameObject.setInteractive(new Phaser.Geom.Rectangle(0, 0, gameObject.width || 200, gameObject.height || 100), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(gameObject);

    // Visual feedback during debug mode
    const debugText = scene.add.text(0, -15, `[DEBUG: ${label}]`, {
        fontSize: '9px',
        color: '#ff4d4d',
        backgroundColor: '#000000',
        padding: 2
    });
    
    if (gameObject.add) {
        gameObject.add(debugText);
    }

    gameObject.on('drag', (pointer, dragX, dragY) => {
        gameObject.x = dragX;
        gameObject.y = dragY;
        console.log(`%c[Layout Debug] ${label} -> x: ${Math.round(dragX)}, y: ${Math.round(dragY)}`, 'color: #ff4d4d; font-weight: bold;');
    });

    // Make the cursor show up as grab-hands when hovering
    gameObject.on('pointerover', () => {
        scene.input.setDefaultCursor('grab');
    });
    
    gameObject.on('pointerout', () => {
        scene.input.setDefaultCursor('default');
    });
    
    gameObject.on('dragend', () => {
        scene.input.setDefaultCursor('default');
    });
}

/**
 * Automatically layout an array of game objects evenly along a horizontal row.
 * @param {Array<Phaser.GameObjects.GameObject>} items
 * @param {number} startX
 * @param {number} startY
 * @param {number} spacing
 */
export function alignHorizontal(items, startX, startY, spacing) {
    items.forEach((item, index) => {
        if (!item) return;
        item.x = startX + index * spacing;
        item.y = startY;
    });
}
