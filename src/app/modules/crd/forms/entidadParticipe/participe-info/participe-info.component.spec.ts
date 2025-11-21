import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipeInfoComponent } from './participe-info.component';

describe('ParticipeInfoComponent', () => {
  let component: ParticipeInfoComponent;
  let fixture: ComponentFixture<ParticipeInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipeInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParticipeInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
