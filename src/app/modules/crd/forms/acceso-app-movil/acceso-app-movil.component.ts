import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { TEXTO_ESTADO_USUARIO_APP, UsuarioAppDTO } from '../../model/usuario-app/usuario-app.model';
import { UsuarioAppService } from '../../service/usuario-app.service';

type AccionAcceso = 'crear' | 'resetear' | 'reactivar';

/** Sin 0/O/1/l/I (ni o minúscula) para que la clave se dicte sin confusiones. */
const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LONGITUD_CLAVE = 8;

const TEXTO_ACCION: Record<AccionAcceso, string> = {
  crear: 'Crear acceso',
  resetear: 'Resetear clave',
  reactivar: 'Reactivar cuenta',
};

/**
 * Acceso a la app móvil — alta, reseteo y reactivación de la cuenta de un partícipe (`CRD.USAP`).
 * Contrato: docs/crd/API-USUARIO-APP-MOVIL.md; orden: docs/crd/ORDEN-PANTALLA-ACCESO-APP-MOVIL-2026-10-20.md.
 *
 * Una cédula a la vez, sin listar. Cada estado tiene UNA sola acción válida (la calcula `accion`),
 * así el empleado no puede elegir la equivocada.
 *
 * ⛔ La clave temporal es dato sensible: vive solo en signals de este componente, se muestra una vez
 * en el resultado y no se escribe en localStorage/sessionStorage, ni en un servicio de estado, ni en
 * la consola. Se descarta al consultar otra cédula y al destruir la pantalla.
 *
 * ⛔ H13: un 404 es "sin cuenta"; un 500 es ERROR y se muestra distinto (`errorConsulta`).
 */
@Component({
  selector: 'app-acceso-app-movil',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './acceso-app-movil.component.html',
  styleUrl: './acceso-app-movil.component.scss',
})
export class AccesoAppMovilComponent implements OnDestroy {
  private servicio = inject(UsuarioAppService);

  readonly textoAccion = TEXTO_ACCION;
  readonly textoEstado = TEXTO_ESTADO_USUARIO_APP;

  /** Lo que el empleado escribe. Las acciones NO lo usan: usan `cedulaConsultada`. */
  cedula = signal('');
  /** Cédula de la última consulta exitosa (200 o 404). */
  cedulaConsultada = signal<string | null>(null);
  /** `null` = sin cuenta (404). Solo tiene sentido si `cedulaConsultada` no es null. */
  cuenta = signal<UsuarioAppDTO | null>(null);
  consultando = signal(false);
  errorConsulta = signal<string | null>(null);

  claveTemporal = signal('');
  verClave = signal(false);
  ejecutando = signal(false);
  errorAccion = signal<string | null>(null);

  /** Resultado de la última acción, con la clave para entregársela al partícipe (una sola vez). */
  entrega = signal<{ accion: AccionAcceso; identificacion: string; clave: string } | null>(null);

  /** La única acción habilitada según lo consultado; `null` si no hay nada consultado o el estado es desconocido. */
  accion = computed<AccionAcceso | null>(() => {
    if (this.cedulaConsultada() === null) return null;
    const c = this.cuenta();
    if (c === null) return 'crear';
    if (c.estado === 1 || c.estado === 2) return 'resetear';
    if (c.estado === 3) return 'reactivar';
    return null;
  });

  /** Mensaje de por qué la clave escrita no sirve; `null` si es válida. */
  errorClave = computed<string | null>(() => {
    const clave = this.claveTemporal();
    const ced = this.cedulaConsultada();
    if (!clave) return null;
    if (clave.length < LONGITUD_CLAVE) return `La clave debe tener al menos ${LONGITUD_CLAVE} caracteres.`;
    if (ced && clave.includes(ced)) return 'La clave no puede ser la cédula ni contenerla.';
    return null;
  });

  puedeEjecutar = computed(
    () =>
      this.accion() !== null &&
      this.claveTemporal().length >= LONGITUD_CLAVE &&
      this.errorClave() === null &&
      !this.ejecutando() &&
      !this.consultando()
  );

  puedeConsultar = computed(() => this.cedula().trim().length > 0 && !this.consultando() && !this.ejecutando());

  ngOnDestroy(): void {
    this.descartarClaves();
  }

  consultar(): void {
    if (!this.puedeConsultar()) return;
    // Consulta manual: se descarta la clave de la consulta anterior (pudo ser de otra cédula).
    this.descartarClaves();
    this.errorAccion.set(null);
    this.cargarEstado(this.cedula().trim());
  }

  generarClave(): void {
    this.claveTemporal.set(this.claveAleatoria());
    this.verClave.set(true);
  }

  ejecutar(): void {
    const accion = this.accion();
    const ced = this.cedulaConsultada();
    if (!accion || !ced || !this.puedeEjecutar()) return;

    const clave = this.claveTemporal();
    const solicitud = { identificacion: ced, claveTemporal: clave, usuario: usuarioSesion() };
    const llamada =
      accion === 'crear'
        ? this.servicio.crear(solicitud)
        : accion === 'resetear'
          ? this.servicio.resetearClave(solicitud)
          : this.servicio.reactivar(solicitud);

    this.ejecutando.set(true);
    this.errorAccion.set(null);
    llamada.subscribe({
      next: () => {
        this.ejecutando.set(false);
        this.entrega.set({ accion, identificacion: ced, clave });
        this.claveTemporal.set('');
        this.verClave.set(false);
        this.cargarEstado(ced); // muestra el estado nuevo
      },
      error: (e: Error) => {
        this.ejecutando.set(false);
        this.errorAccion.set(e.message);
      },
    });
  }

  cerrarEntrega(): void {
    this.entrega.set(null);
  }

  private cargarEstado(ced: string): void {
    this.consultando.set(true);
    this.errorConsulta.set(null);
    this.servicio.estado(ced).subscribe({
      next: (dto) => {
        this.consultando.set(false);
        this.cedulaConsultada.set(ced);
        this.cuenta.set(dto);
      },
      error: (e: Error) => {
        this.consultando.set(false);
        // Un error NO es "sin cuenta": se invalida lo consultado para que no quede ninguna acción habilitada.
        this.cedulaConsultada.set(null);
        this.cuenta.set(null);
        this.errorConsulta.set(e.message);
      },
    });
  }

  private descartarClaves(): void {
    this.entrega.set(null);
    this.claveTemporal.set('');
    this.verClave.set(false);
  }

  /** 8 caracteres con `crypto.getRandomValues` (nunca `Math.random`), sin sesgo de módulo, con letra y dígito. */
  private claveAleatoria(): string {
    const n = ALFABETO_CLAVE.length;
    const limite = Math.floor(256 / n) * n;
    for (;;) {
      let clave = '';
      while (clave.length < LONGITUD_CLAVE) {
        const bytes = crypto.getRandomValues(new Uint8Array(LONGITUD_CLAVE * 2));
        for (const b of bytes) {
          if (b < limite && clave.length < LONGITUD_CLAVE) clave += ALFABETO_CLAVE[b % n];
        }
      }
      if (/[A-Za-z]/.test(clave) && /[0-9]/.test(clave)) return clave;
    }
  }
}
