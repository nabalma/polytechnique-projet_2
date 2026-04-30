export enum TargetType {
    Door,
    Player,
    Sanctuary,
}



export enum TileType {
    DEFAULT = 'DEFAULT',
    WALL = 'WALL',
    DOOR_OPEN = 'DOOR_OPEN',
    DOOR_CLOSED = 'DOOR_CLOSED',
    ICE = 'ICE',
    WATER = 'WATER',
}

export enum GridSize {
    SMALL = 10,
    MEDIUM = 15,
    LARGE = 20,
}

export enum ObjectType {
    START_POINT = 'START_POINT',
    FLAG = 'FLAG',
    COMBAT_SANCTUARY = 'COMBAT_SANCTUARY',
    HEAL_SANCTUARY = 'HEALTH_SANCTUARY',
    DEFAULT = 'NOTHING',
}

export enum SanctuaryPart {
    TopLeft = 'TopLeft',
    TopRight = 'TopRight',
    BottomLeft = 'BottomLeft',
    BottomRight = 'BottomRight',
}