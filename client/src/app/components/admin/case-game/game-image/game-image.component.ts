import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-image',
  imports: [],
  templateUrl: './game-image.component.html',
  styleUrl: './game-image.component.scss',
})
export class GameImageComponent {
  readonly imageUrl = input<string>('assets/default-grid-image.jpg');

}
