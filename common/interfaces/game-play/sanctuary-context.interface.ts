import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { Position } from '@common/interfaces/match/match-interface';

export interface SanctuaryInteractionContext {
    anchorPosition: Position;
    sanctuaryKey: string;
    sanctuaryType: ObjectType;
}
