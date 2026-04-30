import { Component, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TileInterface } from '@common/interfaces/game-frontend/game-grid-interface';

@Component({
  selector: 'app-edition-tools',
  imports: [MatTooltipModule],
  templateUrl: './edition-tools.component.html',
  styleUrl: './edition-tools.component.scss',
  providers: [],
})
export class EditionToolComponent {

  readonly tile = input.required<TileInterface>();
  readonly isSelected = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly tileChoice = output<TileInterface>();

  onClickTileChoice() {
    if (this.disabled()) return;
    this.tileChoice.emit(this.tile());
  }
}
