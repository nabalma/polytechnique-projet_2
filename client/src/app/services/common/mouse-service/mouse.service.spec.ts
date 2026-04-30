/* eslint-disable max-lines-per-function */
/* Nous testons plusieurs fonctionnalies ici qui couvre variantes de clicks de bouton n */
import { TestBed } from '@angular/core/testing';
import { MouseService } from '@app/services/common/mouse-service/mouse.service';

describe('MouseAction', () => {
    let mouseService: MouseService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [MouseService],
        });

        mouseService = TestBed.inject(MouseService);
    });

    it('onLeftClick the service must return true', () => {
        const mockLeftClick = new MouseEvent('click', { button: 0 });

        expect(mouseService.verifyLeftMouseButtonClick(mockLeftClick)).toBe(true);
    });

    it('onLeftClick the service must return false', () => {
        const mockLeftClick = new MouseEvent('click', { button: 1 });

        expect(mouseService.verifyLeftMouseButtonClick(mockLeftClick)).toBe(false);
    });

    it('onLeft button maintained the service must return true', () => {
        const mockLeftClick = new MouseEvent('click', { buttons: 1 });

        expect(mouseService.verifyLeftMouseButtonMaintained(mockLeftClick)).toBe(true);
    });

    it('onLeft button maintained the service must return false', () => {
        const mockLeftClick = new MouseEvent('click', { buttons: 0 });

        expect(mouseService.verifyLeftMouseButtonMaintained(mockLeftClick)).toBe(false);
    });

    it('OnRightClick the service must return true', () => {
        const mockRightClick = new MouseEvent('contextMenu', { buttons: 2 });

        expect(mouseService.verifyRightMouseButton(mockRightClick)).toBe(true);

    });

    it('OnRightClick the service must return false', () => {
        const mockRightClick = new MouseEvent('click', { buttons: 1 });

        expect(mouseService.verifyRightMouseButton(mockRightClick)).toBe(false);

    });

    it('Shift Key Pressed and must return true', () => {
        const mockShiftKeyPressed = new MouseEvent('click', { shiftKey: true });

        expect(mouseService.verifyShiftKeyBoardIsPressed(mockShiftKeyPressed)).toBe(true);
    });


    it('Shift Key not Pressed and must return false', () => {
        const mockShiftKeyPressed = new MouseEvent('click', { shiftKey: false });

        expect(mouseService.verifyShiftKeyBoardIsPressed(mockShiftKeyPressed)).toBe(false);
    });


});