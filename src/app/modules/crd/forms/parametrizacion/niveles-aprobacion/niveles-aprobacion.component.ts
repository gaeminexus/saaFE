import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, finalize, forkJoin, of, switchMap } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Usuario } from '../../../../../shared/model/usuario';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { ReglaAprobacion, ReglaAprobacionCompleta, SimulacionReglaAprobacion } from '../../../model/nivel-aprobacion';
import { TipoPrestamo } from '../../../model/tipo-prestamo';
import { NivelAprobacionService } from '../../../service/nivel-aprobacion.service';
import { TipoPrestamoService } from '../../../service/tipo-prestamo.service';

const PRIORIDAD_POR_DEFECTO = 100;

/** Operación a la que aplica una regla (`null` = cualquiera). */
const OPERACIONES: { valor: number; nombre: string }[] = [
  { valor: 1, nombre: 'Nuevo' },
  { valor: 2, nombre: 'Novación' },
  { valor: 3, nombre: 'Reestructuración' },
];

interface FilaRegla {
  regla: ReglaAprobacion;
  /** Niveles activos de la regla; `null` si no se pudo consultar. */
  niveles: number | null;
}

/**
 * «Niveles de aprobación» (DISENO-SOLICITUD-V1 §B4): reglas por tipo de préstamo, monto y plazo, con sus
 * niveles ordenados y los usuarios que aprueban cada nivel. Quitar es inactivar, nunca borrar. El botón
 * «Probar» muestra qué regla aplicaría a un tipo, monto y plazo. Los 422 del backend se muestran tal cual.
 */
@Component({
  selector: 'app-niveles-aprobacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './niveles-aprobacion.component.html',
  styleUrl: './niveles-aprobacion.component.scss',
})
export class NivelesAprobacionComponent implements OnInit {
  private servicio = inject(NivelAprobacionService);
  private tipoService = inject(TipoPrestamoService);
  private usuarioService = inject(UsuarioService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly columnas = ['nombre', 'tipo', 'operacion', 'monto', 'plazo', 'prioridad', 'niveles', 'estado', 'acciones'];

  vista = signal<'lista' | 'edicion'>('lista');
  cargando = signal(false);
  ocupado = signal(false);
  error = signal<string | null>(null);

  filas = signal<FilaRegla[]>([]);
  tipos = signal<TipoPrestamo[]>([]);
  usuarios = signal<Usuario[]>([]);

  // ---- edición ----
  reglaId = signal<number | null>(null);
  completa = signal<ReglaAprobacionCompleta | null>(null);
  nombre = '';
  tipoElegido: TipoPrestamo | null = null;
  tipoTexto = signal('');
  montoMinimo: number | null = null;
  montoMaximo: number | null = null;
  plazoMinimo: number | null = null;
  plazoMaximo: number | null = null;
  operacion: number | null = null;
  prioridad: number | null = PRIORIDAD_POR_DEFECTO;

  nuevoNivelNombre = '';
  /** Nombre editado por nivel (código del nivel → texto). */
  nombresEditados: Record<number, string> = {};
  /** Texto de búsqueda de usuario por nivel (código del nivel → texto). */
  busquedaUsuario: Record<number, string> = {};

  // ---- probar ----
  probarTipo: TipoPrestamo | null = null;
  probarTipoTexto = signal('');
  probarOperacion = 1;
  probarMonto: number | null = null;
  probarPlazo: number | null = null;
  probando = signal(false);
  simulacion = signal<SimulacionReglaAprobacion | null>(null);
  errorProbar = signal<string | null>(null);

  tiposFiltradosEdicion = computed(() => this.filtrarTipos(this.tipoTexto()));
  tiposFiltradosProbar = computed(() => this.filtrarTipos(this.probarTipoTexto()));

  ngOnInit(): void {
    this.tipoService.getAll().subscribe({ next: (t) => this.tipos.set(t || []), error: () => this.tipos.set([]) });
    this.usuarioService.getAll().subscribe({ next: (u) => this.usuarios.set(u || []), error: () => this.usuarios.set([]) });
    this.cargarLista();
  }

  // ================= lista =================

  cargarLista(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .reglas()
      .pipe(
        switchMap((reglas) =>
          reglas.length
            ? forkJoin(
                reglas.map((regla) =>
                  regla.codigo == null
                    ? of({ regla, niveles: null } as FilaRegla)
                    : this.reglaCompleta(regla.codigo, regla)
                )
              )
            : of([] as FilaRegla[])
        ),
        finalize(() => this.cargando.set(false))
      )
      .subscribe({
        next: (filas) => this.filas.set(filas),
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudieron cargar las reglas')),
      });
  }

  private reglaCompleta(id: number, regla: ReglaAprobacion): Observable<FilaRegla> {
    return new Observable<FilaRegla>((obs) => {
      this.servicio.reglaCompleta(id).subscribe({
        next: (c) => {
          obs.next({ regla, niveles: c.niveles.length });
          obs.complete();
        },
        error: () => {
          obs.next({ regla, niveles: null });
          obs.complete();
        },
      });
    });
  }

  readonly operaciones = OPERACIONES;

  nombreOperacion(op: number | null | undefined): string {
    return op == null ? 'Cualquiera' : (OPERACIONES.find((o) => o.valor === op)?.nombre ?? `Operación ${op}`);
  }

  nombreTipo(id: number | null | undefined): string {
    if (id == null) return 'Cualquiera';
    return this.tipos().find((t) => t.codigo === id)?.nombre ?? `Tipo ${id}`;
  }

  rango(min: number | null | undefined, max: number | null | undefined, formato: 'dinero' | 'cuotas'): string {
    const f = (n: number) => (formato === 'dinero' ? n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(n));
    if (min == null && max == null) return 'Sin límite';
    return `${min != null ? f(min) : 'Sin mínimo'} – ${max != null ? f(max) : 'Sin máximo'}`;
  }

  esActiva(r: ReglaAprobacion): boolean {
    return r.estado == null || r.estado === 1;
  }

  // ================= edición de la regla =================

  nueva(): void {
    this.reglaId.set(null);
    this.completa.set(null);
    this.llenarFormulario(null);
    this.vista.set('edicion');
  }

  editar(fila: FilaRegla): void {
    if (fila.regla.codigo == null) return;
    this.recargarCompleta(fila.regla.codigo, true);
    this.vista.set('edicion');
  }

  volver(): void {
    this.vista.set('lista');
    this.cargarLista();
  }

  private recargarCompleta(id: number, llenar = false): void {
    this.ocupado.set(true);
    this.servicio
      .reglaCompleta(id)
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (c) => {
          this.reglaId.set(id);
          this.completa.set(c);
          if (llenar) this.llenarFormulario(c.regla);
          this.nombresEditados = {};
          c.niveles.forEach((n) => (this.nombresEditados[n.codigo] = n.nombre));
        },
        error: (err) => this.avisar(err, 'No se pudo leer la regla'),
      });
  }

  private llenarFormulario(r: ReglaAprobacion | null): void {
    this.nombre = r?.nombre ?? '';
    this.tipoElegido = r?.idTipoPrestamo != null ? (this.tipos().find((t) => t.codigo === r.idTipoPrestamo) ?? null) : null;
    this.tipoTexto.set(this.tipoElegido ? this.etiquetaTipo(this.tipoElegido) : '');
    this.montoMinimo = r?.montoMinimo ?? null;
    this.montoMaximo = r?.montoMaximo ?? null;
    this.plazoMinimo = r?.plazoMinimo ?? null;
    this.plazoMaximo = r?.plazoMaximo ?? null;
    this.operacion = r?.operacion ?? null;
    this.prioridad = r?.prioridad ?? PRIORIDAD_POR_DEFECTO;
    this.nuevoNivelNombre = '';
  }

  get puedeGuardarRegla(): boolean {
    return !this.ocupado() && this.nombre.trim().length > 0 && this.prioridad != null;
  }

  guardarRegla(): void {
    if (!this.puedeGuardarRegla) return;
    const id = this.reglaId();
    const cuerpo: ReglaAprobacion = {
      ...(id != null ? { codigo: id } : {}),
      idTipoPrestamo: this.tipoElegido?.codigo ?? null,
      operacion: this.operacion,
      nombre: this.nombre.trim(),
      montoMinimo: this.vacioANull(this.montoMinimo),
      montoMaximo: this.vacioANull(this.montoMaximo),
      plazoMinimo: this.vacioANull(this.plazoMinimo),
      plazoMaximo: this.vacioANull(this.plazoMaximo),
      prioridad: this.prioridad ?? PRIORIDAD_POR_DEFECTO,
    };
    this.ocupado.set(true);
    (id != null ? this.servicio.updateRegla(cuerpo) : this.servicio.addRegla(cuerpo))
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (guardada) => {
          this.snackBar.open('Regla guardada correctamente', 'Cerrar', { duration: 3000 });
          if (guardada?.codigo != null) this.recargarCompleta(guardada.codigo);
        },
        error: (err) => this.avisar(err, 'No se pudo guardar la regla'),
      });
  }

  inactivarRegla(fila: FilaRegla): void {
    const id = fila.regla.codigo;
    if (id == null) return;
    this.confirmar('Inactivar regla', `Se va a inactivar la regla «${fila.regla.nombre}». No se borra.`, 'Inactivar', () =>
      this.ejecutar(this.servicio.inactivarRegla(id), 'Regla inactivada', 'No se pudo inactivar la regla', () => this.cargarLista())
    );
  }

  // ================= niveles =================

  agregarNivel(): void {
    const id = this.reglaId();
    const nombre = this.nuevoNivelNombre.trim();
    if (id == null || !nombre) return;
    const mayor = Math.max(0, ...(this.completa()?.niveles ?? []).map((n) => n.orden));
    this.ejecutar(
      this.servicio.addNivel({ idRegla: id, orden: mayor + 1, nombre }),
      'Nivel agregado',
      'No se pudo agregar el nivel',
      () => {
        this.nuevoNivelNombre = '';
        this.recargarCompleta(id);
      }
    );
  }

  nombreCambiado(codigo: number, original: string): boolean {
    const editado = (this.nombresEditados[codigo] ?? '').trim();
    return editado.length > 0 && editado !== original;
  }

  renombrarNivel(codigo: number, orden: number): void {
    const id = this.reglaId();
    const nombre = (this.nombresEditados[codigo] ?? '').trim();
    if (id == null || !nombre) return;
    this.ejecutar(
      this.servicio.updateNivel({ codigo, idRegla: id, orden, nombre }),
      'Nivel actualizado',
      'No se pudo actualizar el nivel',
      () => this.recargarCompleta(id)
    );
  }

  /**
   * Cambia el orden con el vecino. El backend rechaza dos niveles activos con el mismo orden, así que el
   * intercambio va en tres pasos con un orden temporal que no usa nadie.
   */
  mover(indice: number, delta: -1 | 1): void {
    const id = this.reglaId();
    const niveles = this.completa()?.niveles ?? [];
    const a = niveles[indice];
    const b = niveles[indice + delta];
    if (id == null || !a || !b) return;
    const temporal = Math.max(...niveles.map((n) => n.orden)) + 1000;
    this.ocupado.set(true);
    this.servicio
      .updateNivel({ codigo: a.codigo, idRegla: id, orden: temporal, nombre: a.nombre })
      .pipe(
        switchMap(() => this.servicio.updateNivel({ codigo: b.codigo, idRegla: id, orden: a.orden, nombre: b.nombre })),
        switchMap(() => this.servicio.updateNivel({ codigo: a.codigo, idRegla: id, orden: b.orden, nombre: a.nombre })),
        finalize(() => this.ocupado.set(false))
      )
      .subscribe({
        next: () => this.recargarCompleta(id),
        error: (err) => {
          this.avisar(err, 'No se pudo cambiar el orden');
          this.recargarCompleta(id);
        },
      });
  }

  quitarNivel(codigo: number, nombre: string): void {
    const id = this.reglaId();
    if (id == null) return;
    this.confirmar('Quitar nivel', `Se va a quitar el nivel «${nombre}». Queda inactivo, no se borra.`, 'Quitar', () =>
      this.ejecutar(this.servicio.inactivarNivel(codigo), 'Nivel quitado', 'No se pudo quitar el nivel', () => this.recargarCompleta(id))
    );
  }

  // ================= usuarios del nivel =================

  usuariosFiltrados(codigoNivel: number): Usuario[] {
    const q = (this.busquedaUsuario[codigoNivel] ?? '').trim().toLowerCase();
    const lista = this.usuarios();
    const base = q ? lista.filter((u) => (u.nombre ?? '').toLowerCase().includes(q) || String(u.codigo).includes(q)) : lista;
    return base.slice(0, 50);
  }

  agregarUsuario(codigoNivel: number, idUsuario: number): void {
    const id = this.reglaId();
    if (id == null) return;
    this.busquedaUsuario[codigoNivel] = '';
    this.ejecutar(
      this.servicio.addUsuario({ idNivel: codigoNivel, idUsuario }),
      'Usuario agregado al nivel',
      'No se pudo agregar el usuario',
      () => this.recargarCompleta(id)
    );
  }

  quitarUsuario(codigoUsuarioNivel: number): void {
    const id = this.reglaId();
    if (id == null) return;
    this.ejecutar(this.servicio.inactivarUsuario(codigoUsuarioNivel), 'Usuario quitado del nivel', 'No se pudo quitar el usuario', () =>
      this.recargarCompleta(id)
    );
  }

  // ================= tipos (combo con búsqueda por nombre y código SBS) =================

  etiquetaTipo(t: TipoPrestamo): string {
    return t.codigoSBS ? `${t.nombre} (${t.codigoSBS})` : t.nombre;
  }

  private filtrarTipos(texto: string): TipoPrestamo[] {
    const q = texto.trim().toLowerCase();
    const lista = this.tipos();
    if (!q) return lista;
    return lista.filter((t) => (t.nombre ?? '').toLowerCase().includes(q) || (t.codigoSBS ?? '').toLowerCase().includes(q));
  }

  alEscribirTipo(texto: string): void {
    this.tipoTexto.set(texto);
    this.tipoElegido = null;
  }

  alElegirTipo(t: TipoPrestamo | null): void {
    this.tipoElegido = t;
    this.tipoTexto.set(t ? this.etiquetaTipo(t) : '');
  }

  alEscribirTipoProbar(texto: string): void {
    this.probarTipoTexto.set(texto);
    this.probarTipo = null;
  }

  alElegirTipoProbar(t: TipoPrestamo | null): void {
    this.probarTipo = t;
    this.probarTipoTexto.set(t ? this.etiquetaTipo(t) : '');
  }

  // ================= probar =================

  probar(): void {
    this.probando.set(true);
    this.errorProbar.set(null);
    this.simulacion.set(null);
    this.servicio
      .simular(this.probarTipo?.codigo ?? null, this.vacioANull(this.probarMonto), this.vacioANull(this.probarPlazo), this.probarOperacion)
      .pipe(finalize(() => this.probando.set(false)))
      .subscribe({
        next: (s) => this.simulacion.set(s),
        error: (err) => this.errorProbar.set(mensajeDeError(err, 'No se pudo probar la configuración')),
      });
  }

  // ================= utilitarios =================

  private vacioANull(n: number | null): number | null {
    return n == null || (n as unknown) === '' ? null : n;
  }

  private confirmar(title: string, message: string, confirmText: string, accion: () => void): void {
    const data: ConfirmDialogData = { title, message, confirmText, type: 'danger' };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((ok) => ok && accion());
  }

  private ejecutar(llamada: Observable<unknown>, exito: string, falla: string, despues: () => void): void {
    this.ocupado.set(true);
    llamada.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: () => {
        this.snackBar.open(exito, 'Cerrar', { duration: 3000 });
        despues();
      },
      error: (err) => this.avisar(err, falla),
    });
  }

  private avisar(err: unknown, porDefecto: string): void {
    const mensaje = mensajeDeError(err, porDefecto);
    this.error.set(mensaje);
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000, panelClass: ['error-snackbar'] });
  }
}
