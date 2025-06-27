import GameManager from "#test/testUtils/gameManager";
import Phaser from "phaser";
import type BattleScene from "#app/battle-scene";
import { BiomeId } from "#enums/biome-id";
import paths from "#test/paths.json";

let phaserGame: Phaser.Game;
let game: GameManager;
let scene: BattleScene;

phaserGame = new Phaser.Game({
    type: Phaser.HEADLESS,
});

const outputElement = document.getElementById('output') as HTMLPreElement;

const logOutput = (message: string) => {
    console.log(message);
    outputElement.textContent += message + '\n';
};

const generateSeed = (length: number): string => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const runHunt = async () => {
    logOutput("Starting Hunt...");
    let pokemonToHunt = ["Lugia"];
    pokemonToHunt = pokemonToHunt.map(name => name.toLowerCase());
    const biomesToHunt: (keyof typeof BiomeId)[] = ["SEA"];

    const wavesAndBiomesToHunt: { wave: number; biome: BiomeId }[] = [];

    for (const waveRange in paths) {
        const biomesInWave = paths[waveRange as keyof typeof paths] as (keyof typeof BiomeId)[];
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
                logOutput(`${seed} ${foundPokemon} ${wave} ${BiomeId[biome]}`);
                pokemonFound = true;
                break;
            }

            game.phaseInterceptor.restoreOg();
        }
    }
    logOutput("Hunt finished.");
};

const runMain = async () => {
    logOutput("Starting Main...");
    const seed = "iWOd4X3uZtBNTU0RaI7kyxut";
    const results: { wave: number; biome: string; data: string }[] = [];

    for (let wave = 1; wave <= 200; wave++) {
        const waveKey = Object.keys(paths).find((key) => {
            const [min, max] = key.split("-").map(Number);
            return wave >= min && wave <= max;
        });

        if (!waveKey) {
            continue;
        }

        const biomes = paths[waveKey as keyof typeof paths];

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

            results.push({ wave, biome, data });
            logOutput(`Wave: ${wave}, Biome: ${biome}, Data: ${data}`);

            game.phaseInterceptor.restoreOg();
        }
    }
    logOutput("Main finished.");
    logOutput(JSON.stringify(results, null, 2));
};


document.getElementById('runHunt')?.addEventListener('click', runHunt);
document.getElementById('runMain')?.addEventListener('click', runMain);