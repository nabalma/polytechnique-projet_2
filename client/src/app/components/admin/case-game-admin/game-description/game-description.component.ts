import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-description',
  imports: [],
  templateUrl: './game-description.component.html',
  styleUrl: './game-description.component.scss',
})
export class GameDescriptionComponent {
  readonly description = input<string>('');
}
