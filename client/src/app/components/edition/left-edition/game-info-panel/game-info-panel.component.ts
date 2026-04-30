import { Component, ElementRef, input, model, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SaveRestartSignalService } from '@app/services/edition/save-restart-service/save-restart.service';
import { DESCRIPTION_MAX_LENGTH, GAME_NAME_MAX_LENGTH } from '@common/constants/game/game-info.constants';
import { GridSize } from '@common/enum/game/grid/game-grid.enum';
import { GameMode } from '@common/enum/game/mode/game-mode.enum';

import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-game-info-panel',
    imports: [FormsModule],
    templateUrl: './game-info-panel.component.html',
    styleUrl: './game-info-panel.component.scss',
})
export class GameInfoPanelComponent implements OnInit, OnDestroy {

    private destroy$ = new Subject<void>();

    @ViewChild('gameNameInput') gameNameInput!: ElementRef<HTMLInputElement>;
    @ViewChild('gameDescriptionTextArea') gameDescriptionInput!: ElementRef<HTMLTextAreaElement>;

    name = model<string>('');
    description = model<string>('');
    readonly mode = input<GameMode>(GameMode.CLASSIC);
    readonly gridSize = input<GridSize>(GridSize.MEDIUM);
    readonly isEditing = input<boolean>(false);
    readonly saveAttempted = input<boolean>(false);

    readonly nameMaxLength = GAME_NAME_MAX_LENGTH;
    readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;


    copyName = '';
    copyDescription = '';

    constructor(private saveRestartService: SaveRestartSignalService) {}

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    ngOnInit(): void {
        this.saveRestartService.restartSignal.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.restartInput();
        });
        if (this.isEditing()) {
            this.copyName = structuredClone(this.name());
            this.copyDescription = structuredClone(this.description());
        }
    }

    restartInput() {

        const gameNameInputElement = this.gameNameInput.nativeElement;
        const gameDescriptionInputElement = this.gameDescriptionInput.nativeElement;
        if (this.isEditing()) {

            this.name.set(this.copyName);
            this.description.set(this.copyDescription);
        } else {
            this.name.set('');
            this.description.set('');
        }
        gameNameInputElement.value = this.copyName;
        gameDescriptionInputElement.value = this.copyDescription;
    }

    onNameInput(event: Event): void {
        const inputValue = event.target as HTMLInputElement;
        const value = inputValue.value.slice(0, this.nameMaxLength);
        inputValue.value = value;
        this.name.set(value);
    }

    onDescriptionInput(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement;
        const value = textarea.value.slice(0, this.descriptionMaxLength);
        textarea.value = value;
        this.description.set(value);
    }


}
