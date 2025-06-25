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

const generateSeed = (length: number): string => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

let pokemonToHunt = ["Lugia"];
pokemonToHunt = pokemonToHunt.map(name => name.toLowerCase());
const biomesToHunt: (keyof typeof BiomeId)[] = ["SEA"];

const paths = JSON.parse(fs.readFileSync("test/paths.json", "utf-8"));
const wavesAndBiomesToHunt: { wave: number; biome: BiomeId }[] = [];

it.only("hunt", async () => {
    for (const waveRange in paths) {
        const biomesInWave = paths[waveRange] as (keyof typeof BiomeId)[];
        for (const biome of biomesToHunt) {
            if (biomesInWave.includes(biome)) {
                const wave = parseInt(waveRange.split("-")[1]);
                const biomeId = BiomeId[biome];
                if (biomeId) {
                    wavesAndBiomesToHunt.push({ wave, biome: biomeId });
                }
            }
        }
    }
    console.log(wavesAndBiomesToHunt);
    let pokemonFound = false;
    let seed = "";

    while (!pokemonFound) {
        seed = generateSeed(26);

        for (const { wave, biome } of wavesAndBiomesToHunt) {
            game = new GameManager(phaserGame);
            scene = game.scene;
            game.override.seed(seed);
            game.override.startingWave(wave);
            game.override.startingBiome(biome);

            await game.runToMysteryEncounter();

            const pokemonNames = scene.currentBattle.enemyParty.map(p => p.name);
            const foundPokemon = pokemonNames.find(name =>
                pokemonToHunt.some(huntName => name.toLowerCase().includes(huntName))
            );

            if (foundPokemon) {
                const outputPath = `output/${foundPokemon}.txt`;
                fs.appendFileSync(outputPath, `${seed} ${foundPokemon} ${wave} ${BiomeId[biome]}\n`);
                pokemonFound = true;
                break;
            }

            game.phaseInterceptor.restoreOg();
        }
    }

    expect(pokemonFound).toBe(true);
}, 30000000);
