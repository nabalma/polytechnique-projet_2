import {
    SANCTUARY_COMBAT_BASE_BONUS_AMOUNT,
    SANCTUARY_DOUBLE_OR_NOTHING_MULTIPLIER,
    SANCTUARY_DOUBLE_OR_NOTHING_WIN_PROBABILITY,
    SANCTUARY_NO_EFFECT_MULTIPLIER,
    SANCTUARY_NORMAL_MULTIPLIER,
    SANCTUARY_REACTIVATION_DELAY_IN_TURNS,
    SANCTUARY_SANTE_BASE_HEAL_AMOUNT,
    SANCTUARY_SIDE_LENGTH,
} from '@common/constants/sanctuary/sanctuary.constants';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import {
    RequestSanctuaryInteractionPayload,
    SanctuaryInteractionEffect,
    SanctuaryInteractionMode,
    SanctuaryInteractionResultPayload,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { SanctuaryInteractionContext } from '@common/interfaces/game-play/sanctuary-context.interface';
import { Position } from '@common/interfaces/match/match-interface';
import { CombatBonus, Player } from '@common/interfaces/player/player-interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SanctuaryService {
    validateAndApplySanctuaryInteraction(
        playerId: string,
        payload: RequestSanctuaryInteractionPayload,
        gameState: GameState,
        sanctuaryReactivationTurns: Map<string, number>,
    ): SanctuaryInteractionResultPayload | null {
        const player = gameState.players.find((candidate) => candidate.id === playerId);
        if (!player || player.remainingActions <= 0) return null;
        const context = this.getSanctuaryContext(player, payload, gameState, sanctuaryReactivationTurns);
        if (!context) return null;
        return this.applyAndReturnSanctuaryResult(player, payload, gameState, sanctuaryReactivationTurns, context);
    }

    private getSanctuaryContext(
        player: Player,
        payload: RequestSanctuaryInteractionPayload,
        gameState: GameState,
        sanctuaryReactivationTurns: Map<string, number>,
    ): SanctuaryInteractionContext | null {
        const clickedCell = gameState.grid[payload.sanctuaryPosition.y]?.[payload.sanctuaryPosition.x];
        if (!clickedCell?.objects) return null;
        const sanctuaryType = clickedCell.objects.objectType;
        if (sanctuaryType !== ObjectType.COMBAT_SANCTUARY && sanctuaryType !== ObjectType.HEAL_SANCTUARY) return null;
        const anchorPosition = this.findSanctuaryAnchorPosition(payload.sanctuaryPosition, gameState);
        if (!anchorPosition) return null;
        if (!this.isPlayerAdjacentToSanctuary(player.position, anchorPosition, gameState.gridSize)) return null;
        const sanctuaryKey = this.positionToKey(anchorPosition);
        if (!this.isSanctuaryAvailableAtTurn(sanctuaryKey, gameState.turnNumber, sanctuaryReactivationTurns)) return null;
        if (sanctuaryType === ObjectType.COMBAT_SANCTUARY && player.activeCombatBonus) return null;
        return { anchorPosition, sanctuaryKey, sanctuaryType };
    }

    private applyAndReturnSanctuaryResult(
        player: Player, payload: RequestSanctuaryInteractionPayload, gameState: GameState,
        sanctuaryReactivationTurns: Map<string, number>, context: SanctuaryInteractionContext,
    ): SanctuaryInteractionResultPayload {
        player.remainingActions--;
        const effect = this.computeAndApplyEffect(player, context.sanctuaryType, payload.mode, gameState);
        this.markSanctuaryAsInactive(context.anchorPosition, gameState);
        sanctuaryReactivationTurns.set(context.sanctuaryKey, gameState.turnNumber + SANCTUARY_REACTIVATION_DELAY_IN_TURNS);
        const result: SanctuaryInteractionResultPayload = {
            activatingPlayerId: player.id,
            sanctuaryAnchorPosition: context.anchorPosition,
            sanctuaryType: context.sanctuaryType,
            interactionMode: payload.mode,
            effect,
            updatedPlayers: gameState.players,
            updatedGrid: gameState.grid,
        };
        return result;
    }

    reactivateExpiredSanctuaries(gameState: GameState, sanctuaryReactivationTurns: Map<string, number>): boolean {
        let anyReactivated = false;
        for (const [key, reactivationTurn] of sanctuaryReactivationTurns.entries()) {
            if (gameState.turnNumber >= reactivationTurn) {
                const [x, y] = key.split(',').map(Number);
                this.markSanctuaryAsActive({ x, y }, gameState);
                sanctuaryReactivationTurns.delete(key);
                anyReactivated = true;
            }
        }
        return anyReactivated;
    }

    expireCombatBonusIfDue(playerId: string, gameState: GameState): void {
        const player = gameState.players.find((candidate) => candidate.id === playerId);
        if (!player?.activeCombatBonus) return;
        if (gameState.turnNumber >= player.activeCombatBonus.expiresOnTurnNumber) {
            player.attributes.attack -= player.activeCombatBonus.attackBonus;
            player.attributes.defense -= player.activeCombatBonus.defenseBonus;
            player.activeCombatBonus = undefined;
        }
    }

    findAdjacentActiveSanctuaries(
        player: Player,
        gameState: GameState,
        sanctuaryReactivationTurns: Map<string, number>,
    ): Position[] {
        const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        const result: Position[] = [];
        for (const direction of directions) {
            const neighbor: Position = { x: player.position.x + direction.x, y: player.position.y + direction.y };
            const isValid = this.isInsideGrid(neighbor, gameState.gridSize)
                && this.isNeighborValidSanctuary(neighbor, player, gameState, sanctuaryReactivationTurns);
            if (isValid) {
                result.push(neighbor);
            }
        }
        return result;
    }

    private isNeighborValidSanctuary(
        neighbor: Position,
        player: Player,
        gameState: GameState,
        sanctuaryReactivationTurns: Map<string, number>,
    ): boolean {
        const cell = gameState.grid[neighbor.y]?.[neighbor.x];
        if (!cell?.objects) return false;
        const { objectType } = cell.objects;
        if (objectType !== ObjectType.COMBAT_SANCTUARY && objectType !== ObjectType.HEAL_SANCTUARY) return false;
        const anchorPos = this.findSanctuaryAnchorPosition(neighbor, gameState);
        if (!anchorPos) return false;
        if (!this.isSanctuaryAvailableAtTurn(this.positionToKey(anchorPos), gameState.turnNumber, sanctuaryReactivationTurns)) return false;
        return !(objectType === ObjectType.COMBAT_SANCTUARY && player.activeCombatBonus);
    }

    private computeAndApplyEffect(
        player: Player,
        sanctuaryType: ObjectType,
        mode: SanctuaryInteractionMode,
        gameState: GameState,
    ): SanctuaryInteractionEffect {
        const isDoubleOrNothing = mode === SanctuaryInteractionMode.DoubleOrNothing;
        const doubleOrNothingResult = Math.random() < SANCTUARY_DOUBLE_OR_NOTHING_WIN_PROBABILITY
            ? SANCTUARY_DOUBLE_OR_NOTHING_MULTIPLIER
            : SANCTUARY_NO_EFFECT_MULTIPLIER;
        const multiplier = isDoubleOrNothing ? doubleOrNothingResult : SANCTUARY_NORMAL_MULTIPLIER;
        if (multiplier === SANCTUARY_NO_EFFECT_MULTIPLIER) return { noEffectApplied: true };
        if (sanctuaryType === ObjectType.HEAL_SANCTUARY) return this.applySanteEffect(player, multiplier);
        return this.applyCombatEffect(player, multiplier, gameState);
    }

    private applySanteEffect(player: Player, multiplier: number): SanctuaryInteractionEffect {
        const healingAmount = SANCTUARY_SANTE_BASE_HEAL_AMOUNT * multiplier;
        const lifeRestored = Math.min(healingAmount, player.attributes.totalLife - player.attributes.currentLife);
        player.attributes.currentLife += lifeRestored;
        return { lifeRestored, noEffectApplied: false };
    }

    private applyCombatEffect(player: Player, multiplier: number, gameState: GameState): SanctuaryInteractionEffect {
        const attackBonus = SANCTUARY_COMBAT_BASE_BONUS_AMOUNT * multiplier;
        const defenseBonus = SANCTUARY_COMBAT_BASE_BONUS_AMOUNT * multiplier;
        player.attributes.attack += attackBonus;
        player.attributes.defense += defenseBonus;
        const activePlayers = gameState.players.filter((candidate) => candidate.remainingActions !== -1).length;
        const combatBonus: CombatBonus = { attackBonus, defenseBonus, expiresOnTurnNumber: gameState.turnNumber + activePlayers };
        player.activeCombatBonus = combatBonus;
        return { attackBonus, defenseBonus, noEffectApplied: false };
    }

    private findSanctuaryAnchorPosition(position: Position, gameState: GameState): Position | null {
        const cell = gameState.grid[position.y]?.[position.x];
        if (!cell?.objects) return null;

        if (cell.objects.isAnchor) return position;

        if (cell.objects.anchorX !== undefined && cell.objects.anchorY !== undefined) {
            return { x: cell.objects.anchorX, y: cell.objects.anchorY };
        }
        const type = cell.objects.objectType;
        for (let dy = 0; dy < SANCTUARY_SIDE_LENGTH; dy++) {
            for (let dx = 0; dx < SANCTUARY_SIDE_LENGTH; dx++) {
                const candidate: Position = { x: position.x - dx, y: position.y - dy };
                if (this.isTopLeftOfSanctuaryBlock(candidate, type, gameState)) return candidate;
            }
        }
        return null;
    }

    private isTopLeftOfSanctuaryBlock(pos: Position, type: ObjectType, gameState: GameState): boolean {
        for (let row = 0; row < SANCTUARY_SIDE_LENGTH; row++) {
            for (let col = 0; col < SANCTUARY_SIDE_LENGTH; col++) {
                if (gameState.grid[pos.y + row]?.[pos.x + col]?.objects?.objectType !== type) return false;
            }
        }
        return true;
    }

    private isSanctuaryAvailableAtTurn(key: string, currentTurn: number, sanctuaryReactivationTurns: Map<string, number>): boolean {
        const reactivationTurn = sanctuaryReactivationTurns.get(key);
        if (reactivationTurn === undefined) return true;
        return currentTurn >= reactivationTurn;
    }

    private markSanctuaryAsInactive(anchorPosition: Position, gameState: GameState): void {
        for (const cellPos of this.getSanctuaryCellPositions(anchorPosition, gameState.gridSize)) {
            const cell = gameState.grid[cellPos.y]?.[cellPos.x];
            if (cell?.objects) cell.objects.isActive = false;
        }
    }

    private markSanctuaryAsActive(anchorPosition: Position, gameState: GameState): void {
        for (const cellPos of this.getSanctuaryCellPositions(anchorPosition, gameState.gridSize)) {
            const cell = gameState.grid[cellPos.y]?.[cellPos.x];
            if (cell?.objects) cell.objects.isActive = true;
        }
    }

    private getSanctuaryCellPositions(anchorPosition: Position, gridSize: number): Position[] {
        const positions: Position[] = [];
        for (let row = 0; row < SANCTUARY_SIDE_LENGTH; row++) {
            for (let col = 0; col < SANCTUARY_SIDE_LENGTH; col++) {
                const pos: Position = { x: anchorPosition.x + col, y: anchorPosition.y + row };
                if (pos.x < gridSize && pos.y < gridSize) positions.push(pos);
            }
        }
        return positions;
    }

    private isPlayerAdjacentToSanctuary(playerPosition: Position, anchorPosition: Position, gridSize: number): boolean {
        return this.getSanctuaryCellPositions(anchorPosition, gridSize).some((cellPos) =>
            this.isAdjacentTo(playerPosition, cellPos),
        );
    }

    private isAdjacentTo(posA: Position, posB: Position): boolean {
        const dx = Math.abs(posA.x - posB.x);
        const dy = Math.abs(posA.y - posB.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    private isInsideGrid(position: Position, gridSize: number): boolean {
        return position.x >= 0 && position.y >= 0 && position.x < gridSize && position.y < gridSize;
    }

    private positionToKey(position: Position): string {
        return `${position.x},${position.y}`;
    }
}
