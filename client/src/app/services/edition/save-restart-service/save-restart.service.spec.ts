import { TestBed } from '@angular/core/testing';
import { SaveRestartSignalService } from './save-restart.service';

describe('Save and Restart Signal Service', () => {
    let saveRestartSignal: SaveRestartSignalService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SaveRestartSignalService],
        }); saveRestartSignal = TestBed.inject(SaveRestartSignalService);
    });

    it('should emit a signal when saveGame() is called', (done) => {
        saveRestartSignal.saveSignal.subscribe(() => {
            expect(true).toBe(true); done();
        }); saveRestartSignal.saveGame();
    });

    it('should emit  a signal when restart() is called', (done) => {
        saveRestartSignal.restartSignal.subscribe(() => {
            expect(true).toBe(true); done();
        }); saveRestartSignal.restartGame();
    });

});