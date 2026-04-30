import { Injectable } from '@angular/core';
import { MouseButton } from '@common/enum/movement/mouse-event.enum';

@Injectable({
    providedIn: 'root',
})

export class MouseService {

    verifyShiftKeyBoardIsPressed(event: MouseEvent): boolean {

        return event.shiftKey;

    }

    verifyLeftMouseButtonMaintained(event: MouseEvent): boolean {
        if (event.buttons === MouseButton.LeftMaintained) {
            return true;
        }

        return false;

    }

    verifyLeftMouseButtonClick(event: MouseEvent) {
        if (event.button === MouseButton.Left) {
            return true;
        }
        return false;
    }

    verifyRightMouseButton(event: MouseEvent) {
        if (event.buttons === MouseButton.Right ||
            event.button === MouseButton.Right
        ) {
            return true;
        }

        return false;

    }

}