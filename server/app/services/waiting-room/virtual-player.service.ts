import {
    ATTACK_BASE_VALUE,
    BONUS_VALUE,
    DEFENSE_BASE_VALUE,
    LIFE_BASE_VALUE,
    SPEED_BASE_VALUE,
} from '@common/constants/character/character-creation-consts';
import { CHARACTERS } from '@common/constants/character/characters.constants';
import { PERCENT_CHANCE } from '@common/constants/waiting-room/waiting-room.consts';
import { AssignationDice, BonusAttribute } from '@common/enum/player/player.enum';
import { Player, PlayerAttributes } from '@common/interfaces/player/player-interface';
import { BotProfile, DiceType } from '@common/interfaces/types';
import { RoomState } from '@common/interfaces/waiting-room/waiting-room-interface';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class VirtualPlayerService {
    private readonly virtualPlayerNames = [
        'Sentinelle',
        'Vanguard',
        'Aegis',
        'Mistral',
        'Bastion',
        'Orion',
        'Nyx',
        'Atlas',
        'Cipher',
        'Raven',
        'Specter',
        'Forge',
        'Nexus',
        'Dusk',
        'Ember',
        'Storm',
    ];

    addVirtualPlayer(room: RoomState, organizerSocketId: string, profile: BotProfile): Player | undefined {
        const requesterPlayerId = room.socketToPlayerId.get(organizerSocketId);
        if (requesterPlayerId !== room.organizerId) return undefined;
        if (room.isGameStarted) return undefined;
        if (room.isLocked) return undefined;
        if (room.players.length >= room.maxPlayers) return undefined;

        const virtualPlayer = this.createVirtualPlayer(room, profile);
        if (!virtualPlayer) return undefined;

        room.players.push(virtualPlayer);
        if (room.players.length >= room.maxPlayers) room.isLocked = true;
        return virtualPlayer;
    }

    removeVirtualPlayer(room: RoomState, organizerSocketId: string, targetPlayerId: string): boolean {
        const requesterPlayerId = room.socketToPlayerId.get(organizerSocketId);
        if (requesterPlayerId !== room.organizerId) return false;

        const targetPlayer = room.players.find((player) => player.id === targetPlayerId);
        if (!targetPlayer?.isVirtual) return false;

        room.players = room.players.filter((player) => player.id !== targetPlayerId);
        if (room.players.length < room.maxPlayers) room.isLocked = false;
        return true;
    }

    private pickUniqueVirtualName(room: RoomState): string | undefined {
        const takenNames = new Set(room.players.map((player) => player.name.toLowerCase()));
        const available = this.virtualPlayerNames.filter((name) => !takenNames.has(name.toLowerCase()));
        if (available.length === 0) return undefined;
        return available[Math.floor(Math.random() * available.length)];
    }

    private pickAvailableVirtualCharacter(room: RoomState) {
        const takenAvatars = new Set(room.players.map((player) => player.avatar));
        const availableCharacters = CHARACTERS.filter((character) => !takenAvatars.has(character.previewSrc));
        if (availableCharacters.length === 0) return undefined;
        return availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
    }

    private buildVirtualPlayerAttributes(): PlayerAttributes {
        const bonus = Math.random() < PERCENT_CHANCE ? BonusAttribute.Life : BonusAttribute.Speed;
        const d6AssignedTo = Math.random() < PERCENT_CHANCE ? AssignationDice.Attack : AssignationDice.Defense;

        const totalLife = LIFE_BASE_VALUE + (bonus === BonusAttribute.Life ? BONUS_VALUE : 0);
        const speed = SPEED_BASE_VALUE + (bonus === BonusAttribute.Speed ? BONUS_VALUE : 0);

        return {
            totalLife,
            currentLife: totalLife,
            speed,
            attack: ATTACK_BASE_VALUE,
            attackDice: d6AssignedTo === AssignationDice.Attack ? DiceType.D6 : DiceType.D4,
            defense: DEFENSE_BASE_VALUE,
            defenseDice: d6AssignedTo === AssignationDice.Defense ? DiceType.D6 : DiceType.D4,
        };
    }

    //eslint-disable-next-line
    private createVirtualPlayer(room: RoomState, profile: BotProfile): Player | undefined {
        const character = this.pickAvailableVirtualCharacter(room);
        if (!character) return undefined;

        const name = this.pickUniqueVirtualName(room);
        if (!name) return undefined;

        const attributes = this.buildVirtualPlayerAttributes();

        return {
            id: `virtual-${randomUUID()}`,
            roomId: room.roomId,
            name,
            avatar: character.previewSrc,
            avatarMini: character.miniSrc,
            isActive: true,
            isVirtual: true,
            attributes,
            botProfile: profile,
            isOrganizer: false,
            remainingMovement: attributes.speed,
            remainingActions: 0,
            hasFlag: false,
            wins: 0,
        };
    }
}
