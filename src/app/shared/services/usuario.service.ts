import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { throwError } from 'rxjs/internal/observable/throwError';
import { Empresa } from '../model/empresa';
import { Usuario } from '../model/usuario';
import { ServiciosShare } from './ws-share';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private usuarios!: Usuario[];

  private usuarioLog!: Usuario;

  private empresaLog!: Empresa;

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Usuario[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosShare.RS_USRO}${wsGetById}`;
    return this.http.get<Usuario[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getEmpresaById(id: number): Observable<Empresa | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosShare.RS_USRO}${wsGetById}${id}`;
    return this.http.get<Empresa>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByNombre(nombre: string): Observable<Usuario | null> {
    const wsGetById = '/getByNombre/';
    const url = `${ServiciosShare.RS_USRO}${wsGetById}${nombre}`;
    return this.http.get<Usuario>(url).pipe(
      catchError(this.handleError)
    );
  }

  validaUsuario(idUsuario: string, clave: string): any {
    const wsGetById = '/validaUsuario/' + idUsuario + '/';
    const url = `${ServiciosShare.RS_USRO}${wsGetById}${clave}`;
    return this.http.get(url, { responseType: 'text' });
  }

  cambiaClave(idUsuario: string, anterior: string, nueva: string): any {
    const wsGetById = '/cambiaClave/' + idUsuario + '/' + anterior + '/' + nueva;
    const url = `${ServiciosShare.RS_USRO}${wsGetById}`;
    return this.http.get(url, { responseType: 'text' });
  }

  verificaPermiso(idEmpresa: number, idUsuario: number, idPermiso: number): any {
    const wsGetById = '/verificaPermiso/' + idEmpresa + '/' + idUsuario + '/' + idPermiso;
    const url = `${ServiciosShare.RS_USRO}${wsGetById}`;
    return this.http.get(url, { responseType: 'text' });
  }

  setUsuarios(usuarios: Usuario[]): void {
    this.usuarios = usuarios;
  }

  getUsuarios(): Usuario[] {
    return this.usuarios;
  }

  setUsuarioLog(usuario: Usuario): void {
    this.usuarioLog = usuario;
    // Guardar en sessionStorage para sesión por pestaña
    if (usuario) {
      sessionStorage.setItem('usuarioLog', JSON.stringify(usuario));
    }
  }

  getUsuarioLog(): Usuario {
    // Si no está en memoria, intentar recuperar de sessionStorage
    if (!this.usuarioLog) {
      const usuarioStr = sessionStorage.getItem('usuarioLog') || localStorage.getItem('usuarioLog');
      if (usuarioStr) {
        try {
          this.usuarioLog = JSON.parse(usuarioStr);
        } catch (e) {
          console.error('Error parseando usuario del localStorage:', e);
        }
      }
    }
    return this.usuarioLog;
  }

  setEmpresaLog(empresa: Empresa): void {
    this.empresaLog = empresa;
    // Guardar en sessionStorage para sesión por pestaña
    if (empresa) {
      sessionStorage.setItem('empresaLog', JSON.stringify(empresa));
    }
  }

  getEmpresaLog(): Empresa {
    // Si no está en memoria, intentar recuperar de sessionStorage
    if (!this.empresaLog) {
      const empresaStr = sessionStorage.getItem('empresaLog') || localStorage.getItem('empresaLog');
      if (empresaStr) {
        try {
          this.empresaLog = JSON.parse(empresaStr);
        } catch (e) {
          console.error('Error parseando empresa del localStorage:', e);
        }
      }
    }
    return this.empresaLog;
  }

  // Método para limpiar la sesión al hacer logout
  clearSession(): void {
    this.usuarioLog = null as any;
    this.empresaLog = null as any;
    this.usuarios = [];

    // Limpiar sesión de la pestaña/ventana actual
    sessionStorage.removeItem('logged');
    sessionStorage.removeItem('usuarioLog');
    sessionStorage.removeItem('empresaLog');
    sessionStorage.removeItem('empresa');
    sessionStorage.removeItem('empresaName');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('idUsuario');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('idSucursal');
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
