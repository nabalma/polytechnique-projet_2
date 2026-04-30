import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SaveRestartSignalService {

    private saveAttemptSignalSource = new Subject<void>();

    private saveSignalSource = new Subject<void>();

    private readonly restartSignalSource = new Subject<void>();

    private saveInProgress = false;

    saveAttemptSignal = this.saveAttemptSignalSource.asObservable();

    saveSignal = this.saveSignalSource.asObservable();

    readonly restartSignal = this.restartSignalSource.asObservable();

    notifySaveAttempt() {
        this.saveAttemptSignalSource.next();
    }

    saveGame() {
        if (this.saveInProgress) return;
        this.saveInProgress = true;
        this.saveSignalSource.next();
    }

    isSaving(): boolean {
        return this.saveInProgress;
    }

    finishSaving() {
        this.saveInProgress = false;
    }

    restartGame() {
        this.restartSignalSource.next();
    }

}