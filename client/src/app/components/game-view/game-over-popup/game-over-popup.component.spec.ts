/* eslint-disable max-lines-per-function, @typescript-eslint/no-magic-numbers -- On désactive ces règles parce que ce fichier de test contient des scénarios longs, des callbacks imbriqués, des assertions non nulles contrôlées et des valeurs numériques fixes acceptées dans le contexte des tests. */


// En raison de la nature du composant (logique de countdown + nombreux getters conditionnels),
// il est nécessaire d'avoir une suite de tests un peu plus longue
// pour couvrir tous les cas d'usage et les éléments du template.

/**
 * ============================================================
 * Stratégie de test — GameOverPopupComponent
 * ============================================================
 *
 * Éléments testés :
 *  - Countdown : démarre à GAME_OVER_REDIRECT_DELAY_SECONDS, décrémente chaque seconde,
 *                appelle onClose quand il atteint 0, s'arrête après ngOnDestroy
 *  - Événement closed : émis par onClose
 *  - isCancelled : true si gameOver().cancelled === true
 *  - isCurrentPlayerWinner : par id (classique) et par équipe (CTF), false si annulé ou joueur introuvable
 *  - winnerTeamLabel : renvoie le libellé depuis TEAM_LABELS
 *  - title / icon : valeurs correctes selon le contexte (annulé, victoire, défaite)
 *  - victoryMessage / defeatMessage : message CTF si équipe présente, sinon classique
 *
 * Dépendances mockées :
 *  - MatchService : players (signal sur Map mutable) + currentPlayerId = 'local'
 *
 * Cas limites couverts :
 *  - Joueur local introuvable dans la map → isCurrentPlayerWinner = false
 *  - Équipe gagnante présente mais joueur sans équipe → comparaison par id
 *  - winnerTeam absent → winnerTeamLabel = ''
 * ============================================================
 */

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchService } from '@app/services/match/match.service';
import {
    GAME_OVER_ICONS,
    GAME_OVER_MESSAGES_CLASSIC,
    GAME_OVER_MESSAGES_CTF,
    GAME_OVER_REDIRECT_DELAY_SECONDS,
    GAME_OVER_TITLES,
} from '@common/constants/game-view/game-over.constants';
import { GameOverPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { GameOverPopupComponent } from './game-over-popup.component';

// ─── Données de test ──────────────────────────────────────────────────────────

const makePayload = (overrides: Partial<GameOverPayload> = {}): GameOverPayload => ({
    winnerId: 'p1',
    winnerName: 'Alice',
    stats: {} as GameOverPayload['stats'],
    ...overrides,
});

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('GameOverPopupComponent', () => {
    let component: GameOverPopupComponent;
    let fixture: ComponentFixture<GameOverPopupComponent>;
    let playersMap: Map<string, { id: string; name: string; team?: string }>;
    let mockMatchService: { players: ReturnType<typeof signal>; currentPlayerId: string };

    const setInput = (payload: GameOverPayload): void => {
        fixture.componentRef.setInput('gameOver', payload);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        playersMap = new Map();
        mockMatchService = {
            players: signal(playersMap),
            get currentPlayerId() {
                return 'local';
            },
        };

        await TestBed.configureTestingModule({
            imports: [GameOverPopupComponent],
            providers: [{ provide: MatchService, useValue: mockMatchService }],
        }).compileComponents();

        jasmine.clock().install();

        fixture = TestBed.createComponent(GameOverPopupComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('gameOver', makePayload());
        fixture.detectChanges();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('devrait être défini', () => {
        expect(component).toBeDefined();
    });

    // ── Countdown ───────────────────────────────────────────────────────────

    describe('Countdown', () => {
        it('doit démarrer à GAME_OVER_REDIRECT_DELAY_SECONDS', () => {
            expect(component.countdown).toBe(GAME_OVER_REDIRECT_DELAY_SECONDS);
        });

        it('doit décrémenter de 1 après chaque seconde', () => {
            jasmine.clock().tick(1000);
            expect(component.countdown).toBe(GAME_OVER_REDIRECT_DELAY_SECONDS - 1);
        });

        it('doit appeler onClose quand le countdown atteint 0', () => {
            spyOn(component, 'onClose');
            jasmine.clock().tick(GAME_OVER_REDIRECT_DELAY_SECONDS * 1000);
            expect(component.onClose).toHaveBeenCalled();
        });

        it('doit arrêter le countdown après ngOnDestroy', () => {
            component.ngOnDestroy();
            const before = component.countdown;
            jasmine.clock().tick(3000);
            expect(component.countdown).toBe(before);
        });
    });

    // ── Événements ──────────────────────────────────────────────────────────

    describe('Événements', () => {
        it('doit émettre closed quand onClose est appelé', () => {
            spyOn(component.closed, 'emit');
            component.onClose();
            expect(component.closed.emit).toHaveBeenCalled();
        });
    });

    // ── isCancelled ─────────────────────────────────────────────────────────

    describe('isCancelled', () => {
        it('doit retourner true si cancelled est true', () => {
            setInput(makePayload({ cancelled: true }));
            expect(component.isCancelled).toBeTrue();
        });

        it('doit retourner false si cancelled est absent', () => {
            setInput(makePayload());
            expect(component.isCancelled).toBeFalse();
        });
    });

    // ── isCurrentPlayerWinner ────────────────────────────────────────────────

    describe('isCurrentPlayerWinner', () => {
        it('doit retourner false si la partie est annulée', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local', cancelled: true }));
            expect(component.isCurrentPlayerWinner).toBeFalse();
        });

        it('doit retourner true si le joueur local est le vainqueur (classique)', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local' }));
            expect(component.isCurrentPlayerWinner).toBeTrue();
        });

        it("doit retourner false si le joueur local n'est pas le vainqueur (classique)", () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'p2' }));
            expect(component.isCurrentPlayerWinner).toBeFalse();
        });

        it("doit retourner true si le joueur local est dans l'équipe gagnante (CTF)", () => {
            playersMap.set('local', { id: 'local', name: 'Local', team: 'RED' });
            setInput(makePayload({ winnerTeam: 'RED' }));
            expect(component.isCurrentPlayerWinner).toBeTrue();
        });

        it('doit retourner false si le joueur local est dans une équipe perdante (CTF)', () => {
            playersMap.set('local', { id: 'local', name: 'Local', team: 'BLUE' });
            setInput(makePayload({ winnerTeam: 'RED' }));
            expect(component.isCurrentPlayerWinner).toBeFalse();
        });

        it('doit retourner false si le joueur local est introuvable', () => {
            playersMap.clear();
            setInput(makePayload({ winnerId: 'local' }));
            expect(component.isCurrentPlayerWinner).toBeFalse();
        });

        it("doit comparer par id si l'équipe gagnante est présente mais le joueur n'a pas d'équipe", () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local', winnerTeam: 'RED' }));
            expect(component.isCurrentPlayerWinner).toBeTrue();
        });
    });

    // ── winnerTeamLabel ──────────────────────────────────────────────────────

    describe('winnerTeamLabel', () => {
        it("doit retourner le libellé 'Rouge' pour l'équipe RED", () => {
            setInput(makePayload({ winnerTeam: 'RED' }));
            expect(component.winnerTeamLabel).toBe('Rouge');
        });

        it("doit retourner le libellé 'Bleue' pour l'équipe BLUE", () => {
            setInput(makePayload({ winnerTeam: 'BLUE' }));
            expect(component.winnerTeamLabel).toBe('Bleue');
        });

        it("doit retourner '' si aucune équipe gagnante", () => {
            setInput(makePayload());
            expect(component.winnerTeamLabel).toBe('');
        });
    });

    // ── title ────────────────────────────────────────────────────────────────

    describe('title', () => {
        it('doit retourner le titre annulé si la partie est annulée', () => {
            setInput(makePayload({ cancelled: true }));
            expect(component.title).toBe(GAME_OVER_TITLES.cancelled);
        });

        it('doit retourner le titre de victoire si le joueur local gagne', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local' }));
            expect(component.title).toBe(GAME_OVER_TITLES.victory);
        });

        it('doit retourner le titre de défaite si le joueur local perd', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'p2' }));
            expect(component.title).toBe(GAME_OVER_TITLES.defeat);
        });
    });

    // ── icon ─────────────────────────────────────────────────────────────────

    describe('icon', () => {
        it("doit retourner l'icône annulée si la partie est annulée", () => {
            setInput(makePayload({ cancelled: true }));
            expect(component.icon).toBe(GAME_OVER_ICONS.cancelled);
        });

        it("doit retourner l'icône de victoire si le joueur local gagne", () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local' }));
            expect(component.icon).toBe(GAME_OVER_ICONS.victory);
        });

        it("doit retourner l'icône de défaite si le joueur local perd", () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'p2' }));
            expect(component.icon).toBe(GAME_OVER_ICONS.defeat);
        });
    });

    // ── victoryMessage ───────────────────────────────────────────────────────

    describe('victoryMessage', () => {
        it('doit retourner le message CTF si une équipe gagnante est présente', () => {
            setInput(makePayload({ winnerTeam: 'RED' }));
            expect(component.victoryMessage).toBe(GAME_OVER_MESSAGES_CTF.victory);
        });

        it("doit retourner le message classique si pas d'équipe", () => {
            setInput(makePayload());
            expect(component.victoryMessage).toBe(GAME_OVER_MESSAGES_CLASSIC.victory);
        });
    });

    // ── defeatMessage ────────────────────────────────────────────────────────

    describe('defeatMessage', () => {
        it('doit retourner le message CTF de défaite si une équipe gagnante est présente', () => {
            setInput(makePayload({ winnerName: 'Alice', winnerTeam: 'RED' }));
            expect(component.defeatMessage).toBe(GAME_OVER_MESSAGES_CTF.defeat('Alice', 'Rouge'));
        });

        it("doit retourner le message classique de défaite si pas d'équipe", () => {
            setInput(makePayload({ winnerName: 'Alice' }));
            expect(component.defeatMessage).toBe(GAME_OVER_MESSAGES_CLASSIC.defeat('Alice'));
        });
    });

    // ── Rendu du template ───────────────────────────────────────────────────

    describe('Rendu du template', () => {
        it("doit afficher le titre dans l'élément h2", () => {
            setInput(makePayload({ cancelled: true }));
            const h2 = fixture.nativeElement.querySelector('.popup-title');
            expect(h2.textContent).toContain(GAME_OVER_TITLES.cancelled);
        });

        it('doit afficher le countdown initial dans le texte de redirection', () => {
            const countdown = fixture.nativeElement.querySelector('.countdown');
            expect(countdown.textContent).toContain(String(GAME_OVER_REDIRECT_DELAY_SECONDS));
        });

        it('doit afficher la classe cancelled sur le popup si la partie est annulée', () => {
            setInput(makePayload({ cancelled: true }));
            const popup = fixture.nativeElement.querySelector('.popup');
            expect(popup.classList.contains('cancelled')).toBeTrue();
        });

        it('doit afficher la classe victory si le joueur local gagne', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'local' }));
            const popup = fixture.nativeElement.querySelector('.popup');
            expect(popup.classList.contains('victory')).toBeTrue();
        });

        it('doit afficher la classe defeat si le joueur local perd', () => {
            playersMap.set('local', { id: 'local', name: 'Local' });
            setInput(makePayload({ winnerId: 'p2' }));
            const popup = fixture.nativeElement.querySelector('.popup');
            expect(popup.classList.contains('defeat')).toBeTrue();
        });
    });
});
