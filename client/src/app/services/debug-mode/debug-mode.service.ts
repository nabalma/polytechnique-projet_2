import { Injectable, OnDestroy } from '@angular/core';
import { MatchSocketService } from '@app/services/socket/match/match-socket.service';
import { DebugModeToggledPayload } from '@common/interfaces/game-play/game-play-payloads-interfaces';
import { Position } from '@common/interfaces/match/match-interface';
import { MatchEvents } from '@common/socket_event/match/match.gateway.events';
import { EMPTY, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Injectable({ providedIn: 'root' })
export class DebugModeService implements OnDestroy {
    readonly toggled$: Observable<DebugModeToggledPayload>;

    private readonly destroy$ = new Subject<void>();

    constructor(private readonly socketService: MatchSocketService) {
        this.toggled$ = (this.socketService.on<DebugModeToggledPayload>(MatchEvents.DebugModeToggled) ?? EMPTY).pipe(takeUntil(this.destroy$));
    }

    toggle(): void {
        this.socketService.send(MatchEvents.ToggleDebugMode);
    }

    requestTeleport(targetPosition: Position): void {
        this.socketService.send(MatchEvents.RequestTeleport, { targetPosition });
    }

    endActiveTurn(): void {
        this.socketService.send(MatchEvents.DebugEndTurn);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
