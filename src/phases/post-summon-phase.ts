import { globalScene } from "#app/global-scene";
import { ArenaTrapTag } from "#app/data/arena-tag";
import { StatusEffect } from "#app/enums/status-effect";
import { PokemonPhase } from "./pokemon-phase";
import { MysteryEncounterPostSummonTag } from "#app/data/battler-tags";
import { BattlerTagType } from "#enums/battler-tag-type";
import { applyAbAttrs } from "#app/data/abilities/apply-ab-attrs";

export class PostSummonPhase extends PokemonPhase {
  public readonly phaseName = "PostSummonPhase";
  start() {
    super.start();

    const pokemon = this.getPokemon();

    if (pokemon.status?.effect === StatusEffect.TOXIC) {
      pokemon.status.toxicTurnCount = 0;
    }
    globalScene.arena.applyTags(ArenaTrapTag, false, pokemon);

    // If this is mystery encounter and has post summon phase tag, apply post summon effects
    if (
      globalScene.currentBattle.isBattleMysteryEncounter() &&
      pokemon.findTags(t => t instanceof MysteryEncounterPostSummonTag).length > 0
    ) {
      pokemon.lapseTag(BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON);
    }

    const field = pokemon.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();
    for (const p of field) {
      applyAbAttrs("CommanderAbAttr", p, null, false);
    }

    this.end();
  }

  public getPriority() {
    return 0;
  }
}
