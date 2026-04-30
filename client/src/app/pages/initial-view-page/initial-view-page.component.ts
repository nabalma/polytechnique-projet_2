import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelBackgroundComponent } from '@app/components/common-component/panel-background/panel-background.component';
import { NotificationPopupComponent } from '@app/components/initial-view/notification-popup/notification-popup.component';
import { NavigationStateService } from '@app/services/navigation/navigation-state.service';
import { MUSIC_ENABLED_KEY } from '@common/constants/user/user-preferences.constants';
import { InitialViewNavState } from '@common/interfaces/navigation/navigation-state-interfaces';

@Component({
    selector: 'app-initial-view-page',
    templateUrl: './initial-view-page.component.html',
    styleUrl: './initial-view-page.component.scss',
    imports: [RouterLink, NotificationPopupComponent, PanelBackgroundComponent],
})
export class InitialViewPageComponent implements OnInit {
    notificationMessage: string | null = null;
    isMusicEnabled: WritableSignal<boolean> = signal(true);

    constructor(private readonly navigationState: NavigationStateService) {}

    ngOnInit(): void {
        const state = this.navigationState.getState<InitialViewNavState>();
        if (state?.notification) {
            this.notificationMessage = state.notification;
        }
        const saved = localStorage.getItem(MUSIC_ENABLED_KEY);
        if (saved !== null) {
            this.isMusicEnabled.set(saved === 'true');
        }
    }

    onCloseNotification(): void {
        this.notificationMessage = null;
    }

    toggleMusic(): void {
        this.isMusicEnabled.update((value) => !value);
        localStorage.setItem(MUSIC_ENABLED_KEY, String(this.isMusicEnabled()));
    }
}
