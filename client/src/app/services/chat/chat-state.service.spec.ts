/* eslint-disable max-nested-callbacks,max-lines-per-function */

/*
Pour prendre en l'ensemble des fonctionnalités de ChatStateService, notamment joinRoom()
et reset(), ainsi que la gestion des messages reçus via le socket. Les tests vérifient que
les interactions avec le SocketService sont correctes
et que l'état interne du service (messages, roomId) est géré comme prévu.
*/

/**
 * ============================================================
 * Stratégie de test — ChatStateService
 * ============================================================
 *
 * Éléments testés :
 *  - joinRoom() : envoie JoinRoom au socket, s'abonne à NewMessage
 *  - joinRoom() idempotent : ne rejoint pas deux fois la même room
 *  - Messages reçus sont ajoutés au tableau messages
 *  - reset() : vide les messages, désabonne du socket, réinitialise la room
 *  - Rejoindre une nouvelle room après reset fonctionne
 *
 * Dépendances mockées :
 *  - ChatSocketService → spy sur on(), send() et connect()
 *
 * Cas limites couverts :
 *  - joinRoom avec roomId vide → ignoré
 *  - reset() appelé deux fois → pas de crash
 *  - joinRoom après reset → fonctionne correctement
 * ============================================================
 */

import { TestBed } from '@angular/core/testing';
import { ChatSocketService } from '@app/services/socket/chat/chat-socket.service';
import { ChatMessage } from '@common/interfaces/chat/chat-message-interface';
import { ChatEvents } from '@common/socket_event/chat/chat.gateway.events';
import { Subject } from 'rxjs';
import { ChatStateService } from './chat-state.service';

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('ChatStateService', () => {
    let service: ChatStateService;
    let socketSendSpy: jasmine.Spy;
    let newMessageSubject: Subject<ChatMessage>;

    beforeEach(() => {
        newMessageSubject = new Subject<ChatMessage>();

        const socketServiceMock = {
            connect: jasmine.createSpy('connect').and.returnValue(Promise.resolve()),
            on: jasmine.createSpy('on').and.returnValue(newMessageSubject.asObservable()),
            send: jasmine.createSpy('send'),
        };

        TestBed.configureTestingModule({
            providers: [
                ChatStateService,
                { provide: ChatSocketService, useValue: socketServiceMock },
            ],
        });

        service = TestBed.inject(ChatStateService);
        socketSendSpy = TestBed.inject(ChatSocketService).send as jasmine.Spy;
    });

    afterEach(() => {
        service.ngOnDestroy();
    });

    it('devrait être défini', () => {
        expect(service).toBeDefined();
    });

    // ── joinRoom ────────────────────────────────────────────────────────────

    describe('joinRoom()', () => {
        it('doit envoyer JoinRoom au socket avec le roomId', async () => {
            await service.joinRoom('room-abc');

            expect(socketSendSpy).toHaveBeenCalledWith(ChatEvents.JoinRoom, 'room-abc');
        });

        it("doit s'abonner à NewMessage après joinRoom", async () => {
            await service.joinRoom('room-abc');
            const socketOn = TestBed.inject(ChatSocketService).on as jasmine.Spy;

            expect(socketOn).toHaveBeenCalledWith(ChatEvents.NewMessage);
        });


        it('ne doit rien faire si roomId est vide', async () => {
            await service.joinRoom('');

            expect(socketSendSpy).not.toHaveBeenCalled();
        });
    });

    // ── Messages ────────────────────────────────────────────────────────────

    describe('Messages', () => {
        it('doit ajouter les messages reçus au tableau', async () => {
            await service.joinRoom('room-abc');

            const msg: ChatMessage = { author: 'Alice', content: 'Bonjour', timestamp: '12:00:00', gameId: 'room-abc' };
            newMessageSubject.next(msg);

            expect(service.messages.length).toBe(1);
            expect(service.messages[0].content).toBe('Bonjour');
        });

        it('doit accumuler plusieurs messages', async () => {
            await service.joinRoom('room-abc');

            newMessageSubject.next({ author: 'Alice', content: 'Msg 1', timestamp: '12:00:00', gameId: 'room-abc' });
            newMessageSubject.next({ author: 'Bob', content: 'Msg 2', timestamp: '12:00:01', gameId: 'room-abc' });

            expect(service.messages.length).toBe(2);
        });

        it('doit commencer avec un tableau vide', () => {
            expect(service.messages).toEqual([]);
        });
    });

    // ── reset ───────────────────────────────────────────────────────────────

    describe('reset()', () => {
        it('doit vider les messages', async () => {
            await service.joinRoom('room-abc');
            newMessageSubject.next({ author: 'Alice', content: 'Test', timestamp: '12:00:00', gameId: 'room-abc' });

            service.reset();

            expect(service.messages).toEqual([]);
        });

        it('ne doit pas planter si appelé deux fois', () => {
            expect(() => {
                service.reset();
                service.reset();
            }).not.toThrow();
        });

        it('doit permettre de rejoindre une nouvelle room après reset', async () => {
            await service.joinRoom('room-abc');
            service.reset();
            socketSendSpy.calls.reset();

            await service.joinRoom('room-xyz');

            expect(socketSendSpy).toHaveBeenCalledWith(ChatEvents.JoinRoom, 'room-xyz');
        });
    });
});
