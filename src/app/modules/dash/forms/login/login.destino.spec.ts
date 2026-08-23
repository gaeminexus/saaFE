import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AppStateService } from '../../../../shared/services/app-state.service';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { NaturalezaCuentaService } from '../../../cnt/service/naturaleza-cuenta.service';
import { SessionTimeoutService } from '../session-timeout/session-timeout.service';
import { LoginComponent } from './login.component';

/**
 * D25 · El login descartaba el destino que la guarda sí le mandaba.
 *
 * El caso real: abrir la URL de un período —`…/periodos-nomina/41`— en una pestaña nueva o desde
 * un enlace compartido. `sessionStorage` está vacío en esa pestaña, `authGuard` deniega y manda a
 * `/login?returnUrl=…`, y el login **restaura la sesión de `localStorage` sin pedir nada** y
 * aterriza en `/menu`. Se lee como un problema de sesión porque hubo un paso por el login, y no lo
 * es: la sesión estaba entera y lo que se perdió fue el destino.
 *
 * Se prueba contra la navegación, que es donde el defecto es observable, y no contra la pantalla.
 */
describe('LoginComponent · destino tras el login (D25)', () => {
  const DESTINO = '/menurecursoshumanos/procesos/periodos-nomina/41';

  let navegaciones: string[];
  let usuarioService: any;
  let inicializarApp: jasmine.Spy;

  function montar(returnUrl: string | null): LoginComponent {
    TestBed.resetTestingModule();
    navegaciones = [];
    inicializarApp = jasmine.createSpy('inicializarApp').and.returnValue(of({}));
    usuarioService = { validaUsuario: jasmine.createSpy('validaUsuario').and.returnValue(of('OK')) };

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(returnUrl === null ? {} : { returnUrl }),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: (url: string) => { navegaciones.push(url); return Promise.resolve(true); },
            navigate: (ruta: any[]) => { navegaciones.push(ruta.join('/')); return Promise.resolve(true); },
          },
        },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: AppStateService, useValue: { inicializarApp } },
        { provide: NaturalezaCuentaService, useValue: {} },
        { provide: SessionTimeoutService, useValue: { initializeSessionTimeout: () => undefined } },
        { provide: MatDialog, useValue: { open: () => undefined } },
      ],
    });

    return TestBed.createComponent(LoginComponent).componentInstance;
  }

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('la pestaña nueva sobre una URL de período', () => {
    it('restaura la sesión compartida y llega al período, no al menú', () => {
      // Lo que deja una sesión abierta en otra pestaña.
      localStorage.setItem('logged', 'true');
      localStorage.setItem('username', 'MIKE');

      const componente = montar(DESTINO);
      componente.ngOnInit();

      expect(sessionStorage.getItem('logged')).toBe('true');
      expect(navegaciones).toEqual([DESTINO]);
    });

    it('también cuando la sesión compartida no trae usuario', () => {
      localStorage.setItem('logged', 'true');

      const componente = montar(DESTINO);
      componente.ngOnInit();

      expect(navegaciones).toEqual([DESTINO]);
    });

    it('y aunque la carga de datos globales falle', () => {
      localStorage.setItem('logged', 'true');
      localStorage.setItem('username', 'MIKE');

      const componente = montar(DESTINO);
      inicializarApp.and.returnValue(throwError(() => new Error('sin red')));
      componente.ngOnInit();

      expect(navegaciones).toEqual([DESTINO]);
    });
  });

  it('con la sesión ya viva en esta pestaña, va derecho al destino', () => {
    sessionStorage.setItem('logged', 'true');

    const componente = montar(DESTINO);
    componente.ngOnInit();

    expect(navegaciones).toEqual([DESTINO]);
  });

  it('tras teclear usuario y contraseña, también', () => {
    const componente = montar(DESTINO);
    componente.username = 'mike';
    componente.password = 'x';

    componente.validaUsuario();

    expect(usuarioService.validaUsuario).toHaveBeenCalled();
    expect(navegaciones).toEqual([DESTINO]);
  });

  it('sin `returnUrl` sigue yendo al menú, como siempre', () => {
    sessionStorage.setItem('logged', 'true');

    const componente = montar(null);
    componente.ngOnInit();

    expect(navegaciones).toEqual(['/menu']);
  });

  /**
   * Un `returnUrl` viaja en la barra de direcciones y lo escribe quien quiera. Corregir la
   * navegación abriendo un salto a otro sitio sería cambiar un defecto por uno peor.
   */
  describe('sólo acepta rutas internas', () => {
    const RECHAZADOS = [
      ['otro host con doble barra', '//evil.example.com/robar'],
      ['esquema completo', 'https://evil.example.com/robar'],
      ['ruta relativa', 'menurecursoshumanos/procesos'],
      ['javascript', 'javascript://alert(1)'],
      ['el propio login, que sería un bucle', '/login'],
      ['el propio login con query', '/login?returnUrl=/menu'],
    ];

    for (const [caso, valor] of RECHAZADOS) {
      it(`rechaza ${caso} y cae al menú`, () => {
        sessionStorage.setItem('logged', 'true');

        const componente = montar(valor);
        componente.ngOnInit();

        expect(navegaciones).toEqual(['/menu']);
      });
    }

    it('acepta la ruta interna con su propia query', () => {
      sessionStorage.setItem('logged', 'true');

      const componente = montar('/menurecursoshumanos/procesos/periodos-nomina/41?tab=novedades');
      componente.ngOnInit();

      expect(navegaciones).toEqual(['/menurecursoshumanos/procesos/periodos-nomina/41?tab=novedades']);
    });
  });
});
