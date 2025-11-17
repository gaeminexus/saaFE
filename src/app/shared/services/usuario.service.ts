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
    console.log('UsuarioService - validaUsuario - idUsuario: ' + idUsuario + ' clave: ' + clave );
    const wsGetById = '/validaUsuario/' + idUsuario + '/';
    const url = `${ServiciosShare.RS_USRO}${wsGetById}${clave}`;
    console.log('Validating user with URL: ' + url);
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
  }

  getUsuarioLog(): Usuario {
    return this.usuarioLog;
  }

  setEmpresaLog(empresa: Empresa): void {
    this.empresaLog = empresa;
  }

  getEmpresaLog(): Empresa {
    return this.empresaLog;
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
