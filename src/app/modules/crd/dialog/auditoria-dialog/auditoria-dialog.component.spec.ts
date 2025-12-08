import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditoriaDialogComponent } from './auditoria-dialog.component';

describe('AuditoriaDialogComponent', () => {
  let component: AuditoriaDialogComponent;
  let fixture: ComponentFixture<AuditoriaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditoriaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditoriaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
