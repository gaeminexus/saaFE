import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipeDashComponent } from './participe-dash.component';

describe('ParticipeDashComponent', () => {
  let component: ParticipeDashComponent;
  let fixture: ComponentFixture<ParticipeDashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipeDashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipeDashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
