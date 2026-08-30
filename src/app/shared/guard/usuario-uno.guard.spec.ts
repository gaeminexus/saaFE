import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { esUsuarioUno, usuarioUnoGuard } from './usuario-uno.guard';

/**
 * Los specs anteriores montaban la sesión con `idUsuario = '1'` y con `usuarioLog`, y
 * pasaban en verde mientras la pantalla NO aparecía en la aplicación real: ningún usuario
 * del sistema tiene el código 1 (el llamado "USUARIO 1" tiene el código 38) y `usuarioLog`
 * no lo escribe nadie en storage. Estos specs montan la sesión con las claves que la
 * aplicación escribe de verdad — `usuario`, `username`, `userName` — para que no puedan
 * volver a pasar sobre un supuesto falso.
 */
describe('usuarioUnoGuard / esUsuarioUno', () => {
  /** Objeto tal como lo guarda AppStateService.inicializarApp en `usuario`. */
  const usuarioUno = { codigo: 38, nombre: 'USUARIO 1' };
  const otroUsuario = { codigo: 970, nombre: 'ADMIN' };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('es true con el objeto `usuario` de USUARIO 1 (su codigo es 38, no 1)', () => {
    sessionStorage.setItem('usuario', JSON.stringify(usuarioUno));
    expect(esUsuarioUno()).toBeTrue();
  });

  it('es false para otro usuario', () => {
    sessionStorage.setItem('usuario', JSON.stringify(otroUsuario));
    expect(esUsuarioUno()).toBeFalse();
  });

  it('es false sin sesion', () => {
    expect(esUsuarioUno()).toBeFalse();
  });

  it('usa `username` como respaldo cuando no esta el objeto `usuario`', () => {
    sessionStorage.setItem('username', 'USUARIO 1');
    expect(esUsuarioUno()).toBeTrue();
  });

  it('normaliza mayusculas y espacios sobrantes', () => {
    sessionStorage.setItem('userName', '  usuario   1 ');
    expect(esUsuarioUno()).toBeTrue();
  });

  it('la comparacion es EXACTA: "RAIZ USUARIO" no pasa', () => {
    sessionStorage.setItem('usuario', JSON.stringify({ codigo: 51, nombre: 'RAIZ USUARIO' }));
    expect(esUsuarioUno()).toBeFalse();
  });

  it('GROBAYO tambien tiene acceso (agregado 2026-08-28, no reemplaza a USUARIO 1)', () => {
    sessionStorage.setItem('usuario', JSON.stringify({ codigo: 1240, nombre: 'GROBAYO' }));
    expect(esUsuarioUno()).toBeTrue();
  });

  it('el codigo 1 por si solo YA NO da acceso (era el defecto)', () => {
    sessionStorage.setItem('idUsuario', '1');
    expect(esUsuarioUno()).toBeFalse();
  });

  it('el guard PERMITE la navegacion a USUARIO 1', () => {
    sessionStorage.setItem('usuario', JSON.stringify(usuarioUno));
    const resultado = TestBed.runInInjectionContext(() =>
      usuarioUnoGuard({} as any, {} as any),
    );
    expect(resultado).toBeTrue();
  });

  it('el guard BLOQUEA (redirige) a otro usuario logueado', () => {
    sessionStorage.setItem('usuario', JSON.stringify(otroUsuario));
    sessionStorage.setItem('logged', 'true');
    const resultado = TestBed.runInInjectionContext(() =>
      usuarioUnoGuard({} as any, {} as any),
    );
    expect(resultado instanceof UrlTree).toBeTrue();
    const router = TestBed.inject(Router);
    expect((resultado as UrlTree).toString()).toBe(
      router.createUrlTree(['/menucreditos/parametrizacion']).toString(),
    );
  });
});
