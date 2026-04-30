import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { NavArrowsComponent } from '@app/components/common-component/nav-arrows/nav-arrows.component';
import { NavigationPageComponent } from '@app/components/common-component/navigation-page/navigation-page.component';
import { PageIndicatorComponent } from '@app/components/common-component/page-indicator/page-indicator.component';
import { PanelBackgroundComponent } from '@app/components/common-component/panel-background/panel-background.component';
import { CaseGameSelectionComponent } from '@app/components/game-selection/case-game-selection/case-game-selection.component';
import { AdministrationService } from '@app/services/administration/administration.service';
import { NavigationService } from '@app/services/common/navigation-service/navigation.service';
import { JoinWaitingRoomState } from '@app/services/join-waiting-room/join-waiting-room.service';

@Component({
    selector: 'app-game-selection',
    imports: [BackButtonComponent, CaseGameSelectionComponent, NavArrowsComponent, PageIndicatorComponent,
        NavigationPageComponent, BackgroundImageComponent, PanelBackgroundComponent],
    templateUrl: './game-selection-page.component.html',
    styleUrl: './game-selection-page.component.scss',
    providers: [NavigationService],
})
export class GameSelectionComponent implements OnInit, OnDestroy {

    private readonly games = computed(() => this.administrationService.games().filter((game) => game.isVisible));

    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.games().length / this.navigationService.pageSize)));

    readonly canGoNext = computed(() => this.navigationService.pageIndex() < this.totalPages() - 1);

    readonly visibleGames = this.navigationService.getVisibleGames(this.games);

    constructor(
        public administrationService: AdministrationService,
        private router: Router,
        public navigationService: NavigationService,
        private joinWaitingRoom: JoinWaitingRoomState,
    ) {}

    ngOnInit(): void {
        this.administrationService.connect();
        this.administrationService.getGames();
    }

    ngOnDestroy(): void {
        this.administrationService.disconnect();
    }

    goNext(): void {
        this.navigationService.goNext(this.canGoNext());
    }

    onSelectGame(id: string): void {
        this.joinWaitingRoom.setWaitingRoom('', [], id);
        this.router.navigate(['/creation']);
    }

}
