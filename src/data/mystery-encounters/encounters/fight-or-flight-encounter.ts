import { MysteryEncounterOptionBuilder } from "#app/data/mystery-encounters/mystery-encounter-option";
import type { EnemyPartyConfig } from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import {
  getRandomEncounterSpecies,
  initBattleWithEnemyConfig,
  leaveEncounterWithoutBattle,
  setEncounterExp,
  setEncounterRewards,
} from "#app/data/mystery-encounters/utils/encounter-phase-utils";
import { STEALING_MOVES } from "#app/data/mystery-encounters/requirements/requirement-groups";
import type Pokemon from "#app/field/pokemon";
import { ModifierTier } from "#enums/modifier-tier";
import type { ModifierTypeOption } from "#app/modifier/modifier-type";
import { getPlayerModifierTypeOptions, regenerateModifierPoolThresholds } from "#app/modifier/modifier-type";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { MysteryEncounterType } from "#enums/mystery-encounter-type";
import { globalScene } from "#app/global-scene";
import type MysteryEncounter from "#app/data/mystery-encounters/mystery-encounter";
import { MysteryEncounterBuilder } from "#app/data/mystery-encounters/mystery-encounter";
import { MoveRequirement } from "#app/data/mystery-encounters/mystery-encounter-requirements";
import { MysteryEncounterTier } from "#enums/mystery-encounter-tier";
import { MysteryEncounterOptionMode } from "#enums/mystery-encounter-option-mode";
import {
  getEncounterPokemonLevelForWave,
  getSpriteKeysFromPokemon,
  STANDARD_ENCOUNTER_BOOSTED_LEVEL_MODIFIER,
} from "#app/data/mystery-encounters/utils/encounter-pokemon-utils";
import PokemonData from "#app/system/pokemon-data";
import { BattlerTagType } from "#enums/battler-tag-type";
import { queueEncounterMessage } from "#app/data/mystery-encounters/utils/encounter-dialogue-utils";
import { randSeedInt } from "#app/utils/common";
import { CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES } from "#app/constants";

/** the i18n namespace for the encounter */
const namespace = "mysteryEncounters/fightOrFlight";

/**
 * Fight or Flight encounter.
 * @see {@link https://github.com/pagefaultgames/pokerogue/issues/3795 | GitHub Issue #3795}
 * @see For biome requirements check {@linkcode mysteryEncountersByBiome}
 */
export const FightOrFlightEncounter: MysteryEncounter = MysteryEncounterBuilder.withEncounterType(
  MysteryEncounterType.FIGHT_OR_FLIGHT,
)
  .withEncounterTier(MysteryEncounterTier.COMMON)
  .withSceneWaveRangeRequirement(...CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES)
  .withCatchAllowed(true)
  .withHideWildIntroMessage(true)
  .withFleeAllowed(false)
  .withIntroSpriteConfigs([]) // Set in onInit()
  .withIntroDialogue([
    {
      text: `${namespace}:intro`,
    },
  ])
  .withOnInit(() => {
    const encounter = globalScene.currentBattle.mysteryEncounter!;

    // Calculate boss mon
    const level = getEncounterPokemonLevelForWave(STANDARD_ENCOUNTER_BOOSTED_LEVEL_MODIFIER);
    const bossPokemon = getRandomEncounterSpecies(level, true);
    encounter.setDialogueToken("enemyPokemon", bossPokemon.getNameToRender());
    const config: EnemyPartyConfig = {
      pokemonConfigs: [
        {
          level: level,
          species: bossPokemon.species,
          dataSource: new PokemonData(bossPokemon),
          isBoss: true,
          tags: [BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON],
          mysteryEncounterBattleEffects: (pokemon: Pokemon) => {
            queueEncounterMessage(`${namespace}:option.1.stat_boost`);
            // Randomly boost 1 stat 2 stages
            // Cannot boost Spd, Acc, or Evasion
            globalScene.phaseManager.unshiftNew(
              "StatStageChangePhase",
              pokemon.getBattlerIndex(),
              true,
              [randSeedInt(4, 1)],
              2,
            );
          },
        },
      ],
    };
    encounter.enemyPartyConfigs = [config];

    // Calculate item
    // Waves 10-40 GREAT, 60-120 ULTRA, 120-160 ROGUE, 160-180 MASTER
    const tier =
      globalScene.currentBattle.waveIndex > 160
        ? ModifierTier.MASTER
        : globalScene.currentBattle.waveIndex > 120
          ? ModifierTier.ROGUE
          : globalScene.currentBattle.waveIndex > 40
            ? ModifierTier.ULTRA
            : ModifierTier.GREAT;
    regenerateModifierPoolThresholds(globalScene.getPlayerParty(), ModifierPoolType.PLAYER, 0);
    let item: ModifierTypeOption | null = null;
    // TMs and Candy Jar excluded from possible rewards as they're too swingy in value for a singular item reward
    while (!item || item.type.id.includes("TM_") || item.type.id === "CANDY_JAR") {
      item = getPlayerModifierTypeOptions(1, globalScene.getPlayerParty(), [], {
        guaranteedModifierTiers: [tier],
        allowLuckUpgrades: false,
      })[0];
    }
    encounter.setDialogueToken("itemName", item.type.name);
    encounter.misc = item;

    const { spriteKey, fileRoot } = getSpriteKeysFromPokemon(bossPokemon);
    encounter.spriteConfigs = [
      {
        spriteKey: item.type.iconImage,
        fileRoot: "items",
        hasShadow: false,
        x: 35,
        y: -5,
        scale: 0.75,
        isItem: true,
        disableAnimation: true,
      },
      {
        spriteKey: spriteKey,
        fileRoot: fileRoot,
        hasShadow: true,
        tint: 0.25,
        x: -5,
        repeat: true,
        isPokemon: true,
        isShiny: bossPokemon.shiny,
        variant: bossPokemon.variant,
      },
    ];

    return true;
  })
  .setLocalizationKey(`${namespace}`)
  .withTitle(`${namespace}:title`)
  .withDescription(`${namespace}:description`)
  .withQuery(`${namespace}:query`)
  .withSimpleOption(
    {
      buttonLabel: `${namespace}:option.1.label`,
      buttonTooltip: `${namespace}:option.1.tooltip`,
      selected: [
        {
          text: `${namespace}:option.1.selected`,
        },
      ],
    },
    async () => {
      // Pick battle
      // Pokemon will randomly boost 1 stat by 2 stages
      const item = globalScene.currentBattle.mysteryEncounter!.misc as ModifierTypeOption;
      setEncounterRewards({
        guaranteedModifierTypeOptions: [item],
        fillRemaining: false,
      });
      await initBattleWithEnemyConfig(globalScene.currentBattle.mysteryEncounter!.enemyPartyConfigs[0]);
    },
  )
  .withOption(
    MysteryEncounterOptionBuilder.newOptionWithMode(MysteryEncounterOptionMode.DISABLED_OR_SPECIAL)
      .withPrimaryPokemonRequirement(new MoveRequirement(STEALING_MOVES, true)) // Will set option2PrimaryName and option2PrimaryMove dialogue tokens automatically
      .withDialogue({
        buttonLabel: `${namespace}:option.2.label`,
        buttonTooltip: `${namespace}:option.2.tooltip`,
        disabledButtonTooltip: `${namespace}:option.2.disabled_tooltip`,
        selected: [
          {
            text: `${namespace}:option.2.selected`,
          },
        ],
      })
      .withOptionPhase(async () => {
        // Pick steal
        const encounter = globalScene.currentBattle.mysteryEncounter!;
        const item = globalScene.currentBattle.mysteryEncounter!.misc as ModifierTypeOption;
        setEncounterRewards({
          guaranteedModifierTypeOptions: [item],
          fillRemaining: false,
        });

        // Use primaryPokemon to execute the thievery
        const primaryPokemon = encounter.options[1].primaryPokemon!;
        setEncounterExp(primaryPokemon.id, encounter.enemyPartyConfigs[0].pokemonConfigs![0].species.baseExp);
        leaveEncounterWithoutBattle();
      })
      .build(),
  )
  .withSimpleOption(
    {
      buttonLabel: `${namespace}:option.3.label`,
      buttonTooltip: `${namespace}:option.3.tooltip`,
      selected: [
        {
          text: `${namespace}:option.3.selected`,
        },
      ],
    },
    async () => {
      // Leave encounter with no rewards or exp
      leaveEncounterWithoutBattle(true);
      return true;
    },
  )
  .build();
