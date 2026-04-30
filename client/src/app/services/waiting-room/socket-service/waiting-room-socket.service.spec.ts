/* eslint-disable max-nested-callbacks, max-lines-per-function */

/**
 * Pour prendre en compte tout les attributs obligatoires de certains objets (ex: Player), on a dû créer des objets "complets" dans les tests, même si tous les champs ne sont pas utilisés.
 */

/**
 * STRATÉGIE DE TEST — WaitingRoomSocketService
 *
 * Objectif : Valider que le service réagit correctement aux événements Socket.IO
 *            entrants et déclenche les bonnes actions (navigation, reset du state).
 *
 * Approche :
 * - Tests unitaires avec TestBed Angular et Jasmine
 * - MatchSocketService mocké avec Subject RxJS pour simuler les événements entrants
 * - Router, WaitingRoomStateService, ChatStateService et MatchService mockés
 * - Chaque test repart d'un état propre via beforeEach
 *
 * Cas limites couverts :
 * - ngOnDestroy() : événements reçus après destroy → ignorés (pas de double action)
 * - ngOnDestroy() appelé deux fois → pas de crash
 * - YouWereKicked : reset state + reset chat + navigation
 * - OrganizerLeft : reset state + navigation vers /home avec notification
 */

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChatStateService } from '@app/services/chat/chat-state.service';
import { MatchService } from '@app/services/match/match.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { WaitingRoomStateService } from '@app/services/waiting-room/room-state/waiting-room-state.service';
import { WAITING_ROOM_MESSAGES } from '@common/constants/waiting-room/waiting-room-messages.consts';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { GameStatePayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { RoomCreatedPayload, RoomUpdatedPayload } from '@common/interfaces/waiting-room/waiting-room-interface';
import { WaitingRoomEvents } from '@common/socket_event/waiting-room/waiting-room.gateway.events';
import { Subject } from 'rxjs';
import { WaitingRoomSocketService } from './waiting-room-socket.service';

// ─── Helper ──────────────────────────────────────────────────────────────────

const makePlayer = (id: string, name: string): Player => ({
    id,
    name,
    avatar: 'avatar.png',
    avatarMini: 'avatar-mini.png',
    isActive: false,
    isVirtual: false,
    isOrganizer: false,
    attributes: {
        totalLife: 8, currentLife: 8, speed: 6,
        attack: 4, attackDice: DiceType.D6,
        defense: 4, defenseDice: DiceType.D4,
    },
    remainingMovement: 6,
    remainingActions: 1,
    position: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    hasFlag: false,
    wins: 0,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('WaitingRoomSocketService', () => {
    let roomCreatedSubject: Subject<RoomCreatedPayload>;
    let roomUpdatedSubject: Subject<RoomUpdatedPayload>;
    let gameStartedSubject: Subject<GameStatePayload>;
    let youWereKickedSubject: Subject<{ message: string }>;
    let organizerLeftSubject: Subject<{ message: string }>;

    let socketServiceMock: jasmine.SpyObj<MatchSocketService>;
    let stateServiceMock: jasmine.SpyObj<WaitingRoomStateService>;
    let chatStateMock: jasmine.SpyObj<ChatStateService>;
    let matchServiceMock: jasmine.SpyObj<MatchService>;
    let routerMock: jasmine.SpyObj<Router>;
    let service: WaitingRoomSocketService;

    beforeEach(() => {
        roomCreatedSubject = new Subject();
        roomUpdatedSubject = new Subject();
        gameStartedSubject = new Subject();
        youWereKickedSubject = new Subject();
        organizerLeftSubject = new Subject();

        socketServiceMock = jasmine.createSpyObj('MatchSocketService', ['on', 'send', 'disconnect']);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socketServiceMock.on.and.callFake((event: string): any => {
            switch (event) {
                case WaitingRoomEvents.RoomCreated: return roomCreatedSubject.asObservable();
                case WaitingRoomEvents.RoomUpdated: return roomUpdatedSubject.asObservable();
                case WaitingRoomEvents.GameStarted: return gameStartedSubject.asObservable();
                case WaitingRoomEvents.YouWereKicked: return youWereKickedSubject.asObservable();
                case WaitingRoomEvents.OrganizerLeft: return organizerLeftSubject.asObservable();
                default: return new Subject().asObservable();
            }
        });

        stateServiceMock = jasmine.createSpyObj('WaitingRoomStateService', [
            'setRoomId', 'setRoom', 'setCurrentPlayerId', 'reset', 'currentPlayerId',
        ]);
        stateServiceMock.currentPlayerId.and.returnValue('');

        chatStateMock = jasmine.createSpyObj('ChatStateService', ['reset']);

        matchServiceMock = jasmine.createSpyObj('MatchService', ['setGameState']);
        Object.defineProperty(matchServiceMock, 'currentPlayerId', {
            set: jasmine.createSpy('currentPlayerId setter'),
            get: jasmine.createSpy('currentPlayerId getter').and.returnValue(''),
            configurable: true,
        });

        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                WaitingRoomSocketService,
                { provide: MatchSocketService, useValue: socketServiceMock },
                { provide: WaitingRoomStateService, useValue: stateServiceMock },
                { provide: ChatStateService, useValue: chatStateMock },
                { provide: MatchService, useValue: matchServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        });

        service = TestBed.inject(WaitingRoomSocketService);
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    it('devrait être défini', () => {
        expect(service).toBeDefined();
    });

    // ── Événements entrants ───────────────────────────────────────────────────

    describe('RoomCreated', () => {
        it('devrait appeler stateService.setRoomId avec le roomId reçu', () => {
            roomCreatedSubject.next({ roomId: 'room-abc', playerId: 'p1' });

            expect(stateServiceMock.setRoomId).toHaveBeenCalledWith('room-abc');
        });

        it('devrait appeler stateService.setCurrentPlayerId avec le playerId reçu', () => {
            roomCreatedSubject.next({ roomId: 'room-abc', playerId: 'p1' });

            expect(stateServiceMock.setCurrentPlayerId).toHaveBeenCalledWith('p1');
        });
    });

    describe('RoomUpdated', () => {
        it('devrait appeler stateService.setRoom avec le payload complet', () => {
            const payload: RoomUpdatedPayload = {
                players: [makePlayer('p1', 'Alice')],
                isLocked: false,
                maxPlayers: 4,
                organizerId: 'p1',
                gameMode: GameMode.CLASSIC,
                gameName: 'Test',
            };

            roomUpdatedSubject.next(payload);

            expect(stateServiceMock.setRoom).toHaveBeenCalledWith(payload);
        });
    });

    describe('GameStarted', () => {
        it('devrait naviguer vers /game-view-page', () => {
            const payload: GameStatePayload = {
                players: [makePlayer('p1', 'Alice')],
                activePlayerIndex: 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                grid: [] as any,
                turnNumber: 1,
            };

            gameStartedSubject.next(payload);

            expect(routerMock.navigate).toHaveBeenCalledWith(['/game-view-page']);
        });

        it('devrait appeler matchService.setGameState avec le payload', () => {
            const payload: GameStatePayload = {
                players: [makePlayer('p1', 'Alice')],
                activePlayerIndex: 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                grid: [] as any,
                turnNumber: 1,
            };

            gameStartedSubject.next(payload);

            expect(matchServiceMock.setGameState).toHaveBeenCalledWith(payload);
        });

        it('devrait mettre isGameStarting à true', () => {
            const payload: GameStatePayload = {
                players: [],
                activePlayerIndex: 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                grid: [] as any,
                turnNumber: 1,
            };

            gameStartedSubject.next(payload);

            expect(service.isGameStarting).toBeTrue();
        });
    });

    describe('YouWereKicked', () => {
        it('devrait reset le state et naviguer vers /home avec notification', () => {
            youWereKickedSubject.next({ message: 'expelled' });

            expect(stateServiceMock.reset).toHaveBeenCalled();
            expect(chatStateMock.reset).toHaveBeenCalled();
            expect(routerMock.navigate).toHaveBeenCalledWith(
                ['/home'],
                { state: { notification: WAITING_ROOM_MESSAGES.YOU_WERE_KICKED } },
            );
        });
    });

    describe('OrganizerLeft', () => {
        it('devrait reset le state et naviguer vers /home avec notification', () => {
            organizerLeftSubject.next({ message: 'org left' });

            expect(stateServiceMock.reset).toHaveBeenCalled();
            expect(routerMock.navigate).toHaveBeenCalledWith(
                ['/home'],
                { state: { notification: WAITING_ROOM_MESSAGES.ORGANIZER_LEFT } },
            );
        });
    });

    // ── Méthodes d'émission ───────────────────────────────────────────────────

    describe('createRoom()', () => {
        it('devrait envoyer CreateRoom avec le player et le gameId', () => {
            const player = makePlayer('p1', 'Alice');

            service.createRoom(player, 'game-1');

            expect(socketServiceMock.send).toHaveBeenCalledWith(
                WaitingRoomEvents.CreateRoom,
                { player, gameId: 'game-1' },
            );
        });
    });

    describe('joinRoom()', () => {
        it('devrait envoyer JoinRoom avec le player et le roomId', () => {
            const player = makePlayer('p2', 'Bob');

            service.joinRoom(player, 'room-1');

            expect(socketServiceMock.send).toHaveBeenCalledWith(
                WaitingRoomEvents.JoinRoom,
                { player, roomId: 'room-1' },
            );
        });
    });

    describe('kickPlayer()', () => {
        it('devrait envoyer KickPlayer avec roomId et targetPlayerId', () => {
            service.kickPlayer('room-1', 'p2');

            expect(socketServiceMock.send).toHaveBeenCalledWith(
                WaitingRoomEvents.KickPlayer,
                { roomId: 'room-1', targetPlayerId: 'p2' },
            );
        });
    });

    describe('leaveRoom()', () => {
        it('devrait envoyer LeaveRoom avec le roomId', () => {
            service.leaveRoom('room-1');

            expect(socketServiceMock.send).toHaveBeenCalledWith(WaitingRoomEvents.LeaveRoom, 'room-1');
        });
    });

    describe('startGame()', () => {
        it('devrait envoyer StartGame avec le roomId', () => {
            service.startGame('room-1');

            expect(socketServiceMock.send).toHaveBeenCalledWith(WaitingRoomEvents.StartGame, 'room-1');
        });
    });

    describe('getAvailableRooms()', () => {
        it('devrait envoyer GetAvailableRooms', () => {
            service.getAvailableRooms();

            expect(socketServiceMock.send).toHaveBeenCalledWith(WaitingRoomEvents.GetAvailableRooms, undefined);
        });
    });

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    describe('ngOnDestroy()', () => {
        // CAS LIMITE : événement reçu après destroy → ignoré
        it('devrait ignorer les événements reçus après destroy', () => {
            service.ngOnDestroy();
            const callsBefore = stateServiceMock.reset.calls.count();

            youWereKickedSubject.next({ message: 'test' });

            expect(stateServiceMock.reset.calls.count()).toBe(callsBefore);
        });

        // CAS LIMITE : ngOnDestroy appelé deux fois → pas de crash
        it('ne devrait pas planter si appelé deux fois', () => {
            expect(() => {
                service.ngOnDestroy();
                service.ngOnDestroy();
            }).not.toThrow();
        });
    });
});
