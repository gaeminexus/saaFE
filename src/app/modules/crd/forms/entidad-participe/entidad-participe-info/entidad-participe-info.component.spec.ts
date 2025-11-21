import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntidadParticipeInfoComponent } from './entidad-participe-info.component';

describe('EntidadParticipeInfoComponent', () => {
  let component: EntidadParticipeInfoComponent;
  let fixture: ComponentFixture<EntidadParticipeInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntidadParticipeInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntidadParticipeInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
