/* eslint-disable max-lines, max-lines-per-function,  @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-magic-numbers, @typescript-eslint/no-explicit-any -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */

/**
 * STRATÉGIE DE TEST — CombatService (client Angular)
 *
 * Objectif : Valider la logique côté client du service de combat :
 * gestion des signaux (isInCombat, initiateur, opposant, HP, posture, timer),
 * traitement des événements socket et affichage des résultats de combat.
 *
 * Approche :
 * - TestBed Angular pour respecter le système d'injection (inject())
 * - Toutes les dépendances (SocketService, MatchService, MapService, etc.) mockées
 * - Sujets rxjs (Subject) utilisés pour simuler les événements socket entrants
 * - Les handlers privés (handleCombatStarted, handleRoundEnded) sont invoqués
 *   directement via (service as any) pour des tests ciblés et synchrones
 * - jasmine.clock() utilisé pour tester le dismiss automatique après 3 secondes
 * - Chaque test repart d'un état propre via beforeEach (nouvelle instance TestBed)
 *
 * Cas limites couverts :
 * - handleCombatStarted avec joueurs inconnus → aucun crash, état inchangé
 * - handleCombatTick avec seconds=0 → remainingTime non mis à jour
 * - showCombatResult avec winnerId=null → message d'égalité
 * - showCombatResult avec winnerId=localPlayer → message de victoire (isWin=true)
 * - showCombatResult avec winnerId=autre → message de défaite (isWin=false)
 * - dismissResult → réinitialise combatResult et isInCombat
 * - Notification de fin de combat après 3 secondes (auto-dismiss via setTimeout)
 * - isLocalPlayerInCombat : true si initiateur OU opposant, false sinon
 * - getPostureBonus : 2 si posture non-null, 0 sinon
 */

import { TestBed } from '@angular/core/testing';
import { LogService } from '@app/services/logs/logs.service';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { MatchPlayerService } from '@app/services/match/player/match-player.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { COMBAT_RESULT_DISMISS_MS, POSTURE_BONUS } from '@common/constants/match/match.const';
import { Posture } from '@common/enum/match/match.enum';
import { RoundEndedPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { RoundValuesPayload } from '@common/interfaces/match/match-interface';
import { Player } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { MatchEvents, TimerEvents } from '@common/socket_event/match/match.gateway.events';
import { Subject } from 'rxjs';
import { CombatService } from './combat.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    name: `Player-${id}`,
    roomId: '',
    avatar: 'av.png',
    avatarMini: 'av-mini.png',
    isActive: true,
    isVirtual: false,
    isOrganizer: false,
    hasFlag: false,
    wins: 0,
    remainingMovement: 6,
    remainingActions: 1,
    position: { x: 0, y: 0 },
    attributes: {
        totalLife: 10,
        currentLife: 8,
        speed: 4,
        attack: 4,
        attackDice: DiceType.D6,
        defense: 4,
        defenseDice: DiceType.D4,
    },
    ...overrides,
});

const makeRoundResult = (iniId: string, oppId: string): RoundValuesPayload => ({
    results: {
        [iniId]: { life: 7, dieValue: 4, chosenPosture: Posture.Offensive, totalDamage: 1, icePenalty: 0, total: 9 },
        [oppId]: { life: 5, dieValue: 2, chosenPosture: null, totalDamage: 3, icePenalty: 0, total: 7 },
    },
});

const makeRoundEndedPayload = (
    iniId: string,
    oppId: string,
    isCombatOver = false,
    winnerId: string | null = null,
    loserId: string | null = null,
): RoundEndedPayload => ({
    roundResult: makeRoundResult(iniId, oppId),
    isCombatOver,
    winnerId,
    loserId,
    playersUpdate: {
        [iniId]: { newPosition: null, newLife: null },
        [oppId]: { newPosition: null, newLife: null },
    },
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('CombatService', () => {
    let service: CombatService;
    let socketSubjects: Partial<Record<string, Subject<unknown>>>;
    let mockSocketService: any;
    let mockMatchService: any;
    let mockMapService: any;
    let mockPlayersService: any;
    let mockLogService: any;
    let playersMap: Map<string, Player>;

    beforeEach(() => {
        jasmine.clock().install();

        socketSubjects = {};
        playersMap = new Map<string, Player>();

        mockSocketService = {
            on: jasmine.createSpy('on').and.callFake((event: string) => {
                if (!socketSubjects[event]) socketSubjects[event] = new Subject();
                return socketSubjects[event]!.asObservable();
            }),
            send: jasmine.createSpy('send'),
        };

        mockMatchService = {
            get currentPlayerId() {
                return 'local';
            },
            players: () => playersMap,
            findTargetPlayer: jasmine.createSpy('findTargetPlayer'),
            get selectedCell() {
                return null;
            },
            incrementPlayerWins: jasmine.createSpy('incrementPlayerWins'),
            isMyTurn(): boolean {
                return true;
            },
        };

        mockMapService = {
            getCoordinates: jasmine.createSpy('getCoordinates').and.returnValue({ x: 0, y: 0 }),
            grid: [],
        };

        mockPlayersService = {
            updatePlayers: jasmine.createSpy('updatePlayers'),
        };

        mockLogService = {
            sendStartFight: jasmine.createSpy('sendStartFight'),
            sendEndFight: jasmine.createSpy('sendEndFight'),
        };

        TestBed.configureTestingModule({
            providers: [
                CombatService,
                { provide: MatchSocketService, useValue: mockSocketService },
                { provide: MatchService, useValue: mockMatchService },
                { provide: MapService, useValue: mockMapService },
                { provide: MatchPlayerService, useValue: mockPlayersService },
                { provide: LogService, useValue: mockLogService },
            ],
        });

        service = TestBed.inject(CombatService);
        service.registerListeners();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
        TestBed.resetTestingModule();
    });

    // ── getPostureBonus ─────────────────────────────────────────────────────

    describe('getPostureBonus()', () => {
        it('devrait retourner POSTURE_BONUS si la posture est Offensive', () => {
            expect(service.getPostureBonus(Posture.Offensive)).toBe(POSTURE_BONUS);
        });

        it('devrait retourner POSTURE_BONUS si la posture est Defensive', () => {
            expect(service.getPostureBonus(Posture.Defensive)).toBe(POSTURE_BONUS);
        });

        it('devrait retourner 0 si la posture est null', () => {
            expect(service.getPostureBonus(null)).toBe(0);
        });
    });

    // ── choosePosture ───────────────────────────────────────────────────────

    describe('choosePosture()', () => {
        it('devrait mettre à jour selectedPosture avec la valeur choisie', () => {
            service.choosePosture(Posture.Offensive);
            expect(service.selectedPosture()).toBe(Posture.Offensive);
        });

        it('devrait envoyer un événement socket ChoosePosture', () => {
            service.choosePosture(Posture.Defensive);
            expect(mockSocketService.send).toHaveBeenCalledWith(
                MatchEvents.ChoosePosture,
                { posture: Posture.Defensive },
            );
        });

        it('devrait mettre hasChosenPosture à true après un choix', () => {
            expect(service.hasChosenPosture()).toBe(false);
            service.choosePosture(Posture.Offensive);
            expect(service.hasChosenPosture()).toBe(true);
        });
    });

    // ── dismissResult ───────────────────────────────────────────────────────

    describe('dismissResult()', () => {
        it('devrait remettre combatResult à null', () => {
            (service as any).combatResult.set({ isWin: true, message: 'Victoire !' });
            service.dismissResult();
            expect(service.combatResult()).toBeNull();
        });

        it('devrait remettre isInCombat à false', () => {
            (service as any).isInCombat.set(true);
            service.dismissResult();
            expect(service.isInCombat()).toBe(false);
        });
    });

    // ── handleCombatTick ────────────────────────────────────────────────────

    describe('handleCombatTick()', () => {
        it('devrait mettre à jour remainingTime avec la valeur reçue', () => {
            service.handleCombatTick(7);
            expect(service.remainingTime()).toBe(7);
        });

        // CAS LIMITE : seconds=0 → ne pas mettre à jour
        it('ne devrait pas mettre à jour remainingTime si seconds=0', () => {
            service.handleCombatTick(5);
            service.handleCombatTick(0);
            expect(service.remainingTime()).toBe(5); // inchangé
        });

        it('devrait répondre à l\'événement socket CombatTick', () => {
            socketSubjects[TimerEvents.CombatTick]!.next({ seconds: 8 });
            expect(service.remainingTime()).toBe(8);
        });
    });

    // ── handleCombatStarted ─────────────────────────────────────────────────

    describe('handleCombatStarted() — via événement socket', () => {
        beforeEach(() => {
            playersMap.set('p1', makePlayer('p1'));
            playersMap.set('p2', makePlayer('p2'));
        });

        it('devrait mettre isInCombat à true quand un combat commence', () => {
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.isInCombat()).toBe(true);
        });

        it("devrait initialiser l'initiateur et l'opposant", () => {
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.initiator()?.id).toBe('p1');
            expect(service.opponent()?.id).toBe('p2');
        });

        it('devrait réinitialiser roundNumber à 1', () => {
            (service as any).roundNumber.set(5);
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.roundNumber()).toBe(1);
        });

        it('devrait réinitialiser selectedPosture à null', () => {
            service.choosePosture(Posture.Offensive);
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.selectedPosture()).toBeNull();
        });

        it('devrait réinitialiser lastRoundResult et combatResult à null', () => {
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.lastRoundResult()).toBeNull();
            expect(service.combatResult()).toBeNull();
        });

        // CAS LIMITE : joueur inconnu dans la map → aucun crash, isInCombat reste false
        it('ne devrait pas démarrer le combat si un joueur est introuvable', () => {
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'inconnu' });
            expect(service.isInCombat()).toBe(false);
        });
    });

    // ── handleRoundEnded ────────────────────────────────────────────────────

    describe('handleRoundEnded() — via événement socket', () => {
        beforeEach(() => {
            playersMap.set('p1', makePlayer('p1'));
            playersMap.set('p2', makePlayer('p2'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
        });

        it('devrait mettre à jour lastRoundResult avec les données du round', () => {
            const payload = makeRoundEndedPayload('p1', 'p2');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);
            expect(service.lastRoundResult()).toEqual(payload.roundResult);
        });

        it('devrait incrémenter roundNumber à chaque fin de round', () => {
            expect(service.roundNumber()).toBe(1);
            socketSubjects[MatchEvents.RoundEnded]!.next(makeRoundEndedPayload('p1', 'p2'));
            expect(service.roundNumber()).toBe(2);
        });

        it('devrait réinitialiser selectedPosture à null après chaque round', () => {
            service.choosePosture(Posture.Offensive);
            socketSubjects[MatchEvents.RoundEnded]!.next(makeRoundEndedPayload('p1', 'p2'));
            expect(service.selectedPosture()).toBeNull();
        });

        it('devrait mettre isInCombat à false quand isCombatOver=true', () => {
            const payload = makeRoundEndedPayload('p1', 'p2', true, 'p1', 'p2');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);
            expect(service.isInCombat()).toBe(false);
        });

        it('devrait maintenir isInCombat à true quand isCombatOver=false', () => {
            socketSubjects[MatchEvents.RoundEnded]!.next(makeRoundEndedPayload('p1', 'p2', false));
            expect(service.isInCombat()).toBe(true);
        });

        it("devrait mettre à jour les HP de l'initiateur via lastRoundResult", () => {
            // round result donne life=7 pour p1
            socketSubjects[MatchEvents.RoundEnded]!.next(makeRoundEndedPayload('p1', 'p2'));
            expect(service.initiator()?.hp).toBe(7);
        });

        it("devrait mettre à jour les HP de l'opposant via lastRoundResult", () => {
            // round result donne life=5 pour p2
            socketSubjects[MatchEvents.RoundEnded]!.next(makeRoundEndedPayload('p1', 'p2'));
            expect(service.opponent()?.hp).toBe(5);
        });

        it("devrait appeler incrementPlayerWins quand isCombatOver=true et qu'il y a un vainqueur", () => {
            const payload = makeRoundEndedPayload('p1', 'p2', true, 'p1', 'p2');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);
            expect(mockMatchService.incrementPlayerWins).toHaveBeenCalledWith('p1');
        });

        it('ne devrait pas appeler incrementPlayerWins si pas de vainqueur (égalité)', () => {
            const payload = makeRoundEndedPayload('p1', 'p2', true, null, null);
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);
            expect(mockMatchService.incrementPlayerWins).not.toHaveBeenCalled();
        });
    });

    // ── showCombatResult ────────────────────────────────────────────────────

    describe('showCombatResult() — résultat affiché au joueur local', () => {
        beforeEach(() => {
            playersMap.set('local', makePlayer('local'));
            playersMap.set('enemy', makePlayer('enemy'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'local', oponentId: 'enemy' });
        });

        it('devrait afficher un message de victoire si le joueur local gagne', () => {
            const payload = makeRoundEndedPayload('local', 'enemy', true, 'local', 'enemy');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);

            expect(service.combatResult()).not.toBeNull();
            expect(service.combatResult()!.isWin).toBe(true);
        });

        it('devrait afficher un message de défaite si le joueur local perd', () => {
            const payload = makeRoundEndedPayload('local', 'enemy', true, 'enemy', 'local');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);

            expect(service.combatResult()).not.toBeNull();
            expect(service.combatResult()!.isWin).toBe(false);
        });

        // CAS LIMITE : égalité → winnerId=null → message d'égalité
        it("devrait afficher un message d'égalité si winnerId est null", () => {
            const payload = makeRoundEndedPayload('local', 'enemy', true, null, null);
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);

            expect(service.combatResult()).not.toBeNull();
            expect(service.combatResult()!.isWin).toBe(false);
        });

        // CAS LIMITE : le résultat disparaît automatiquement après COMBAT_RESULT_DISMISS_MS
        it('devrait auto-dismisser combatResult après 3 secondes', () => {
            const payload = makeRoundEndedPayload('local', 'enemy', true, 'local', 'enemy');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);

            expect(service.combatResult()).not.toBeNull();

            jasmine.clock().tick(COMBAT_RESULT_DISMISS_MS);

            expect(service.combatResult()).toBeNull();
        });

        it("ne devrait pas afficher combatResult si le joueur local n'est pas dans le combat", () => {
            // p1 vs p2 sans le joueur local
            playersMap.set('p1', makePlayer('p1'));
            playersMap.set('p2', makePlayer('p2'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            const payload = makeRoundEndedPayload('p1', 'p2', true, 'p1', 'p2');
            socketSubjects[MatchEvents.RoundEnded]!.next(payload);

            expect(service.combatResult()).toBeNull();
        });
    });

    // ── isLocalPlayerInCombat ───────────────────────────────────────────────

    describe('isLocalPlayerInCombat (computed)', () => {
        it("devrait retourner true si le joueur local est l'initiateur", () => {
            playersMap.set('local', makePlayer('local'));
            playersMap.set('p2', makePlayer('p2'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'local', oponentId: 'p2' });
            expect(service.isLocalPlayerInCombat()).toBe(true);
        });

        it("devrait retourner true si le joueur local est l'opposant", () => {
            playersMap.set('p1', makePlayer('p1'));
            playersMap.set('local', makePlayer('local'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'local' });
            expect(service.isLocalPlayerInCombat()).toBe(true);
        });

        it("devrait retourner false si le joueur local n'est pas dans le combat", () => {
            playersMap.set('p1', makePlayer('p1'));
            playersMap.set('p2', makePlayer('p2'));
            socketSubjects[MatchEvents.CombatStarted]!.next({ initiatorId: 'p1', oponentId: 'p2' });
            expect(service.isLocalPlayerInCombat()).toBe(false);
        });

        it('devrait retourner false avant tout combat', () => {
            expect(service.isLocalPlayerInCombat()).toBe(false);
        });
    });

    // ── timerDashOffset ─────────────────────────────────────────────────────

    describe('timerDashOffset (computed)', () => {
        it('devrait retourner 100 (barre vide) quand le timer est à 0', () => {
            service.handleCombatTick(1); // pour éviter la garde 0
            service.handleCombatTick(0); // ignoré
            // remainingTime = 1 mais pas 0, simulons directement
            (service as any).remainingTime.set(0);
            expect(service.timerDashOffset()).toBe(100);
        });

        it('devrait retourner 0 (barre pleine) quand il reste tout le temps', () => {
            (service as any).remainingTime.set(10); // COMBAT_TIMER_MAX = 10
            expect(service.timerDashOffset()).toBe(0);
        });

        it('devrait retourner 50 (mi-chemin) quand il reste la moitié du temps', () => {
            (service as any).remainingTime.set(5); // 5/10 = 0.5 → offset = 100 - 50 = 50
            expect(service.timerDashOffset()).toBe(50);
        });
    });

    // ── startCombat ─────────────────────────────────────────────────────────

    describe('startCombat()', () => {
        it('devrait envoyer RequestAttack quand un joueur est présent sur la cellule adjacente sélectionnée', () => {
            Object.defineProperty(mockMatchService, 'selectedCell', { get: () => 5, configurable: true });
            mockMapService.getCoordinates.and.returnValue({ x: 2, y: 1 });
            mockMatchService.findTargetPlayer.and.returnValue(makePlayer('p1'));

            service.startCombat();

            expect(mockSocketService.send).toHaveBeenCalledWith(
                MatchEvents.RequestAttack,
                { targetPlayerId: 'p1' },
            );
        });

        it('ne devrait pas envoyer RequestAttack si aucun joueur adjacent n\'est trouvé sur la cellule', () => {
            Object.defineProperty(mockMatchService, 'selectedCell', { get: () => 5, configurable: true });
            mockMapService.getCoordinates.and.returnValue({ x: 5, y: 5 });
            mockMatchService.findTargetPlayer.and.returnValue(undefined);

            service.startCombat();

            expect(mockSocketService.send).not.toHaveBeenCalled();
        });

        it('ne devrait pas envoyer RequestAttack si aucune cellule n\'est sélectionnée (selectedCell null)', () => {
            service.startCombat();

            expect(mockSocketService.send).not.toHaveBeenCalled();
        });

        it('ne devrait pas envoyer RequestAttack si la résolution de position échoue (getCoordinates retourne null)', () => {
            Object.defineProperty(mockMatchService, 'selectedCell', { get: () => 5, configurable: true });
            mockMapService.getCoordinates.and.returnValue(null);

            service.startCombat();

            expect(mockSocketService.send).not.toHaveBeenCalled();
        });
    });

    // ── PlayersUpdate socket ────────────────────────────────────────────────

    describe('PlayersUpdate socket event', () => {
        it('devrait appeler updatePlayers quand un événement PlayersUpdate est reçu', () => {
            const players = [makePlayer('p1')];
            socketSubjects[MatchEvents.PlayersUpdate]!.next({ players });
            expect(mockPlayersService.updatePlayers).toHaveBeenCalledWith(players);
        });
    });


});
