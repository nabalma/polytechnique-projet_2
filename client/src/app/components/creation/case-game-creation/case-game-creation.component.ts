import { Component } from '@angular/core';
import { InfoGameCreationComponent } from './game-information-creation/info-game-creation.component';
import { ImageGameCreationComponent } from './image-game-creation/image-game-creation.component';
@Component({
  selector: 'app-case-game-creation',
  imports: [ImageGameCreationComponent, InfoGameCreationComponent],
  templateUrl: './case-game-creation.component.html',
  styleUrl: './case-game-creation.component.scss',
})
export class CaseGameCreationComponent {

}
