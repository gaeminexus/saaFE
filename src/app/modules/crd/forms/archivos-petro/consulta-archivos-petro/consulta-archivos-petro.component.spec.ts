import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaArchivosPetroComponent } from './consulta-archivos-petro.component';

describe('ConsultaArchivosPetroComponent', () => {
  let component: ConsultaArchivosPetroComponent;
  let fixture: ComponentFixture<ConsultaArchivosPetroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaArchivosPetroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConsultaArchivosPetroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
