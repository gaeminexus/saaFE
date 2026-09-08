import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { NavItem } from '../../model/nav-item';

import { MenuListComponent } from './menu-list.component';

describe('MenuListComponent', () => {
  let component: MenuListComponent;
  let fixture: ComponentFixture<MenuListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuListComponent, RouterTestingModule],
      providers: [provideHttpClient()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuListComponent);
    component = fixture.componentInstance;
    component.item = { displayName: 'x', iconName: 'home', route: '/x' } as NavItem;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('nombres largos se parten en dos líneas, no se recortan a "…" (Mike, 2026-09-08)', () => {
    /**
     * Reporte de usuario: varias entradas del menú de RRHH (y "en otros módulos también") se
     * veían SOLO como "…", sin una sola letra. Medido con un layout real (Chrome headless, tema
     * de Material cargado) contra el sidebar expandido (300px, `side-menu-custom`): `.menu-text`
     * tiene ~170-190px disponibles, un margen ajustado para los nombres más largos del sistema —
     * cualquier diferencia de métrica de fuente entre entornos alcanzaba para que
     * `white-space: nowrap` + `text-overflow: ellipsis` lo colapsara del todo. "Proyección de
     * impuesto a la renta" (34 caracteres) es el nombre más largo de TODO el sistema — grep de
     * `displayName` en `modules/**\/menu/**`, más largo incluso que "Pago de beneficios
     * sociales"/"Anticipos a trabajadores", que fueron los que reportó el usuario.
     */
    function montar(nombre: string, anchoPx: number): { host: HTMLElement; fixture: ComponentFixture<MenuListComponent> } {
      const host = document.createElement('div');
      host.style.width = `${anchoPx}px`;
      host.style.position = 'fixed';
      host.style.left = '0';
      host.style.top = '0';
      document.body.appendChild(host);

      const fresco = TestBed.createComponent(MenuListComponent);
      fresco.componentInstance.item = { displayName: nombre, iconName: 'payments', route: '/x' } as NavItem;
      host.appendChild(fresco.nativeElement);
      fresco.detectChanges();
      return { host, fixture: fresco };
    }

    it('el nombre más largo del sistema entra completo, sin "…", con el sidebar expandido (300px)', () => {
      const { host, fixture: fresco } = montar('Proyección de impuesto a la renta', 300);
      const texto = fresco.nativeElement.querySelector('.menu-text') as HTMLElement;
      const enlace = fresco.nativeElement.querySelector('a.menu-list-item') as HTMLElement;
      const cs = getComputedStyle(texto);

      expect(cs.whiteSpace).toBe('normal');
      expect(texto.textContent).toBe('Proyección de impuesto a la renta');
      // Con `white-space: normal` el texto completo entra en el DOM — nada se recorta con "…".
      expect(texto.textContent).not.toContain('…');
      // Con `min-width: 0` el ítem flex por fin se deja medir por el ancho real disponible en vez
      // de por el ancho de su contenido: a 300px, hasta el nombre más largo del sistema entra
      // completo (medido: ~230px de ancho real, sin overflow) sin necesitar partirse en líneas.
      // No sobra al punto de desbordar la fila tampoco.
      expect(texto.scrollWidth).toBeLessThanOrEqual(texto.clientWidth + 1);
      expect(enlace.getBoundingClientRect().width).toBeCloseTo(300, 0);

      document.body.removeChild(host);
    });

    it('con un ancho angosto de verdad, el mismo nombre se parte en varias líneas en vez de recortarse', () => {
      // El sidebar expandido (300px) le alcanza incluso al nombre más largo del sistema (arriba),
      // pero la capacidad de partirse en líneas tiene que seguir funcionando para lo que no
      // alcance — el sidebar colapsado (90px, más abajo) es el caso real de hoy; acá se fuerza
      // un ancho todavía menor para probar el mecanismo de partido en sí, no un caso puntual.
      const { host, fixture: fresco } = montar('Proyección de impuesto a la renta', 60);
      const texto = fresco.nativeElement.querySelector('.menu-text') as HTMLElement;
      const enlace = fresco.nativeElement.querySelector('a.menu-list-item') as HTMLElement;

      expect(texto.textContent).toBe('Proyección de impuesto a la renta');
      expect(texto.textContent).not.toContain('…');
      const altoTexto = texto.getBoundingClientRect().height;
      expect(altoTexto).withContext(`alto de .menu-text = ${altoTexto}px, esperaba varios renglones`).toBeGreaterThan(25);

      // Y el renglón completo (`a.menu-list-item`) crece de alto para no tapar ni recortar nada —
      // `min-height` (no `height`) es justamente lo que permite esto.
      const altoFila = enlace.getBoundingClientRect().height;
      expect(altoFila).withContext(`alto de a.menu-list-item = ${altoFila}px`).toBeGreaterThan(48);

      document.body.removeChild(host);
    });

    it('un nombre corto sigue en un solo renglón, sin quedar roto por el cambio', () => {
      const { host, fixture: fresco } = montar('Cheques', 300);
      const texto = fresco.nativeElement.querySelector('.menu-text') as HTMLElement;

      expect(texto.textContent).toBe('Cheques');
      const alto = texto.getBoundingClientRect().height;
      expect(alto).withContext(`alto de .menu-text = ${alto}px, esperaba un solo renglón`).toBeLessThan(25);

      document.body.removeChild(host);
    });

    it('title/tooltip con el nombre completo sigue presente para el caso extremo', () => {
      const { host, fixture: fresco } = montar('Proyección de impuesto a la renta', 300);
      const enlace = fresco.nativeElement.querySelector('a.menu-list-item') as HTMLElement;

      expect(enlace.getAttribute('title')).toBe('Proyección de impuesto a la renta');

      document.body.removeChild(host);
    });

    it('sidebar colapsado (90px): sigue sin reventar ni desbordar horizontalmente la página', () => {
      const { host, fixture: fresco } = montar('Proyección de impuesto a la renta', 90);
      const texto = fresco.nativeElement.querySelector('.menu-text') as HTMLElement;
      const enlace = fresco.nativeElement.querySelector('a.menu-list-item') as HTMLElement;

      // No es el caso que reportó el usuario (esto pasaba con el sidebar expandido), pero hay que
      // dejar constancia de que a 90px tampoco desborda el ancho del contenedor: con
      // `overflow-wrap: break-word` el texto se sigue partiendo en vez de ensanchar la fila.
      expect(texto.getBoundingClientRect().width).toBeLessThanOrEqual(enlace.getBoundingClientRect().width + 1);

      document.body.removeChild(host);
    });
  });
});
