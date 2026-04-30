/* eslint-disable max-lines-per-function, @typescript-eslint/no-magic-numbers -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */


// En raison de la nature du composant (affichage + interactions),
// il est nécessaire d'avoir une suite de tests un peu plus longue
// pour couvrir tous les cas d'usage et les éléments du template.

/**
 * ============================================================
 * Stratégie de test — CombatViewComponent
 * ============================================================
 *
 * Éléments testés :
 *  - Méthodes chooseDefensive / chooseOffensive → délèguent au service
 *  - Méthodes isDefensive / isOffensive → lisent le signal selectedPosture
 *  - Rendu conditionnel : backdrop, panneau combat, bannière spectateur, bannière résultat
 *  - Classes CSS des boutons de posture selon la posture sélectionnée
 *
 * Dépendances mockées :
 *  - CombatService : signals remplacés par des WritableSignals contrôlables + spies sur les méthodes
 *  - MatchService, TimerService : mocks minimaux (non utilisés directement par la classe)
 *
 * Cas limites couverts :
 *  - Pas de combat et pas de résultat → backdrop masqué
 *  - combatResult non-null mais joueur local absent → pas de bannière de résultat
 *  - En combat mais joueur local absent → bannière spectateur (pas de panneau)
 *  - Aucune posture sélectionnée → isDefensive et isOffensive retournent false
 * ============================================================
 */

import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CombatService } from '@app/services/combat/combat.service';
import { MatchService } from '@app/services/match/match.service';
import { TimerService } from '@app/services/timer/timer.service';
import { Posture } from '@common/enum/match/match.enum';
import { CombatFighter } from '@common/interfaces/match/match-interface';
import { CombatViewComponent } from './combat-view.component';

// ─── Données de test ──────────────────────────────────────────────────────────

const makeFighter = (id: string, name: string): CombatFighter => ({
    id,
    name,
    avatar: '',
    hp: 10,
    maxHp: 10,
});

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockMatchService = {};

const mockTimerService = { remainingTime: 0, remainingTimeSignal: signal(0) };

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('CombatViewComponent', () => {
    let component: CombatViewComponent;
    let fixture: ComponentFixture<CombatViewComponent>;

    let isInCombatSig: WritableSignal<boolean>;
    let combatResultSig: WritableSignal<{ isWin: boolean; message: string } | null>;
    let isLocalPlayerInCombatSig: WritableSignal<boolean>;
    let selectedPostureSig: WritableSignal<Posture | null>;
    let mockCombatService: Record<string, unknown>;

    beforeEach(async () => {
        isInCombatSig = signal(false);
        combatResultSig = signal(null);
        isLocalPlayerInCombatSig = signal(false);
        selectedPostureSig = signal(null);

        mockCombatService = {
            isInCombat: isInCombatSig,
            combatResult: combatResultSig,
            isLocalPlayerInCombat: isLocalPlayerInCombatSig,
            selectedPosture: selectedPostureSig,
            initiator: signal(makeFighter('p1', 'Alice')),
            opponent: signal(makeFighter('p2', 'Bob')),
            roundNumber: signal(1),
            remainingTime: signal(5),
            timerDashOffset: signal(0),
            lastRoundResult: signal(null),
            myRoundValues: signal(null),
            opponentRoundValues: signal(null),
            hasChosenPosture: signal(false),
            choosePosture: jasmine.createSpy('choosePosture'),
            dismissResult: jasmine.createSpy('dismissResult'),
        };

        await TestBed.configureTestingModule({
            imports: [CombatViewComponent],
            providers: [
                { provide: CombatService, useValue: mockCombatService },
                { provide: MatchService, useValue: mockMatchService },
                { provide: TimerService, useValue: mockTimerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatViewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('devrait être défini', () => {
        expect(component).toBeDefined();
    });

    // ── Méthodes de posture ─────────────────────────────────────────────────

    describe('chooseDefensive', () => {
        it('doit appeler choosePosture avec Posture.Defensive', () => {
            component.chooseDefensive();
            expect(mockCombatService.choosePosture as jasmine.Spy).toHaveBeenCalledWith(Posture.Defensive);
        });
    });

    describe('chooseOffensive', () => {
        it('doit appeler choosePosture avec Posture.Offensive', () => {
            component.chooseOffensive();
            expect(mockCombatService.choosePosture as jasmine.Spy).toHaveBeenCalledWith(Posture.Offensive);
        });
    });

    describe('isDefensive', () => {
        it('doit retourner true si la posture sélectionnée est Defensive', () => {
            selectedPostureSig.set(Posture.Defensive);
            expect(component.isDefensive()).toBeTrue();
        });

        it('doit retourner false si la posture sélectionnée est Offensive', () => {
            selectedPostureSig.set(Posture.Offensive);
            expect(component.isDefensive()).toBeFalse();
        });

        it('doit retourner false si aucune posture sélectionnée', () => {
            selectedPostureSig.set(null);
            expect(component.isDefensive()).toBeFalse();
        });
    });

    describe('isOffensive', () => {
        it('doit retourner true si la posture sélectionnée est Offensive', () => {
            selectedPostureSig.set(Posture.Offensive);
            expect(component.isOffensive()).toBeTrue();
        });

        it('doit retourner false si la posture sélectionnée est Defensive', () => {
            selectedPostureSig.set(Posture.Defensive);
            expect(component.isOffensive()).toBeFalse();
        });

        it('doit retourner false si aucune posture sélectionnée', () => {
            selectedPostureSig.set(null);
            expect(component.isOffensive()).toBeFalse();
        });
    });

    // ── Rendu du template ───────────────────────────────────────────────────

    describe('Rendu du template', () => {
        it('ne doit pas afficher le backdrop si pas en combat et pas de résultat', () => {
            expect(fixture.nativeElement.querySelector('.combat-backdrop')).toBeNull();
        });

        it('doit afficher le backdrop si isInCombat est true', () => {
            isInCombatSig.set(true);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.combat-backdrop')).toBeTruthy();
        });

        it('doit afficher le backdrop si combatResult est non-null', () => {
            combatResultSig.set({ isWin: true, message: 'Victoire !' });
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.combat-backdrop')).toBeTruthy();
        });

        it('doit afficher la bannière de résultat si combatResult et joueur local dans le combat', () => {
            combatResultSig.set({ isWin: true, message: 'Victoire !' });
            isLocalPlayerInCombatSig.set(true);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.result-banner')).toBeTruthy();
        });

        it("ne doit pas afficher la bannière de résultat si le joueur local n'est pas dans le combat", () => {
            combatResultSig.set({ isWin: true, message: 'Victoire !' });
            isLocalPlayerInCombatSig.set(false);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.result-banner')).toBeNull();
        });

        it('doit afficher le panneau de combat si en combat et joueur local dedans', () => {
            isInCombatSig.set(true);
            isLocalPlayerInCombatSig.set(true);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.combat-panel')).toBeTruthy();
            expect(fixture.nativeElement.querySelector('.spectator-banner')).toBeNull();
        });

        it('doit afficher la bannière spectateur si en combat mais joueur local absent', () => {
            isInCombatSig.set(true);
            isLocalPlayerInCombatSig.set(false);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.spectator-banner')).toBeTruthy();
            expect(fixture.nativeElement.querySelector('.combat-panel')).toBeNull();
        });
    });

    // ── Classes CSS des boutons de posture ──────────────────────────────────

    describe('Classes CSS des boutons de posture', () => {
        beforeEach(() => {
            isInCombatSig.set(true);
            isLocalPlayerInCombatSig.set(true);
            fixture.detectChanges();
        });

        it('doit marquer le bouton Offensive comme sélectionné quand la posture est Offensive', () => {
            selectedPostureSig.set(Posture.Offensive);
            fixture.detectChanges();
            const btn = fixture.nativeElement.querySelector('.posture-btn--offensive');
            expect(btn.classList.contains('posture-btn--selected')).toBeTrue();
        });

        it('ne doit pas marquer le bouton Defensive comme sélectionné quand la posture est Offensive', () => {
            selectedPostureSig.set(Posture.Offensive);
            fixture.detectChanges();
            const btn = fixture.nativeElement.querySelector('.posture-btn--defensive');
            expect(btn.classList.contains('posture-btn--selected')).toBeFalse();
        });

        it('doit marquer le bouton Defensive comme sélectionné quand la posture est Defensive', () => {
            selectedPostureSig.set(Posture.Defensive);
            fixture.detectChanges();
            const btn = fixture.nativeElement.querySelector('.posture-btn--defensive');
            expect(btn.classList.contains('posture-btn--selected')).toBeTrue();
        });
    });

    // ── Cas limites ─────────────────────────────────────────────────────────

    describe('Cas limites', () => {
        it('ne doit afficher ni panneau ni bannière spectateur si pas en combat', () => {
            isInCombatSig.set(false);
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelector('.combat-panel')).toBeNull();
            expect(fixture.nativeElement.querySelector('.spectator-banner')).toBeNull();
        });
    });
});
