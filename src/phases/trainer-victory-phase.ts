import { getCharVariantFromDialogue } from "#app/data/dialogue";
import { TrainerType } from "#app/enums/trainer-type";
import { modifierTypes } from "#app/data/data-lists";
import { vouchers } from "#app/system/voucher";
import i18next from "i18next";
import { randSeedItem } from "#app/utils/common";
import { BattlePhase } from "./battle-phase";
import { TrainerSlot } from "#enums/trainer-slot";
import { globalScene } from "#app/global-scene";
import { BiomeId } from "#enums/biome-id";
import { achvs } from "#app/system/achv";
import { timedEventManager } from "#app/global-event-manager";

export class TrainerVictoryPhase extends BattlePhase {
  public readonly phaseName = "TrainerVictoryPhase";
  start() {
    globalScene.disableMenu = true;

    globalScene.playBgm(globalScene.currentBattle.trainer?.config.victoryBgm);

    globalScene.phaseManager.unshiftNew("MoneyRewardPhase", globalScene.currentBattle.trainer?.config.moneyMultiplier!); // TODO: is this bang correct?

    const modifierRewardFuncs = globalScene.currentBattle.trainer?.config.modifierRewardFuncs!; // TODO: is this bang correct?
    for (const modifierRewardFunc of modifierRewardFuncs) {
      globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierRewardFunc);
    }

    const trainerType = globalScene.currentBattle.trainer?.config.trainerType!; // TODO: is this bang correct?
    // Validate Voucher for boss trainers
    if (vouchers.hasOwnProperty(TrainerType[trainerType])) {
      if (
        !globalScene.validateVoucher(vouchers[TrainerType[trainerType]]) &&
        globalScene.currentBattle.trainer?.config.isBoss
      ) {
        if (timedEventManager.getUpgradeUnlockedVouchers()) {
          globalScene.phaseManager.unshiftNew(
            "ModifierRewardPhase",
            [
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PREMIUM,
            ][vouchers[TrainerType[trainerType]].voucherType],
          );
        } else {
          globalScene.phaseManager.unshiftNew(
            "ModifierRewardPhase",
            [modifierTypes.VOUCHER, modifierTypes.VOUCHER, modifierTypes.VOUCHER_PLUS, modifierTypes.VOUCHER_PREMIUM][
              vouchers[TrainerType[trainerType]].voucherType
            ],
          );
        }
      }
    }
    // Breeders in Space achievement
    if (
      globalScene.arena.biomeType === BiomeId.SPACE &&
      (trainerType === TrainerType.BREEDER || trainerType === TrainerType.EXPERT_POKEMON_BREEDER)
    ) {
      globalScene.validateAchv(achvs.BREEDERS_IN_SPACE);
    }

    globalScene.ui.showText(
      i18next.t("battle:trainerDefeated", {
        trainerName: globalScene.currentBattle.trainer?.getName(TrainerSlot.NONE, true),
      }),
      null,
      () => {
        const victoryMessages = globalScene.currentBattle.trainer?.getVictoryMessages()!; // TODO: is this bang correct?
        let message: string;
        globalScene.executeWithSeedOffset(
          () => (message = randSeedItem(victoryMessages)),
          globalScene.currentBattle.waveIndex,
        );
        message = message!; // tell TS compiler it's defined now

        const showMessage = () => {
          const originalFunc = showMessageOrEnd;
          showMessageOrEnd = () =>
            globalScene.ui.showDialogue(
              message,
              globalScene.currentBattle.trainer?.getName(TrainerSlot.TRAINER, true),
              null,
              originalFunc,
            );

          showMessageOrEnd();
        };
        let showMessageOrEnd = () => this.end();
        if (victoryMessages?.length) {
          if (globalScene.currentBattle.trainer?.config.hasCharSprite && !globalScene.ui.shouldSkipDialogue(message)) {
            const originalFunc = showMessageOrEnd;
            showMessageOrEnd = () =>
              globalScene.charSprite.hide().then(() => globalScene.hideFieldOverlay(250).then(() => originalFunc()));
            globalScene
              .showFieldOverlay(500)
              .then(() =>
                globalScene.charSprite
                  .showCharacter(
                    globalScene.currentBattle.trainer?.getKey()!,
                    getCharVariantFromDialogue(victoryMessages[0]),
                  )
                  .then(() => showMessage()),
              ); // TODO: is this bang correct?
          } else {
            showMessage();
          }
        } else {
          showMessageOrEnd();
        }
      },
      null,
      true,
    );

    this.showEnemyTrainer();
  }
}
