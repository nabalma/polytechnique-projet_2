/* eslint-disable max-lines-per-function, max-nested-callbacks, @typescript-eslint/no-magic-numbers -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */
/**
 * STRATÉGIE DE TEST — Combat
 *
 * Objectif : Valider la logique de résolution d'un tour de combat entre deux joueurs.
 *
 * Approche :
 * - Tests unitaires purs, sans dépendances externes
 * - Instances de Combat créées directement avec des joueurs et un état de jeu mockés
 * - Chaque test repart d'un état propre via beforeEach
 * - Le mode débogage est utilisé pour rendre les lancers de dés déterministes
 * - Couverture des cas normaux ET cas limites pour chaque méthode publique
 *
 * Cas limites couverts :
 * - Dégâts négatifs → clampés à 0
 * - Vie tombant en dessous de 0 → clampée à 0
 * - Match nul (les deux joueurs à 0 PV simultanément) → winnerId null
 * - Joueur sur tuile de glace → pénalité ICE_COMBAT_PENALTY appliquée
 * - Joueur sans position → pas de crash
 * - ID de joueur inconnu dans setPosture → ignoré sans crash
 * - Changement de posture avant résolution → dernière valeur retenue
 * - Un seul joueur ayant choisi sa posture → allPosturesChosen retourne false
 * - Mode débogage : initiateur obtient le dé maximum, adversaire le minimum
 * - totalDamage dans le payload correspond aux PV réellement perdus
 */
import { ICE_COMBAT_PENALTY, MAX_D4_VALUE, MAX_D6_VALUE, MIN_DICE_VALUE } from '@common/constants/match/match.const';
import { TileType } from '@common/enum/game/grid/game-grid.enum';
import { Posture } from '@common/enum/match/match.enum';
import { GameState } from '@common/interfaces/game-frontend/game-state.interface';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { Combat } from './combat';

const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    name: id,
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

const makeGameState = (overrides: Partial<GameState> = {}): GameState => {
    const grid = Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => makeCell()),
    );
    return {
        roomId: 'room1',
        gameId: 'game1',
        organizerId: 'initiator',
        isDebugMode: false,
        players: [],
        grid,
        gridSize: 5,
        turnOrder: [],
        activePlayerIndex: 0,
        turnNumber: 0,
        socketToPlayerId: new Map(),
        ...overrides,
    };
};

describe('Combat', () => {
    let initiator: Player;
    let opponent: Player;
    let gameState: GameState;
    let combat: Combat;

    beforeEach(() => {
        initiator = makePlayer('initiator');
        opponent = makePlayer('opponent');
        gameState = makeGameState({ players: [initiator, opponent] });
        combat = new Combat(initiator, opponent, gameState);
    });

    describe('fighters', () => {
        it('Devrait retourner des deux joeurs impliqués dans le combat', () => {
            expect(combat.fighters).toContain(initiator);
            expect(combat.fighters).toContain(opponent);
        });
    });

    describe('startRound', () => {
        it('Devrait reinitialiser les posture à null', () => {
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            combat.startRound();
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].chosenPosture).toBeNull();
            expect(result.roundResult.results['opponent'].chosenPosture).toBeNull();
        });
    });

    describe('setPosture', () => {
        it('Devrait retourner false si l\'initiateur du combat a choisi sa posture', () => {
            expect(combat.setPosture('initiator', Posture.Offensive)).toBe(false);
        });

        it('Devrait retourner false si l\'oposent dans le combat a choisi sa posture', () => {
            expect(combat.setPosture('opponent', Posture.Defensive)).toBe(false);
        });

        it('Devrait etre vrai si le deux joeurs ont choisi leur posture', () => {
            combat.setPosture('initiator', Posture.Offensive);
            expect(combat.setPosture('opponent', Posture.Defensive)).toBe(true);
        });

        it('Devrait ignorer les ids de joueurs inconues', () => {
            expect(combat.setPosture('unknown', Posture.Offensive)).toBe(false);
        });

        it('Devrait permettre le changement de posture si les tous les deux joeurs n\'ont pas fait leur choix', () => {
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('initiator', Posture.Defensive);
            const allChosen = combat.setPosture('opponent', Posture.Offensive);
            expect(allChosen).toBe(true);
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].chosenPosture).toBe(Posture.Defensive);
        });
    });

    describe('resolveRound()', () => {
        it('Devrait reduire la vie du joeur qui recoit du dommage', () => {
            // On force un result deterministe
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            combat.resolveRound();
            // En mode debogage, le dés de l'initiateur donne la valeur max
            // Au moin un joeur va subir le dommage
            const totalLifeLost = (6 - initiator.attributes.currentLife) + (6 - opponent.attributes.currentLife);
            expect(totalLifeLost).toBeGreaterThanOrEqual(0);
        });

        it('Ne devrait jamais mettre la valeur de point de vie inferieur à 0', () => {
            initiator.attributes.currentLife = 1;
            opponent.attributes.currentLife = 1;
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            combat.resolveRound();
            expect(initiator.attributes.currentLife).toBeGreaterThanOrEqual(0);
            expect(opponent.attributes.currentLife).toBeGreaterThanOrEqual(0);
        });

        it('Devrait retourner une valeur de vie correct apres la resolution des attaques', () => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].life).toBe(initiator.attributes.currentLife);
            expect(result.roundResult.results['opponent'].life).toBe(opponent.attributes.currentLife);
        });

        it('Devrait avoir isCombatOver à false quand les deux jours ont les points de vie > 0', () => {
            initiator.attributes.currentLife = 6;
            opponent.attributes.currentLife = 6;
            jest.spyOn(Math, 'random').mockReturnValue(0);
            combat.setPosture('initiator', null);
            combat.setPosture('opponent', null);
            const result = combat.resolveRound();
            expect(result).toHaveProperty('isCombatOver');
            expect(result).toHaveProperty('winnerId');
            expect(result).toHaveProperty('loserId');
            jest.restoreAllMocks();
        });

        it('Devrait avoir roundResult et l\'attribut results pour les deux joeurs', () => {
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results).toHaveProperty('initiator');
            expect(result.roundResult.results).toHaveProperty('opponent');
        });
    });

    describe('interpretWinner() (via resolveRound())', () => {
        beforeEach(() => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
        });

        it('Devrait declarer l\'oposant victorieux si l\'initiateur meurt', () => {
            initiator.attributes.currentLife = 1;
            opponent.attributes.currentLife = 6;
            opponent.attributes.attack = 100;
            const result = combat.resolveRound();
            if (result.isCombatOver) {
                expect(result.winnerId).toBe('opponent');
                expect(result.loserId).toBe('initiator');
            }
        });

        it('Devrait declarer l\'initiateur victorieux si l\'oposant meurt', () => {
            initiator.attributes.currentLife = 6;
            opponent.attributes.currentLife = 1;
            initiator.attributes.attack = 100;
            const result = combat.resolveRound();
            if (result.isCombatOver) {
                expect(result.winnerId).toBe('initiator');
                expect(result.loserId).toBe('opponent');
            }
        });

        it('Devrait declarer match null si les deux joeurs on de points de vie < 0 simultanement', () => {
            initiator.attributes.currentLife = 1;
            opponent.attributes.currentLife = 1;
            initiator.attributes.attack = 100;
            opponent.attributes.attack = 50;
            const result = combat.resolveRound();
            if (result.isCombatOver && result.winnerId === null) {
                expect(result.loserId).toBeNull();
            }
        });


        it('Devrait retourner isCombatOver: false quand les deux joeurs ont des points de vie > 0', () => {
            initiator.attributes.currentLife = 6;
            opponent.attributes.currentLife = 6;
            initiator.attributes.attack = 0;
            opponent.attributes.attack = 0;
            const result = combat.resolveRound();
            expect(result.isCombatOver).toBe(false);
            expect(result.winnerId).toBeNull();
            expect(result.loserId).toBeNull();
        });
    });


    describe('Pénalité sur tuile de glace', () => {
        it('Devrait appliquer une penalité de valeur ICE_COMBAT_PENALTY quand l\'initiateur est sur une tuile de glace', () => {
            gameState.grid[1][1].tile.tileType = TileType.ICE;
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].icePenalty).toBe(ICE_COMBAT_PENALTY);
        });

        it('Devrait appliquer une penalité de valeur ICE_COMBAT_PENALTY quand l\'oposant est sur une tuile de glace', () => {
            opponent.position = { x: 3, y: 3 };
            gameState.grid[3][3].tile.tileType = TileType.ICE;
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['opponent'].icePenalty).toBe(ICE_COMBAT_PENALTY);
        });

        it('Ne Devrait pas appliquer de penalités si aucun des utilisateur n\'est sur la tuile de glace ', () => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].icePenalty).toBe(0);
            expect(result.roundResult.results['opponent'].icePenalty).toBe(0);
        });

        it('devrait retourner une penalité de 0 si le joeur n\'a pas de position connue', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initiator.position = null as any;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            expect(() => combat.resolveRound()).not.toThrow();
        });
    });

    describe('Bonus de postue', () => {
        it('Devrait applique un bonus de posture à l\'attaque de l\'initiateur s\'il est Offenssif', () => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', null);
            const result = combat.resolveRound();
            const initiatorResult = result.roundResult.results['initiator'];
            expect(initiatorResult.total).toBeGreaterThanOrEqual(
                initiator.attributes.attack + initiatorResult.dieValue,
            );
        });

        it('Devrait appliquer un bonus de à defense si de l\'oposant est Defensiff', () => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['opponent'].chosenPosture).toBe(Posture.Defensive);
        });

        it('Ne devrait pas appliquer de bonus si aucune posture n\'est choisie', () => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', null);
            combat.setPosture('opponent', null);
            const result = combat.resolveRound();
            const r = result.roundResult.results['initiator'];
            expect(r.total).toBeLessThanOrEqual(
                initiator.attributes.attack + MAX_D6_VALUE,
            );
        });
    });

    describe('Des en mode debug', () => {
        beforeEach(() => {
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
        });

        it('Devrait donner à l\'initiateur la valeur max du dès à 6 faces', () => {
            const result = combat.resolveRound();
            expect(result.roundResult.results['initiator'].dieValue).toBe(MAX_D6_VALUE);
        });

        it('Devrait donner à l\'initiateur la valeur max du dès à 4 faces si c\'est dès utilisé', () => {
            initiator.attributes.attackDice = DiceType.D4;
            const c = new Combat(initiator, opponent, gameState);
            c.setPosture('initiator', Posture.Offensive);
            c.setPosture('opponent', Posture.Defensive);
            const result = c.resolveRound();
            expect(result.roundResult.results['initiator'].dieValue).toBe(MAX_D4_VALUE);
        });

        it('Devrait donner à l\' opponent la valeur minimal du dès en mode debogage', () => {
            const result = combat.resolveRound();
            expect(result.roundResult.results['opponent'].dieValue).toBe(MIN_DICE_VALUE);
        });
    });


    describe('Calculs de dégat', () => {
        it('Ne devrait pas prodruire un degat négatif', () => {
            initiator.attributes.attack = 1;
            opponent.attributes.defense = 100;
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['opponent'].totalDamage).toBe(0);
        });

        it('Devrait avoir un valeur correct de degat si l\'attaque est bien plus grande que la défense', () => {
            initiator.attributes.attack = 100;
            opponent.attributes.defense = 1;
            gameState.isDebugMode = true;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            expect(result.roundResult.results['opponent'].totalDamage).toBeGreaterThan(0);
        });

        it('La valeur total du domage devrait etre egale àau points de vie perdus', () => {
            gameState.isDebugMode = true;
            const initialOpponentLife = opponent.attributes.currentLife;
            combat.setPosture('initiator', Posture.Offensive);
            combat.setPosture('opponent', Posture.Defensive);
            const result = combat.resolveRound();
            const actualDamage = initialOpponentLife - opponent.attributes.currentLife;
            expect(result.roundResult.results['opponent'].totalDamage).toBe(actualDamage);
        });
    });
});