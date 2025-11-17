import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemoveTableDialogComponent } from './remove-table-dialog.component';

describe('RemoveTableDialogComponent', () => {
  let component: RemoveTableDialogComponent;
  let fixture: ComponentFixture<RemoveTableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemoveTableDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemoveTableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
