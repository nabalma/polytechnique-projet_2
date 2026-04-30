import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameInfoPanelComponent } from './game-info.component';

describe('GameInfoPanelComponent', () => {
  let component: GameInfoPanelComponent;
  let fixture: ComponentFixture<GameInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameInfoPanelComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameInfoPanelComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
