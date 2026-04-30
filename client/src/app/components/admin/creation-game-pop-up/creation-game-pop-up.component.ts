import { Component, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';
import { GameCreationConfig } from '@common/interfaces/game-frontend/game-interface';


@Component({
  selector: 'app-creation-game-pop-up',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './creation-game-pop-up.component.html',
  styleUrl: './creation-game-pop-up.component.scss',
})
export class CreationGamePopUpComponent {
  readonly gameMode = GameMode;
  readonly gridSize = GridSize;

  readonly modes: GameMode[] = Object.values(GameMode);
  readonly cancel = output<void>();
  readonly create = output<GameCreationConfig>();

  readonly sizes: GridSize[] = (Object.values(GridSize).filter((value) => typeof value === 'number') as number[])
    .sort((sizeA, sizeB) => sizeA - sizeB) as GridSize[];

  readonly selectedMode: GameMode = GameMode.CLASSIC;
  readonly selectedSize: GridSize = GridSize.MEDIUM;

  modeLabel(mode: GameMode): string {
    switch (mode) {
      case GameMode.CLASSIC: return 'Classic';
      case GameMode.CTF: return 'CTF';
      default: return '';
    }
  }

  sizeLabel(size: GridSize): string {

    switch (size) {
      case GridSize.SMALL: return `Small (${size}x${size})`;
      case GridSize.MEDIUM: return `Medium (${size}x${size})`;
      case GridSize.LARGE: return `Large (${size}x${size})`;
      default: return `Erreur`;
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onCreate(): void {
    this.create.emit({ mode: this.selectedMode, size: this.selectedSize });
  }

}
