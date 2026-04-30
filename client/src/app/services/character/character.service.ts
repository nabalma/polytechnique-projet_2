import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { JoinWaitingRoomState } from '@app/services/join-waiting-room/join-waiting-room.service';
import { CreationSocketService } from '@app/services/socket/match/creation-socket.service';
import {
    ATTACK_BASE_VALUE,
    BONUS_VALUE,
    DEFENSE_BASE_VALUE,
    LIFE_BASE_VALUE,
    SPEED_BASE_VALUE,
} from '@common/constants/character/character-creation-consts';
import { CHARACTERS } from '@common/constants/character/characters.constants';
import { RANDOM_HALF_PROBABILITY } from '@common/constants/character/player-attribute-default';
import { AssignationDice, BonusAttribute } from '@common/enum/player/player.enum';
import { WaitingRoomNavState } from '@common/interfaces/navigation/navigation-state-interfaces';
import { Character, Player, PlayerAttributes } from '@common/interfaces/player/player-interface';
import { DiceType } from '@common/interfaces/types';
import { Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CharacterService implements OnDestroy {
    isRoomLocked = false;
    isWaitingForJoin = false;
    characterName = '';
    selectedCharId = CHARACTERS[0].id;
    bonus: BonusAttribute = BonusAttribute.Life;
    d6AssignedTo: AssignationDice = AssignationDice.Attack;
    showNameError = false;

    readonly characters: Character[] = CHARACTERS;

    private realtimeTakenAvatars: string[] = [];
    private pendingPlayer: Player | null = null;
    private readonly subscriptions: Subscription[] = [];

    constructor(
        private router: Router,
        private socketService: CreationSocketService,
        private joinWaitingRoom: JoinWaitingRoomState,
    ) {}

    get isJoining(): boolean {
        return !!this.joinWaitingRoom.roomIdGame;
    }

    get selectedCharacter(): Character {
        return this.characters.find((character) => character.id === this.selectedCharId) ?? this.characters[0];
    }

    get previewImage(): string {
        return this.selectedCharacter.previewSrc;
    }

    get takenAvatars(): string[] {
        const staticAvatars = (this.joinWaitingRoom.takenAvatersGame ?? []) as string[];
        return [...new Set([...staticAvatars, ...this.realtimeTakenAvatars])];
    }

    generateRandomCharacter(): void {
        const availableCharacters = CHARACTERS.filter((character) => !this.takenAvatars.includes(character.previewSrc));
        if (availableCharacters.length === 0) return;
        const oldCharId = this.selectedCharId;
        const randomIndex = Math.floor(Math.random() * availableCharacters.length);
        const chosen = availableCharacters[randomIndex];
        this.selectedCharId = chosen.id;
        this.characterName = chosen.name;
        this.bonus = Math.random() < RANDOM_HALF_PROBABILITY ? BonusAttribute.Life : BonusAttribute.Speed;
        this.d6AssignedTo = Math.random() < RANDOM_HALF_PROBABILITY ? AssignationDice.Attack : AssignationDice.Defense;
        this.handleAvatarChange(oldCharId, chosen.id);
    }

    proceed(): void {
        if (!this.characterName.trim()) {
            this.showNameError = true;
            return;
        }
        const player = this.buildPlayer();

        if (this.isJoining) {
            this.isRoomLocked = false;
            this.isWaitingForJoin = true;
            this.pendingPlayer = player;
            this.socketService.sendJoinRoom(player, this.joinWaitingRoom.roomIdGame);
        } else {
            const navState: WaitingRoomNavState = { player, gameId: this.joinWaitingRoom.gameIdRoom };
            this.router.navigate(['/waiting-room'], { state: navState });
        }
    }

    retryJoin(): void {
        this.proceed();
    }

    handleAvatarChange(oldCharId: string, newCharId: string): void {
        if (!this.isJoining || !this.joinWaitingRoom.roomIdGame) return;
        const roomId = this.joinWaitingRoom.roomIdGame;
        const oldChar = this.characters.find((c) => c.id === oldCharId);
        const newChar = this.characters.find((c) => c.id === newCharId);
        if (oldChar) this.socketService.releaseAvatar(roomId, oldChar.previewSrc);
        if (newChar) this.socketService.selectAvatar(roomId, newChar.previewSrc);
    }

    registerListeners(): void {
        if (!this.isJoining || !this.joinWaitingRoom.roomIdGame) return;

        const roomId = this.joinWaitingRoom.roomIdGame;

        this.subscriptions.push(
            this.socketService.onJoinRoomSuccess()?.subscribe(({ playerId }) => {
                this.isWaitingForJoin = false;
                if (!this.pendingPlayer) return;
                const navState: WaitingRoomNavState = { player: this.pendingPlayer, roomId, playerId };
                this.router.navigate(['/waiting-room'], { state: navState });
            }) ?? Subscription.EMPTY,
            this.socketService.onJoinRejected()?.subscribe(() => {
                this.isWaitingForJoin = false;
                this.isRoomLocked = true;
            }) ?? Subscription.EMPTY,
        );

        this.subscribeToAvatarEvents();
        this.ensureAvailableCharacter();
        this.socketService.joinCreationRoom(roomId);
        this.socketService.selectAvatar(roomId, this.selectedCharacter.previewSrc);
    }

    navigateHome(): void {
        this.socketService.disconnect();
        this.router.navigate(['/home']);
    }

    ngOnDestroy(): void {
        if (this.isJoining && this.joinWaitingRoom.roomIdGame) {
            const roomId = this.joinWaitingRoom.roomIdGame;
            this.socketService.releaseAvatar(roomId, this.selectedCharacter.previewSrc);
            this.socketService.leaveCreationRoom(roomId);
        }
        this.subscriptions.forEach((s) => s.unsubscribe());
    }

    private ensureAvailableCharacter(emitChange = false): void {
        if (!this.takenAvatars.includes(this.selectedCharacter.previewSrc)) return;
        const available = CHARACTERS.find((c) => !this.takenAvatars.includes(c.previewSrc));
        if (!available) return;
        const oldId = this.selectedCharId;
        this.selectedCharId = available.id;
        if (emitChange) {
            this.handleAvatarChange(oldId, available.id);
        }
    }

    private subscribeToAvatarEvents(): void {
        this.subscriptions.push(
            this.socketService.onCreationRoomState()?.subscribe(({ takenAvatars }) => {
                this.realtimeTakenAvatars = [...takenAvatars];
                this.ensureAvailableCharacter(true);
            }) ?? Subscription.EMPTY,
            this.socketService.onAvatarTaken()?.subscribe(({ avatarSrc }) => {
                if (!this.realtimeTakenAvatars.includes(avatarSrc)) {
                    this.realtimeTakenAvatars.push(avatarSrc);
                }
            }) ?? Subscription.EMPTY,
            this.socketService.onAvatarReleased()?.subscribe(({ avatarSrc }) => {
                this.realtimeTakenAvatars = this.realtimeTakenAvatars.filter((s) => s !== avatarSrc);
            }) ?? Subscription.EMPTY,
        );
    }

    private buildAttributes(): PlayerAttributes {
        const totalLife = LIFE_BASE_VALUE + (this.bonus === BonusAttribute.Life ? BONUS_VALUE : 0);
        const speed = SPEED_BASE_VALUE + (this.bonus === BonusAttribute.Speed ? BONUS_VALUE : 0);
        const attackDice = this.d6AssignedTo === AssignationDice.Attack ? DiceType.D6 : DiceType.D4;
        const defenseDice = this.d6AssignedTo === AssignationDice.Defense ? DiceType.D6 : DiceType.D4;
        return {
            totalLife,
            currentLife: totalLife,
            speed,
            attack: ATTACK_BASE_VALUE,
            attackDice,
            defense: DEFENSE_BASE_VALUE,
            defenseDice,
        };
    }

    private buildPlayer(): Player {
        const name = this.characterName.trim() || this.selectedCharacter.name;
        return {
            name,
            avatar: this.selectedCharacter.previewSrc,
            avatarMini: this.selectedCharacter.miniSrc,
            isVirtual: false,
            attributes: this.buildAttributes(),
            isOrganizer: !this.isJoining,
            isActive: false,
            remainingMovement: 0,
            remainingActions: 0,
            hasFlag: false,
            wins: 0,
        };
    }
}
