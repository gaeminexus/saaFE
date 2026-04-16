import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleGeneracionArchivoComponent } from './detalle-generacion-archivo.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DetalleGeneracionArchivoComponent', () => {
  let component: DetalleGeneracionArchivoComponent;
  let fixture: ComponentFixture<DetalleGeneracionArchivoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DetalleGeneracionArchivoComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        MatSnackBarModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleGeneracionArchivoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
