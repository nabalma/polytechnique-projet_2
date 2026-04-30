/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines-per-function */

// Les donnees ou des constantes utilisées dans les tests sont définies dans le fichier de test lui-même pour une meilleure lisibilité et maintenabilité.
/**
 * STRATÉGIE DE TEST — WaitingRoomStateService
 *
 * Objectif : Valider que les signals Angular réagissent correctement
 *            aux mutations d'état de la salle d'attente.
 *
 * Approche :
 * - Tests unitaires sans TestBed (service instancié directement)
 * - Les signals sont lus via leur fonction d'accès ()
 * - Chaque test utilise une nouvelle instance via beforeEach
 *
 * Cas limites couverts :
 * - reset() remet toutes les valeurs à leurs défauts (DEFAULT_MAX_PLAYERS=2)
 * - isFull : players.length = maxPlayers → true (frontière exacte)
 * - isFull : players.length = maxPlayers - 1 → false
 * - removePlayer avec id inexistant → pas de crash, liste inchangée
 * - setRoom écrase complètement l'état précédent
 */

import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { WaitingRoomStateService } from './waiting-room-state.service';

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
    startPosition: { x: 0, y: 0 },
    hasFlag: false,
    wins: 0,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WaitingRoomStateService', () => {
    let service: WaitingRoomStateService;

    beforeEach(() => {
        service = new WaitingRoomStateService();
    });

    // ── setRoom ───────────────────────────────────────────────────────────────

    describe('setRoom()', () => {
        it('devrait mettre à jour players, isLocked, maxPlayers et organizerId', () => {
            const p1 = makePlayer('p1', 'Alice');
            const p2 = makePlayer('p2', 'Bob');

            service.setRoom({ players: [p1, p2], isLocked: true, maxPlayers: 4, organizerId: 'p1' });

            expect(service.players().length).toBe(2);
            expect(service.isLocked()).toBeTrue();
            expect(service.maxPlayers()).toBe(4);
            expect(service.organizerId()).toBe('p1');
        });

        // CAS LIMITE : écrase entièrement l'état précédent
        it('devrait écraser complètement l\'état précédent', () => {
            service.setRoom({ players: [makePlayer('p1', 'Alice')], isLocked: false, maxPlayers: 2, organizerId: 'p1' });
            service.setRoom({ players: [], isLocked: true, maxPlayers: 4, organizerId: 'p2' });

            expect(service.players().length).toBe(0);
            expect(service.organizerId()).toBe('p2');
            expect(service.maxPlayers()).toBe(4);
        });
    });

    // ── setRoomId ─────────────────────────────────────────────────────────────

    describe('setRoomId()', () => {
        it('devrait mettre à jour le roomId', () => {
            service.setRoomId('room-abc');

            expect(service.roomId()).toBe('room-abc');
        });
    });

    // ── setCurrentPlayer / setCurrentPlayerId ─────────────────────────────────

    describe('setCurrentPlayer() et setCurrentPlayerId()', () => {
        it('devrait stocker le joueur courant et son id', () => {
            const player = makePlayer('p1', 'Alice');

            service.setCurrentPlayer(player);
            service.setCurrentPlayerId('p1');

            expect(service.currentPlayer()?.name).toBe('Alice');
            expect(service.currentPlayerId()).toBe('p1');
        });
    });

    // ── setGameDbId ───────────────────────────────────────────────────────────

    describe('setGameDbId()', () => {
        it('devrait mettre à jour le gameDbId', () => {
            service.setGameDbId('game-xyz');

            expect(service.gameDbId()).toBe('game-xyz');
        });
    });

    // ── addPlayer ─────────────────────────────────────────────────────────────

    describe('addPlayer()', () => {
        it('devrait ajouter un joueur à la fin de la liste', () => {
            service.setRoom({ players: [makePlayer('p1', 'Alice')], isLocked: false, maxPlayers: 4, organizerId: 'p1' });

            service.addPlayer(makePlayer('p2', 'Bob'));

            expect(service.players().length).toBe(2);
            expect(service.players()[1].name).toBe('Bob');
        });
    });

    // ── removePlayer ──────────────────────────────────────────────────────────

    describe('removePlayer()', () => {
        it('devrait retirer le joueur par id', () => {
            service.setRoom({
                players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')],
                isLocked: false,
                maxPlayers: 4,
                organizerId: 'p1',
            });

            service.removePlayer('p2');

            expect(service.players().length).toBe(1);
            expect(service.players()[0].id).toBe('p1');
        });

        // CAS LIMITE : id inexistant → pas de crash, liste inchangée
        it('ne devrait pas planter si l\'id n\'existe pas', () => {
            service.setRoom({ players: [makePlayer('p1', 'Alice')], isLocked: false, maxPlayers: 4, organizerId: 'p1' });

            service.removePlayer('id-inexistant');

            expect(service.players().length).toBe(1);
        });
    });

    // ── setLocked ─────────────────────────────────────────────────────────────

    describe('setLocked()', () => {
        it('devrait verrouiller et déverrouiller', () => {
            service.setLocked(true);
            expect(service.isLocked()).toBeTrue();

            service.setLocked(false);
            expect(service.isLocked()).toBeFalse();
        });
    });

    // ── reset ─────────────────────────────────────────────────────────────────

    describe('reset()', () => {
        it('devrait remettre tous les signals à leurs valeurs par défaut', () => {
            service.setRoom({ players: [makePlayer('p1', 'Alice')], isLocked: true, maxPlayers: 4, organizerId: 'p1', gameMode: GameMode.CTF });
            service.setRoomId('room-abc');
            service.setCurrentPlayerId('p1');
            service.setGameDbId('game-xyz');

            service.reset();

            expect(service.players().length).toBe(0);
            expect(service.isLocked()).toBeFalse();
            expect(service.maxPlayers()).toBe(2); // DEFAULT_MAX_PLAYERS
            expect(service.roomId()).toBe('');
            expect(service.organizerId()).toBe('');
            expect(service.currentPlayerId()).toBe('');
            expect(service.currentPlayer()).toBeNull();
            expect(service.gameDbId()).toBe('');
            expect(service.gameMode()).toBe(GameMode.CLASSIC);
        });
    });

    // ── computed : isFull ─────────────────────────────────────────────────────

    describe('isFull (computed)', () => {
        it('devrait retourner true quand players.length >= maxPlayers', () => {
            service.setRoom({
                players: [makePlayer('p1', 'Alice'), makePlayer('p2', 'Bob')],
                isLocked: false,
                maxPlayers: 2,
                organizerId: 'p1',
            });

            expect(service.isFull()).toBeTrue();
        });

        // CAS LIMITE : players.length = maxPlayers - 1 → false
        it('devrait retourner false quand players.length < maxPlayers', () => {
            service.setRoom({
                players: [makePlayer('p1', 'Alice')],
                isLocked: false,
                maxPlayers: 2,
                organizerId: 'p1',
            });

            expect(service.isFull()).toBeFalse();
        });

        // CAS LIMITE : liste vide → false
        it('devrait retourner false quand la liste est vide', () => {
            expect(service.isFull()).toBeFalse();
        });
    });

    // ── computed : playerCount ────────────────────────────────────────────────

    describe('playerCount (computed)', () => {
        it('devrait retourner le nombre exact de joueurs', () => {
            service.setRoom({
                players: [makePlayer('p1', 'A'), makePlayer('p2', 'B'), makePlayer('p3', 'C')],
                isLocked: false,
                maxPlayers: 4,
                organizerId: 'p1',
            });

            expect(service.playerCount()).toBe(3);
        });

        // CAS LIMITE : liste vide → 0
        it('devrait retourner 0 si la liste est vide', () => {
            expect(service.playerCount()).toBe(0);
        });
    });
});
