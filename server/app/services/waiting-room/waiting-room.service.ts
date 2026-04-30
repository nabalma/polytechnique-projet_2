import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Game, GameDocument } from '@app/model/schema/game/game';
import { MatchService } from '@app/services/match/match-session/match.service';
import { PlayerService } from '@app/services/match/player/player.service';
import { MIN_PLAYERS } from '@common/constants/waiting-room/waiting-room-messages.consts';
import { PERCENT_CHANCE } from '@common/constants/waiting-room/waiting-room.consts';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Team } from '@common/enum/player/player.enum';
import { JoinRoomStatus } from '@common/enum/waiting-room/waiting-room.enum';
import { CreateMatchParams } from '@common/interfaces/match/match-interface';
import { MiniPlayerInfo, Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';
import { AvailableRoomInfo, RoomState, RoomUpdatedPayload } from '@common/interfaces/waiting-room/waiting-room-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { VirtualPlayerService } from './virtual-player.service';

@Injectable()
export class WaitingRoomService {
    private readonly rooms = new Map<string, RoomState>();
    private readonly socketRooms = new Map<string, string>(); // socketId → roomId
    constructor(
        @InjectModel(Game.name) private readonly gameModel: Model<GameDocument>,
        private playerService: PlayerService,
        private broadcastService: BroadcastService,
        private matchService: MatchService,
        private virtualPlayerService: VirtualPlayerService,
    ) {}

    gameRoomExists(gameId: string): boolean {
        return Array.from(this.rooms.values()).some((room) => room.gameId === gameId);
    }

    async createRoom(socketId: string, mPlayer: MiniPlayerInfo, gameId: string): Promise<{ roomId: string; maxPlayers: number }> {
        const game: Game = await this.gameModel.findById(gameId).lean();
        const roomId = randomUUID();
        const player = this.playerService.addPlayer(mPlayer, socketId, roomId, true);
        const room = this.buildRoomState(roomId, gameId, game, player, socketId);

        this.rooms.set(roomId, room);
        this.socketRooms.set(socketId, roomId);
        return { roomId, maxPlayers: room.maxPlayers };
    }

    private buildRoomState(roomId: string, gameId: string, game: Game, player: Player, socketId: string): RoomState {
        return {
            roomId,
            gameId,
            gameName: game?.name ?? '',
            gameMap: game?.grid,
            gameMode: (game?.mode as GameMode) ?? GameMode.CLASSIC,
            players: [player],
            isLocked: false,
            isGameStarted: false,
            maxPlayers: this.countStartPoints(game),
            organizerId: player.id,
            socketToPlayerId: new Map([[socketId, player.id]]),
        };
    }

    joinRoom(socketId: string, player: MiniPlayerInfo, roomId: string): JoinRoomStatus {
        const room = this.rooms.get(roomId);
        if (!room) return JoinRoomStatus.NotFound;
        if (room.isLocked) return JoinRoomStatus.IsLocked;
        if (room.players.length >= room.maxPlayers) return JoinRoomStatus.Full;
        player.name = this.resolveUniqueName(room, player.name);
        const newPlayer = this.playerService.addPlayer(player, socketId, roomId);
        room.players.push(newPlayer);
        room.socketToPlayerId.set(socketId, newPlayer.id);
        this.socketRooms.set(socketId, roomId);
        if (room.players.length >= room.maxPlayers) room.isLocked = true;
        return JoinRoomStatus.Ok;
    }

    leaveRoom(socketId: string, roomId: string): { wasOrganizer: boolean; room?: RoomState } {
        const room = this.rooms.get(roomId);
        if (!room) return { wasOrganizer: false };

        const playerId = room.socketToPlayerId.get(socketId);
        const wasOrganizer = playerId === room.organizerId;

        room.players = room.players.filter((player) => player.id !== playerId);
        room.socketToPlayerId.delete(socketId);
        this.socketRooms.delete(socketId);

        if (wasOrganizer || room.players.length === 0) {
            this.rooms.delete(roomId);
            return { wasOrganizer, room: undefined };
        }

        if (!room.isGameStarted && room.players.length < room.maxPlayers) room.isLocked = false;
        return { wasOrganizer, room };
    }

    kickPlayer(roomId: string, targetPlayerId: string): { socketId?: string; room?: RoomState } {
        const room = this.rooms.get(roomId);
        if (!room) return {};

        room.players = room.players.filter((player) => player.id !== targetPlayerId);

        let kickedSocketId: string | undefined;
        for (const [socketId, playerId] of room.socketToPlayerId.entries()) {
            if (playerId === targetPlayerId) {
                kickedSocketId = socketId;
                break;
            }
        }

        if (kickedSocketId) {
            room.socketToPlayerId.delete(kickedSocketId);
            this.socketRooms.delete(kickedSocketId);
        }

        if (room.players.length < room.maxPlayers) room.isLocked = false;
        return { socketId: kickedSocketId, room };
    }

    setLocked(roomId: string, locked: boolean): void {
        const room = this.rooms.get(roomId);
        if (room) room.isLocked = locked;
    }

    deleteRoom(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        for (const socketId of room.socketToPlayerId.keys()) {
            this.socketRooms.delete(socketId);
        }
        this.rooms.delete(roomId);
    }

    getRoomForSocket(socketId: string): RoomState | undefined {
        const roomId = this.socketRooms.get(socketId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }

    getRoomById(roomId: string): RoomState | undefined {
        return this.rooms.get(roomId);
    }

    getRoomParams(room: RoomState, roomId: string): CreateMatchParams {
        return {
            ...room,
            roomId,
            socketToPlayerId: new Map(room.socketToPlayerId),
        };
    }

    startGame(roomId: string, organizerSocketId: string) {
        const room = this.getRoomById(roomId);
        if (!room) return;
        const requesterPlayerId = room.socketToPlayerId.get(organizerSocketId);
        const isOrganizer = requesterPlayerId === room.organizerId;

        if (!isOrganizer) return;
        if (room.players.length < MIN_PLAYERS) return;
        if (!this.validateCTFPlayerCount(room)) return;
        room.isGameStarted = true;
        this.setLocked(roomId, true);
        if (room.gameMode === GameMode.CTF) {
            room.players = this.assignTeams(room.players);
        }
        const params = this.getRoomParams(room, roomId);
        this.matchService.createMatch(params);
        this.deleteRoom(roomId);
    }

    private broadcastAvailableRoomsUpdate(roomId: string): void {
        const rooms = this.getAvailableRooms();
        this.broadcastService.emitToRoom(roomId, WaitingRoomEvents.RoomsUpdated, { rooms });
    }

    getRoomUpdatedPayload(roomId: string): RoomUpdatedPayload | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;
        return {
            players: room.players,
            isLocked: room.isLocked,
            maxPlayers: room.maxPlayers,
            organizerId: room.organizerId,
            gameMode: room.gameMode,
            gameName: room.gameName,
        };
    }

    validateCTFPlayerCount(room: RoomState): boolean {
        if (room.gameMode !== GameMode.CTF) return true;
        return room.players.length % 2 === 0;
    }

    getAvailableRooms(): AvailableRoomInfo[] {
        return Array.from(this.rooms.values())
            .filter((room) => !room.isLocked && !room.isGameStarted && room.players.length < room.maxPlayers)
            .map((room) => ({
                roomId: room.roomId,
                gameId: room.gameId,
                gameName: room.gameName,
                currentPlayers: room.players.length,
                maxPlayers: room.maxPlayers,
                takenAvatars: room.players.map((player) => player.avatar as string),
                roomPlayers: room.players.map((player) => ({ name: player.name, avatar: player.avatarMini })),
                gameMap: room.gameMap,
            }));
    }

    assignTeams(players: Player[]): Player[] {
        const shuffled = [...players].sort(() => Math.random() - PERCENT_CHANCE);
        const mid = Math.floor(shuffled.length / 2);
        return shuffled.map((player, index) => ({
            ...player,
            team: index < mid ? Team.RED : Team.BLUE,
        }));
    }

    addVirtualPlayer(roomId: string, organizerSocketId: string, profile: BotProfile): { room: RoomState; player: Player } | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;
        const player = this.virtualPlayerService.addVirtualPlayer(room, organizerSocketId, profile);
        return player ? { room, player } : undefined;
    }

    removeVirtualPlayer(roomId: string, organizerSocketId: string, targetPlayerId: string): RoomState | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;
        return this.virtualPlayerService.removeVirtualPlayer(room, organizerSocketId, targetPlayerId) ? room : undefined;
    }

    private resolveUniqueName(room: RoomState, name: string): string {
        const existingNames = new Set(room.players.map((player) => player.name));
        if (!existingNames.has(name)) return name;
        let suffix = MIN_PLAYERS;
        while (existingNames.has(`${name}-${suffix}`)) {
            suffix++;
        }
        return `${name}-${suffix}`;
    }

    private countStartPoints(game: unknown): number {
        const typedGame = game as { grid?: { grid?: { objects?: { objectType?: string } }[][] } } | null;
        if (!typedGame?.grid?.grid) return MIN_PLAYERS;
        let count = 0;
        for (const row of typedGame.grid.grid) {
            for (const cell of row) {
                if (cell?.objects?.objectType === ObjectType.START_POINT) count++;
            }
        }
        return Math.max(MIN_PLAYERS, count);
    }
}
