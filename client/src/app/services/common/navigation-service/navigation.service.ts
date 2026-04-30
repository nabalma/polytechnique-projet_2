import { computed, Injectable, signal, Signal } from '@angular/core';
import { PAGE_SIZE } from '@common/constants/game/game-info.constants';
import { GameInterface } from '@common/interfaces/game-frontend/game-interface';

@Injectable({ providedIn: 'root' })

export class NavigationService {

    readonly pageIndex = signal(0);
    readonly pageSize = PAGE_SIZE;
    readonly canGoPrev = computed(() => this.pageIndex() > 0);

    getVisibleGames(games: Signal<GameInterface[]>) {
        return computed(() => {
            const start = this.pageIndex() * this.pageSize;
            return games().slice(start, start + this.pageSize);
        });
    }


    goPrev(): void {
        if (!this.canGoPrev()) return;
        this.pageIndex.update((currentIndex) => currentIndex - 1);
    }

    goNext(canGoNext: boolean): void {
        if (!canGoNext) return;
        this.pageIndex.update((currentIndex) => currentIndex + 1);
    }
}