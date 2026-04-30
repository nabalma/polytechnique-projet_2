import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CaseGameAdministrationComponent } from '@app/components/administration/case-game-administration/case-game-administration.component';
import { CreationGamePopUpComponent } from '@app/components/administration/creation-game-pop-up/creation-game-pop-up.component';
import { PopUpConfirmationSuppComponent } from '@app/components/administration/pop-up-confirmation-supp/pop-up-confirmation-supp.component';
import { BackgroundImageComponent } from '@app/components/common-component/background-image/background-image.component';
import { BackButtonComponent } from '@app/components/common-component/back-button/back-button.component';
import { NavArrowsComponent } from '@app/components/common-component/nav-arrows/nav-arrows.component';
import { NavigationPageComponent } from '@app/components/common-component/navigation-page/navigation-page.component';
import { PageIndicatorComponent } from '@app/components/common-component/page-indicator/page-indicator.component';
import { AdministrationService } from '@app/services/administration/administration.service';
import { NavigationService } from '@app/services/common/navigation-service/navigation.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GameCreationConfig } from '@common/interfaces/game-frontend/game-interface';

@Component({
    selector: 'app-administration-page',
    imports: [
        CaseGameAdministrationComponent,
        CreationGamePopUpComponent,
        BackButtonComponent,
        NavigationPageComponent,
        PopUpConfirmationSuppComponent,
        NavArrowsComponent,
        PageIndicatorComponent,
        BackgroundImageComponent,
        MatTooltipModule,
    ],
    templateUrl: './administration-page.component.html',
    styleUrl: './administration-page.component.scss',
})
export class AdministrationPageComponent implements OnInit, OnDestroy {
    isCreatePopupOpen = false;
    private readonly searchTerm = signal('');
    isDeleteConfirmationOpen = false;
    gameIdToDelete: string | null = null;
    gameNameToDelete: string = '';

    private readonly allGames = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        const games = this.administrationService.games();

        if (!term) {
            return games;
        }

        return games.filter((game) => game.name.toLowerCase().includes(term));
    });

    readonly totalPages = computed(() =>
        Math.max(1, Math.ceil(this.allGames().length / this.navigationService.pageSize)));

    readonly visibleGames = this.navigationService.getVisibleGames(this.allGames);


    readonly canGoNext = computed(() => this.navigationService.pageIndex() <
        this.totalPages() - 1);

    constructor(
        public administrationService: AdministrationService,
        private router: Router,
        public navigationService: NavigationService,
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

    removeGame(gameId: string): void {
        const game = this.administrationService.getGameInTheList(gameId);
        if (game) {
            this.openDeleteConfirmation(gameId, game.name);
        }
    }


    openCreatePopup(): void {
        this.isCreatePopupOpen = true;
    }

    closeCreatePopup(): void {
        this.isCreatePopupOpen = false;
    }


    openDeleteConfirmation(gameId: string, gameName: string): void {
        this.gameIdToDelete = gameId;
        this.gameNameToDelete = gameName;
        this.isDeleteConfirmationOpen = true;
    }

    closeDeleteConfirmation(): void {
        this.isDeleteConfirmationOpen = false;
        this.gameIdToDelete = null;
        this.gameNameToDelete = '';
    }

    confirmDelete(): void {
        if (this.gameIdToDelete) {
            this.administrationService.deleteGame(this.gameIdToDelete);
        }
        this.closeDeleteConfirmation();
    }

    onCreateStep1(payload: GameCreationConfig): void {
        this.isCreatePopupOpen = false;
        this.router.navigate(['/edition'], {
            queryParams: { mode: payload.mode, size: payload.size },
        });
    }

    onChangeSearchName(event: Event): void {
        const inputSearchElement = event.target as HTMLInputElement;
        this.searchTerm.set(inputSearchElement.value);
        this.navigationService.pageIndex.set(0);
    }

}
