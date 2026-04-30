import { Component, input, output } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Team } from '@common/enum/player/player.enum';
import { Player } from '@common/interfaces/player/player-interface';
import { BotProfile } from '@common/interfaces/types';

@Component({
    selector: 'app-player-card',
    standalone: true,
    imports: [MatTooltipModule],
    templateUrl: './player-card.component.html',
    styleUrl: './player-card.component.scss',
})
export class PlayerCardComponent {
    readonly team = Team;
    readonly botProfile = BotProfile;
    readonly player = input.required<Player>();
    readonly isOrganizer = input<boolean>(false);
    readonly isCurrentPlayer = input<boolean>(false);
    readonly canKick = input<boolean>(false);
    readonly kickPlayer = output<string>();

    showKickConfirm = false;

    onKick(): void {
        this.showKickConfirm = true;
    }

    onConfirmKick(): void {
        this.showKickConfirm = false;
        this.kickPlayer.emit(this.player().id ?? '');
    }

    onCancelKick(): void {
        this.showKickConfirm = false;
    }

    get roleLabel(): string {
        if (this.isOrganizer()) return 'Organisateur';
        if (!this.player().isVirtual) return 'Joueur';
        return this.player().botProfile === BotProfile.AGGRESSIVE ? 'Joueur virtuel agressif' : 'Joueur virtuel défensif';
    }
}
