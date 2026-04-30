import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { CharacterSelectorComponent } from '@app/components/creation/character-selector/character-selector.component';
import { PlayerAttributesComponent } from '@app/components/creation/player-attributes/player-attributes.component';
import { RoomLockedPopupComponent } from '@app/components/creation/room-locked-popup/room-locked-popup.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CharacterService } from '@app/services/character/character.service';
import { CreationSocketService } from '@app/services/socket/match/creation-socket.service';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { PLAYER_NAME_MAX_LENGTH } from '@common/constants/game/game-info.constants';
import { AssignationDice, BonusAttribute } from '@common/enum/player/player.enum';
import { Character } from '@common/interfaces/player/player-interface';

@Component({
    selector: 'app-creation-page',
    standalone: true,
    imports: [BackButtonComponent, FormsModule, CharacterSelectorComponent,
        PlayerAttributesComponent, BackgroundImageComponent, RoomLockedPopupComponent,
        MatTooltipModule],
    templateUrl: './creation-page.component.html',
    styleUrl: './creation-page.component.scss',
    providers: [CharacterService],
})
export class CreationPageComponent implements OnInit {
    readonly playerNameMaxLength = PLAYER_NAME_MAX_LENGTH;
    showPreview = true;

    constructor(
        public characterService: CharacterService,
        private creationSocket: CreationSocketService,
        private matchSocket: MatchSocketService,
    ) {}

    get isRoomLocked(): boolean {
        return this.characterService.isRoomLocked;
    }

    get isWaiting(): boolean {
        return this.characterService.isWaitingForJoin;
    }
    get characters(): Character[] {
        return this.characterService.characters;
    }
    get takenAvatars(): string[] {
        return this.characterService.takenAvatars;
    }
    get previewImage(): string {
        return this.characterService.previewImage;
    }
    get showNameError(): boolean {
        return this.characterService.showNameError;
    }
    get isJoin(): boolean {
        return this.characterService.isJoining;
    }

    get selectedCharacterId(): string {
        return this.characterService.selectedCharId;
    }
    set selectedCharacterId(value: string) {
        const old = this.characterService.selectedCharId;
        this.characterService.selectedCharId = value;
        this.characterService.handleAvatarChange(old, value);
        this.showPreview = false;
        setTimeout(() => {
            this.showPreview = true;
        }, 0);
    }

    get characterName(): string {
        return this.characterService.characterName;
    }
    set characterName(value: string) {
        this.characterService.characterName = value;
    }

    get bonus(): BonusAttribute {
        return this.characterService.bonus;
    }
    set bonus(value: BonusAttribute) {
        this.characterService.bonus = value;
    }

    get d6AssignedTo(): AssignationDice {
        return this.characterService.d6AssignedTo;
    }
    set d6AssignedTo(value: AssignationDice) {
        this.characterService.d6AssignedTo = value;
    }

    ngOnInit(): void {
        this.creationSocket.connect().then(async () => {
            await this.matchSocket.connect();
            this.characterService.registerListeners();
        });
    }

    saveState(): void {
        this.characterService.showNameError = false;
    }

    proceed(): void {
        this.characterService.proceed();
    }

    generateRandomCharacter(): void {
        this.characterService.generateRandomCharacter();
    }

    retryJoin(): void {
        this.characterService.retryJoin();
    }

    goHome(): void {
        this.characterService.navigateHome();
    }
}
