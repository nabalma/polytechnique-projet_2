import { Injectable } from '@nestjs/common';

@Injectable()
export class CharacterCreationService {
    private readonly roomAvatars = new Map<string, Set<string>>();
    private readonly socketToAvatar = new Map<string, { roomId: string; avatarSrc: string }>();

    getAvatarsForRoom(roomId: string): string[] {
        return [...(this.roomAvatars.get(roomId) ?? [])];
    }

    joinRoom(socketId: string, roomId: string): string[] {
        if (!this.roomAvatars.has(roomId)) {
            this.roomAvatars.set(roomId, new Set());
        }
        return this.getAvatarsForRoom(roomId);
    }

    takeAvatar(socketId: string, roomId: string, avatarSrc: string): void {
        if (!this.roomAvatars.has(roomId)) {
            this.roomAvatars.set(roomId, new Set());
        }
        const previous = this.socketToAvatar.get(socketId);
        if (previous?.roomId === roomId) {
            this.roomAvatars.get(roomId)?.delete(previous.avatarSrc);
        }
        this.roomAvatars.get(roomId)?.add(avatarSrc);
        this.socketToAvatar.set(socketId, { roomId, avatarSrc });
    }

    releaseAvatar(socketId: string, roomId: string, avatarSrc: string): void {
        this.roomAvatars.get(roomId)?.delete(avatarSrc);
        const current = this.socketToAvatar.get(socketId);
        if (current?.roomId === roomId && current.avatarSrc === avatarSrc) {
            this.socketToAvatar.delete(socketId);
        }
    }

    leaveRoom(socketId: string, roomId: string): string | null {
        const current = this.socketToAvatar.get(socketId);
        if (current?.roomId === roomId) {
            this.roomAvatars.get(roomId)?.delete(current.avatarSrc);
            this.socketToAvatar.delete(socketId);
            return current.avatarSrc;
        }
        return null;
    }

    handleDisconnect(socketId: string): { roomId: string; avatarSrc: string } | null {
        const current = this.socketToAvatar.get(socketId);
        if (!current) return null;
        this.roomAvatars.get(current.roomId)?.delete(current.avatarSrc);
        this.socketToAvatar.delete(socketId);
        return current;
    }
}
