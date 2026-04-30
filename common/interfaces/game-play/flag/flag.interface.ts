import { Position } from '@common/interfaces/match/match-interface';

export interface RequestFlagTransferPayload {
    targetPlayerId: string;
}

export interface FlagTransferRequestPayload {
    requesterId: string;
    requesterName: string;
}

export interface FlagTransferResponsePayload {
    accepted: boolean;
}

export interface FlagTransferredPayload {
    fromPlayerId: string;
    toPlayerId: string;
}

export interface FlagTransferCancelledPayload {
    isRequester: boolean;
}

export interface FlagPickedUpPayload {
    playerId: string;
    position: Position;
}

export interface FlagDroppedPayload {
    playerId: string;
    position: Position;
}
