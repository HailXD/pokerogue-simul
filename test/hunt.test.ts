import { expect, it } from "vitest";
import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import type BattleScene from "#app/battle-scene";
import { BiomeId } from "#enums/biome-id";
import fs from "fs";

let phaserGame: Phaser.Game;
let game: GameManager;
let scene: BattleScene;

phaserGame = new Phaser.Game({
    type: Phaser.HEADLESS,
});

fs.mkdirSync('output', { recursive: true });

it.only("hunt", async () => {
    const generateSeed = (length: number): string => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    let lugiaFound = false;
    let seed = "";

    while (!lugiaFound) {
        seed = generateSeed(26);
        const wavesToHunt = [50];

        for (const wave of wavesToHunt) {
            game = new GameManager(phaserGame);
            scene = game.scene;
            game.override.seed(seed);
            game.override.startingWave(wave);
            game.override.startingBiome(BiomeId.SEA);

            await game.runToMysteryEncounter();

            const pokemon = scene.currentBattle.enemyParty.map(p => p.name).join(',');

            if (pokemon.toLowerCase().includes("lugia")) {
                const outputPath = 'output/lugia.txt';
                fs.appendFileSync(outputPath, `${seed} ${pokemon} ${wave}\n`);
                lugiaFound = true;
                break;
            }

            game.phaseInterceptor.restoreOg();
        }
    }

    expect(lugiaFound).toBe(true);
}, 30000000);
