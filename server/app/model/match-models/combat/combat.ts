import { ICE_COMBAT_PENALTY, MAX_D4_VALUE, MAX_D6_VALUE, MIN_DICE_VALUE, POSTURE_BONUS } from '@common/constants/match/match.const';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { Posture } from '@common/enum/match/match.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { LogCombat } from '@common/interfaces/game-play/combat/combat.interface';
import { RoundEndedResult } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { CombatPlayerState, RoundEssentialValues, RoundValuesPayload } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';


export class Combat {
    private initiatorState: CombatPlayerState;
    private opponentState: CombatPlayerState;

    private initiatorLogCombat: LogCombat;
    private opponentLogCombat: LogCombat;

    constructor(
        private initiator: Player,
        private opponent: Player,
        private gameState: GameState,
    ) {
        this.initiatorState = { posture: null, isAttacker: true };
        this.opponentState = { posture: null, isAttacker: false };
        this.initializeInitiatorLog();
        this.initializeOpponentLog();
    }

    initializeInitiatorLog(): void {
        this.initiatorLogCombat = {
            attackInformation: {
                base: 0,
                bonusPosture: 0,
                diceResult: 0,
                total: 0,
            },
            defenseInformation: {
                base: 0,
                bonusPosture: 0,
                diceResult: 0,
                total: 0,
            },
            differenceAttackDefense: 0,
            playerId: '',
        };
    }


    initializeOpponentLog(): void {
        this.opponentLogCombat = {
            attackInformation: {
                base: 0,
                bonusPosture: 0,
                diceResult: 0,
                total: 0,
            },
            defenseInformation: {
                base: 0,
                bonusPosture: 0,
                diceResult: 0,
                total: 0,
            },
            differenceAttackDefense: 0,
            playerId: '',
        };
    }

    startRound(): void {
        this.initiatorState.posture = null;
        this.opponentState.posture = null;
    }

    playerIds(): string[] {
        return [this.initiator.id, this.opponent.id];
    }

    setPosture(playerId: string, posture: Posture): boolean {
        if (playerId === this.initiator.id) {
            this.initiatorState.posture = posture;

        } else if (playerId === this.opponent.id) this.opponentState.posture = posture;
        return this.allPosturesChosen();
    }

    resolveRound(): RoundEndedResult {
        const roundValues = this.computeRoundResult();

        const damageReceivedByInitiator = roundValues.results[this.initiator.id].totalDamage;
        const damageReceivedByOpponent = roundValues.results[this.opponent.id].totalDamage;

        this.initiator.attributes.currentLife = Math.max(0, this.initiator.attributes.currentLife - damageReceivedByInitiator);
        this.opponent.attributes.currentLife = Math.max(0, this.opponent.attributes.currentLife - damageReceivedByOpponent);


        roundValues.results[this.initiator.id].life = this.initiator.attributes.currentLife;
        roundValues.results[this.opponent.id].life = this.opponent.attributes.currentLife;

        return { roundResult: roundValues, ...this.interpretWinner() };
    }

    get initiatorLog(): LogCombat {
        this.initiatorLogCombat.playerId = this.initiator.id;
        return this.initiatorLogCombat;
    }

    get opponentLog(): LogCombat {
        this.opponentLogCombat.playerId = this.opponent.id;
        return this.opponentLogCombat;
    }

    private allPosturesChosen(): boolean {
        return this.initiatorState.posture !== null && this.opponentState.posture !== null;
    }

    private isOnIce(player: Player): boolean {
        if (!player.position) return false;
        return this.gameState.grid[player.position.y]?.[player.position.x]?.tile.tileType === TileType.ICE;
    }

    /*eslint-disable  -- ce code est centralisé temporairement dans la classe Combat pour orchestrer le déroulement du combat, les calculs de dégâts, les logs et les transitions d’état */
    private computeRoundResult(): RoundValuesPayload {
        const initiatorIcePenalty = this.isOnIce(this.initiator) ? ICE_COMBAT_PENALTY : 0;
        const opponentIcePenalty = this.isOnIce(this.opponent) ? ICE_COMBAT_PENALTY : 0;

        const initiatorAttack = this.computeAttack(this.initiator, this.initiatorState, initiatorIcePenalty, true);
        const opponentDefense = this.computeDefense(this.opponent, this.opponentState, opponentIcePenalty, false);
        const opponentAttack = this.computeAttack(this.opponent, this.opponentState, opponentIcePenalty, false);
        const initiatorDefense = this.computeDefense(this.initiator, this.initiatorState, initiatorIcePenalty, true);

        const damageToOpponent = Math.max(0, initiatorAttack.total - opponentDefense.total);
        const damageToInitiator = Math.max(0, opponentAttack.total - initiatorDefense.total);

        this.initiatorLogCombat.differenceAttackDefense = damageToOpponent;
        this.opponentLogCombat.differenceAttackDefense = damageToInitiator;
        this.initiatorLogCombat.damageReceived = damageToInitiator;
        this.opponentLogCombat.damageReceived = damageToOpponent;

        if (damageToOpponent) {
            this.initiatorLogCombat.hasDamage = true;
        } else {
            this.initiatorLogCombat.hasDamage = false;
        }
        if (damageToInitiator) {
            this.opponentLogCombat.hasDamage = true;
        } else {
            this.opponentLogCombat.hasDamage = false;
        }


        return {
            results: {
                [this.initiator.id]: this.buildPlayerResult(this.initiator, initiatorAttack, initiatorIcePenalty, damageToInitiator),
                [this.opponent.id]: this.buildPlayerResult(this.opponent, opponentAttack, opponentIcePenalty, damageToOpponent),
            },
        };
    }

    private computeAttack(
        player: Player,
        state: CombatPlayerState,
        icePenalty: number,
        isInitiator: boolean,
    ): { die: number; total: number } {
        const die = this.rollAttackDie(player, isInitiator);
        const postureBonus = state.posture === Posture.Offensive ? POSTURE_BONUS : 0;
        const total = player.attributes.attack - icePenalty + die + postureBonus;

        const log = isInitiator
            ? this.initiatorLogCombat.attackInformation
            : this.opponentLogCombat.attackInformation;

        log.base = player.attributes.attack;
        log.diceResult = die;
        log.total = total;
        log.bonusPosture = postureBonus;
        log.penalty = icePenalty;

        return { die, total };
    }
    private computeDefense(
        player: Player,
        state: CombatPlayerState,
        icePenalty: number,
        isInitiator: boolean,
    ): { die: number; total: number } {
        const die = this.rollDefenseDie(player, isInitiator);
        const postureBonus = state.posture === Posture.Defensive ? POSTURE_BONUS : 0;
        const total = player.attributes.defense - icePenalty + die + postureBonus;

        const log = isInitiator
            ? this.initiatorLogCombat.defenseInformation
            : this.opponentLogCombat.defenseInformation;

        log.base = player.attributes.defense;
        log.diceResult = die;
        log.total = total;
        log.bonusPosture = postureBonus;
        log.penalty = icePenalty;

        return { die, total };
    }

    private buildPlayerResult(
        player: Player,
        attack: { die: number; total: number },
        icePenalty: number,
        totalDamage: number,
    ): RoundEssentialValues {
        return {
            life: player.attributes.currentLife,
            dieValue: attack.die,
            chosenPosture: player.id === this.initiator.id ? this.initiatorState.posture : this.opponentState.posture,
            totalDamage,
            icePenalty,
            total: Math.max(0, attack.total),
        };
    }

    private rollAttackDie(player: Player, isInitiator: boolean): number {
        const isD4 = player.attributes.attackDice === DiceType.D4;
        if (this.gameState.isDebugMode) {
            if (!isInitiator) return MIN_DICE_VALUE;
            return isD4 ? MAX_D4_VALUE : MAX_D6_VALUE;
        }
        return isD4 ? this.rollD4() : this.rollD6();
    }

    private rollDefenseDie(player: Player, isInitiator: boolean): number {
        const isD4 = player.attributes.defenseDice === DiceType.D4;
        if (this.gameState.isDebugMode) {
            return isInitiator ? MAX_D4_VALUE : MIN_DICE_VALUE;
        }
        return isD4 ? this.rollD4() : this.rollD6();
    }

    private rollD4(): number {
        return Math.floor(Math.random() * (MAX_D4_VALUE - MIN_DICE_VALUE + 1) + MIN_DICE_VALUE);
    }

    private rollD6(): number {
        return Math.floor(Math.random() * (MAX_D6_VALUE - MIN_DICE_VALUE + 1) + MIN_DICE_VALUE);
    }

    private interpretWinner(): { isCombatOver: boolean; winnerId: string | null; loserId: string | null } {
        const initiatorAlive = this.initiator.attributes.currentLife > 0;
        const opponentAlive = this.opponent.attributes.currentLife > 0;

        if (!initiatorAlive && opponentAlive) return { isCombatOver: true, winnerId: this.opponent.id, loserId: this.initiator.id };
        if (initiatorAlive && !opponentAlive) return { isCombatOver: true, winnerId: this.initiator.id, loserId: this.opponent.id };
        if (!initiatorAlive && !opponentAlive) return { isCombatOver: true, winnerId: null, loserId: null };
        return { isCombatOver: false, winnerId: null, loserId: null };
    }

    get fighters(): Player[] {
        return [this.initiator, this.opponent];
    }
}