import { DoorService } from '@app/services/match/door/door.service';
import { MovementService } from '@app/services/match/movement/movement.service';
import { PathFindingService } from '@app/services/match/pathfinding/path-finding.service';
import { GameStatsService } from '@app/services/match/stats/game-stats.service';
import { SanctuaryService } from '@app/services/sanctuary/sanctuary.service';

export class MatchInternalServices {
    readonly pathFinding: PathFindingService = new PathFindingService();
    readonly gameStats: GameStatsService = new GameStatsService();
    readonly movement: MovementService = new MovementService();
    readonly door: DoorService = new DoorService();
    readonly sanctuary: SanctuaryService = new SanctuaryService();
}
