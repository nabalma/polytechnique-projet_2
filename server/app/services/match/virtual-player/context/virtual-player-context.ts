import { DIRECTIONS } from '@app/constants/direction-player.constants';
import { Match } from '@app/model/match-models/base-match/match';
import { CTFMatch } from '@app/model/match-models/ctf-match/ctf-match';
import { SanctuaryService } from '@app/services/sanctuary/sanctuary.service';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { BfsState } from '@common/interfaces/player/virtual-player/virtual-player-interface';
import { PathFindingService } from '@app/services/match/pathfinding/path-finding.service';
export class VirtualPlayerContext {
    private readonly pathFindingService = new PathFindingService();
    private readonly sanctuaryService = new SanctuaryService();

    constructor(
        private readonly player: Player,
        private readonly match: Match,
    ) {}

    private getEnemies(): Player[] {
        const enemies = this.match.gameState.players.filter(
            (p) => p.id !== this.player.id && p.remainingActions !== -1 && !this.isSameTeam(p),
        );
        return enemies;
    }
    isInCombat(): boolean {
        return this.match.combatOrchestrator.isInCombat;
    }

    getPlayer(): Player {
        return this.player;
    }


    getMatch(): Match {
        return this.match;
    }


    getReachableCells(): Position[] {
        return this.match.computeReachableCells(this.player);
    }

    hasNoAvailableActions(): boolean {
        return this.match.hasNoAvailableActions(this.player);
    }

    getAdjacentEnemies(): Player[] {
        return this.pathFindingService
            .getAdjacentPlayers(this.player, this.match.gameState)
            .filter((p) => !this.isSameTeam(p));
    }

    getNearestEnemy(): Player | null {

        const enemies: Player[] = this.getEnemies();
        if (enemies.length === 0) return;

        return enemies.reduce((nearest, candidate) => {
            const distNearest = this.manhattanDistance(this.player.position, nearest.position);
            const distCandidate = this.manhattanDistance(this.player.position, candidate.position);
            return distCandidate < distNearest ? candidate : nearest;
        });
    }


    getAdjacentClosedDoors(): Position[] {
        return DIRECTIONS
            .map((dir) => ({ x: this.player.position.x + dir.x, y: this.player.position.y + dir.y }))
            .filter((pos) => {
                const cell = this.match.gameState.grid[pos.y]?.[pos.x];
                return cell?.tile?.tileType === TileType.DOOR_CLOSED;
            });
    }


    getAdjacentSanctuaries(): { position: Position; type: ObjectType }[] {
        return this.sanctuaryService
            .findAdjacentActiveSanctuaries(this.player, this.match.gameState, this.match.sanctuaryReactivationTurns)
            .map((pos) => ({
                position: pos,
                type: this.match.gameState.grid[pos.y][pos.x].objects?.objectType as ObjectType,
            }));
    }


    getNextStepToward(target: Position): Position | null {
        const reachable = this.getReachableCells();
        if (reachable.length === 0) return null;

        const isAtTarget: boolean = this.player.position.x === target.x && this.player.position.y === target.y;
        if (isAtTarget) return null;

        const bestDest = this.findClosestReachableToTarget(target, reachable);
        if (!bestDest) return null;

        return this.findFirstStepToward(bestDest);
    }

    private findClosestReachableToTarget(target: Position, reachable: Position[]): Position | null {
        const currentKey = this.posKey(this.player.position);
        const reachableSet = new Set(reachable.map((p) => this.posKey(p)));
        const { cell, currentWasClosest } = this.runBfsFromTarget(target, reachableSet, currentKey);
        if (cell) return cell;
        if (currentWasClosest) return null;
        return this.fallbackClosestByManhattan(target, reachable.filter((p) => this.posKey(p) !== currentKey));
    }

    private runBfsFromTarget(
        target: Position,
        reachableSet: Set<string>,
        currentKey: string,
    ): { cell: Position | null; currentWasClosest: boolean } {
        const levelMap = new Map<string, number>([[this.posKey(target), 0]]);
        const queue: Position[] = [target];
        const state: BfsState = { currentLevel: null, candidate: null, candidateLevel: null };

        while (queue.length > 0) {
            const current = queue.shift();
            const level = levelMap.get(this.posKey(current)) ?? 0;
            if (state.currentLevel !== null && level > state.currentLevel) break;
            if (!this.visitReachableCell(current, level, state, reachableSet, currentKey)) {
                this.enqueueNeighbors(current, levelMap, queue);
            }
        }

        return this.buildBfsResult(state);
    }

    private visitReachableCell(
        current: Position,
        level: number,
        state: BfsState,
        reachableSet: Set<string>,
        currentKey: string,
    ): boolean {
        const key = this.posKey(current);
        if (!reachableSet.has(key)) return false;
        if (key === currentKey) {
            state.currentLevel = level;
        } else if (state.candidate === null) {
            state.candidate = current;
            state.candidateLevel = level;
        }
        return true;
    }

    private buildBfsResult(state: BfsState): { cell: Position | null; currentWasClosest: boolean } {
        if (state.candidate !== null && (state.currentLevel === null || state.candidateLevel < state.currentLevel)) {
            return { cell: state.candidate, currentWasClosest: false };
        }
        return { cell: null, currentWasClosest: state.currentLevel !== null };
    }

    private enqueueNeighbors(current: Position, levelMap: Map<string, number>, queue: Position[]): void {
        const level = levelMap.get(this.posKey(current)) ?? 0;
        for (const neighbor of this.pathFindingService.getNeighbors(current, this.match.gameState)) {
            const nKey = this.posKey(neighbor);
            if (!levelMap.has(nKey)) {
                levelMap.set(nKey, level + 1);
                queue.push(neighbor);
            }
        }
    }

    private fallbackClosestByManhattan(target: Position, reachable: Position[]): Position | null {
        if (reachable.length === 0) return null;
        return reachable.reduce((best, candidate) =>
            this.manhattanDistance(candidate, target) < this.manhattanDistance(best, target) ? candidate : best,
        );
    }

    getBestFleePosition(): Position | null {
        const reachable = this.getReachableCells();

        if (reachable.length === 0) return null;

        const enemies: Player[] = this.getEnemies();
        if (enemies.length === 0) return;

        const bestDest = reachable.reduce((best, candidate) => {
            const minDistBest = Math.min(...enemies.map((e) => this.manhattanDistance(best, e.position)));
            const minDistCandidate = Math.min(...enemies.map((e) => this.manhattanDistance(candidate, e.position)));
            return minDistCandidate > minDistBest ? candidate : best;
        });

        return this.findFirstStepToward(bestDest);
    }

    getPatrolPosition(): Position | null {
        const reachable = this.getReachableCells();
        if (reachable.length === 0) return null;

        const anchor = this.player.startPosition ?? this.player.position;
        if (!anchor) return null;

        const PATROL_RADIUS = 2;

        const patrolZone = reachable.filter(
            (cell) => this.manhattanDistance(cell, anchor) <= PATROL_RADIUS,
        );

        const candidates = patrolZone.length > 0 ? patrolZone : reachable;

        return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }

    private findFirstStepToward(destination: Position): Position | null {
        const start = this.player.position;
        if (this.player.remainingMovement === 0) return null;
        if (this.posKey(destination) === this.posKey(start)) return null;

        const reachableSet = new Set(this.getReachableCells().map((p) => this.posKey(p)));
        const parent = this.buildParentMap(start, destination, reachableSet);
        if (!parent) return null;

        return this.traceFirstStep(parent, start, destination);
    }

    private buildParentMap(start: Position, destination: Position, reachableSet: Set<string>): Map<string, Position | null> | null {
        const parent = new Map<string, Position | null>();
        parent.set(this.posKey(start), null);
        const queue: Position[] = [start];
        const destKey = this.posKey(destination);

        outer: while (queue.length > 0) {
            const current = queue.shift();
            for (const neighbor of this.pathFindingService.getNeighbors(current, this.match.gameState)) {
                const key = this.posKey(neighbor);
                const isDestination = key === destKey;
                const isOccupied = this.pathFindingService.isOccupiedByPlayer(neighbor, this.player.id, this.match.gameState.players);
                if (!parent.has(key) && reachableSet.has(key) && (!isOccupied || isDestination)) {
                    parent.set(key, current);
                    if (isDestination) break outer;
                    queue.push(neighbor);
                }
            }
        }

        return parent.has(destKey) ? parent : null;
    }

    private traceFirstStep(parent: Map<string, Position | null>, start: Position, destination: Position): Position {
        let current = destination;

        while (true) {
            const prev = parent.get(this.posKey(current));
            if (!prev) return current;
            if (this.posKey(prev) === this.posKey(start)) return current;
            current = prev;
        }
    }

    private posKey(p: Position): string {
        return `${p.x},${p.y}`;
    }


    getFlagHolder(): Player | null {
        const match = this.match;
        if (!(match instanceof CTFMatch) || !match.flagHolderId) return null;
        return match.gameState.players.find((p) => p.id === match.flagHolderId) ?? null;
    }

    getFlagPosition(): Position | null {
        const match = this.match;
        if (!(match instanceof CTFMatch)) return null;
        return match.flagPosition;
    }

    isSameTeam(other: Player): boolean {
        if (!this.player.team || !other.team) return false;
        return this.player.team === other.team;
    }

    isAdjacentEnemy(enemyPlayer: Player): boolean {
        return DIRECTIONS.some(
            (dir) => (
                this.player.position.x + dir.x === enemyPlayer.position.x &&
                this.player.position.y + dir.y === enemyPlayer.position.y
            ),
        );
    }


    private manhattanDistance(a: Position, b: Position): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}