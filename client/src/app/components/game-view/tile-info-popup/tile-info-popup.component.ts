import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ObjectType, TileType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { Player } from '@common/interfaces/player/player-interface';

@Component({
    selector: 'app-tile-info-popup',
    standalone: true,
    templateUrl: './tile-info-popup.component.html',
    styleUrl: './tile-info-popup.component.scss',
})
export class TileInfoPopupComponent {
    @Input() cellInfo!: CellInterface;
    @Input() player: Player | null = null;
    @Input() x = 0;
    @Input() y = 0;
    @Output() closed = new EventEmitter<void>();

    get tileName(): string {
        const names: Record<string, string> = {
            [TileType.DEFAULT]: 'Gazon',
            [TileType.WATER]: 'Eau',
            [TileType.ICE]: 'Glace',
            [TileType.WALL]: 'Mur',
            [TileType.DOOR_CLOSED]: 'Porte fermée',
            [TileType.DOOR_OPEN]: 'Porte ouverte',
        };
        return names[this.cellInfo.tile.tileType] ?? 'Terrain';
    }

    get tileMoveCost(): string {
        const costs: Record<string, string> = {
            [TileType.DEFAULT]: 'Coût : 1 point de mouvement',
            [TileType.WATER]: 'Coût : 2 points de mouvement',
            [TileType.ICE]: 'Coût : 0 point de mouvement',
            [TileType.WALL]: 'Infranchissable',
            [TileType.DOOR_CLOSED]: 'Infranchissable (fermée)',
            [TileType.DOOR_OPEN]: 'Coût : 1 point de mouvement',
        };
        return costs[this.cellInfo.tile.tileType] ?? 'Coût : 0 point de mouvement';
    }

    get tileDescription(): string {
        const descs: Record<string, string> = {
            [TileType.DEFAULT]: 'Terrain standard, rien de spécial.',
            [TileType.WATER]: 'Terrain difficile, vos bottes ne vous remercieront pas.',
            [TileType.ICE]: 'Glissant ! Vous avancez automatiquement mais difficile de s\'arrêter.',
            [TileType.WALL]: 'Même les plus téméraires font demi-tour ici.',
            [TileType.DOOR_CLOSED]: 'Elle ne s\'ouvrira pas toute seule ! Utilisez une action pour forcer le passage.',
            [TileType.DOOR_OPEN]: 'Grande ouverte, le passage est libre.',
        };
        return descs[this.cellInfo.tile.tileType] ?? '';
    }

    get objectName(): string | null {
        if (!this.cellInfo.objects) return null;
        const names: Record<string, string> = {
            [ObjectType.START_POINT]: 'Point de départ',
            [ObjectType.FLAG]: 'Drapeau',
            [ObjectType.COMBAT_SANCTUARY]: 'Sanctuaire de combat',
            [ObjectType.HEAL_SANCTUARY]: 'Sanctuaire de santé',
        };
        return names[this.cellInfo.objects.objectType] ?? null;
    }

    get objectDescription(): string | null {
        if (!this.cellInfo.objects) return null;
        const descs: Record<string, string> = {
            [ObjectType.START_POINT]: 'Votre point de départ. Revenez ici avec le drapeau pour gagner !',
            [ObjectType.FLAG]: 'Ramassez-le et revenez à votre point de départ pour remporter la victoire.',
            [ObjectType.COMBAT_SANCTUARY]: 'Utilisez une action ici pour obtenir un bonus de combat temporaire.',
            [ObjectType.HEAL_SANCTUARY]: 'Utilisez une action ici pour récupérer des points de vie.',
        };
        return descs[this.cellInfo.objects.objectType] ?? null;
    }
}
