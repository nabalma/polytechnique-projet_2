import {
    DoorToggledPayload,
    PlayerMovedPayload,
    ReachableCellsPayload,
    RoundEndedResult,
} from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';


@Injectable()
export class BroadcastService {

    private server: Server;

    setServer(server: Server) {
        this.server = server;
    }

    emitToRoom(roomId: string, event: string, payload?: unknown) {
        this.server.to(roomId).emit(event, payload);
    }

    emitToSocket(socketId: string, event: string, payload?: unknown) {
        this.server.to(socketId).emit(event, payload);
    }

    emitPlayerMoved(roomId: string, player: Player, newPosition: Position): void {
        this.server.to(roomId).emit(MatchEvents.PlayerMoved, {
            playerId: player.id,
            newPosition,
            remainingMovement: player.remainingMovement,
            path: [newPosition],
        } as PlayerMovedPayload);

    }

    emitReachableCells(socketId: string, cells: Position[]): void {
        this.server.to(socketId).emit(MatchEvents.ReachableCells, { cells } as ReachableCellsPayload);
    }

    emitRoundResult(playersId: string[], roundResult: RoundEndedResult) {
        playersId.forEach((id) => {
            this.server.to(id).emit(MatchEvents.CombatResult, roundResult);
        });
    }
    joinCombatRoom(attackerId: string, oponentId: string): string {
        const combatRoomId = `combat:${attackerId}:${oponentId}`;
        this.server.in(attackerId).socketsJoin(combatRoomId);
        this.server.in(oponentId).socketsJoin(combatRoomId);
        return combatRoomId;
    }
    leaveCombatRoom(combatRoomId: string): void {
        this.server.in(combatRoomId).socketsLeave(combatRoomId);
    }

    emitDoorToggled(roomId: string, playerId: string, position: Position, isOpen: boolean): void {
        this.server.to(roomId).emit(MatchEvents.DoorToggled, { position, isOpen, playerId } as DoorToggledPayload);
    }

    emitToCombatRoom(combatRoomId: string, event: string, payload: unknown): void {
        this.server.to(combatRoomId).emit(event, payload);
    }
}