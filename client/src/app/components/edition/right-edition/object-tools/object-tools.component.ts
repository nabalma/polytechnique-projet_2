import { Component, input, output, WritableSignal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ObjectType } from '@common/enum/game/grid/game-grid.enum';
import { ObjectInterface } from '@common/interfaces/game-frontend/game-grid-interface';

@Component({
  selector: 'app-object-tools',
  imports: [MatTooltipModule],
  templateUrl: './object-tools.component.html',
  styleUrl: './object-tools.component.scss',
  providers: [],
})
export class ObjectToolsComponent {

  readonly object = input<WritableSignal<ObjectInterface>>(null as unknown as WritableSignal<ObjectInterface>);
  readonly isSelected = input<boolean>(false);

  readonly objectChoice = output<WritableSignal<ObjectInterface>>();

  get isDisabled(): boolean {
    return (this.object()().quantity ?? 0) <= 0;
  }

  get shouldShowQuantity(): boolean {
    const objectType = this.object()().objectType;
    return objectType !== ObjectType.COMBAT_SANCTUARY && objectType !== ObjectType.HEAL_SANCTUARY;
  }

  onClickObjectChoice() {
    if (this.isDisabled) return;
    this.objectChoice.emit(this.object());
  }

}
