import { DatePipe, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AppConfig } from '../../../../app.config';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { NaturalezaCuentaService } from '../../../cnt/service/naturaleza-cuenta.service';
import { CambioClaveDialogComponent } from './cambio-clave-dialog/cambio-clave-dialog.component';

// Importa tu AuthService según tu estructura
const EMPRESA = 1236;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MaterialFormModule],
  templateUrl: './login.html',
  styleUrls: ['../../../../../styles/pages/_login.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  username = '';
  password = '';
  hidePassword = true;
  isLoading = false;
  systemName = AppConfig.systemName;
  currentYear = new Date().getFullYear();
  companyName = AppConfig.companyName;
  companyUrl = AppConfig.companyUrl;

  // Variables para selectByCriteria
  criterioConsultaArray: Array<DatosBusqueda> = [];
  criterioConsulta = new DatosBusqueda();

  // Mensaje de respuesta y tipo
  loginMessage: string = '';
  loginMessageType: 'success' | 'error' | 'info' | 'warning' | 'neutral' | 'dark' | 'light' =
    'info';

  @ViewChild('parallaxCanvas') parallaxCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationFrame: any;
  private mouseX = 0;
  private mouseY = 0;

  // Referencias para cleanup en OnDestroy
  private resizeListener?: () => void;
  private mouseMoveListener?: (event: MouseEvent) => void;

  // Optimización: Pre-calcular datos estáticos para animación
  private readonly animationLayers = [
    { color: 'rgba(102,126,234,0.18)', amplitude: 18, speed: 0.08, offset: 0 },
    { color: 'rgba(118,75,162,0.13)', amplitude: 32, speed: 0.13, offset: 60 },
    { color: 'rgba(255,255,255,0.10)', amplitude: 12, speed: 0.18, offset: 120 },
  ];
  private readonly pointsCount = 32;
  private lastFrameTime = 0;
  private frameCount = 0;

  constructor(
    private ngZone: NgZone,
    private usuarioService: UsuarioService,
    private appStateService: AppStateService,
    private naturalezaCuentaService: NaturalezaCuentaService,
    private router: Router,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  validaUsuario() {
    if (!this.username || !this.password) {
      this.loginMessage = 'Por favor ingrese usuario y contraseña';
      this.loginMessageType = 'error';
      return;
    }
    this.isLoading = true;
    this.usuarioService.validaUsuario(this.username.toUpperCase(), this.password).subscribe({
      next: (result: string) => {
        this.isLoading = false;
        if (result === 'OK') {
          localStorage.setItem('token', result);
          // Guardar el usuario logueado
          this.ingresaSistema();
          this.loginMessage = 'Bienvenido';
          this.loginMessageType = 'success';
        } else if (result === 'WARN') {
          this.loginMessage = 'Advertencia: revise sus datos.';
          this.loginMessageType = 'warning';
        } else {
          this.loginMessage = result;
          this.loginMessageType = 'error';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        const errorMessage = error.error?.message || 'Error al intentar iniciar sesión';
        this.loginMessage = errorMessage;
        this.loginMessageType = 'error';
        console.error('Error al validar usuario:', error);
      },
    });
  }

  ingresaSistema(): void {
    localStorage.setItem('logged', 'true');
    localStorage.setItem('idSucursal', EMPRESA.toString());

    // Usar AppStateService para cargar datos globales
    this.appStateService.inicializarApp(EMPRESA, this.username).subscribe({
      next: (appData) => {
        console.log('Datos globales cargados:', appData);
        this.router.navigate(['/menu']);
      },
      error: (error) => {
        console.error('Error al cargar datos globales:', error);
        this.loginMessage = 'Error al cargar datos del sistema';
        this.loginMessageType = 'error';
        this.isLoading = false;
      },
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.resizeCanvas();
      this.ctx = this.parallaxCanvas.nativeElement.getContext('2d')!;

      // Crear listeners con referencias para cleanup
      this.resizeListener = () => this.resizeCanvas();
      this.mouseMoveListener = (event: MouseEvent) => this.onMouseMove(event);

      // Agregar listeners
      window.addEventListener('resize', this.resizeListener);
      this.parallaxCanvas.nativeElement.addEventListener('mousemove', this.mouseMoveListener);

      this.mouseX = this.parallaxCanvas.nativeElement.width / 2;
      this.mouseY = this.parallaxCanvas.nativeElement.height / 2;
      this.animateParallax();
    }
  }

  ngOnDestroy() {
    // Limpiar listeners
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }

    if (this.mouseMoveListener && this.parallaxCanvas?.nativeElement) {
      this.parallaxCanvas.nativeElement.removeEventListener('mousemove', this.mouseMoveListener);
    }

    // Cancelar animaciones
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    console.log('LoginComponent: Listeners y animaciones limpiados');
  }

  resizeCanvas() {
    if (!isPlatformBrowser(this.platformId)) return;
    const canvas = this.parallaxCanvas?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }

  onMouseMove(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const rect = this.parallaxCanvas.nativeElement.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;
  }

  animateParallax() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Throttle para reducir FPS en caso de problemas de rendimiento
    const currentTime = performance.now();
    if (currentTime - this.lastFrameTime < 16.67) {
      // ~60 FPS
      this.animationFrame = requestAnimationFrame(() => this.animateParallax());
      return;
    }
    this.lastFrameTime = currentTime;

    this.ngZone.runOutsideAngular(() => {
      const canvas = this.parallaxCanvas.nativeElement;
      const ctx = this.ctx;

      // Verificar si el canvas es válido
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Usar array pre-calculado en lugar de crear uno nuevo
      for (let i = 0; i < this.animationLayers.length; i++) {
        this.drawWaveLayer(ctx, canvas.width, canvas.height, this.animationLayers[i], i);
      }

      this.animationFrame = requestAnimationFrame(() => this.animateParallax());
    });
  }

  drawWaveLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layer: any,
    layerIndex: number
  ) {
    ctx.save();
    ctx.beginPath();

    // Pre-calcular valores constantes fuera del loop
    const widthRatio = width / this.pointsCount;
    const mouseXRatio = this.mouseX / width;
    const mouseYOffset = (this.mouseY - height / 2) * 0.03 * (layerIndex + 1);
    const baseY = height * 0.7 + layerIndex * 18 + mouseYOffset;
    const currentTime = (performance.now() * layer.speed) / 1000;

    for (let i = 0; i <= this.pointsCount; i++) {
      const x = i * widthRatio;
      const t = currentTime + layer.offset + mouseXRatio * 2 * Math.PI;
      const waveY = Math.sin((x / width) * 2 * Math.PI + t) * layer.amplitude;
      const y = baseY + waveY;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
    ctx.restore();
  }

  testServicios() {
    const pipe = new DatePipe('en-US');
    this.criterioConsultaArray = [];

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombre',
      'sol',
      TipoComandosBusqueda.LIKE
    );
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.orderBy('codigo');
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.naturalezaCuentaService.selectByCriteria(this.criterioConsultaArray).subscribe({
      next: (data: any) => {
        console.log('Datos de NaturalezaCuenta:', data);
      },
      error: (error: any) => {
        console.error('Error al obtener NaturalezaCuenta:', error);
      },
    });

    /*this.naturalezaCuentaService.getById('2588').subscribe({
      next: (data) => {
        console.log('GetById - Registro específico:', data);
      },
      error: (error) => {
        console.error('Error al obtener NaturalezaCuenta:', error);
      }
    });*/

    this.naturalezaCuentaService.getById('4851').subscribe({
      next: (data: any) => {
        console.log('GetById - Registro específico:', data);
      },
      error: (error: any) => {
        console.error('Error al obtener NaturalezaCuenta:', error);
      },
    });

    /*this.naturalezaCuentaService.selectByCriteria(this.criterioConsultaArray).subscribe({
      next: (data) => {
        console.log('Datos de NaturalezaCuenta:', data);
      },
      error: (error) => {
        console.error('Error al obtener NaturalezaCuenta:', error);
      }
    });*/

    /*this.criterioConsultaArray = [];

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo',
                                                   '2739', TipoComandosBusqueda.IGUAL);
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.orderBy('codigo');
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.fileService.selectByCriteria(this.criterioConsultaArray).subscribe({
      next: (data) => {
        console.log('Datos de Prestamo:', data);
      },
      error: (error) => {
        console.error('Error al obtener Prestamo:', error);
      }
    });*/
  }

  abrirCambioClaveDialog(): void {
    if (!this.username) {
      this.loginMessage = 'Por favor ingrese su nombre de usuario primero';
      this.loginMessageType = 'warning';
      return;
    }

    const dialogRef = this.dialog.open(CambioClaveDialogComponent, {
      width: '520px',
      disableClose: false,
      data: {
        idUsuario: this.username.toUpperCase(),
        esDesdeLogin: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.loginMessage =
          'Contraseña cambiada exitosamente. Por favor inicie sesión con su nueva contraseña.';
        this.loginMessageType = 'success';
        this.password = ''; // Limpiar campo de contraseña
      }
    });
  }
}
