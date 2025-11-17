import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditTableDialogComponent } from './edit-table-dialog.component';

describe('EditTableDialogComponent', () => {
  let component: EditTableDialogComponent;
  let fixture: ComponentFixture<EditTableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTableDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditTableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
