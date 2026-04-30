import { Component, computed, inject, Input } from '@angular/core';
import { MapService } from '@app/services/match/map/map.service';
import { MatchService } from '@app/services/match/match.service';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { CellInterface } from '@common/interfaces/game-frontend/game-grid-interface';
import { Position } from '@common/interfaces/match/match-interface';

@Component({
  selector: 'app-cell',
  imports: [],
  templateUrl: './cell.component.html',
  styleUrls: ['./cell.component.scss'],
  standalone: true,
})

export class CellComponent {
  @Input() cellInfo!: CellInterface;
  @Input() playerId: string | null = null;
  @Input() index: number | null = null;
  private matchService = inject(MatchService);
  private mapService = inject(MapService);

  get avatar(): string {
    if (this.playerId) return this.matchService.getAvatar(this.playerId);
    return '';
  }

  get playerTeam(): string | undefined {
    if (!this.playerId) return undefined;
    return this.matchService.players().get(this.playerId)?.team;
  }

  get isActivePlayer(): boolean {
    if (!this.playerId) return false;
    return this.matchService.activePlayerId === this.playerId;
  }

  get isCurrentPlayer(): boolean {
    if (!this.playerId) return false;
    return this.matchService.currentPlayerId === this.playerId;
  }

  get isSanctuary(): boolean {
    const type = this.cellInfo.objects?.objectType;
    return type === ObjectType.COMBAT_SANCTUARY || type === ObjectType.HEAL_SANCTUARY;
  }

  get isSanctuaryInactive(): boolean {
    return this.isSanctuary && this.cellInfo.objects?.isActive === false;
  }

  get playerHasFlag(): boolean {
    if (!this.playerId) return false;
    return this.matchService.players().get(this.playerId)?.hasFlag ?? false;
  }
  isReachable = computed(() => {
    const cells: Position[] = this.matchService.reachableCells();
    const foundPos = cells.some((pos) => {
      const flatIndex = this.mapService.getFlatIndex(pos);
      return flatIndex === this.index;
    });
    return foundPos ? true : false;
  });

}