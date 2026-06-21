import { Preloader } from './Preloader';
import { DeckBuilder } from './DeckBuilder';
import { Race } from './Race';
import * as Phaser from 'phaser';

const config = {
    title: 'Card Olympics',
    type: Phaser.AUTO,
    width: 741,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#1e272c',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        Preloader,
        DeckBuilder,
        Race
    ]
};

new Phaser.Game(config);
