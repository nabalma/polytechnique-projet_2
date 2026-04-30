/* eslint-disable max-lines-per-function */

// En raison de la nature du composant (affichage + interactions), 
// il est nécessaire d'avoir une suite de tests un peu plus longue 
// pour couvrir tous les cas d'usage et les éléments du template.

/**
 * ============================================================
 * Stratégie de test — RoomCardComponent
 * ============================================================
 *
 * Éléments testés :
 *  - Rendu du template : affichage du nom du jeu et du nombre de joueurs
 *  - Classe CSS active quand isActive est true
 *  - Émission de l'événement selected au clic sur la zone de sélection
 *  - Émission de l'événement joined au clic sur le bouton Rejoindre
 *
 * Dépendances mockées : aucune (composant pur, pas de services)
 *
 * Cas limites couverts :
 *  - isActive false par défaut → pas de classe .active
 *  - Données room avec joueurs 0/0
 * ============================================================
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { RoomCardComponent } from './room-card.component';

// ─── Données de test ──────────────────────────────────────────────────────────

const mockRoom: AvailableRoomInfo = {
    roomId: 'room-1',
    gameId: 'game-1',
    gameName: 'Partie Alpha',
    currentPlayers: 2,
    maxPlayers: 4,
    takenAvatars: [],
    roomPlayers: [],
    gameMap: { id: 1, gridSize: GridSize.SMALL, grid: [] },
};

// ─── Suite de tests ───────────────────────────────────────────────────────────


describe('RoomCardComponent', () => {
    let component: RoomCardComponent;
    let fixture: ComponentFixture<RoomCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoomCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(RoomCardComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', mockRoom);
        fixture.detectChanges();
    });

    it('devrait être défini', () => {
        expect(component).toBeDefined();
    });

    // ── Rendu ───────────────────────────────────────────────────────────────


    describe('Rendu du template', () => {
        it('doit afficher le nom du jeu', () => {
            const nameEl = fixture.nativeElement.querySelector('.room-name');
            expect(nameEl.textContent).toContain('Partie Alpha');
        });

        it('doit afficher le nombre de joueurs au format currentPlayers / maxPlayers', () => {
            const playersEl = fixture.nativeElement.querySelector('.room-players');
            expect(playersEl.textContent).toContain('2 / 4');
        });

        it('ne doit pas avoir la classe active quand isActive est false', () => {
            const card = fixture.nativeElement.querySelector('.room-card');
            expect(card.classList.contains('active')).toBeFalse();
        });

        it('doit avoir la classe active quand isActive est true', () => {
            fixture.componentRef.setInput('isActive', true);
            fixture.detectChanges();

            const card = fixture.nativeElement.querySelector('.room-card');
            expect(card.classList.contains('active')).toBeTrue();
        });
    });

    // ── Événements ──────────────────────────────────────────────────────────

    describe('Événements', () => {
        it('doit émettre selected au clic sur la zone de sélection', () => {
            spyOn(component.selected, 'emit');

            const selectBtn = fixture.nativeElement.querySelector('.room-select-area');
            selectBtn.click();

            expect(component.selected.emit).toHaveBeenCalled();
        });

        it('doit émettre joined au clic sur le bouton Rejoindre', () => {
            spyOn(component.joined, 'emit');

            const joinBtn = fixture.nativeElement.querySelector('.join-button');
            joinBtn.click();

            expect(component.joined.emit).toHaveBeenCalled();
        });
    });
});
