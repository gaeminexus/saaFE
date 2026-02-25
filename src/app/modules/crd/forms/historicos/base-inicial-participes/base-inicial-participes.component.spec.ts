import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseInicialParticipesComponent } from './base-inicial-participes.component';

describe('BaseInicialParticipesComponent', () => {
  let component: BaseInicialParticipesComponent;
  let fixture: ComponentFixture<BaseInicialParticipesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseInicialParticipesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseInicialParticipesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
