export interface AvatarActionPayload {
    roomId: string;
    avatarSrc: string;
}

export interface AvatarBroadcastPayload {
    avatarSrc: string;
}

export interface CreationRoomStatePayload {
    takenAvatars: string[];
}
