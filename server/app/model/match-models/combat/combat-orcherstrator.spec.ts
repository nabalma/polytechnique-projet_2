
/*
-- On désactive ces règles parce que ce fichier de test contient des scénarios longs,
 des callbacks imbriqués, des assertions non nulles contrôlées et
  des valeurs numériques fixes acceptées dans le contexte des tests. */
/**
 * STRATÉGIE DE TEST — CombatOrchestrator
 *
 * Objectif : Valider la logique d'orchestration d'un combat entre deux joueurs,
 *            incluant la gestion des rounds, des postures, et de la fin de combat.
 *
 * Approche :
 * - Tests unitaires purs, sans dépendances réseau réelles
 * - BroadcastService et MovementService mockés avec jest.fn()
 * - Combat mocké pour contrôler les résultats de resolveRound()
 * - onCombatOver fourni comme callback espionné
 * - Chaque test repart d'un état propre via beforeEach
 *
 * Critères couverts :
 * - Le gagnant obtient 1 victoire après un combat
 * - Le perdant est téléporté à son point de départ
 * - Les PV du perdant sont remis à leur maximum après défaite
 * - En cas de match nul, les deux joueurs sont téléportés et leurs PV restaurés
 * - Le tour de combat est de COMBAT_ROUND_DURATION secondes
 * - Le tour se termine avant si les deux postures sont choisies
 * - Un nouveau round démarre si personne n'est mort
 * - onCombatOver est appelé avec les bons arguments à la fin du combat
 * - Les joueurs virtuels choisissent automatiquement leur posture selon leur profil
 * - Un joueur virtuel agressif choisit Offensive, défensif choisit Defensive
 * - remainingActions du gagnant est décrémenté de 1
 */

/* eslint-disable max-lines-per-function, max-nested-callbacks, max-lines */
/* eslint-disable , @typescript-eslint/no-explicit-any */
import { BroadcastService } from '@app/gateways/match/broadcast/broadcast.gateway';
import { Combat } from '@app/model/match-models/combat/combat';
import { MovementService } from '@app/services/match/movement/movement.service';
import { COMBAT_ROUND_DURATION, VIRTUAL_POSTURE_DELAY_MS } from '@common/constants/timer/timer-constants';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { Posture } from '@common/enum/match/match.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { RoundEndedResult } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile, DiceType } from '@common/interfaces/types';
import { CombatOrchestrator } from './combat-orcherstrator';

jest.mock('@app/model/match-models/combat/combat');

const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    name: id,
    avatar: '',
    avatarMini: '',
    roomId: 'room1',
    isOrganizer: false,
    isActive: true,
    isVirtual: false,
    botProfile: null,
    remainingMovement: 3,
    remainingActions: 1,
    wins: 0,
    hasFlag: false,
    position: { x: 1, y: 1 },
    startPosition: { x: 0, y: 0 },
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

const makeGameState = (players: Player[]): GameState => {
    const grid = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => makeCell()),
    );
    players.forEach(p => {
        grid[p.startPosition.y][p.startPosition.x].objects = {
            objectType: ObjectType.START_POINT,
            imageSrc: '',
        };
    });
    return {
        roomId: 'room1',
        organizerId: players[0]?.id ?? '',
        isDebugMode: false,
        players,
        grid,
        gridSize: 5,
        turnOrder: players.map(p => p.id),
        activePlayerIndex: 0,
        turnNumber: 0,
        socketToPlayerId: new Map(players.map(p => [p.id, p.id])),
        gameId: 'game1',
    };
};

const makeRoundResult = (overrides: Partial<RoundEndedResult> = {}): RoundEndedResult => ({
    isCombatOver: false,
    winnerId: null,
    loserId: null,
    roundResult: { results: {} },
    ...overrides,
});


describe('CombatOrchestrator', () => {
    let orchestrator: CombatOrchestrator;
    let mockBroadcast: jest.Mocked<BroadcastService>;
    let mockMovement: jest.Mocked<MovementService>;
    let mockOnCombatOver: jest.Mock;
    let mockCombat: jest.Mocked<Combat>;
    let initiator: Player;
    let opponent: Player;
    let gameState: GameState;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBroadcast = {
            emitToRoom: jest.fn(),
            emitToSocket: jest.fn(),
            joinCombatRoom: jest.fn().mockReturnValue('combat-room'),
            leaveCombatRoom: jest.fn(),
            emitToCombatRoom: jest.fn(),
        } as any;

        mockMovement = {
            findRespawnPosition: jest.fn().mockReturnValue({ x: 0, y: 0 }),
            movePlayer: jest.fn(),
        } as any;

        mockOnCombatOver = jest.fn();

        initiator = makePlayer('initiator', { position: { x: 1, y: 1 } });
        opponent = makePlayer('opponent', { position: { x: 2, y: 1 } });
        gameState = makeGameState([initiator, opponent]);

        mockCombat = {
            resolveRound: jest.fn().mockReturnValue(makeRoundResult()),
            startRound: jest.fn(),
            setPosture: jest.fn().mockReturnValue(false),
            playerIds: jest.fn().mockReturnValue(['initiator', 'opponent']),
            fighters: [initiator, opponent],
            initiatorLog: { playerId: 'initiator', details: [] },
            opponentLog: { playerId: 'opponent', details: [] },
        } as any;

        (Combat as jest.Mock).mockImplementation(() => mockCombat);

        orchestrator = new CombatOrchestrator(
            gameState,
            mockBroadcast,
            mockMovement,
            mockOnCombatOver,
        );
    });

    describe('requestCombat', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait démarrer le timer avec COMBAT_ROUND_DURATION', () => {
            const timerStartSpy = jest.spyOn((orchestrator as any).combatTimer, 'start');
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(timerStartSpy).toHaveBeenCalledWith(COMBAT_ROUND_DURATION, expect.any(Function));
        });

        it('Devrait rejoindre une combat room', () => {
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(mockBroadcast.joinCombatRoom).toHaveBeenCalledWith('initiator', 'opponent');
        });

        it('Devrait emettre CombatStarted à la room', () => {
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(mockBroadcast.emitToRoom).toHaveBeenCalledWith(
                gameState.roomId,
                expect.stringContaining('combatStarted'),
                expect.objectContaining({ initiatorId: 'initiator', oponentId: 'opponent' }),
            );
        });

        it('Ne devrait pas démarrer si l\'initiateur n\'existe pas', () => {
            const timerSpy = jest.spyOn((orchestrator as any).combatTimer, 'start');
            orchestrator.requestCombat('unknown', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(timerSpy).not.toHaveBeenCalled();
        });

        it('Ne devrait pas démarrer si l\'adversaire n\'existe pas', () => {
            const timerSpy = jest.spyOn((orchestrator as any).combatTimer, 'start');
            orchestrator.requestCombat('initiator', { targetPlayerId: 'unknown' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(timerSpy).not.toHaveBeenCalled();
        });

        it('Devrait mettre isInCombat à true', () => {
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            expect(orchestrator.isInCombat).toBe(true);
        });
    });


    describe('applyWinnerUpdate — le gagnant obtient 1 victoire', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait incrémenter wins du gagnant de 1', () => {
            const initialWins = initiator.wins;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(initiator.wins).toBe(initialWins + 1);
        });

        it('Devrait décrémenter remainingActions du gagnant de 1', () => {
            initiator.remainingActions = 1;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(initiator.remainingActions).toBe(0);
        });

        it('remainingActions du gagnant ne devrait pas descendre sous 0', () => {
            initiator.remainingActions = 0;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(initiator.remainingActions).toBe(0);
        });
    });

    describe('applyLoserUpdate — téléportation et restauration des PV', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait téléporter le perdant à son point de départ', () => {
            const respawnPos = { x: 0, y: 0 };
            mockMovement.findRespawnPosition.mockReturnValue(respawnPos);
            opponent.attributes.currentLife = 0;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(opponent.position).toEqual(respawnPos);
        });

        it('Devrait remettre les PV du perdant à leur maximum', () => {
            opponent.attributes.currentLife = 0;
            opponent.attributes.totalLife = 6;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(opponent.attributes.currentLife).toBe(opponent.attributes.totalLife);
        });

        it('Devrait appeler findRespawnPosition avec le perdant', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockMovement.findRespawnPosition).toHaveBeenCalledWith(opponent, gameState);
        });
    });

    describe('applyDrawUpdate — match nul', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait téléporter les deux joueurs en cas de match nul', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: null,
                loserId: null,
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockMovement.findRespawnPosition).toHaveBeenCalledTimes(2);
        });

        it('Devrait restaurer les PV des deux joueurs en cas de match nul', () => {
            initiator.attributes.currentLife = 0;
            opponent.attributes.currentLife = 0;
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: null,
                loserId: null,
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(initiator.attributes.currentLife).toBe(initiator.attributes.totalLife);
            expect(opponent.attributes.currentLife).toBe(opponent.attributes.totalLife);
        });

        it('Devrait appeler onCombatOver avec winnerId null en cas de match nul', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: null,
                loserId: null,
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockOnCombatOver).toHaveBeenCalledWith(
                null,
                null,
                null,
                expect.any(Map),
            );
        });
    });

    describe('déroulement des rounds', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });

        it('Devrait démarrer un nouveau round si personne n\'est mort', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({ isCombatOver: false }));
            const timerSpy = jest.spyOn((orchestrator as any).combatTimer, 'start');
            (orchestrator as any).onCombatRoundEnd();
            expect(mockCombat.startRound).toHaveBeenCalled();
            expect(timerSpy).toHaveBeenCalledWith(COMBAT_ROUND_DURATION, expect.any(Function));
        });

        it('Devrait appeler onCombatOver quand le combat est terminé', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockOnCombatOver).toHaveBeenCalled();
        });

        it('Devrait arrêter le timer en début de onCombatRoundEnd', () => {
            const timerStopSpy = jest.spyOn((orchestrator as any).combatTimer, 'stop');
            (orchestrator as any).onCombatRoundEnd();
            expect(timerStopSpy).toHaveBeenCalled();
        });

        it('Devrait terminer le round immédiatement si les deux postures sont choisies', () => {
            mockCombat.setPosture.mockReturnValue(true);
            const roundEndSpy = jest.spyOn(orchestrator as any, 'onCombatRoundEnd');
            orchestrator.choosePosture('initiator', Posture.Offensive);
            expect(roundEndSpy).toHaveBeenCalled();
        });

        it('Ne devrait pas terminer le round si une seule posture est choisie', () => {
            mockCombat.setPosture.mockReturnValue(false);
            const roundEndSpy = jest.spyOn(orchestrator as any, 'onCombatRoundEnd');
            orchestrator.choosePosture('initiator', Posture.Offensive);
            expect(roundEndSpy).not.toHaveBeenCalled();
        });
    });

    // ── endCombat ────────────────────────────────────────────────────────────

    describe('endCombat', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });

        it('Devrait quitter la combat room à la fin du combat', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockBroadcast.leaveCombatRoom).toHaveBeenCalledWith('combat-room');
        });

        it('Devrait mettre isInCombat à false après la fin du combat', () => {
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(orchestrator.isInCombat).toBe(false);
        });

        it('Devrait appeler onCombatOver avec les bons arguments', () => {
            const respawnPos = { x: 0, y: 0 };
            mockMovement.findRespawnPosition.mockReturnValue(respawnPos);
            mockCombat.resolveRound.mockReturnValue(makeRoundResult({
                isCombatOver: true,
                winnerId: 'initiator',
                loserId: 'opponent',
            }));
            (orchestrator as any).onCombatRoundEnd();
            expect(mockOnCombatOver).toHaveBeenCalledWith(
                'initiator',
                'opponent',
                expect.any(Object), // loserDefeatPosition
                undefined,
            );
        });
    });


    describe('autoChoosePosturesForVirtualPlayers', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });
        it('Devrait choisir Offensive pour un joueur virtuel agressif', async () => {
            initiator.isVirtual = true;
            initiator.botProfile = BotProfile.AGGRESSIVE;
            mockCombat.setPosture.mockReturnValue(false);
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            await Promise.resolve();
            expect(mockCombat.setPosture).toHaveBeenCalledWith('initiator', Posture.Offensive);
        });

        it('Devrait choisir Defensive pour un joueur virtuel défensif', async () => {
            initiator.isVirtual = true;
            initiator.botProfile = BotProfile.DEFENSIVE;
            mockCombat.setPosture.mockReturnValue(false);
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            await Promise.resolve();
            expect(mockCombat.setPosture).toHaveBeenCalledWith('initiator', Posture.Defensive);
        });

        it('Ne devrait pas choisir automatiquement pour un joueur humain', () => {
            initiator.isVirtual = false;
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            const calls = (mockCombat.setPosture as jest.Mock).mock.calls;
            const humanAutoCalls = calls.filter(([id]) => id === 'initiator');
            expect(humanAutoCalls).toHaveLength(0);
        });

        it('Devrait choisir automatiquement si les deux joueurs sont virtuels', async () => {
            initiator.isVirtual = true;
            initiator.botProfile = BotProfile.AGGRESSIVE;
            opponent.isVirtual = true;
            opponent.botProfile = BotProfile.DEFENSIVE;
            mockCombat.setPosture.mockReturnValueOnce(false).mockReturnValueOnce(true);
            orchestrator.requestCombat('initiator', { targetPlayerId: 'opponent' });
            jest.advanceTimersByTime(VIRTUAL_POSTURE_DELAY_MS);
            await Promise.resolve();
            expect(mockCombat.setPosture).toHaveBeenCalledWith('initiator', Posture.Offensive);
            expect(mockCombat.setPosture).toHaveBeenCalledWith('opponent', Posture.Defensive);
        });
    });
});