import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfParticipeDetalleDialogComponent } from './pdf-participe-detalle-dialog.component';

describe('PdfParticipeDetalleDialogComponent', () => {
  let component: PdfParticipeDetalleDialogComponent;
  let fixture: ComponentFixture<PdfParticipeDetalleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfParticipeDetalleDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfParticipeDetalleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
