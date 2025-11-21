import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavegacionCascadaComponent } from './navegacion-cascada.component';

describe('NavegacionCascadaComponent', () => {
  let component: NavegacionCascadaComponent;
  let fixture: ComponentFixture<NavegacionCascadaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavegacionCascadaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavegacionCascadaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with entidades level', () => {
    expect(component.mostrandoEntidades).toBeTruthy();
  });

  it('should load entidades on init', () => {
    spyOn(component, 'cargarEntidades');
    component.ngOnInit();
    expect(component.cargarEntidades).toHaveBeenCalled();
  });
});
