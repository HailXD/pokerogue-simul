import { expect, it } from "vitest";
import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import type BattleScene from "#app/battle-scene";
import { BiomeId } from "#enums/biome-id";
import { mkdir } from "fs/promises";
import { readFileSync } from 'fs';
import path from "path";
import Database from "better-sqlite3";

const seed = "iWOd4X3uZtBNTU0RaI7kyxut";

let phaserGame: Phaser.Game;
let game: GameManager;
let scene: BattleScene;

const paths: { [key: string]: string[] } = JSON.parse(readFileSync(path.resolve("test", "paths.json"), "utf-8"));

phaserGame = new Phaser.Game({
    type: Phaser.HEADLESS,
});

it("Main", async () => {
    await mkdir(`output`, { recursive: true });
    const db = new Database(path.resolve(`output`, `${seed}.db`));
    db.exec(`
        CREATE TABLE IF NOT EXISTS results (
            wave INTEGER,
            biome TEXT,
            data TEXT,
            PRIMARY KEY (wave, biome)
        )
    `);

    const insert = db.prepare("INSERT OR REPLACE INTO results (wave, biome, data) VALUES (?, ?, ?)");

    for (let wave = 1; wave <= 200; wave++) {
        const waveKey = Object.keys(paths).find((key) => {
            const [min, max] = key.split("-").map(Number);
            return wave >= min && wave <= max;
        });

        if (!waveKey) {
            continue;
        }

        const biomes = paths[waveKey];

        for (const biome of biomes) {
            game = new GameManager(phaserGame);
            scene = game.scene;
            game.override.seed(seed);
            game.override.startingWave(wave);
            game.override.startingBiome(BiomeId[biome as keyof typeof BiomeId]);

            await game.runToMysteryEncounter();

            const data = scene.currentBattle.mysteryEncounter
                ? scene.currentBattle.mysteryEncounter.localizationKey.split('/')[1]
                : scene.currentBattle.enemyParty.map(p => p.name).join(',');

            insert.run(wave, biome, data);

            game.phaseInterceptor.restoreOg();
        }
    }

    db.close();
    expect(true).toBe(true);
}, 3000000);
