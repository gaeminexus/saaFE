import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntidadConsultaComponent } from './entidad-consulta.component';

describe('EntidadConsultaComponent', () => {
  let component: EntidadConsultaComponent;
  let fixture: ComponentFixture<EntidadConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntidadConsultaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntidadConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
