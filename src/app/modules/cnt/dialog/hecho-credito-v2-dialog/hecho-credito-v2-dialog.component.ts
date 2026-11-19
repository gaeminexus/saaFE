import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FileService } from '../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import {
  AdjuntoEntradaV2,
  CandidatosHechoV2,
  CuotaV2,
  LineaV2,
  OrigenCandidatoV2,
  ParticipeV2,
  PedidoV2,
  PrestamoV2,
  ResultadoAccionV2,
  TIPOS_DOCUMENTO_V2,
  TIPOS_HECHO,
  TipoHecho,
  dinero,
  fechaCorta,
} from '../../model/novedades-v2';
import { NovedadesV2Service } from '../../service/novedades-v2.service';

const r2 = (x: number): number => Math.round(x * 100) / 100;

/** Desde dónde se abre el hecho. */
export interface HechoCreditoV2Data {
  idEmpresa: number;
  idNovedad: number;
  /** Carpeta de subida de adjuntos (novedades/AAAA-MM/idNovedad). */
  rutaSubida: string;
  linea?: LineaV2;
  pedido?: PedidoV2;
}

/** Origen elegido (fila de la tabla «Origen del dinero»). */
interface OrigenElegido {
  fuente: 'EXTRACTO' | 'APORTE' | 'PENDIENTE' | 'SIN_DINERO';
  fuenteNombre: string;
  id: number | null;
  clave: string;
  fecha: any;
  descripcion: string;
  aplicadoHoy: string;
  disponible: number | null;
  valor: number | null;
  conceptoReal: string;
  texto: string;
  /** Aplicado hoy a otra entidad o a otro concepto: se pide «qué es en realidad». */
  reclasifica: boolean;
}

type Pestana = 'SUGERIDOS' | 'EXTRACTO' | 'APORTE' | 'PENDIENTE';

/**
 * C34d — Resolver novedades con un «hecho de crédito»: operación, qué pasó, fecha, valor y de dónde salió el dinero
 * (movimientos del extracto, de la cuenta individual o partidas pendientes, aunque ya estén procesados con otro concepto).
 * El usuario no arma asientos: la pasada v8 aplica el hecho con el motor de crédito en su mes.
 */
@Component({
  selector: 'app-hecho-credito-v2-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Resolver con un hecho de crédito</h2>
    <mat-dialog-content class="contenido">
      <div class="sub intro">
        Indique qué pasó con el préstamo y de dónde salió el dinero. No hace falta armar un asiento: el próximo re-proceso
        aplica el hecho con el motor de crédito en su mes y genera la contabilidad.
      </div>
      @if (data.linea; as l) {
        <div class="caja">
          <strong>Desde el movimiento {{ l.secuencia }}</strong> · {{ l.tipoMovimiento }} del {{ fecha(l.fechaBanco || l.fecha) }} ·
          {{ l.descripcion }} · falta {{ dinero(l.saldo) }}
        </div>
      } @else if (data.pedido; as p) {
        <div class="caja"><strong>Desde el pedido:</strong> {{ p.descripcion }}</div>
      }

      <!-- 1. Operación y hecho -->
      <div class="seccion"><span class="n">1</span> Operación y hecho</div>
      @if (prestamo(); as pr) {
        <div class="elegido">
          <strong>Operación {{ pr.idAsoprep }}</strong> · {{ pr.nombre }} ({{ pr.cedula }})
          @if (candidatos()?.valorCuota) { · cuota {{ dinero(candidatos()!.valorCuota) }} }
          <button mat-button type="button" (click)="cambiarPrestamo()">Cambiar</button>
        </div>
      } @else {
        <mat-form-field appearance="outline" class="ancho">
          <mat-label>Operación: número (idAsoprep), cédula o nombre</mat-label>
          <input matInput [(ngModel)]="textoPrestamo" (ngModelChange)="buscarPrestamo()" [matAutocomplete]="autoPr" />
          <mat-autocomplete #autoPr="matAutocomplete" (optionSelected)="elegirPrestamo($event.option.value)">
            @for (p of opcionesPrestamo(); track p.codigo) {
              <mat-option [value]="p">Operación {{ p.idAsoprep }} · {{ p.cedula }} · {{ p.nombre }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      }
      <div class="fila">
        <mat-form-field appearance="outline" class="medio">
          <mat-label>¿Qué pasó?</mat-label>
          <mat-select [(ngModel)]="tipo">
            @for (t of tiposHecho; track t.valor) {
              <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ ayudaTipo() }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="corto">
          <mat-label>Fecha real</mat-label>
          <input matInput type="date" [(ngModel)]="fechaHecho" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="corto">
          <mat-label>Valor del hecho</mat-label>
          <input matInput type="number" step="0.01" min="0" [(ngModel)]="valor" />
        </mat-form-field>
        @if (cuotas().length) {
          <mat-form-field appearance="outline" class="medio">
            <mat-label>Recalcular desde la cuota (opcional)</mat-label>
            <mat-select [(ngModel)]="idCuota">
              <mat-option [value]="null">—</mat-option>
              @for (c of cuotas(); track c.codigo) {
                <mat-option [value]="c.codigo">Cuota {{ c.numero }} · vence {{ fecha(c.vencimiento) }} · {{ c.estado }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </div>

      <!-- 2. Origen del dinero -->
      <div class="seccion"><span class="n">2</span> ¿De dónde salió el dinero?</div>
      @if (origenes().length) {
        <table class="tabla">
          <thead><tr><th>Origen</th><th>Hoy está como</th><th>En realidad es</th><th class="num">Valor</th><th></th></tr></thead>
          <tbody>
            @for (o of origenes(); track o.clave) {
              <tr>
                <td>
                  <div><strong>{{ o.fuenteNombre }}</strong>{{ o.fecha ? ' · ' + fecha(o.fecha) : '' }}</div>
                  <div class="sub">{{ o.descripcion }}</div>
                  @if (o.fuente === 'SIN_DINERO') {
                    <mat-form-field appearance="outline" class="ancho">
                      <mat-label>Explique qué queda debiendo el partícipe</mat-label>
                      <input matInput [(ngModel)]="o.texto" />
                    </mat-form-field>
                  }
                </td>
                <td class="sub">{{ o.aplicadoHoy }}</td>
                <td>
                  @if (o.fuente !== 'SIN_DINERO') {
                    <mat-form-field appearance="outline" class="concepto" [class.resaltar]="o.reclasifica">
                      <input matInput [(ngModel)]="o.conceptoReal" />
                    </mat-form-field>
                  }
                </td>
                <td class="num">
                  <mat-form-field appearance="outline" class="valor">
                    <input matInput type="number" step="0.01" min="0" [(ngModel)]="o.valor" />
                    @if (o.disponible !== null) {
                      <mat-hint>disponible {{ dinero(o.disponible) }}</mat-hint>
                    }
                  </mat-form-field>
                </td>
                <td><button mat-icon-button type="button" (click)="quitarOrigen(o)" matTooltip="Quitar"><mat-icon>delete</mat-icon></button></td>
              </tr>
            }
          </tbody>
        </table>
      }
      <div class="pie">
        <span>
          <button mat-stroked-button type="button" (click)="alternarBuscador()" [disabled]="!prestamo()">
            <mat-icon>search</mat-icon> {{ buscadorAbierto() ? 'Ocultar el buscador' : 'Agregar origen' }}
          </button>
          <button mat-button type="button" (click)="agregarSinDinero()" [disabled]="!prestamo()">Sin dinero (el partícipe lo debe)</button>
        </span>
        <span [class.falta]="Math.abs(diferencia()) > 0.004" [class.cuadra]="origenes().length && Math.abs(diferencia()) <= 0.004">
          Hecho {{ dinero(valor || 0) }} · orígenes {{ dinero(sumaOrigenes()) }} ·
          <strong>{{ Math.abs(diferencia()) <= 0.004 ? 'cuadra' : 'diferencia ' + dinero(diferencia()) }}</strong>
        </span>
      </div>

      @if (buscadorAbierto()) {
        <div class="buscador">
          <div class="pestanas">
            @for (p of pestanas; track p.valor) {
              <button type="button" [class.activa]="pestana() === p.valor" (click)="cambiarPestana(p.valor)">{{ p.etiqueta }}</button>
            }
          </div>
          <div class="fila filtros">
            @if (pestana() === 'SUGERIDOS') {
              <span class="sub">Del mismo partícipe, de su cónyuge o familiares y movimientos de valor parecido (± una cuota), de cualquier mes,
                ordenados por cercanía a la fecha y al valor del hecho.</span>
            }
            @if (pestana() === 'EXTRACTO' || pestana() === 'PENDIENTE' || pestana() === 'APORTE') {
              <mat-form-field appearance="outline" class="medio">
                <mat-label>{{ pestana() === 'EXTRACTO' ? 'Texto del extracto (depositante, referencia)' : pestana() === 'APORTE' ? 'Glosa, cédula o nombre' : 'Texto o novedad' }}</mat-label>
                <input matInput [(ngModel)]="filtroTexto" (keyup.enter)="buscarOrigenes()" />
              </mat-form-field>
            }
            @if (pestana() === 'APORTE') {
              <mat-form-field appearance="outline" class="medio">
                <mat-label>Otro partícipe (cédula o nombre)</mat-label>
                <input matInput [(ngModel)]="textoParticipe" (ngModelChange)="buscarParticipe()" [matAutocomplete]="autoPa" />
                <mat-autocomplete #autoPa="matAutocomplete" (optionSelected)="elegirParticipe($event.option.value)">
                  @for (p of opcionesParticipe(); track p.codigo) {
                    <mat-option [value]="p">{{ p.cedula }} · {{ p.nombre }}</mat-option>
                  }
                </mat-autocomplete>
              </mat-form-field>
            }
            @if (pestana() === 'EXTRACTO' || pestana() === 'APORTE') {
              <mat-form-field appearance="outline" class="corto">
                <mat-label>Desde</mat-label>
                <input matInput type="date" [(ngModel)]="filtroDesde" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="corto">
                <mat-label>Hasta</mat-label>
                <input matInput type="date" [(ngModel)]="filtroHasta" />
              </mat-form-field>
            }
            @if (pestana() !== 'SUGERIDOS') {
              <mat-form-field appearance="outline" class="corto">
                <mat-label>Valor (± una cuota)</mat-label>
                <input matInput type="number" step="0.01" [(ngModel)]="filtroValor" />
              </mat-form-field>
            }
            <button mat-flat-button color="primary" type="button" (click)="buscarOrigenes()" [disabled]="buscando()"><mat-icon>search</mat-icon> Buscar</button>
          </div>
          @if (buscando()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
          <div class="resultados">
            <table class="tabla">
              <thead><tr><th>Fecha</th><th>Movimiento</th><th>Hoy está como</th><th class="num">Valor</th><th class="num">Disponible</th><th></th></tr></thead>
              <tbody>
                @for (c of resultados(); track c.clave) {
                  <tr [class.usado]="c.disponible <= 0.004">
                    <td class="nowrap">{{ fecha(c.fecha) }}</td>
                    <td>
                      <div>
                        <span class="fuente">{{ c.fuenteNombre }}</span>
                        @if (c.relacion) { <span class="relacion">{{ c.relacion }}</span> }
                        {{ c.sentido }}
                      </div>
                      <div class="sub">{{ c.descripcion }}</div>
                      @if (c.entidad) { <div class="sub">{{ c.entidad }}</div> }
                    </td>
                    <td class="sub">{{ c.aplicadoHoy }}</td>
                    <td class="num">{{ dinero(c.valor) }}</td>
                    <td class="num">{{ dinero(c.disponible) }}</td>
                    <td>
                      <button mat-stroked-button color="primary" type="button" (click)="usarOrigen(c)" [disabled]="c.disponible <= 0.004 || elegido(c)">
                        {{ elegido(c) ? 'Elegido' : 'Usar' }}
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="sub">{{ buscando() ? 'Buscando…' : buscado() ? 'Sin resultados con estos filtros.' : 'Use los filtros y pulse Buscar.' }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- 3. Qué resuelve -->
      <div class="seccion"><span class="n">3</span> ¿Qué resuelve este hecho?</div>
      @if (!prestamo()) {
        <div class="sub">Elija primero la operación.</div>
      } @else {
        <div class="sub">
          Marque los movimientos por regularizar y los pedidos que este hecho explica, en cualquier novedad. Los que eligió como
          origen del dinero se resuelven solos. Si una novedad queda sin nada pendiente, se cierra.
        </div>
        <div class="lista">
          @for (l of lineasCandidatas(); track l.id) {
            <mat-checkbox [checked]="marcadaLinea(l.id)" [disabled]="esOrigen(l.id)" (change)="alternarLinea(l.id)">
              <strong>{{ l.novedad }}</strong> · movimiento {{ l.secuencia }} · {{ fecha(l.fecha) }} · {{ l.descripcion }} · falta {{ dinero(l.valor) }}
              @if (esOrigen(l.id)) { <span class="sub"> (es origen del dinero)</span> }
            </mat-checkbox>
          }
          @for (p of candidatos()?.pedidos || []; track p.codigo) {
            <mat-checkbox [checked]="pedidosMarcados().has(p.codigo)" (change)="alternarPedido(p.codigo)">
              <strong>{{ p.novedad }}</strong> · pedido {{ p.secuencia }} ({{ p.tipoNombre }}) · {{ p.descripcion }}
            </mat-checkbox>
          }
          @if (!lineasCandidatas().length && !(candidatos()?.pedidos || []).length) {
            <div class="sub">No hay otros movimientos ni pedidos abiertos de esta operación.</div>
          }
        </div>
      }

      <!-- 4. Respaldo -->
      <div class="seccion"><span class="n">4</span> Respaldo</div>
      <div class="fila">
        <mat-form-field appearance="outline" class="medio">
          <mat-label>Tipo de documento</mat-label>
          <mat-select [(ngModel)]="tipoDocumento">
            @for (t of tiposDocumento; track t.valor) {
              <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="medio">
          <mat-label>Número del documento</mat-label>
          <input matInput [(ngModel)]="numeroDocumento" />
        </mat-form-field>
      </div>
      <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="subiendo()"><mat-icon>attach_file</mat-icon> Adjuntar archivo</button>
      <input #archivo type="file" hidden [accept]="formatos" (change)="subir($event)" />
      <span class="sub"> PDF, Excel (.xls, .xlsx), Word o imagen.</span>
      @if (subiendo()) { <span class="sub"> Subiendo…</span> }
      @for (a of adjuntos(); track a.url) {
        <span class="adjunto">{{ a.nombreArchivo }} <button mat-icon-button type="button" (click)="quitarAdjunto(a)"><mat-icon>close</mat-icon></button></span>
      }
      <mat-form-field appearance="outline" class="ancho">
        <mat-label>Explicación</mat-label>
        <textarea matInput rows="3" [(ngModel)]="texto"></textarea>
      </mat-form-field>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="trabajando() || subiendo()">Registrar el hecho</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .contenido { min-width: min(1000px, 94vw); }
      .intro { margin-bottom: 8px; }
      .caja { border: 1px solid #d0d7e2; border-radius: 6px; padding: 8px 12px; margin: 6px 0 8px; background: #f7f9fc; font-size: 13.5px; }
      .seccion { font-weight: 600; margin: 16px 0 6px; color: #1f3a60; display: flex; align-items: center; gap: 8px; }
      .seccion .n { display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: #1f5fbf; color: #fff; text-align: center; line-height: 22px; font-size: 12px; }
      .sub { color: #5b6573; font-size: 12.5px; }
      .ancho { width: 100%; }
      .medio { width: 300px; }
      .corto { width: 160px; }
      .fila { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
      .elegido { border-left: 3px solid #1f5fbf; background: #eef4ff; padding: 6px 10px; margin-bottom: 8px; }
      .tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
      .tabla th { text-align: left; background: #f3f6fa; padding: 5px 6px; border-bottom: 1px solid #d0d7e2; }
      .tabla td { padding: 5px 6px; border-bottom: 1px solid #edf0f4; vertical-align: top; }
      .tabla .num { text-align: right; white-space: nowrap; }
      .tabla tr.usado td { color: #9aa3ad; }
      .nowrap { white-space: nowrap; }
      .concepto { width: 230px; }
      .concepto.resaltar ::ng-deep .mdc-notched-outline > * { border-color: #e0a800 !important; }
      .valor { width: 130px; }
      .pie { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; flex-wrap: wrap; gap: 8px; }
      .falta { color: #b3261e; }
      .cuadra { color: #1e6b34; }
      .buscador { border: 1px solid #d0d7e2; border-radius: 6px; padding: 8px 10px; background: #fbfcfe; }
      .pestanas { display: flex; gap: 4px; margin-bottom: 8px; }
      .pestanas button { border: 1px solid #d0d7e2; background: #fff; border-radius: 14px; padding: 3px 12px; cursor: pointer; font-size: 13px; }
      .pestanas button.activa { background: #1f5fbf; color: #fff; border-color: #1f5fbf; }
      .filtros { align-items: center; }
      .resultados { max-height: 340px; overflow: auto; }
      .fuente { background: #eef1f5; border-radius: 3px; padding: 0 5px; font-size: 11.5px; margin-right: 4px; }
      .relacion { background: #e3efff; color: #1f5fbf; border-radius: 3px; padding: 0 5px; font-size: 11.5px; margin-right: 4px; }
      .lista { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow: auto; margin-top: 4px; }
      .adjunto { display: inline-flex; align-items: center; margin-left: 8px; font-size: 13px; }
      .error { color: #b3261e; background: #fdecea; padding: 8px; border-radius: 4px; margin-top: 8px; white-space: pre-line; }
    `,
  ],
})
export class HechoCreditoV2DialogComponent {
  ref = inject(MatDialogRef<HechoCreditoV2DialogComponent, ResultadoAccionV2>);
  private servicio = inject(NovedadesV2Service);
  private fileService = inject(FileService);

  readonly Math = Math;
  readonly dinero = dinero;
  readonly fecha = fechaCorta;
  readonly tiposHecho = TIPOS_HECHO;
  readonly tiposDocumento = TIPOS_DOCUMENTO_V2;
  readonly formatos = '.pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.txt,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  readonly pestanas: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'SUGERIDOS', etiqueta: 'Sugeridos' },
    { valor: 'EXTRACTO', etiqueta: 'Extracto del banco' },
    { valor: 'APORTE', etiqueta: 'Cuenta individual' },
    { valor: 'PENDIENTE', etiqueta: 'Pendientes por regularizar' },
  ];

  prestamo = signal<PrestamoV2 | null>(null);
  textoPrestamo = '';
  opcionesPrestamo = signal<PrestamoV2[]>([]);
  candidatos = signal<CandidatosHechoV2 | null>(null);
  cuotas = signal<CuotaV2[]>([]);
  tipo: TipoHecho = 'ABONO_CAPITAL';
  fechaHecho = '';
  valor: number | null = null;
  idCuota: number | null = null;

  origenes = signal<OrigenElegido[]>([]);
  buscadorAbierto = signal(false);
  pestana = signal<Pestana>('SUGERIDOS');
  filtroTexto = '';
  filtroDesde = '';
  filtroHasta = '';
  filtroValor: number | null = null;
  textoParticipe = '';
  participe: ParticipeV2 | null = null;
  opcionesParticipe = signal<ParticipeV2[]>([]);
  resultados = signal<OrigenCandidatoV2[]>([]);
  buscando = signal(false);
  buscado = signal(false);

  lineasMarcadas = signal<Set<number>>(new Set<number>());
  pedidosMarcados = signal<Set<number>>(new Set<number>());

  tipoDocumento = 'COMPROBANTE';
  numeroDocumento = '';
  texto = '';
  adjuntos = signal<AdjuntoEntradaV2[]>([]);
  subiendo = signal(false);
  trabajando = signal(false);
  error = signal<string | null>(null);

  private temporizadores = new Map<string, any>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: HechoCreditoV2Data) {
    const l = data.linea;
    if (l) {
      this.lineasMarcadas.set(new Set([l.codigo]));
      this.fechaHecho = this.isoFecha(l.fechaBanco || l.fecha);
      const idAs = l.idAsoprep ?? l.idAsoprepSugerido ?? null;
      if (idAs) {
        this.servicio.buscarPrestamos(String(idAs)).subscribe({
          next: (ps) => {
            const p = ps.find((x) => x.idAsoprep === idAs) || null;
            if (p) this.elegirPrestamo(p);
          },
        });
      }
    }
    if (data.pedido) this.pedidosMarcados.set(new Set([data.pedido.codigo]));
  }

  // ---------------------------------------------------------------- utilidades

  private isoFecha(v: any): string {
    const t = fechaCorta(v);
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  private demorar(clave: string, f: () => void): void {
    clearTimeout(this.temporizadores.get(clave));
    this.temporizadores.set(clave, setTimeout(f, 300));
  }

  ayudaTipo(): string {
    return this.tiposHecho.find((t) => t.valor === this.tipo)?.ayuda ?? '';
  }

  // ---------------------------------------------------------------- operación

  buscarPrestamo(): void {
    const t = (this.textoPrestamo || '').trim();
    if (t.length < 3) return;
    this.demorar('prestamo', () => this.servicio.buscarPrestamos(t).subscribe({ next: (x) => this.opcionesPrestamo.set(x) }));
  }

  elegirPrestamo(p: PrestamoV2): void {
    this.prestamo.set(p);
    this.servicio.cuotas(p.codigo).subscribe({ next: (c) => this.cuotas.set(c) });
    this.servicio.candidatosHecho(this.data.idEmpresa, p.codigo).subscribe({
      next: (c) => this.candidatos.set(c),
      error: (e) => this.error.set(String(e)),
    });
  }

  cambiarPrestamo(): void {
    this.prestamo.set(null);
    this.candidatos.set(null);
    this.cuotas.set([]);
    this.idCuota = null;
    this.textoPrestamo = '';
  }

  // ---------------------------------------------------------------- orígenes

  sumaOrigenes = computed(() => r2(this.origenes().reduce((s, o) => s + (Number(o.valor) || 0), 0)));

  diferencia(): number {
    return r2((Number(this.valor) || 0) - this.origenes().reduce((s, o) => s + (Number(o.valor) || 0), 0));
  }

  conceptoDefecto(): string {
    const t = this.tiposHecho.find((x) => x.valor === this.tipo)?.etiqueta ?? '';
    return `${t} de la operación ${this.prestamo()?.idAsoprep ?? ''}`;
  }

  /** Al abrir el buscador en «Sugeridos», busca de una vez (con la fecha y el valor del hecho si ya están). */
  alternarBuscador(): void {
    const abrir = !this.buscadorAbierto();
    this.buscadorAbierto.set(abrir);
    if (abrir && this.pestana() === 'SUGERIDOS') this.buscarOrigenes();
  }

  cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
    this.resultados.set([]);
    this.buscado.set(false);
    if (p === 'SUGERIDOS') this.buscarOrigenes();
  }

  buscarParticipe(): void {
    this.participe = null;
    const t = (this.textoParticipe || '').trim();
    if (t.length < 3) return;
    this.demorar('participe', () => this.servicio.buscarParticipes(t).subscribe({ next: (x) => this.opcionesParticipe.set(x) }));
  }

  elegirParticipe(p: ParticipeV2): void {
    this.participe = p;
    this.textoParticipe = `${p.cedula} · ${p.nombre}`;
  }

  buscarOrigenes(): void {
    const p = this.prestamo();
    if (!p) return;
    const fuente = this.pestana();
    const f =
      fuente === 'SUGERIDOS'
        ? { fuente, idPrestamo: p.codigo, valor: this.valor, fecha: this.fechaHecho || null }
        : {
            fuente,
            idPrestamo: fuente === 'PENDIENTE' && !this.filtroTexto && !this.filtroValor ? p.codigo : null,
            idEntidad: fuente === 'APORTE' ? this.participe?.codigo ?? null : null,
            texto: this.filtroTexto || null,
            desde: this.filtroDesde || null,
            hasta: this.filtroHasta || null,
            valor: this.filtroValor,
            fecha: this.fechaHecho || null,
          };
    this.buscando.set(true);
    this.error.set(null);
    this.servicio.origenes(this.data.idEmpresa, f).subscribe({
      next: (r) => {
        this.buscando.set(false);
        this.buscado.set(true);
        this.resultados.set(r);
      },
      error: (e) => {
        this.buscando.set(false);
        this.error.set(String(e));
      },
    });
  }

  elegido(c: OrigenCandidatoV2): boolean {
    return this.origenes().some((o) => o.clave === c.clave);
  }

  usarOrigen(c: OrigenCandidatoV2): void {
    if (this.elegido(c)) return;
    const falta = this.diferencia();
    const valor = r2(falta > 0.004 ? Math.min(falta, c.disponible) : c.disponible);
    const p = this.prestamo();
    const ajeno = c.idEntidad !== null && p !== null && c.idEntidad !== p.idEntidad;
    this.origenes.set([
      ...this.origenes(),
      {
        fuente: c.fuente,
        fuenteNombre: c.fuenteNombre,
        id: c.id,
        clave: c.clave,
        fecha: c.fecha,
        descripcion: c.descripcion,
        aplicadoHoy: c.aplicadoHoy,
        disponible: c.disponible,
        valor,
        conceptoReal: this.conceptoDefecto(),
        texto: '',
        reclasifica: ajeno || c.fuente === 'APORTE' || /Conciliada|aporte/i.test(c.aplicadoHoy || ''),
      },
    ]);
    if (c.fuente === 'PENDIENTE') {
      const s = new Set(this.lineasMarcadas());
      s.add(c.id);
      this.lineasMarcadas.set(s);
    }
    if (!this.valor) this.valor = valor;
  }

  agregarSinDinero(): void {
    const falta = this.diferencia();
    this.origenes.set([
      ...this.origenes(),
      {
        fuente: 'SIN_DINERO',
        fuenteNombre: 'Sin dinero (el partícipe lo debe)',
        id: null,
        clave: 'SIN_DINERO:' + Date.now(),
        fecha: null,
        descripcion: '',
        aplicadoHoy: '',
        disponible: null,
        valor: falta > 0.004 ? falta : null,
        conceptoReal: '',
        texto: '',
        reclasifica: false,
      },
    ]);
  }

  quitarOrigen(o: OrigenElegido): void {
    this.origenes.set(this.origenes().filter((x) => x !== o));
  }

  // ---------------------------------------------------------------- qué resuelve

  lineasCandidatas = computed(() => {
    const c = this.candidatos();
    const lista = [...(c?.lineas || [])];
    const l = this.data.linea;
    if (l && !lista.some((x) => x.id === l.codigo)) {
      lista.unshift({
        fuente: 'PENDIENTE', fuenteNombre: '', id: l.codigo, clave: 'PENDIENTE:' + l.codigo, fecha: l.fechaBanco || l.fecha, valor: l.saldo,
        sentido: l.sentido === 'D' ? 'Salida' : 'Entrada', descripcion: l.descripcion || '', aplicadoHoy: '', idEntidad: null, entidad: null,
        relacion: null, usado: 0, disponible: l.saldo, novedad: 'esta novedad', secuencia: l.secuencia, idNovedad: this.data.idNovedad,
      });
    }
    for (const o of this.origenes()) {
      if (o.fuente === 'PENDIENTE' && o.id !== null && !lista.some((x) => x.id === o.id)) {
        lista.push({
          fuente: 'PENDIENTE', fuenteNombre: '', id: o.id, clave: o.clave, fecha: o.fecha, valor: o.disponible || 0, sentido: 'Entrada',
          descripcion: o.descripcion, aplicadoHoy: o.aplicadoHoy, idEntidad: null, entidad: null, relacion: null, usado: 0,
          disponible: o.disponible || 0, novedad: '', secuencia: undefined, idNovedad: 0,
        });
      }
    }
    return lista;
  });

  esOrigen(idLinea: number): boolean {
    return this.origenes().some((o) => o.fuente === 'PENDIENTE' && o.id === idLinea);
  }

  marcadaLinea(id: number): boolean {
    return this.esOrigen(id) || this.lineasMarcadas().has(id);
  }

  alternarLinea(id: number): void {
    const s = new Set(this.lineasMarcadas());
    s.has(id) ? s.delete(id) : s.add(id);
    this.lineasMarcadas.set(s);
  }

  alternarPedido(id: number): void {
    const s = new Set(this.pedidosMarcados());
    s.has(id) ? s.delete(id) : s.add(id);
    this.pedidosMarcados.set(s);
  }

  // ---------------------------------------------------------------- adjuntos

  async subir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.subiendo.set(true);
    this.error.set(null);
    let hash: string | null = null;
    try {
      const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
      hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      hash = null;
    }
    this.fileService.uploadFileCustomPath(archivo, this.data.rutaSubida).subscribe({
      next: (r) => {
        this.subiendo.set(false);
        if (!r?.filePath) {
          this.error.set(r?.message || 'El servidor no devolvió la ruta del archivo.');
          return;
        }
        this.adjuntos.set([
          ...this.adjuntos(),
          { tipoDocumento: this.tipoDocumento, nombreArchivo: archivo.name, url: r.filePath, mimeType: archivo.type || null, tamanio: archivo.size, hash },
        ]);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo subir el archivo.'));
      },
    });
  }

  quitarAdjunto(a: AdjuntoEntradaV2): void {
    this.adjuntos.set(this.adjuntos().filter((x) => x !== a));
  }

  // ---------------------------------------------------------------- guardar

  guardar(): void {
    this.error.set(null);
    const p = this.prestamo();
    const faltas: string[] = [];
    if (!p) faltas.push('elegir la operación');
    if (!this.fechaHecho) faltas.push('la fecha real del hecho');
    if (!((Number(this.valor) || 0) > 0)) faltas.push('el valor del hecho');
    if (!this.origenes().length) faltas.push('de dónde salió el dinero (al menos un origen)');
    if (this.origenes().some((o) => !((Number(o.valor) || 0) > 0))) faltas.push('el valor de cada origen');
    if (this.origenes().some((o) => o.disponible !== null && (Number(o.valor) || 0) > o.disponible + 0.004)) faltas.push('que ningún origen pase de lo disponible');
    if (this.origenes().some((o) => o.fuente === 'SIN_DINERO' && !o.texto.trim())) faltas.push('la explicación de lo que el partícipe queda debiendo');
    if (this.origenes().length && Math.abs(this.diferencia()) > 0.004) faltas.push(`que los orígenes sumen el valor del hecho (diferencia ${dinero(this.diferencia())})`);
    const lineas = [...this.lineasMarcadas()].filter((id) => !this.esOrigen(id));
    const pedidos = [...this.pedidosMarcados()];
    if (!lineas.length && !pedidos.length && !this.origenes().some((o) => o.fuente === 'PENDIENTE')) faltas.push('marcar qué resuelve el hecho');
    if (faltas.length) {
      this.error.set('Falta: ' + faltas.join('; ') + '.');
      return;
    }
    this.trabajando.set(true);
    this.servicio
      .registrarHecho({
        idEmpresa: this.data.idEmpresa,
        idPrestamo: p!.codigo,
        tipo: this.tipo,
        fecha: this.fechaHecho,
        valor: Number(this.valor),
        idCuota: this.idCuota,
        texto: this.texto.trim() || null,
        tipoDocumento: this.tipoDocumento,
        numeroDocumento: this.numeroDocumento.trim() || null,
        origenes: this.origenes().map((o) => ({
          tipo: o.fuente,
          idFilaExtracto: o.fuente === 'EXTRACTO' ? o.id : null,
          idAporte: o.fuente === 'APORTE' ? o.id : null,
          idLinea: o.fuente === 'PENDIENTE' ? o.id : null,
          valor: Number(o.valor),
          conceptoReal: o.fuente === 'SIN_DINERO' ? null : o.conceptoReal.trim() || null,
          texto: o.texto.trim() || null,
        })),
        lineas,
        pedidos,
        adjuntos: this.adjuntos(),
      })
      .subscribe({
        next: (r) => {
          this.trabajando.set(false);
          this.ref.close(r);
        },
        error: (e) => {
          this.trabajando.set(false);
          this.error.set(String(e));
        },
      });
  }
}
