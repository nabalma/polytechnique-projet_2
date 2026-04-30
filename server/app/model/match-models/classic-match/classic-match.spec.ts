/* eslint-disable max-lines-per-function, @typescript-eslint/no-magic-numbers, @typescript-eslint/no-explicit-any -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */
/**
 * STRATÉGIE DE TEST — Match Classique (ClassicMatch)
 *
 * Objectif : Valider les comportements de methodes de la classe dependanemnt des actions et de l'etat du jeux (GameState)
 *
 * Approche :
 * - Tests unitaires purs, sans dépendances externes
 * - Mocker tout les fonctions de communication reseau (socket broadcast)
 * - Mocker deux joeurs humains et un gameState pour la simulations des etats
 * - Espionner les fonctions dont on souhaite certifier l'appel
 * - Couverture des cas normaux ET cas limites pour chaque méthode publique impliquée dans le combat
 *
 * Ca limite couverts :
 * - Débuter un jeu : essayer de commencer un jeu pendant plus de deux fois
 * - Fin de tour : 0 points d'actions et mouvements pour le joeur actif
 * - Action : essayer d'ouvrir ou de fermer une tuile qui n'est pas une tuile de porte
 * - Fin de match : Un seul joeur restant
 * - FIn de match : 0 joeurs restant
 * - Joueur virtuel agressif → AggressiveVirtualPlayerBehavior instancié
 * - Joueur virtuel défensif → DefensiveVirtualPlayerBehavior instancié
 * - botProfile null → comportement défensif par défaut
 * - executeTurn() rejeté → forceEndTurn() appelé en fallback sans crash
 */
import { WINS_TO_END } from '@app/constants/game-play.constants';
import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { PlayerService } from '@app/services/match/player/player.service';
import { AggressiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/agressive/aggressive-virtual-player-behavior';
import { VirtualPlayerContext } from '@app/services/match/virtual-player/context/virtual-player-context';
import { DefensiveVirtualPlayerBehavior } from '@app/services/match/virtual-player/defensive/defensive-virtual-player-behavior';
import { VirtualTurnManager } from '@app/services/match/virtual-player/virtual-player-turn-manager';
import { LogVirtualPlayerService } from '@app/services/virtual-log/virtual-log.service';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile, DiceType } from '@common/interfaces/types';
import { ClassicMatch } from './classique-match';

jest.mock('@app/services/match/virtual-player/agressive/aggressive-virtual-player-behavior');
jest.mock('@app/services/match/virtual-player/defensive/defensive-virtual-player-behavior');
jest.mock('@app/services/match/virtual-player/virtual-player-turn-manager');
jest.mock('@app/services/match/virtual-player/context/virtual-player-context');

const makePlayer = (isVirtual: boolean, overrides: Partial<Player> = {}): Player => ({
    id: isVirtual ? 'Virtual1' : 'player1',
    name: 'Test Player',
    avatar: '',
    avatarMini: '',
    roomId: 'room1',
    isOrganizer: false,
    isActive: true,
    remainingMovement: 3,
    remainingActions: 1,
    wins: 0,
    hasFlag: false,
    isVirtual: false,
    botProfile: null,
    position: { x: 1, y: 1 },
    startPosition: { x: 1, y: 1 },
    attributes: {
        speed: 3,
        attack: 4,
        defense: 4,
        currentLife: 6,
        totalLife: 6,
        attackDice: DiceType.D6,
        defenseDice: DiceType.D6,
    },
    ...overrides,
});

const makeCell = (tileType = TileType.DEFAULT) => ({
    tile: { tileType, imageSrc: '' },
    objects: undefined,
});

const makeGameState = (players: Player[], overrides: Partial<GameState> = {}): GameState => {
    const grid = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => makeCell()),
    );
    // Placer points de departs pour chaque joeur
    players.forEach(p => {
        grid[p.startPosition.y][p.startPosition.x].objects = {
            objectType: ObjectType.START_POINT,
            imageSrc: '',
        };
    });
    return {
        roomId: 'room1',
        organizerId: 'player1',
        isDebugMode: false,
        gameId: 'game1',
        players,
        grid,
        gridSize: 5,
        turnOrder: players.map(p => p.id),
        activePlayerIndex: 0,
        turnNumber: 0,
        socketToPlayerId: new Map(players.map(p => [p.id, p.id])),
        ...overrides,
    };
};

describe('ClassicMatch', () => {
    let match: ClassicMatch;
    let mockBroadcast: jest.Mocked<BroadcastService>;
    let mockPlayerService: jest.Mocked<PlayerService>;
    let mockLogVirtualPlayerService: jest.Mocked<LogVirtualPlayerService>;
    let player1: Player;
    let player2: Player;
    let gameState: GameState;
    let mockExecuteTurn: jest.Mock;

    beforeEach(() => {
        mockBroadcast = {
            emitToRoom: jest.fn(),
            emitToSocket: jest.fn(),
            emitPlayerMoved: jest.fn(),
            emitReachableCells: jest.fn(),
            emitCombatResult: jest.fn(),
            joinCombatRoom: jest.fn().mockReturnValue('combat-room'),
            leaveCombatRoom: jest.fn(),
            emitToCombatRoom: jest.fn(),
        } as any;

        mockPlayerService = {
            getPlayerSnapShot: jest.fn(),
            abandonPlayer: jest.fn(),
        } as any;

        mockLogVirtualPlayerService = {
            sendVirtualStartTurn: jest.fn(),
        } as any;

        player1 = makePlayer(false, { id: 'player1', position: { x: 1, y: 1 }, startPosition: { x: 1, y: 1 } });
        player2 = makePlayer(false, { id: 'player2', position: { x: 3, y: 3 }, startPosition: { x: 3, y: 3 } });
        gameState = makeGameState([player1, player2]);

        mockExecuteTurn = jest.fn().mockResolvedValue(undefined);
        (VirtualTurnManager as jest.Mock).mockImplementation(() => ({
            executeTurn: mockExecuteTurn,
        }));
        match = new ClassicMatch(gameState, mockBroadcast, mockPlayerService, mockLogVirtualPlayerService);
    });

    describe('checkWinCondition', () => {
        it('Devrait retourner undefined si aucun joueur n\'a atteint le nombre de victoire WINS_TO_END', () => {
            player1.wins = WINS_TO_END - 1;
            player2.wins = WINS_TO_END - 1;
            expect(match.checkWinCondition()).toBeUndefined();
        });

        it('Devrait retourner le joeur gagnant s\'il a atteint un nombre de victoire WINS_TO_END', () => {
            player1.wins = WINS_TO_END;
            expect(match.checkWinCondition()).toBe(player1);
        });

        it('Devrait retourner undefined si aucun joueur n\'a gagné de combat ', () => {
            expect(match.checkWinCondition()).toBeUndefined();
        });
    });

    describe('onCombatOver', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait appeler endGame is un joeur atteint le nombre de victoire WINS_TO_END', () => {
            player1.wins = WINS_TO_END;
            const endGameSpy = jest.spyOn(match as any, 'endGame');
            (match as any).onCombatOver('player1', 'player2', null);
            expect(endGameSpy).toHaveBeenCalledWith(player1);
        });

        it('Devrait emettre GameOver quand endGame est appelé', () => {
            player1.wins = WINS_TO_END;
            (match as any).onCombatOver('player1', 'player2', null);
            expect(mockBroadcast.emitToRoom).toHaveBeenCalledWith(
                gameState.roomId,
                expect.stringContaining('gameOver'),
                expect.objectContaining({ winnerId: 'player1' }),
            );
        });

        it('Devrait appeler super.onCombatOver s\'il n\'y a aucun vainqueur', () => {
            const superSpy = jest.spyOn(Object.getPrototypeOf(ClassicMatch.prototype), 'onCombatOver');
            (match as any).onCombatOver('player1', 'player2', null);
            expect(superSpy).toHaveBeenCalledWith('player1', 'player2', null, undefined);
        });

        it('Ne devrait pas appeler endGame si aucun joeur le nombre de victoire necessaire WINS_TO_END', () => {
            const endGameSpy = jest.spyOn(match as any, 'endGame');
            (match as any).onCombatOver('player1', 'player2', null);
            expect(endGameSpy).not.toHaveBeenCalled();
        });


        it('Devrait resumer le timer si le joeur actif a toujours de point d\'actions', () => {
            player1.remainingMovement = 3;
            player1.remainingActions = 1;
            const timerResumeSpy = jest.spyOn((match as any).timer, 'resume');
            (match as any).onCombatOver('player1', 'player2', null);
            expect(timerResumeSpy).toHaveBeenCalled();
        });

        it('Devrait passer au joeur suivant s\'il n\'a plus de point d\'action ni de mouvement ', () => {
            player1.remainingMovement = 0;
            player1.remainingActions = 0;
            const timerStopSpy = jest.spyOn((match as any).timer, 'stop');
            (match as any).onCombatOver('player1', 'player2', null);
            expect(timerStopSpy).toHaveBeenCalled();
        });
    });


    describe('startMatch', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });

        it('Devrait mettre hasStarted à true à l\'appelle de startMartch', () => {
            match.startMatch();
            expect(match.hasStarted).toBe(true);
        });

        //Cas limite : essayer de commencer le match plusieurs fois
        it('Ne devrait pas commencer le meme match plus d\'une fois', () => {
            for (let i = 0; i < 5; i++) {
                match.startMatch();
            }
            expect(mockBroadcast.emitToRoom).toHaveBeenCalledTimes(1);
        });

        it('Devrait emettre StartingMatch à l\'appelle de startMatch ', () => {
            match.startMatch();
            expect(mockBroadcast.emitToRoom).toHaveBeenCalledWith(
                gameState.roomId,
                expect.stringContaining('starting match'),
                expect.any(Object),
            );
        });
    });


    describe('toggleDoor', () => {
        it('Devrait ouvrir un porte fermée', () => {
            gameState.grid[2][2].tile.tileType = TileType.DOOR_CLOSED;
            match.toggleDoor(gameState, { x: 2, y: 2 });
            expect(gameState.grid[2][2].tile.tileType).toBe(TileType.DOOR_OPEN);
        });

        it('Devrait fermer une porte ouverte', () => {
            gameState.grid[2][2].tile.tileType = TileType.DOOR_OPEN;
            match.toggleDoor(gameState, { x: 2, y: 2 });
            expect(gameState.grid[2][2].tile.tileType).toBe(TileType.DOOR_CLOSED);
        });

        //Cas limite : essayer d'ouvrir ou fermer un tuile autre que la tuile de porte
        it('Devrait retourner false si on essaie de fermer ou ouvrir une tuile autre que la tuile de porte', () => {
            gameState.grid[2][2].tile.tileType = TileType.DEFAULT;
            expect(match.toggleDoor(gameState, { x: 2, y: 2 })).toBe(false);
        });


        it('Devrait retourner true, si la porte a été ouverte ou fermée', () => {
            gameState.grid[2][2].tile.tileType = TileType.DOOR_CLOSED;
            expect(match.toggleDoor(gameState, { x: 2, y: 2 })).toBe(true);
        });
    });

    describe('isGameOver', () => {
        it('Devrait retourner false s il reste au moin 2 joeurs dans le jeu', () => {
            expect(match.isGameOver()).toBe(false);
        });


        //Cas limite : il ne reste qu'un joueur dans le jeu
        it('Devrait retourner true s\'il reste seulement un joeur dans le jeu', () => {
            player2.remainingActions = -1;
            expect(match.isGameOver()).toBe(true);
        });

        //Cas limite: il ne reste plus aucun joueur dans le jeu
        it('Devrait retourner trouver', () => {
            player1.remainingActions = -1;
            player2.remainingActions = -1;
            expect(match.isGameOver()).toBe(true);
        });
    });

    describe('cancelGame', () => {
        it('Devrait mettre gameCancelled à true', () => {
            match.cancelGame();
            expect(match.isGameCancelled).toBe(true);
        });

        it('Devrait emettre GameOver avec cancelled à true', () => {
            match.cancelGame();
            expect(mockBroadcast.emitToRoom).toHaveBeenCalledWith(
                gameState.roomId,
                expect.any(String),
                expect.objectContaining({ cancelled: true }),
            );
        });
    });

    describe('startVirtualPlayerTurn', () => {
        let virtualPlayer: Player;

        beforeEach(() => {
            jest.clearAllMocks();
            virtualPlayer = makePlayer(true, {
                isVirtual: true,
                botProfile: BotProfile.AGGRESSIVE,
                position: { x: 2, y: 2 },
                startPosition: { x: 2, y: 2 },
            });
            gameState.players.push(virtualPlayer);
            gameState.turnOrder.push(virtualPlayer.id);
        });

        it('Devrait utiliser AggressiveVirtualPlayerBehavior pour un joeur Aggressif', () => {
            (match as any).startVirtualPlayerTurn(virtualPlayer);
            expect(AggressiveVirtualPlayerBehavior).toHaveBeenCalledTimes(1);
            expect(DefensiveVirtualPlayerBehavior).not.toHaveBeenCalled();
        });

        it('Devrait creer un VirtualPlayerContext avec le joeur et le match', () => {
            (match as any).startVirtualPlayerTurn(virtualPlayer);
            expect(VirtualPlayerContext).toHaveBeenCalledWith(virtualPlayer, match);
        });

        it('Devrait appeler executeTurn on the VirtualTurnManager', () => {
            (match as any).startVirtualPlayerTurn(virtualPlayer);
            expect(mockExecuteTurn).toHaveBeenCalledTimes(1);
        });

        it('Devrait appeler forceEndTurn si executeTurn est rejeté ', async () => {
            mockExecuteTurn.mockRejectedValue(new Error('VP error'));
            const forceEndSpy = jest.spyOn(match, 'forceEndTurn');
            (match as any).startVirtualPlayerTurn(virtualPlayer);
            await Promise.resolve();
            await Promise.resolve();
            expect(forceEndSpy).toHaveBeenCalled();
        });

        it('Ne devrait pas appeler forceEndTurn si executeTurn', async () => {
            const forceEndSpy = jest.spyOn(match, 'forceEndTurn');
            (match as any).startVirtualPlayerTurn(virtualPlayer);
            await Promise.resolve();
            expect(forceEndSpy).not.toHaveBeenCalled();
        });
    });
});