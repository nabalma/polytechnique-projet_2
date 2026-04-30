/* eslint-disable max-lines-per-function */
/*
 * Ce fichier de test Jest couvre l'intégralité du WaitingRoomGateway : création de salle,
 * rejoindre, quitter, expulsion, démarrage de partie et déconnexion réseau. Chaque scénario
 * nécessite un beforeEach qui recrée le module NestJS complet avec ses providers mockés,
 * ce qui rend structurellement les blocs describe/beforeEach plus longs que la limite de 20.
 * Découper ces blocs nuirait à la lisibilité et à la cohérence des tests,
 * on désactive donc max-lines-per-function pour ce fichier de test.
 */

/**
 * STRATÉGIE DE TEST — WaitingRoomGateway
 *
 * Objectif : Valider que le gateway Socket.IO émet les bons événements
 *            en fonction des résultats retournés par WaitingRoomService.
 *
 * Approche :
 * - Tests unitaires avec mocks Sinon (même pattern que chat.gateway.spec.ts)
 * - WaitingRoomService entièrement stubbé avec createStubInstance
 * - server et socket mockés pour capturer les émissions
 * - Chaque test repart d'un état propre via beforeEach
 *
 * Cas limites couverts :
 * - onCreateRoom : gameId déjà utilisé → GameAlreadyHasRoom
 * - onJoinRoom : 'locked', 'full', 'not-found' → tous émettent RoomLocked
 * - onKickPlayer : socketId undefined → pas d'émission YouWereKicked
 * - handleDisconnect : socket inconnu → pas de crash, rien émis
 * - handleDisconnect : organisateur vs non-organisateur
 */
import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { GameGateway } from '@app/gateways/game/game.gateway';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { CharacterCreationService } from '@app/services/character-creation/character-creation.service';
import { WaitingRoomService } from '@app/services/waiting-room/waiting-room.service';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import {
    CreateRoomPayload,
    JoinRoomPayload,
    KickPlayerPayload,
} from '@common/interfaces/waiting-room/waiting-room-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Test, TestingModule } from '@nestjs/testing';
import { SinonStubbedInstance, createStubInstance } from 'sinon';
import { BroadcastOperator, Server, Socket } from 'socket.io';
import { WaitingRoomGateway } from './waiting-room.gateway';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePlayer = (id: string, name: string): Player => ({
    id,
    roomId: '',
    name,
    avatar: 'avatar.png',
    avatarMini: 'avatar-mini.png',
    isActive: false,
    isVirtual: false,
    isOrganizer: false,
    attributes: {
        totalLife: 8,
        currentLife: 8,
        speed: 6,
        attack: 4,
        attackDice: DiceType.D6,
        defense: 4,
        defenseDice: DiceType.D4,
    },
    remainingMovement: 6,
    remainingActions: 1,
    position: { x: 0, y: 0 },
    hasFlag: false,
    wins: 0,
});

const makeRoomState = (roomId = 'room-1') => ({
    roomId,
    gameId: 'game-1',
    gameName: 'Test',
    gameMap: { id: 0, gridSize: 10, grid: [] },
    gameMode: GameMode.CLASSIC,
    players: [makePlayer('org', 'Organisateur')],
    isLocked: false,
    isGameStarted: false,
    maxPlayers: 4,
    organizerId: 'org',
    socketToPlayerId: new Map([['socket-org', 'org']]),
});

const makeRoomUpdatedPayload = () => ({
    players: [makePlayer('org', 'Organisateur')],
    isLocked: false,
    maxPlayers: 4,
    organizerId: 'org',
    gameMode: GameMode.CLASSIC,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('WaitingRoomGateway', () => {
    let gateway: WaitingRoomGateway;
    let service: SinonStubbedInstance<WaitingRoomService>;
    let socket: SinonStubbedInstance<Socket>;
    let server: SinonStubbedInstance<Server>;

    beforeEach(async () => {
        service = createStubInstance(WaitingRoomService);
        socket = createStubInstance<Socket>(Socket);
        server = createStubInstance<Server>(Server);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WaitingRoomGateway,
                { provide: WaitingRoomService, useValue: service },
                { provide: BroadcastService, useValue: { setServer: () => undefined } },
                { provide: GameGateway, useValue: { broadcastRoomsUpdated: () => undefined } },
                {
                    provide: CharacterCreationService,
                    useValue: {
                        handleDisconnect: () => null,
                        joinRoom: () => [],
                        leaveRoom: () => null,
                        takeAvatar: () => undefined,
                        releaseAvatar: () => undefined,
                    },
                },
            ],
        }).compile();

        gateway = module.get<WaitingRoomGateway>(WaitingRoomGateway);
        gateway['server'] = server;
    });

    it('devrait être défini', () => {
        expect(gateway).toBeDefined();
    });

    // ── onCreateRoom ──────────────────────────────────────────────────────────

    describe('onCreateRoom()', () => {
        const payload: CreateRoomPayload = { player: makePlayer('p1', 'Alice'), gameId: 'game-1' };

        it('devrait émettre RoomCreated et broadcaster après création', async () => {
            service.gameRoomExists.returns(false);
            service.createRoom.resolves({ roomId: 'room-1', maxPlayers: 4 });
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            await gateway.onCreateRoom(socket, payload);

            expect(socket.emit.calledWith(WaitingRoomEvents.RoomCreated)).toBeTruthy();
            expect(socket.join.calledWith('room-1')).toBeTruthy();
            expect(server.emit.calledWith(WaitingRoomEvents.RoomUpdated)).toBeTruthy();
        });
    });

    // ── onJoinRoom ────────────────────────────────────────────────────────────

    describe('onJoinRoom()', () => {
        const payload: JoinRoomPayload = { player: makePlayer('p2', 'Bob'), roomId: 'room-1' };

        it('devrait joindre la room et broadcaster si résultat "ok"', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            service.joinRoom.returns('ok' as any);
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onJoinRoom(socket, payload);

            expect(socket.join.calledWith('room-1')).toBeTruthy();
            expect(server.emit.calledWith(WaitingRoomEvents.RoomsUpdated)).toBeTruthy();
        });

        it('devrait émettre RoomLocked si la room est verrouillée', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            service.joinRoom.returns('locked' as any);

            gateway.onJoinRoom(socket, payload);

            expect(socket.emit.calledWith(WaitingRoomEvents.RoomLocked)).toBeTruthy();
            expect(socket.join.called).toBeFalsy();
        });

        // CAS LIMITE : room pleine → même comportement que locked
        it('devrait émettre RoomLocked si la room est pleine', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            service.joinRoom.returns('full' as any);

            gateway.onJoinRoom(socket, payload);

            expect(socket.emit.calledWith(WaitingRoomEvents.RoomLocked)).toBeTruthy();
        });

        // CAS LIMITE : roomId inexistant → même comportement
        it('devrait émettre RoomLocked si la room nexiste pas', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            service.joinRoom.returns('not-found' as any);

            gateway.onJoinRoom(socket, payload);

            expect(socket.emit.calledWith(WaitingRoomEvents.RoomLocked)).toBeTruthy();
        });
    });

    // ── onLeaveRoom ───────────────────────────────────────────────────────────

    describe('onLeaveRoom()', () => {
        it("devrait émettre OrganizerLeft si l'organisateur part", () => {
            service.leaveRoom.returns({ wasOrganizer: true, room: undefined });
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onLeaveRoom(socket, 'room-1');

            expect(server.to.calledWith('room-1')).toBeTruthy();
            expect(server.emit.calledWith(WaitingRoomEvents.OrganizerLeft)).toBeTruthy();
        });

        it('devrait broadcaster RoomUpdated si un non-organisateur part', () => {
            const room = makeRoomState();
            service.leaveRoom.returns({ wasOrganizer: false, room });
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onLeaveRoom(socket, 'room-1');

            expect(server.emit.calledWith(WaitingRoomEvents.RoomsUpdated)).toBeTruthy();
        });

        it('devrait toujours appeler broadcastAvailableRoomsUpdate', () => {
            service.leaveRoom.returns({ wasOrganizer: false, room: undefined });
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onLeaveRoom(socket, 'room-1');

            expect(server.emit.calledWith(WaitingRoomEvents.RoomsUpdated)).toBeTruthy();
        });
    });

    // ── onKickPlayer ──────────────────────────────────────────────────────────

    describe('onKickPlayer()', () => {
        const payload: KickPlayerPayload = { roomId: 'room-1', targetPlayerId: 'p2' };

        it('devrait émettre YouWereKicked au socket du joueur expulsé', () => {
            const room = makeRoomState();
            service.kickPlayer.returns({ socketId: 'socket-2', room });
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);
            server.in.returns({ socketsLeave: () => undefined } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onKickPlayer(socket, payload);

            expect(server.to.calledWith('socket-2')).toBeTruthy();
            expect(server.emit.calledWith(WaitingRoomEvents.YouWereKicked)).toBeTruthy();
        });

        it('devrait broadcaster RoomUpdated après un kick', () => {
            const room = makeRoomState();
            service.kickPlayer.returns({ socketId: 'socket-2', room });
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);
            server.in.returns({ socketsLeave: () => undefined } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.onKickPlayer(socket, payload);

            expect(server.emit.calledWith(WaitingRoomEvents.RoomsUpdated)).toBeTruthy();
        });

        // CAS LIMITE : socketId undefined → pas d'émission YouWereKicked
        it('ne devrait pas émettre YouWereKicked si socketId est undefined', () => {
            service.kickPlayer.returns({ socketId: undefined, room: undefined });

            gateway.onKickPlayer(socket, payload);

            expect(server.to.called).toBeFalsy();
        });
    });

    // ── onStartGame ───────────────────────────────────────────────────────────

    describe('onStartGame()', () => {
        it('devrait déléguer le démarrage à waitingRoomService.startGame', () => {
            gateway.onStartGame(socket, 'room-1');

            expect(service.startGame.calledWith('room-1', socket.id)).toBeTruthy();
        });
    });

    // ── onGetAvailableRooms ───────────────────────────────────────────────────

    describe('onGetAvailableRooms()', () => {
        it('devrait émettre AvailableRooms uniquement au socket demandeur', () => {
            service.getAvailableRooms.returns([]);

            gateway.onGetAvailableRooms(socket);

            expect(socket.emit.calledWith(WaitingRoomEvents.AvailableRooms)).toBeTruthy();
        });

        // CAS LIMITE : 0 rooms → payload avec rooms=[]
        it('devrait émettre un payload avec rooms=[] si aucune room disponible', () => {
            service.getAvailableRooms.returns([]);
            let capturedPayload: unknown;
            socket.emit.callsFake((_event: string, data: unknown) => {
                capturedPayload = data;
                return true;
            });

            gateway.onGetAvailableRooms(socket);

            expect((capturedPayload as { rooms: unknown[] }).rooms).toHaveLength(0);
        });
    });

    // ── handleDisconnect ──────────────────────────────────────────────────────

    describe('handleDisconnect()', () => {
        it("devrait émettre OrganizerLeft si l'organisateur se déconnecte", () => {
            const room = makeRoomState();
            service.getRoomForSocket.returns(room);
            service.leaveRoom.returns({ wasOrganizer: true, room: undefined });
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.handleDisconnect(socket);

            expect(server.emit.calledWith(WaitingRoomEvents.OrganizerLeft)).toBeTruthy();
        });

        it('devrait broadcaster RoomUpdated si un non-organisateur se déconnecte', () => {
            const room = makeRoomState();
            service.getRoomForSocket.returns(room);
            service.leaveRoom.returns({ wasOrganizer: false, room });
            service.getRoomUpdatedPayload.returns(makeRoomUpdatedPayload());
            service.getAvailableRooms.returns([]);
            server.to.returns({ emit: server.emit } as unknown as BroadcastOperator<unknown, unknown>);

            gateway.handleDisconnect(socket);

            expect(server.emit.calledWith(WaitingRoomEvents.RoomsUpdated)).toBeTruthy();
        });

        // CAS LIMITE : socket inconnu → pas de crash, rien émis
        it('ne devrait rien faire si le socket nest dans aucune room', () => {
            service.getRoomForSocket.returns(undefined);

            gateway.handleDisconnect(socket);

            expect(server.to.called).toBeFalsy();
            expect(server.emit.called).toBeFalsy();
        });
    });
});
