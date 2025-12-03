import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { filter, tap, catchError } from 'rxjs/operators';
import { UsuarioService } from './usuario.service';
import { DetalleRubroService } from './detalle-rubro.service';
import { Usuario } from '../model/usuario';
import { Empresa } from '../model/empresa';
import { DetalleRubro } from '../model/detalle-rubro';

export interface AppData {
  empresa: Empresa;
  usuario: Usuario;
  detallesRubro: DetalleRubro[];
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private datosGlobales$ = new BehaviorSubject<AppData | null>(null);
  private cargaIniciada = false;

  constructor(
    private usuarioService: UsuarioService,
    private detalleRubroService: DetalleRubroService
  ) {
    // Restaurar automáticamente la sesión desde localStorage al construir el servicio
    // Se ejecuta UNA vez gracias a APP_INITIALIZER antes del bootstrap
    this.restaurarDesdeSesion();
  }

  /**
   * Restaura los datos desde localStorage si existe sesión activa
   * Se ejecuta automáticamente al inicializar el servicio (vía APP_INITIALIZER)
   * @private
   */
  private restaurarDesdeSesion(): void {
    const empresaStr = localStorage.getItem('empresa');
    const usuarioStr = localStorage.getItem('usuario');
    const logged = localStorage.getItem('logged');

    // Solo restaurar si hay sesión activa
    if (logged !== 'true' || !empresaStr || !usuarioStr) {
      console.log('AppStateService: No hay sesión activa para restaurar');
      return;
    }

    try {
      const empresa = JSON.parse(empresaStr) as Empresa;
      const usuario = JSON.parse(usuarioStr) as Usuario;

      // Rehidratar servicios en memoria
      this.usuarioService.setEmpresaLog(empresa);
      this.usuarioService.setUsuarioLog(usuario);

      console.log('AppStateService: Restaurando sesión desde localStorage...', {
        empresa: empresa.nombre,
        usuario: usuario.nombre
      });

      // Recargar rubros en segundo plano (asíncrono)
      this.detalleRubroService.inicializar().subscribe({
        next: (detallesRubro) => {
          const appData: AppData = { empresa, usuario, detallesRubro };
          this.datosGlobales$.next(appData);
          this.cargaIniciada = true;

          console.log('✅ AppStateService: Sesión restaurada completamente', {
            empresa: empresa.nombre,
            usuario: usuario.nombre,
            rubros: detallesRubro.length
          });
        },
        error: (err) => {
          console.error('⚠️ AppStateService: Error al restaurar rubros, continuando sin ellos', err);

          // Aún así restaurar empresa y usuario (sin rubros)
          const appData: AppData = {
            empresa,
            usuario,
            detallesRubro: []
          };
          this.datosGlobales$.next(appData);
          this.cargaIniciada = true;
        }
      });

    } catch (error) {
      console.error('❌ AppStateService: Error al parsear datos de localStorage', error);
      this.limpiarDatos(); // Limpiar sesión corrupta
    }
  }

  /**
   * Inicializa los datos globales de la aplicación
   * Llamar desde login.component.ts después de autenticación exitosa
   *
   * @param empresaId ID de la empresa
   * @param username Nombre del usuario logueado
   * @returns Observable con los datos cargados
   */
  inicializarApp(empresaId: number, username: string): Observable<AppData> {
    // Si ya se cargaron los datos (por login o restauración), retornarlos
    if (this.cargaIniciada && this.datosGlobales$.value) {
      console.log('AppStateService: Datos ya inicializados, retornando desde caché');
      return of(this.datosGlobales$.value);
    }

    this.cargaIniciada = true;

    return forkJoin({
      empresa: this.usuarioService.getEmpresaById(empresaId),
      usuario: this.usuarioService.getByNombre(username.toUpperCase()),
      detallesRubro: this.detalleRubroService.inicializar()
    }).pipe(
      tap((datos: any) => {
        const appData: AppData = {
          empresa: datos.empresa as Empresa,
          usuario: datos.usuario as Usuario,
          detallesRubro: datos.detallesRubro as DetalleRubro[]
        };

        // Guardar en el BehaviorSubject
        this.datosGlobales$.next(appData);

        // Guardar en localStorage (mantener compatibilidad con código existente)
        localStorage.setItem('empresa', JSON.stringify(appData.empresa));
        localStorage.setItem('idEmpresa', appData.empresa.codigo.toString());
        localStorage.setItem('empresaName', appData.empresa.nombre);
        localStorage.setItem('usuario', JSON.stringify(appData.usuario));
        localStorage.setItem('userName', username);
        localStorage.setItem('idUsuario', appData.usuario.codigo.toString());

        // Guardar en el servicio de usuario (mantener compatibilidad)
        this.usuarioService.setEmpresaLog(appData.empresa);
        this.usuarioService.setUsuarioLog(appData.usuario);

        console.log('AppStateService: Datos globales inicializados', {
          empresa: appData.empresa.nombre,
          usuario: appData.usuario.nombre,
          detallesRubro: appData.detallesRubro.length
        });
      }),
      catchError((error) => {
        console.error('Error al inicializar datos globales:', error);
        this.cargaIniciada = false;
        this.detalleRubroService.limpiarCache();
        throw error;
      })
    );
  }

  /**
   * Obtiene los datos globales de la aplicación
   * @returns Observable con los datos (null si no se han cargado)
   */
  getDatosGlobales(): Observable<AppData | null> {
    return this.datosGlobales$.asObservable();
  }

  /**
   * Obtiene los datos globales solo cuando estén disponibles
   * @returns Observable con los datos (espera hasta que estén cargados)
   */
  getDatosGlobalesReady(): Observable<AppData> {
    return this.datosGlobales$.pipe(
      filter(datos => datos !== null)
    ) as Observable<AppData>;
  }

  /**
   * Obtiene la empresa actual de forma síncrona
   * @returns Empresa o null si no está cargada
   */
  getEmpresa(): Empresa | null {
    return this.datosGlobales$.value?.empresa || null;
  }

  /**
   * Obtiene el usuario actual de forma síncrona
   * @returns Usuario o null si no está cargado
   */
  getUsuario(): Usuario | null {
    return this.datosGlobales$.value?.usuario || null;
  }

  /**
   * Obtiene los detalles de rubro de forma síncrona
   * @returns Array de DetalleRubro o array vacío si no están cargados
   */
  getDetallesRubro(): DetalleRubro[] {
    return this.datosGlobales$.value?.detallesRubro || [];
  }

  /**
   * Limpia los datos globales (logout)
   */
  limpiarDatos(): void {
    this.datosGlobales$.next(null);
    this.cargaIniciada = false;
    this.detalleRubroService.limpiarCache();

    localStorage.removeItem('empresa');
    localStorage.removeItem('empresaName');
    localStorage.removeItem('usuario');
    localStorage.removeItem('userName');
    localStorage.removeItem('idUsuario');
    localStorage.removeItem('idEmpresa');
    localStorage.removeItem('logged');
    localStorage.removeItem('token');
    console.log('AppStateService: Datos globales limpiados');
  }

  /**
   * Verifica si los datos globales están cargados
   * @returns true si están cargados, false en caso contrario
   */
  estanDatosCargados(): boolean {
    return this.datosGlobales$.value !== null;
  }
}
