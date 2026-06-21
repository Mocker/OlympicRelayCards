import * as Phaser from 'phaser';

export class Card {
    /**
     * @param {object} config
     * @param {Phaser.Scene} config.scene
     * @param {number} config.x
     * @param {number} config.y
     * @param {string} config.frontTexture
     * @param {string} config.cardName
     * @param {object} [config.stats] - Custom gameplay stats (e.g. speed, stamina, luck)
     */
    constructor({ scene, x, y, frontTexture, cardName, stats = {} }) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.frontTexture = frontTexture;
        this.backTexture = 'card-back';
        this.cardName = cardName;
        this.stats = stats;

        this.isFlipping = false;
        this.rotation = { y: 0 };

        // 3D plane setup
        this.gameObject = this.scene.add.plane(this.x, this.y, this.backTexture)
            .setName(this.cardName)
            .setInteractive();

        // Start face-down
        this.gameObject.modelRotationY = 180;
    }

    flip(callbackComplete) {
        if (this.isFlipping) {
            return;
        }

        this.scene.add.tween({
            targets: [this.rotation],
            y: (this.rotation.y === 180) ? 0 : 180,
            ease: Phaser.Math.Easing.Expo.Out,
            duration: 500,
            onStart: () => {
                this.isFlipping = true;
                this.scene.sound.play("card-flip");
                this.scene.tweens.chain({
                    targets: this.gameObject,
                    ease: Phaser.Math.Easing.Expo.InOut,
                    tweens: [
                        {
                            duration: 200,
                            scale: 1.1,
                        },
                        {
                            duration: 300,
                            scale: 1
                        },
                    ]
                });
            },
            onUpdate: () => {
                this.gameObject.rotateY = 180 + this.rotation.y;
                const cardRotation = Math.floor(this.gameObject.rotateY) % 360;
                if ((cardRotation >= 0 && cardRotation <= 90) || (cardRotation >= 270 && cardRotation <= 359)) {
                    this.gameObject.setTexture(this.frontTexture);
                } else {
                    this.gameObject.setTexture(this.backTexture);
                }
            },
            onComplete: () => {
                this.isFlipping = false;
                if (callbackComplete) {
                    callbackComplete();
                }
            }
        });
    }

    destroy() {
        this.scene.add.tween({
            targets: [this.gameObject],
            y: this.gameObject.y - 1000,
            easing: Phaser.Math.Easing.Elastic.In,
            duration: 500,
            onComplete: () => {
                this.gameObject.destroy();
            }
        });
    }
}
