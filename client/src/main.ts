import { provideHttpClient } from '@angular/common/http';
import { enableProdMode, enableProfiling, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { bootstrapApplication } from '@angular/platform-browser';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdministrationPageComponent } from '@app/pages/administration-page/administration-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page.component';
import { EditionPageComponent } from '@app/pages/edition-page/edition-page.component';
import { GameSelectionComponent } from '@app/pages/game-selection-page/game-selection-page.component.page';
import { GameViewPageComponent } from '@app/pages/game-view-page/game-view-page.component';
import { InitialViewPageComponent } from '@app/pages/initial-view-page/initial-view-page.component';
import { JoinGamePageComponent } from '@app/pages/join-game-page/join-game-page.component';
import { EndGameStatPageComponent } from '@app/pages/end-game-stat-page/end-game-stat-page.component';
import { WaitingRoomViewPageComponent } from '@app/pages/waiting-room-view-page/waiting-room-view-page.component';
import { environment } from './environments/environment';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: InitialViewPageComponent },
    { path: 'administration', component: AdministrationPageComponent },
    { path: 'game-selection', component: GameSelectionComponent },
    { path: 'creation', component: CreationPageComponent },
    { path: 'join-game', component: JoinGamePageComponent },
    { path: 'edition', component: EditionPageComponent },
    { path: 'edition/:id', component: EditionPageComponent },
    { path: 'game-view-page', component: GameViewPageComponent },
    { path: 'end-game', component: EndGameStatPageComponent },
    { path: 'waiting-room', component: WaitingRoomViewPageComponent },
    { path: 'waiting-room/:id', component: WaitingRoomViewPageComponent },
    //{ path: 'test/:id', component: TestVueJeuComponent },
    { path: '**', redirectTo: '/home' },
];

enableProfiling();

bootstrapApplication(AppComponent, {
    providers: [provideZoneChangeDetection(), provideHttpClient(), provideAnimations(), provideRouter(routes, withHashLocation())],
});
