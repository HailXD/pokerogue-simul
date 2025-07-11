import Phaser from "phaser";
import type { AnySound } from "#app/battle-scene";
import type BattleScene from "#app/battle-scene";
import { globalScene } from "#app/global-scene";
import type { Variant } from "#app/sprites/variant";
import { populateVariantColors, variantColorCache } from "#app/sprites/variant";
import { variantData } from "#app/sprites/variant";
import BattleInfo from "#app/ui/battle-info/battle-info";
import { EnemyBattleInfo } from "#app/ui/battle-info/enemy-battle-info";
import { PlayerBattleInfo } from "#app/ui/battle-info/player-battle-info";
import type Move from "#app/data/moves/move";
import { getMoveTargets } from "#app/data/moves/move-utils";
import { applyMoveAttrs } from "#app/data/moves/apply-attrs";
import { allMoves } from "#app/data/data-lists";
import { MoveTarget } from "#enums/MoveTarget";
import { MoveCategory } from "#enums/MoveCategory";
import type { PokemonSpeciesForm } from "#app/data/pokemon-species";
import { default as PokemonSpecies, getFusedSpeciesName, getPokemonSpeciesForm } from "#app/data/pokemon-species";
import { getPokemonSpecies } from "#app/utils/pokemon-utils";
import { getStarterValueFriendshipCap, speciesStarterCosts } from "#app/data/balance/starters";
import {
  NumberHolder,
  randSeedInt,
  getIvsFromId,
  BooleanHolder,
  randSeedItem,
  isNullOrUndefined,
  getEnumValues,
  toDmgValue,
  fixedInt,
  rgbaToInt,
  rgbHexToRgba,
  rgbToHsv,
  deltaRgb,
  isBetween,
  randSeedFloat,
  type Constructor,
  randSeedIntRange,
  coerceArray,
} from "#app/utils/common";
import type { TypeDamageMultiplier } from "#app/data/type";
import { getTypeDamageMultiplier, getTypeRgb } from "#app/data/type";
import { PokemonType } from "#enums/pokemon-type";
import { getLevelTotalExp } from "#app/data/exp";
import {
  Stat,
  type PermanentStat,
  type BattleStat,
  type EffectiveStat,
  PERMANENT_STATS,
  BATTLE_STATS,
  EFFECTIVE_STATS,
} from "#enums/stat";
import {
  EnemyDamageBoosterModifier,
  EnemyDamageReducerModifier,
  EnemyFusionChanceModifier,
  HiddenAbilityRateBoosterModifier,
  BaseStatModifier,
  PokemonFriendshipBoosterModifier,
  PokemonHeldItemModifier,
  PokemonNatureWeightModifier,
  ShinyRateBoosterModifier,
  SurviveDamageModifier,
  TempStatStageBoosterModifier,
  TempCritBoosterModifier,
  StatBoosterModifier,
  CritBoosterModifier,
  PokemonBaseStatFlatModifier,
  PokemonBaseStatTotalModifier,
  PokemonIncrementingStatModifier,
  EvoTrackerModifier,
  PokemonMultiHitModifier,
} from "#app/modifier/modifier";
import { PokeballType } from "#enums/pokeball";
import { Gender } from "#app/data/gender";
import { Status, getRandomStatus } from "#app/data/status-effect";
import type { SpeciesFormEvolution } from "#app/data/balance/pokemon-evolutions";
import {
  pokemonEvolutions,
  pokemonPrevolutions,
  FusionSpeciesFormEvolution,
  validateShedinjaEvo,
} from "#app/data/balance/pokemon-evolutions";
import { reverseCompatibleTms, tmSpecies, tmPoolTiers } from "#app/data/balance/tms";
import {
  BattlerTag,
  EncoreTag,
  GroundedTag,
  HighestStatBoostTag,
  SubstituteTag,
  TypeImmuneTag,
  getBattlerTag,
  SemiInvulnerableTag,
  MoveRestrictionBattlerTag,
  ExposedTag,
  DragonCheerTag,
  CritBoostTag,
  TrappedTag,
  TarShotTag,
  AutotomizedTag,
  PowerTrickTag,
  loadBattlerTag,
  type GrudgeTag,
} from "../data/battler-tags";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { WeatherType } from "#enums/weather-type";
import { NoCritTag, WeakenMoveScreenTag } from "#app/data/arena-tag";
import { ArenaTagSide } from "#enums/arena-tag-side";
import type { SuppressAbilitiesTag } from "#app/data/arena-tag";
import type { Ability } from "#app/data/abilities/ability";
import {
  applyAbAttrs,
  applyStatMultiplierAbAttrs,
  applyPreApplyBattlerTagAbAttrs,
  applyPreAttackAbAttrs,
  applyPreDefendAbAttrs,
  applyPreSetStatusAbAttrs,
  applyFieldStatMultiplierAbAttrs,
  applyCheckTrappedAbAttrs,
  applyPostDamageAbAttrs,
  applyPostItemLostAbAttrs,
  applyOnGainAbAttrs,
  applyPreLeaveFieldAbAttrs,
  applyOnLoseAbAttrs,
  applyAllyStatMultiplierAbAttrs,
} from "#app/data/abilities/apply-ab-attrs";
import { allAbilities } from "#app/data/data-lists";
import type PokemonData from "#app/system/pokemon-data";
import { BattlerIndex } from "#enums/battler-index";
import { UiMode } from "#enums/ui-mode";
import type { PartyOption } from "#app/ui/party-ui-handler";
import PartyUiHandler, { PartyUiMode } from "#app/ui/party-ui-handler";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import type { LevelMoves } from "#app/data/balance/pokemon-level-moves";
import { EVOLVE_MOVE, RELEARN_MOVE } from "#app/data/balance/pokemon-level-moves";
import { achvs } from "#app/system/achv";
import type { StarterDataEntry, StarterMoveset } from "#app/system/game-data";
import { DexAttr } from "#enums/dex-attr";
import { QuantizerCelebi, argbFromRgba, rgbaFromArgb } from "@material/material-color-utilities";
import { getNatureStatMultiplier } from "#app/data/nature";
import type { SpeciesFormChange } from "#app/data/pokemon-forms";
import {
  SpeciesFormChangeActiveTrigger,
  SpeciesFormChangeLapseTeraTrigger,
  SpeciesFormChangeMoveLearnedTrigger,
  SpeciesFormChangePostMoveTrigger,
} from "#app/data/pokemon-forms/form-change-triggers";
import { TerrainType } from "#app/data/terrain";
import type { TrainerSlot } from "#enums/trainer-slot";
import Overrides from "#app/overrides";
import i18next from "i18next";
import { speciesEggMoves } from "#app/data/balance/egg-moves";
import { ModifierTier } from "#enums/modifier-tier";
import { applyChallenges } from "#app/data/challenge";
import { ChallengeType } from "#enums/challenge-type";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattleSpec } from "#enums/battle-spec";
import { BattlerTagType } from "#enums/battler-tag-type";
import type { BerryType } from "#enums/berry-type";
import { BiomeId } from "#enums/biome-id";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { getPokemonNameWithAffix } from "#app/messages";
import { Challenges } from "#enums/challenges";
import { PokemonAnimType } from "#enums/pokemon-anim-type";
import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { CustomPokemonData } from "#app/data/custom-pokemon-data";
import { SwitchType } from "#enums/switch-type";
import { SpeciesFormKey } from "#enums/species-form-key";
import { getStatusEffectOverlapText } from "#app/data/status-effect";
import {
  BASE_HIDDEN_ABILITY_CHANCE,
  BASE_SHINY_CHANCE,
  SHINY_EPIC_CHANCE,
  SHINY_VARIANT_CHANCE,
} from "#app/data/balance/rates";
import { Nature } from "#enums/nature";
import { StatusEffect } from "#enums/status-effect";
import { doShinySparkleAnim } from "#app/field/anims";
import { MoveFlags } from "#enums/MoveFlags";
import { timedEventManager } from "#app/global-event-manager";
import { loadMoveAnimations } from "#app/sprites/pokemon-asset-loader";
import { isVirtual, isIgnorePP, MoveUseMode } from "#enums/move-use-mode";
import { FieldPosition } from "#enums/field-position";
import { LearnMoveSituation } from "#enums/learn-move-situation";
import { HitResult } from "#enums/hit-result";
import { AiType } from "#enums/ai-type";
import type { MoveResult } from "#enums/move-result";
import { PokemonMove } from "#app/data/moves/pokemon-move";
import type { AbAttrMap, AbAttrString } from "#app/@types/ability-types";

/** Base typeclass for damage parameter methods, used for DRY */
type damageParams = {
  /** The attacking {@linkcode Pokemon} */
  source: Pokemon;
  /** The move used in the attack */
  move: Move;
  /** The move's {@linkcode MoveCategory} after variable-category effects are applied */
  moveCategory: MoveCategory;
  /** If `true`, ignores this Pokemon's defensive ability effects */
  ignoreAbility?: boolean;
  /** If `true`, ignores the attacking Pokemon's ability effects */
  ignoreSourceAbility?: boolean;
  /** If `true`, ignores the ally Pokemon's ability effects */
  ignoreAllyAbility?: boolean;
  /** If `true`, ignores the ability effects of the attacking pokemon's ally */
  ignoreSourceAllyAbility?: boolean;
  /** If `true`, calculates damage for a critical hit */
  isCritical?: boolean;
  /** If `true`, suppresses changes to game state during the calculation */
  simulated?: boolean;
  /** If defined, used in place of calculated effectiveness values */
  effectiveness?: number;
};

/** Type for the parameters of {@linkcode Pokemon#getBaseDamage | getBaseDamage} */
type getBaseDamageParams = Omit<damageParams, "effectiveness">;

/** Type for the parameters of {@linkcode Pokemon#getAttackDamage | getAttackDamage} */
type getAttackDamageParams = Omit<damageParams, "moveCategory">;

export default abstract class Pokemon extends Phaser.GameObjects.Container {
  /**
   * This pokemon's {@link https://bulbapedia.bulbagarden.net/wiki/Personality_value | Personality value/PID},
   * used to determine various parameters of this Pokemon.
   * Represented as a random 32-bit unsigned integer.
   * TODO: Stop treating this like a unique ID and stop treating 0 as no pokemon
   */
  public id: number;
  public name: string;
  public nickname: string;
  public species: PokemonSpecies;
  public formIndex: number;
  public abilityIndex: number;
  public passive: boolean;
  public shiny: boolean;
  public variant: Variant;
  public pokeball: PokeballType;
  protected battleInfo: BattleInfo;
  public level: number;
  public exp: number;
  public levelExp: number;
  public gender: Gender;
  public hp: number;
  public stats: number[];
  public ivs: number[];
  public nature: Nature;
  public moveset: PokemonMove[];
  public status: Status | null;
  public friendship: number;
  public metLevel: number;
  public metBiome: BiomeId | -1;
  public metSpecies: SpeciesId;
  public metWave: number;
  public luck: number;
  public pauseEvolutions: boolean;
  public pokerus: boolean;
  public switchOutStatus = false;
  public evoCounter: number;
  public teraType: PokemonType;
  public isTerastallized: boolean;
  public stellarTypesBoosted: PokemonType[];

  public fusionSpecies: PokemonSpecies | null;
  public fusionFormIndex: number;
  public fusionAbilityIndex: number;
  public fusionShiny: boolean;
  public fusionVariant: Variant;
  public fusionGender: Gender;
  public fusionLuck: number;
  public fusionCustomPokemonData: CustomPokemonData | null;
  public fusionTeraType: PokemonType;

  public customPokemonData: CustomPokemonData = new CustomPokemonData();

  /* Pokemon data types, in vaguely decreasing order of precedence */

  /**
   * Data that resets only on *battle* end (hit count, harvest berries, etc.)
   * Kept between waves.
   */
  public battleData: PokemonBattleData = new PokemonBattleData();
  /** Data that resets on switch or battle end (stat stages, battler tags, etc.) */
  public summonData: PokemonSummonData = new PokemonSummonData();
  /** Similar to {@linkcode PokemonSummonData}, but is reset on reload (not saved to file). */
  public tempSummonData: PokemonTempSummonData = new PokemonTempSummonData();
  /** Wave data correponding to moves/ability information revealed */
  public waveData: PokemonWaveData = new PokemonWaveData();
  /** Per-turn data like hit count & flinch tracking */
  public turnData: PokemonTurnData = new PokemonTurnData();

  /** Used by Mystery Encounters to execute pokemon-specific logic (such as stat boosts) at start of battle */
  public mysteryEncounterBattleEffects?: (pokemon: Pokemon) => void;

  public fieldPosition: FieldPosition;

  public maskEnabled: boolean;
  public maskSprite: Phaser.GameObjects.Sprite | null;

  public usedTMs: MoveId[];

  private shinySparkle: Phaser.GameObjects.Sprite;

  // TODO: Rework this eventually
  constructor(
    x: number,
    y: number,
    species: PokemonSpecies,
    level: number,
    abilityIndex?: number,
    formIndex?: number,
    gender?: Gender,
    shiny?: boolean,
    variant?: Variant,
    ivs?: number[],
    nature?: Nature,
    dataSource?: Pokemon | PokemonData,
  ) {
    super(globalScene, x, y);

    if (!species.isObtainable() && this.isPlayer()) {
      throw `Cannot create a player Pokemon for species "${species.getName(formIndex)}"`;
    }

    this.species = species;
    this.pokeball = dataSource?.pokeball || PokeballType.POKEBALL;
    this.level = level;

    this.abilityIndex = abilityIndex ?? this.generateAbilityIndex();

    if (formIndex !== undefined) {
      this.formIndex = formIndex;
    }
    if (gender !== undefined) {
      this.gender = gender;
    }
    if (shiny !== undefined) {
      this.shiny = shiny;
    }
    if (variant !== undefined) {
      this.variant = variant;
    }
    this.exp = dataSource?.exp || getLevelTotalExp(this.level, species.growthRate);
    this.levelExp = dataSource?.levelExp || 0;

    if (dataSource) {
      this.id = dataSource.id;
      this.hp = dataSource.hp;
      this.stats = dataSource.stats;
      this.ivs = dataSource.ivs;
      this.passive = !!dataSource.passive;
      if (this.variant === undefined) {
        this.variant = 0;
      }
      this.nature = dataSource.nature || (0 as Nature);
      this.nickname = dataSource.nickname;
      this.moveset = dataSource.moveset;
      this.status = dataSource.status!; // TODO: is this bang correct?
      this.friendship = dataSource.friendship ?? this.species.baseFriendship;
      this.metLevel = dataSource.metLevel || 5;
      this.luck = dataSource.luck;
      this.metBiome = dataSource.metBiome;
      this.metSpecies =
        dataSource.metSpecies ?? (this.metBiome !== -1 ? this.species.speciesId : this.species.getRootSpeciesId(true));
      this.metWave = dataSource.metWave ?? (this.metBiome === -1 ? -1 : 0);
      this.pauseEvolutions = dataSource.pauseEvolutions;
      this.pokerus = !!dataSource.pokerus;
      this.fusionSpecies =
        dataSource.fusionSpecies instanceof PokemonSpecies
          ? dataSource.fusionSpecies
          : dataSource.fusionSpecies
            ? getPokemonSpecies(dataSource.fusionSpecies)
            : null;
      this.fusionFormIndex = dataSource.fusionFormIndex;
      this.fusionAbilityIndex = dataSource.fusionAbilityIndex;
      this.fusionShiny = dataSource.fusionShiny;
      this.fusionVariant = dataSource.fusionVariant || 0;
      this.fusionGender = dataSource.fusionGender;
      this.fusionLuck = dataSource.fusionLuck;
      this.fusionCustomPokemonData = dataSource.fusionCustomPokemonData;
      this.fusionTeraType = dataSource.fusionTeraType;
      this.usedTMs = dataSource.usedTMs ?? [];
      this.customPokemonData = new CustomPokemonData(dataSource.customPokemonData);
      this.teraType = dataSource.teraType;
      this.isTerastallized = dataSource.isTerastallized;
      this.stellarTypesBoosted = dataSource.stellarTypesBoosted ?? [];
    } else {
      this.id = randSeedInt(4294967296);
      this.ivs = ivs || getIvsFromId(this.id);

      if (this.gender === undefined) {
        this.generateGender();
      }

      if (this.formIndex === undefined) {
        this.formIndex = globalScene.getSpeciesFormIndex(species, this.gender, this.nature, this.isPlayer());
      }

      if (this.shiny === undefined) {
        this.trySetShiny();
      }

      if (this.variant === undefined) {
        this.variant = this.shiny ? this.generateShinyVariant() : 0;
      }

      if (nature !== undefined) {
        this.setNature(nature);
      } else {
        this.generateNature();
      }

      this.friendship = species.baseFriendship;
      this.metLevel = level;
      this.metBiome = globalScene.currentBattle ? globalScene.arena.biomeType : -1;
      this.metSpecies = species.speciesId;
      this.metWave = globalScene.currentBattle ? globalScene.currentBattle.waveIndex : -1;
      this.pokerus = false;

      if (level > 1) {
        const fused = new BooleanHolder(globalScene.gameMode.isSplicedOnly);
        if (!fused.value && this.isEnemy() && !this.hasTrainer()) {
          globalScene.applyModifier(EnemyFusionChanceModifier, false, fused);
        }

        if (fused.value) {
          this.calculateStats();
          this.generateFusionSpecies();
        }
      }
      this.luck = (this.shiny ? this.variant + 1 : 0) + (this.fusionShiny ? this.fusionVariant + 1 : 0);
      this.fusionLuck = this.luck;

      this.teraType = randSeedItem(this.getTypes(false, false, true));
      this.isTerastallized = false;
      this.stellarTypesBoosted = [];
    }

    this.summonData = new PokemonSummonData(dataSource?.summonData);
    this.battleData = new PokemonBattleData(dataSource?.battleData);

    this.generateName();

    if (!species.isObtainable()) {
      this.shiny = false;
    }

    if (!dataSource) {
      this.calculateStats();
    }
  }

  /**
   * @param useIllusion - Whether we want the fake name or the real name of the Pokemon (for Illusion ability).
   */
  getNameToRender(useIllusion = true) {
    const name: string =
      !useIllusion && this.summonData.illusion ? this.summonData.illusion.basePokemon.name : this.name;
    const nickname: string =
      !useIllusion && this.summonData.illusion ? this.summonData.illusion.basePokemon.nickname : this.nickname;
    try {
      if (nickname) {
        return decodeURIComponent(escape(atob(nickname)));
      }
      return name;
    } catch (err) {
      console.error(`Failed to decode nickname for ${name}`, err);
      return name;
    }
  }

  getPokeball(useIllusion = false) {
    if (useIllusion) {
      return this.summonData.illusion?.pokeball ?? this.pokeball;
    }
    return this.pokeball;
  }

  init(): void {
    this.fieldPosition = FieldPosition.CENTER;
    this.initBattleInfo();

    globalScene.fieldUI.addAt(this.battleInfo, 0);

    const getSprite = (hasShadow?: boolean) => {
      const ret = globalScene.addPokemonSprite(
        this,
        0,
        0,
        `pkmn__${this.isPlayer() ? "back__" : ""}sub`,
        undefined,
        true,
      );
      ret.setOrigin(0.5, 1);
      ret.setPipeline(globalScene.spritePipeline, {
        tone: [0.0, 0.0, 0.0, 0.0],
        hasShadow: !!hasShadow,
        teraColor: getTypeRgb(this.getTeraType()),
        isTerastallized: this.isTerastallized,
      });
      return ret;
    };

    this.setScale(this.getSpriteScale());

    const sprite = getSprite(true);
    const tintSprite = getSprite();

    tintSprite.setVisible(false);

    this.addAt(sprite, 0);
    this.addAt(tintSprite, 1);

    if (this.isShiny(true) && !this.shinySparkle) {
      this.initShinySparkle();
    }
  }

  abstract initBattleInfo(): void;

  isOnField(): boolean {
    if (!globalScene) {
      return false;
    }
    if (this.switchOutStatus) {
      return false;
    }
    return globalScene.field.getIndex(this) > -1;
  }

  /**
   * Checks if a pokemon is fainted (ie: its `hp <= 0`).
   * It's usually better to call {@linkcode isAllowedInBattle()}
   * @param checkStatus `true` to also check that the pokemon's status is {@linkcode StatusEffect.FAINT}
   * @returns `true` if the pokemon is fainted
   */
  public isFainted(checkStatus = false): boolean {
    return this.hp <= 0 && (!checkStatus || this.status?.effect === StatusEffect.FAINT);
  }

  /**
   * Check if this pokemon is both not fainted and allowed to be in battle based on currently active challenges.
   * @returns {boolean} `true` if pokemon is allowed in battle
   */
  public isAllowedInBattle(): boolean {
    return !this.isFainted() && this.isAllowedInChallenge();
  }

  /**
   * Check if this pokemon is allowed based on any active challenges.
   * It's usually better to call {@linkcode isAllowedInBattle()}
   * @returns {boolean} `true` if pokemon is allowed in battle
   */
  public isAllowedInChallenge(): boolean {
    const challengeAllowed = new BooleanHolder(true);
    applyChallenges(ChallengeType.POKEMON_IN_BATTLE, this, challengeAllowed);
    return challengeAllowed.value;
  }

  /**
   * Checks if this {@linkcode Pokemon} is allowed in battle (ie: not fainted, and allowed under any active challenges).
   * @param onField `true` to also check if the pokemon is currently on the field; default `false`
   * @returns `true` if the pokemon is "active", as described above.
   * Returns `false` if there is no active {@linkcode BattleScene} or the pokemon is disallowed.
   */
  public isActive(onField = false): boolean {
    if (!globalScene) {
      return false;
    }
    return this.isAllowedInBattle() && (!onField || this.isOnField());
  }

  getDexAttr(): bigint {
    let ret = 0n;
    ret |= this.gender !== Gender.FEMALE ? DexAttr.MALE : DexAttr.FEMALE;
    ret |= !this.shiny ? DexAttr.NON_SHINY : DexAttr.SHINY;
    ret |= this.variant >= 2 ? DexAttr.VARIANT_3 : this.variant === 1 ? DexAttr.VARIANT_2 : DexAttr.DEFAULT_VARIANT;
    ret |= globalScene.gameData.getFormAttr(this.formIndex);
    return ret;
  }

  /**
   * Sets the Pokemon's name. Only called when loading a Pokemon so this function needs to be called when
   * initializing hardcoded Pokemon or else it will not display the form index name properly.
   * @returns n/a
   */
  generateName(): void {
    if (!this.fusionSpecies) {
      this.name = this.species.getName(this.formIndex);
      return;
    }
    this.name = getFusedSpeciesName(
      this.species.getName(this.formIndex),
      this.fusionSpecies.getName(this.fusionFormIndex),
    );
    if (this.battleInfo) {
      this.updateInfo(true);
    }
  }

  /** Generate `abilityIndex` based on species and hidden ability if not pre-defined. */
  private generateAbilityIndex(): number {
    // Roll for hidden ability chance, applying any ability charms for enemy mons
    const hiddenAbilityChance = new NumberHolder(BASE_HIDDEN_ABILITY_CHANCE);
    if (!this.hasTrainer()) {
      globalScene.applyModifiers(HiddenAbilityRateBoosterModifier, true, hiddenAbilityChance);
    }

    // If the roll succeeded and we have one, use HA; otherwise pick a random ability
    const hasHiddenAbility = !randSeedInt(hiddenAbilityChance.value);
    if (this.species.abilityHidden && hasHiddenAbility) {
      return 2;
    }

    // only use random ability if species has a second ability
    return this.species.ability2 !== this.species.ability1 ? randSeedInt(2) : 0;
  }

  /**
   * Generate an illusion of the last pokemon in the party, as other wild pokemon in the area.
   */
  setIllusion(pokemon: Pokemon): boolean {
    if (this.summonData.illusion) {
      this.breakIllusion();
    }
    if (this.hasTrainer()) {
      const speciesId = pokemon.species.speciesId;

      this.summonData.illusion = {
        basePokemon: {
          name: this.name,
          nickname: this.nickname,
          shiny: this.shiny,
          variant: this.variant,
          fusionShiny: this.fusionShiny,
          fusionVariant: this.fusionVariant,
        },
        species: speciesId,
        formIndex: pokemon.formIndex,
        gender: pokemon.gender,
        pokeball: pokemon.pokeball,
        fusionFormIndex: pokemon.fusionFormIndex,
        fusionSpecies: pokemon.fusionSpecies || undefined,
        fusionGender: pokemon.fusionGender,
      };

      this.name = pokemon.name;
      this.nickname = pokemon.nickname;
      this.shiny = pokemon.shiny;
      this.variant = pokemon.variant;
      this.fusionVariant = pokemon.fusionVariant;
      this.fusionShiny = pokemon.fusionShiny;
      if (this.shiny) {
        this.initShinySparkle();
      }
      this.loadAssets(false, true).then(() => this.playAnim());
      this.updateInfo();
    } else {
      const randomIllusion: PokemonSpecies = globalScene.arena.randomSpecies(
        globalScene.currentBattle.waveIndex,
        this.level,
      );

      this.summonData.illusion = {
        basePokemon: {
          name: this.name,
          nickname: this.nickname,
          shiny: this.shiny,
          variant: this.variant,
          fusionShiny: this.fusionShiny,
          fusionVariant: this.fusionVariant,
        },
        species: randomIllusion.speciesId,
        formIndex: randomIllusion.formIndex,
        gender: this.gender,
        pokeball: this.pokeball,
      };

      this.name = randomIllusion.name;
      this.loadAssets(false, true).then(() => this.playAnim());
    }
    return true;
  }

  breakIllusion(): boolean {
    if (!this.summonData.illusion) {
      return false;
    }
    this.name = this.summonData.illusion.basePokemon.name;
    this.nickname = this.summonData.illusion.basePokemon.nickname;
    this.shiny = this.summonData.illusion.basePokemon.shiny;
    this.variant = this.summonData.illusion.basePokemon.variant;
    this.fusionVariant = this.summonData.illusion.basePokemon.fusionVariant;
    this.fusionShiny = this.summonData.illusion.basePokemon.fusionShiny;
    this.summonData.illusion = null;
    if (this.isOnField()) {
      globalScene.playSound("PRSFX- Transform");
    }
    if (this.shiny) {
      this.initShinySparkle();
    }
    this.loadAssets(false).then(() => this.playAnim());
    this.updateInfo(true);
    return true;
  }

  abstract isPlayer(): this is PlayerPokemon;

  abstract isEnemy(): this is EnemyPokemon;

  abstract hasTrainer(): boolean;

  abstract getFieldIndex(): number;

  abstract getBattlerIndex(): BattlerIndex;

  /**
   * @param useIllusion - Whether we want the illusion or not.
   */
  async loadAssets(ignoreOverride = true, useIllusion = false): Promise<void> {
    /** Promises that are loading assets and can be run concurrently. */
    const loadPromises: Promise<void>[] = [];
    // Assets for moves
    loadPromises.push(loadMoveAnimations(this.getMoveset().map(m => m.getMove().id)));

    // Load the assets for the species form
    const formIndex = useIllusion && this.summonData.illusion ? this.summonData.illusion.formIndex : this.formIndex;
    loadPromises.push(
      this.getSpeciesForm(false, useIllusion).loadAssets(
        this.getGender(useIllusion) === Gender.FEMALE,
        formIndex,
        this.isShiny(useIllusion),
        this.getVariant(useIllusion),
      ),
    );

    if (this.isPlayer() || this.getFusionSpeciesForm(false, useIllusion)) {
      globalScene.loadPokemonAtlas(
        this.getBattleSpriteKey(true, ignoreOverride),
        this.getBattleSpriteAtlasPath(true, ignoreOverride),
      );
    }
    if (this.getFusionSpeciesForm()) {
      const fusionFormIndex =
        useIllusion && this.summonData.illusion ? this.summonData.illusion.fusionFormIndex : this.fusionFormIndex;
      const fusionShiny =
        !useIllusion && this.summonData.illusion?.basePokemon
          ? this.summonData.illusion.basePokemon.fusionShiny
          : this.fusionShiny;
      const fusionVariant =
        !useIllusion && this.summonData.illusion?.basePokemon
          ? this.summonData.illusion.basePokemon.fusionVariant
          : this.fusionVariant;
      loadPromises.push(
        this.getFusionSpeciesForm(false, useIllusion).loadAssets(
          this.getFusionGender(false, useIllusion) === Gender.FEMALE,
          fusionFormIndex,
          fusionShiny,
          fusionVariant,
        ),
      );
      globalScene.loadPokemonAtlas(
        this.getFusionBattleSpriteKey(true, ignoreOverride),
        this.getFusionBattleSpriteAtlasPath(true, ignoreOverride),
      );
    }

    if (this.isShiny(true)) {
      loadPromises.push(populateVariantColors(this, false, ignoreOverride));
      if (this.isPlayer()) {
        loadPromises.push(populateVariantColors(this, true, ignoreOverride));
      }
    }

    await Promise.allSettled(loadPromises);

    // This must be initiated before we queue loading, otherwise the load could have finished before
    // we reach the line of code that adds the listener, causing a deadlock.
    const waitOnLoadPromise = new Promise<void>(resolve =>
      globalScene.load.once(Phaser.Loader.Events.COMPLETE, resolve),
    );

    if (!globalScene.load.isLoading()) {
      globalScene.load.start();
    }

    // Wait for the assets we queued to load to finish loading, then...
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#creating_a_promise_around_an_old_callback_api
    await waitOnLoadPromise;

    // With the sprites loaded, generate the animation frame information
    if (this.isPlayer()) {
      const originalWarn = console.warn;
      // Ignore warnings for missing frames, because there will be a lot
      console.warn = () => {};
      const battleSpriteKey = this.getBattleSpriteKey(this.isPlayer(), ignoreOverride);
      const battleFrameNames = globalScene.anims.generateFrameNames(battleSpriteKey, {
        zeroPad: 4,
        suffix: ".png",
        start: 1,
        end: 400,
      });
      console.warn = originalWarn;
      if (!globalScene.anims.exists(battleSpriteKey)) {
        globalScene.anims.create({
          key: battleSpriteKey,
          frames: battleFrameNames,
          frameRate: 10,
          repeat: -1,
        });
      }
    }
    // With everything loaded, now begin playing the animation.
    this.playAnim();

    // update the fusion palette
    this.updateFusionPalette();
    if (this.summonData.speciesForm) {
      this.updateFusionPalette(true);
    }
  }

  /**
   * Gracefully handle errors loading a variant sprite. Log if it fails and attempt to fall back on
   * non-experimental sprites before giving up.
   *
   * @param cacheKey the cache key for the variant color sprite
   * @param attemptedSpritePath the sprite path that failed to load
   * @param useExpSprite was the attempted sprite experimental
   * @param battleSpritePath the filename of the sprite
   * @param optionalParams any additional params to log
   */
  async fallbackVariantColor(
    cacheKey: string,
    attemptedSpritePath: string,
    useExpSprite: boolean,
    battleSpritePath: string,
    ...optionalParams: any[]
  ) {
    console.warn(`Could not load ${attemptedSpritePath}!`, ...optionalParams);
    if (useExpSprite) {
      await this.populateVariantColorCache(cacheKey, false, battleSpritePath);
    }
  }

  /**
   * Attempt to process variant sprite.
   *
   * @param cacheKey the cache key for the variant color sprite
   * @param useExpSprite should the experimental sprite be used
   * @param battleSpritePath the filename of the sprite
   */
  async populateVariantColorCache(cacheKey: string, useExpSprite: boolean, battleSpritePath: string) {
    const spritePath = `./images/pokemon/variant/${useExpSprite ? "exp/" : ""}${battleSpritePath}.json`;
    return globalScene
      .cachedFetch(spritePath)
      .then(res => {
        // Prevent the JSON from processing if it failed to load
        if (!res.ok) {
          return this.fallbackVariantColor(
            cacheKey,
            res.url,
            useExpSprite,
            battleSpritePath,
            res.status,
            res.statusText,
          );
        }
        return res.json();
      })
      .catch(error => {
        return this.fallbackVariantColor(cacheKey, spritePath, useExpSprite, battleSpritePath, error);
      })
      .then(c => {
        if (!isNullOrUndefined(c)) {
          variantColorCache[cacheKey] = c;
        }
      });
  }

  getFormKey(): string {
    if (!this.species.forms.length || this.species.forms.length <= this.formIndex) {
      return "";
    }
    return this.species.forms[this.formIndex].formKey;
  }

  getFusionFormKey(): string | null {
    if (!this.fusionSpecies) {
      return null;
    }
    if (!this.fusionSpecies.forms.length || this.fusionSpecies.forms.length <= this.fusionFormIndex) {
      return "";
    }
    return this.fusionSpecies.forms[this.fusionFormIndex].formKey;
  }

  getSpriteAtlasPath(ignoreOverride?: boolean): string {
    const spriteId = this.getSpriteId(ignoreOverride).replace(/_{2}/g, "/");
    return `${/_[1-3]$/.test(spriteId) ? "variant/" : ""}${spriteId}`;
  }

  getBattleSpriteAtlasPath(back?: boolean, ignoreOverride?: boolean): string {
    const spriteId = this.getBattleSpriteId(back, ignoreOverride).replace(/_{2}/g, "/");
    return `${/_[1-3]$/.test(spriteId) ? "variant/" : ""}${spriteId}`;
  }

  getSpriteId(ignoreOverride?: boolean): string {
    const formIndex = this.summonData.illusion?.formIndex ?? this.formIndex;
    return this.getSpeciesForm(ignoreOverride, true).getSpriteId(
      this.getGender(ignoreOverride, true) === Gender.FEMALE,
      formIndex,
      this.shiny,
      this.variant,
    );
  }

  getBattleSpriteId(back?: boolean, ignoreOverride?: boolean): string {
    if (back === undefined) {
      back = this.isPlayer();
    }

    const formIndex = this.summonData.illusion?.formIndex ?? this.formIndex;

    return this.getSpeciesForm(ignoreOverride, true).getSpriteId(
      this.getGender(ignoreOverride, true) === Gender.FEMALE,
      formIndex,
      this.shiny,
      this.variant,
      back,
    );
  }

  getSpriteKey(ignoreOverride?: boolean): string {
    return this.getSpeciesForm(ignoreOverride, false).getSpriteKey(
      this.getGender(ignoreOverride) === Gender.FEMALE,
      this.formIndex,
      this.summonData.illusion?.basePokemon.shiny ?? this.shiny,
      this.summonData.illusion?.basePokemon.variant ?? this.variant,
    );
  }

  getBattleSpriteKey(back?: boolean, ignoreOverride?: boolean): string {
    return `pkmn__${this.getBattleSpriteId(back, ignoreOverride)}`;
  }

  getFusionSpriteId(ignoreOverride?: boolean): string {
    const fusionFormIndex = this.summonData.illusion?.fusionFormIndex ?? this.fusionFormIndex;
    return this.getFusionSpeciesForm(ignoreOverride, true).getSpriteId(
      this.getFusionGender(ignoreOverride, true) === Gender.FEMALE,
      fusionFormIndex,
      this.fusionShiny,
      this.fusionVariant,
    );
  }

  getFusionBattleSpriteId(back?: boolean, ignoreOverride?: boolean): string {
    if (back === undefined) {
      back = this.isPlayer();
    }

    const fusionFormIndex = this.summonData.illusion?.fusionFormIndex ?? this.fusionFormIndex;

    return this.getFusionSpeciesForm(ignoreOverride, true).getSpriteId(
      this.getFusionGender(ignoreOverride, true) === Gender.FEMALE,
      fusionFormIndex,
      this.fusionShiny,
      this.fusionVariant,
      back,
    );
  }

  getFusionBattleSpriteKey(back?: boolean, ignoreOverride?: boolean): string {
    return `pkmn__${this.getFusionBattleSpriteId(back, ignoreOverride)}`;
  }

  getFusionBattleSpriteAtlasPath(back?: boolean, ignoreOverride?: boolean): string {
    return this.getFusionBattleSpriteId(back, ignoreOverride).replace(/_{2}/g, "/");
  }

  getIconAtlasKey(ignoreOverride = false, useIllusion = true): string {
    // TODO: confirm the correct behavior here (is it intentional that the check fails if `illusion.formIndex` is `0`?)
    const formIndex =
      useIllusion && this.summonData.illusion?.formIndex ? this.summonData.illusion.formIndex : this.formIndex;
    const variant =
      !useIllusion && this.summonData.illusion ? this.summonData.illusion.basePokemon.variant : this.variant;
    return this.getSpeciesForm(ignoreOverride, useIllusion).getIconAtlasKey(
      formIndex,
      this.isBaseShiny(useIllusion),
      variant,
    );
  }

  getFusionIconAtlasKey(ignoreOverride = false, useIllusion = true): string {
    // TODO: confirm the correct behavior here (is it intentional that the check fails if `illusion.fusionFormIndex` is `0`?)
    const fusionFormIndex =
      useIllusion && this.summonData.illusion?.fusionFormIndex
        ? this.summonData.illusion.fusionFormIndex
        : this.fusionFormIndex;
    const fusionVariant =
      !useIllusion && this.summonData.illusion
        ? this.summonData.illusion.basePokemon.fusionVariant
        : this.fusionVariant;
    return this.getFusionSpeciesForm(ignoreOverride, useIllusion).getIconAtlasKey(
      fusionFormIndex,
      this.isFusionShiny(),
      fusionVariant,
    );
  }

  getIconId(ignoreOverride?: boolean, useIllusion = true): string {
    const formIndex =
      useIllusion && this.summonData.illusion?.formIndex ? this.summonData.illusion?.formIndex : this.formIndex;
    const variant =
      !useIllusion && !!this.summonData.illusion ? this.summonData.illusion?.basePokemon.variant : this.variant;
    return this.getSpeciesForm(ignoreOverride, useIllusion).getIconId(
      this.getGender(ignoreOverride, useIllusion) === Gender.FEMALE,
      formIndex,
      this.isBaseShiny(),
      variant,
    );
  }

  getFusionIconId(ignoreOverride?: boolean, useIllusion = true): string {
    const fusionFormIndex =
      useIllusion && this.summonData.illusion?.fusionFormIndex
        ? this.summonData.illusion?.fusionFormIndex
        : this.fusionFormIndex;
    const fusionVariant =
      !useIllusion && !!this.summonData.illusion
        ? this.summonData.illusion?.basePokemon.fusionVariant
        : this.fusionVariant;
    return this.getFusionSpeciesForm(ignoreOverride, useIllusion).getIconId(
      this.getFusionGender(ignoreOverride, useIllusion) === Gender.FEMALE,
      fusionFormIndex,
      this.isFusionShiny(),
      fusionVariant,
    );
  }

  /**
   * Get this {@linkcode Pokemon}'s {@linkcode PokemonSpeciesForm}.
   * @param ignoreOverride - Whether to ignore overridden species from {@linkcode MoveId.TRANSFORM}, default `false`.
   * This overrides `useIllusion` if `true`.
   * @param useIllusion - `true` to use the speciesForm of the illusion; default `false`.
   */
  getSpeciesForm(ignoreOverride = false, useIllusion = false): PokemonSpeciesForm {
    if (!ignoreOverride && this.summonData.speciesForm) {
      return this.summonData.speciesForm;
    }

    const species: PokemonSpecies =
      useIllusion && this.summonData.illusion ? getPokemonSpecies(this.summonData.illusion.species) : this.species;
    const formIndex = useIllusion && this.summonData.illusion ? this.summonData.illusion.formIndex : this.formIndex;

    if (species.forms && species.forms.length > 0) {
      return species.forms[formIndex];
    }

    return species;
  }

  /**
   * @param {boolean} useIllusion - Whether we want the fusionSpeciesForm of the illusion or not.
   */
  getFusionSpeciesForm(ignoreOverride?: boolean, useIllusion = false): PokemonSpeciesForm {
    const fusionSpecies: PokemonSpecies =
      useIllusion && this.summonData.illusion ? this.summonData.illusion.fusionSpecies! : this.fusionSpecies!;
    const fusionFormIndex =
      useIllusion && this.summonData.illusion ? this.summonData.illusion.fusionFormIndex! : this.fusionFormIndex;

    if (!ignoreOverride && this.summonData.fusionSpeciesForm) {
      return this.summonData.fusionSpeciesForm;
    }
    if (!fusionSpecies?.forms?.length || fusionFormIndex >= fusionSpecies?.forms.length) {
      return fusionSpecies;
    }
    return fusionSpecies?.forms[fusionFormIndex];
  }

  getSprite(): Phaser.GameObjects.Sprite {
    return this.getAt(0) as Phaser.GameObjects.Sprite;
  }

  getTintSprite(): Phaser.GameObjects.Sprite | null {
    return !this.maskEnabled ? (this.getAt(1) as Phaser.GameObjects.Sprite) : this.maskSprite;
  }

  getSpriteScale(): number {
    const formKey = this.getFormKey();
    if (
      this.isMax() === true ||
      formKey === "segin-starmobile" ||
      formKey === "schedar-starmobile" ||
      formKey === "navi-starmobile" ||
      formKey === "ruchbah-starmobile" ||
      formKey === "caph-starmobile"
    ) {
      // G-Max and starmobiles have flat 1.5x scale
      return 1.5;
    }

    // TODO: Rather than using -1 as a default... why don't we just change it to 1????????
    if (this.customPokemonData.spriteScale <= 0) {
      return 1;
    }
    return this.customPokemonData.spriteScale;
  }

  /** Resets the pokemon's field sprite properties, including position, alpha, and scale */
  resetSprite(): void {
    // Resetting properties should not be shown on the field
    this.setVisible(false);

    // Remove the offset from having a Substitute active
    if (this.isOffsetBySubstitute()) {
      this.x -= this.getSubstituteOffset()[0];
      this.y -= this.getSubstituteOffset()[1];
    }

    // Reset sprite display properties
    this.setAlpha(1);
    this.setScale(this.getSpriteScale());
  }

  getHeldItems(): PokemonHeldItemModifier[] {
    if (!globalScene) {
      return [];
    }
    return globalScene.findModifiers(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === this.id,
      this.isPlayer(),
    ) as PokemonHeldItemModifier[];
  }

  updateScale(): void {
    this.setScale(this.getSpriteScale());
  }

  updateSpritePipelineData(): void {
    [this.getSprite(), this.getTintSprite()]
      .filter(s => !!s)
      .map(s => {
        s.pipelineData["teraColor"] = getTypeRgb(this.getTeraType());
        s.pipelineData["isTerastallized"] = this.isTerastallized;
      });
    this.updateInfo(true);
  }

  initShinySparkle(): void {
    const shinySparkle = globalScene.addFieldSprite(0, 0, "shiny");
    shinySparkle.setVisible(false);
    shinySparkle.setOrigin(0.5, 1);
    this.add(shinySparkle);

    this.shinySparkle = shinySparkle;
  }

  /**
   * Attempts to animate a given {@linkcode Phaser.GameObjects.Sprite}
   * @see {@linkcode Phaser.GameObjects.Sprite.play}
   * @param sprite {@linkcode Phaser.GameObjects.Sprite} to animate
   * @param tintSprite {@linkcode Phaser.GameObjects.Sprite} placed on top of the sprite to add a color tint
   * @param animConfig {@linkcode String} to pass to {@linkcode Phaser.GameObjects.Sprite.play}
   * @returns true if the sprite was able to be animated
   */
  tryPlaySprite(sprite: Phaser.GameObjects.Sprite, tintSprite: Phaser.GameObjects.Sprite, key: string): boolean {
    // Catch errors when trying to play an animation that doesn't exist
    try {
      sprite.play(key);
      tintSprite.play(key);
    } catch (error: unknown) {
      console.error(`Couldn't play animation for '${key}'!\nIs the image for this Pokemon missing?\n`, error);

      return false;
    }

    return true;
  }

  playAnim(): void {
    this.tryPlaySprite(this.getSprite(), this.getTintSprite()!, this.getBattleSpriteKey()); // TODO: is the bang correct?
  }

  getFieldPositionOffset(): [number, number] {
    switch (this.fieldPosition) {
      case FieldPosition.CENTER:
        return [0, 0];
      case FieldPosition.LEFT:
        return [-32, -8];
      case FieldPosition.RIGHT:
        return [32, 0];
    }
  }

  /**
   * Returns the Pokemon's offset from its current field position in the event that
   * it has a Substitute doll in effect. The offset is returned in `[ x, y ]` format.
   * @see {@linkcode SubstituteTag}
   * @see {@linkcode getFieldPositionOffset}
   */
  getSubstituteOffset(): [number, number] {
    return this.isPlayer() ? [-30, 10] : [30, -10];
  }

  /**
   * Returns whether or not the Pokemon's position on the field is offset because
   * the Pokemon has a Substitute active.
   * @see {@linkcode SubstituteTag}
   */
  isOffsetBySubstitute(): boolean {
    const substitute = this.getTag(SubstituteTag);
    if (!substitute || substitute.sprite === undefined) {
      return false;
    }
    // During the Pokemon's MoveEffect phase, the offset is removed to put the Pokemon "in focus"
    const currentPhase = globalScene.phaseManager.getCurrentPhase();
    return !(currentPhase?.is("MoveEffectPhase") && currentPhase.getPokemon() === this);
  }

  /** If this Pokemon has a Substitute on the field, removes its sprite from the field. */
  destroySubstitute(): void {
    const substitute = this.getTag(SubstituteTag);
    if (substitute?.sprite) {
      substitute.sprite.destroy();
    }
  }

  setFieldPosition(fieldPosition: FieldPosition, duration?: number): Promise<void> {
    return new Promise(resolve => {
      if (fieldPosition === this.fieldPosition) {
        resolve();
        return;
      }

      const initialOffset = this.getFieldPositionOffset();

      this.fieldPosition = fieldPosition;

      this.battleInfo.setMini(fieldPosition !== FieldPosition.CENTER);
      this.battleInfo.setOffset(fieldPosition === FieldPosition.RIGHT);

      const newOffset = this.getFieldPositionOffset();

      const relX = newOffset[0] - initialOffset[0];
      const relY = newOffset[1] - initialOffset[1];

      const subTag = this.getTag(SubstituteTag);

      if (duration) {
        // TODO: can this use stricter typing?
        const targets: any[] = [this];
        if (subTag?.sprite) {
          targets.push(subTag.sprite);
        }
        globalScene.tweens.add({
          targets: targets,
          x: (_target, _key, value: number) => value + relX,
          y: (_target, _key, value: number) => value + relY,
          duration: duration,
          ease: "Sine.easeOut",
          onComplete: () => resolve(),
        });
      } else {
        this.x += relX;
        this.y += relY;
        if (subTag?.sprite) {
          subTag.sprite.x += relX;
          subTag.sprite.y += relY;
        }
      }
    });
  }

  /**
   * Retrieves the entire set of stats of this {@linkcode Pokemon}.
   * @param bypassSummonData - whether to use actual stats or in-battle overriden stats from Transform; default `true`
   * @returns the numeric values of this {@linkcode Pokemon}'s stats
   */
  getStats(bypassSummonData = true): number[] {
    if (!bypassSummonData && this.summonData.stats) {
      return this.summonData.stats;
    }
    return this.stats;
  }

  /**
   * Retrieves the corresponding {@linkcode PermanentStat} of the {@linkcode Pokemon}.
   * @param stat the desired {@linkcode PermanentStat}
   * @param bypassSummonData prefer actual stats (`true` by default) or in-battle overridden stats (`false`)
   * @returns the numeric value of the desired {@linkcode Stat}
   */
  getStat(stat: PermanentStat, bypassSummonData = true): number {
    if (!bypassSummonData && this.summonData.stats[stat] !== 0) {
      return this.summonData.stats[stat];
    }
    return this.stats[stat];
  }

  /**
   * Writes the value to the corrseponding {@linkcode PermanentStat} of the {@linkcode Pokemon}.
   *
   * Note that this does nothing if {@linkcode value} is less than 0.
   * @param stat the desired {@linkcode PermanentStat} to be overwritten
   * @param value the desired numeric value
   * @param bypassSummonData write to actual stats (`true` by default) or in-battle overridden stats (`false`)
   */
  setStat(stat: PermanentStat, value: number, bypassSummonData = true): void {
    if (value < 0) {
      return;
    }

    if (!bypassSummonData) {
      this.summonData.stats[stat] = value;
    } else {
      this.stats[stat] = value;
    }
  }

  /**
   * Retrieves the entire set of in-battle stat stages of the {@linkcode Pokemon}.
   * @returns the numeric values of the {@linkcode Pokemon}'s in-battle stat stages if available, a fresh stat stage array otherwise
   */
  getStatStages(): number[] {
    return this.summonData ? this.summonData.statStages : [0, 0, 0, 0, 0, 0, 0];
  }

  /**
   * Retrieves the in-battle stage of the specified {@linkcode BattleStat}.
   * @param stat the {@linkcode BattleStat} whose stage is desired
   * @returns the stage of the desired {@linkcode BattleStat} if available, 0 otherwise
   */
  getStatStage(stat: BattleStat): number {
    return this.summonData ? this.summonData.statStages[stat - 1] : 0;
  }

  /**
   * Writes the value to the in-battle stage of the corresponding {@linkcode BattleStat} of the {@linkcode Pokemon}.
   *
   * Note that, if the value is not within a range of [-6, 6], it will be forced to the closest range bound.
   * @param stat the {@linkcode BattleStat} whose stage is to be overwritten
   * @param value the desired numeric value
   */
  setStatStage(stat: BattleStat, value: number): void {
    if (value >= -6) {
      this.summonData.statStages[stat - 1] = Math.min(value, 6);
    } else {
      this.summonData.statStages[stat - 1] = Math.max(value, -6);
    }
  }

  /**
   * Calculate the critical-hit stage of a move used **against** this pokemon by
   * the given source.
   *
   * @param source - The {@linkcode Pokemon} using the move
   * @param move - The {@linkcode Move} being used
   * @returns The final critical-hit stage value
   */
  getCritStage(source: Pokemon, move: Move): number {
    const critStage = new NumberHolder(0);
    applyMoveAttrs("HighCritAttr", source, this, move, critStage);
    globalScene.applyModifiers(CritBoosterModifier, source.isPlayer(), source, critStage);
    globalScene.applyModifiers(TempCritBoosterModifier, source.isPlayer(), critStage);
    applyAbAttrs("BonusCritAbAttr", source, null, false, critStage);
    const critBoostTag = source.getTag(CritBoostTag);
    if (critBoostTag) {
      // Dragon cheer only gives +1 crit stage to non-dragon types
      critStage.value +=
        critBoostTag instanceof DragonCheerTag && !critBoostTag.typesOnAdd.includes(PokemonType.DRAGON) ? 1 : 2;
    }

    console.log(`crit stage: +${critStage.value}`);
    return critStage.value;
  }

  /**
   * Calculates the category of a move when used by this pokemon after
   * category-changing move effects are applied.
   * @param target - The {@linkcode Pokemon} using the move
   * @param move - The {@linkcode Move} being used
   * @returns The given move's final category
   */
  getMoveCategory(target: Pokemon, move: Move): MoveCategory {
    const moveCategory = new NumberHolder(move.category);
    applyMoveAttrs("VariableMoveCategoryAttr", this, target, move, moveCategory);
    return moveCategory.value;
  }

  /**
   * Calculates and retrieves the final value of a stat considering any held
   * items, move effects, opponent abilities, and whether there was a critical
   * hit.
   * @param stat the desired {@linkcode EffectiveStat}
   * @param opponent the target {@linkcode Pokemon}
   * @param move the {@linkcode Move} being used
   * @param ignoreAbility determines whether this Pokemon's abilities should be ignored during the stat calculation
   * @param ignoreOppAbility during an attack, determines whether the opposing Pokemon's abilities should be ignored during the stat calculation.
   * @param ignoreAllyAbility during an attack, determines whether the ally Pokemon's abilities should be ignored during the stat calculation.
   * @param isCritical determines whether a critical hit has occurred or not (`false` by default)
   * @param simulated if `true`, nullifies any effects that produce any changes to game state from triggering
   * @param ignoreHeldItems determines whether this Pokemon's held items should be ignored during the stat calculation, default `false`
   * @returns the final in-battle value of a stat
   */
  getEffectiveStat(
    stat: EffectiveStat,
    opponent?: Pokemon,
    move?: Move,
    ignoreAbility = false,
    ignoreOppAbility = false,
    ignoreAllyAbility = false,
    isCritical = false,
    simulated = true,
    ignoreHeldItems = false,
  ): number {
    const statValue = new NumberHolder(this.getStat(stat, false));
    if (!ignoreHeldItems) {
      globalScene.applyModifiers(StatBoosterModifier, this.isPlayer(), this, stat, statValue);
    }

    // The Ruin abilities here are never ignored, but they reveal themselves on summon anyway
    const fieldApplied = new BooleanHolder(false);
    for (const pokemon of globalScene.getField(true)) {
      applyFieldStatMultiplierAbAttrs(
        "FieldMultiplyStatAbAttr",
        pokemon,
        stat,
        statValue,
        this,
        fieldApplied,
        simulated,
      );
      if (fieldApplied.value) {
        break;
      }
    }
    if (!ignoreAbility) {
      applyStatMultiplierAbAttrs("StatMultiplierAbAttr", this, stat, statValue, simulated);
    }

    const ally = this.getAlly();
    if (!isNullOrUndefined(ally)) {
      applyAllyStatMultiplierAbAttrs(
        "AllyStatMultiplierAbAttr",
        ally,
        stat,
        statValue,
        simulated,
        this,
        move?.hasFlag(MoveFlags.IGNORE_ABILITIES) || ignoreAllyAbility,
      );
    }

    let ret =
      statValue.value *
      this.getStatStageMultiplier(stat, opponent, move, ignoreOppAbility, isCritical, simulated, ignoreHeldItems);

    switch (stat) {
      case Stat.ATK:
        if (this.getTag(BattlerTagType.SLOW_START)) {
          ret >>= 1;
        }
        break;
      case Stat.DEF:
        if (this.isOfType(PokemonType.ICE) && globalScene.arena.weather?.weatherType === WeatherType.SNOW) {
          ret *= 1.5;
        }
        break;
      case Stat.SPATK:
        break;
      case Stat.SPDEF:
        if (this.isOfType(PokemonType.ROCK) && globalScene.arena.weather?.weatherType === WeatherType.SANDSTORM) {
          ret *= 1.5;
        }
        break;
      case Stat.SPD: {
        const side = this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
        if (globalScene.arena.getTagOnSide(ArenaTagType.TAILWIND, side)) {
          ret *= 2;
        }
        if (globalScene.arena.getTagOnSide(ArenaTagType.GRASS_WATER_PLEDGE, side)) {
          ret >>= 2;
        }

        if (this.getTag(BattlerTagType.SLOW_START)) {
          ret >>= 1;
        }
        if (this.status && this.status.effect === StatusEffect.PARALYSIS) {
          ret >>= 1;
        }
        if (this.getTag(BattlerTagType.UNBURDEN) && this.hasAbility(AbilityId.UNBURDEN)) {
          ret *= 2;
        }
        break;
      }
    }

    const highestStatBoost = this.findTag(
      t => t instanceof HighestStatBoostTag && (t as HighestStatBoostTag).stat === stat,
    ) as HighestStatBoostTag;
    if (highestStatBoost) {
      ret *= highestStatBoost.multiplier;
    }

    return Math.floor(ret);
  }

  calculateStats(): void {
    if (!this.stats) {
      this.stats = [0, 0, 0, 0, 0, 0];
    }

    // Get and manipulate base stats
    const baseStats = this.calculateBaseStats();
    // Using base stats, calculate and store stats one by one
    for (const s of PERMANENT_STATS) {
      const statHolder = new NumberHolder(Math.floor((2 * baseStats[s] + this.ivs[s]) * this.level * 0.01));
      if (s === Stat.HP) {
        statHolder.value = statHolder.value + this.level + 10;
        globalScene.applyModifier(PokemonIncrementingStatModifier, this.isPlayer(), this, s, statHolder);
        if (this.hasAbility(AbilityId.WONDER_GUARD, false, true)) {
          statHolder.value = 1;
        }
        if (this.hp > statHolder.value || this.hp === undefined) {
          this.hp = statHolder.value;
        } else if (this.hp) {
          const lastMaxHp = this.getMaxHp();
          if (lastMaxHp && statHolder.value > lastMaxHp) {
            this.hp += statHolder.value - lastMaxHp;
          }
        }
      } else {
        statHolder.value += 5;
        const natureStatMultiplier = new NumberHolder(getNatureStatMultiplier(this.getNature(), s));
        globalScene.applyModifier(PokemonNatureWeightModifier, this.isPlayer(), this, natureStatMultiplier);
        if (natureStatMultiplier.value !== 1) {
          statHolder.value = Math.max(
            Math[natureStatMultiplier.value > 1 ? "ceil" : "floor"](statHolder.value * natureStatMultiplier.value),
            1,
          );
        }
        globalScene.applyModifier(PokemonIncrementingStatModifier, this.isPlayer(), this, s, statHolder);
      }

      statHolder.value = Phaser.Math.Clamp(statHolder.value, 1, Number.MAX_SAFE_INTEGER);

      this.setStat(s, statHolder.value);
    }
  }

  calculateBaseStats(): number[] {
    const baseStats = this.getSpeciesForm(true).baseStats.slice(0);
    applyChallenges(ChallengeType.FLIP_STAT, this, baseStats);
    // Shuckle Juice
    globalScene.applyModifiers(PokemonBaseStatTotalModifier, this.isPlayer(), this, baseStats);
    // Old Gateau
    globalScene.applyModifiers(PokemonBaseStatFlatModifier, this.isPlayer(), this, baseStats);
    if (this.isFusion()) {
      const fusionBaseStats = this.getFusionSpeciesForm(true).baseStats;
      applyChallenges(ChallengeType.FLIP_STAT, this, fusionBaseStats);

      for (const s of PERMANENT_STATS) {
        baseStats[s] = Math.ceil((baseStats[s] + fusionBaseStats[s]) / 2);
      }
    } else if (globalScene.gameMode.isSplicedOnly) {
      for (const s of PERMANENT_STATS) {
        baseStats[s] = Math.ceil(baseStats[s] / 2);
      }
    }
    // Vitamins
    globalScene.applyModifiers(BaseStatModifier, this.isPlayer(), this, baseStats);

    return baseStats;
  }

  getNature(): Nature {
    return this.customPokemonData.nature !== -1 ? this.customPokemonData.nature : this.nature;
  }

  setNature(nature: Nature): void {
    this.nature = nature;
    this.calculateStats();
  }

  setCustomNature(nature: Nature): void {
    this.customPokemonData.nature = nature;
    this.calculateStats();
  }

  generateNature(naturePool?: Nature[]): void {
    if (naturePool === undefined) {
      naturePool = getEnumValues(Nature);
    }
    const nature = naturePool[randSeedInt(naturePool.length)];
    this.setNature(nature);
  }

  isFullHp(): boolean {
    return this.hp >= this.getMaxHp();
  }

  getMaxHp(): number {
    return this.getStat(Stat.HP);
  }

  /** Returns the amount of hp currently missing from this {@linkcode Pokemon} (max - current) */
  getInverseHp(): number {
    return this.getMaxHp() - this.hp;
  }

  getHpRatio(precise = false): number {
    return precise ? this.hp / this.getMaxHp() : Math.round((this.hp / this.getMaxHp()) * 100) / 100;
  }

  generateGender(): void {
    if (this.species.malePercent === null) {
      this.gender = Gender.GENDERLESS;
    } else {
      const genderChance = (this.id % 256) * 0.390625;
      if (genderChance < this.species.malePercent) {
        this.gender = Gender.MALE;
      } else {
        this.gender = Gender.FEMALE;
      }
    }
  }

  /**
   * @param useIllusion - Whether we want the fake or real gender (illusion ability).
   */
  getGender(ignoreOverride?: boolean, useIllusion = false): Gender {
    if (useIllusion && this.summonData.illusion) {
      return this.summonData.illusion.gender;
    }
    if (!ignoreOverride && !isNullOrUndefined(this.summonData.gender)) {
      return this.summonData.gender;
    }
    return this.gender;
  }

  /**
   * @param useIllusion - Whether we want the fake or real gender (illusion ability).
   */
  getFusionGender(ignoreOverride?: boolean, useIllusion = false): Gender {
    if (useIllusion && this.summonData.illusion?.fusionGender) {
      return this.summonData.illusion.fusionGender;
    }
    if (!ignoreOverride && !isNullOrUndefined(this.summonData.fusionGender)) {
      return this.summonData.fusionGender;
    }
    return this.fusionGender;
  }

  /**
   * @param useIllusion - Whether we want the fake or real shininess (illusion ability).
   */
  isShiny(useIllusion = false): boolean {
    if (!useIllusion && this.summonData.illusion) {
      return !!(
        this.summonData.illusion.basePokemon?.shiny ||
        (this.summonData.illusion.fusionSpecies && this.summonData.illusion.basePokemon?.fusionShiny)
      );
    }
    return this.shiny || (this.isFusion(useIllusion) && this.fusionShiny);
  }

  isBaseShiny(useIllusion = false) {
    if (!useIllusion && this.summonData.illusion) {
      return !!this.summonData.illusion.basePokemon?.shiny;
    }
    return this.shiny;
  }

  isFusionShiny(useIllusion = false) {
    if (!useIllusion && this.summonData.illusion) {
      return !!this.summonData.illusion.basePokemon?.fusionShiny;
    }
    return this.isFusion(useIllusion) && this.fusionShiny;
  }

  /**
   *
   * @param useIllusion - Whether we want the fake or real shininess (illusion ability).
   * @returns `true` if the {@linkcode Pokemon} is shiny and the fusion is shiny as well, `false` otherwise
   */
  isDoubleShiny(useIllusion = false): boolean {
    if (!useIllusion && this.summonData.illusion?.basePokemon) {
      return (
        this.isFusion(false) &&
        this.summonData.illusion.basePokemon.shiny &&
        this.summonData.illusion.basePokemon.fusionShiny
      );
    }
    return this.isFusion(useIllusion) && this.shiny && this.fusionShiny;
  }

  /**
   * @param useIllusion - Whether we want the fake or real variant (illusion ability).
   */
  getVariant(useIllusion = false): Variant {
    if (!useIllusion && this.summonData.illusion) {
      return !this.isFusion(false)
        ? this.summonData.illusion.basePokemon!.variant
        : (Math.max(this.variant, this.fusionVariant) as Variant);
    }
    return !this.isFusion(true) ? this.variant : (Math.max(this.variant, this.fusionVariant) as Variant);
  }

  getBaseVariant(doubleShiny: boolean): Variant {
    if (doubleShiny) {
      return this.summonData.illusion?.basePokemon?.variant ?? this.variant;
    }
    return this.getVariant();
  }

  getLuck(): number {
    return this.luck + (this.isFusion() ? this.fusionLuck : 0);
  }

  isFusion(useIllusion = false): boolean {
    if (useIllusion && this.summonData.illusion) {
      return !!this.summonData.illusion.fusionSpecies;
    }
    return !!this.fusionSpecies;
  }

  /**
   * @param useIllusion - Whether we want the fake name or the real name of the Pokemon (for Illusion ability).
   */
  getName(useIllusion = false): string {
    return !useIllusion && this.summonData.illusion?.basePokemon
      ? this.summonData.illusion.basePokemon.name
      : this.name;
  }

  /**
   * Checks if the {@linkcode Pokemon} has a fusion with the specified {@linkcode SpeciesId}.
   * @param species the pokemon {@linkcode SpeciesId} to check
   * @returns `true` if the {@linkcode Pokemon} has a fusion with the specified {@linkcode SpeciesId}, `false` otherwise
   */
  hasFusionSpecies(species: SpeciesId): boolean {
    return this.fusionSpecies?.speciesId === species;
  }

  /**
   * Checks if the {@linkcode Pokemon} has is the specified {@linkcode SpeciesId} or is fused with it.
   * @param species the pokemon {@linkcode SpeciesId} to check
   * @param formKey If provided, requires the species to be in that form
   * @returns `true` if the pokemon is the species or is fused with it, `false` otherwise
   */
  hasSpecies(species: SpeciesId, formKey?: string): boolean {
    if (isNullOrUndefined(formKey)) {
      return this.species.speciesId === species || this.fusionSpecies?.speciesId === species;
    }

    return (
      (this.species.speciesId === species && this.getFormKey() === formKey) ||
      (this.fusionSpecies?.speciesId === species && this.getFusionFormKey() === formKey)
    );
  }

  abstract isBoss(): boolean;

  getMoveset(ignoreOverride?: boolean): PokemonMove[] {
    const ret = !ignoreOverride && this.summonData.moveset ? this.summonData.moveset : this.moveset;

    // Overrides moveset based on arrays specified in overrides.ts
    let overrideArray: MoveId | Array<MoveId> = this.isPlayer()
      ? Overrides.MOVESET_OVERRIDE
      : Overrides.OPP_MOVESET_OVERRIDE;
    overrideArray = coerceArray(overrideArray);
    if (overrideArray.length > 0) {
      if (!this.isPlayer()) {
        this.moveset = [];
      }
      overrideArray.forEach((move: MoveId, index: number) => {
        const ppUsed = this.moveset[index]?.ppUsed ?? 0;
        this.moveset[index] = new PokemonMove(move, Math.min(ppUsed, allMoves[move].pp));
      });
    }

    return ret;
  }

  /**
   * Checks which egg moves have been unlocked for the {@linkcode Pokemon} based
   * on the species it was met at or by the first {@linkcode Pokemon} in its evolution
   * line that can act as a starter and provides those egg moves.
   * @returns an array of {@linkcode MoveId}, the length of which is determined by how many
   * egg moves are unlocked for that species.
   */
  getUnlockedEggMoves(): MoveId[] {
    const moves: MoveId[] = [];
    const species =
      this.metSpecies in speciesEggMoves ? this.metSpecies : this.getSpeciesForm(true).getRootSpeciesId(true);
    if (species in speciesEggMoves) {
      for (let i = 0; i < 4; i++) {
        if (globalScene.gameData.starterData[species].eggMoves & (1 << i)) {
          moves.push(speciesEggMoves[species][i]);
        }
      }
    }
    return moves;
  }

  /**
   * Gets all possible learnable level moves for the {@linkcode Pokemon},
   * excluding any moves already known.
   *
   * Available egg moves are only included if the {@linkcode Pokemon} was
   * in the starting party of the run and if Fresh Start is not active.
   * @returns an array of {@linkcode MoveId}, the length of which is determined
   * by how many learnable moves there are for the {@linkcode Pokemon}.
   */
  public getLearnableLevelMoves(): MoveId[] {
    let levelMoves = this.getLevelMoves(1, true, false, true).map(lm => lm[1]);
    if (this.metBiome === -1 && !globalScene.gameMode.isFreshStartChallenge() && !globalScene.gameMode.isDaily) {
      levelMoves = this.getUnlockedEggMoves().concat(levelMoves);
    }
    if (Array.isArray(this.usedTMs) && this.usedTMs.length > 0) {
      levelMoves = this.usedTMs.filter(m => !levelMoves.includes(m)).concat(levelMoves);
    }
    levelMoves = levelMoves.filter(lm => !this.moveset.some(m => m.moveId === lm));
    return levelMoves;
  }

  /**
   * Gets the types of a pokemon
   * @param includeTeraType - `true` to include tera-formed type; Default: `false`
   * @param forDefend - `true` if the pokemon is defending from an attack; Default: `false`
   * @param ignoreOverride - If `true`, ignore ability changing effects; Default: `false`
   * @param useIllusion - `true` to return the types of the illusion instead of the actual types; Default: `false`
   * @returns array of {@linkcode PokemonType}
   */
  public getTypes(
    includeTeraType = false,
    forDefend = false,
    ignoreOverride = false,
    useIllusion = false,
  ): PokemonType[] {
    const types: PokemonType[] = [];

    if (includeTeraType && this.isTerastallized) {
      const teraType = this.getTeraType();
      if (this.isTerastallized && !(forDefend && teraType === PokemonType.STELLAR)) {
        // Stellar tera uses its original types defensively
        types.push(teraType);
        if (forDefend) {
          return types;
        }
      }
    }
    if (!types.length || !includeTeraType) {
      if (
        !ignoreOverride &&
        this.summonData.types &&
        this.summonData.types.length > 0 &&
        (!this.summonData.illusion || !useIllusion)
      ) {
        this.summonData.types.forEach(t => types.push(t));
      } else {
        const speciesForm = this.getSpeciesForm(ignoreOverride, useIllusion);
        const fusionSpeciesForm = this.getFusionSpeciesForm(ignoreOverride, useIllusion);
        const customTypes = this.customPokemonData.types?.length > 0;

        // First type, checking for "permanently changed" types from ME
        const firstType =
          customTypes && this.customPokemonData.types[0] !== PokemonType.UNKNOWN
            ? this.customPokemonData.types[0]
            : speciesForm.type1;
        types.push(firstType);

        // Second type
        let secondType: PokemonType = PokemonType.UNKNOWN;

        if (fusionSpeciesForm) {
          // Check if the fusion Pokemon also has permanent changes from ME when determining the fusion types
          const fusionType1 =
            this.fusionCustomPokemonData?.types &&
            this.fusionCustomPokemonData.types.length > 0 &&
            this.fusionCustomPokemonData.types[0] !== PokemonType.UNKNOWN
              ? this.fusionCustomPokemonData.types[0]
              : fusionSpeciesForm.type1;
          const fusionType2 =
            this.fusionCustomPokemonData?.types &&
            this.fusionCustomPokemonData.types.length > 1 &&
            this.fusionCustomPokemonData.types[1] !== PokemonType.UNKNOWN
              ? this.fusionCustomPokemonData.types[1]
              : fusionSpeciesForm.type2;

          // Assign second type if the fusion can provide one
          if (fusionType2 !== null && fusionType2 !== types[0]) {
            secondType = fusionType2;
          } else if (fusionType1 !== types[0]) {
            secondType = fusionType1;
          }

          if (secondType === PokemonType.UNKNOWN && isNullOrUndefined(fusionType2)) {
            // If second pokemon was monotype and shared its primary type
            secondType =
              customTypes &&
              this.customPokemonData.types.length > 1 &&
              this.customPokemonData.types[1] !== PokemonType.UNKNOWN
                ? this.customPokemonData.types[1]
                : (speciesForm.type2 ?? PokemonType.UNKNOWN);
          }
        } else {
          // If not a fusion, just get the second type from the species, checking for permanent changes from ME
          secondType =
            customTypes &&
            this.customPokemonData.types.length > 1 &&
            this.customPokemonData.types[1] !== PokemonType.UNKNOWN
              ? this.customPokemonData.types[1]
              : (speciesForm.type2 ?? PokemonType.UNKNOWN);
        }

        if (secondType !== PokemonType.UNKNOWN) {
          types.push(secondType);
        }
      }
    }

    // become UNKNOWN if no types are present
    if (!types.length) {
      types.push(PokemonType.UNKNOWN);
    }

    // remove UNKNOWN if other types are present
    if (types.length > 1 && types.includes(PokemonType.UNKNOWN)) {
      const index = types.indexOf(PokemonType.UNKNOWN);
      if (index !== -1) {
        types.splice(index, 1);
      }
    }

    // check type added to Pokemon from moves like Forest's Curse or Trick Or Treat
    if (!ignoreOverride && this.summonData.addedType && !types.includes(this.summonData.addedType)) {
      types.push(this.summonData.addedType);
    }

    // If both types are the same (can happen in weird custom typing scenarios), reduce to single type
    if (types.length > 1 && types[0] === types[1]) {
      types.splice(0, 1);
    }

    return types;
  }

  /**
   * Checks if the pokemon's typing includes the specified type
   * @param type - {@linkcode PokemonType} to check
   * @param includeTeraType - `true` to include tera-formed type; Default: `true`
   * @param forDefend - `true` if the pokemon is defending from an attack; Default: `false`
   * @param ignoreOverride - If `true`, ignore ability changing effects; Default: `false`
   * @returns `true` if the Pokemon's type matches
   */
  public isOfType(type: PokemonType, includeTeraType = true, forDefend = false, ignoreOverride = false): boolean {
    return this.getTypes(includeTeraType, forDefend, ignoreOverride).some(t => t === type);
  }

  /**
   * Gets the non-passive ability of the pokemon. This accounts for fusions and ability changing effects.
   * This should rarely be called, most of the time {@linkcode hasAbility} or {@linkcode hasAbilityWithAttr} are better used as
   * those check both the passive and non-passive abilities and account for ability suppression.
   * @see {@linkcode hasAbility} {@linkcode hasAbilityWithAttr} Intended ways to check abilities in most cases
   * @param ignoreOverride - If `true`, ignore ability changing effects; Default: `false`
   * @returns The non-passive {@linkcode Ability} of the pokemon
   */
  public getAbility(ignoreOverride = false): Ability {
    if (!ignoreOverride && this.summonData.ability) {
      return allAbilities[this.summonData.ability];
    }
    if (Overrides.ABILITY_OVERRIDE && this.isPlayer()) {
      return allAbilities[Overrides.ABILITY_OVERRIDE];
    }
    if (Overrides.OPP_ABILITY_OVERRIDE && this.isEnemy()) {
      return allAbilities[Overrides.OPP_ABILITY_OVERRIDE];
    }
    if (this.isFusion()) {
      if (!isNullOrUndefined(this.fusionCustomPokemonData?.ability) && this.fusionCustomPokemonData.ability !== -1) {
        return allAbilities[this.fusionCustomPokemonData.ability];
      }
      return allAbilities[this.getFusionSpeciesForm(ignoreOverride).getAbility(this.fusionAbilityIndex)];
    }
    if (!isNullOrUndefined(this.customPokemonData.ability) && this.customPokemonData.ability !== -1) {
      return allAbilities[this.customPokemonData.ability];
    }
    let abilityId = this.getSpeciesForm(ignoreOverride).getAbility(this.abilityIndex);
    if (abilityId === AbilityId.NONE) {
      abilityId = this.species.ability1;
    }
    return allAbilities[abilityId];
  }

  /**
   * Gets the passive ability of the pokemon. This should rarely be called, most of the time
   * {@linkcode hasAbility} or {@linkcode hasAbilityWithAttr} are better used as those check both the passive and
   * non-passive abilities and account for ability suppression.
   * @see {@linkcode hasAbility} {@linkcode hasAbilityWithAttr} Intended ways to check abilities in most cases
   * @returns The passive {@linkcode Ability} of the pokemon
   */
  public getPassiveAbility(): Ability {
    if (Overrides.PASSIVE_ABILITY_OVERRIDE && this.isPlayer()) {
      return allAbilities[Overrides.PASSIVE_ABILITY_OVERRIDE];
    }
    if (Overrides.OPP_PASSIVE_ABILITY_OVERRIDE && this.isEnemy()) {
      return allAbilities[Overrides.OPP_PASSIVE_ABILITY_OVERRIDE];
    }
    if (!isNullOrUndefined(this.customPokemonData.passive) && this.customPokemonData.passive !== -1) {
      return allAbilities[this.customPokemonData.passive];
    }

    return allAbilities[this.species.getPassiveAbility(this.formIndex)];
  }

  /**
   * Gets a list of all instances of a given ability attribute among abilities this pokemon has.
   * Accounts for all the various effects which can affect whether an ability will be present or
   * in effect, and both passive and non-passive.
   * @param attrType - {@linkcode AbAttr} The ability attribute to check for.
   * @param canApply - Whether to check if the ability is currently active; Default `true`
   * @param ignoreOverride - Whether to ignore ability changing effects; Default `false`
   * @returns An array of all the ability attributes on this ability.
   */
  public getAbilityAttrs<T extends AbAttrString>(attrType: T, canApply = true, ignoreOverride = false): AbAttrMap[T][] {
    const abilityAttrs: AbAttrMap[T][] = [];

    if (!canApply || this.canApplyAbility()) {
      abilityAttrs.push(...this.getAbility(ignoreOverride).getAttrs(attrType));
    }

    if (!canApply || this.canApplyAbility(true)) {
      abilityAttrs.push(...this.getPassiveAbility().getAttrs(attrType));
    }

    return abilityAttrs;
  }

  /**
   * Sets the {@linkcode Pokemon}'s ability and activates it if it normally activates on summon
   *
   * Also clears primal weather if it is from the ability being changed
   * @param ability New Ability
   */
  public setTempAbility(ability: Ability, passive = false): void {
    applyOnLoseAbAttrs(this, passive);
    if (passive) {
      this.summonData.passiveAbility = ability.id;
    } else {
      this.summonData.ability = ability.id;
    }
    applyOnGainAbAttrs(this, passive);
  }

  /**
   * Suppresses an ability and calls its onlose attributes
   */
  public suppressAbility() {
    [true, false].forEach(passive => applyOnLoseAbAttrs(this, passive));
    this.summonData.abilitySuppressed = true;
  }

  /**
   * Checks if a pokemon has a passive either from:
   *  - bought with starter candy
   *  - set by override
   *  - is a boss pokemon
   * @returns `true` if the Pokemon has a passive
   */
  public hasPassive(): boolean {
    // returns override if valid for current case
    if (
      (Overrides.HAS_PASSIVE_ABILITY_OVERRIDE === false && this.isPlayer()) ||
      (Overrides.OPP_HAS_PASSIVE_ABILITY_OVERRIDE === false && this.isEnemy())
    ) {
      return false;
    }
    if (
      ((Overrides.PASSIVE_ABILITY_OVERRIDE !== AbilityId.NONE || Overrides.HAS_PASSIVE_ABILITY_OVERRIDE) &&
        this.isPlayer()) ||
      ((Overrides.OPP_PASSIVE_ABILITY_OVERRIDE !== AbilityId.NONE || Overrides.OPP_HAS_PASSIVE_ABILITY_OVERRIDE) &&
        this.isEnemy())
    ) {
      return true;
    }

    // Classic Final boss and Endless Minor/Major bosses do not have passive
    const { currentBattle, gameMode } = globalScene;
    const waveIndex = currentBattle?.waveIndex;
    if (
      this.isEnemy() &&
      (currentBattle?.battleSpec === BattleSpec.FINAL_BOSS ||
        gameMode.isEndlessMinorBoss(waveIndex) ||
        gameMode.isEndlessMajorBoss(waveIndex))
    ) {
      return false;
    }

    return this.passive || this.isBoss();
  }

  /**
   * Checks whether an ability of a pokemon can be currently applied. This should rarely be
   * directly called, as {@linkcode hasAbility} and {@linkcode hasAbilityWithAttr} already call this.
   * @see {@linkcode hasAbility} {@linkcode hasAbilityWithAttr} Intended ways to check abilities in most cases
   * @param passive If true, check if passive can be applied instead of non-passive
   * @returns `true` if the ability can be applied
   */
  public canApplyAbility(passive = false): boolean {
    if (passive && !this.hasPassive()) {
      return false;
    }
    const ability = !passive ? this.getAbility() : this.getPassiveAbility();
    if (this.isFusion() && ability.hasAttr("NoFusionAbilityAbAttr")) {
      return false;
    }
    const arena = globalScene?.arena;
    if (arena.ignoreAbilities && arena.ignoringEffectSource !== this.getBattlerIndex() && ability.isIgnorable) {
      return false;
    }
    if (this.summonData.abilitySuppressed && ability.isSuppressable) {
      return false;
    }
    const suppressAbilitiesTag = arena.getTag(ArenaTagType.NEUTRALIZING_GAS) as SuppressAbilitiesTag;
    const suppressOffField = ability.hasAttr("PreSummonAbAttr");
    if ((this.isOnField() || suppressOffField) && suppressAbilitiesTag && !suppressAbilitiesTag.isBeingRemoved()) {
      const thisAbilitySuppressing = ability.hasAttr("PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr");
      const hasSuppressingAbility = this.hasAbilityWithAttr("PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr", false);
      // Neutralizing gas is up - suppress abilities unless they are unsuppressable or this pokemon is responsible for the gas
      // (Balance decided that the other ability of a neutralizing gas pokemon should not be neutralized)
      // If the ability itself is neutralizing gas, don't suppress it (handled through arena tag)
      const unsuppressable =
        !ability.isSuppressable ||
        thisAbilitySuppressing ||
        (hasSuppressingAbility && !suppressAbilitiesTag.shouldApplyToSelf());
      if (!unsuppressable) {
        return false;
      }
    }
    return (this.hp > 0 || ability.isBypassFaint) && !ability.conditions.find(condition => !condition(this));
  }

  /**
   * Checks whether a pokemon has the specified ability and it's in effect. Accounts for all the various
   * effects which can affect whether an ability will be present or in effect, and both passive and
   * non-passive. This is the primary way to check whether a pokemon has a particular ability.
   * @param ability The ability to check for
   * @param canApply - Whether to check if the ability is currently active; default `true`
   * @param ignoreOverride Whether to ignore ability changing effects; default `false`
   * @returns `true` if the ability is present and active
   */
  public hasAbility(ability: AbilityId, canApply = true, ignoreOverride = false): boolean {
    if (this.getAbility(ignoreOverride).id === ability && (!canApply || this.canApplyAbility())) {
      return true;
    }
    return this.getPassiveAbility().id === ability && this.hasPassive() && (!canApply || this.canApplyAbility(true));
  }

  /**
   * Checks whether a pokemon has an ability with the specified attribute and it's in effect.
   * Accounts for all the various effects which can affect whether an ability will be present or
   * in effect, and both passive and non-passive. This is one of the two primary ways to check
   * whether a pokemon has a particular ability.
   * @param attrType The {@link AbAttr | ability attribute} to check for
   * @param canApply - Whether to check if the ability is currently active; default `true`
   * @param ignoreOverride Whether to ignore ability changing effects; default `false`
   * @returns `true` if an ability with the given {@linkcode AbAttr} is present and active
   */
  public hasAbilityWithAttr(attrType: AbAttrString, canApply = true, ignoreOverride = false): boolean {
    if ((!canApply || this.canApplyAbility()) && this.getAbility(ignoreOverride).hasAttr(attrType)) {
      return true;
    }
    return this.hasPassive() && (!canApply || this.canApplyAbility(true)) && this.getPassiveAbility().hasAttr(attrType);
  }

  public getAbilityPriorities(): [number, number] {
    return [this.getAbility().postSummonPriority, this.getPassiveAbility().postSummonPriority];
  }

  /**
   * Gets the weight of the Pokemon with subtractive modifiers (Autotomize) happening first
   * and then multiplicative modifiers happening after (Heavy Metal and Light Metal)
   * @returns the kg of the Pokemon (minimum of 0.1)
   */
  public getWeight(): number {
    const autotomizedTag = this.getTag(AutotomizedTag);
    let weightRemoved = 0;
    if (!isNullOrUndefined(autotomizedTag)) {
      weightRemoved = 100 * autotomizedTag!.autotomizeCount;
    }
    const minWeight = 0.1;
    const weight = new NumberHolder(this.species.weight - weightRemoved);

    // This will trigger the ability overlay so only call this function when necessary
    applyAbAttrs("WeightMultiplierAbAttr", this, null, false, weight);
    return Math.max(minWeight, weight.value);
  }

  /**
   * @returns the pokemon's current tera {@linkcode PokemonType}
   */
  getTeraType(): PokemonType {
    if (this.hasSpecies(SpeciesId.TERAPAGOS)) {
      return PokemonType.STELLAR;
    }
    if (this.hasSpecies(SpeciesId.OGERPON)) {
      const ogerponForm = this.species.speciesId === SpeciesId.OGERPON ? this.formIndex : this.fusionFormIndex;
      switch (ogerponForm) {
        case 0:
        case 4:
          return PokemonType.GRASS;
        case 1:
        case 5:
          return PokemonType.WATER;
        case 2:
        case 6:
          return PokemonType.FIRE;
        case 3:
        case 7:
          return PokemonType.ROCK;
      }
    }
    if (this.hasSpecies(SpeciesId.SHEDINJA)) {
      return PokemonType.BUG;
    }
    return this.teraType;
  }

  public isGrounded(): boolean {
    return (
      !!this.getTag(GroundedTag) ||
      (!this.isOfType(PokemonType.FLYING, true, true) &&
        !this.hasAbility(AbilityId.LEVITATE) &&
        !this.getTag(BattlerTagType.FLOATING) &&
        !this.getTag(SemiInvulnerableTag))
    );
  }

  /**
   * Determines whether this Pokemon is prevented from running or switching due
   * to effects from moves and/or abilities.
   * @param trappedAbMessages - If defined, ability trigger messages
   * (e.g. from Shadow Tag) are forwarded through this array.
   * @param simulated - If `true`, applies abilities via simulated calls.
   * @returns `true` if the pokemon is trapped
   */
  public isTrapped(trappedAbMessages: string[] = [], simulated = true): boolean {
    const commandedTag = this.getTag(BattlerTagType.COMMANDED);
    if (commandedTag?.getSourcePokemon()?.isActive(true)) {
      return true;
    }

    if (this.isOfType(PokemonType.GHOST)) {
      return false;
    }

    const trappedByAbility = new BooleanHolder(false);
    /**
     * Contains opposing Pokemon (Enemy/Player Pokemon) depending on perspective
     * Afterwards, it filters out Pokemon that have been switched out of the field so trapped abilities/moves do not trigger
     */
    const opposingFieldUnfiltered = this.isPlayer() ? globalScene.getEnemyField() : globalScene.getPlayerField();
    const opposingField = opposingFieldUnfiltered.filter(enemyPkm => enemyPkm.switchOutStatus === false);

    for (const opponent of opposingField) {
      applyCheckTrappedAbAttrs("CheckTrappedAbAttr", opponent, trappedByAbility, this, trappedAbMessages, simulated);
    }

    const side = this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    return (
      trappedByAbility.value ||
      !!this.getTag(TrappedTag) ||
      !!globalScene.arena.getTagOnSide(ArenaTagType.FAIRY_LOCK, side)
    );
  }

  /**
   * Calculates the type of a move when used by this Pokemon after
   * type-changing move and ability attributes have applied.
   * @param move - {@linkcode Move} The move being used.
   * @param simulated - If `true`, prevents showing abilities applied in this calculation.
   * @returns The {@linkcode PokemonType} of the move after attributes are applied
   */
  public getMoveType(move: Move, simulated = true): PokemonType {
    const moveTypeHolder = new NumberHolder(move.type);

    applyMoveAttrs("VariableMoveTypeAttr", this, null, move, moveTypeHolder);
    applyPreAttackAbAttrs("MoveTypeChangeAbAttr", this, null, move, simulated, moveTypeHolder);

    // If the user is terastallized and the move is tera blast, or tera starstorm that is stellar type,
    // then bypass the check for ion deluge and electrify
    if (
      this.isTerastallized &&
      (move.id === MoveId.TERA_BLAST ||
        (move.id === MoveId.TERA_STARSTORM && moveTypeHolder.value === PokemonType.STELLAR))
    ) {
      return moveTypeHolder.value as PokemonType;
    }

    globalScene.arena.applyTags(ArenaTagType.ION_DELUGE, simulated, moveTypeHolder);
    if (this.getTag(BattlerTagType.ELECTRIFIED)) {
      moveTypeHolder.value = PokemonType.ELECTRIC;
    }

    return moveTypeHolder.value as PokemonType;
  }

  /**
   * Calculates the effectiveness of a move against the Pokémon.
   * This includes modifiers from move and ability attributes.
   * @param source {@linkcode Pokemon} The attacking Pokémon.
   * @param move {@linkcode Move} The move being used by the attacking Pokémon.
   * @param ignoreAbility Whether to ignore abilities that might affect type effectiveness or immunity (defaults to `false`).
   * @param simulated Whether to apply abilities via simulated calls (defaults to `true`)
   * @param cancelled {@linkcode BooleanHolder} Stores whether the move was cancelled by a non-type-based immunity.
   * @param useIllusion - Whether we want the attack move effectiveness on the illusion or not
   * @returns The type damage multiplier, indicating the effectiveness of the move
   */
  getMoveEffectiveness(
    source: Pokemon,
    move: Move,
    ignoreAbility = false,
    simulated = true,
    cancelled?: BooleanHolder,
    useIllusion = false,
  ): TypeDamageMultiplier {
    if (!isNullOrUndefined(this.turnData?.moveEffectiveness)) {
      return this.turnData?.moveEffectiveness;
    }

    if (move.hasAttr("TypelessAttr")) {
      return 1;
    }
    const moveType = source.getMoveType(move);

    const typeMultiplier = new NumberHolder(
      move.category !== MoveCategory.STATUS || move.hasAttr("RespectAttackTypeImmunityAttr")
        ? this.getAttackTypeEffectiveness(moveType, source, false, simulated, move, useIllusion)
        : 1,
    );

    applyMoveAttrs("VariableMoveTypeMultiplierAttr", source, this, move, typeMultiplier);
    if (this.getTypes(true, true).find(t => move.isTypeImmune(source, this, t))) {
      typeMultiplier.value = 0;
    }

    if (this.getTag(TarShotTag) && this.getMoveType(move) === PokemonType.FIRE) {
      typeMultiplier.value *= 2;
    }

    const cancelledHolder = cancelled ?? new BooleanHolder(false);
    if (!ignoreAbility) {
      applyPreDefendAbAttrs("TypeImmunityAbAttr", this, source, move, cancelledHolder, simulated, typeMultiplier);

      if (!cancelledHolder.value) {
        applyPreDefendAbAttrs("MoveImmunityAbAttr", this, source, move, cancelledHolder, simulated, typeMultiplier);
      }

      if (!cancelledHolder.value) {
        const defendingSidePlayField = this.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();
        defendingSidePlayField.forEach(p =>
          applyPreDefendAbAttrs("FieldPriorityMoveImmunityAbAttr", p, source, move, cancelledHolder),
        );
      }
    }

    const immuneTags = this.findTags(tag => tag instanceof TypeImmuneTag && tag.immuneType === moveType);
    for (const tag of immuneTags) {
      if (move && !move.getAttrs("HitsTagAttr").some(attr => attr.tagType === tag.tagType)) {
        typeMultiplier.value = 0;
        break;
      }
    }

    // Apply Tera Shell's effect to attacks after all immunities are accounted for
    if (!ignoreAbility && move.category !== MoveCategory.STATUS) {
      applyPreDefendAbAttrs("FullHpResistTypeAbAttr", this, source, move, cancelledHolder, simulated, typeMultiplier);
    }

    if (move.category === MoveCategory.STATUS && move.hitsSubstitute(source, this)) {
      typeMultiplier.value = 0;
    }

    return (!cancelledHolder.value ? typeMultiplier.value : 0) as TypeDamageMultiplier;
  }

  /**
   * Calculates the move's type effectiveness multiplier based on the target's type/s.
   * @param moveType {@linkcode PokemonType} the type of the move being used
   * @param source {@linkcode Pokemon} the Pokemon using the move
   * @param ignoreStrongWinds whether or not this ignores strong winds (anticipation, forewarn, stealth rocks)
   * @param simulated tag to only apply the strong winds effect message when the move is used
   * @param move (optional) the move whose type effectiveness is to be checked. Used for applying {@linkcode VariableMoveTypeChartAttr}
   * @param useIllusion - Whether we want the attack type effectiveness on the illusion or not
   * @returns a multiplier for the type effectiveness
   */
  getAttackTypeEffectiveness(
    moveType: PokemonType,
    source?: Pokemon,
    ignoreStrongWinds = false,
    simulated = true,
    move?: Move,
    useIllusion = false,
  ): TypeDamageMultiplier {
    if (moveType === PokemonType.STELLAR) {
      return this.isTerastallized ? 2 : 1;
    }
    const types = this.getTypes(true, true, undefined, useIllusion);
    const arena = globalScene.arena;

    // Handle flying v ground type immunity without removing flying type so effective types are still effective
    // Related to https://github.com/pagefaultgames/pokerogue/issues/524
    if (moveType === PokemonType.GROUND && (this.isGrounded() || arena.hasTag(ArenaTagType.GRAVITY))) {
      const flyingIndex = types.indexOf(PokemonType.FLYING);
      if (flyingIndex > -1) {
        types.splice(flyingIndex, 1);
      }
    }

    let multiplier = types
      .map(defType => {
        const multiplier = new NumberHolder(getTypeDamageMultiplier(moveType, defType));
        applyChallenges(ChallengeType.TYPE_EFFECTIVENESS, multiplier);
        if (move) {
          applyMoveAttrs("VariableMoveTypeChartAttr", null, this, move, multiplier, defType);
        }
        if (source) {
          const ignoreImmunity = new BooleanHolder(false);
          if (source.isActive(true) && source.hasAbilityWithAttr("IgnoreTypeImmunityAbAttr")) {
            applyAbAttrs("IgnoreTypeImmunityAbAttr", source, ignoreImmunity, simulated, moveType, defType);
          }
          if (ignoreImmunity.value) {
            if (multiplier.value === 0) {
              return 1;
            }
          }

          const exposedTags = this.findTags(tag => tag instanceof ExposedTag) as ExposedTag[];
          if (exposedTags.some(t => t.ignoreImmunity(defType, moveType))) {
            if (multiplier.value === 0) {
              return 1;
            }
          }
        }
        return multiplier.value;
      })
      .reduce((acc, cur) => acc * cur, 1) as TypeDamageMultiplier;

    const typeMultiplierAgainstFlying = new NumberHolder(getTypeDamageMultiplier(moveType, PokemonType.FLYING));
    applyChallenges(ChallengeType.TYPE_EFFECTIVENESS, typeMultiplierAgainstFlying);
    // Handle strong winds lowering effectiveness of types super effective against pure flying
    if (
      !ignoreStrongWinds &&
      arena.weather?.weatherType === WeatherType.STRONG_WINDS &&
      !arena.weather.isEffectSuppressed() &&
      this.isOfType(PokemonType.FLYING) &&
      typeMultiplierAgainstFlying.value === 2
    ) {
      multiplier /= 2;
      if (!simulated) {
        globalScene.phaseManager.queueMessage(i18next.t("weather:strongWindsEffectMessage"));
      }
    }
    return multiplier as TypeDamageMultiplier;
  }

  /**
   * Computes the given Pokemon's matchup score against this Pokemon.
   * In most cases, this score ranges from near-zero to 16, but the maximum possible matchup score is 64.
   * @param opponent {@linkcode Pokemon} The Pokemon to compare this Pokemon against
   * @returns A score value based on how favorable this Pokemon is when fighting the given Pokemon
   */
  getMatchupScore(opponent: Pokemon): number {
    const types = this.getTypes(true);

    const enemyTypes = opponent.getTypes(true, true, false, true);
    /** Is this Pokemon faster than the opponent? */
    const outspeed =
      (this.isActive(true) ? this.getEffectiveStat(Stat.SPD, opponent) : this.getStat(Stat.SPD, false)) >=
      opponent.getEffectiveStat(Stat.SPD, this);
    /**
     * Based on how effective this Pokemon's types are offensively against the opponent's types.
     * This score is increased by 25 percent if this Pokemon is faster than the opponent.
     */
    let atkScore =
      opponent.getAttackTypeEffectiveness(types[0], this, false, true, undefined, true) * (outspeed ? 1.25 : 1);
    /**
     * Based on how effectively this Pokemon defends against the opponent's types.
     * This score cannot be higher than 4.
     */
    let defScore = 1 / Math.max(this.getAttackTypeEffectiveness(enemyTypes[0], opponent), 0.25);
    if (types.length > 1) {
      atkScore *= opponent.getAttackTypeEffectiveness(types[1], this);
    }
    if (enemyTypes.length > 1) {
      defScore *=
        1 / Math.max(this.getAttackTypeEffectiveness(enemyTypes[1], opponent, false, false, undefined, true), 0.25);
    }
    atkScore *= 1.25; //give more value for the pokemon's typing
    const moveset = this.moveset;
    let moveAtkScoreLength = 0;
    for (const move of moveset) {
      if (move.getMove().category === MoveCategory.SPECIAL || move.getMove().category === MoveCategory.PHYSICAL) {
        atkScore += opponent.getAttackTypeEffectiveness(move.getMove().type, this, false, true, undefined, true);
        moveAtkScoreLength++;
      }
    }
    atkScore = atkScore / (moveAtkScoreLength + 1); //calculate the median for the attack score
    /**
     * Based on this Pokemon's HP ratio compared to that of the opponent.
     * This ratio is multiplied by 1.5 if this Pokemon outspeeds the opponent;
     * however, the final ratio cannot be higher than 1.
     */
    const hpRatio = this.getHpRatio();
    const oppHpRatio = opponent.getHpRatio();
    const isDying = hpRatio <= 0.2;
    let hpDiffRatio = hpRatio + (1 - oppHpRatio);
    if (isDying && this.isActive(true)) {
      //It might be a sacrifice candidate if hp under 20%
      const badMatchup = atkScore < 1.5 && defScore < 1.5;
      if (!outspeed && badMatchup) {
        //It might not be a worthy sacrifice if it doesn't outspeed or doesn't do enough damage
        hpDiffRatio *= 0.85;
      } else {
        hpDiffRatio = Math.min(1 - hpRatio + (outspeed ? 0.2 : 0.1), 1);
      }
    } else if (outspeed) {
      hpDiffRatio = Math.min(hpDiffRatio * 1.25, 1);
    } else if (hpRatio > 0.2 && hpRatio <= 0.4) {
      //Might be considered to be switched because it's not in low enough health
      hpDiffRatio = Math.min(hpDiffRatio * 0.5, 1);
    }
    return (atkScore + defScore) * hpDiffRatio;
  }

  getEvolution(): SpeciesFormEvolution | null {
    if (pokemonEvolutions.hasOwnProperty(this.species.speciesId)) {
      const evolutions = pokemonEvolutions[this.species.speciesId];
      for (const e of evolutions) {
        if (e.validate(this)) {
          return e;
        }
      }
    }

    if (this.isFusion() && this.fusionSpecies && pokemonEvolutions.hasOwnProperty(this.fusionSpecies.speciesId)) {
      const fusionEvolutions = pokemonEvolutions[this.fusionSpecies.speciesId].map(
        e => new FusionSpeciesFormEvolution(this.species.speciesId, e),
      );
      for (const fe of fusionEvolutions) {
        if (fe.validate(this)) {
          return fe;
        }
      }
    }

    return null;
  }

  /**
   * Gets all level up moves in a given range for a particular pokemon.
   * @param {number} startingLevel Don't include moves below this level
   * @param {boolean} includeEvolutionMoves Whether to include evolution moves
   * @param {boolean} simulateEvolutionChain Whether to include moves from prior evolutions
   * @param {boolean} includeRelearnerMoves Whether to include moves that would require a relearner. Note the move relearner inherently allows evolution moves
   * @returns {LevelMoves} A list of moves and the levels they can be learned at
   */
  getLevelMoves(
    startingLevel?: number,
    includeEvolutionMoves = false,
    simulateEvolutionChain = false,
    includeRelearnerMoves = false,
    learnSituation: LearnMoveSituation = LearnMoveSituation.MISC,
  ): LevelMoves {
    const ret: LevelMoves = [];
    let levelMoves: LevelMoves = [];
    if (!startingLevel) {
      startingLevel = this.level;
    }
    if (learnSituation === LearnMoveSituation.EVOLUTION_FUSED && this.fusionSpecies) {
      // For fusion evolutions, get ONLY the moves of the component mon that evolved
      levelMoves = this.getFusionSpeciesForm(true)
        .getLevelMoves()
        .filter(
          lm =>
            (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) ||
            (includeRelearnerMoves && lm[0] === RELEARN_MOVE) ||
            lm[0] > 0,
        );
    } else {
      if (simulateEvolutionChain) {
        const evolutionChain = this.species.getSimulatedEvolutionChain(
          this.level,
          this.hasTrainer(),
          this.isBoss(),
          this.isPlayer(),
        );
        for (let e = 0; e < evolutionChain.length; e++) {
          // TODO: Might need to pass specific form index in simulated evolution chain
          const speciesLevelMoves = getPokemonSpeciesForm(evolutionChain[e][0], this.formIndex).getLevelMoves();
          if (includeRelearnerMoves) {
            levelMoves.push(...speciesLevelMoves);
          } else {
            levelMoves.push(
              ...speciesLevelMoves.filter(
                lm =>
                  (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) ||
                  ((!e || lm[0] > 1) && (e === evolutionChain.length - 1 || lm[0] <= evolutionChain[e + 1][1])),
              ),
            );
          }
        }
      } else {
        levelMoves = this.getSpeciesForm(true)
          .getLevelMoves()
          .filter(
            lm =>
              (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) ||
              (includeRelearnerMoves && lm[0] === RELEARN_MOVE) ||
              lm[0] > 0,
          );
      }
      if (this.fusionSpecies && learnSituation !== LearnMoveSituation.EVOLUTION_FUSED_BASE) {
        // For fusion evolutions, get ONLY the moves of the component mon that evolved
        if (simulateEvolutionChain) {
          const fusionEvolutionChain = this.fusionSpecies.getSimulatedEvolutionChain(
            this.level,
            this.hasTrainer(),
            this.isBoss(),
            this.isPlayer(),
          );
          for (let e = 0; e < fusionEvolutionChain.length; e++) {
            // TODO: Might need to pass specific form index in simulated evolution chain
            const speciesLevelMoves = getPokemonSpeciesForm(
              fusionEvolutionChain[e][0],
              this.fusionFormIndex,
            ).getLevelMoves();
            if (includeRelearnerMoves) {
              levelMoves.push(
                ...speciesLevelMoves.filter(
                  lm => (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) || lm[0] !== EVOLVE_MOVE,
                ),
              );
            } else {
              levelMoves.push(
                ...speciesLevelMoves.filter(
                  lm =>
                    (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) ||
                    ((!e || lm[0] > 1) &&
                      (e === fusionEvolutionChain.length - 1 || lm[0] <= fusionEvolutionChain[e + 1][1])),
                ),
              );
            }
          }
        } else {
          levelMoves.push(
            ...this.getFusionSpeciesForm(true)
              .getLevelMoves()
              .filter(
                lm =>
                  (includeEvolutionMoves && lm[0] === EVOLVE_MOVE) ||
                  (includeRelearnerMoves && lm[0] === RELEARN_MOVE) ||
                  lm[0] > 0,
              ),
          );
        }
      }
    }
    levelMoves.sort((lma: [number, number], lmb: [number, number]) => (lma[0] > lmb[0] ? 1 : lma[0] < lmb[0] ? -1 : 0));

    /**
     * Filter out moves not within the correct level range(s)
     * Includes moves below startingLevel, or of specifically level 0 if
     * includeRelearnerMoves or includeEvolutionMoves are true respectively
     */
    levelMoves = levelMoves.filter(lm => {
      const level = lm[0];
      const isRelearner = level < startingLevel;
      const allowedEvolutionMove = level === 0 && includeEvolutionMoves;

      return !(level > this.level) && (includeRelearnerMoves || !isRelearner || allowedEvolutionMove);
    });

    /**
     * This must be done AFTER filtering by level, else if the same move shows up
     * in levelMoves multiple times all but the lowest level one will be skipped.
     * This causes problems when there are intentional duplicates (i.e. Smeargle with Sketch)
     */
    if (levelMoves) {
      this.getUniqueMoves(levelMoves, ret);
    }

    return ret;
  }

  /**
   * Helper function for getLevelMoves.
   * Finds all non-duplicate items from the input, and pushes them into the output.
   * Two items count as duplicate if they have the same Move, regardless of level.
   *
   * @param levelMoves the input array to search for non-duplicates from
   * @param ret the output array to be pushed into.
   */
  private getUniqueMoves(levelMoves: LevelMoves, ret: LevelMoves): void {
    const uniqueMoves: MoveId[] = [];
    for (const lm of levelMoves) {
      if (!uniqueMoves.find(m => m === lm[1])) {
        uniqueMoves.push(lm[1]);
        ret.push(lm);
      }
    }
  }

  /**
   * Get a list of all egg moves
   *
   * @returns list of egg moves
   */
  getEggMoves(): MoveId[] | undefined {
    return speciesEggMoves[this.getSpeciesForm().getRootSpeciesId()];
  }

  setMove(moveIndex: number, moveId: MoveId): void {
    if (moveId === MoveId.NONE) {
      return;
    }
    const move = new PokemonMove(moveId);
    this.moveset[moveIndex] = move;
    if (this.summonData.moveset) {
      this.summonData.moveset[moveIndex] = move;
    }
  }

  /**
   * Function that tries to set a Pokemon shiny based on the trainer's trainer ID and secret ID.
   * Endless Pokemon in the end biome are unable to be set to shiny
   *
   * The exact mechanic is that it calculates E as the XOR of the player's trainer ID and secret ID.
   * F is calculated as the XOR of the first 16 bits of the Pokemon's ID with the last 16 bits.
   * The XOR of E and F are then compared to the {@linkcode shinyThreshold} (or {@linkcode thresholdOverride} if set) to see whether or not to generate a shiny.
   * The base shiny odds are {@linkcode BASE_SHINY_CHANCE} / 65536
   * @param thresholdOverride number that is divided by 2^16 (65536) to get the shiny chance, overrides {@linkcode shinyThreshold} if set (bypassing shiny rate modifiers such as Shiny Charm)
   * @returns true if the Pokemon has been set as a shiny, false otherwise
   */
  trySetShiny(thresholdOverride?: number): boolean {
    // Shiny Pokemon should not spawn in the end biome in endless
    if (globalScene.gameMode.isEndless && globalScene.arena.biomeType === BiomeId.END) {
      return false;
    }

    const rand1 = (this.id & 0xffff0000) >>> 16;
    const rand2 = this.id & 0x0000ffff;

    const E = globalScene.gameData.trainerId ^ globalScene.gameData.secretId;
    const F = rand1 ^ rand2;

    const shinyThreshold = new NumberHolder(BASE_SHINY_CHANCE);
    if (thresholdOverride === undefined) {
      if (timedEventManager.isEventActive()) {
        const tchance = timedEventManager.getClassicTrainerShinyChance();
        shinyThreshold.value *= timedEventManager.getShinyMultiplier();
        if (this.hasTrainer() && tchance > 0) {
          shinyThreshold.value = Math.max(tchance, shinyThreshold.value); // Choose the higher boost
        }
      }
      if (!this.hasTrainer()) {
        globalScene.applyModifiers(ShinyRateBoosterModifier, true, shinyThreshold);
      }
    } else {
      shinyThreshold.value = thresholdOverride;
    }

    this.shiny = (E ^ F) < shinyThreshold.value;

    if (this.shiny) {
      this.initShinySparkle();
    }

    return this.shiny;
  }

  /**
   * Function that tries to set a Pokemon shiny based on seed.
   * For manual use only, usually to roll a Pokemon's shiny chance a second time.
   * If it rolls shiny, or if it's already shiny, also sets a random variant and give the Pokemon the associated luck.
   *
   * The base shiny odds are {@linkcode BASE_SHINY_CHANCE} / `65536`
   * @param thresholdOverride number that is divided by `2^16` (`65536`) to get the shiny chance, overrides {@linkcode shinyThreshold} if set (bypassing shiny rate modifiers such as Shiny Charm)
   * @param applyModifiersToOverride If {@linkcode thresholdOverride} is set and this is true, will apply Shiny Charm and event modifiers to {@linkcode thresholdOverride}
   * @returns `true` if the Pokemon has been set as a shiny, `false` otherwise
   */
  public trySetShinySeed(thresholdOverride?: number, applyModifiersToOverride?: boolean): boolean {
    if (!this.shiny) {
      const shinyThreshold = new NumberHolder(thresholdOverride ?? BASE_SHINY_CHANCE);
      if (applyModifiersToOverride) {
        if (timedEventManager.isEventActive()) {
          shinyThreshold.value *= timedEventManager.getShinyMultiplier();
        }
        globalScene.applyModifiers(ShinyRateBoosterModifier, true, shinyThreshold);
      }

      this.shiny = randSeedInt(65536) < shinyThreshold.value;
    }

    if (this.shiny) {
      this.variant = this.variant ?? 0;
      this.variant = Math.max(this.generateShinyVariant(), this.variant) as Variant; // Don't set a variant lower than the current one
      this.luck = this.variant + 1 + (this.fusionShiny ? this.fusionVariant + 1 : 0);
      this.initShinySparkle();
    }

    return this.shiny;
  }

  /**
   * Generates a shiny variant
   * @returns `0-2`, with the following probabilities:
   * - Has a 10% chance of returning `2` (epic variant)
   * - Has a 30% chance of returning `1` (rare variant)
   * - Has a 60% chance of returning `0` (basic shiny)
   */
  protected generateShinyVariant(): Variant {
    const formIndex: number = this.formIndex;
    let variantDataIndex: string | number = this.species.speciesId;
    if (this.species.forms.length > 0) {
      const formKey = this.species.forms[formIndex]?.formKey;
      if (formKey) {
        variantDataIndex = `${variantDataIndex}-${formKey}`;
      }
    }
    // Checks if there is no variant data for both the index or index with form
    if (
      !this.shiny ||
      (!variantData.hasOwnProperty(variantDataIndex) && !variantData.hasOwnProperty(this.species.speciesId))
    ) {
      return 0;
    }
    const rand = new NumberHolder(0);
    globalScene.executeWithSeedOffset(
      () => {
        rand.value = randSeedInt(10);
      },
      this.id,
      globalScene.waveSeed,
    );
    if (rand.value >= SHINY_VARIANT_CHANCE) {
      return 0; // 6/10
    }
    if (rand.value >= SHINY_EPIC_CHANCE) {
      return 1; // 3/10
    }
    return 2; // 1/10
  }

  /**
   * Function that tries to set a Pokemon to have its hidden ability based on seed, if it exists.
   * For manual use only, usually to roll a Pokemon's hidden ability chance a second time.
   *
   * The base hidden ability odds are {@linkcode BASE_HIDDEN_ABILITY_CHANCE} / `65536`
   * @param thresholdOverride number that is divided by `2^16` (`65536`) to get the HA chance, overrides {@linkcode haThreshold} if set (bypassing HA rate modifiers such as Ability Charm)
   * @param applyModifiersToOverride If {@linkcode thresholdOverride} is set and this is true, will apply Ability Charm to {@linkcode thresholdOverride}
   * @returns `true` if the Pokemon has been set to have its hidden ability, `false` otherwise
   */
  public tryRerollHiddenAbilitySeed(thresholdOverride?: number, applyModifiersToOverride?: boolean): boolean {
    if (!this.species.abilityHidden) {
      return false;
    }
    const haThreshold = new NumberHolder(thresholdOverride ?? BASE_HIDDEN_ABILITY_CHANCE);
    if (applyModifiersToOverride) {
      if (!this.hasTrainer()) {
        globalScene.applyModifiers(HiddenAbilityRateBoosterModifier, true, haThreshold);
      }
    }

    if (randSeedInt(65536) < haThreshold.value) {
      this.abilityIndex = 2;
    }

    return this.abilityIndex === 2;
  }

  public generateFusionSpecies(forStarter?: boolean): void {
    const hiddenAbilityChance = new NumberHolder(BASE_HIDDEN_ABILITY_CHANCE);
    if (!this.hasTrainer()) {
      globalScene.applyModifiers(HiddenAbilityRateBoosterModifier, true, hiddenAbilityChance);
    }

    const hasHiddenAbility = !randSeedInt(hiddenAbilityChance.value);
    const randAbilityIndex = randSeedInt(2);

    const filter = !forStarter
      ? this.species.getCompatibleFusionSpeciesFilter()
      : (species: PokemonSpecies) => {
          return (
            pokemonEvolutions.hasOwnProperty(species.speciesId) &&
            !pokemonPrevolutions.hasOwnProperty(species.speciesId) &&
            !species.subLegendary &&
            !species.legendary &&
            !species.mythical &&
            !species.isTrainerForbidden() &&
            species.speciesId !== this.species.speciesId &&
            species.speciesId !== SpeciesId.DITTO
          );
        };

    let fusionOverride: PokemonSpecies | undefined;

    if (forStarter && this.isPlayer() && Overrides.STARTER_FUSION_SPECIES_OVERRIDE) {
      fusionOverride = getPokemonSpecies(Overrides.STARTER_FUSION_SPECIES_OVERRIDE);
    } else if (this.isEnemy() && Overrides.OPP_FUSION_SPECIES_OVERRIDE) {
      fusionOverride = getPokemonSpecies(Overrides.OPP_FUSION_SPECIES_OVERRIDE);
    }

    this.fusionSpecies =
      fusionOverride ??
      globalScene.randomSpecies(globalScene.currentBattle?.waveIndex || 0, this.level, false, filter, true);
    this.fusionAbilityIndex =
      this.fusionSpecies.abilityHidden && hasHiddenAbility
        ? 2
        : this.fusionSpecies.ability2 !== this.fusionSpecies.ability1
          ? randAbilityIndex
          : 0;
    this.fusionShiny = this.shiny;
    this.fusionVariant = this.variant;

    if (this.fusionSpecies.malePercent === null) {
      this.fusionGender = Gender.GENDERLESS;
    } else {
      const genderChance = (this.id % 256) * 0.390625;
      if (genderChance < this.fusionSpecies.malePercent) {
        this.fusionGender = Gender.MALE;
      } else {
        this.fusionGender = Gender.FEMALE;
      }
    }

    this.fusionFormIndex = globalScene.getSpeciesFormIndex(
      this.fusionSpecies,
      this.fusionGender,
      this.getNature(),
      true,
    );
    this.fusionLuck = this.luck;

    this.generateName();
  }

  public clearFusionSpecies(): void {
    this.fusionSpecies = null;
    this.fusionFormIndex = 0;
    this.fusionAbilityIndex = 0;
    this.fusionShiny = false;
    this.fusionVariant = 0;
    this.fusionGender = 0;
    this.fusionLuck = 0;
    this.fusionCustomPokemonData = null;

    this.generateName();
    this.calculateStats();
  }

  /** Generates a semi-random moveset for a Pokemon */
  public generateAndPopulateMoveset(): void {
    this.moveset = [];
    let movePool: [MoveId, number][] = [];
    const allLevelMoves = this.getLevelMoves(1, true, true);
    if (!allLevelMoves) {
      console.warn("Error encountered trying to generate moveset for:", this.species.name);
      return;
    }

    for (let m = 0; m < allLevelMoves.length; m++) {
      const levelMove = allLevelMoves[m];
      if (this.level < levelMove[0]) {
        break;
      }
      let weight = levelMove[0];
      // Evolution Moves
      if (weight === EVOLVE_MOVE) {
        weight = 50;
      }
      // Assume level 1 moves with 80+ BP are "move reminder" moves and bump their weight. Trainers use actual relearn moves.
      if ((weight === 1 && allMoves[levelMove[1]].power >= 80) || (weight === RELEARN_MOVE && this.hasTrainer())) {
        weight = 40;
      }
      if (!movePool.some(m => m[0] === levelMove[1]) && !allMoves[levelMove[1]].name.endsWith(" (N)")) {
        movePool.push([levelMove[1], weight]);
      }
    }

    if (this.hasTrainer()) {
      const tms = Object.keys(tmSpecies);
      for (const tm of tms) {
        const moveId = Number.parseInt(tm) as MoveId;
        let compatible = false;
        for (const p of tmSpecies[tm]) {
          if (Array.isArray(p)) {
            if (
              p[0] === this.species.speciesId ||
              (this.fusionSpecies &&
                p[0] === this.fusionSpecies.speciesId &&
                p.slice(1).indexOf(this.species.forms[this.formIndex]) > -1)
            ) {
              compatible = true;
              break;
            }
          } else if (p === this.species.speciesId || (this.fusionSpecies && p === this.fusionSpecies.speciesId)) {
            compatible = true;
            break;
          }
        }
        if (compatible && !movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
          if (tmPoolTiers[moveId] === ModifierTier.COMMON && this.level >= 15) {
            movePool.push([moveId, 4]);
          } else if (tmPoolTiers[moveId] === ModifierTier.GREAT && this.level >= 30) {
            movePool.push([moveId, 8]);
          } else if (tmPoolTiers[moveId] === ModifierTier.ULTRA && this.level >= 50) {
            movePool.push([moveId, 14]);
          }
        }
      }

      // No egg moves below level 60
      if (this.level >= 60) {
        for (let i = 0; i < 3; i++) {
          const moveId = speciesEggMoves[this.species.getRootSpeciesId()][i];
          if (!movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
            movePool.push([moveId, 40]);
          }
        }
        const moveId = speciesEggMoves[this.species.getRootSpeciesId()][3];
        // No rare egg moves before e4
        if (
          this.level >= 170 &&
          !movePool.some(m => m[0] === moveId) &&
          !allMoves[moveId].name.endsWith(" (N)") &&
          !this.isBoss()
        ) {
          movePool.push([moveId, 30]);
        }
        if (this.fusionSpecies) {
          for (let i = 0; i < 3; i++) {
            const moveId = speciesEggMoves[this.fusionSpecies.getRootSpeciesId()][i];
            if (!movePool.some(m => m[0] === moveId) && !allMoves[moveId].name.endsWith(" (N)")) {
              movePool.push([moveId, 40]);
            }
          }
          const moveId = speciesEggMoves[this.fusionSpecies.getRootSpeciesId()][3];
          // No rare egg moves before e4
          if (
            this.level >= 170 &&
            !movePool.some(m => m[0] === moveId) &&
            !allMoves[moveId].name.endsWith(" (N)") &&
            !this.isBoss()
          ) {
            movePool.push([moveId, 30]);
          }
        }
      }
    }

    // Bosses never get self ko moves or Pain Split
    if (this.isBoss()) {
      movePool = movePool.filter(
        m => !allMoves[m[0]].hasAttr("SacrificialAttr") && !allMoves[m[0]].hasAttr("HpSplitAttr"),
      );
    }
    // No one gets Memento or Final Gambit
    movePool = movePool.filter(m => !allMoves[m[0]].hasAttr("SacrificialAttrOnHit"));
    if (this.hasTrainer()) {
      // Trainers never get OHKO moves
      movePool = movePool.filter(m => !allMoves[m[0]].hasAttr("OneHitKOAttr"));
      // Half the weight of self KO moves
      movePool = movePool.map(m => [m[0], m[1] * (allMoves[m[0]].hasAttr("SacrificialAttr") ? 0.5 : 1)]);
      // Trainers get a weight bump to stat buffing moves
      movePool = movePool.map(m => [
        m[0],
        m[1] * (allMoves[m[0]].getAttrs("StatStageChangeAttr").some(a => a.stages > 1 && a.selfTarget) ? 1.25 : 1),
      ]);
      // Trainers get a weight decrease to multiturn moves
      movePool = movePool.map(m => [
        m[0],
        m[1] * (!!allMoves[m[0]].isChargingMove() || !!allMoves[m[0]].hasAttr("RechargeAttr") ? 0.7 : 1),
      ]);
    }

    // Weight towards higher power moves, by reducing the power of moves below the highest power.
    // Caps max power at 90 to avoid something like hyper beam ruining the stats.
    // This is a pretty soft weighting factor, although it is scaled with the weight multiplier.
    const maxPower = Math.min(
      movePool.reduce((v, m) => Math.max(allMoves[m[0]].calculateEffectivePower(), v), 40),
      90,
    );
    movePool = movePool.map(m => [
      m[0],
      m[1] *
        (allMoves[m[0]].category === MoveCategory.STATUS
          ? 1
          : Math.max(Math.min(allMoves[m[0]].calculateEffectivePower() / maxPower, 1), 0.5)),
    ]);

    // Weight damaging moves against the lower stat. This uses a non-linear relationship.
    // If the higher stat is 1 - 1.09x higher, no change. At higher stat ~1.38x lower stat, off-stat moves have half weight.
    // One third weight at ~1.58x higher, one quarter weight at ~1.73x higher, one fifth at ~1.87x, and one tenth at ~2.35x higher.
    const atk = this.getStat(Stat.ATK);
    const spAtk = this.getStat(Stat.SPATK);
    const worseCategory: MoveCategory = atk > spAtk ? MoveCategory.SPECIAL : MoveCategory.PHYSICAL;
    const statRatio = worseCategory === MoveCategory.PHYSICAL ? atk / spAtk : spAtk / atk;
    movePool = movePool.map(m => [
      m[0],
      m[1] * (allMoves[m[0]].category === worseCategory ? Math.min(Math.pow(statRatio, 3) * 1.3, 1) : 1),
    ]);

    /** The higher this is the more the game weights towards higher level moves. At `0` all moves are equal weight. */
    let weightMultiplier = 1.6;
    if (this.isBoss()) {
      weightMultiplier += 0.4;
    }
    const baseWeights: [MoveId, number][] = movePool.map(m => [
      m[0],
      Math.ceil(Math.pow(m[1], weightMultiplier) * 100),
    ]);

    // All Pokemon force a STAB move first
    const stabMovePool = baseWeights.filter(
      m => allMoves[m[0]].category !== MoveCategory.STATUS && this.isOfType(allMoves[m[0]].type),
    );

    if (stabMovePool.length) {
      const totalWeight = stabMovePool.reduce((v, m) => v + m[1], 0);
      let rand = randSeedInt(totalWeight);
      let index = 0;
      while (rand > stabMovePool[index][1]) {
        rand -= stabMovePool[index++][1];
      }
      this.moveset.push(new PokemonMove(stabMovePool[index][0]));
    }

    while (baseWeights.length > this.moveset.length && this.moveset.length < 4) {
      if (this.hasTrainer()) {
        // Sqrt the weight of any damaging moves with overlapping types. This is about a 0.05 - 0.1 multiplier.
        // Other damaging moves 2x weight if 0-1 damaging moves, 0.5x if 2, 0.125x if 3. These weights get 20x if STAB.
        // Status moves remain unchanged on weight, this encourages 1-2
        movePool = baseWeights
          .filter(
            m =>
              !this.moveset.some(
                mo =>
                  m[0] === mo.moveId ||
                  (allMoves[m[0]].hasAttr("SacrificialAttr") && mo.getMove().hasAttr("SacrificialAttr")), // Only one self-KO move allowed
              ),
          )
          .map(m => {
            let ret: number;
            if (
              this.moveset.some(
                mo => mo.getMove().category !== MoveCategory.STATUS && mo.getMove().type === allMoves[m[0]].type,
              )
            ) {
              ret = Math.ceil(Math.sqrt(m[1]));
            } else if (allMoves[m[0]].category !== MoveCategory.STATUS) {
              ret = Math.ceil(
                (m[1] /
                  Math.max(Math.pow(4, this.moveset.filter(mo => (mo.getMove().power ?? 0) > 1).length) / 8, 0.5)) *
                  (this.isOfType(allMoves[m[0]].type) ? 20 : 1),
              );
            } else {
              ret = m[1];
            }
            return [m[0], ret];
          });
      } else {
        // Non-trainer pokemon just use normal weights
        movePool = baseWeights.filter(
          m =>
            !this.moveset.some(
              mo =>
                m[0] === mo.moveId ||
                (allMoves[m[0]].hasAttr("SacrificialAttr") && mo.getMove().hasAttr("SacrificialAttr")), // Only one self-KO move allowed
            ),
        );
      }
      const totalWeight = movePool.reduce((v, m) => v + m[1], 0);
      let rand = randSeedInt(totalWeight);
      let index = 0;
      while (rand > movePool[index][1]) {
        rand -= movePool[index++][1];
      }
      this.moveset.push(new PokemonMove(movePool[index][0]));
    }

    // Trigger FormChange, except for enemy Pokemon during Mystery Encounters, to avoid crashes
    if (
      this.isPlayer() ||
      !globalScene.currentBattle?.isBattleMysteryEncounter() ||
      !globalScene.currentBattle?.mysteryEncounter
    ) {
      globalScene.triggerPokemonFormChange(this, SpeciesFormChangeMoveLearnedTrigger);
    }
  }

  public trySelectMove(moveIndex: number, ignorePp?: boolean): boolean {
    const move = this.getMoveset().length > moveIndex ? this.getMoveset()[moveIndex] : null;
    return move?.isUsable(this, ignorePp) ?? false;
  }

  showInfo(): void {
    if (!this.battleInfo.visible) {
      const otherBattleInfo = globalScene.fieldUI
        .getAll()
        .slice(0, 4)
        .filter(ui => ui instanceof BattleInfo && (ui as BattleInfo) instanceof PlayerBattleInfo === this.isPlayer())
        .find(() => true);
      if (!otherBattleInfo || !this.getFieldIndex()) {
        globalScene.fieldUI.sendToBack(this.battleInfo);
        globalScene.sendTextToBack(); // Push the top right text objects behind everything else
      } else {
        globalScene.fieldUI.moveAbove(this.battleInfo, otherBattleInfo);
      }
      this.battleInfo.setX(this.battleInfo.x + (this.isPlayer() ? 150 : !this.isBoss() ? -150 : -198));
      this.battleInfo.setVisible(true);
      if (this.isPlayer()) {
        // TODO: How do you get this to not require a private property access?
        this["battleInfo"].expMaskRect.x += 150;
      }
      globalScene.tweens.add({
        targets: [this.battleInfo, this.battleInfo.expMaskRect],
        x: this.isPlayer() ? "-=150" : `+=${!this.isBoss() ? 150 : 246}`,
        duration: 1000,
        ease: "Cubic.easeOut",
      });
    }
  }

  hideInfo(): Promise<void> {
    return new Promise(resolve => {
      if (this.battleInfo?.visible) {
        globalScene.tweens.add({
          targets: [this.battleInfo, this.battleInfo.expMaskRect],
          x: this.isPlayer() ? "+=150" : `-=${!this.isBoss() ? 150 : 246}`,
          duration: 500,
          ease: "Cubic.easeIn",
          onComplete: () => {
            if (this.isPlayer()) {
              // TODO: How do you get this to not require a private property access?
              this["battleInfo"].expMaskRect.x -= 150;
            }
            this.battleInfo.setVisible(false);
            this.battleInfo.setX(this.battleInfo.x - (this.isPlayer() ? 150 : !this.isBoss() ? -150 : -198));
            resolve();
          },
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * sets if the pokemon is switching out (if it's a enemy wild implies it's going to flee)
   * @param status - boolean
   */
  setSwitchOutStatus(status: boolean): void {
    this.switchOutStatus = status;
  }

  updateInfo(instant?: boolean): Promise<void> {
    return this.battleInfo.updateInfo(this, instant);
  }

  toggleStats(visible: boolean): void {
    this.battleInfo.toggleStats(visible);
  }

  /**
   * Adds experience to this PlayerPokemon, subject to wave based level caps.
   * @param exp The amount of experience to add
   * @param ignoreLevelCap Whether to ignore level caps when adding experience (defaults to false)
   */
  addExp(exp: number, ignoreLevelCap = false) {
    const maxExpLevel = globalScene.getMaxExpLevel(ignoreLevelCap);
    const initialExp = this.exp;
    this.exp += exp;
    while (this.level < maxExpLevel && this.exp >= getLevelTotalExp(this.level + 1, this.species.growthRate)) {
      this.level++;
    }
    if (this.level >= maxExpLevel) {
      console.log(initialExp, this.exp, getLevelTotalExp(this.level, this.species.growthRate));
      this.exp = Math.max(getLevelTotalExp(this.level, this.species.growthRate), initialExp);
    }
    this.levelExp = this.exp - getLevelTotalExp(this.level, this.species.growthRate);
  }

  /**
   * Compares if `this` and {@linkcode target} are on the same team.
   * @param target the {@linkcode Pokemon} to compare against.
   * @returns `true` if the two pokemon are allies, `false` otherwise
   */
  public isOpponent(target: Pokemon): boolean {
    return this.isPlayer() !== target.isPlayer();
  }

  getOpponent(targetIndex: number): Pokemon | null {
    const ret = this.getOpponents()[targetIndex];
    // TODO: why does this check for summonData and can we remove it?
    if (ret.summonData) {
      return ret;
    }
    return null;
  }

  /**
   * Returns the pokemon that oppose this one and are active
   *
   * @param onField - whether to also check if the pokemon is currently on the field (defaults to true)
   */
  getOpponents(onField = true): Pokemon[] {
    return ((this.isPlayer() ? globalScene.getEnemyField() : globalScene.getPlayerField()) as Pokemon[]).filter(p =>
      p.isActive(onField),
    );
  }

  getOpponentDescriptor(): string {
    const opponents = this.getOpponents();
    if (opponents.length === 1) {
      return opponents[0].name;
    }
    return this.isPlayer() ? i18next.t("arenaTag:opposingTeam") : i18next.t("arenaTag:yourTeam");
  }

  getAlly(): Pokemon | undefined {
    return (this.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField())[this.getFieldIndex() ? 0 : 1];
  }

  /**
   * Gets the Pokémon on the allied field.
   *
   * @returns An array of Pokémon on the allied field.
   */
  getAlliedField(): Pokemon[] {
    return this.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();
  }

  /**
   * Calculates the stat stage multiplier of the user against an opponent.
   *
   * Note that this does not apply to evasion or accuracy
   * @see {@linkcode getAccuracyMultiplier}
   * @param stat the desired {@linkcode EffectiveStat}
   * @param opponent the target {@linkcode Pokemon}
   * @param move the {@linkcode Move} being used
   * @param ignoreOppAbility determines whether the effects of the opponent's abilities (i.e. Unaware) should be ignored (`false` by default)
   * @param isCritical determines whether a critical hit has occurred or not (`false` by default)
   * @param simulated determines whether effects are applied without altering game state (`true` by default)
   * @param ignoreHeldItems determines whether this Pokemon's held items should be ignored during the stat calculation, default `false`
   * @return the stat stage multiplier to be used for effective stat calculation
   */
  getStatStageMultiplier(
    stat: EffectiveStat,
    opponent?: Pokemon,
    move?: Move,
    ignoreOppAbility = false,
    isCritical = false,
    simulated = true,
    ignoreHeldItems = false,
  ): number {
    const statStage = new NumberHolder(this.getStatStage(stat));
    const ignoreStatStage = new BooleanHolder(false);

    if (opponent) {
      if (isCritical) {
        switch (stat) {
          case Stat.ATK:
          case Stat.SPATK:
            statStage.value = Math.max(statStage.value, 0);
            break;
          case Stat.DEF:
          case Stat.SPDEF:
            statStage.value = Math.min(statStage.value, 0);
            break;
        }
      }
      if (!ignoreOppAbility) {
        applyAbAttrs("IgnoreOpponentStatStagesAbAttr", opponent, null, simulated, stat, ignoreStatStage);
      }
      if (move) {
        applyMoveAttrs("IgnoreOpponentStatStagesAttr", this, opponent, move, ignoreStatStage);
      }
    }

    if (!ignoreStatStage.value) {
      const statStageMultiplier = new NumberHolder(Math.max(2, 2 + statStage.value) / Math.max(2, 2 - statStage.value));
      if (!ignoreHeldItems) {
        globalScene.applyModifiers(TempStatStageBoosterModifier, this.isPlayer(), stat, statStageMultiplier);
      }
      return Math.min(statStageMultiplier.value, 4);
    }
    return 1;
  }

  /**
   * Calculates the accuracy multiplier of the user against a target.
   *
   * This method considers various factors such as the user's accuracy level, the target's evasion level,
   * abilities, and modifiers to compute the final accuracy multiplier.
   *
   * @param target {@linkcode Pokemon} - The target Pokémon against which the move is used.
   * @param sourceMove {@linkcode Move}  - The move being used by the user.
   * @returns The calculated accuracy multiplier.
   */
  getAccuracyMultiplier(target: Pokemon, sourceMove: Move): number {
    const isOhko = sourceMove.hasAttr("OneHitKOAccuracyAttr");
    if (isOhko) {
      return 1;
    }

    const userAccStage = new NumberHolder(this.getStatStage(Stat.ACC));
    const targetEvaStage = new NumberHolder(target.getStatStage(Stat.EVA));

    const ignoreAccStatStage = new BooleanHolder(false);
    const ignoreEvaStatStage = new BooleanHolder(false);

    applyAbAttrs("IgnoreOpponentStatStagesAbAttr", target, null, false, Stat.ACC, ignoreAccStatStage);
    applyAbAttrs("IgnoreOpponentStatStagesAbAttr", this, null, false, Stat.EVA, ignoreEvaStatStage);
    applyMoveAttrs("IgnoreOpponentStatStagesAttr", this, target, sourceMove, ignoreEvaStatStage);

    globalScene.applyModifiers(TempStatStageBoosterModifier, this.isPlayer(), Stat.ACC, userAccStage);

    userAccStage.value = ignoreAccStatStage.value ? 0 : Math.min(userAccStage.value, 6);
    targetEvaStage.value = ignoreEvaStatStage.value ? 0 : targetEvaStage.value;

    if (target.findTag(t => t instanceof ExposedTag)) {
      targetEvaStage.value = Math.min(0, targetEvaStage.value);
    }

    const accuracyMultiplier = new NumberHolder(1);
    if (userAccStage.value !== targetEvaStage.value) {
      accuracyMultiplier.value =
        userAccStage.value > targetEvaStage.value
          ? (3 + Math.min(userAccStage.value - targetEvaStage.value, 6)) / 3
          : 3 / (3 + Math.min(targetEvaStage.value - userAccStage.value, 6));
    }

    applyStatMultiplierAbAttrs("StatMultiplierAbAttr", this, Stat.ACC, accuracyMultiplier, false, sourceMove);

    const evasionMultiplier = new NumberHolder(1);
    applyStatMultiplierAbAttrs("StatMultiplierAbAttr", target, Stat.EVA, evasionMultiplier);

    const ally = this.getAlly();
    if (!isNullOrUndefined(ally)) {
      const ignore =
        this.hasAbilityWithAttr("MoveAbilityBypassAbAttr") || sourceMove.hasFlag(MoveFlags.IGNORE_ABILITIES);
      applyAllyStatMultiplierAbAttrs(
        "AllyStatMultiplierAbAttr",
        ally,
        Stat.ACC,
        accuracyMultiplier,
        false,
        this,
        ignore,
      );
      applyAllyStatMultiplierAbAttrs(
        "AllyStatMultiplierAbAttr",
        ally,
        Stat.EVA,
        evasionMultiplier,
        false,
        this,
        ignore,
      );
    }

    return accuracyMultiplier.value / evasionMultiplier.value;
  }

  /**
   * Calculates the base damage of the given move against this Pokemon when attacked by the given source.
   * Used during damage calculation and for Shell Side Arm's forecasting effect.
   * @param source - The attacking {@linkcode Pokemon}.
   * @param move - The {@linkcode Move} used in the attack.
   * @param moveCategory - The move's {@linkcode MoveCategory} after variable-category effects are applied.
   * @param ignoreAbility - If `true`, ignores this Pokemon's defensive ability effects (defaults to `false`).
   * @param ignoreSourceAbility - If `true`, ignore's the attacking Pokemon's ability effects (defaults to `false`).
   * @param ignoreAllyAbility - If `true`, ignores the ally Pokemon's ability effects (defaults to `false`).
   * @param ignoreSourceAllyAbility - If `true`, ignores the attacking Pokemon's ally's ability effects (defaults to `false`).
   * @param isCritical - if `true`, calculates effective stats as if the hit were critical (defaults to `false`).
   * @param simulated - if `true`, suppresses changes to game state during calculation (defaults to `true`).
   * @returns The move's base damage against this Pokemon when used by the source Pokemon.
   */
  getBaseDamage({
    source,
    move,
    moveCategory,
    ignoreAbility = false,
    ignoreSourceAbility = false,
    ignoreAllyAbility = false,
    ignoreSourceAllyAbility = false,
    isCritical = false,
    simulated = true,
  }: getBaseDamageParams): number {
    const isPhysical = moveCategory === MoveCategory.PHYSICAL;

    /** A base damage multiplier based on the source's level */
    const levelMultiplier = (2 * source.level) / 5 + 2;

    /** The power of the move after power boosts from abilities, etc. have applied */
    const power = move.calculateBattlePower(source, this, simulated);

    /**
     * The attacker's offensive stat for the given move's category.
     * Critical hits cause negative stat stages to be ignored.
     */
    const sourceAtk = new NumberHolder(
      source.getEffectiveStat(
        isPhysical ? Stat.ATK : Stat.SPATK,
        this,
        undefined,
        ignoreSourceAbility,
        ignoreAbility,
        ignoreAllyAbility,
        isCritical,
        simulated,
      ),
    );
    applyMoveAttrs("VariableAtkAttr", source, this, move, sourceAtk);

    /**
     * This Pokemon's defensive stat for the given move's category.
     * Critical hits cause positive stat stages to be ignored.
     */
    const targetDef = new NumberHolder(
      this.getEffectiveStat(
        isPhysical ? Stat.DEF : Stat.SPDEF,
        source,
        move,
        ignoreAbility,
        ignoreSourceAbility,
        ignoreSourceAllyAbility,
        isCritical,
        simulated,
      ),
    );
    applyMoveAttrs("VariableDefAttr", source, this, move, targetDef);

    /**
     * The attack's base damage, as determined by the source's level, move power
     * and Attack stat as well as this Pokemon's Defense stat
     */
    const baseDamage = (levelMultiplier * power * sourceAtk.value) / targetDef.value / 50 + 2;

    /** Debug message for non-simulated calls (i.e. when damage is actually dealt) */
    if (!simulated) {
      console.log("base damage", baseDamage, move.name, power, sourceAtk.value, targetDef.value);
    }

    return baseDamage;
  }

  /** Determine the STAB multiplier for a move used against this pokemon.
   *
   * @param source - The attacking {@linkcode Pokemon}
   * @param move - The {@linkcode Move} used in the attack
   * @param ignoreSourceAbility - If `true`, ignores the attacking Pokemon's ability effects
   * @param simulated - If `true`, suppresses changes to game state during the calculation
   *
   * @returns The STAB multiplier for the move used against this Pokemon
   */
  calculateStabMultiplier(source: Pokemon, move: Move, ignoreSourceAbility: boolean, simulated: boolean): number {
    // If the move has the Typeless attribute, it doesn't get STAB (e.g. struggle)
    if (move.hasAttr("TypelessAttr")) {
      return 1;
    }
    const sourceTypes = source.getTypes();
    const sourceTeraType = source.getTeraType();
    const moveType = source.getMoveType(move);
    const matchesSourceType = sourceTypes.includes(source.getMoveType(move));
    const stabMultiplier = new NumberHolder(1);
    if (matchesSourceType && moveType !== PokemonType.STELLAR) {
      stabMultiplier.value += 0.5;
    }

    applyMoveAttrs("CombinedPledgeStabBoostAttr", source, this, move, stabMultiplier);

    if (!ignoreSourceAbility) {
      applyAbAttrs("StabBoostAbAttr", source, null, simulated, stabMultiplier);
    }

    if (source.isTerastallized && sourceTeraType === moveType && moveType !== PokemonType.STELLAR) {
      stabMultiplier.value += 0.5;
    }

    if (
      source.isTerastallized &&
      source.getTeraType() === PokemonType.STELLAR &&
      (!source.stellarTypesBoosted.includes(moveType) || source.hasSpecies(SpeciesId.TERAPAGOS))
    ) {
      stabMultiplier.value += matchesSourceType ? 0.5 : 0.2;
    }

    return Math.min(stabMultiplier.value, 2.25);
  }

  /**
   * Calculates the damage of an attack made by another Pokemon against this Pokemon
   * @param source {@linkcode Pokemon} the attacking Pokemon
   * @param move The {@linkcode Move} used in the attack
   * @param ignoreAbility If `true`, ignores this Pokemon's defensive ability effects
   * @param ignoreSourceAbility If `true`, ignores the attacking Pokemon's ability effects
   * @param ignoreAllyAbility If `true`, ignores the ally Pokemon's ability effects
   * @param ignoreSourceAllyAbility If `true`, ignores the ability effects of the attacking pokemon's ally
   * @param isCritical If `true`, calculates damage for a critical hit.
   * @param simulated If `true`, suppresses changes to game state during the calculation.
   * @param effectiveness If defined, used in place of calculated effectiveness values
   * @returns The {@linkcode DamageCalculationResult}
   */
  getAttackDamage({
    source,
    move,
    ignoreAbility = false,
    ignoreSourceAbility = false,
    ignoreAllyAbility = false,
    ignoreSourceAllyAbility = false,
    isCritical = false,
    simulated = true,
    effectiveness,
  }: getAttackDamageParams): DamageCalculationResult {
    const damage = new NumberHolder(0);
    const defendingSide = this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    const variableCategory = new NumberHolder(move.category);
    applyMoveAttrs("VariableMoveCategoryAttr", source, this, move, variableCategory);
    const moveCategory = variableCategory.value as MoveCategory;

    /** The move's type after type-changing effects are applied */
    const moveType = source.getMoveType(move);

    /** If `value` is `true`, cancels the move and suppresses "No Effect" messages */
    const cancelled = new BooleanHolder(false);

    /**
     * The effectiveness of the move being used. Along with type matchups, this
     * accounts for changes in effectiveness from the move's attributes and the
     * abilities of both the source and this Pokemon.
     *
     * Note that the source's abilities are not ignored here
     */
    const typeMultiplier =
      effectiveness ?? this.getMoveEffectiveness(source, move, ignoreAbility, simulated, cancelled);

    const isPhysical = moveCategory === MoveCategory.PHYSICAL;

    /** Combined damage multiplier from field effects such as weather, terrain, etc. */
    const arenaAttackTypeMultiplier = new NumberHolder(
      globalScene.arena.getAttackTypeMultiplier(moveType, source.isGrounded()),
    );
    applyMoveAttrs("IgnoreWeatherTypeDebuffAttr", source, this, move, arenaAttackTypeMultiplier);

    const isTypeImmune = typeMultiplier * arenaAttackTypeMultiplier.value === 0;

    if (cancelled.value || isTypeImmune) {
      return {
        cancelled: cancelled.value,
        result: move.id === MoveId.SHEER_COLD ? HitResult.IMMUNE : HitResult.NO_EFFECT,
        damage: 0,
      };
    }

    // If the attack deals fixed damage, return a result with that much damage
    const fixedDamage = new NumberHolder(0);
    applyMoveAttrs("FixedDamageAttr", source, this, move, fixedDamage);
    if (fixedDamage.value) {
      const multiLensMultiplier = new NumberHolder(1);
      globalScene.applyModifiers(
        PokemonMultiHitModifier,
        source.isPlayer(),
        source,
        move.id,
        null,
        multiLensMultiplier,
      );
      fixedDamage.value = toDmgValue(fixedDamage.value * multiLensMultiplier.value);

      return {
        cancelled: false,
        result: HitResult.EFFECTIVE,
        damage: fixedDamage.value,
      };
    }

    // If the attack is a one-hit KO move, return a result with damage equal to this Pokemon's HP
    const isOneHitKo = new BooleanHolder(false);
    applyMoveAttrs("OneHitKOAttr", source, this, move, isOneHitKo);
    if (isOneHitKo.value) {
      return {
        cancelled: false,
        result: HitResult.ONE_HIT_KO,
        damage: this.hp,
      };
    }

    /**
     * The attack's base damage, as determined by the source's level, move power
     * and Attack stat as well as this Pokemon's Defense stat
     */
    const baseDamage = this.getBaseDamage({
      source,
      move,
      moveCategory,
      ignoreAbility,
      ignoreSourceAbility,
      ignoreAllyAbility,
      ignoreSourceAllyAbility,
      isCritical,
      simulated,
    });

    /** 25% damage debuff on moves hitting more than one non-fainted target (regardless of immunities) */
    const { targets, multiple } = getMoveTargets(source, move.id);
    const numTargets = multiple ? targets.length : 1;
    const targetMultiplier = numTargets > 1 ? 0.75 : 1;

    /** Multiplier for moves enhanced by Multi-Lens and/or Parental Bond */
    const multiStrikeEnhancementMultiplier = new NumberHolder(1);
    globalScene.applyModifiers(
      PokemonMultiHitModifier,
      source.isPlayer(),
      source,
      move.id,
      null,
      multiStrikeEnhancementMultiplier,
    );
    if (!ignoreSourceAbility) {
      applyPreAttackAbAttrs(
        "AddSecondStrikeAbAttr",
        source,
        this,
        move,
        simulated,
        null,
        multiStrikeEnhancementMultiplier,
      );
    }

    /** Doubles damage if this Pokemon's last move was Glaive Rush */
    const glaiveRushMultiplier = new NumberHolder(1);
    if (this.getTag(BattlerTagType.RECEIVE_DOUBLE_DAMAGE)) {
      glaiveRushMultiplier.value = 2;
    }

    /** The damage multiplier when the given move critically hits */
    const criticalMultiplier = new NumberHolder(isCritical ? 1.5 : 1);
    applyAbAttrs("MultCritAbAttr", source, null, simulated, criticalMultiplier);

    /**
     * A multiplier for random damage spread in the range [0.85, 1]
     * This is always 1 for simulated calls.
     */
    const randomMultiplier = simulated ? 1 : this.randBattleSeedIntRange(85, 100) / 100;

    /** A damage multiplier for when the attack is of the attacker's type and/or Tera type. */
    const stabMultiplier = this.calculateStabMultiplier(source, move, ignoreSourceAbility, simulated);

    /** Halves damage if the attacker is using a physical attack while burned */
    let burnMultiplier = 1;
    if (
      isPhysical &&
      source.status &&
      source.status.effect === StatusEffect.BURN &&
      !move.hasAttr("BypassBurnDamageReductionAttr")
    ) {
      const burnDamageReductionCancelled = new BooleanHolder(false);
      if (!ignoreSourceAbility) {
        applyAbAttrs("BypassBurnDamageReductionAbAttr", source, burnDamageReductionCancelled, simulated);
      }
      if (!burnDamageReductionCancelled.value) {
        burnMultiplier = 0.5;
      }
    }

    /** Reduces damage if this Pokemon has a relevant screen (e.g. Light Screen for special attacks) */
    const screenMultiplier = new NumberHolder(1);

    // Critical hits should bypass screens
    if (!isCritical) {
      globalScene.arena.applyTagsForSide(
        WeakenMoveScreenTag,
        defendingSide,
        simulated,
        source,
        moveCategory,
        screenMultiplier,
      );
    }

    /**
     * For each {@linkcode HitsTagAttr} the move has, doubles the damage of the move if:
     * The target has a {@linkcode BattlerTagType} that this move interacts with
     * AND
     * The move doubles damage when used against that tag
     */
    const hitsTagMultiplier = new NumberHolder(1);
    move
      .getAttrs("HitsTagAttr")
      .filter(hta => hta.doubleDamage)
      .forEach(hta => {
        if (this.getTag(hta.tagType)) {
          hitsTagMultiplier.value *= 2;
        }
      });

    /** Halves damage if this Pokemon is grounded in Misty Terrain against a Dragon-type attack */
    const mistyTerrainMultiplier =
      globalScene.arena.terrain?.terrainType === TerrainType.MISTY &&
      this.isGrounded() &&
      moveType === PokemonType.DRAGON
        ? 0.5
        : 1;

    damage.value = toDmgValue(
      baseDamage *
        targetMultiplier *
        multiStrikeEnhancementMultiplier.value *
        arenaAttackTypeMultiplier.value *
        glaiveRushMultiplier.value *
        criticalMultiplier.value *
        randomMultiplier *
        stabMultiplier *
        typeMultiplier *
        burnMultiplier *
        screenMultiplier.value *
        hitsTagMultiplier.value *
        mistyTerrainMultiplier,
    );

    /** Doubles damage if the attacker has Tinted Lens and is using a resisted move */
    if (!ignoreSourceAbility) {
      applyPreAttackAbAttrs("DamageBoostAbAttr", source, this, move, simulated, damage);
    }

    /** Apply the enemy's Damage and Resistance tokens */
    if (!source.isPlayer()) {
      globalScene.applyModifiers(EnemyDamageBoosterModifier, false, damage);
    }
    if (!this.isPlayer()) {
      globalScene.applyModifiers(EnemyDamageReducerModifier, false, damage);
    }

    /** Apply this Pokemon's post-calc defensive modifiers (e.g. Fur Coat) */
    if (!ignoreAbility) {
      applyPreDefendAbAttrs("ReceivedMoveDamageMultiplierAbAttr", this, source, move, cancelled, simulated, damage);

      const ally = this.getAlly();
      /** Additionally apply friend guard damage reduction if ally has it. */
      if (globalScene.currentBattle.double && !isNullOrUndefined(ally) && ally.isActive(true)) {
        applyPreDefendAbAttrs("AlliedFieldDamageReductionAbAttr", ally, source, move, cancelled, simulated, damage);
      }
    }

    // This attribute may modify damage arbitrarily, so be careful about changing its order of application.
    applyMoveAttrs("ModifiedDamageAttr", source, this, move, damage);

    if (this.isFullHp() && !ignoreAbility) {
      applyPreDefendAbAttrs("PreDefendFullHpEndureAbAttr", this, source, move, cancelled, false, damage);
    }

    // debug message for when damage is applied (i.e. not simulated)
    if (!simulated) {
      console.log("damage", damage.value, move.name);
    }

    let hitResult: HitResult;
    if (typeMultiplier < 1) {
      hitResult = HitResult.NOT_VERY_EFFECTIVE;
    } else if (typeMultiplier > 1) {
      hitResult = HitResult.SUPER_EFFECTIVE;
    } else {
      hitResult = HitResult.EFFECTIVE;
    }

    return {
      cancelled: cancelled.value,
      result: hitResult,
      damage: damage.value,
    };
  }

  /**
   * Determine whether the given move will score a critical hit **against** this Pokemon.
   * @param source - The {@linkcode Pokemon} using the move
   * @param move - The {@linkcode Move} being used
   * @returns Whether the move will critically hit the defender.
   */
  getCriticalHitResult(source: Pokemon, move: Move): boolean {
    if (move.hasAttr("FixedDamageAttr")) {
      // fixed damage moves (Dragon Rage, etc.) will nevet crit
      return false;
    }

    const alwaysCrit = new BooleanHolder(false);
    applyMoveAttrs("CritOnlyAttr", source, this, move, alwaysCrit);
    applyAbAttrs("ConditionalCritAbAttr", source, null, false, alwaysCrit, this, move);
    const alwaysCritTag = !!source.getTag(BattlerTagType.ALWAYS_CRIT);
    const critChance = [24, 8, 2, 1][Phaser.Math.Clamp(this.getCritStage(source, move), 0, 3)];

    let isCritical = alwaysCrit.value || alwaysCritTag || critChance === 1;

    // If we aren't already guaranteed to crit, do a random roll & check overrides
    isCritical ||= Overrides.CRITICAL_HIT_OVERRIDE ?? globalScene.randBattleSeedInt(critChance) === 0;

    // apply crit block effects from lucky chant & co., overriding previous effects
    const blockCrit = new BooleanHolder(false);
    applyAbAttrs("BlockCritAbAttr", this, null, false, blockCrit);
    const blockCritTag = globalScene.arena.getTagOnSide(
      NoCritTag,
      this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY,
    );
    isCritical &&= !blockCritTag && !blockCrit.value; // need to roll a crit and not be blocked by either crit prevention effect

    return isCritical;
  }

  /**
   * Called by damageAndUpdate()
   * @param damage integer
   * @param ignoreSegments boolean, not currently used
   * @param preventEndure used to update damage if endure or sturdy
   * @param ignoreFaintPhas  flag on whether to add FaintPhase if pokemon after applying damage faints
   * @returns integer representing damage dealt
   */
  damage(damage: number, _ignoreSegments = false, preventEndure = false, ignoreFaintPhase = false): number {
    if (this.isFainted()) {
      return 0;
    }
    const surviveDamage = new BooleanHolder(false);

    // check for endure and other abilities that would prevent us from death
    if (!preventEndure && this.hp - damage <= 0) {
      if (this.hp >= 1 && this.getTag(BattlerTagType.ENDURING)) {
        surviveDamage.value = this.lapseTag(BattlerTagType.ENDURING);
      } else if (this.hp > 1 && this.getTag(BattlerTagType.STURDY)) {
        surviveDamage.value = this.lapseTag(BattlerTagType.STURDY);
      } else if (this.hp >= 1 && this.getTag(BattlerTagType.ENDURE_TOKEN)) {
        surviveDamage.value = this.lapseTag(BattlerTagType.ENDURE_TOKEN);
      }
      if (!surviveDamage.value) {
        globalScene.applyModifiers(SurviveDamageModifier, this.isPlayer(), this, surviveDamage);
      }
      if (surviveDamage.value) {
        damage = this.hp - 1;
      }
    }

    damage = Math.min(damage, this.hp);
    this.hp = this.hp - damage;
    if (this.isFainted() && !ignoreFaintPhase) {
      /**
       * When adding the FaintPhase, want to toggle future unshiftPhase() and queueMessage() calls
       * to appear before the FaintPhase (as FaintPhase will potentially end the encounter and add Phases such as
       * GameOverPhase, VictoryPhase, etc.. that will interfere with anything else that happens during this MoveEffectPhase)
       *
       * Once the MoveEffectPhase is over (and calls it's .end() function, shiftPhase() will reset the PhaseQueueSplice via clearPhaseQueueSplice() )
       */
      globalScene.phaseManager.setPhaseQueueSplice();
      globalScene.phaseManager.unshiftNew("FaintPhase", this.getBattlerIndex(), preventEndure);
      this.destroySubstitute();
      this.lapseTag(BattlerTagType.COMMANDED);
    }
    return damage;
  }

  /**
   * Given the damage, adds a new DamagePhase and update HP values, etc.
   *
   * Checks for 'Indirect' HitResults to account for Endure/Reviver Seed applying correctly
   * @param damage integer - passed to damage()
   * @param result an enum if it's super effective, not very, etc.
   * @param isCritical boolean if move is a critical hit
   * @param ignoreSegments boolean, passed to damage() and not used currently
   * @param preventEndure boolean, ignore endure properties of pokemon, passed to damage()
   * @param ignoreFaintPhase boolean to ignore adding a FaintPhase, passsed to damage()
   * @returns integer of damage done
   */
  damageAndUpdate(
    damage: number,
    {
      result = HitResult.EFFECTIVE,
      isCritical = false,
      ignoreSegments = false,
      ignoreFaintPhase = false,
      source = undefined,
    }: {
      result?: DamageResult;
      isCritical?: boolean;
      ignoreSegments?: boolean;
      ignoreFaintPhase?: boolean;
      source?: Pokemon;
    } = {},
  ): number {
    const isIndirectDamage = [HitResult.INDIRECT, HitResult.INDIRECT_KO].includes(result);
    const damagePhase = globalScene.phaseManager.create(
      "DamageAnimPhase",
      this.getBattlerIndex(),
      damage,
      result as DamageResult,
      isCritical,
    );
    globalScene.phaseManager.unshiftPhase(damagePhase);
    if (this.switchOutStatus && source) {
      damage = 0;
    }
    damage = this.damage(damage, ignoreSegments, isIndirectDamage, ignoreFaintPhase);
    // Ensure the battle-info bar's HP is updated, though only if the battle info is visible
    // TODO: When battle-info UI is refactored, make this only update the HP bar
    if (this.battleInfo.visible) {
      this.updateInfo();
    }
    // Damage amount may have changed, but needed to be queued before calling damage function
    damagePhase.updateAmount(damage);
    /**
     * Run PostDamageAbAttr from any source of damage that is not from a multi-hit
     * Multi-hits are handled in move-effect-phase.ts for PostDamageAbAttr
     */
    if (!source || source.turnData.hitCount <= 1) {
      applyPostDamageAbAttrs("PostDamageAbAttr", this, damage, this.hasPassive(), false, [], source);
    }
    return damage;
  }

  heal(amount: number): number {
    const healAmount = Math.min(amount, this.getMaxHp() - this.hp);
    this.hp += healAmount;
    return healAmount;
  }

  isBossImmune(): boolean {
    return this.isBoss();
  }

  isMax(): boolean {
    const maxForms = [
      SpeciesFormKey.GIGANTAMAX,
      SpeciesFormKey.GIGANTAMAX_RAPID,
      SpeciesFormKey.GIGANTAMAX_SINGLE,
      SpeciesFormKey.ETERNAMAX,
    ] as string[];
    return (
      maxForms.includes(this.getFormKey()) || (!!this.getFusionFormKey() && maxForms.includes(this.getFusionFormKey()!))
    );
  }

  isMega(): boolean {
    const megaForms = [
      SpeciesFormKey.MEGA,
      SpeciesFormKey.MEGA_X,
      SpeciesFormKey.MEGA_Y,
      SpeciesFormKey.PRIMAL,
    ] as string[];
    return (
      megaForms.includes(this.getFormKey()) ||
      (!!this.getFusionFormKey() && megaForms.includes(this.getFusionFormKey()!))
    );
  }

  canAddTag(tagType: BattlerTagType): boolean {
    if (this.getTag(tagType)) {
      return false;
    }

    const stubTag = new BattlerTag(tagType, 0, 0);

    const cancelled = new BooleanHolder(false);
    applyPreApplyBattlerTagAbAttrs("BattlerTagImmunityAbAttr", this, stubTag, cancelled, true);

    const userField = this.getAlliedField();
    userField.forEach(pokemon =>
      applyPreApplyBattlerTagAbAttrs("UserFieldBattlerTagImmunityAbAttr", pokemon, stubTag, cancelled, true, this),
    );

    return !cancelled.value;
  }

  addTag(tagType: BattlerTagType, turnCount = 0, sourceMove?: MoveId, sourceId?: number): boolean {
    const existingTag = this.getTag(tagType);
    if (existingTag) {
      existingTag.onOverlap(this);
      return false;
    }

    const newTag = getBattlerTag(tagType, turnCount, sourceMove!, sourceId!); // TODO: are the bangs correct?

    const cancelled = new BooleanHolder(false);
    applyPreApplyBattlerTagAbAttrs("BattlerTagImmunityAbAttr", this, newTag, cancelled);
    if (cancelled.value) {
      return false;
    }

    for (const pokemon of this.getAlliedField()) {
      applyPreApplyBattlerTagAbAttrs("UserFieldBattlerTagImmunityAbAttr", pokemon, newTag, cancelled, false, this);
      if (cancelled.value) {
        return false;
      }
    }

    if (newTag.canAdd(this)) {
      this.summonData.tags.push(newTag);
      newTag.onAdd(this);
      return true;
    }

    return false;
  }

  /**@overload */
  getTag(tagType: BattlerTagType.GRUDGE): GrudgeTag | undefined;

  /** @overload */
  getTag(tagType: BattlerTagType.SUBSTITUTE): SubstituteTag | undefined;

  /** @overload */
  getTag(tagType: BattlerTagType): BattlerTag | undefined;

  /** @overload */
  getTag<T extends BattlerTag>(tagType: Constructor<T>): T | undefined;

  getTag(tagType: BattlerTagType | Constructor<BattlerTag>): BattlerTag | undefined {
    return tagType instanceof Function
      ? this.summonData.tags.find(t => t instanceof tagType)
      : this.summonData.tags.find(t => t.tagType === tagType);
  }

  findTag(tagFilter: (tag: BattlerTag) => boolean) {
    return this.summonData.tags.find(t => tagFilter(t));
  }

  findTags(tagFilter: (tag: BattlerTag) => boolean): BattlerTag[] {
    return this.summonData.tags.filter(t => tagFilter(t));
  }

  /**
   * Tick down the first {@linkcode BattlerTag} found matching the given {@linkcode BattlerTagType},
   * removing it if its duration goes below 0.
   * @param tagType the {@linkcode BattlerTagType} to check against
   * @returns `true` if the tag was present
   */
  lapseTag(tagType: BattlerTagType): boolean {
    const tags = this.summonData.tags;
    const tag = tags.find(t => t.tagType === tagType);
    if (!tag) {
      return false;
    }

    if (!tag.lapse(this, BattlerTagLapseType.CUSTOM)) {
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
    return true;
  }

  /**
   * Tick down all {@linkcode BattlerTags} matching the given {@linkcode BattlerTagLapseType},
   * removing any whose durations fall below 0.
   * @param tagType the {@linkcode BattlerTagLapseType} to tick down
   */
  lapseTags(lapseType: BattlerTagLapseType): void {
    const tags = this.summonData.tags;
    tags
      .filter(
        t =>
          lapseType === BattlerTagLapseType.FAINT ||
          (t.lapseTypes.some(lType => lType === lapseType) && !t.lapse(this, lapseType)),
      )
      .forEach(t => {
        t.onRemove(this);
        tags.splice(tags.indexOf(t), 1);
      });
  }

  /**
   * Remove the first tag matching the given {@linkcode BattlerTagType}.
   * @param tagType the {@linkcode BattlerTagType} to search for and remove
   */
  removeTag(tagType: BattlerTagType): void {
    const tags = this.summonData.tags;
    const tag = tags.find(t => t.tagType === tagType);
    if (tag) {
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
  }

  /**
   * Find and remove all {@linkcode BattlerTag}s matching the given function.
   * @param tagFilter a function dictating which tags to remove
   */
  findAndRemoveTags(tagFilter: (tag: BattlerTag) => boolean): void {
    const tags = this.summonData.tags;
    const tagsToRemove = tags.filter(t => tagFilter(t));
    for (const tag of tagsToRemove) {
      tag.turnCount = 0;
      tag.onRemove(this);
      tags.splice(tags.indexOf(tag), 1);
    }
  }

  removeTagsBySourceId(sourceId: number): void {
    this.findAndRemoveTags(t => t.isSourceLinked() && t.sourceId === sourceId);
  }

  transferTagsBySourceId(sourceId: number, newSourceId: number): void {
    this.summonData.tags.forEach(t => {
      if (t.sourceId === sourceId) {
        t.sourceId = newSourceId;
      }
    });
  }

  /**
   * Transferring stat changes and Tags
   * @param source {@linkcode Pokemon} the pokemon whose stats/Tags are to be passed on from, ie: the Pokemon using Baton Pass
   */
  transferSummon(source: Pokemon): void {
    // Copy all stat stages
    for (const s of BATTLE_STATS) {
      const sourceStage = source.getStatStage(s);
      if (this.isPlayer() && sourceStage === 6) {
        globalScene.validateAchv(achvs.TRANSFER_MAX_STAT_STAGE);
      }
      this.setStatStage(s, sourceStage);
    }

    for (const tag of source.summonData.tags) {
      if (
        !tag.isBatonPassable ||
        (tag.tagType === BattlerTagType.TELEKINESIS &&
          this.species.speciesId === SpeciesId.GENGAR &&
          this.getFormKey() === "mega")
      ) {
        continue;
      }

      if (tag instanceof PowerTrickTag) {
        tag.swapStat(this);
      }

      this.summonData.tags.push(tag);
    }

    this.updateInfo();
  }

  /**
   * Gets whether the given move is currently disabled for this Pokemon.
   *
   * @param moveId - The {@linkcode MoveId} ID of the move to check
   * @returns `true` if the move is disabled for this Pokemon, otherwise `false`
   *
   * @see {@linkcode MoveRestrictionBattlerTag}
   */
  public isMoveRestricted(moveId: MoveId, pokemon?: Pokemon): boolean {
    return this.getRestrictingTag(moveId, pokemon) !== null;
  }

  /**
   * Gets whether the given move is currently disabled for the user based on the player's target selection
   *
   * @param moveId - The {@linkcode MoveId} ID of the move to check
   * @param user - The move user
   * @param target - The target of the move
   *
   * @returns {boolean} `true` if the move is disabled for this Pokemon due to the player's target selection
   *
   * @see {@linkcode MoveRestrictionBattlerTag}
   */
  isMoveTargetRestricted(moveId: MoveId, user: Pokemon, target: Pokemon): boolean {
    for (const tag of this.findTags(t => t instanceof MoveRestrictionBattlerTag)) {
      if ((tag as MoveRestrictionBattlerTag).isMoveTargetRestricted(moveId, user, target)) {
        return (tag as MoveRestrictionBattlerTag) !== null;
      }
    }
    return false;
  }

  /**
   * Gets the {@link MoveRestrictionBattlerTag} that is restricting a move, if it exists.
   *
   * @param moveId - {@linkcode MoveId} ID of the move to check
   * @param user - {@linkcode Pokemon} the move user, optional and used when the target is a factor in the move's restricted status
   * @param target - {@linkcode Pokemon} the target of the move, optional and used when the target is a factor in the move's restricted status
   * @returns The first tag on this Pokemon that restricts the move, or `null` if the move is not restricted.
   */
  getRestrictingTag(moveId: MoveId, user?: Pokemon, target?: Pokemon): MoveRestrictionBattlerTag | null {
    for (const tag of this.findTags(t => t instanceof MoveRestrictionBattlerTag)) {
      if ((tag as MoveRestrictionBattlerTag).isMoveRestricted(moveId, user)) {
        return tag as MoveRestrictionBattlerTag;
      }
      if (user && target && (tag as MoveRestrictionBattlerTag).isMoveTargetRestricted(moveId, user, target)) {
        return tag as MoveRestrictionBattlerTag;
      }
    }
    return null;
  }

  public getMoveHistory(): TurnMove[] {
    return this.summonData.moveHistory;
  }

  public pushMoveHistory(turnMove: TurnMove): void {
    if (!this.isOnField()) {
      return;
    }
    turnMove.turn = globalScene.currentBattle?.turn;
    this.getMoveHistory().push(turnMove);
  }

  /**
   * Returns a list of the most recent move entries in this Pokemon's move history.
   * The retrieved move entries are sorted in order from NEWEST to OLDEST.
   * @param moveCount The number of move entries to retrieve.
   *   If negative, retrieve the Pokemon's entire move history (equivalent to reversing the output of {@linkcode getMoveHistory()}).
   *   Default is `1`.
   * @returns A list of {@linkcode TurnMove}, as specified above.
   */
  getLastXMoves(moveCount = 1): TurnMove[] {
    const moveHistory = this.getMoveHistory();
    if (moveCount >= 0) {
      return moveHistory.slice(Math.max(moveHistory.length - moveCount, 0)).reverse();
    }
    return moveHistory.slice(0).reverse();
  }

  /**
   * Return the most recently executed {@linkcode TurnMove} this {@linkcode Pokemon} has used that is:
   * - Not {@linkcode MoveId.NONE}
   * - Non-virtual ({@linkcode MoveUseMode | useMode} < {@linkcode MoveUseMode.INDIRECT})
   * @param ignoreStruggle - Whether to additionally ignore {@linkcode Moves.STRUGGLE}; default `false`
   * @param ignoreFollowUp - Whether to ignore moves with a use type of {@linkcode MoveUseMode.FOLLOW_UP}
   * (e.g. ones called by Copycat/Mirror Move); default `true`.
   * @returns The last move this Pokemon has used satisfying the aforementioned conditions,
   * or `undefined` if no applicable moves have been used since switching in.
   */
  getLastNonVirtualMove(ignoreStruggle = false, ignoreFollowUp = true): TurnMove | undefined {
    return this.getLastXMoves(-1).find(
      m =>
        m.move !== MoveId.NONE &&
        (!ignoreStruggle || m.move !== MoveId.STRUGGLE) &&
        (!isVirtual(m.useMode) || (!ignoreFollowUp && m.useMode === MoveUseMode.FOLLOW_UP)),
    );
  }

  /**
   * Return this Pokemon's move queue, consisting of all the moves it is slated to perform.
   * @returns An array of {@linkcode TurnMove}, as described above
   */
  getMoveQueue(): TurnMove[] {
    return this.summonData.moveQueue;
  }

  /**
   * Add a new entry to the end of this Pokemon's move queue.
   * @param queuedMove - A {@linkcode TurnMove} to push to this Pokemon's queue.
   */
  pushMoveQueue(queuedMove: TurnMove): void {
    this.summonData.moveQueue.push(queuedMove);
  }

  changeForm(formChange: SpeciesFormChange): Promise<void> {
    return new Promise(resolve => {
      this.formIndex = Math.max(
        this.species.forms.findIndex(f => f.formKey === formChange.formKey),
        0,
      );
      this.generateName();
      const abilityCount = this.getSpeciesForm().getAbilityCount();
      if (this.abilityIndex >= abilityCount) {
        // Shouldn't happen
        this.abilityIndex = abilityCount - 1;
      }
      globalScene.gameData.setPokemonSeen(this, false);
      this.setScale(this.getSpriteScale());
      this.loadAssets().then(() => {
        this.calculateStats();
        globalScene.updateModifiers(this.isPlayer(), true);
        Promise.all([this.updateInfo(), globalScene.updateFieldScale()]).then(() => resolve());
      });
    });
  }

  cry(soundConfig?: Phaser.Types.Sound.SoundConfig, sceneOverride?: BattleScene): AnySound {
    const scene = sceneOverride ?? globalScene; // TODO: is `sceneOverride` needed?
    const cry = this.getSpeciesForm(undefined, true).cry(soundConfig);
    let duration = cry.totalDuration * 1000;
    if (this.fusionSpecies && this.getSpeciesForm(undefined, true) !== this.getFusionSpeciesForm(undefined, true)) {
      let fusionCry = this.getFusionSpeciesForm(undefined, true).cry(soundConfig, true);
      duration = Math.min(duration, fusionCry.totalDuration * 1000);
      fusionCry.destroy();
      scene.time.delayedCall(fixedInt(Math.ceil(duration * 0.4)), () => {
        try {
          SoundFade.fadeOut(scene, cry, fixedInt(Math.ceil(duration * 0.2)));
          fusionCry = this.getFusionSpeciesForm(undefined, true).cry({
            seek: Math.max(fusionCry.totalDuration * 0.4, 0),
            ...soundConfig,
          });
          SoundFade.fadeIn(
            scene,
            fusionCry,
            fixedInt(Math.ceil(duration * 0.2)),
            scene.masterVolume * scene.fieldVolume,
            0,
          );
        } catch (err) {
          console.error(err);
        }
      });
    }

    return cry;
  }

  // biome-ignore lint: there are a ton of issues..
  faintCry(callback: Function): void {
    if (this.fusionSpecies && this.getSpeciesForm() !== this.getFusionSpeciesForm()) {
      this.fusionFaintCry(callback);
      return;
    }

    const key = this.species.getCryKey(this.formIndex);
    let rate = 0.85;
    const cry = globalScene.playSound(key, { rate: rate }) as AnySound;
    if (!cry || globalScene.fieldVolume === 0) {
      callback();
      return;
    }
    const sprite = this.getSprite();
    const tintSprite = this.getTintSprite();
    const delay = Math.max(globalScene.sound.get(key).totalDuration * 50, 25);

    let frameProgress = 0;
    let frameThreshold: number;

    sprite.anims.pause();
    tintSprite?.anims.pause();

    let faintCryTimer: Phaser.Time.TimerEvent | null = globalScene.time.addEvent({
      delay: fixedInt(delay),
      repeat: -1,
      callback: () => {
        frameThreshold = sprite.anims.msPerFrame / rate;
        frameProgress += delay;
        while (frameProgress > frameThreshold) {
          if (sprite.anims.duration) {
            sprite.anims.nextFrame();
            tintSprite?.anims.nextFrame();
          }
          frameProgress -= frameThreshold;
        }
        if (cry && !cry.pendingRemove) {
          rate *= 0.99;
          cry.setRate(rate);
        } else {
          faintCryTimer?.destroy();
          faintCryTimer = null;
          if (callback) {
            callback();
          }
        }
      },
    });

    // Failsafe
    globalScene.time.delayedCall(fixedInt(3000), () => {
      if (!faintCryTimer || !globalScene) {
        return;
      }
      if (cry?.isPlaying) {
        cry.stop();
      }
      faintCryTimer.destroy();
      if (callback) {
        callback();
      }
    });
  }

  // biome-ignore lint/complexity/noBannedTypes: Consider refactoring to change type of Function
  private fusionFaintCry(callback: Function): void {
    const key = this.species.getCryKey(this.formIndex);
    let i = 0;
    let rate = 0.85;
    const cry = globalScene.playSound(key, { rate: rate }) as AnySound;
    const sprite = this.getSprite();
    const tintSprite = this.getTintSprite();
    let duration = cry.totalDuration * 1000;

    const fusionCryKey = this.fusionSpecies!.getCryKey(this.fusionFormIndex);
    let fusionCry = globalScene.playSound(fusionCryKey, {
      rate: rate,
    }) as AnySound;
    if (!cry || !fusionCry || globalScene.fieldVolume === 0) {
      callback();
      return;
    }
    fusionCry.stop();
    duration = Math.min(duration, fusionCry.totalDuration * 1000);
    fusionCry.destroy();
    const delay = Math.max(duration * 0.05, 25);

    let transitionIndex = 0;
    let durationProgress = 0;

    const transitionThreshold = Math.ceil(duration * 0.4);
    while (durationProgress < transitionThreshold) {
      ++i;
      durationProgress += delay * rate;
      rate *= 0.99;
    }

    transitionIndex = i;

    i = 0;
    rate = 0.85;

    let frameProgress = 0;
    let frameThreshold: number;

    sprite.anims.pause();
    tintSprite?.anims.pause();

    let faintCryTimer: Phaser.Time.TimerEvent | null = globalScene.time.addEvent({
      delay: fixedInt(delay),
      repeat: -1,
      callback: () => {
        ++i;
        frameThreshold = sprite.anims.msPerFrame / rate;
        frameProgress += delay;
        while (frameProgress > frameThreshold) {
          if (sprite.anims.duration) {
            sprite.anims.nextFrame();
            tintSprite?.anims.nextFrame();
          }
          frameProgress -= frameThreshold;
        }
        if (i === transitionIndex && fusionCryKey) {
          SoundFade.fadeOut(globalScene, cry, fixedInt(Math.ceil((duration / rate) * 0.2)));
          fusionCry = globalScene.playSound(fusionCryKey, {
            seek: Math.max(fusionCry.totalDuration * 0.4, 0),
            rate: rate,
          });
          SoundFade.fadeIn(
            globalScene,
            fusionCry,
            fixedInt(Math.ceil((duration / rate) * 0.2)),
            globalScene.masterVolume * globalScene.fieldVolume,
            0,
          );
        }
        rate *= 0.99;
        if (cry && !cry.pendingRemove) {
          cry.setRate(rate);
        }
        if (fusionCry && !fusionCry.pendingRemove) {
          fusionCry.setRate(rate);
        }
        if ((!cry || cry.pendingRemove) && (!fusionCry || fusionCry.pendingRemove)) {
          faintCryTimer?.destroy();
          faintCryTimer = null;
          if (callback) {
            callback();
          }
        }
      },
    });

    // Failsafe
    globalScene.time.delayedCall(fixedInt(3000), () => {
      if (!faintCryTimer || !globalScene) {
        return;
      }
      if (cry?.isPlaying) {
        cry.stop();
      }
      if (fusionCry?.isPlaying) {
        fusionCry.stop();
      }
      faintCryTimer.destroy();
      if (callback) {
        callback();
      }
    });
  }

  isOppositeGender(pokemon: Pokemon): boolean {
    return (
      this.gender !== Gender.GENDERLESS &&
      pokemon.gender === (this.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE)
    );
  }

  queueImmuneMessage(quiet: boolean, effect?: StatusEffect): void {
    if (!effect || quiet) {
      return;
    }
    const message =
      effect && this.status?.effect === effect
        ? getStatusEffectOverlapText(effect ?? StatusEffect.NONE, getPokemonNameWithAffix(this))
        : i18next.t("abilityTriggers:moveImmunity", {
            pokemonNameWithAffix: getPokemonNameWithAffix(this),
          });
    globalScene.phaseManager.queueMessage(message);
  }

  /**
   * Checks if a status effect can be applied to the Pokemon.
   *
   * @param effect The {@linkcode StatusEffect} whose applicability is being checked
   * @param quiet Whether in-battle messages should trigger or not
   * @param overrideStatus Whether the Pokemon's current status can be overriden
   * @param sourcePokemon The Pokemon that is setting the status effect
   * @param ignoreField Whether any field effects (weather, terrain, etc.) should be considered
   */
  canSetStatus(
    effect: StatusEffect | undefined,
    quiet = false,
    overrideStatus = false,
    sourcePokemon: Pokemon | null = null,
    ignoreField = false,
  ): boolean {
    if (effect !== StatusEffect.FAINT) {
      if (overrideStatus ? this.status?.effect === effect : this.status) {
        this.queueImmuneMessage(quiet, effect);
        return false;
      }
      if (this.isGrounded() && !ignoreField && globalScene.arena.terrain?.terrainType === TerrainType.MISTY) {
        this.queueImmuneMessage(quiet, effect);
        return false;
      }
    }

    const types = this.getTypes(true, true);

    switch (effect) {
      case StatusEffect.POISON:
      case StatusEffect.TOXIC: {
        // Check if the Pokemon is immune to Poison/Toxic or if the source pokemon is canceling the immunity
        const poisonImmunity = types.map(defType => {
          // Check if the Pokemon is not immune to Poison/Toxic
          if (defType !== PokemonType.POISON && defType !== PokemonType.STEEL) {
            return false;
          }

          // Check if the source Pokemon has an ability that cancels the Poison/Toxic immunity
          const cancelImmunity = new BooleanHolder(false);
          if (sourcePokemon) {
            applyAbAttrs("IgnoreTypeStatusEffectImmunityAbAttr", sourcePokemon, cancelImmunity, false, effect, defType);
            if (cancelImmunity.value) {
              return false;
            }
          }

          return true;
        });

        if (this.isOfType(PokemonType.POISON) || this.isOfType(PokemonType.STEEL)) {
          if (poisonImmunity.includes(true)) {
            this.queueImmuneMessage(quiet, effect);
            return false;
          }
        }
        break;
      }
      case StatusEffect.PARALYSIS:
        if (this.isOfType(PokemonType.ELECTRIC)) {
          this.queueImmuneMessage(quiet, effect);
          return false;
        }
        break;
      case StatusEffect.SLEEP:
        if (this.isGrounded() && globalScene.arena.terrain?.terrainType === TerrainType.ELECTRIC) {
          this.queueImmuneMessage(quiet, effect);
          return false;
        }
        break;
      case StatusEffect.FREEZE:
        if (
          this.isOfType(PokemonType.ICE) ||
          (!ignoreField &&
            globalScene?.arena?.weather?.weatherType &&
            [WeatherType.SUNNY, WeatherType.HARSH_SUN].includes(globalScene.arena.weather.weatherType))
        ) {
          this.queueImmuneMessage(quiet, effect);
          return false;
        }
        break;
      case StatusEffect.BURN:
        if (this.isOfType(PokemonType.FIRE)) {
          this.queueImmuneMessage(quiet, effect);
          return false;
        }
        break;
    }

    const cancelled = new BooleanHolder(false);
    applyPreSetStatusAbAttrs("StatusEffectImmunityAbAttr", this, effect, cancelled, quiet);
    if (cancelled.value) {
      return false;
    }

    for (const pokemon of this.getAlliedField()) {
      applyPreSetStatusAbAttrs(
        "UserFieldStatusEffectImmunityAbAttr",
        pokemon,
        effect,
        cancelled,
        quiet,
        this,
        sourcePokemon,
      );
      if (cancelled.value) {
        break;
      }
    }

    if (cancelled.value) {
      return false;
    }

    if (sourcePokemon && sourcePokemon !== this && this.isSafeguarded(sourcePokemon)) {
      if (!quiet) {
        globalScene.phaseManager.queueMessage(
          i18next.t("moveTriggers:safeguard", { targetName: getPokemonNameWithAffix(this) }),
        );
      }
      return false;
    }

    return true;
  }

  trySetStatus(
    effect?: StatusEffect,
    asPhase = false,
    sourcePokemon: Pokemon | null = null,
    turnsRemaining = 0,
    sourceText: string | null = null,
    overrideStatus?: boolean,
    quiet = true,
  ): boolean {
    if (!this.canSetStatus(effect, quiet, overrideStatus, sourcePokemon)) {
      return false;
    }
    if (this.isFainted() && effect !== StatusEffect.FAINT) {
      return false;
    }

    /**
     * If this Pokemon falls asleep or freezes in the middle of a multi-hit attack,
     * cancel the attack's subsequent hits.
     */
    if (effect === StatusEffect.SLEEP || effect === StatusEffect.FREEZE) {
      const currentPhase = globalScene.phaseManager.getCurrentPhase();
      if (currentPhase?.is("MoveEffectPhase") && currentPhase.getUserPokemon() === this) {
        this.turnData.hitCount = 1;
        this.turnData.hitsLeft = 1;
      }
    }

    if (asPhase) {
      if (overrideStatus) {
        this.resetStatus(false);
      }
      globalScene.phaseManager.unshiftNew(
        "ObtainStatusEffectPhase",
        this.getBattlerIndex(),
        effect,
        turnsRemaining,
        sourceText,
        sourcePokemon,
      );
      return true;
    }

    let sleepTurnsRemaining: NumberHolder;

    if (effect === StatusEffect.SLEEP) {
      sleepTurnsRemaining = new NumberHolder(this.randBattleSeedIntRange(2, 4));

      this.setFrameRate(4);

      // If the user is invulnerable, lets remove their invulnerability when they fall asleep
      const invulnerableTags = [
        BattlerTagType.UNDERGROUND,
        BattlerTagType.UNDERWATER,
        BattlerTagType.HIDDEN,
        BattlerTagType.FLYING,
      ];

      const tag = invulnerableTags.find(t => this.getTag(t));

      if (tag) {
        this.removeTag(tag);
        this.getMoveQueue().pop();
      }
    }

    sleepTurnsRemaining = sleepTurnsRemaining!; // tell TS compiler it's defined
    effect = effect!; // If `effect` is undefined then `trySetStatus()` will have already returned early via the `canSetStatus()` call
    this.status = new Status(effect, 0, sleepTurnsRemaining?.value);

    return true;
  }

  /**
   * Resets the status of a pokemon.
   * @param revive Whether revive should be cured; defaults to true.
   * @param confusion Whether resetStatus should include confusion or not; defaults to false.
   * @param reloadAssets Whether to reload the assets or not; defaults to false.
   * @param asPhase Whether to reset the status in a phase or immediately
   */
  resetStatus(revive = true, confusion = false, reloadAssets = false, asPhase = true): void {
    const lastStatus = this.status?.effect;
    if (!revive && lastStatus === StatusEffect.FAINT) {
      return;
    }

    if (asPhase) {
      globalScene.phaseManager.unshiftNew("ResetStatusPhase", this, confusion, reloadAssets);
    } else {
      this.clearStatus(confusion, reloadAssets);
    }
  }

  /**
   * Performs the action of clearing a Pokemon's status
   *
   * This is a helper to {@linkcode resetStatus}, which should be called directly instead of this method
   */
  public clearStatus(confusion: boolean, reloadAssets: boolean) {
    const lastStatus = this.status?.effect;
    this.status = null;
    if (lastStatus === StatusEffect.SLEEP) {
      this.setFrameRate(10);
      if (this.getTag(BattlerTagType.NIGHTMARE)) {
        this.lapseTag(BattlerTagType.NIGHTMARE);
      }
    }
    if (confusion) {
      if (this.getTag(BattlerTagType.CONFUSED)) {
        this.lapseTag(BattlerTagType.CONFUSED);
      }
    }
    if (reloadAssets) {
      this.loadAssets(false).then(() => this.playAnim());
    }
    this.updateInfo(true);
  }

  /**
   * Checks if this Pokemon is protected by Safeguard
   * @param attacker the {@linkcode Pokemon} inflicting status on this Pokemon
   * @returns `true` if this Pokemon is protected by Safeguard; `false` otherwise.
   */
  isSafeguarded(attacker: Pokemon): boolean {
    const defendingSide = this.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    if (globalScene.arena.getTagOnSide(ArenaTagType.SAFEGUARD, defendingSide)) {
      const bypassed = new BooleanHolder(false);
      if (attacker) {
        applyAbAttrs("InfiltratorAbAttr", attacker, null, false, bypassed);
      }
      return !bypassed.value;
    }
    return false;
  }

  /**
   * Performs miscellaneous setup for when the Pokemon is summoned, like generating the substitute sprite
   * @param resetSummonData - Whether to additionally reset the Pokemon's summon data (default: `false`)
   */
  public fieldSetup(resetSummonData?: boolean): void {
    this.setSwitchOutStatus(false);
    if (globalScene) {
      globalScene.triggerPokemonFormChange(this, SpeciesFormChangePostMoveTrigger, true);
    }
    // If this Pokemon has a Substitute when loading in, play an animation to add its sprite
    if (this.getTag(SubstituteTag)) {
      globalScene.triggerPokemonBattleAnim(this, PokemonAnimType.SUBSTITUTE_ADD);
      this.getTag(SubstituteTag)!.sourceInFocus = false;
    }

    // If this Pokemon has Commander and Dondozo as an active ally, hide this Pokemon's sprite.
    if (
      this.hasAbilityWithAttr("CommanderAbAttr") &&
      globalScene.currentBattle.double &&
      this.getAlly()?.species.speciesId === SpeciesId.DONDOZO
    ) {
      this.setVisible(false);
    }

    if (resetSummonData) {
      this.resetSummonData();
    }
  }

  /**
   * Reset this Pokemon's {@linkcode PokemonSummonData | SummonData} and {@linkcode PokemonTempSummonData | TempSummonData}
   * in preparation for switching pokemon, as well as removing any relevant on-switch tags.
   */
  resetSummonData(): void {
    const illusion: IllusionData | null = this.summonData.illusion;
    if (this.summonData.speciesForm) {
      this.summonData.speciesForm = null;
      this.updateFusionPalette();
    }
    this.summonData = new PokemonSummonData();
    this.tempSummonData = new PokemonTempSummonData();
    this.summonData.illusion = illusion;
    this.updateInfo();
  }

  /**
   * Reset a {@linkcode Pokemon}'s per-battle {@linkcode PokemonBattleData | battleData},
   * as well as any transient {@linkcode PokemonWaveData | waveData} for the current wave.
   * Should be called once per arena transition (new biome/trainer battle/Mystery Encounter).
   */
  resetBattleAndWaveData(): void {
    this.battleData = new PokemonBattleData();
    this.resetWaveData();
  }

  /**
   * Reset a {@linkcode Pokemon}'s {@linkcode PokemonWaveData | waveData}.
   * Should be called upon starting a new wave in addition to whenever an arena transition occurs.
   * @see {@linkcode resetBattleAndWaveData()}
   */
  resetWaveData(): void {
    this.waveData = new PokemonWaveData();
  }

  resetTera(): void {
    const wasTerastallized = this.isTerastallized;
    this.isTerastallized = false;
    this.stellarTypesBoosted = [];
    if (wasTerastallized) {
      this.updateSpritePipelineData();
      globalScene.triggerPokemonFormChange(this, SpeciesFormChangeLapseTeraTrigger);
    }
  }

  resetTurnData(): void {
    this.turnData = new PokemonTurnData();
  }

  getExpValue(): number {
    // Logic to factor in victor level has been removed for balancing purposes, so the player doesn't have to focus on EXP maxxing
    return (this.getSpeciesForm().getBaseExp() * this.level) / 5 + 1;
  }

  setFrameRate(frameRate: number) {
    globalScene.anims.get(this.getBattleSpriteKey()).frameRate = frameRate;
    try {
      this.getSprite().play(this.getBattleSpriteKey());
    } catch (err: unknown) {
      console.error(`Failed to play animation for ${this.getBattleSpriteKey()}`, err);
    }
    try {
      this.getTintSprite()?.play(this.getBattleSpriteKey());
    } catch (err: unknown) {
      console.error(`Failed to play animation for ${this.getBattleSpriteKey()}`, err);
    }
  }

  tint(color: number, alpha?: number, duration?: number, ease?: string) {
    const tintSprite = this.getTintSprite();
    tintSprite?.setTintFill(color);
    tintSprite?.setVisible(true);

    if (duration) {
      tintSprite?.setAlpha(0);

      globalScene.tweens.add({
        targets: tintSprite,
        alpha: alpha || 1,
        duration: duration,
        ease: ease || "Linear",
      });
    } else {
      tintSprite?.setAlpha(alpha);
    }
  }

  untint(duration: number, ease?: string) {
    const tintSprite = this.getTintSprite();

    if (duration) {
      globalScene.tweens.add({
        targets: tintSprite,
        alpha: 0,
        duration: duration,
        ease: ease || "Linear",
        onComplete: () => {
          tintSprite?.setVisible(false);
          tintSprite?.setAlpha(1);
        },
      });
    } else {
      tintSprite?.setVisible(false);
      tintSprite?.setAlpha(1);
    }
  }

  enableMask() {
    if (!this.maskEnabled) {
      this.maskSprite = this.getTintSprite();
      this.maskSprite?.setVisible(true);
      this.maskSprite?.setPosition(
        this.x * this.parentContainer.scale + this.parentContainer.x,
        this.y * this.parentContainer.scale + this.parentContainer.y,
      );
      this.maskSprite?.setScale(this.getSpriteScale() * this.parentContainer.scale);
      this.maskEnabled = true;
    }
  }

  disableMask() {
    if (this.maskEnabled) {
      this.maskSprite?.setVisible(false);
      this.maskSprite?.setPosition(0, 0);
      this.maskSprite?.setScale(this.getSpriteScale());
      this.maskSprite = null;
      this.maskEnabled = false;
    }
  }

  sparkle(): void {
    if (this.shinySparkle) {
      doShinySparkleAnim(this.shinySparkle, this.variant);
    }
  }

  updateFusionPalette(ignoreOveride?: boolean): void {
    if (!this.getFusionSpeciesForm(ignoreOveride)) {
      [this.getSprite(), this.getTintSprite()]
        .filter(s => !!s)
        .map(s => {
          s.pipelineData[`spriteColors${ignoreOveride && this.summonData.speciesForm ? "Base" : ""}`] = [];
          s.pipelineData[`fusionSpriteColors${ignoreOveride && this.summonData.speciesForm ? "Base" : ""}`] = [];
        });
      return;
    }

    const speciesForm = this.getSpeciesForm(ignoreOveride);
    const fusionSpeciesForm = this.getFusionSpeciesForm(ignoreOveride);

    const spriteKey = speciesForm.getSpriteKey(
      this.getGender(ignoreOveride) === Gender.FEMALE,
      speciesForm.formIndex,
      this.shiny,
      this.variant,
    );
    const backSpriteKey = speciesForm
      .getSpriteKey(this.getGender(ignoreOveride) === Gender.FEMALE, speciesForm.formIndex, this.shiny, this.variant)
      .replace("pkmn__", "pkmn__back__");
    const fusionSpriteKey = fusionSpeciesForm.getSpriteKey(
      this.getFusionGender(ignoreOveride) === Gender.FEMALE,
      fusionSpeciesForm.formIndex,
      this.fusionShiny,
      this.fusionVariant,
    );
    const fusionBackSpriteKey = fusionSpeciesForm
      .getSpriteKey(
        this.getFusionGender(ignoreOveride) === Gender.FEMALE,
        fusionSpeciesForm.formIndex,
        this.fusionShiny,
        this.fusionVariant,
      )
      .replace("pkmn__", "pkmn__back__");

    const sourceTexture = globalScene.textures.get(spriteKey);
    const sourceBackTexture = globalScene.textures.get(backSpriteKey);
    const fusionTexture = globalScene.textures.get(fusionSpriteKey);
    const fusionBackTexture = globalScene.textures.get(fusionBackSpriteKey);

    const [sourceFrame, sourceBackFrame, fusionFrame, fusionBackFrame] = [
      sourceTexture,
      sourceBackTexture,
      fusionTexture,
      fusionBackTexture,
    ].map(texture => texture.frames[texture.firstFrame]);
    const [sourceImage, sourceBackImage, fusionImage, fusionBackImage] = [
      sourceTexture,
      sourceBackTexture,
      fusionTexture,
      fusionBackTexture,
    ].map(i => i.getSourceImage() as HTMLImageElement);

    const canvas = document.createElement("canvas");
    const backCanvas = document.createElement("canvas");
    const fusionCanvas = document.createElement("canvas");
    const fusionBackCanvas = document.createElement("canvas");

    const spriteColors: number[][] = [];
    const pixelData: Uint8ClampedArray[] = [];

    [canvas, backCanvas, fusionCanvas, fusionBackCanvas].forEach((canv: HTMLCanvasElement, c: number) => {
      const context = canv.getContext("2d");
      const frame = [sourceFrame, sourceBackFrame, fusionFrame, fusionBackFrame][c];
      canv.width = frame.width;
      canv.height = frame.height;

      if (context) {
        context.drawImage(
          [sourceImage, sourceBackImage, fusionImage, fusionBackImage][c],
          frame.cutX,
          frame.cutY,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height,
        );
        const imageData = context.getImageData(frame.cutX, frame.cutY, frame.width, frame.height);
        pixelData.push(imageData.data);
      }
    });

    for (let f = 0; f < 2; f++) {
      const variantColors = variantColorCache[!f ? spriteKey : backSpriteKey];
      const variantColorSet = new Map<number, number[]>();
      if (this.shiny && variantColors && variantColors[this.variant]) {
        Object.keys(variantColors[this.variant]).forEach(k => {
          variantColorSet.set(
            rgbaToInt(Array.from(Object.values(rgbHexToRgba(k)))),
            Array.from(Object.values(rgbHexToRgba(variantColors[this.variant][k]))),
          );
        });
      }

      for (let i = 0; i < pixelData[f].length; i += 4) {
        if (pixelData[f][i + 3]) {
          const pixel = pixelData[f].slice(i, i + 4);
          let [r, g, b, a] = pixel;
          if (variantColors) {
            const color = rgbaToInt([r, g, b, a]);
            if (variantColorSet.has(color)) {
              const mappedPixel = variantColorSet.get(color);
              if (mappedPixel) {
                [r, g, b, a] = mappedPixel;
              }
            }
          }
          if (!spriteColors.find(c => c[0] === r && c[1] === g && c[2] === b)) {
            spriteColors.push([r, g, b, a]);
          }
        }
      }
    }

    const fusionSpriteColors = JSON.parse(JSON.stringify(spriteColors));

    const pixelColors: number[] = [];
    for (let f = 0; f < 2; f++) {
      for (let i = 0; i < pixelData[f].length; i += 4) {
        const total = pixelData[f].slice(i, i + 3).reduce((total: number, value: number) => total + value, 0);
        if (!total) {
          continue;
        }
        pixelColors.push(
          argbFromRgba({
            r: pixelData[f][i],
            g: pixelData[f][i + 1],
            b: pixelData[f][i + 2],
            a: pixelData[f][i + 3],
          }),
        );
      }
    }

    const fusionPixelColors: number[] = [];
    for (let f = 0; f < 2; f++) {
      const variantColors = variantColorCache[!f ? fusionSpriteKey : fusionBackSpriteKey];
      const variantColorSet = new Map<number, number[]>();
      if (this.fusionShiny && variantColors && variantColors[this.fusionVariant]) {
        for (const k of Object.keys(variantColors[this.fusionVariant])) {
          variantColorSet.set(
            rgbaToInt(Array.from(Object.values(rgbHexToRgba(k)))),
            Array.from(Object.values(rgbHexToRgba(variantColors[this.fusionVariant][k]))),
          );
        }
      }
      for (let i = 0; i < pixelData[2 + f].length; i += 4) {
        const total = pixelData[2 + f].slice(i, i + 3).reduce((total: number, value: number) => total + value, 0);
        if (!total) {
          continue;
        }
        let [r, g, b, a] = [
          pixelData[2 + f][i],
          pixelData[2 + f][i + 1],
          pixelData[2 + f][i + 2],
          pixelData[2 + f][i + 3],
        ];
        if (variantColors) {
          const color = rgbaToInt([r, g, b, a]);
          if (variantColorSet.has(color)) {
            const mappedPixel = variantColorSet.get(color);
            if (mappedPixel) {
              [r, g, b, a] = mappedPixel;
            }
          }
        }
        fusionPixelColors.push(argbFromRgba({ r, g, b, a }));
      }
    }

    if (fusionPixelColors.length === 0) {
      // ERROR HANDLING IS NOT OPTIONAL BUDDY
      console.log("Failed to create fusion palette");
      return;
    }

    let paletteColors: Map<number, number>;
    let fusionPaletteColors: Map<number, number>;

    const originalRandom = Math.random;
    Math.random = () => randSeedFloat();

    globalScene.executeWithSeedOffset(
      () => {
        paletteColors = QuantizerCelebi.quantize(pixelColors, 4);
        fusionPaletteColors = QuantizerCelebi.quantize(fusionPixelColors, 4);
      },
      0,
      "This result should not vary",
    );

    Math.random = originalRandom;

    paletteColors = paletteColors!; // erroneously tell TS compiler that paletteColors is defined!
    fusionPaletteColors = fusionPaletteColors!; // mischievously misinform TS compiler that fusionPaletteColors is defined!
    const [palette, fusionPalette] = [paletteColors, fusionPaletteColors].map(paletteColors => {
      let keys = Array.from(paletteColors.keys()).sort((a: number, b: number) =>
        paletteColors.get(a)! < paletteColors.get(b)! ? 1 : -1,
      );
      let rgbaColors: Map<number, number[]>;
      let hsvColors: Map<number, number[]>;

      const mappedColors = new Map<number, number[]>();

      do {
        mappedColors.clear();

        rgbaColors = keys.reduce((map: Map<number, number[]>, k: number) => {
          map.set(k, Object.values(rgbaFromArgb(k)));
          return map;
        }, new Map<number, number[]>());
        hsvColors = Array.from(rgbaColors.keys()).reduce((map: Map<number, number[]>, k: number) => {
          const rgb = rgbaColors.get(k)!.slice(0, 3);
          map.set(k, rgbToHsv(rgb[0], rgb[1], rgb[2]));
          return map;
        }, new Map<number, number[]>());

        for (let c = keys.length - 1; c >= 0; c--) {
          const hsv = hsvColors.get(keys[c])!;
          for (let c2 = 0; c2 < c; c2++) {
            const hsv2 = hsvColors.get(keys[c2])!;
            const diff = Math.abs(hsv[0] - hsv2[0]);
            if (diff < 30 || diff >= 330) {
              if (mappedColors.has(keys[c])) {
                mappedColors.get(keys[c])!.push(keys[c2]);
              } else {
                mappedColors.set(keys[c], [keys[c2]]);
              }
              break;
            }
          }
        }

        mappedColors.forEach((values: number[], key: number) => {
          const keyColor = rgbaColors.get(key)!;
          const valueColors = values.map(v => rgbaColors.get(v)!);
          const color = keyColor.slice(0);
          let count = paletteColors.get(key)!;
          for (const value of values) {
            const valueCount = paletteColors.get(value);
            if (!valueCount) {
              continue;
            }
            count += valueCount;
          }

          for (let c = 0; c < 3; c++) {
            color[c] *= paletteColors.get(key)! / count;
            values.forEach((value: number, i: number) => {
              if (paletteColors.has(value)) {
                const valueCount = paletteColors.get(value)!;
                color[c] += valueColors[i][c] * (valueCount / count);
              }
            });
            color[c] = Math.round(color[c]);
          }

          paletteColors.delete(key);
          for (const value of values) {
            paletteColors.delete(value);
            if (mappedColors.has(value)) {
              mappedColors.delete(value);
            }
          }

          paletteColors.set(
            argbFromRgba({
              r: color[0],
              g: color[1],
              b: color[2],
              a: color[3],
            }),
            count,
          );
        });

        keys = Array.from(paletteColors.keys()).sort((a: number, b: number) =>
          paletteColors.get(a)! < paletteColors.get(b)! ? 1 : -1,
        );
      } while (mappedColors.size);

      return keys.map(c => Object.values(rgbaFromArgb(c)));
    });

    const paletteDeltas: number[][] = [];

    spriteColors.forEach((sc: number[], i: number) => {
      paletteDeltas.push([]);
      for (let p = 0; p < palette.length; p++) {
        paletteDeltas[i].push(deltaRgb(sc, palette[p]));
      }
    });

    const easeFunc = Phaser.Tweens.Builders.GetEaseFunction("Cubic.easeIn");

    for (let sc = 0; sc < spriteColors.length; sc++) {
      const delta = Math.min(...paletteDeltas[sc]);
      const paletteIndex = Math.min(paletteDeltas[sc].indexOf(delta), fusionPalette.length - 1);
      if (delta < 255) {
        const ratio = easeFunc(delta / 255);
        const color = [0, 0, 0, fusionSpriteColors[sc][3]];
        for (let c = 0; c < 3; c++) {
          color[c] = Math.round(fusionSpriteColors[sc][c] * ratio + fusionPalette[paletteIndex][c] * (1 - ratio));
        }
        fusionSpriteColors[sc] = color;
      }
    }

    [this.getSprite(), this.getTintSprite()]
      .filter(s => !!s)
      .map(s => {
        s.pipelineData[`spriteColors${ignoreOveride && this.summonData.speciesForm ? "Base" : ""}`] = spriteColors;
        s.pipelineData[`fusionSpriteColors${ignoreOveride && this.summonData.speciesForm ? "Base" : ""}`] =
          fusionSpriteColors;
      });

    canvas.remove();
    fusionCanvas.remove();
  }

  /**
   * Generates a random number using the current battle's seed, or the global seed if `globalScene.currentBattle` is falsy
   * <!-- @import "../battle".Battle -->
   * This calls either {@linkcode BattleScene.randBattleSeedInt}({@linkcode range}, {@linkcode min}) in `src/battle-scene.ts`
   * which calls {@linkcode Battle.randSeedInt}({@linkcode range}, {@linkcode min}) in `src/battle.ts`
   * which calls {@linkcode randSeedInt randSeedInt}({@linkcode range}, {@linkcode min}) in `src/utils.ts`,
   * or it directly calls {@linkcode randSeedInt randSeedInt}({@linkcode range}, {@linkcode min}) in `src/utils.ts` if there is no current battle
   *
   * @param range How large of a range of random numbers to choose from. If {@linkcode range} <= 1, returns {@linkcode min}
   * @param min The minimum integer to pick, default `0`
   * @returns A random integer between {@linkcode min} and ({@linkcode min} + {@linkcode range} - 1)
   */
  randBattleSeedInt(range: number, min = 0): number {
    return globalScene.currentBattle ? globalScene.randBattleSeedInt(range, min) : randSeedInt(range, min);
  }

  /**
   * Generates a random number using the current battle's seed, or the global seed if `globalScene.currentBattle` is falsy
   * @param min The minimum integer to generate
   * @param max The maximum integer to generate
   * @returns a random integer between {@linkcode min} and {@linkcode max} inclusive
   */
  randBattleSeedIntRange(min: number, max: number): number {
    return globalScene.currentBattle ? globalScene.randBattleSeedInt(max - min + 1, min) : randSeedIntRange(min, max);
  }

  /**
   * Causes a Pokemon to leave the field (such as in preparation for a switch out/escape).
   * @param clearEffects Indicates if effects should be cleared (true) or passed
   * to the next pokemon, such as during a baton pass (false)
   * @param hideInfo Indicates if this should also play the animation to hide the Pokemon's
   * info container.
   */
  leaveField(clearEffects = true, hideInfo = true, destroy = false) {
    this.resetSprite();
    this.resetTurnData();
    globalScene
      .getField(true)
      .filter(p => p !== this)
      .forEach(p => p.removeTagsBySourceId(this.id));

    if (clearEffects) {
      this.destroySubstitute();
      this.resetSummonData();
    }
    if (hideInfo) {
      this.hideInfo();
    }
    // Trigger abilities that activate upon leaving the field
    applyPreLeaveFieldAbAttrs("PreLeaveFieldAbAttr", this);
    this.setSwitchOutStatus(true);
    globalScene.triggerPokemonFormChange(this, SpeciesFormChangeActiveTrigger, true);
    globalScene.field.remove(this, destroy);
  }

  destroy(): void {
    this.battleInfo?.destroy();
    this.destroySubstitute();
    super.destroy();
  }

  getBattleInfo(): BattleInfo {
    return this.battleInfo;
  }

  /**
   * Checks whether or not the Pokemon's root form has the same ability
   * @param abilityIndex the given ability index we are checking
   * @returns true if the abilities are the same
   */
  hasSameAbilityInRootForm(abilityIndex: number): boolean {
    const currentAbilityIndex = this.abilityIndex;
    const rootForm = getPokemonSpecies(this.species.getRootSpeciesId());
    return rootForm.getAbility(abilityIndex) === rootForm.getAbility(currentAbilityIndex);
  }

  /**
   * Helper function to check if the player already owns the starter data of the Pokemon's
   * current ability
   * @param ownedAbilityAttrs the owned abilityAttr of this Pokemon's root form
   * @returns true if the player already has it, false otherwise
   */
  checkIfPlayerHasAbilityOfStarter(ownedAbilityAttrs: number): boolean {
    if ((ownedAbilityAttrs & 1) > 0 && this.hasSameAbilityInRootForm(0)) {
      return true;
    }
    if ((ownedAbilityAttrs & 2) > 0 && this.hasSameAbilityInRootForm(1)) {
      return true;
    }
    return (ownedAbilityAttrs & 4) > 0 && this.hasSameAbilityInRootForm(2);
  }

  /**
   * Reduces one of this Pokemon's held item stacks by 1, and removes the item if applicable.
   * Does nothing if this Pokemon is somehow not the owner of the held item.
   * @param heldItem The item stack to be reduced by 1.
   * @param forBattle If `false`, do not trigger in-battle effects (such as Unburden) from losing the item. For example, set this to `false` if the Pokemon is giving away the held item for a Mystery Encounter. Default is `true`.
   * @returns `true` if the item was removed successfully, `false` otherwise.
   */
  public loseHeldItem(heldItem: PokemonHeldItemModifier, forBattle = true): boolean {
    if (heldItem.pokemonId !== -1 && heldItem.pokemonId !== this.id) {
      return false;
    }

    heldItem.stackCount--;
    if (heldItem.stackCount <= 0) {
      globalScene.removeModifier(heldItem, this.isEnemy());
    }
    if (forBattle) {
      applyPostItemLostAbAttrs("PostItemLostAbAttr", this, false);
    }

    return true;
  }

  /**
   * Record a berry being eaten for ability and move triggers.
   * Only tracks things that proc _every_ time a berry is eaten.
   * @param berryType The type of berry being eaten.
   * @param updateHarvest Whether to track the berry for harvest; default `true`.
   */
  public recordEatenBerry(berryType: BerryType, updateHarvest = true) {
    this.battleData.hasEatenBerry = true;
    if (updateHarvest) {
      // Only track for harvest if we actually consumed the berry
      this.battleData.berriesEaten.push(berryType);
    }
    this.turnData.berriesEaten.push(berryType);
  }

  getPersistentTreasureCount(): number {
    return (
      this.getHeldItems().filter(m => m.is("DamageMoneyRewardModifier")).length +
      globalScene.findModifiers(m => m.is("MoneyMultiplierModifier") || m.is("ExtraModifierModifier")).length
    );
  }
}

export class PlayerPokemon extends Pokemon {
  protected battleInfo: PlayerBattleInfo;
  public compatibleTms: MoveId[];

  constructor(
    species: PokemonSpecies,
    level: number,
    abilityIndex?: number,
    formIndex?: number,
    gender?: Gender,
    shiny?: boolean,
    variant?: Variant,
    ivs?: number[],
    nature?: Nature,
    dataSource?: Pokemon | PokemonData,
  ) {
    super(106, 148, species, level, abilityIndex, formIndex, gender, shiny, variant, ivs, nature, dataSource);

    if (Overrides.STATUS_OVERRIDE) {
      this.status = new Status(Overrides.STATUS_OVERRIDE, 0, 4);
    }

    if (Overrides.SHINY_OVERRIDE) {
      this.shiny = true;
      this.initShinySparkle();
    } else if (Overrides.SHINY_OVERRIDE === false) {
      this.shiny = false;
    }

    if (Overrides.VARIANT_OVERRIDE !== null && this.shiny) {
      this.variant = Overrides.VARIANT_OVERRIDE;
    }

    if (!dataSource) {
      if (globalScene.gameMode.isDaily) {
        this.generateAndPopulateMoveset();
      } else {
        this.moveset = [];
      }
    }
    this.generateCompatibleTms();
  }

  initBattleInfo(): void {
    this.battleInfo = new PlayerBattleInfo();
    this.battleInfo.initInfo(this);
  }

  override isPlayer(): this is PlayerPokemon {
    return true;
  }

  override isEnemy(): this is EnemyPokemon {
    return false;
  }

  override hasTrainer(): boolean {
    return true;
  }

  override isBoss(): boolean {
    return false;
  }

  getFieldIndex(): number {
    return globalScene.getPlayerField().indexOf(this);
  }

  getBattlerIndex(): BattlerIndex {
    return this.getFieldIndex();
  }

  generateCompatibleTms(): void {
    this.compatibleTms = [];

    const tms = Object.keys(tmSpecies);
    for (const tm of tms) {
      const moveId = Number.parseInt(tm) as MoveId;
      let compatible = false;
      for (const p of tmSpecies[tm]) {
        if (Array.isArray(p)) {
          const [pkm, form] = p;
          if (
            (pkm === this.species.speciesId || (this.fusionSpecies && pkm === this.fusionSpecies.speciesId)) &&
            form === this.getFormKey()
          ) {
            compatible = true;
            break;
          }
        } else if (p === this.species.speciesId || (this.fusionSpecies && p === this.fusionSpecies.speciesId)) {
          compatible = true;
          break;
        }
      }
      if (reverseCompatibleTms.indexOf(moveId) > -1) {
        compatible = !compatible;
      }
      if (compatible) {
        this.compatibleTms.push(moveId);
      }
    }
  }

  tryPopulateMoveset(moveset: StarterMoveset): boolean {
    if (
      !this.getSpeciesForm().validateStarterMoveset(
        moveset,
        globalScene.gameData.starterData[this.species.getRootSpeciesId()].eggMoves,
      )
    ) {
      return false;
    }

    this.moveset = moveset.map(m => new PokemonMove(m));

    return true;
  }

  /**
   * Causes this mon to leave the field (via {@linkcode leaveField}) and then
   * opens the party switcher UI to switch a new mon in
   * @param switchType the {@linkcode SwitchType} for this switch-out. If this is
   * `BATON_PASS` or `SHED_TAIL`, this Pokemon's effects are not cleared upon leaving
   * the field.
   */
  switchOut(switchType: SwitchType = SwitchType.SWITCH): Promise<void> {
    return new Promise(resolve => {
      this.leaveField(switchType === SwitchType.SWITCH);

      globalScene.ui.setMode(
        UiMode.PARTY,
        PartyUiMode.FAINT_SWITCH,
        this.getFieldIndex(),
        (slotIndex: number, _option: PartyOption) => {
          if (slotIndex >= globalScene.currentBattle.getBattlerCount() && slotIndex < 6) {
            globalScene.phaseManager.prependNewToPhase(
              "MoveEndPhase",
              "SwitchSummonPhase",
              switchType,
              this.getFieldIndex(),
              slotIndex,
              false,
            );
          }
          globalScene.ui.setMode(UiMode.MESSAGE).then(resolve);
        },
        PartyUiHandler.FilterNonFainted,
      );
    });
  }

  addFriendship(friendship: number): void {
    if (friendship > 0) {
      const starterSpeciesId = this.species.getRootSpeciesId();
      const fusionStarterSpeciesId = this.isFusion() && this.fusionSpecies ? this.fusionSpecies.getRootSpeciesId() : 0;
      const starterData = [
        globalScene.gameData.starterData[starterSpeciesId],
        fusionStarterSpeciesId ? globalScene.gameData.starterData[fusionStarterSpeciesId] : null,
      ].filter(d => !!d);
      const amount = new NumberHolder(friendship);
      globalScene.applyModifier(PokemonFriendshipBoosterModifier, true, this, amount);
      const candyFriendshipMultiplier = globalScene.gameMode.isClassic
        ? timedEventManager.getClassicFriendshipMultiplier()
        : 1;
      const fusionReduction = fusionStarterSpeciesId
        ? timedEventManager.areFusionsBoosted()
          ? 1.5 // Divide candy gain for fusions by 1.5 during events
          : 2 // 2 for fusions outside events
        : 1; // 1 for non-fused mons
      const starterAmount = new NumberHolder(Math.floor((amount.value * candyFriendshipMultiplier) / fusionReduction));

      // Add friendship to this PlayerPokemon
      this.friendship = Math.min(this.friendship + amount.value, 255);
      if (this.friendship === 255) {
        globalScene.validateAchv(achvs.MAX_FRIENDSHIP);
      }
      // Add to candy progress for this mon's starter species and its fused species (if it has one)
      starterData.forEach((sd: StarterDataEntry, i: number) => {
        const speciesId = !i ? starterSpeciesId : (fusionStarterSpeciesId as SpeciesId);
        sd.friendship = (sd.friendship || 0) + starterAmount.value;
        if (sd.friendship >= getStarterValueFriendshipCap(speciesStarterCosts[speciesId])) {
          globalScene.gameData.addStarterCandy(getPokemonSpecies(speciesId), 1);
          sd.friendship = 0;
        }
      });
    } else {
      // Lose friendship upon fainting
      this.friendship = Math.max(this.friendship + friendship, 0);
    }
  }

  getPossibleEvolution(evolution: SpeciesFormEvolution | null): Promise<Pokemon> {
    if (!evolution) {
      return new Promise(resolve => resolve(this));
    }
    return new Promise(resolve => {
      const evolutionSpecies = getPokemonSpecies(evolution.speciesId);
      const isFusion = evolution instanceof FusionSpeciesFormEvolution;
      let ret: PlayerPokemon;
      if (isFusion) {
        const originalFusionSpecies = this.fusionSpecies;
        const originalFusionFormIndex = this.fusionFormIndex;
        this.fusionSpecies = evolutionSpecies;
        this.fusionFormIndex =
          evolution.evoFormKey !== null
            ? Math.max(
                evolutionSpecies.forms.findIndex(f => f.formKey === evolution.evoFormKey),
                0,
              )
            : this.fusionFormIndex;
        ret = globalScene.addPlayerPokemon(
          this.species,
          this.level,
          this.abilityIndex,
          this.formIndex,
          this.gender,
          this.shiny,
          this.variant,
          this.ivs,
          this.nature,
          this,
        );
        this.fusionSpecies = originalFusionSpecies;
        this.fusionFormIndex = originalFusionFormIndex;
      } else {
        const formIndex =
          evolution.evoFormKey !== null && !isFusion
            ? Math.max(
                evolutionSpecies.forms.findIndex(f => f.formKey === evolution.evoFormKey),
                0,
              )
            : this.formIndex;
        ret = globalScene.addPlayerPokemon(
          !isFusion ? evolutionSpecies : this.species,
          this.level,
          this.abilityIndex,
          formIndex,
          this.gender,
          this.shiny,
          this.variant,
          this.ivs,
          this.nature,
          this,
        );
      }
      ret.loadAssets().then(() => resolve(ret));
    });
  }

  evolve(evolution: SpeciesFormEvolution | null, preEvolution: PokemonSpeciesForm): Promise<void> {
    if (!evolution) {
      return new Promise(resolve => resolve());
    }
    return new Promise(resolve => {
      this.pauseEvolutions = false;
      // Handles Nincada evolving into Ninjask + Shedinja
      this.handleSpecialEvolutions(evolution);
      const isFusion = evolution instanceof FusionSpeciesFormEvolution;
      if (!isFusion) {
        this.species = getPokemonSpecies(evolution.speciesId);
      } else {
        this.fusionSpecies = getPokemonSpecies(evolution.speciesId);
      }
      if (evolution.preFormKey !== null) {
        const formIndex = Math.max(
          (!isFusion || !this.fusionSpecies ? this.species : this.fusionSpecies).forms.findIndex(
            f => f.formKey === evolution.evoFormKey,
          ),
          0,
        );
        if (!isFusion) {
          this.formIndex = formIndex;
        } else {
          this.fusionFormIndex = formIndex;
        }
      }
      this.generateName();
      if (!isFusion) {
        const abilityCount = this.getSpeciesForm().getAbilityCount();
        const preEvoAbilityCount = preEvolution.getAbilityCount();
        if ([0, 1, 2].includes(this.abilityIndex)) {
          // Handles cases where a Pokemon with 3 abilities evolves into a Pokemon with 2 abilities (ie: Eevee -> any Eeveelution)
          if (this.abilityIndex === 2 && preEvoAbilityCount === 3 && abilityCount === 2) {
            this.abilityIndex = 1;
          }
        } else {
          // Prevent pokemon with an illegal ability value from breaking things
          console.warn("this.abilityIndex is somehow an illegal value, please report this");
          console.warn(this.abilityIndex);
          this.abilityIndex = 0;
        }
      } else {
        // Do the same as above, but for fusions
        const abilityCount = this.getFusionSpeciesForm().getAbilityCount();
        const preEvoAbilityCount = preEvolution.getAbilityCount();
        if ([0, 1, 2].includes(this.fusionAbilityIndex)) {
          if (this.fusionAbilityIndex === 2 && preEvoAbilityCount === 3 && abilityCount === 2) {
            this.fusionAbilityIndex = 1;
          }
        } else {
          console.warn("this.fusionAbilityIndex is somehow an illegal value, please report this");
          console.warn(this.fusionAbilityIndex);
          this.fusionAbilityIndex = 0;
        }
      }
      this.compatibleTms.splice(0, this.compatibleTms.length);
      this.generateCompatibleTms();
      const updateAndResolve = () => {
        this.loadAssets().then(() => {
          this.calculateStats();
          this.updateInfo(true).then(() => resolve());
        });
      };
      if (preEvolution.speciesId === SpeciesId.GIMMIGHOUL) {
        const evotracker = this.getHeldItems().filter(m => m instanceof EvoTrackerModifier)[0] ?? null;
        if (evotracker) {
          globalScene.removeModifier(evotracker);
        }
      }
      if (!globalScene.gameMode.isDaily || this.metBiome > -1) {
        globalScene.gameData.updateSpeciesDexIvs(this.species.speciesId, this.ivs);
        globalScene.gameData.setPokemonSeen(this, false);
        globalScene.gameData.setPokemonCaught(this, false).then(() => updateAndResolve());
      } else {
        updateAndResolve();
      }
    });
  }

  private handleSpecialEvolutions(evolution: SpeciesFormEvolution) {
    const isFusion = evolution instanceof FusionSpeciesFormEvolution;

    const evoSpecies = !isFusion ? this.species : this.fusionSpecies;
    if (evoSpecies?.speciesId === SpeciesId.NINCADA && evolution.speciesId === SpeciesId.NINJASK) {
      const newEvolution = pokemonEvolutions[evoSpecies.speciesId][1];

      if (validateShedinjaEvo()) {
        const newPokemon = globalScene.addPlayerPokemon(
          this.species,
          this.level,
          this.abilityIndex,
          this.formIndex,
          undefined,
          this.shiny,
          this.variant,
          this.ivs,
          this.nature,
        );
        newPokemon.passive = this.passive;
        newPokemon.moveset = this.moveset.slice();
        newPokemon.moveset = this.copyMoveset();
        newPokemon.luck = this.luck;
        newPokemon.gender = Gender.GENDERLESS;
        newPokemon.metLevel = this.metLevel;
        newPokemon.metBiome = this.metBiome;
        newPokemon.metSpecies = this.metSpecies;
        newPokemon.metWave = this.metWave;
        newPokemon.fusionSpecies = this.fusionSpecies;
        newPokemon.fusionFormIndex = this.fusionFormIndex;
        newPokemon.fusionAbilityIndex = this.fusionAbilityIndex;
        newPokemon.fusionShiny = this.fusionShiny;
        newPokemon.fusionVariant = this.fusionVariant;
        newPokemon.fusionGender = this.fusionGender;
        newPokemon.fusionLuck = this.fusionLuck;
        newPokemon.fusionTeraType = this.fusionTeraType;
        newPokemon.usedTMs = this.usedTMs;

        globalScene.getPlayerParty().push(newPokemon);
        newPokemon.evolve(!isFusion ? newEvolution : new FusionSpeciesFormEvolution(this.id, newEvolution), evoSpecies);
        const modifiers = globalScene.findModifiers(
          m => m instanceof PokemonHeldItemModifier && m.pokemonId === this.id,
          true,
        ) as PokemonHeldItemModifier[];
        modifiers.forEach(m => {
          const clonedModifier = m.clone() as PokemonHeldItemModifier;
          clonedModifier.pokemonId = newPokemon.id;
          globalScene.addModifier(clonedModifier, true);
        });
        globalScene.updateModifiers(true);
      }
    }
  }

  getPossibleForm(formChange: SpeciesFormChange): Promise<Pokemon> {
    return new Promise(resolve => {
      const formIndex = Math.max(
        this.species.forms.findIndex(f => f.formKey === formChange.formKey),
        0,
      );
      const ret = globalScene.addPlayerPokemon(
        this.species,
        this.level,
        this.abilityIndex,
        formIndex,
        this.gender,
        this.shiny,
        this.variant,
        this.ivs,
        this.nature,
        this,
      );
      ret.loadAssets().then(() => resolve(ret));
    });
  }

  changeForm(formChange: SpeciesFormChange): Promise<void> {
    return new Promise(resolve => {
      this.formIndex = Math.max(
        this.species.forms.findIndex(f => f.formKey === formChange.formKey),
        0,
      );
      this.generateName();
      const abilityCount = this.getSpeciesForm().getAbilityCount();
      if (this.abilityIndex >= abilityCount) {
        // Shouldn't happen
        this.abilityIndex = abilityCount - 1;
      }

      this.compatibleTms.splice(0, this.compatibleTms.length);
      this.generateCompatibleTms();
      const updateAndResolve = () => {
        this.loadAssets().then(() => {
          this.calculateStats();
          globalScene.updateModifiers(true, true);
          this.updateInfo(true).then(() => resolve());
        });
      };
      if (!globalScene.gameMode.isDaily || this.metBiome > -1) {
        globalScene.gameData.setPokemonSeen(this, false);
        globalScene.gameData.setPokemonCaught(this, false).then(() => updateAndResolve());
      } else {
        updateAndResolve();
      }
    });
  }

  clearFusionSpecies(): void {
    super.clearFusionSpecies();
    this.generateCompatibleTms();
  }

  /**
   * Returns a Promise to fuse two PlayerPokemon together
   * @param pokemon The PlayerPokemon to fuse to this one
   */
  fuse(pokemon: PlayerPokemon): void {
    this.fusionSpecies = pokemon.species;
    this.fusionFormIndex = pokemon.formIndex;
    this.fusionAbilityIndex = pokemon.abilityIndex;
    this.fusionShiny = pokemon.shiny;
    this.fusionVariant = pokemon.variant;
    this.fusionGender = pokemon.gender;
    this.fusionLuck = pokemon.luck;
    this.fusionCustomPokemonData = pokemon.customPokemonData;
    if (pokemon.pauseEvolutions || this.pauseEvolutions) {
      this.pauseEvolutions = true;
    }

    globalScene.validateAchv(achvs.SPLICE);
    globalScene.gameData.gameStats.pokemonFused++;

    // Store the average HP% that each Pokemon has
    const maxHp = this.getMaxHp();
    const newHpPercent = (pokemon.hp / pokemon.getMaxHp() + this.hp / maxHp) / 2;

    this.generateName();
    this.calculateStats();

    // Set this Pokemon's HP to the average % of both fusion components
    this.hp = Math.round(maxHp * newHpPercent);
    if (!this.isFainted()) {
      // If this Pokemon hasn't fainted, make sure the HP wasn't set over the new maximum
      this.hp = Math.min(this.hp, maxHp);
      this.status = getRandomStatus(this.status, pokemon.status); // Get a random valid status between the two
    } else if (!pokemon.isFainted()) {
      // If this Pokemon fainted but the other hasn't, make sure the HP wasn't set to zero
      this.hp = Math.max(this.hp, 1);
      this.status = pokemon.status; // Inherit the other Pokemon's status
    }

    this.generateCompatibleTms();
    this.updateInfo(true);
    const fusedPartyMemberIndex = globalScene.getPlayerParty().indexOf(pokemon);
    let partyMemberIndex = globalScene.getPlayerParty().indexOf(this);
    if (partyMemberIndex > fusedPartyMemberIndex) {
      partyMemberIndex--;
    }

    // combine the two mons' held items
    const fusedPartyMemberHeldModifiers = globalScene.findModifiers(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id,
      true,
    ) as PokemonHeldItemModifier[];
    for (const modifier of fusedPartyMemberHeldModifiers) {
      globalScene.tryTransferHeldItemModifier(modifier, this, false, modifier.getStackCount(), true, true, false);
    }
    globalScene.updateModifiers(true, true);
    globalScene.removePartyMemberModifiers(fusedPartyMemberIndex);
    globalScene.getPlayerParty().splice(fusedPartyMemberIndex, 1)[0];
    const newPartyMemberIndex = globalScene.getPlayerParty().indexOf(this);
    pokemon
      .getMoveset(true)
      .map((m: PokemonMove) =>
        globalScene.phaseManager.unshiftNew("LearnMovePhase", newPartyMemberIndex, m.getMove().id),
      );
    pokemon.destroy();
    this.updateFusionPalette();
  }

  unfuse(): Promise<void> {
    return new Promise(resolve => {
      this.clearFusionSpecies();

      this.updateInfo(true).then(() => resolve());
      this.updateFusionPalette();
    });
  }

  /** Returns a deep copy of this Pokemon's moveset array */
  copyMoveset(): PokemonMove[] {
    const newMoveset: PokemonMove[] = [];
    this.moveset.forEach(move => {
      newMoveset.push(new PokemonMove(move.moveId, 0, move.ppUp, move.maxPpOverride));
    });

    return newMoveset;
  }
}

export class EnemyPokemon extends Pokemon {
  protected battleInfo: EnemyBattleInfo;
  public trainerSlot: TrainerSlot;
  public aiType: AiType;
  public bossSegments: number;
  public bossSegmentIndex: number;
  public initialTeamIndex: number;
  /** To indicate if the instance was populated with a dataSource -> e.g. loaded & populated from session data */
  public readonly isPopulatedFromDataSource: boolean;

  constructor(
    species: PokemonSpecies,
    level: number,
    trainerSlot: TrainerSlot,
    boss: boolean,
    shinyLock = false,
    dataSource?: PokemonData,
  ) {
    super(
      236,
      84,
      species,
      level,
      dataSource?.abilityIndex,
      dataSource?.formIndex,
      dataSource?.gender,
      !shinyLock && dataSource ? dataSource.shiny : false,
      !shinyLock && dataSource ? dataSource.variant : undefined,
      undefined,
      dataSource ? dataSource.nature : undefined,
      dataSource,
    );

    this.trainerSlot = trainerSlot;
    this.initialTeamIndex = globalScene.currentBattle?.enemyParty.length ?? 0;
    this.isPopulatedFromDataSource = !!dataSource; // if a dataSource is provided, then it was populated from dataSource
    if (boss) {
      this.setBoss(boss, dataSource?.bossSegments);
    }

    if (Overrides.OPP_STATUS_OVERRIDE) {
      this.status = new Status(Overrides.OPP_STATUS_OVERRIDE, 0, 4);
    }

    if (Overrides.OPP_GENDER_OVERRIDE !== null) {
      this.gender = Overrides.OPP_GENDER_OVERRIDE;
    }

    const speciesId = this.species.speciesId;

    if (
      speciesId in Overrides.OPP_FORM_OVERRIDES &&
      !isNullOrUndefined(Overrides.OPP_FORM_OVERRIDES[speciesId]) &&
      this.species.forms[Overrides.OPP_FORM_OVERRIDES[speciesId]]
    ) {
      this.formIndex = Overrides.OPP_FORM_OVERRIDES[speciesId];
    }

    if (!dataSource) {
      this.generateAndPopulateMoveset();
      if (shinyLock || Overrides.OPP_SHINY_OVERRIDE === false) {
        this.shiny = false;
      } else {
        this.trySetShiny();
      }

      if (!this.shiny && Overrides.OPP_SHINY_OVERRIDE) {
        this.shiny = true;
        this.initShinySparkle();
      }

      if (this.shiny) {
        this.variant = this.generateShinyVariant();
        if (Overrides.OPP_VARIANT_OVERRIDE !== null) {
          this.variant = Overrides.OPP_VARIANT_OVERRIDE;
        }
      }

      this.luck = (this.shiny ? this.variant + 1 : 0) + (this.fusionShiny ? this.fusionVariant + 1 : 0);

      if (this.hasTrainer() && globalScene.currentBattle) {
        const { waveIndex } = globalScene.currentBattle;
        const ivs: number[] = [];
        while (ivs.length < 6) {
          ivs.push(randSeedIntRange(Math.floor(waveIndex / 10), 31));
        }
        this.ivs = ivs;
      }
    }

    this.aiType = boss || this.hasTrainer() ? AiType.SMART : AiType.SMART_RANDOM;
  }

  initBattleInfo(): void {
    if (!this.battleInfo) {
      this.battleInfo = new EnemyBattleInfo();
      this.battleInfo.initInfo(this);
      this.battleInfo.updateBossSegments(this);
    } else {
      this.battleInfo.updateBossSegments(this);
    }
  }

  /**
   * Sets the pokemons boss status. If true initializes the boss segments either from the arguments
   * or through the the Scene.getEncounterBossSegments function
   *
   * @param boss if the pokemon is a boss
   * @param bossSegments amount of boss segments (health-bar segments)
   */
  setBoss(boss = true, bossSegments = 0): void {
    if (boss) {
      this.bossSegments =
        bossSegments ||
        globalScene.getEncounterBossSegments(globalScene.currentBattle.waveIndex, this.level, this.species, true);
      this.bossSegmentIndex = this.bossSegments - 1;
    } else {
      this.bossSegments = 0;
      this.bossSegmentIndex = 0;
    }
  }

  generateAndPopulateMoveset(formIndex?: number): void {
    switch (true) {
      case this.species.speciesId === SpeciesId.SMEARGLE:
        this.moveset = [
          new PokemonMove(MoveId.SKETCH),
          new PokemonMove(MoveId.SKETCH),
          new PokemonMove(MoveId.SKETCH),
          new PokemonMove(MoveId.SKETCH),
        ];
        break;
      case this.species.speciesId === SpeciesId.ETERNATUS:
        this.moveset = (formIndex !== undefined ? formIndex : this.formIndex)
          ? [
              new PokemonMove(MoveId.DYNAMAX_CANNON),
              new PokemonMove(MoveId.CROSS_POISON),
              new PokemonMove(MoveId.FLAMETHROWER),
              new PokemonMove(MoveId.RECOVER, 0, -4),
            ]
          : [
              new PokemonMove(MoveId.ETERNABEAM),
              new PokemonMove(MoveId.SLUDGE_BOMB),
              new PokemonMove(MoveId.FLAMETHROWER),
              new PokemonMove(MoveId.COSMIC_POWER),
            ];
        if (globalScene.gameMode.hasChallenge(Challenges.INVERSE_BATTLE)) {
          this.moveset[2] = new PokemonMove(MoveId.THUNDERBOLT);
        }
        break;
      default:
        super.generateAndPopulateMoveset();
        break;
    }
  }

  /**
   * Determines the move this Pokemon will use on the next turn, as well as
   * the Pokemon the move will target.
   * @returns this Pokemon's next move in the format {move, moveTargets}
   */
  // TODO: split this up and move it elsewhere
  getNextMove(): TurnMove {
    // If this Pokemon has a usable move already queued, return it,
    // removing all unusable moves before it in the queue.
    const moveQueue = this.getMoveQueue();
    for (const [i, queuedMove] of moveQueue.entries()) {
      const movesetMove = this.getMoveset().find(m => m.moveId === queuedMove.move);
      // If the queued move was called indirectly, ignore all PP and usability checks.
      // Otherwise, ensure that the move being used is actually usable & in our moveset.
      // TODO: What should happen if a pokemon forgets a charging move mid-use?
      if (isVirtual(queuedMove.useMode) || movesetMove?.isUsable(this, isIgnorePP(queuedMove.useMode))) {
        moveQueue.splice(0, i); // TODO: This should not be done here
        return queuedMove;
      }
    }

    // We went through the entire queue without a match; clear the entire thing.
    this.summonData.moveQueue = [];

    // Filter out any moves this Pokemon cannot use
    let movePool = this.getMoveset().filter(m => m.isUsable(this));
    // If no moves are left, use Struggle. Otherwise, continue with move selection
    if (movePool.length) {
      // If there's only 1 move in the move pool, use it.
      if (movePool.length === 1) {
        return {
          move: movePool[0].moveId,
          targets: this.getNextTargets(movePool[0].moveId),
          useMode: MoveUseMode.NORMAL,
        };
      }
      // If a move is forced because of Encore, use it.
      // Said moves are executed normally
      const encoreTag = this.getTag(EncoreTag) as EncoreTag;
      if (encoreTag) {
        const encoreMove = movePool.find(m => m.moveId === encoreTag.moveId);
        if (encoreMove) {
          return {
            move: encoreMove.moveId,
            targets: this.getNextTargets(encoreMove.moveId),
            useMode: MoveUseMode.NORMAL,
          };
        }
      }
      switch (this.aiType) {
        // No enemy should spawn with this AI type in-game
        case AiType.RANDOM: {
          const moveId = movePool[globalScene.randBattleSeedInt(movePool.length)].moveId;
          return { move: moveId, targets: this.getNextTargets(moveId), useMode: MoveUseMode.NORMAL };
        }
        case AiType.SMART_RANDOM:
        case AiType.SMART: {
          /**
           * Search this Pokemon's move pool for moves that will KO an opposing target.
           * If there are any moves that can KO an opponent (i.e. a player Pokemon),
           * those moves are the only ones considered for selection on this turn.
           */
          const koMoves = movePool.filter(pkmnMove => {
            if (!pkmnMove) {
              return false;
            }

            const move = pkmnMove.getMove()!;
            if (move.moveTarget === MoveTarget.ATTACKER) {
              return false;
            }

            const fieldPokemon = globalScene.getField();
            const moveTargets = getMoveTargets(this, move.id)
              .targets.map(ind => fieldPokemon[ind])
              .filter(p => this.isPlayer() !== p.isPlayer());
            // Only considers critical hits for crit-only moves or when this Pokemon is under the effect of Laser Focus
            const isCritical = move.hasAttr("CritOnlyAttr") || !!this.getTag(BattlerTagType.ALWAYS_CRIT);

            return (
              move.category !== MoveCategory.STATUS &&
              moveTargets.some(p => {
                const doesNotFail =
                  move.applyConditions(this, p, move) ||
                  [MoveId.SUCKER_PUNCH, MoveId.UPPER_HAND, MoveId.THUNDERCLAP].includes(move.id);
                return (
                  doesNotFail &&
                  p.getAttackDamage({
                    source: this,
                    move,
                    ignoreAbility: !p.waveData.abilityRevealed,
                    ignoreSourceAbility: false,
                    ignoreAllyAbility: !p.getAlly()?.waveData.abilityRevealed,
                    ignoreSourceAllyAbility: false,
                    isCritical,
                  }).damage >= p.hp
                );
              })
            );
          }, this);

          if (koMoves.length > 0) {
            movePool = koMoves;
          }

          /**
           * Move selection is based on the move's calculated "benefit score" against the
           * best possible target(s) (as determined by {@linkcode getNextTargets}).
           * For more information on how benefit scores are calculated, see `docs/enemy-ai.md`.
           */
          const moveScores = movePool.map(() => 0);
          const moveTargets = Object.fromEntries(movePool.map(m => [m.moveId, this.getNextTargets(m.moveId)]));
          for (const m in movePool) {
            const pokemonMove = movePool[m];
            const move = pokemonMove.getMove();

            let moveScore = moveScores[m];
            const targetScores: number[] = [];

            for (const mt of moveTargets[move.id]) {
              // Prevent a target score from being calculated when the target is whoever attacks the user
              if (mt === BattlerIndex.ATTACKER) {
                break;
              }

              const target = globalScene.getField()[mt];
              /**
               * The "target score" of a move is given by the move's user benefit score + the move's target benefit score.
               * If the target is an ally, the target benefit score is multiplied by -1.
               */
              let targetScore =
                move.getUserBenefitScore(this, target, move) +
                move.getTargetBenefitScore(this, target, move) * (mt < BattlerIndex.ENEMY === this.isPlayer() ? 1 : -1);
              if (Number.isNaN(targetScore)) {
                console.error(`Move ${move.name} returned score of NaN`);
                targetScore = 0;
              }
              /**
               * If this move is unimplemented, or the move is known to fail when used, set its
               * target score to -20
               */
              if (
                (move.name.endsWith(" (N)") || !move.applyConditions(this, target, move)) &&
                ![MoveId.SUCKER_PUNCH, MoveId.UPPER_HAND, MoveId.THUNDERCLAP].includes(move.id)
              ) {
                targetScore = -20;
              } else if (move.is("AttackMove")) {
                /**
                 * Attack moves are given extra multipliers to their base benefit score based on
                 * the move's type effectiveness against the target and whether the move is a STAB move.
                 */
                const effectiveness = target.getMoveEffectiveness(
                  this,
                  move,
                  !target.waveData.abilityRevealed,
                  undefined,
                  undefined,
                  true,
                );

                if (target.isPlayer() !== this.isPlayer()) {
                  targetScore *= effectiveness;
                  if (this.isOfType(move.type)) {
                    targetScore *= 1.5;
                  }
                } else if (effectiveness) {
                  targetScore /= effectiveness;
                  if (this.isOfType(move.type)) {
                    targetScore /= 1.5;
                  }
                }
                /** If a move has a base benefit score of 0, its benefit score is assumed to be unimplemented at this point */
                if (!targetScore) {
                  targetScore = -20;
                }
              }
              targetScores.push(targetScore);
            }
            // When a move has multiple targets, its score is equal to the maximum target score across all targets
            moveScore += Math.max(...targetScores);

            // could make smarter by checking opponent def/spdef
            moveScores[m] = moveScore;
          }

          console.log(moveScores);

          // Sort the move pool in decreasing order of move score
          const sortedMovePool = movePool.slice(0);
          sortedMovePool.sort((a, b) => {
            const scoreA = moveScores[movePool.indexOf(a)];
            const scoreB = moveScores[movePool.indexOf(b)];
            return scoreA < scoreB ? 1 : scoreA > scoreB ? -1 : 0;
          });
          let r = 0;
          if (this.aiType === AiType.SMART_RANDOM) {
            // Has a 5/8 chance to select the best move, and a 3/8 chance to advance to the next best move (and repeat this roll)
            while (r < sortedMovePool.length - 1 && globalScene.randBattleSeedInt(8) >= 5) {
              r++;
            }
          } else if (this.aiType === AiType.SMART) {
            // The chance to advance to the next best move increases when the compared moves' scores are closer to each other.
            while (
              r < sortedMovePool.length - 1 &&
              moveScores[movePool.indexOf(sortedMovePool[r + 1])] / moveScores[movePool.indexOf(sortedMovePool[r])] >=
                0 &&
              globalScene.randBattleSeedInt(100) <
                Math.round(
                  (moveScores[movePool.indexOf(sortedMovePool[r + 1])] /
                    moveScores[movePool.indexOf(sortedMovePool[r])]) *
                    50,
                )
            ) {
              r++;
            }
          }
          console.log(
            movePool.map(m => m.getName()),
            moveScores,
            r,
            sortedMovePool.map(m => m.getName()),
          );
          return {
            move: sortedMovePool[r]!.moveId,
            targets: moveTargets[sortedMovePool[r]!.moveId],
            useMode: MoveUseMode.NORMAL,
          };
        }
      }
    }

    // No moves left means struggle
    return {
      move: MoveId.STRUGGLE,
      targets: this.getNextTargets(MoveId.STRUGGLE),
      useMode: MoveUseMode.IGNORE_PP,
    };
  }

  /**
   * Determines the Pokemon the given move would target if used by this Pokemon
   * @param moveId {@linkcode MoveId} The move to be used
   * @returns The indexes of the Pokemon the given move would target
   */
  getNextTargets(moveId: MoveId): BattlerIndex[] {
    const moveTargets = getMoveTargets(this, moveId);
    const targets = globalScene.getField(true).filter(p => moveTargets.targets.indexOf(p.getBattlerIndex()) > -1);
    // If the move is multi-target, return all targets' indexes
    if (moveTargets.multiple) {
      return targets.map(p => p.getBattlerIndex());
    }

    const move = allMoves[moveId];

    /**
     * Get the move's target benefit score against each potential target.
     * For allies, this score is multiplied by -1.
     */
    const benefitScores = targets.map(p => [
      p.getBattlerIndex(),
      move.getTargetBenefitScore(this, p, move) * (p.isPlayer() === this.isPlayer() ? 1 : -1),
    ]);

    const sortedBenefitScores = benefitScores.slice(0);
    sortedBenefitScores.sort((a, b) => {
      const scoreA = a[1];
      const scoreB = b[1];
      return scoreA < scoreB ? 1 : scoreA > scoreB ? -1 : 0;
    });

    if (!sortedBenefitScores.length) {
      // Set target to BattlerIndex.ATTACKER when using a counter move
      // This is the same as when the player does so
      if (move.hasAttr("CounterDamageAttr")) {
        return [BattlerIndex.ATTACKER];
      }

      return [];
    }

    let targetWeights = sortedBenefitScores.map(s => s[1]);
    const lowestWeight = targetWeights[targetWeights.length - 1];

    // If the lowest target weight (i.e. benefit score) is negative, add abs(lowestWeight) to all target weights
    if (lowestWeight < 1) {
      for (let w = 0; w < targetWeights.length; w++) {
        targetWeights[w] += Math.abs(lowestWeight - 1);
      }
    }

    // Remove any targets whose weights are less than half the max of the target weights from consideration
    const benefitCutoffIndex = targetWeights.findIndex(s => s < targetWeights[0] / 2);
    if (benefitCutoffIndex > -1) {
      targetWeights = targetWeights.slice(0, benefitCutoffIndex);
    }

    const thresholds: number[] = [];
    let totalWeight = 0;
    targetWeights.reduce((total: number, w: number) => {
      total += w;
      thresholds.push(total);
      totalWeight = total;
      return total;
    }, 0);

    /**
     * Generate a random number from 0 to (totalWeight-1),
     * then select the first target whose cumulative weight (with all previous targets' weights)
     * is greater than that random number.
     */
    const randValue = globalScene.randBattleSeedInt(totalWeight);
    let targetIndex = 0;

    thresholds.every((t, i) => {
      if (randValue >= t) {
        return true;
      }

      targetIndex = i;
      return false;
    });

    return [sortedBenefitScores[targetIndex][0]];
  }

  override isPlayer(): this is PlayerPokemon {
    return false;
  }

  override isEnemy(): this is EnemyPokemon {
    return true;
  }

  override hasTrainer(): boolean {
    return !!this.trainerSlot;
  }

  override isBoss(): boolean {
    return !!this.bossSegments;
  }

  getBossSegmentIndex(): number {
    const segments = (this as EnemyPokemon).bossSegments;
    const segmentSize = this.getMaxHp() / segments;
    for (let s = segments - 1; s > 0; s--) {
      const hpThreshold = Math.round(segmentSize * s);
      if (this.hp > hpThreshold) {
        return s;
      }
    }

    return 0;
  }

  damage(damage: number, ignoreSegments = false, preventEndure = false, ignoreFaintPhase = false): number {
    if (this.isFainted()) {
      return 0;
    }

    let clearedBossSegmentIndex = this.isBoss() ? this.bossSegmentIndex + 1 : 0;

    if (this.isBoss() && !ignoreSegments) {
      const segmentSize = this.getMaxHp() / this.bossSegments;
      for (let s = this.bossSegmentIndex; s > 0; s--) {
        const hpThreshold = segmentSize * s;
        const roundedHpThreshold = Math.round(hpThreshold);
        if (this.hp >= roundedHpThreshold) {
          if (this.hp - damage <= roundedHpThreshold) {
            const hpRemainder = this.hp - roundedHpThreshold;
            let segmentsBypassed = 0;
            while (
              segmentsBypassed < this.bossSegmentIndex &&
              this.canBypassBossSegments(segmentsBypassed + 1) &&
              damage - hpRemainder >= Math.round(segmentSize * Math.pow(2, segmentsBypassed + 1))
            ) {
              segmentsBypassed++;
              //console.log('damage', damage, 'segment', segmentsBypassed + 1, 'segment size', segmentSize, 'damage needed', Math.round(segmentSize * Math.pow(2, segmentsBypassed + 1)));
            }

            damage = toDmgValue(this.hp - hpThreshold + segmentSize * segmentsBypassed);
            clearedBossSegmentIndex = s - segmentsBypassed;
          }
          break;
        }
      }
    }

    switch (globalScene.currentBattle.battleSpec) {
      case BattleSpec.FINAL_BOSS:
        if (!this.formIndex && this.bossSegmentIndex < 1) {
          damage = Math.min(damage, this.hp - 1);
        }
    }

    const ret = super.damage(damage, ignoreSegments, preventEndure, ignoreFaintPhase);

    if (this.isBoss()) {
      if (ignoreSegments) {
        const segmentSize = this.getMaxHp() / this.bossSegments;
        clearedBossSegmentIndex = Math.ceil(this.hp / segmentSize);
      }
      if (clearedBossSegmentIndex <= this.bossSegmentIndex) {
        this.handleBossSegmentCleared(clearedBossSegmentIndex);
      }
      this.battleInfo.updateBossSegments(this);
    }

    return ret;
  }

  canBypassBossSegments(segmentCount = 1): boolean {
    if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      if (!this.formIndex && this.bossSegmentIndex - segmentCount < 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Go through a boss' health segments and give stats boosts for each newly cleared segment
   * The base boost is 1 to a random stat that's not already maxed out per broken shield
   * For Pokemon with 3 health segments or more, breaking the last shield gives +2 instead
   * For Pokemon with 5 health segments or more, breaking the last two shields give +2 each
   * @param segmentIndex index of the segment to get down to (0 = no shield left, 1 = 1 shield left, etc.)
   */
  handleBossSegmentCleared(segmentIndex: number): void {
    while (this.bossSegmentIndex > 0 && segmentIndex - 1 < this.bossSegmentIndex) {
      // Filter out already maxed out stat stages and weigh the rest based on existing stats
      const leftoverStats = EFFECTIVE_STATS.filter((s: EffectiveStat) => this.getStatStage(s) < 6);
      const statWeights = leftoverStats.map((s: EffectiveStat) => this.getStat(s, false));

      let boostedStat: EffectiveStat;
      const statThresholds: number[] = [];
      let totalWeight = 0;

      for (const i in statWeights) {
        totalWeight += statWeights[i];
        statThresholds.push(totalWeight);
      }

      // Pick a random stat from the leftover stats to increase its stages
      const randInt = randSeedInt(totalWeight);
      for (const i in statThresholds) {
        if (randInt < statThresholds[i]) {
          boostedStat = leftoverStats[i];
          break;
        }
      }

      let stages = 1;

      // increase the boost if the boss has at least 3 segments and we passed last shield
      if (this.bossSegments >= 3 && this.bossSegmentIndex === 1) {
        stages++;
      }
      // increase the boost if the boss has at least 5 segments and we passed the second to last shield
      if (this.bossSegments >= 5 && this.bossSegmentIndex === 2) {
        stages++;
      }

      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        this.getBattlerIndex(),
        true,
        [boostedStat!],
        stages,
        true,
        true,
      );
      this.bossSegmentIndex--;
    }
  }

  getFieldIndex(): number {
    return globalScene.getEnemyField().indexOf(this);
  }

  getBattlerIndex(): BattlerIndex {
    return BattlerIndex.ENEMY + this.getFieldIndex();
  }

  /**
   * Add a new pokemon to the player's party (at `slotIndex` if set).
   * The new pokemon's visibility will be set to `false`.
   * @param pokeballType the type of pokeball the pokemon was caught with
   * @param slotIndex an optional index to place the pokemon in the party
   * @returns the pokemon that was added or null if the pokemon could not be added
   */
  addToParty(pokeballType: PokeballType, slotIndex = -1) {
    const party = globalScene.getPlayerParty();
    let ret: PlayerPokemon | null = null;

    if (party.length < PLAYER_PARTY_MAX_SIZE) {
      this.pokeball = pokeballType;
      this.metLevel = this.level;
      this.metBiome = globalScene.arena.biomeType;
      this.metWave = globalScene.currentBattle.waveIndex;
      this.metSpecies = this.species.speciesId;
      const newPokemon = globalScene.addPlayerPokemon(
        this.species,
        this.level,
        this.abilityIndex,
        this.formIndex,
        this.gender,
        this.shiny,
        this.variant,
        this.ivs,
        this.nature,
        this,
      );

      if (isBetween(slotIndex, 0, PLAYER_PARTY_MAX_SIZE - 1)) {
        party.splice(slotIndex, 0, newPokemon);
      } else {
        party.push(newPokemon);
      }

      // Hide the Pokemon since it is not on the field
      newPokemon.setVisible(false);

      ret = newPokemon;
      globalScene.triggerPokemonFormChange(newPokemon, SpeciesFormChangeActiveTrigger, true);
    }

    return ret;
  }

  /**
   * Show or hide the type effectiveness multiplier window
   * Passing undefined will hide the window
   */
  updateEffectiveness(effectiveness?: string) {
    this.battleInfo.updateEffectiveness(effectiveness);
  }

  toggleFlyout(visible: boolean): void {
    this.battleInfo.toggleFlyout(visible);
  }
}

/**
 * Illusion property
 */
interface IllusionData {
  basePokemon: {
    /** The actual name of the Pokemon */
    name: string;
    /** The actual nickname of the Pokemon */
    nickname: string;
    /** Whether the base pokemon is shiny or not */
    shiny: boolean;
    /** The shiny variant of the base pokemon */
    variant: Variant;
    /** Whether the fusion species of the base pokemon is shiny or not */
    fusionShiny: boolean;
    /** The variant of the fusion species of the base pokemon */
    fusionVariant: Variant;
  };
  /** The species of the illusion */
  species: SpeciesId;
  /** The formIndex of the illusion */
  formIndex: number;
  /** The gender of the illusion */
  gender: Gender;
  /** The pokeball of the illusion */
  pokeball: PokeballType;
  /** The fusion species of the illusion if it's a fusion */
  fusionSpecies?: PokemonSpecies;
  /** The fusionFormIndex of the illusion */
  fusionFormIndex?: number;
  /** The fusionGender of the illusion if it's a fusion */
  fusionGender?: Gender;
  /** The level of the illusion (not used currently) */
  level?: number;
}

export interface TurnMove {
  move: MoveId;
  targets: BattlerIndex[];
  useMode: MoveUseMode;
  result?: MoveResult;
  turn?: number;
}

export interface AttackMoveResult {
  move: MoveId;
  result: DamageResult;
  damage: number;
  critical: boolean;
  sourceId: number;
  sourceBattlerIndex: BattlerIndex;
}

/**
 * Persistent in-battle data for a {@linkcode Pokemon}.
 * Resets on switch or new battle.
 */
export class PokemonSummonData {
  /** [Atk, Def, SpAtk, SpDef, Spd, Acc, Eva] */
  public statStages: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * A queue of moves yet to be executed, used by charging, recharging and frenzy moves.
   * So long as this array is nonempty, this Pokemon's corresponding `CommandPhase` will be skipped over entirely
   * in favor of using the queued move.
   * TODO: Clean up a lot of the code surrounding the move queue.
   */
  public moveQueue: TurnMove[] = [];
  public tags: BattlerTag[] = [];
  public abilitySuppressed = false;

  // Overrides for transform.
  // TODO: Move these into a separate class & add rage fist hit count
  public speciesForm: PokemonSpeciesForm | null = null;
  public fusionSpeciesForm: PokemonSpeciesForm | null = null;
  public ability: AbilityId | undefined;
  public passiveAbility: AbilityId | undefined;
  public gender: Gender | undefined;
  public fusionGender: Gender | undefined;
  public stats: number[] = [0, 0, 0, 0, 0, 0];
  public moveset: PokemonMove[] | null;

  // If not initialized this value will not be populated from save data.
  public types: PokemonType[] = [];
  public addedType: PokemonType | null = null;

  /** Data pertaining to this pokemon's illusion. */
  public illusion: IllusionData | null = null;
  public illusionBroken = false;

  /** Array containing all berries eaten in the last turn; used by {@linkcode AbilityId.CUD_CHEW} */
  public berriesEatenLast: BerryType[] = [];

  /**
   * An array of all moves this pokemon has used since entering the battle.
   * Used for most moves and abilities that check prior move usage or copy already-used moves.
   */
  public moveHistory: TurnMove[] = [];

  constructor(source?: PokemonSummonData | Partial<PokemonSummonData>) {
    if (isNullOrUndefined(source)) {
      return;
    }

    // TODO: Rework this into an actual generic function for use elsewhere
    for (const [key, value] of Object.entries(source)) {
      if (isNullOrUndefined(value) && this.hasOwnProperty(key)) {
        continue;
      }

      if (key === "moveset") {
        this.moveset = value?.map((m: any) => PokemonMove.loadMove(m));
        continue;
      }

      if (key === "tags") {
        // load battler tags
        this.tags = value.map((t: BattlerTag) => loadBattlerTag(t));
        continue;
      }
      this[key] = value;
    }
  }
}

// TODO: Merge this inside `summmonData` but exclude from save if/when a save data serializer is added
export class PokemonTempSummonData {
  /**
   * The number of turns this pokemon has spent without switching out.
   * Only currently used for positioning the battle cursor.
   */
  turnCount = 1;

  /**
   * The number of turns this pokemon has spent in the active position since the start of the wave
   * without switching out.
   * Reset on switch and new wave, but not stored in `SummonData` to avoid being written to the save file.

   * Used to evaluate "first turn only" conditions such as
   * {@linkcode MoveId.FAKE_OUT | Fake Out} and {@linkcode MoveId.FIRST_IMPRESSION | First Impression}).
   */
  waveTurnCount = 1;
}

/**
 * Persistent data for a {@linkcode Pokemon}.
 * Resets at the start of a new battle (but not on switch).
 */
export class PokemonBattleData {
  /** Counter tracking direct hits this Pokemon has received during this battle; used for {@linkcode MoveId.RAGE_FIST} */
  public hitCount = 0;
  /** Whether this Pokemon has eaten a berry this battle; used for {@linkcode MoveId.BELCH} */
  public hasEatenBerry = false;
  /** Array containing all berries eaten and not yet recovered during this current battle; used by {@linkcode AbilityId.HARVEST} */
  public berriesEaten: BerryType[] = [];

  constructor(source?: PokemonBattleData | Partial<PokemonBattleData>) {
    if (!isNullOrUndefined(source)) {
      this.hitCount = source.hitCount ?? 0;
      this.hasEatenBerry = source.hasEatenBerry ?? false;
      this.berriesEaten = source.berriesEaten ?? [];
    }
  }
}

/**
 * Temporary data for a {@linkcode Pokemon}.
 * Resets on new wave/battle start (but not on switch).
 */
export class PokemonWaveData {
  /** Whether the pokemon has endured due to a {@linkcode BattlerTagType.ENDURE_TOKEN} */
  public endured = false;
  /**
   * A set of all the abilities this {@linkcode Pokemon} has used in this wave.
   * Used to track once per battle conditions, as well as (hopefully) by the updated AI for move effectiveness.
   */
  public abilitiesApplied: Set<AbilityId> = new Set<AbilityId>();
  /** Whether the pokemon's ability has been revealed or not */
  public abilityRevealed = false;
}

/**
 * Temporary data for a {@linkcode Pokemon}.
 * Resets at the start of a new turn, as well as on switch.
 */
export class PokemonTurnData {
  public acted = false;
  /** How many times the current move should hit the target(s) */
  public hitCount = 0;
  /**
   * - `-1` = Calculate how many hits are left
   * - `0` = Move is finished
   */
  public hitsLeft = -1;
  public totalDamageDealt = 0;
  public singleHitDamageDealt = 0;
  public damageTaken = 0;
  public attacksReceived: AttackMoveResult[] = [];
  public order: number;
  public statStagesIncreased = false;
  public statStagesDecreased = false;
  public moveEffectiveness: TypeDamageMultiplier | null = null;
  public combiningPledge?: MoveId;
  public switchedInThisTurn = false;
  public failedRunAway = false;
  public joinedRound = false;
  /**
   * The amount of times this Pokemon has acted again and used a move in the current turn.
   * Used to make sure multi-hits occur properly when the user is
   * forced to act again in the same turn, and **must be incremented** by any effects that grant extra actions.
   */
  public extraTurns = 0;
  /**
   * All berries eaten by this pokemon in this turn.
   * Saved into {@linkcode PokemonSummonData | SummonData} by {@linkcode AbilityId.CUD_CHEW} on turn end.
   * @see {@linkcode PokemonSummonData.berriesEatenLast}
   */
  public berriesEaten: BerryType[] = [];
}

export type DamageResult =
  | HitResult.EFFECTIVE
  | HitResult.SUPER_EFFECTIVE
  | HitResult.NOT_VERY_EFFECTIVE
  | HitResult.ONE_HIT_KO
  | HitResult.CONFUSION
  | HitResult.INDIRECT_KO
  | HitResult.INDIRECT;

/** Interface containing the results of a damage calculation for a given move */
export interface DamageCalculationResult {
  /** `true` if the move was cancelled (thus suppressing "No Effect" messages) */
  cancelled: boolean;
  /** The effectiveness of the move */
  result: HitResult;
  /** The damage dealt by the move */
  damage: number;
}
