
/* eslint-disable max-lines-per-function */
/*
 * Le describe principal de JoinGameService regroupe tous les scénarios du service
 * (navigation, connexion socket, écoute des événements) sous un même beforeEach.
 * Ce beforeEach doit reconfigurer le TestBed et réinitialiser les subjects RxJS à
 * chaque test, ce qui le rend structurellement long. Découper en sous-fichiers
 * cacherait les dépendances entre les tests, on désactive donc max-lines-per-function.
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { Subject } from 'rxjs';
import { GameSocketService } from '@app/services/socket/game/game-socket.service';
import { JoinGameService } from './join-game.service';


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

interface JoinGameServicePrivate {
    subscriptions: { unsubscribe(): void }[];
}

describe('JoinGameService', () => {
    let router: Router;
    let joinGameService: JoinGameService;
    let roomsAvailableSubject: Subject<{ rooms: AvailableRoomInfo[] }>;
    let newRoomsSubject: Subject<AvailableRoomInfo[]>;

    const spySub1 = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    const spySub2 = jasmine.createSpyObj('Subscription', ['unsubscribe']);

    const mockGameSocketService = {
        on: jasmine.createSpy('on').and.returnValue(new Subject().asObservable()),
        send: jasmine.createSpy('send'),
        disconnect: jasmine.createSpy('disconnect'),
        connect: jasmine.createSpy('connect'),
        onRoomsAvailable: jasmine.createSpy('onRoomsAvailable'),
        onNewRoomsInformation: jasmine.createSpy('onNewRoomsInformation'),
    };

    beforeEach(async () => {
        roomsAvailableSubject = new Subject();
        newRoomsSubject = new Subject();

        mockGameSocketService.onRoomsAvailable.and.returnValue(roomsAvailableSubject.asObservable());
        mockGameSocketService.onNewRoomsInformation.and.returnValue(newRoomsSubject.asObservable());

        await TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: GameSocketService, useValue: mockGameSocketService },
            ],
        });
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');

        joinGameService = TestBed.inject(JoinGameService);

        /** eslint-disable ceci c'est pour pouvoir tester la fonction
         * disconnect
         */
        (joinGameService as unknown as JoinGameServicePrivate).subscriptions = [spySub1, spySub2];
    });

    describe('navigateToRoom', () => {
        it('doit naviguer vers /creation', () => {
            joinGameService.navigateToRoom();

            expect(router.navigate).toHaveBeenCalledWith(['/creation']);
        });
    });

    describe('navigateToHome', () => {
        it('doit naviguer vers /home', () => {
            joinGameService.navigateToHome();
            expect(router.navigate).toHaveBeenCalledWith(['/home']);
        });
    });

    describe('getAllAvailableRooms', () => {
        it('doit envoyer un GetAvailableRooms', () => {
            joinGameService.getAllAvailableRooms();
            expect(mockGameSocketService.send).toHaveBeenCalled();
        });
    });

    describe('connect', () => {
        it('connect() doit appeler certaines fonctions', async () => {
            spyOn(joinGameService, 'listenToSocketEvents');
            await joinGameService.connect();
            expect(mockGameSocketService.connect).toHaveBeenCalled();
            expect(joinGameService.listenToSocketEvents).toHaveBeenCalled();
        });
    });

    describe('disconnect', () => {
        it('verifier la taille des subscriptions et que le socketService est deconnecté', () => {
            joinGameService.disconnect();

            expect(spySub1.unsubscribe).toHaveBeenCalled();
            expect(spySub2.unsubscribe).toHaveBeenCalled();
            /** eslint-disable ceci c'est pour pouvoir tester la fonction
       * disconnect puisqu subscription est private
       */
            expect((joinGameService as unknown as JoinGameServicePrivate).subscriptions.length).toBe(0);
            expect(mockGameSocketService.disconnect).toHaveBeenCalled();
        });
    });

    describe('listenToSocketEvents', () => {
        it('doit ecouter et recevoir les rooms disponibles', () => {
            const mockRoomsList = [mockRoom1];
            spyOn(joinGameService.rooms, 'set');

            (joinGameService as unknown as JoinGameServicePrivate).subscriptions = [];
            joinGameService.listenToSocketEvents();
            roomsAvailableSubject.next({ rooms: mockRoomsList });

            /** eslint-disable ceci c'est pour pouvoir tester la fonction
     * listenToSocketEvents puisqu subscription est private
     */
            expect((joinGameService as unknown as JoinGameServicePrivate).subscriptions.length).toBe(2);
            expect(joinGameService.rooms.set).toHaveBeenCalledWith(mockRoomsList);
        });

        it('doit mettre à jour les rooms lors de nouveaux événements newRoomsInformation', () => {
            spyOn(joinGameService.rooms, 'set');

            (joinGameService as unknown as JoinGameServicePrivate).subscriptions = [];
            joinGameService.listenToSocketEvents();
            const updatedRooms = [mockRoom1, mockRoom2];
            newRoomsSubject.next(updatedRooms);
            expect(joinGameService.rooms.set).toHaveBeenCalledWith(updatedRooms);
        });

    });
});
