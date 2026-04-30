/* eslint-disable max-lines-per-function, max-nested-callbacks, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */

/**
 * STRATÉGIE DE TEST — WaitingRoomService
 *
 * Objectif : Valider la logique de gestion des salles d'attente côté serveur.
 *
 * Approche :
 * - Tests unitaires purs, sans base de données réelle
 * - gameModel Mongoose mocké avec jest.fn()
 * - Chaque test repart d'un état propre via beforeEach (nouvelle instance)
 * - Couverture des cas normaux ET cas limites pour chaque méthode publique
 *
 * Cas limites couverts :
 * - roomId inexistant → retours sûrs sans crash
 * - Room verrouillée ou pleine → joinRoom bloqué
 * - Noms dupliqués → suffixe -2, puis -3 si -2 pris
 * - Départ de l'organisateur → room supprimée
 * - Déverrouillage automatique après leaveRoom / kickPlayer
 * - Jeu sans START_POINT → fallback maxPlayers=2
 * - Jeu null retourné par Mongoose → fallback maxPlayers=2
 */

import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { WaitingRoomService } from './waiting-room.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePlayer = (id: string, name: string, avatar = 'avatar.png'): Player => ({
    id,
    name,
    roomId: '',
    avatar,
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

const makeGameWithStartPoints = (count: number) => ({
    name: 'Jeu test',
    grid: {
        grid: Array.from({ length: count }, () => [{ objects: { objectType: 'START_POINT' } }]),
    },
});

const makeService = (gameMock: unknown = makeGameWithStartPoints(2)) => {
    const gameModel = {
        findById: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(gameMock),
        }),
    };
    const playerService = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addPlayer: (player: any) => player as Player,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new WaitingRoomService(gameModel as any, playerService as any, {} as any, {} as any, {} as any);;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WaitingRoomService', () => {

    // ── createRoom ─────────────────────────────────────────────────────────

    describe('createRoom()', () => {
        it("devrait créer une room avec l'organisateur en premier dans players[]", async () => {
            const service = makeService();
            const player = makePlayer('p1', 'Alice');

            const { roomId } = await service.createRoom('socket-1', player, 'game-1');
            const room = service.getRoomById(roomId);

            expect(room).toBeDefined();
            expect(room!.players[0]).toEqual(player);
            expect(room!.organizerId).toBe('p1');
        });

        it('devrait calculer maxPlayers selon le nombre de START_POINT', async () => {
            const service = makeService(makeGameWithStartPoints(4));
            const player = makePlayer('p1', 'Alice');

            const { maxPlayers } = await service.createRoom('socket-1', player, 'game-1');

            expect(maxPlayers).toBe(4);
        });

        it('devrait enregistrer le socketId dans socketRooms', async () => {
            const service = makeService();
            const { roomId } = await service.createRoom('socket-1', makePlayer('p1', 'Alice'), 'game-1');

            expect(service.getRoomForSocket('socket-1')?.roomId).toBe(roomId);
        });

        // CAS LIMITE : jeu sans START_POINT → fallback 2
        it('devrait retourner maxPlayers=2 si le jeu na aucun START_POINT', async () => {
            const service = makeService({ name: 'Vide', grid: { grid: [[{ objects: {} }]] } });

            const { maxPlayers } = await service.createRoom('s1', makePlayer('p1', 'Alice'), 'g1');

            expect(maxPlayers).toBe(2);
        });

        // CAS LIMITE : Mongoose retourne null
        it('devrait retourner maxPlayers=2 si le jeu est null', async () => {
            const service = makeService(null);

            const { maxPlayers } = await service.createRoom('s1', makePlayer('p1', 'Alice'), 'g1');

            expect(maxPlayers).toBe(2);
        });
    });

    // ── joinRoom ───────────────────────────────────────────────────────────

    describe('joinRoom()', () => {
        let service: WaitingRoomService;
        let roomId: string;

        beforeEach(async () => {
            service = makeService(makeGameWithStartPoints(4));
            const { roomId: rid } = await service.createRoom('s-org', makePlayer('org', 'Org'), 'g1');
            roomId = rid;
        });

        it('devrait retourner "ok" et ajouter le joueur en fin de liste', () => {
            const result = service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId);
            const room = service.getRoomById(roomId);

            expect(result).toBe('ok');
            expect(room!.players[1].name).toBe('Bob');
        });

        // CAS LIMITE : roomId inexistant
        it('devrait retourner "not-found" si la room nexiste pas', () => {
            expect(service.joinRoom('sx', makePlayer('px', 'X'), 'inexistant')).toBe('not-found');
        });

        it('devrait retourner "locked" si la room est verrouillée', () => {
            service.setLocked(roomId, true);
            expect(service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId)).toBe('locked');
        });

        // CAS LIMITE : exactement maxPlayers atteint → locked (auto-lock s'active quand la room est pleine)
        it('devrait retourner "locked" quand la room est pleine (auto-lock)', async () => {
            const localService = makeService(makeGameWithStartPoints(2));
            const { roomId: rid } = await localService.createRoom('s-org', makePlayer('org', 'Org'), 'g');
            localService.joinRoom('s2', makePlayer('p2', 'Bob'), rid);

            expect(localService.joinRoom('s3', makePlayer('p3', 'Charlie'), rid)).toBe('locked');
        });

        // CAS LIMITE : maxPlayers - 1 → encore de la place
        it('devrait retourner "ok" si players.length < maxPlayers', () => {
            expect(service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId)).toBe('ok');
        });

        it('devrait verrouiller automatiquement la room quand maxPlayers est atteint', async () => {
            const localService = makeService(makeGameWithStartPoints(2));
            const { roomId: rid } = await localService.createRoom('s-org', makePlayer('org', 'Org'), 'g');
            localService.joinRoom('s2', makePlayer('p2', 'Bob'), rid);

            expect(localService.getRoomById(rid)!.isLocked).toBe(true);
        });

        // CAS LIMITE : nom dupliqué → suffixe -2
        it('devrait ajouter le suffixe -2 si le nom est déjà pris', () => {
            service.joinRoom('s2', makePlayer('p2', 'Org'), roomId);
            const room = service.getRoomById(roomId);

            expect(room!.players[1].name).toBe('Org-2');
        });

        // CAS LIMITE : -2 déjà pris → -3
        it('devrait ajouter le suffixe -3 si -2 est déjà pris', () => {
            service.joinRoom('s2', makePlayer('p2', 'Org'), roomId);
            service.joinRoom('s3', makePlayer('p3', 'Org'), roomId);
            const room = service.getRoomById(roomId);

            expect(room!.players[2].name).toBe('Org-3');
        });
    });

    // ── leaveRoom ──────────────────────────────────────────────────────────

    describe('leaveRoom()', () => {
        let service: WaitingRoomService;
        let roomId: string;

        beforeEach(async () => {
            service = makeService(makeGameWithStartPoints(4));
            const { roomId: rid } = await service.createRoom('s-org', makePlayer('org', 'Org'), 'g1');
            roomId = rid;
            service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId);
        });

        it('devrait retirer le joueur sans supprimer la room si non-organisateur', () => {
            service.leaveRoom('s2', roomId);
            const room = service.getRoomById(roomId);

            expect(room).toBeDefined();
            expect(room!.players.length).toBe(1);
            expect(room!.players[0].id).toBe('org');
        });

        it("devrait supprimer la room et retourner wasOrganizer=true si l'organisateur part", () => {
            const result = service.leaveRoom('s-org', roomId);

            expect(result.wasOrganizer).toBe(true);
            expect(service.getRoomById(roomId)).toBeUndefined();
        });

        it('devrait retourner wasOrganizer=false si non-organisateur part', () => {
            const result = service.leaveRoom('s2', roomId);

            expect(result.wasOrganizer).toBe(false);
            expect(result.room).toBeDefined();
        });

        // CAS LIMITE : socketId inconnu → pas de crash
        it('ne devrait pas planter si socketId inconnu', () => {
            const result = service.leaveRoom('socket-inconnu', roomId);

            expect(result.wasOrganizer).toBe(false);
        });

        // CAS LIMITE : déverrouillage automatique après départ
        it('devrait déverrouiller la room si elle était verrouillée et quun joueur part', () => {
            service.setLocked(roomId, true);
            service.leaveRoom('s2', roomId);

            expect(service.getRoomById(roomId)!.isLocked).toBe(false);
        });

        // CAS LIMITE : le suffixe du nom n'est pas modifié après un départ
        it('ne devrait pas renommer les joueurs avec suffixe après un départ', () => {
            service.joinRoom('s3', makePlayer('p3', 'Org'), roomId); // -> Org-2
            service.joinRoom('s4', makePlayer('p4', 'Org'), roomId); // -> Org-3
            service.leaveRoom('s2', roomId); // Bob part

            const room = service.getRoomById(roomId);
            expect(room!.players.find((player) => player.name === 'Org-2')).toBeDefined();
            expect(room!.players.find((player) => player.name === 'Org-3')).toBeDefined();
        });
    });

    // ── kickPlayer ─────────────────────────────────────────────────────────

    describe('kickPlayer()', () => {
        let service: WaitingRoomService;
        let roomId: string;

        beforeEach(async () => {
            service = makeService(makeGameWithStartPoints(4));
            const { roomId: rid } = await service.createRoom('s-org', makePlayer('org', 'Org'), 'g1');
            roomId = rid;
            service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId);
        });

        it('devrait retirer le joueur et retourner son socketId', () => {
            const { socketId, room } = service.kickPlayer(roomId, 'p2');

            expect(socketId).toBe('s2');
            expect(room!.players.length).toBe(1);
        });

        // CAS LIMITE : joueur inexistant
        it('ne devrait pas planter si le joueur nexiste pas', () => {
            const result = service.kickPlayer(roomId, 'joueur-inexistant');

            expect(result.socketId).toBeUndefined();
        });

        // CAS LIMITE : room inexistante
        it('ne devrait pas planter si la room nexiste pas', () => {
            const result = service.kickPlayer('room-inexistante', 'p2');

            expect(result.socketId).toBeUndefined();
            expect(result.room).toBeUndefined();
        });

        // CAS LIMITE : déverrouillage automatique après kick
        it('devrait déverrouiller la room après kick si players < maxPlayers', () => {
            service.setLocked(roomId, true);
            service.kickPlayer(roomId, 'p2');

            expect(service.getRoomById(roomId)!.isLocked).toBe(false);
        });
    });

    // ── getAvailableRooms ──────────────────────────────────────────────────

    describe('getAvailableRooms()', () => {
        it('devrait retourner uniquement les rooms ouvertes et non pleines', async () => {
            const service = makeService(makeGameWithStartPoints(4));
            const { roomId: r1 } = await service.createRoom('s1', makePlayer('p1', 'Alice'), 'g1');
            const { roomId: r2 } = await service.createRoom('s2', makePlayer('p2', 'Bob'), 'g2');
            service.setLocked(r2, true);

            const rooms = service.getAvailableRooms();

            expect(rooms.length).toBe(1);
            expect(rooms[0].roomId).toBe(r1);
        });

        // CAS LIMITE : 0 rooms disponibles
        it('devrait retourner [] si toutes les rooms sont verrouillées', async () => {
            const service = makeService(makeGameWithStartPoints(2));
            const { roomId } = await service.createRoom('s-org', makePlayer('org', 'Org'), 'g');
            service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId); // → full + locked auto

            expect(service.getAvailableRooms().length).toBe(0);
        });

        it('devrait inclure takenAvatars pour chaque room', async () => {
            const service = makeService(makeGameWithStartPoints(4));
            const { roomId } = await service.createRoom('s-org', makePlayer('org', 'Org', 'av1.png'), 'g');
            service.joinRoom('s2', makePlayer('p2', 'Bob', 'av2.png'), roomId);

            const rooms = service.getAvailableRooms();

            expect(rooms[0].takenAvatars).toContain('av1.png');
            expect(rooms[0].takenAvatars).toContain('av2.png');
        });

        it('devrait inclure currentPlayers et maxPlayers corrects', async () => {
            const service = makeService(makeGameWithStartPoints(4));
            const { roomId } = await service.createRoom('s-org', makePlayer('org', 'Org'), 'g');
            service.joinRoom('s2', makePlayer('p2', 'Bob'), roomId);

            const rooms = service.getAvailableRooms();

            expect(rooms[0].currentPlayers).toBe(2);
            expect(rooms[0].maxPlayers).toBe(4);
        });
    });

    // ── setLocked ──────────────────────────────────────────────────────────

    describe('setLocked()', () => {
        it('devrait verrouiller et déverrouiller la room', async () => {
            const service = makeService();
            const { roomId } = await service.createRoom('s1', makePlayer('p1', 'Alice'), 'g1');

            service.setLocked(roomId, true);
            expect(service.getRoomById(roomId)!.isLocked).toBe(true);

            service.setLocked(roomId, false);
            expect(service.getRoomById(roomId)!.isLocked).toBe(false);
        });

        // CAS LIMITE : roomId inexistant → pas de crash
        it('ne devrait pas planter si la room nexiste pas', () => {
            const service = makeService();
            expect(() => service.setLocked('room-inexistante', true)).not.toThrow();
        });
    });

    // ── getRoomForSocket ───────────────────────────────────────────────────

    describe('getRoomForSocket()', () => {
        it('devrait retourner la room associée à un socketId', async () => {
            const service = makeService();
            const { roomId } = await service.createRoom('s1', makePlayer('p1', 'Alice'), 'g1');

            expect(service.getRoomForSocket('s1')?.roomId).toBe(roomId);
        });

        // CAS LIMITE : socket inconnu → undefined sans crash
        it('devrait retourner undefined pour un socket inconnu', () => {
            const service = makeService();
            expect(service.getRoomForSocket('socket-inconnu')).toBeUndefined();
        });
    });

    // ── getRoomUpdatedPayload ──────────────────────────────────────────────

    describe('getRoomUpdatedPayload()', () => {
        it('devrait retourner le payload correct', async () => {
            const service = makeService(makeGameWithStartPoints(4));
            const player = makePlayer('p1', 'Alice');
            const { roomId } = await service.createRoom('s1', player, 'g1');

            const payload = service.getRoomUpdatedPayload(roomId);

            expect(payload).toMatchObject({
                players: [player],
                isLocked: false,
                maxPlayers: 4,
                organizerId: 'p1',
            });
        });

        // CAS LIMITE : room inexistante → undefined
        it('devrait retourner undefined si la room nexiste pas', () => {
            const service = makeService();
            expect(service.getRoomUpdatedPayload('room-inexistante')).toBeUndefined();
        });
    });

    // ── gameRoomExists ─────────────────────────────────────────────────────

    describe('gameRoomExists()', () => {
        it('devrait retourner true si une room avec ce gameId existe', async () => {
            const service = makeService();
            await service.createRoom('s1', makePlayer('p1', 'Alice'), 'game-xyz');

            expect(service.gameRoomExists('game-xyz')).toBe(true);
        });

        // CAS LIMITE : gameId inconnu → false
        it('devrait retourner false si aucune room avec ce gameId nexiste', () => {
            const service = makeService();
            expect(service.gameRoomExists('game-inconnu')).toBe(false);
        });
    });
});
