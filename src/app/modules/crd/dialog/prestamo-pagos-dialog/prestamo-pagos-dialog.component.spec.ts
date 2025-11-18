import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrestamoPagosDialogComponent } from './prestamo-pagos-dialog.component';

describe('PrestamoPagosDialogComponent', () => {
  let component: PrestamoPagosDialogComponent;
  let fixture: ComponentFixture<PrestamoPagosDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrestamoPagosDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrestamoPagosDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
