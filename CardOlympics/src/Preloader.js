import * as Phaser from 'phaser';
import { CARD_DATABASE } from './cardsConfig';


export class Preloader extends Phaser.Scene {
    constructor() {
        super({
            key: 'Preloader'
        });
    }

    preload() {
        this.load.setPath("assets/");

        this.load.image("volume-icon", "ui/volume-icon.png");
        this.load.image("volume-icon_off", "ui/volume-icon_off.png");

        this.load.audio("sfx_card_draw", "audio/sfx_card_draw.wav");
        this.load.audio("sfx_card_place", "audio/sfx_card_place.wav");
        this.load.audio("sfx_card_select", "audio/sfx_card_select.wav");
        this.load.audio("sfx_starting_gun", "audio/sfx_starting_gun.wav");
        this.load.audio("sfx_step_1", "audio/sfx_step_1.wav");
        this.load.audio("sfx_step_2", "audio/sfx_step_2.wav");
        this.load.image("background");
        this.load.image("card-back", "cards/card-back.png");

        // Dynamic loading based on config
        CARD_DATABASE.forEach(card => {
            this.load.image(card.texture, `cards/${card.texture}.png`);
        });

        // Load new game sprites
        this.load.spritesheet("card-backdrops", "sprites/spr_card.png", { frameWidth: 128, frameHeight: 192 });
        this.load.image("button-9slice", "sprites/spr_button_9slice.png");
        this.load.image("bg-9slice", "sprites/spr_bg_9slice_1.png");
        this.load.image("textframe-9slice", "sprites/spr_textframe_9slice.png");

        this.load.image("heart", "ui/heart.png");
    }

    create() {
        this.scene.start("DeckBuilder");
    }
}
