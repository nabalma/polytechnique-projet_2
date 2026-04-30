/* eslint-disable max-lines-per-function */

// En raison de la nature du composant (affichage + interactions),
// il est nécessaire d'avoir une suite de tests un peu plus longue
// pour couvrir tous les cas d'usage et les éléments du template.

/**
 * ============================================================
 * Stratégie de test — RoomPreviewComponent
 * ============================================================
 *
 * Éléments testés :
 *  - Rendu du template : affichage du nom du jeu
 *  - Affichage de la grille via app-game-grid
 *  - Affichage de la liste des joueurs (avatar + nom)
 *
 * Dépendances mockées :
 *  - MatchService et MapService mockés (requis par GameGridComponent et CellComponent)
 *
 * Cas limites couverts :
 *  - Room sans joueurs → aucun avatar affiché
 *  - Room avec plusieurs joueurs → tous affichés
 * ============================================================
 */

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { AvailableRoomInfo } from '@common/interfaces/waiting-room/waiting-room-interface';
import { RoomPreviewComponent } from './room-preview.component';

// ─── Données de test ──────────────────────────────────────────────────────────

const mockRoom: AvailableRoomInfo = {
    roomId: 'room-1',
    gameId: 'game-1',
    gameName: 'Partie Alpha',
    currentPlayers: 2,
    maxPlayers: 4,
    takenAvatars: ['avatar1.png', 'avatar2.png'],
    roomPlayers: [
        { name: 'Alice', avatar: 'avatar1.png' },
        { name: 'Bob', avatar: 'avatar2.png' },
    ],
    gameMap: { id: 1, gridSize: GridSize.SMALL, grid: [] },
};

// ─── Mocks services ───────────────────────────────────────────────────────────

const mockMatchService = {
    players: signal(new Map()),
    reachableCells: signal([]),
    actionMode: false,
    isMyTurn: () => false,
    currentPlayer: undefined,
    selectedCell: null,
    currentPlayerId: '',
    activePlayerId: '',
    getAvatar: () => '',
};

const mockMapService = {
    init: jasmine.createSpy('init').and.returnValue(Promise.resolve()),
    getFlatIndex: () => -1,
};

// ─── Suite de tests ───────────────────────────────────────────────────────────

describe('RoomPreviewComponent', () => {
    let component: RoomPreviewComponent;
    let fixture: ComponentFixture<RoomPreviewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoomPreviewComponent],
            providers: [
                { provide: MatchService, useValue: mockMatchService },
                { provide: MapService, useValue: mockMapService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RoomPreviewComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('room', mockRoom);
        fixture.detectChanges();
    });

    it('devrait être défini', () => {
        expect(component).toBeDefined();
    });

    // ── Rendu ───────────────────────────────────────────────────────────────


    describe('Rendu du template', () => {
        it('doit afficher le nom du jeu dans le titre', () => {
            const titleEl = fixture.nativeElement.querySelector('.preview-title');
            expect(titleEl.textContent).toContain('Partie Alpha');
        });

        it('doit rendre le composant app-game-grid', () => {
            const grid = fixture.nativeElement.querySelector('app-game-grid');
            expect(grid).toBeTruthy();
        });

        it('doit afficher le label "Joueurs présents"', () => {
            const label = fixture.nativeElement.querySelector('.players-label');
            expect(label.textContent).toContain('Joueurs présents');
        });

        it('doit afficher autant de joueurs que dans roomPlayers', () => {
            const players = fixture.nativeElement.querySelectorAll('.player');
            expect(players.length).toBe(2);
        });

        it('doit afficher le nom de chaque joueur', () => {
            const names = fixture.nativeElement.querySelectorAll('.player-name');
            expect(names[0].textContent).toContain('Alice');
            expect(names[1].textContent).toContain('Bob');
        });

        it('doit afficher les avatars des joueurs', () => {
            const avatars = fixture.nativeElement.querySelectorAll('.player-avatar');
            expect(avatars[0].getAttribute('src')).toBe('avatar1.png');
            expect(avatars[1].getAttribute('src')).toBe('avatar2.png');
        });
    });

    // ── Cas limites ─────────────────────────────────────────────────────────

    describe('Cas limites', () => {
        it('ne doit afficher aucun joueur si roomPlayers est vide', () => {
            fixture.componentRef.setInput('room', { ...mockRoom, roomPlayers: [] });
            fixture.detectChanges();

            const players = fixture.nativeElement.querySelectorAll('.player');
            expect(players.length).toBe(0);
        });
    });
});
