import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableBasicHijosComponent } from './table-basic-hijos.component';

describe('TableBasicHijosComponent', () => {
  let component: TableBasicHijosComponent;
  let fixture: ComponentFixture<TableBasicHijosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableBasicHijosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableBasicHijosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
