import { Component, input } from '@angular/core';
import { SaveRestartSignalService } from '@app/services/edition/save-restart-service/save-restart.service';

@Component({
  selector: 'app-button-center',
  imports: [],
  templateUrl: './button-center.component.html',
  styleUrl: './button-center.component.scss',
})
export class ButtonCenterComponent {

  isGameNameMissing = input.required<boolean>();
  isGameDescriptionMissing = input.required<boolean>();


  constructor(public saveRestartService: SaveRestartSignalService) {}

  saveClick() {
    this.saveRestartService.notifySaveAttempt();

    if (this.isGameNameMissing() || this.isGameDescriptionMissing()) {
      return;
    }

    this.saveRestartService.saveGame();
  }

  restartClick() {
    this.saveRestartService.restartGame();
  }

}
