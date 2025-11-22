import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SideMenuCustomComponent } from './side-menu-custom.component';

describe('SideMenuCustomComponent', () => {
  let component: SideMenuCustomComponent;
  let fixture: ComponentFixture<SideMenuCustomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SideMenuCustomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SideMenuCustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
