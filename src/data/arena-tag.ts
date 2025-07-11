import { globalScene } from "#app/global-scene";
import type { Arena } from "#app/field/arena";
import { PokemonType } from "#enums/pokemon-type";
import { BooleanHolder, NumberHolder, toDmgValue } from "#app/utils/common";
import { allMoves } from "./data-lists";
import { MoveTarget } from "#enums/MoveTarget";
import { MoveCategory } from "#enums/MoveCategory";
import { getPokemonNameWithAffix } from "#app/messages";
import type Pokemon from "#app/field/pokemon";
import { HitResult } from "#enums/hit-result";
import { StatusEffect } from "#enums/status-effect";
import type { BattlerIndex } from "#enums/battler-index";
import { applyAbAttrs, applyOnGainAbAttrs, applyOnLoseAbAttrs } from "./abilities/apply-ab-attrs";
import { Stat } from "#enums/stat";
import { CommonBattleAnim } from "#app/data/battle-anims";
import { CommonAnim } from "#enums/move-anims-common";
import i18next from "i18next";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveId } from "#enums/move-id";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { MoveUseMode } from "#enums/move-use-mode";

export abstract class ArenaTag {
  constructor(
    public tagType: ArenaTagType,
    public turnCount: number,
    public sourceMove?: MoveId,
    public sourceId?: number,
    public side: ArenaTagSide = ArenaTagSide.BOTH,
  ) {}

  apply(_arena: Arena, _simulated: boolean, ..._args: unknown[]): boolean {
    return true;
  }

  onAdd(_arena: Arena, _quiet = false): void {}

  onRemove(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:arenaOnRemove${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
          { moveName: this.getMoveName() },
        ),
      );
    }
  }

  onOverlap(_arena: Arena, _source: Pokemon | null): void {}

  lapse(_arena: Arena): boolean {
    return this.turnCount < 1 || !!--this.turnCount;
  }

  getMoveName(): string | null {
    return this.sourceMove ? allMoves[this.sourceMove].name : null;
  }

  /**
   * When given a arena tag or json representing one, load the data for it.
   * This is meant to be inherited from by any arena tag with custom attributes
   * @param {ArenaTag | any} source An arena tag
   */
  loadTag(source: ArenaTag | any): void {
    this.turnCount = source.turnCount;
    this.sourceMove = source.sourceMove;
    this.sourceId = source.sourceId;
    this.side = source.side;
  }

  /**
   * Helper function that retrieves the source Pokemon
   * @returns The source {@linkcode Pokemon} or `null` if none is found
   */
  public getSourcePokemon(): Pokemon | null {
    return this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
  }

  /**
   * Helper function that retrieves the Pokemon affected
   * @returns list of PlayerPokemon or EnemyPokemon on the field
   */
  public getAffectedPokemon(): Pokemon[] {
    switch (this.side) {
      case ArenaTagSide.PLAYER:
        return globalScene.getPlayerField() ?? [];
      case ArenaTagSide.ENEMY:
        return globalScene.getEnemyField() ?? [];
      case ArenaTagSide.BOTH:
      default:
        return globalScene.getField(true) ?? [];
    }
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Mist_(move) Mist}.
 * Prevents Pokémon on the opposing side from lowering the stats of the Pokémon in the Mist.
 */
export class MistTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.MIST, turnCount, MoveId.MIST, sourceId, side);
  }

  onAdd(arena: Arena, quiet = false): void {
    super.onAdd(arena);

    if (this.sourceId) {
      const source = globalScene.getPokemonById(this.sourceId);

      if (!quiet && source) {
        globalScene.phaseManager.queueMessage(
          i18next.t("arenaTag:mistOnAdd", {
            pokemonNameWithAffix: getPokemonNameWithAffix(source),
          }),
        );
      } else if (!quiet) {
        console.warn("Failed to get source for MistTag onAdd");
      }
    }
  }

  /**
   * Cancels the lowering of stats
   * @param _arena the {@linkcode Arena} containing this effect
   * @param simulated `true` if the effect should be applied quietly
   * @param attacker the {@linkcode Pokemon} using a move into this effect.
   * @param cancelled a {@linkcode BooleanHolder} whose value is set to `true`
   * to flag the stat reduction as cancelled
   * @returns `true` if a stat reduction was cancelled; `false` otherwise
   */
  override apply(_arena: Arena, simulated: boolean, attacker: Pokemon, cancelled: BooleanHolder): boolean {
    // `StatStageChangePhase` currently doesn't have a reference to the source of stat drops,
    // so this code currently has no effect on gameplay.
    if (attacker) {
      const bypassed = new BooleanHolder(false);
      // TODO: Allow this to be simulated
      applyAbAttrs("InfiltratorAbAttr", attacker, null, false, bypassed);
      if (bypassed.value) {
        return false;
      }
    }

    cancelled.value = true;

    if (!simulated) {
      globalScene.phaseManager.queueMessage(i18next.t("arenaTag:mistApply"));
    }

    return true;
  }
}

/**
 * Reduces the damage of specific move categories in the arena.
 * @extends ArenaTag
 */
export class WeakenMoveScreenTag extends ArenaTag {
  protected weakenedCategories: MoveCategory[];

  /**
   * Creates a new instance of the WeakenMoveScreenTag class.
   *
   * @param tagType - The type of the arena tag.
   * @param turnCount - The number of turns the tag is active.
   * @param sourceMove - The move that created the tag.
   * @param sourceId - The ID of the source of the tag.
   * @param side - The side (player or enemy) the tag affects.
   * @param weakenedCategories - The categories of moves that are weakened by this tag.
   */
  constructor(
    tagType: ArenaTagType,
    turnCount: number,
    sourceMove: MoveId,
    sourceId: number,
    side: ArenaTagSide,
    weakenedCategories: MoveCategory[],
  ) {
    super(tagType, turnCount, sourceMove, sourceId, side);

    this.weakenedCategories = weakenedCategories;
  }

  /**
   * Applies the weakening effect to the move.
   *
   * @param _arena the {@linkcode Arena} where the move is applied.
   * @param _simulated n/a
   * @param attacker the attacking {@linkcode Pokemon}
   * @param moveCategory the attacking move's {@linkcode MoveCategory}.
   * @param damageMultiplier A {@linkcode NumberHolder} containing the damage multiplier
   * @returns `true` if the attacking move was weakened; `false` otherwise.
   */
  override apply(
    _arena: Arena,
    _simulated: boolean,
    attacker: Pokemon,
    moveCategory: MoveCategory,
    damageMultiplier: NumberHolder,
  ): boolean {
    if (this.weakenedCategories.includes(moveCategory)) {
      const bypassed = new BooleanHolder(false);
      applyAbAttrs("InfiltratorAbAttr", attacker, null, false, bypassed);
      if (bypassed.value) {
        return false;
      }
      damageMultiplier.value = globalScene.currentBattle.double ? 2732 / 4096 : 0.5;
      return true;
    }
    return false;
  }
}

/**
 * Reduces the damage of physical moves.
 * Used by {@linkcode MoveId.REFLECT}
 */
class ReflectTag extends WeakenMoveScreenTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.REFLECT, turnCount, MoveId.REFLECT, sourceId, side, [MoveCategory.PHYSICAL]);
  }

  onAdd(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:reflectOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        ),
      );
    }
  }
}

/**
 * Reduces the damage of special moves.
 * Used by {@linkcode MoveId.LIGHT_SCREEN}
 */
class LightScreenTag extends WeakenMoveScreenTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.LIGHT_SCREEN, turnCount, MoveId.LIGHT_SCREEN, sourceId, side, [MoveCategory.SPECIAL]);
  }

  onAdd(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:lightScreenOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        ),
      );
    }
  }
}

/**
 * Reduces the damage of physical and special moves.
 * Used by {@linkcode MoveId.AURORA_VEIL}
 */
class AuroraVeilTag extends WeakenMoveScreenTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.AURORA_VEIL, turnCount, MoveId.AURORA_VEIL, sourceId, side, [
      MoveCategory.SPECIAL,
      MoveCategory.PHYSICAL,
    ]);
  }

  onAdd(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:auroraVeilOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        ),
      );
    }
  }
}

type ProtectConditionFunc = (arena: Arena, moveId: MoveId) => boolean;

/**
 * Class to implement conditional team protection
 * applies protection based on the attributes of incoming moves
 */
export class ConditionalProtectTag extends ArenaTag {
  /** The condition function to determine which moves are negated */
  protected protectConditionFunc: ProtectConditionFunc;
  /** Does this apply to all moves, including those that ignore other forms of protection? */
  protected ignoresBypass: boolean;

  constructor(
    tagType: ArenaTagType,
    sourceMove: MoveId,
    sourceId: number,
    side: ArenaTagSide,
    condition: ProtectConditionFunc,
    ignoresBypass = false,
  ) {
    super(tagType, 1, sourceMove, sourceId, side);

    this.protectConditionFunc = condition;
    this.ignoresBypass = ignoresBypass;
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:conditionalProtectOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        { moveName: super.getMoveName() },
      ),
    );
  }

  // Removes default message for effect removal
  onRemove(_arena: Arena): void {}

  /**
   * Checks incoming moves against the condition function
   * and protects the target if conditions are met
   * @param arena the {@linkcode Arena} containing this tag
   * @param simulated `true` if the tag is applied quietly; `false` otherwise.
   * @param isProtected a {@linkcode BooleanHolder} used to flag if the move is protected against
   * @param _attacker the attacking {@linkcode Pokemon}
   * @param defender the defending {@linkcode Pokemon}
   * @param moveId the {@linkcode MoveId | identifier} for the move being used
   * @param ignoresProtectBypass a {@linkcode BooleanHolder} used to flag if a protection effect supercedes effects that ignore protection
   * @returns `true` if this tag protected against the attack; `false` otherwise
   */
  override apply(
    arena: Arena,
    simulated: boolean,
    isProtected: BooleanHolder,
    _attacker: Pokemon,
    defender: Pokemon,
    moveId: MoveId,
    ignoresProtectBypass: BooleanHolder,
  ): boolean {
    if ((this.side === ArenaTagSide.PLAYER) === defender.isPlayer() && this.protectConditionFunc(arena, moveId)) {
      if (!isProtected.value) {
        isProtected.value = true;
        if (!simulated) {
          new CommonBattleAnim(CommonAnim.PROTECT, defender).play();
          globalScene.phaseManager.queueMessage(
            i18next.t("arenaTag:conditionalProtectApply", {
              moveName: super.getMoveName(),
              pokemonNameWithAffix: getPokemonNameWithAffix(defender),
            }),
          );
        }
      }

      ignoresProtectBypass.value = ignoresProtectBypass.value || this.ignoresBypass;
      return true;
    }
    return false;
  }
}

/**
 * Condition function for {@link https://bulbapedia.bulbagarden.net/wiki/Quick_Guard_(move) Quick Guard's}
 * protection effect.
 * @param _arena {@linkcode Arena} The arena containing the protection effect
 * @param moveId {@linkcode MoveId} The move to check against this condition
 * @returns `true` if the incoming move's priority is greater than 0.
 *   This includes moves with modified priorities from abilities (e.g. Prankster)
 */
const QuickGuardConditionFunc: ProtectConditionFunc = (_arena, moveId) => {
  const move = allMoves[moveId];
  const effectPhase = globalScene.phaseManager.getCurrentPhase();

  if (effectPhase?.is("MoveEffectPhase")) {
    const attacker = effectPhase.getUserPokemon();
    if (attacker) {
      return move.getPriority(attacker) > 0;
    }
  }
  return move.priority > 0;
};

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Quick_Guard_(move) Quick Guard}
 * Condition: The incoming move has increased priority.
 */
class QuickGuardTag extends ConditionalProtectTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.QUICK_GUARD, MoveId.QUICK_GUARD, sourceId, side, QuickGuardConditionFunc);
  }
}

/**
 * Condition function for {@link https://bulbapedia.bulbagarden.net/wiki/Wide_Guard_(move) Wide Guard's}
 * protection effect.
 * @param _arena {@linkcode Arena} The arena containing the protection effect
 * @param moveId {@linkcode MoveId} The move to check against this condition
 * @returns `true` if the incoming move is multi-targeted (even if it's only used against one Pokemon).
 */
const WideGuardConditionFunc: ProtectConditionFunc = (_arena, moveId): boolean => {
  const move = allMoves[moveId];

  switch (move.moveTarget) {
    case MoveTarget.ALL_ENEMIES:
    case MoveTarget.ALL_NEAR_ENEMIES:
    case MoveTarget.ALL_OTHERS:
    case MoveTarget.ALL_NEAR_OTHERS:
      return true;
  }
  return false;
};

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Wide_Guard_(move) Wide Guard}
 * Condition: The incoming move can target multiple Pokemon. The move's source
 * can be an ally or enemy.
 */
class WideGuardTag extends ConditionalProtectTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.WIDE_GUARD, MoveId.WIDE_GUARD, sourceId, side, WideGuardConditionFunc);
  }
}

/**
 * Condition function for {@link https://bulbapedia.bulbagarden.net/wiki/Mat_Block_(move) Mat Block's}
 * protection effect.
 * @param _arena {@linkcode Arena} The arena containing the protection effect.
 * @param moveId {@linkcode MoveId} The move to check against this condition.
 * @returns `true` if the incoming move is not a Status move.
 */
const MatBlockConditionFunc: ProtectConditionFunc = (_arena, moveId): boolean => {
  const move = allMoves[moveId];
  return move.category !== MoveCategory.STATUS;
};

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Mat_Block_(move) Mat Block}
 * Condition: The incoming move is a Physical or Special attack move.
 */
class MatBlockTag extends ConditionalProtectTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.MAT_BLOCK, MoveId.MAT_BLOCK, sourceId, side, MatBlockConditionFunc);
  }

  onAdd(_arena: Arena) {
    if (this.sourceId) {
      const source = globalScene.getPokemonById(this.sourceId);
      if (source) {
        globalScene.phaseManager.queueMessage(
          i18next.t("arenaTag:matBlockOnAdd", {
            pokemonNameWithAffix: getPokemonNameWithAffix(source),
          }),
        );
      } else {
        console.warn("Failed to get source for MatBlockTag onAdd");
      }
    }
  }
}

/**
 * Condition function for {@link https://bulbapedia.bulbagarden.net/wiki/Crafty_Shield_(move) Crafty Shield's}
 * protection effect.
 * @param _arena {@linkcode Arena} The arena containing the protection effect
 * @param moveId {@linkcode MoveId} The move to check against this condition
 * @returns `true` if the incoming move is a Status move, is not a hazard, and does not target all
 * Pokemon or sides of the field.
 */
const CraftyShieldConditionFunc: ProtectConditionFunc = (_arena, moveId) => {
  const move = allMoves[moveId];
  return (
    move.category === MoveCategory.STATUS &&
    move.moveTarget !== MoveTarget.ENEMY_SIDE &&
    move.moveTarget !== MoveTarget.BOTH_SIDES &&
    move.moveTarget !== MoveTarget.ALL
  );
};

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Crafty_Shield_(move) Crafty Shield}
 * Condition: The incoming move is a Status move, is not a hazard, and does
 * not target all Pokemon or sides of the field.
 */
class CraftyShieldTag extends ConditionalProtectTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.CRAFTY_SHIELD, MoveId.CRAFTY_SHIELD, sourceId, side, CraftyShieldConditionFunc, true);
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Lucky_Chant_(move) Lucky Chant}.
 * Prevents critical hits against the tag's side.
 */
export class NoCritTag extends ArenaTag {
  /**
   * Constructor method for the NoCritTag class
   * @param turnCount `number` the number of turns this effect lasts
   * @param sourceMove {@linkcode MoveId} the move that created this effect
   * @param sourceId `number` the ID of the {@linkcode Pokemon} that created this effect
   * @param side {@linkcode ArenaTagSide} the side to which this effect belongs
   */
  constructor(turnCount: number, sourceMove: MoveId, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.NO_CRIT, turnCount, sourceMove, sourceId, side);
  }

  /** Queues a message upon adding this effect to the field */
  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(
      i18next.t(`arenaTag:noCritOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : "Enemy"}`, {
        moveName: this.getMoveName(),
      }),
    );
  }

  /** Queues a message upon removing this effect from the field */
  onRemove(_arena: Arena): void {
    const source = globalScene.getPokemonById(this.sourceId!); // TODO: is this bang correct?
    globalScene.phaseManager.queueMessage(
      i18next.t("arenaTag:noCritOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(source ?? undefined),
        moveName: this.getMoveName(),
      }),
    );
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Wish_(move) Wish}.
 * Heals the Pokémon in the user's position the turn after Wish is used.
 */
class WishTag extends ArenaTag {
  private battlerIndex: BattlerIndex;
  private triggerMessage: string;
  private healHp: number;

  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.WISH, turnCount, MoveId.WISH, sourceId, side);
  }

  onAdd(_arena: Arena): void {
    if (this.sourceId) {
      const user = globalScene.getPokemonById(this.sourceId);
      if (user) {
        this.battlerIndex = user.getBattlerIndex();
        this.triggerMessage = i18next.t("arenaTag:wishTagOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(user),
        });
        this.healHp = toDmgValue(user.getMaxHp() / 2);
      } else {
        console.warn("Failed to get source for WishTag onAdd");
      }
    }
  }

  onRemove(_arena: Arena): void {
    const target = globalScene.getField()[this.battlerIndex];
    if (target?.isActive(true)) {
      globalScene.phaseManager.queueMessage(this.triggerMessage);
      globalScene.phaseManager.unshiftNew("PokemonHealPhase", target.getBattlerIndex(), this.healHp, null, true, false);
    }
  }
}

/**
 * Abstract class to implement weakened moves of a specific type.
 */
export class WeakenMoveTypeTag extends ArenaTag {
  private weakenedType: PokemonType;

  /**
   * Creates a new instance of the WeakenMoveTypeTag class.
   *
   * @param tagType - The type of the arena tag.
   * @param turnCount - The number of turns the tag is active.
   * @param type - The type being weakened from this tag.
   * @param sourceMove - The move that created the tag.
   * @param sourceId - The ID of the source of the tag.
   */
  constructor(tagType: ArenaTagType, turnCount: number, type: PokemonType, sourceMove: MoveId, sourceId: number) {
    super(tagType, turnCount, sourceMove, sourceId);

    this.weakenedType = type;
  }

  /**
   * Reduces an attack's power by 0.33x if it matches this tag's weakened type.
   * @param _arena n/a
   * @param _simulated n/a
   * @param type the attack's {@linkcode PokemonType}
   * @param power a {@linkcode NumberHolder} containing the attack's power
   * @returns `true` if the attack's power was reduced; `false` otherwise.
   */
  override apply(_arena: Arena, _simulated: boolean, type: PokemonType, power: NumberHolder): boolean {
    if (type === this.weakenedType) {
      power.value *= 0.33;
      return true;
    }
    return false;
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Mud_Sport_(move) Mud Sport}.
 * Weakens Electric type moves for a set amount of turns, usually 5.
 */
class MudSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: number, sourceId: number) {
    super(ArenaTagType.MUD_SPORT, turnCount, PokemonType.ELECTRIC, MoveId.MUD_SPORT, sourceId);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:mudSportOnAdd"));
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:mudSportOnRemove"));
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Water_Sport_(move) Water Sport}.
 * Weakens Fire type moves for a set amount of turns, usually 5.
 */
class WaterSportTag extends WeakenMoveTypeTag {
  constructor(turnCount: number, sourceId: number) {
    super(ArenaTagType.WATER_SPORT, turnCount, PokemonType.FIRE, MoveId.WATER_SPORT, sourceId);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:waterSportOnAdd"));
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:waterSportOnRemove"));
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Ion_Deluge_(move) | Ion Deluge}
 * and the secondary effect of {@link https://bulbapedia.bulbagarden.net/wiki/Plasma_Fists_(move) | Plasma Fists}.
 * Converts Normal-type moves to Electric type for the rest of the turn.
 */
export class IonDelugeTag extends ArenaTag {
  constructor(sourceMove?: MoveId) {
    super(ArenaTagType.ION_DELUGE, 1, sourceMove);
  }

  /** Queues an on-add message */
  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:plasmaFistsOnAdd"));
  }

  onRemove(_arena: Arena): void {} // Removes default on-remove message

  /**
   * Converts Normal-type moves to Electric type
   * @param _arena n/a
   * @param _simulated n/a
   * @param moveType a {@linkcode NumberHolder} containing a move's {@linkcode PokemonType}
   * @returns `true` if the given move type changed; `false` otherwise.
   */
  override apply(_arena: Arena, _simulated: boolean, moveType: NumberHolder): boolean {
    if (moveType.value === PokemonType.NORMAL) {
      moveType.value = PokemonType.ELECTRIC;
      return true;
    }
    return false;
  }
}

/**
 * Abstract class to implement arena traps.
 */
export class ArenaTrapTag extends ArenaTag {
  public layers: number;
  public maxLayers: number;

  /**
   * Creates a new instance of the ArenaTrapTag class.
   *
   * @param tagType - The type of the arena tag.
   * @param sourceMove - The move that created the tag.
   * @param sourceId - The ID of the source of the tag.
   * @param side - The side (player or enemy) the tag affects.
   * @param maxLayers - The maximum amount of layers this tag can have.
   */
  constructor(tagType: ArenaTagType, sourceMove: MoveId, sourceId: number, side: ArenaTagSide, maxLayers: number) {
    super(tagType, 0, sourceMove, sourceId, side);

    this.layers = 1;
    this.maxLayers = maxLayers;
  }

  onOverlap(arena: Arena, _source: Pokemon | null): void {
    if (this.layers < this.maxLayers) {
      this.layers++;

      this.onAdd(arena);
    }
  }

  /**
   * Activates the hazard effect onto a Pokemon when it enters the field
   * @param _arena the {@linkcode Arena} containing this tag
   * @param simulated if `true`, only checks if the hazard would activate.
   * @param pokemon the {@linkcode Pokemon} triggering this hazard
   * @returns `true` if this hazard affects the given Pokemon; `false` otherwise.
   */
  override apply(_arena: Arena, simulated: boolean, pokemon: Pokemon): boolean {
    if ((this.side === ArenaTagSide.PLAYER) !== pokemon.isPlayer()) {
      return false;
    }

    return this.activateTrap(pokemon, simulated);
  }

  activateTrap(_pokemon: Pokemon, _simulated: boolean): boolean {
    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    return pokemon.isGrounded()
      ? 1
      : Phaser.Math.Linear(0, 1 / Math.pow(2, this.layers), Math.min(pokemon.getHpRatio(), 0.5) * 2);
  }

  loadTag(source: any): void {
    super.loadTag(source);
    this.layers = source.layers;
    this.maxLayers = source.maxLayers;
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Spikes_(move) Spikes}.
 * Applies up to 3 layers of Spikes, dealing 1/8th, 1/6th, or 1/4th of the the Pokémon's HP
 * in damage for 1, 2, or 3 layers of Spikes respectively if they are summoned into this trap.
 */
class SpikesTag extends ArenaTrapTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.SPIKES, MoveId.SPIKES, sourceId, side, 3);
  }

  onAdd(arena: Arena, quiet = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:spikesOnAdd", {
          moveName: this.getMoveName(),
          opponentDesc: source.getOpponentDescriptor(),
        }),
      );
    }
  }

  override activateTrap(pokemon: Pokemon, simulated: boolean): boolean {
    if (!pokemon.isGrounded()) {
      return false;
    }

    const cancelled = new BooleanHolder(false);
    applyAbAttrs("BlockNonDirectDamageAbAttr", pokemon, cancelled);
    if (simulated || cancelled.value) {
      return !cancelled.value;
    }

    const damageHpRatio = 1 / (10 - 2 * this.layers);
    const damage = toDmgValue(pokemon.getMaxHp() * damageHpRatio);

    globalScene.phaseManager.queueMessage(
      i18next.t("arenaTag:spikesActivateTrap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    pokemon.damageAndUpdate(damage, { result: HitResult.INDIRECT });
    pokemon.turnData.damageTaken += damage;
    return true;
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Toxic_Spikes_(move) Toxic Spikes}.
 * Applies up to 2 layers of Toxic Spikes, poisoning or badly poisoning any Pokémon who is
 * summoned into this trap if 1 or 2 layers of Toxic Spikes respectively are up. Poison-type
 * Pokémon summoned into this trap remove it entirely.
 */
class ToxicSpikesTag extends ArenaTrapTag {
  private neutralized: boolean;

  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.TOXIC_SPIKES, MoveId.TOXIC_SPIKES, sourceId, side, 2);
    this.neutralized = false;
  }

  onAdd(arena: Arena, quiet = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:toxicSpikesOnAdd", {
          moveName: this.getMoveName(),
          opponentDesc: source.getOpponentDescriptor(),
        }),
      );
    }
  }

  onRemove(arena: Arena): void {
    if (!this.neutralized) {
      super.onRemove(arena);
    }
  }

  override activateTrap(pokemon: Pokemon, simulated: boolean): boolean {
    if (pokemon.isGrounded()) {
      if (simulated) {
        return true;
      }
      if (pokemon.isOfType(PokemonType.POISON)) {
        this.neutralized = true;
        if (globalScene.arena.removeTag(this.tagType)) {
          globalScene.phaseManager.queueMessage(
            i18next.t("arenaTag:toxicSpikesActivateTrapPoison", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
          return true;
        }
      } else if (!pokemon.status) {
        const toxic = this.layers > 1;
        if (
          pokemon.trySetStatus(!toxic ? StatusEffect.POISON : StatusEffect.TOXIC, true, null, 0, this.getMoveName())
        ) {
          return true;
        }
      }
    }

    return false;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    if (pokemon.isGrounded() || !pokemon.canSetStatus(StatusEffect.POISON, true)) {
      return 1;
    }
    if (pokemon.isOfType(PokemonType.POISON)) {
      return 1.25;
    }
    return super.getMatchupScoreMultiplier(pokemon);
  }
}

/**
 * Arena Tag class for delayed attacks, such as {@linkcode MoveId.FUTURE_SIGHT} or {@linkcode MoveId.DOOM_DESIRE}.
 * Delays the attack's effect by a set amount of turns, usually 3 (including the turn the move is used),
 * and deals damage after the turn count is reached.
 */
export class DelayedAttackTag extends ArenaTag {
  public targetIndex: BattlerIndex;

  constructor(
    tagType: ArenaTagType,
    sourceMove: MoveId | undefined,
    sourceId: number,
    targetIndex: BattlerIndex,
    side: ArenaTagSide = ArenaTagSide.BOTH,
  ) {
    super(tagType, 3, sourceMove, sourceId, side);

    this.targetIndex = targetIndex;
    this.side = side;
  }

  lapse(arena: Arena): boolean {
    const ret = super.lapse(arena);

    if (!ret) {
      // TODO: This should not add to move history (for Spite)
      globalScene.phaseManager.unshiftNew(
        "MoveEffectPhase",
        this.sourceId!,
        [this.targetIndex],
        allMoves[this.sourceMove!],
        MoveUseMode.FOLLOW_UP,
      ); // TODO: are those bangs correct?
    }

    return ret;
  }

  onRemove(_arena: Arena): void {}
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Stealth_Rock_(move) Stealth Rock}.
 * Applies up to 1 layer of Stealth Rocks, dealing percentage-based damage to any Pokémon
 * who is summoned into the trap, based on the Rock type's type effectiveness.
 */
class StealthRockTag extends ArenaTrapTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.STEALTH_ROCK, MoveId.STEALTH_ROCK, sourceId, side, 1);
  }

  onAdd(arena: Arena, quiet = false): void {
    super.onAdd(arena);

    const source = this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:stealthRockOnAdd", {
          opponentDesc: source.getOpponentDescriptor(),
        }),
      );
    }
  }

  getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.ROCK, undefined, true);

    let damageHpRatio = 0;

    switch (effectiveness) {
      case 0:
        damageHpRatio = 0;
        break;
      case 0.25:
        damageHpRatio = 0.03125;
        break;
      case 0.5:
        damageHpRatio = 0.0625;
        break;
      case 1:
        damageHpRatio = 0.125;
        break;
      case 2:
        damageHpRatio = 0.25;
        break;
      case 4:
        damageHpRatio = 0.5;
        break;
    }

    return damageHpRatio;
  }

  override activateTrap(pokemon: Pokemon, simulated: boolean): boolean {
    const cancelled = new BooleanHolder(false);
    applyAbAttrs("BlockNonDirectDamageAbAttr", pokemon, cancelled);
    if (cancelled.value) {
      return false;
    }

    const damageHpRatio = this.getDamageHpRatio(pokemon);
    if (!damageHpRatio) {
      return false;
    }

    if (simulated) {
      return true;
    }

    const damage = toDmgValue(pokemon.getMaxHp() * damageHpRatio);
    globalScene.phaseManager.queueMessage(
      i18next.t("arenaTag:stealthRockActivateTrap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    pokemon.damageAndUpdate(damage, { result: HitResult.INDIRECT });
    pokemon.turnData.damageTaken += damage;
    return true;
  }

  getMatchupScoreMultiplier(pokemon: Pokemon): number {
    const damageHpRatio = this.getDamageHpRatio(pokemon);
    return Phaser.Math.Linear(super.getMatchupScoreMultiplier(pokemon), 1, 1 - Math.pow(damageHpRatio, damageHpRatio));
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Sticky_Web_(move) Sticky Web}.
 * Applies up to 1 layer of Sticky Web, which lowers the Speed by one stage
 * to any Pokémon who is summoned into this trap.
 */
class StickyWebTag extends ArenaTrapTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.STICKY_WEB, MoveId.STICKY_WEB, sourceId, side, 1);
  }

  onAdd(arena: Arena, quiet = false): void {
    super.onAdd(arena);
    const source = this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
    if (!quiet && source) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:stickyWebOnAdd", {
          moveName: this.getMoveName(),
          opponentDesc: source.getOpponentDescriptor(),
        }),
      );
    }
  }

  override activateTrap(pokemon: Pokemon, simulated: boolean): boolean {
    if (pokemon.isGrounded()) {
      const cancelled = new BooleanHolder(false);
      applyAbAttrs("ProtectStatAbAttr", pokemon, cancelled);

      if (simulated) {
        return !cancelled.value;
      }

      if (!cancelled.value) {
        globalScene.phaseManager.queueMessage(
          i18next.t("arenaTag:stickyWebActivateTrap", {
            pokemonName: pokemon.getNameToRender(),
          }),
        );
        const stages = new NumberHolder(-1);
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          pokemon.getBattlerIndex(),
          false,
          [Stat.SPD],
          stages.value,
          true,
          false,
          true,
          null,
          false,
          true,
        );
        return true;
      }
    }

    return false;
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Trick_Room_(move) Trick Room}.
 * Reverses the Speed stats for all Pokémon on the field as long as this arena tag is up,
 * also reversing the turn order for all Pokémon on the field as well.
 */
export class TrickRoomTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number) {
    super(ArenaTagType.TRICK_ROOM, turnCount, MoveId.TRICK_ROOM, sourceId);
  }

  /**
   * Reverses Speed-based turn order for all Pokemon on the field
   * @param _arena n/a
   * @param _simulated n/a
   * @param speedReversed a {@linkcode BooleanHolder} used to flag if Speed-based
   * turn order should be reversed.
   * @returns `true` if turn order is successfully reversed; `false` otherwise
   */
  override apply(_arena: Arena, _simulated: boolean, speedReversed: BooleanHolder): boolean {
    speedReversed.value = !speedReversed.value;
    return true;
  }

  onAdd(_arena: Arena): void {
    const source = this.sourceId ? globalScene.getPokemonById(this.sourceId) : null;
    if (source) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:trickRoomOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(source),
        }),
      );
    }
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:trickRoomOnRemove"));
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Gravity_(move) Gravity}.
 * Grounds all Pokémon on the field, including Flying-types and those with
 * {@linkcode AbilityId.LEVITATE} for the duration of the arena tag, usually 5 turns.
 */
export class GravityTag extends ArenaTag {
  constructor(turnCount: number) {
    super(ArenaTagType.GRAVITY, turnCount, MoveId.GRAVITY);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:gravityOnAdd"));
    globalScene.getField(true).forEach(pokemon => {
      if (pokemon !== null) {
        pokemon.removeTag(BattlerTagType.FLOATING);
        pokemon.removeTag(BattlerTagType.TELEKINESIS);
        if (pokemon.getTag(BattlerTagType.FLYING)) {
          pokemon.addTag(BattlerTagType.INTERRUPTED);
        }
      }
    });
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:gravityOnRemove"));
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Tailwind_(move) Tailwind}.
 * Doubles the Speed of the Pokémon who created this arena tag, as well as all allied Pokémon.
 * Applies this arena tag for 4 turns (including the turn the move was used).
 */
class TailwindTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.TAILWIND, turnCount, MoveId.TAILWIND, sourceId, side);
  }

  onAdd(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:tailwindOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        ),
      );
    }

    const source = globalScene.getPokemonById(this.sourceId!); //TODO: this bang is questionable!
    const party = (source?.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField()) ?? [];
    const phaseManager = globalScene.phaseManager;

    for (const pokemon of party) {
      // Apply the CHARGED tag to party members with the WIND_POWER ability
      if (pokemon.hasAbility(AbilityId.WIND_POWER) && !pokemon.getTag(BattlerTagType.CHARGED)) {
        pokemon.addTag(BattlerTagType.CHARGED);
        phaseManager.queueMessage(
          i18next.t("abilityTriggers:windPowerCharged", {
            pokemonName: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }

      // Raise attack by one stage if party member has WIND_RIDER ability
      // TODO: Ability displays should be handled by the ability
      if (pokemon.hasAbility(AbilityId.WIND_RIDER)) {
        phaseManager.queueAbilityDisplay(pokemon, false, true);
        phaseManager.unshiftNew("StatStageChangePhase", pokemon.getBattlerIndex(), true, [Stat.ATK], 1, true);
        phaseManager.queueAbilityDisplay(pokemon, false, false);
      }
    }
  }

  onRemove(_arena: Arena, quiet = false): void {
    if (!quiet) {
      globalScene.phaseManager.queueMessage(
        i18next.t(
          `arenaTag:tailwindOnRemove${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
        ),
      );
    }
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Happy_Hour_(move) Happy Hour}.
 * Doubles the prize money from trainers and money moves like {@linkcode MoveId.PAY_DAY} and {@linkcode MoveId.MAKE_IT_RAIN}.
 */
class HappyHourTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.HAPPY_HOUR, turnCount, MoveId.HAPPY_HOUR, sourceId, side);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:happyHourOnAdd"));
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:happyHourOnRemove"));
  }
}

class SafeguardTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.SAFEGUARD, turnCount, MoveId.SAFEGUARD, sourceId, side);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:safeguardOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
      ),
    );
  }

  onRemove(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:safeguardOnRemove${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
      ),
    );
  }
}

class NoneTag extends ArenaTag {
  constructor() {
    super(ArenaTagType.NONE, 0);
  }
}
/**
 * This arena tag facilitates the application of the move Imprison
 * Imprison remains in effect as long as the source Pokemon is active and present on the field.
 * Imprison will apply to any opposing Pokemon that switch onto the field as well.
 */
class ImprisonTag extends ArenaTrapTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.IMPRISON, MoveId.IMPRISON, sourceId, side, 1);
  }

  /**
   * This function applies the effects of Imprison to the opposing Pokemon already present on the field.
   * @param arena
   */
  override onAdd() {
    const source = this.getSourcePokemon();
    if (source) {
      const party = this.getAffectedPokemon();
      party?.forEach((p: Pokemon) => {
        if (p.isAllowedInBattle()) {
          p.addTag(BattlerTagType.IMPRISON, 1, MoveId.IMPRISON, this.sourceId);
        }
      });
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:imprisonOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(source),
        }),
      );
    }
  }

  /**
   * Checks if the source Pokemon is still active on the field
   * @param _arena
   * @returns `true` if the source of the tag is still active on the field | `false` if not
   */
  override lapse(): boolean {
    const source = this.getSourcePokemon();
    return source ? source.isActive(true) : false;
  }

  /**
   * This applies the effects of Imprison to any opposing Pokemon that switch into the field while the source Pokemon is still active
   * @param {Pokemon} pokemon the Pokemon Imprison is applied to
   * @returns `true`
   */
  override activateTrap(pokemon: Pokemon): boolean {
    const source = this.getSourcePokemon();
    if (source?.isActive(true) && pokemon.isAllowedInBattle()) {
      pokemon.addTag(BattlerTagType.IMPRISON, 1, MoveId.IMPRISON, this.sourceId);
    }
    return true;
  }

  /**
   * When the arena tag is removed, it also attempts to remove any related Battler Tags if they haven't already been removed from the affected Pokemon
   * @param arena
   */
  override onRemove(): void {
    const party = this.getAffectedPokemon();
    party?.forEach((p: Pokemon) => {
      p.removeTag(BattlerTagType.IMPRISON);
    });
  }
}

/**
 * Arena Tag implementing the "sea of fire" effect from the combination
 * of {@link https://bulbapedia.bulbagarden.net/wiki/Fire_Pledge_(move) | Fire Pledge}
 * and {@link https://bulbapedia.bulbagarden.net/wiki/Grass_Pledge_(move) | Grass Pledge}.
 * Damages all non-Fire-type Pokemon on the given side of the field at the end
 * of each turn for 4 turns.
 */
class FireGrassPledgeTag extends ArenaTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.FIRE_GRASS_PLEDGE, 4, MoveId.FIRE_PLEDGE, sourceId, side);
  }

  override onAdd(_arena: Arena): void {
    // "A sea of fire enveloped your/the opposing team!"
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:fireGrassPledgeOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
      ),
    );
  }

  override lapse(arena: Arena): boolean {
    const field: Pokemon[] =
      this.side === ArenaTagSide.PLAYER ? globalScene.getPlayerField() : globalScene.getEnemyField();

    field
      .filter(pokemon => !pokemon.isOfType(PokemonType.FIRE) && !pokemon.switchOutStatus)
      .forEach(pokemon => {
        // "{pokemonNameWithAffix} was hurt by the sea of fire!"
        globalScene.phaseManager.queueMessage(
          i18next.t("arenaTag:fireGrassPledgeLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          }),
        );
        // TODO: Replace this with a proper animation
        globalScene.phaseManager.unshiftNew(
          "CommonAnimPhase",
          pokemon.getBattlerIndex(),
          pokemon.getBattlerIndex(),
          CommonAnim.MAGMA_STORM,
        );
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });
      });

    return super.lapse(arena);
  }
}

/**
 * Arena Tag implementing the "rainbow" effect from the combination
 * of {@link https://bulbapedia.bulbagarden.net/wiki/Water_Pledge_(move) | Water Pledge}
 * and {@link https://bulbapedia.bulbagarden.net/wiki/Fire_Pledge_(move) | Fire Pledge}.
 * Doubles the secondary effect chance of moves from Pokemon on the
 * given side of the field for 4 turns.
 */
class WaterFirePledgeTag extends ArenaTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.WATER_FIRE_PLEDGE, 4, MoveId.WATER_PLEDGE, sourceId, side);
  }

  override onAdd(_arena: Arena): void {
    // "A rainbow appeared in the sky on your/the opposing team's side!"
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:waterFirePledgeOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
      ),
    );
  }

  /**
   * Doubles the chance for the given move's secondary effect(s) to trigger
   * @param _arena the {@linkcode Arena} containing this tag
   * @param _simulated n/a
   * @param moveChance a {@linkcode NumberHolder} containing
   * the move's current effect chance
   * @returns `true` if the move's effect chance was doubled (currently always `true`)
   */
  override apply(_arena: Arena, _simulated: boolean, moveChance: NumberHolder): boolean {
    moveChance.value *= 2;
    return true;
  }
}

/**
 * Arena Tag implementing the "swamp" effect from the combination
 * of {@link https://bulbapedia.bulbagarden.net/wiki/Grass_Pledge_(move) | Grass Pledge}
 * and {@link https://bulbapedia.bulbagarden.net/wiki/Water_Pledge_(move) | Water Pledge}.
 * Quarters the Speed of Pokemon on the given side of the field for 4 turns.
 */
class GrassWaterPledgeTag extends ArenaTag {
  constructor(sourceId: number, side: ArenaTagSide) {
    super(ArenaTagType.GRASS_WATER_PLEDGE, 4, MoveId.GRASS_PLEDGE, sourceId, side);
  }

  override onAdd(_arena: Arena): void {
    // "A swamp enveloped your/the opposing team!"
    globalScene.phaseManager.queueMessage(
      i18next.t(
        `arenaTag:grassWaterPledgeOnAdd${this.side === ArenaTagSide.PLAYER ? "Player" : this.side === ArenaTagSide.ENEMY ? "Enemy" : ""}`,
      ),
    );
  }
}

/**
 * Arena Tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Fairy_Lock_(move) Fairy Lock}.
 * Fairy Lock prevents all Pokémon (except Ghost types) on the field from switching out or
 * fleeing during their next turn.
 * If a Pokémon that's on the field when Fairy Lock is used goes on to faint later in the same turn,
 * the Pokémon that replaces it will still be unable to switch out in the following turn.
 */
export class FairyLockTag extends ArenaTag {
  constructor(turnCount: number, sourceId: number) {
    super(ArenaTagType.FAIRY_LOCK, turnCount, MoveId.FAIRY_LOCK, sourceId);
  }

  onAdd(_arena: Arena): void {
    globalScene.phaseManager.queueMessage(i18next.t("arenaTag:fairyLockOnAdd"));
  }
}

/**
 * Arena tag class for {@link https://bulbapedia.bulbagarden.net/wiki/Neutralizing_Gas_(Ability) Neutralizing Gas}
 *
 * Keeps track of the number of pokemon on the field with Neutralizing Gas - If it drops to zero, the effect is ended and abilities are reactivated
 *
 * Additionally ends onLose abilities when it is activated
 */
export class SuppressAbilitiesTag extends ArenaTag {
  private sourceCount: number;
  private beingRemoved: boolean;

  constructor(sourceId: number) {
    super(ArenaTagType.NEUTRALIZING_GAS, 0, undefined, sourceId);
    this.sourceCount = 1;
    this.beingRemoved = false;
  }

  public override onAdd(_arena: Arena): void {
    const pokemon = this.getSourcePokemon();
    if (pokemon) {
      this.playActivationMessage(pokemon);

      for (const fieldPokemon of globalScene.getField(true)) {
        if (fieldPokemon && fieldPokemon.id !== pokemon.id) {
          [true, false].forEach(passive => applyOnLoseAbAttrs(fieldPokemon, passive));
        }
      }
    }
  }

  public override onOverlap(_arena: Arena, source: Pokemon | null): void {
    this.sourceCount++;
    this.playActivationMessage(source);
  }

  public onSourceLeave(arena: Arena): void {
    this.sourceCount--;
    if (this.sourceCount <= 0) {
      arena.removeTag(ArenaTagType.NEUTRALIZING_GAS);
    } else if (this.sourceCount === 1) {
      // With 1 source left, that pokemon's other abilities should reactivate
      // This may be confusing for players but would be the most accurate gameplay-wise
      // Could have a custom message that plays when a specific pokemon's NG ends? This entire thing exists due to passives after all
      const setter = globalScene
        .getField()
        .filter(p => p?.hasAbilityWithAttr("PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr", false))[0];
      applyOnGainAbAttrs(setter, setter.getAbility().hasAttr("PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr"));
    }
  }

  public override onRemove(_arena: Arena, quiet = false) {
    this.beingRemoved = true;
    if (!quiet) {
      globalScene.phaseManager.queueMessage(i18next.t("arenaTag:neutralizingGasOnRemove"));
    }

    for (const pokemon of globalScene.getField(true)) {
      // There is only one pokemon with this attr on the field on removal, so its abilities are already active
      if (pokemon && !pokemon.hasAbilityWithAttr("PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr", false)) {
        [true, false].forEach(passive => applyOnGainAbAttrs(pokemon, passive));
      }
    }
  }

  public shouldApplyToSelf(): boolean {
    return this.sourceCount > 1;
  }

  public isBeingRemoved() {
    return this.beingRemoved;
  }

  private playActivationMessage(pokemon: Pokemon | null) {
    if (pokemon) {
      globalScene.phaseManager.queueMessage(
        i18next.t("arenaTag:neutralizingGasOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
    }
  }
}

// TODO: swap `sourceMove` and `sourceId` and make `sourceMove` an optional parameter
export function getArenaTag(
  tagType: ArenaTagType,
  turnCount: number,
  sourceMove: MoveId | undefined,
  sourceId: number,
  targetIndex?: BattlerIndex,
  side: ArenaTagSide = ArenaTagSide.BOTH,
): ArenaTag | null {
  switch (tagType) {
    case ArenaTagType.MIST:
      return new MistTag(turnCount, sourceId, side);
    case ArenaTagType.QUICK_GUARD:
      return new QuickGuardTag(sourceId, side);
    case ArenaTagType.WIDE_GUARD:
      return new WideGuardTag(sourceId, side);
    case ArenaTagType.MAT_BLOCK:
      return new MatBlockTag(sourceId, side);
    case ArenaTagType.CRAFTY_SHIELD:
      return new CraftyShieldTag(sourceId, side);
    case ArenaTagType.NO_CRIT:
      return new NoCritTag(turnCount, sourceMove!, sourceId, side); // TODO: is this bang correct?
    case ArenaTagType.MUD_SPORT:
      return new MudSportTag(turnCount, sourceId);
    case ArenaTagType.WATER_SPORT:
      return new WaterSportTag(turnCount, sourceId);
    case ArenaTagType.ION_DELUGE:
      return new IonDelugeTag(sourceMove);
    case ArenaTagType.SPIKES:
      return new SpikesTag(sourceId, side);
    case ArenaTagType.TOXIC_SPIKES:
      return new ToxicSpikesTag(sourceId, side);
    case ArenaTagType.FUTURE_SIGHT:
    case ArenaTagType.DOOM_DESIRE:
      return new DelayedAttackTag(tagType, sourceMove, sourceId, targetIndex!, side); // TODO:questionable bang
    case ArenaTagType.WISH:
      return new WishTag(turnCount, sourceId, side);
    case ArenaTagType.STEALTH_ROCK:
      return new StealthRockTag(sourceId, side);
    case ArenaTagType.STICKY_WEB:
      return new StickyWebTag(sourceId, side);
    case ArenaTagType.TRICK_ROOM:
      return new TrickRoomTag(turnCount, sourceId);
    case ArenaTagType.GRAVITY:
      return new GravityTag(turnCount);
    case ArenaTagType.REFLECT:
      return new ReflectTag(turnCount, sourceId, side);
    case ArenaTagType.LIGHT_SCREEN:
      return new LightScreenTag(turnCount, sourceId, side);
    case ArenaTagType.AURORA_VEIL:
      return new AuroraVeilTag(turnCount, sourceId, side);
    case ArenaTagType.TAILWIND:
      return new TailwindTag(turnCount, sourceId, side);
    case ArenaTagType.HAPPY_HOUR:
      return new HappyHourTag(turnCount, sourceId, side);
    case ArenaTagType.SAFEGUARD:
      return new SafeguardTag(turnCount, sourceId, side);
    case ArenaTagType.IMPRISON:
      return new ImprisonTag(sourceId, side);
    case ArenaTagType.FIRE_GRASS_PLEDGE:
      return new FireGrassPledgeTag(sourceId, side);
    case ArenaTagType.WATER_FIRE_PLEDGE:
      return new WaterFirePledgeTag(sourceId, side);
    case ArenaTagType.GRASS_WATER_PLEDGE:
      return new GrassWaterPledgeTag(sourceId, side);
    case ArenaTagType.FAIRY_LOCK:
      return new FairyLockTag(turnCount, sourceId);
    case ArenaTagType.NEUTRALIZING_GAS:
      return new SuppressAbilitiesTag(sourceId);
    default:
      return null;
  }
}

/**
 * When given a battler tag or json representing one, creates an actual ArenaTag object with the same data.
 * @param {ArenaTag | any} source An arena tag
 * @return {ArenaTag} The valid arena tag
 */
export function loadArenaTag(source: ArenaTag | any): ArenaTag {
  const tag =
    getArenaTag(
      source.tagType,
      source.turnCount,
      source.sourceMove,
      source.sourceId,
      source.targetIndex,
      source.side,
    ) ?? new NoneTag();
  tag.loadTag(source);
  return tag;
}
