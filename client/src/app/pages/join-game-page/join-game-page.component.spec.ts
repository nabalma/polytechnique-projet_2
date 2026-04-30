
/* eslint-disable max-lines-per-function */
/*
 * Dans ce fichier de test Jasmine, le beforeEach configure un TestBed complet avec plusieurs
 * providers et un overrideComponent, ce qui est inévitablement long. Le describe englobant
 * regroupe tous les cas de test du composant JoinGamePage pour qu'ils partagent le même
 * environnement de test. Fragmenter ce fichier dégraderait la cohérence des tests sans
 * apporter de gain réel, on choisit donc de désactiver max-lines-per-function ici.
 */
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { JoinGameService } from '@app/services/join-game/join-game.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { JoinWaitingRoomState } from '@app/services/join-waiting-room/join-waiting-room.service';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { signal } from '@angular/core';
import { JoinGamePageComponent } from './join-game-page.component';

// ─── Données de test ──────────────────────────────────────────────────────────

const mockGameMap = { id: 1, gridSize: GridSize.SMALL, grid: [] };

const mockRoom1: AvailableRoomInfo = {
    roomId: 'room-1',
    gameId: 'game-1',
    gameName: 'Partie Alpha',
    currentPlayers: 1,
    maxPlayers: 4,
    takenAvatars: ['avatar1.png'],
    roomPlayers: [{ name: 'Alice', avatar: 'avatar1.png' }],
    gameMap: mockGameMap,
};

const mockRoom2: AvailableRoomInfo = {
    roomId: 'room-2',
    gameId: 'game-2',
    gameName: 'Partie Beta',
    currentPlayers: 2,
    maxPlayers: 4,
    takenAvatars: ['avatar2.png', 'avatar3.png'],
    roomPlayers: [
        { name: 'Bob', avatar: 'avatar2.png' },
        { name: 'Carol', avatar: 'avatar3.png' },
    ],
    gameMap: mockGameMap,
};

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockMatchService = {
    players: signal(new Map()),
    reachableCells: signal([]),
    actionMode: false,
    isMyTurn: () => false,
    currentPlayer: undefined,
    selectedCell: null,
    currentPlayerId: '',
    activePlayerId: '',
    getAvatar: () => '',
};

const mockMapService = {
    init: jasmine.createSpy('init').and.returnValue(Promise.resolve()),
    getFlatIndex: () => -1,
};

describe('JoinGameComponent', () => {
    let component: JoinGamePageComponent;
    let fixture: ComponentFixture<JoinGamePageComponent>;
    let router: Router;
    let mockJoinGameService: {
        getAllAvailableRooms: jasmine.Spy;
        disconnect: jasmine.Spy;
        connect: jasmine.Spy;
        selectedRoom: AvailableRoomInfo | undefined;
        navigateToHome: jasmine.Spy;
        rooms: jasmine.Spy;
    };
    let mockJoinWaitingRoomState: { setWaitingRoom: jasmine.Spy };

    beforeEach(async () => {
        mockJoinGameService = {
            getAllAvailableRooms: jasmine.createSpy('getAllAvailableRooms'),
            disconnect: jasmine.createSpy('disconnect'),
            connect: jasmine.createSpy('connect').and.returnValue(Promise.resolve()),
            selectedRoom: undefined,
            navigateToHome: jasmine.createSpy('navigateToHome'),
            rooms: jasmine.createSpy('rooms').and.returnValue([]),
        };

        mockJoinWaitingRoomState = {
            setWaitingRoom: jasmine.createSpy('setWaitingRoom'),
        };

        await TestBed.configureTestingModule({
            imports: [JoinGamePageComponent],
            providers: [
                provideRouter([]),
                { provide: JoinGameService, useValue: mockJoinGameService },
                { provide: JoinWaitingRoomState, useValue: mockJoinWaitingRoomState },
                { provide: MatchService, useValue: mockMatchService },
                { provide: MapService, useValue: mockMapService },
            ],
        })
            .overrideComponent(JoinGamePageComponent, {
                set: { providers: [{ provide: JoinGameService, useValue: mockJoinGameService }] },
            })
            .compileComponents();

        router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        fixture = TestBed.createComponent(JoinGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('ngOnInit()', () => {
        it('doit appeler connect() et getAllAvailableRooms()', fakeAsync(() => {
            mockJoinGameService.connect.calls.reset();
            mockJoinGameService.getAllAvailableRooms.calls.reset();

            component.ngOnInit();
            flushMicrotasks();

            expect(mockJoinGameService.connect).toHaveBeenCalled();
            expect(mockJoinGameService.getAllAvailableRooms).toHaveBeenCalledTimes(1);
        }));
    });

    describe('ngOnDestroy()', () => {
        it('doit appeler disconnect()', () => {
            component.ngOnDestroy();
            expect(mockJoinGameService.disconnect).toHaveBeenCalled();
        });
    });

    describe('selectRoom()', () => {
        it('doit définir selectedRoom sur la room passée en paramètre', () => {
            component.selectRoom(mockRoom1);

            expect(mockJoinGameService.selectedRoom).toBe(mockRoom1);
        });

        it('doit changer selectedRoom quand une autre room est sélectionnée', () => {
            component.selectRoom(mockRoom1);
            component.selectRoom(mockRoom2);

            expect(mockJoinGameService.selectedRoom?.roomId).toBe('room-2');
        });
    });

    describe('join(room)', () => {
        it('doit naviguer vers /creation', () => {
            component.join(mockRoom1);
            expect(mockJoinWaitingRoomState.setWaitingRoom).toHaveBeenCalledWith(mockRoom1.roomId, mockRoom1.takenAvatars, mockRoom1.gameId);
            expect(router.navigate).toHaveBeenCalledWith(['/creation']);
        });
    });

    describe('Rendu du template', () => {
        it("doit afficher le message vide quand il n'y a aucune room", () => {
            const message = fixture.nativeElement.querySelector('.empty-message');
            expect(message).toBeTruthy();
            expect(message.textContent).toContain('Aucune partie disponible');
        });

        it("ne doit pas afficher app-room-preview quand aucune room n'est sélectionnée", () => {
            const preview = fixture.nativeElement.querySelector('app-room-preview');
            expect(preview).toBeFalsy();
        });
    });

    describe('navigateBack()', () => {
        it('doit naviguer vers /home', () => {
            component.navigateBack();

            expect(mockJoinGameService.navigateToHome).toHaveBeenCalled();
        });
    });
});
