import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { FileService } from '../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import {
  AccionV2,
  AdjuntoEntradaV2,
  CuentaContableV2,
  CuotaV2,
  DecisionV2,
  DetalleOrigenV2,
  LineaV2,
  ParticipeV2,
  PedidoV2,
  PrestamoV2,
  ResultadoAccionV2,
  TIPOS_DOCUMENTO_V2,
  dinero,
  fechaCorta,
} from '../../model/novedades-v2';
import { NovedadesV2Service } from '../../service/novedades-v2.service';
import { SeguimientoNovedadesService } from '../../service/seguimiento-novedades.service';

const r2 = (x: number): number => Math.round(x * 100) / 100;

const CUENTAS_POR_REGULARIZAR =['1.4.90.90.05', '1.4.90.90.06', '1.4.90.90.07', '1.4.90.90.08', '1.4.90.90.09', '2.3.90.90.05', '2.3.90.90.08', '2.3.90.90.09'];

/** Qué se justifica o responde. */
export interface JustificarV2Data {
  idEmpresa: number;
  idNovedad: number;
  codigoNovedad: string;
  /** Carpeta de subida de adjuntos (novedades/AAAA-MM/idNovedad). */
  rutaSubida: string;
  modo: 'lineas' | 'pedido';
  lineas?: LineaV2[];
  /** Otras líneas de la novedad (candidatas a cruce). */
  todasLasLineas?: LineaV2[];
  pedido?: PedidoV2;
  detalleOrigen?: DetalleOrigenV2[];
}

interface FilaReparto {
  cuenta: CuentaContableV2 | null;
  textoCuenta: string;
  opcionesCuenta: CuentaContableV2[];
  /** Una fila va al debe o al haber, nunca a los dos. */
  debe: number | null;
  haber: number | null;
  conPrestamo: boolean;
  prestamo: PrestamoV2 | null;
  textoPrestamo: string;
  opcionesPrestamo: PrestamoV2[];
  cuotas: CuotaV2[];
  idCuota: number | null;
  participe: ParticipeV2 | null;
  textoParticipe: string;
  opcionesParticipe: ParticipeV2[];
  glosa: string;
}

/**
 * C34 — Justificar movimientos (con reparto a cuentas) o responder un pedido. Escrito para el usuario de ASOPREP:
 * dice qué se espera, qué pasa con cada opción y cuánto falta repartir; la decisión se busca por su descripción.
 */
@Component({
  selector: 'app-justificar-novedad-v2-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>{{ titulo() }}</h2>
    <mat-dialog-content class="contenido">
      <!-- ===== Qué se está justificando / respondiendo ===== -->
      @if (data.modo === 'lineas') {
        <div class="caja">
          @if (lineas().length === 1) {
            <div class="mov">
              <strong>{{ lineas()[0].tipoMovimiento }} del {{ fecha(lineas()[0].fechaBanco || lineas()[0].fecha) }}</strong> ·
              @if (lineas()[0].cedula) { {{ lineas()[0].nombre }} (cédula {{ lineas()[0].cedula }}) · }
              {{ lineas()[0].descripcion }}
            </div>
            <div class="sub">
              Valor {{ dinero(lineas()[0].valor) }} · falta justificar <strong>{{ dinero(lineas()[0].saldo) }}</strong> · hoy está en
              {{ lineas()[0].cuentaAfectada }} {{ lineas()[0].nombreCuentaAfectada }}
            </div>
          } @else {
            <div class="mov"><strong>{{ lineas().length }} movimientos</strong> con el mismo respaldo · total por justificar <strong>{{ dinero(totalSaldo()) }}</strong></div>
            <ul class="lista-mov">
              @for (l of lineas(); track l.codigo) {
                <li>{{ fecha(l.fechaBanco || l.fecha) }} · {{ l.descripcion }} · {{ dinero(l.saldo) }}</li>
              }
            </ul>
          }
        </div>

        @if (lineas().length === 1) {
          <mat-form-field appearance="outline" class="monto">
            <mat-label>Monto a justificar</mat-label>
            <input matInput type="number" step="0.01" [(ngModel)]="monto" (ngModelChange)="ajustarRepartoUnico()" />
            <mat-hint>Puede justificar solo una parte (por ejemplo 8.000 de 12.000): el resto queda pendiente en la cuenta por regularizar.</mat-hint>
          </mat-form-field>
        }

        <div class="seccion">¿Cómo se justifica?</div>
        <mat-radio-group [(ngModel)]="tipo" class="radios">
          <mat-radio-button value="RESPALDO">Tengo el respaldo (documento)</mat-radio-button>
          <mat-radio-button value="DECISION">No hay documento: lo decide ASOPREP</mat-radio-button>
          @if (lineas().length === 1 && candidatasCruce().length) {
            <mat-radio-button value="CRUCE">Se compensa con otro movimiento de esta novedad</mat-radio-button>
          }
        </mat-radio-group>

        @if (tipo === 'CRUCE') {
          <mat-form-field appearance="outline" class="ancho">
            <mat-label>Movimiento con el que se compensa</mat-label>
            <mat-select [(ngModel)]="idLineaCruce">
              @for (c of candidatasCruce(); track c.codigo) {
                <mat-option [value]="c.codigo">{{ fecha(c.fechaBanco || c.fecha) }} · {{ c.descripcion }} · falta {{ dinero(c.saldo) }}</mat-option>
              }
            </mat-select>
            <mat-hint>Una salida y una entrada que se anulan entre sí (por ejemplo, una transferencia y su devolución): no hace falta repartir.</mat-hint>
          </mat-form-field>
        }
      } @else if (data.pedido; as p) {
        <div class="caja">
          <div class="mov"><strong>{{ p.tipoNombre }}</strong> · {{ p.areaNombre }}</div>
          <div class="pedido">{{ p.descripcion }}</div>
          @if (p.supuesto) {
            <div class="sub">Mientras no responda: {{ p.supuesto }}</div>
          }
        </div>
        @if (p.tipo === 'CONFIRMACION' || p.tipo === 'APROBACION') {
          <div class="seccion">Su respuesta</div>
          <mat-radio-group [(ngModel)]="opcion" class="radios">
            <mat-radio-button value="SI">Sí</mat-radio-button>
            <mat-radio-button value="NO">No</mat-radio-button>
          </mat-radio-group>
          <div class="efectos">
            <div [class.elegido]="opcion === 'SI'"><strong>Si responde SÍ:</strong> {{ p.efectoSi || 'el re-proceso aplica lo que se propone en el pedido.' }}</div>
            <div [class.elegido]="opcion === 'NO'"><strong>Si responde NO:</strong> {{ p.efectoNo || 'explique qué es lo correcto; el re-proceso lo aplica en lugar de lo propuesto.' }}</div>
          </div>
        } @else if (p.tipo === 'ELECCION') {
          <div class="seccion">Elija una opción</div>
          <mat-radio-group [(ngModel)]="opcion" class="radios">
            @for (o of opcionesEleccion(); track o) {
              <mat-radio-button [value]="o">{{ o }}</mat-radio-button>
            }
          </mat-radio-group>
        } @else if (p.tipo === 'DOCUMENTO') {
          <mat-radio-group [(ngModel)]="opcion" class="radios">
            <mat-radio-button [value]="null">Entrego el documento</mat-radio-button>
            <mat-radio-button value="NO_EXISTE">El documento no existe: lo decide ASOPREP</mat-radio-button>
          </mat-radio-group>
        }
        @if (prestamosDetalle().length) {
          <div class="seccion">Préstamos del detalle a los que se refiere su respuesta (opcional)</div>
          <div class="prestamos">
            @for (g of prestamosDetalle(); track g.clave) {
              <mat-checkbox [(ngModel)]="g.marcado">{{ g.etiqueta }}</mat-checkbox>
            }
          </div>
        }
      }

      <!-- ===== Decisión ===== -->
      @if (pideDecision() || mostrarDecision) {
        <div class="seccion">Decisión de ASOPREP {{ pideDecision() ? '' : '(opcional)' }}</div>
        @if (decision(); as d) {
          <div class="decision-elegida">
            <div><strong>{{ d.titulo }}</strong> <span class="numero">({{ d.numero }})</span></div>
            @if (d.resumen) {
              <div class="sub">{{ d.resumen }}</div>
            }
            <button mat-button type="button" (click)="decision.set(null)">Cambiar</button>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="ancho">
            <mat-label>Busque la decisión por lo que dice (p. ej. «gastos bancarios», «tablas de Delta»)</mat-label>
            <input matInput [(ngModel)]="textoDecision" (ngModelChange)="buscarDecisiones()" />
          </mat-form-field>
          <div class="decisiones">
            @for (d of decisiones(); track d.codigo) {
              <button type="button" class="decision" (click)="decision.set(d)">
                <div>
                  @if (d.sugerida) {
                    <span class="sugerida">Sugerida</span>
                  }
                  <strong>{{ d.titulo }}</strong> <span class="numero">({{ d.numero }})</span>
                </div>
                @if (d.resumen) {
                  <div class="sub">{{ d.resumen }}</div>
                }
              </button>
            } @empty {
              <div class="sub">Sin resultados.</div>
            }
          </div>
          <button mat-button type="button" (click)="nuevaDecision = !nuevaDecision">
            <mat-icon>add</mat-icon> Registrar una decisión nueva de ASOPREP
          </button>
          @if (nuevaDecision) {
            <div class="caja">
              <mat-form-field appearance="outline" class="ancho">
                <mat-label>Tema (en pocas palabras)</mat-label>
                <input matInput [(ngModel)]="decTema" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="ancho">
                <mat-label>Qué se decide</mat-label>
                <textarea matInput rows="3" [(ngModel)]="decTexto"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="ancho-medio">
                <mat-label>Cargo de quien decide</mat-label>
                <input matInput [(ngModel)]="decCargo" />
              </mat-form-field>
              <div class="sub">La decisión necesita su constancia (acta o correo) adjunta:</div>
              <button mat-stroked-button type="button" (click)="archivoDecision.click()" [disabled]="subiendo()"><mat-icon>attach_file</mat-icon> Adjuntar constancia</button>
              <input #archivoDecision type="file" hidden [accept]="formatosRespaldo" (change)="subir($event, 'decision')" />
              @for (a of constancias(); track a.url) {
                <span class="adjunto">{{ a.nombreArchivo }}</span>
              }
              <div><button mat-flat-button color="primary" type="button" (click)="registrarDecision()" [disabled]="trabajando()">Registrar decisión</button></div>
            </div>
          }
        }
      } @else {
        <button mat-button type="button" (click)="mostrarDecision = true"><mat-icon>gavel</mat-icon> Agregar una decisión de ASOPREP</button>
      }

      <!-- ===== Reparto a cuentas ===== -->
      @if (pideReparto()) {
        <div class="seccion">{{ data.modo === 'lineas' ? 'Detalle del asiento: cómo debe quedar' : '¿A qué cuenta(s) contable(s) va el valor?' }}</div>
        @if (data.modo === 'pedido') {
          <mat-checkbox [(ngModel)]="conRepartoPedido">La respuesta mueve un valor (indicar cuentas)</mat-checkbox>
        }
        @if (data.modo === 'lineas' || conRepartoPedido) {
          <div class="sub">
            @if (data.modo === 'lineas') {
              Escriba el asiento de lo que justifica. La primera línea la pone el sistema: saca de la cuenta por regularizar el
              monto que justifica. Agregue las demás cuentas, cada una al debe o al haber; el asiento tiene que cuadrar
              (total del debe = total del haber). Es lo que el re-proceso registrará en lugar de la cuenta por regularizar.
            } @else {
              Indique la cuenta o cuentas donde debe quedar el valor y cuánto en cada una.
            }
            Solo se aceptan cuentas de movimiento del plan de cuentas: si la que necesita no existe, primero debe crearla
            Contabilidad en <a href="/menucontabilidad/plan-cuentas" target="_blank" rel="noopener">Parametrización › Plan de cuentas</a>.
          </div>
          <div class="cab-asiento">
            <span class="c-cuenta">Cuenta</span><span class="c-valor">Debe</span><span class="c-valor">Haber</span><span class="c-quitar"></span>
          </div>
          @if (data.modo === 'lineas' && lineas().length) {
            <div class="fila-fija">
              <span class="c-cuenta">
                {{ lineas()[0].cuentaAfectada }} {{ lineas()[0].nombreCuentaAfectada }}
                <span class="sub">· sale de la cuenta por regularizar (lo pone el sistema)</span>
              </span>
              <span class="c-valor num">{{ sentidoLinea() === 'H' ? dinero(totalAJustificar()) : '' }}</span>
              <span class="c-valor num">{{ sentidoLinea() === 'D' ? dinero(totalAJustificar()) : '' }}</span>
              <span class="c-quitar"></span>
            </div>
          }
          @for (r of reparto(); track $index; let i = $index) {
            <div class="fila-reparto">
              <mat-form-field appearance="outline" class="cuenta">
                <mat-label>Cuenta del plan de cuentas (escriba código o nombre)</mat-label>
                <input matInput [(ngModel)]="r.textoCuenta" (ngModelChange)="buscarCuenta(r)" [matAutocomplete]="autoCuenta" />
                <button mat-icon-button matSuffix type="button" (click)="elegirDelPlan(r)" matTooltip="Elegir del plan de cuentas"><mat-icon>account_tree</mat-icon></button>
                <mat-autocomplete #autoCuenta="matAutocomplete" (optionSelected)="r.cuenta = $event.option.value; r.textoCuenta = textoCuenta($event.option.value)">
                  @for (c of r.opcionesCuenta; track c.codigo) {
                    <mat-option [value]="c">{{ c.cuenta }} · {{ c.nombre }}</mat-option>
                  }
                </mat-autocomplete>
                @if (!r.cuenta && r.textoCuenta) {
                  <mat-hint class="falta">Elija una cuenta de la lista o del plan de cuentas.</mat-hint>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="valor">
                <mat-label>Debe</mat-label>
                <input matInput type="number" step="0.01" min="0" [(ngModel)]="r.debe" (ngModelChange)="soloUnLado(r, 'D')" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="valor">
                <mat-label>Haber</mat-label>
                <input matInput type="number" step="0.01" min="0" [(ngModel)]="r.haber" (ngModelChange)="soloUnLado(r, 'H')" />
              </mat-form-field>
              <button mat-icon-button type="button" (click)="quitarReparto(i)" [disabled]="reparto().length === 1" matTooltip="Quitar esta cuenta"><mat-icon>delete</mat-icon></button>
              <mat-checkbox [(ngModel)]="r.conPrestamo" class="chk">Es de un préstamo o partícipe</mat-checkbox>
              @if (r.conPrestamo) {
                <div class="extra">
                  <mat-form-field appearance="outline" class="cuenta">
                    <mat-label>Préstamo (idAsoprep, cédula o nombre)</mat-label>
                    <input matInput [(ngModel)]="r.textoPrestamo" (ngModelChange)="buscarPrestamo(r)" [matAutocomplete]="autoPrestamo" />
                    <mat-autocomplete #autoPrestamo="matAutocomplete" (optionSelected)="elegirPrestamo(r, $event.option.value)">
                      @for (p of r.opcionesPrestamo; track p.codigo) {
                        <mat-option [value]="p">Préstamo {{ p.idAsoprep }} · {{ p.cedula }} · {{ p.nombre }}</mat-option>
                      }
                    </mat-autocomplete>
                  </mat-form-field>
                  @if (r.cuotas.length) {
                    <mat-form-field appearance="outline" class="valor">
                      <mat-label>Cuota (opcional)</mat-label>
                      <mat-select [(ngModel)]="r.idCuota">
                        <mat-option [value]="null">—</mat-option>
                        @for (c of r.cuotas; track c.codigo) {
                          <mat-option [value]="c.codigo">Cuota {{ c.numero }} · vence {{ fecha(c.vencimiento) }} · {{ c.estado }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  }
                  @if (!r.prestamo) {
                    <mat-form-field appearance="outline" class="cuenta">
                      <mat-label>o partícipe (cédula o nombre)</mat-label>
                      <input matInput [(ngModel)]="r.textoParticipe" (ngModelChange)="buscarParticipe(r)" [matAutocomplete]="autoPart" />
                      <mat-autocomplete #autoPart="matAutocomplete" (optionSelected)="r.participe = $event.option.value; r.textoParticipe = textoParticipe($event.option.value)">
                        @for (p of r.opcionesParticipe; track p.codigo) {
                          <mat-option [value]="p">{{ p.cedula }} · {{ p.nombre }}{{ p.codigoParticipe ? ' · código ' + p.codigoParticipe : '' }}</mat-option>
                        }
                      </mat-autocomplete>
                    </mat-form-field>
                  }
                </div>
              }
            </div>
          }
          <div class="pie-reparto">
            <button mat-stroked-button type="button" (click)="agregarReparto()"><mat-icon>add</mat-icon> Otra cuenta</button>
            @if (data.modo === 'lineas') {
              <span [class.falta]="Math.abs(diferencia()) > 0.004" [class.cuadra]="Math.abs(diferencia()) <= 0.004">
                Debe {{ dinero(totalDebe()) }} · Haber {{ dinero(totalHaber()) }} ·
                <strong>{{ Math.abs(diferencia()) <= 0.004 ? 'El asiento cuadra' : 'Diferencia ' + dinero(Math.abs(diferencia())) }}</strong>
              </span>
            } @else {
              <span [class.falta]="Math.abs(faltaRepartir()) > 0.004">
                Total {{ dinero(totalAJustificar()) }} · repartido {{ dinero(repartido()) }} · <strong>falta repartir {{ dinero(faltaRepartir()) }}</strong>
              </span>
            }
          </div>
          @if (data.modo === 'pedido') {
            <mat-form-field appearance="outline" class="ancho-medio">
              <mat-label>Monto que mueve la respuesta</mat-label>
              <input matInput type="number" step="0.01" [(ngModel)]="monto" />
            </mat-form-field>
          }
        }
      }

      <!-- ===== Respaldo ===== -->
      @if (tipo !== 'CRUCE') {
        <div class="seccion">Respaldo</div>
        <div class="fila">
          <mat-form-field appearance="outline" class="ancho-medio">
            <mat-label>Tipo de documento</mat-label>
            <mat-select [(ngModel)]="tipoDocumento">
              @for (t of tiposDocumento; track t.valor) {
                <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="ancho-medio">
            <mat-label>Número del documento</mat-label>
            <input matInput [(ngModel)]="numeroDocumento" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="ancho-medio">
            <mat-label>Fecha del hecho</mat-label>
            <input matInput type="date" [(ngModel)]="fechaHecho" />
          </mat-form-field>
        </div>
        <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="subiendo()"><mat-icon>attach_file</mat-icon> Adjuntar archivo</button>
        <input #archivo type="file" hidden [accept]="formatosRespaldo" (change)="subir($event, 'respaldo')" />
        <span class="sub"> PDF, Excel (.xls, .xlsx), Word o imagen.</span>
        @if (subiendo()) {
          <span class="sub"> Subiendo…</span>
        }
        @for (a of adjuntos(); track a.url) {
          <span class="adjunto">{{ a.nombreArchivo }} <button mat-icon-button type="button" (click)="quitarAdjunto(a)"><mat-icon>close</mat-icon></button></span>
        }
      }
      <mat-form-field appearance="outline" class="ancho">
        <mat-label>{{ data.modo === 'pedido' && opcion === 'NO' ? 'Qué es lo correcto (obligatorio)' : 'Explicación' }}</mat-label>
        <textarea matInput rows="3" [(ngModel)]="texto"></textarea>
      </mat-form-field>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="trabajando() || subiendo()">
        {{ data.modo === 'lineas' ? 'Justificar' : 'Responder' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .contenido { min-width: min(820px, 92vw); }
      .caja { border: 1px solid #d0d7e2; border-radius: 6px; padding: 10px 12px; margin: 6px 0 12px; background: #f7f9fc; }
      .mov { font-size: 14px; }
      .pedido { margin-top: 4px; }
      .sub { color: #5b6573; font-size: 12.5px; margin-top: 3px; }
      .seccion { font-weight: 600; margin: 14px 0 6px; color: #1f3a60; }
      .radios { display: flex; flex-direction: column; gap: 4px; }
      .efectos { margin: 8px 0; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
      .efectos > div { padding: 6px 8px; border-radius: 4px; background: #f3f4f6; }
      .efectos > div.elegido { background: #e3efff; border-left: 3px solid #1f5fbf; }
      .ancho { width: 100%; }
      .ancho-medio { width: 260px; margin-right: 10px; }
      .monto { width: 100%; max-width: 700px; margin-bottom: 8px; }
      .fila { display: flex; flex-wrap: wrap; }
      .fila-reparto { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; border-bottom: 1px dashed #d0d7e2; padding: 6px 0; }
      .fila-reparto .cuenta { flex: 1 1 340px; }
      .fila-reparto .valor { width: 140px; }
      .cab-asiento, .fila-fija { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .cab-asiento { font-weight: 600; color: #3d4652; border-bottom: 1px solid #d0d7e2; padding: 6px 0 4px; margin-top: 6px; }
      .fila-fija { background: #f7f9fc; padding: 10px 0; border-bottom: 1px dashed #d0d7e2; }
      .c-cuenta { flex: 1 1 340px; }
      .c-valor { width: 140px; }
      .c-valor.num { text-align: right; padding-right: 12px; font-weight: 600; }
      .c-quitar { width: 40px; }
      .cuadra { color: #1e6b34; }
      .fila-reparto .extra { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
      .pie-reparto { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; }
      .falta { color: #b3261e; }
      .decisiones { max-height: 220px; overflow: auto; display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px; }
      .decision { text-align: left; border: 1px solid #d0d7e2; border-radius: 4px; background: #fff; padding: 6px 8px; cursor: pointer; }
      .decision:hover { background: #eef4ff; }
      .decision-elegida { border-left: 3px solid #1f5fbf; padding: 6px 10px; background: #eef4ff; }
      .numero { color: #7b8794; font-size: 12px; }
      .sugerida { background: #1f5fbf; color: #fff; font-size: 11px; border-radius: 3px; padding: 1px 5px; margin-right: 6px; }
      .adjunto { display: inline-flex; align-items: center; margin-left: 8px; font-size: 13px; }
      .lista-mov { margin: 6px 0 0; padding-left: 18px; max-height: 140px; overflow: auto; font-size: 12.5px; }
      .prestamos { display: flex; flex-direction: column; max-height: 160px; overflow: auto; }
      .error { color: #b3261e; background: #fdecea; padding: 8px; border-radius: 4px; margin-top: 8px; white-space: pre-line; }
    `,
  ],
})
export class JustificarNovedadV2DialogComponent {
  ref = inject(MatDialogRef<JustificarNovedadV2DialogComponent, ResultadoAccionV2>);
  private servicio = inject(NovedadesV2Service);
  private servicioV1 = inject(SeguimientoNovedadesService);
  private fileService = inject(FileService);
  private dialog = inject(MatDialog);

  readonly Math = Math;
  readonly dinero = dinero;
  readonly fecha = fechaCorta;
  readonly tiposDocumento = TIPOS_DOCUMENTO_V2;
  /** Lo que acepta el servidor (FileService.EXTENSIONES_PERMITIDAS), con PDF y Excel primero. */
  readonly formatosRespaldo = '.pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.txt,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  lineas = signal<LineaV2[]>([]);
  monto: number | null = null;
  tipo: 'RESPALDO' | 'DECISION' | 'CRUCE' = 'RESPALDO';
  idLineaCruce: number | null = null;
  opcion: string | null = null;
  conRepartoPedido = false;
  tipoDocumento = 'COMPROBANTE';
  numeroDocumento = '';
  fechaHecho = '';
  texto = '';
  mostrarDecision = false;
  textoDecision = '';
  decisiones = signal<DecisionV2[]>([]);
  decision = signal<DecisionV2 | null>(null);
  nuevaDecision = false;
  decTema = '';
  decTexto = '';
  decCargo = '';
  constancias = signal<AdjuntoEntradaV2[]>([]);
  adjuntos = signal<AdjuntoEntradaV2[]>([]);
  reparto = signal<FilaReparto[]>([]);
  subiendo = signal(false);
  trabajando = signal(false);
  error = signal<string | null>(null);
  prestamosDetalle = signal<{ clave: string; etiqueta: string; ids: number[]; marcado: boolean }[]>([]);

  private temporizadores = new Map<any, any>();

  titulo = computed(() =>
    this.data.modo === 'lineas'
      ? this.lineas().length === 1
        ? 'Justificar movimiento'
        : `Justificar ${this.lineas().length} movimientos`
      : 'Responder pedido',
  );
  totalSaldo = computed(() => this.lineas().reduce((s, l) => s + (l.saldo || 0), 0));

  candidatasCruce = computed(() => {
    const l = this.lineas()[0];
    if (!l) return [];
    return (this.data.todasLasLineas || []).filter(
      (c) => c.codigo !== l.codigo && c.sentido !== l.sentido && c.saldo > 0.004,
    );
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: JustificarV2Data) {
    this.lineas.set((data.lineas || []).filter((l) => l.saldo > 0.004));
    this.monto = data.modo === 'lineas' ? Math.round(this.totalSaldo() * 100) / 100 : null;
    const sentido = this.lineas()[0]?.sentido || 'D';
    this.reparto.set([this.filaReparto(this.monto, sentido)]);
    if (data.modo === 'pedido' && data.pedido) {
      if (['DECISION', 'APROBACION'].includes(data.pedido.tipo)) this.mostrarDecision = true;
      const grupos = new Map<string, { clave: string; etiqueta: string; ids: number[]; marcado: boolean }>();
      for (const d of data.detalleOrigen || []) {
        const clave = d.idAsoprep ? 'P' + d.idAsoprep : 'F' + d.codigo;
        const etiqueta = d.idAsoprep
          ? `Préstamo ${d.idAsoprep} · ${d.cedula ?? ''} · ${d.nombre ?? ''}`
          : `${d.grupo}: ${d.descripcion ?? d.codigo}`;
        const g = grupos.get(clave) || { clave, etiqueta, ids: [], marcado: false };
        g.ids.push(d.codigo);
        grupos.set(clave, g);
      }
      this.prestamosDetalle.set([...grupos.values()]);
    }
    this.buscarDecisiones(true);
  }

  // ---------------------------------------------------------------- reglas de la pantalla

  pideDecision(): boolean {
    if (this.data.modo === 'lineas') return this.tipo === 'DECISION';
    const t = this.data.pedido?.tipo;
    return t === 'DECISION' || t === 'APROBACION' || this.opcion === 'NO_EXISTE';
  }

  pideReparto(): boolean {
    return this.data.modo === 'lineas' ? this.tipo !== 'CRUCE' : true;
  }

  totalAJustificar(): number {
    if (this.data.modo === 'pedido') return this.monto ?? this.repartido();
    return this.lineas().length === 1 ? this.monto ?? 0 : this.totalSaldo();
  }

  repartido(): number {
    return r2(this.reparto().reduce((s, r) => s + (Number(r.debe) || 0) + (Number(r.haber) || 0), 0));
  }

  faltaRepartir(): number {
    return r2(this.totalAJustificar() - this.repartido());
  }

  /** Sentido del movimiento en la cuenta por regularizar (D salida, H entrada). */
  sentidoLinea(): 'D' | 'H' {
    return (this.lineas()[0]?.sentido as 'D' | 'H') || 'D';
  }

  /** Total del debe del asiento, con la línea de la cuenta por regularizar (justificación de movimientos). */
  totalDebe(): number {
    const filas = this.reparto().reduce((s, r) => s + (Number(r.debe) || 0), 0);
    return r2(filas + (this.data.modo === 'lineas' && this.sentidoLinea() === 'H' ? this.totalAJustificar() : 0));
  }

  totalHaber(): number {
    const filas = this.reparto().reduce((s, r) => s + (Number(r.haber) || 0), 0);
    return r2(filas + (this.data.modo === 'lineas' && this.sentidoLinea() === 'D' ? this.totalAJustificar() : 0));
  }

  diferencia(): number {
    return r2(this.totalDebe() - this.totalHaber());
  }

  /** Al escribir en un lado se borra el otro: una fila va al debe o al haber. */
  soloUnLado(r: FilaReparto, lado: 'D' | 'H'): void {
    if (lado === 'D' && (Number(r.debe) || 0) > 0) r.haber = null;
    if (lado === 'H' && (Number(r.haber) || 0) > 0) r.debe = null;
  }

  opcionesEleccion(): string[] {
    return (this.data.pedido?.opciones || '').split('|').map((o) => o.trim()).filter((o) => !!o);
  }

  // ---------------------------------------------------------------- reparto

  private filaReparto(valor: number | null, sentido: 'D' | 'H'): FilaReparto {
    return {
      cuenta: null, textoCuenta: '', opcionesCuenta: [], debe: sentido === 'D' ? valor : null, haber: sentido === 'H' ? valor : null,
      conPrestamo: false, prestamo: null, textoPrestamo: '',
      opcionesPrestamo: [], cuotas: [], idCuota: null, participe: null, textoParticipe: '', opcionesParticipe: [], glosa: '',
    };
  }

  /** Con una sola fila, su valor sigue al monto a justificar (el asiento queda cuadrado). */
  ajustarRepartoUnico(): void {
    const r = this.reparto();
    if (r.length !== 1) return;
    if ((Number(r[0].haber) || 0) > 0) r[0].haber = this.monto;
    else r[0].debe = this.monto;
  }

  /** La fila nueva propone lo que falta para cuadrar, en el lado que lo cuadra. */
  agregarReparto(): void {
    if (this.data.modo === 'lineas') {
      const dif = this.diferencia();
      const fila = Math.abs(dif) <= 0.004 ? this.filaReparto(null, this.sentidoLinea()) : this.filaReparto(Math.abs(dif), dif > 0 ? 'H' : 'D');
      this.reparto.set([...this.reparto(), fila]);
      return;
    }
    const primera = this.reparto()[0];
    const sentido: 'D' | 'H' = primera && (Number(primera.haber) || 0) > 0 ? 'H' : 'D';
    const falta = this.faltaRepartir();
    this.reparto.set([...this.reparto(), this.filaReparto(falta > 0 ? falta : null, sentido)]);
  }

  quitarReparto(i: number): void {
    this.reparto.set(this.reparto().filter((_, k) => k !== i));
  }

  /** Elegir la cuenta en el selector del plan de cuentas (solo cuentas de movimiento; nunca una por regularizar). */
  elegirDelPlan(r: FilaReparto): void {
    this.dialog
      .open(PlanCuentaSelectorDialogComponent, {
        width: '900px',
        maxHeight: '85vh',
        data: { titulo: 'Cuenta a la que va el valor', mostrarSoloMovimiento: true },
      })
      .afterClosed()
      .subscribe((pc: any) => {
        if (!pc) return;
        if (CUENTAS_POR_REGULARIZAR.includes(pc.cuentaContable)) {
          this.error.set('La cuenta ' + pc.cuentaContable + ' es una cuenta por regularizar: elija la cuenta donde debe quedar el valor.');
          return;
        }
        r.cuenta = { codigo: pc.codigo, cuenta: pc.cuentaContable, nombre: pc.nombre };
        r.textoCuenta = this.textoCuenta(r.cuenta);
        this.error.set(null);
      });
  }

  textoCuenta(c: CuentaContableV2): string {
    return c ? `${c.cuenta} · ${c.nombre}` : '';
  }

  textoParticipe(p: ParticipeV2): string {
    return p ? `${p.cedula} · ${p.nombre}` : '';
  }

  private demorar(clave: any, f: () => void): void {
    clearTimeout(this.temporizadores.get(clave));
    this.temporizadores.set(clave, setTimeout(f, 300));
  }

  buscarCuenta(r: FilaReparto): void {
    r.cuenta = null;
    const t = (r.textoCuenta || '').trim();
    if (t.length < 2) return;
    this.demorar(r, () => this.servicio.buscarCuentas(this.data.idEmpresa, t).subscribe({ next: (x) => (r.opcionesCuenta = x) }));
  }

  buscarPrestamo(r: FilaReparto): void {
    r.prestamo = null;
    r.cuotas = [];
    r.idCuota = null;
    const t = (r.textoPrestamo || '').trim();
    if (t.length < 3) return;
    this.demorar(r.textoPrestamo + 'p', () => this.servicio.buscarPrestamos(t).subscribe({ next: (x) => (r.opcionesPrestamo = x) }));
  }

  elegirPrestamo(r: FilaReparto, p: PrestamoV2): void {
    r.prestamo = p;
    r.textoPrestamo = `Préstamo ${p.idAsoprep} · ${p.cedula} · ${p.nombre}`;
    this.servicio.cuotas(p.codigo).subscribe({ next: (c) => (r.cuotas = c) });
  }

  buscarParticipe(r: FilaReparto): void {
    r.participe = null;
    const t = (r.textoParticipe || '').trim();
    if (t.length < 3) return;
    this.demorar(r.textoParticipe + 'e', () => this.servicio.buscarParticipes(t).subscribe({ next: (x) => (r.opcionesParticipe = x) }));
  }

  // ---------------------------------------------------------------- decisiones

  buscarDecisiones(inmediato = false): void {
    const ir = () =>
      this.servicio.buscarDecisiones(this.data.idEmpresa, this.data.idNovedad, this.textoDecision).subscribe({
        next: (d) => this.decisiones.set(d.slice(0, 25)),
        error: (e) => this.error.set(String(e)),
      });
    if (inmediato) ir();
    else this.demorar('decisiones', ir);
  }

  registrarDecision(): void {
    if (!this.decTema.trim() || !this.decTexto.trim() || !this.constancias().length) {
      this.error.set('Para registrar la decisión hacen falta el tema, qué se decide y la constancia adjunta.');
      return;
    }
    this.trabajando.set(true);
    this.servicioV1
      .registrarDecision(this.data.idEmpresa, {
        tema: this.decTema.trim(),
        texto: this.decTexto.trim(),
        cargo: this.decCargo.trim() || null,
        idNovedad: this.data.idNovedad,
        adjuntos: this.constancias().map((a) => ({ ...a, tipoDocumento: a.tipoDocumento || 'ACTA' })),
      } as any)
      .subscribe({
        next: (r) => {
          this.trabajando.set(false);
          const d = r.decision as any;
          this.decision.set({ codigo: d.codigo, numero: d.numero, titulo: d.titulo || d.tema, resumen: d.resumen || d.detalle });
          this.nuevaDecision = false;
          this.error.set(null);
        },
        error: (e) => {
          this.trabajando.set(false);
          this.error.set(String(e));
        },
      });
  }

  // ---------------------------------------------------------------- adjuntos

  async subir(evento: Event, destino: 'respaldo' | 'decision'): Promise<void> {
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
        const a: AdjuntoEntradaV2 = {
          tipoDocumento: destino === 'decision' ? 'ACTA' : this.tipoDocumento,
          nombreArchivo: archivo.name,
          url: r.filePath,
          mimeType: archivo.type || null,
          tamanio: archivo.size,
          hash,
        };
        if (destino === 'decision') this.constancias.set([...this.constancias(), a]);
        else this.adjuntos.set([...this.adjuntos(), a]);
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
    const faltas: string[] = [];
    const conReparto = this.pideReparto() && (this.data.modo === 'lineas' || this.conRepartoPedido);
    if (conReparto) {
      if (this.reparto().some((r) => !r.cuenta)) faltas.push('elegir la cuenta de cada fila del asiento (de la lista)');
      if (this.reparto().some((r) => ((Number(r.debe) || 0) > 0) === ((Number(r.haber) || 0) > 0))) {
        faltas.push('poner el valor de cada fila en el debe o en el haber (uno de los dos)');
      }
      if (this.data.modo === 'lineas') {
        if (!((this.totalAJustificar() || 0) > 0)) faltas.push('indicar el monto a justificar');
        if (Math.abs(this.diferencia()) > 0.004) faltas.push(`cuadrar el asiento (debe ${dinero(this.totalDebe())}, haber ${dinero(this.totalHaber())})`);
      } else if (Math.abs(this.faltaRepartir()) > 0.004) {
        faltas.push(`repartir todo el valor (falta ${dinero(this.faltaRepartir())})`);
      }
    }
    if (this.pideDecision() && !this.decision()) faltas.push('elegir la decisión de ASOPREP');
    if (this.data.modo === 'lineas' && this.tipo === 'CRUCE' && !this.idLineaCruce) faltas.push('elegir el movimiento con el que se compensa');
    if (this.data.modo === 'pedido') {
      const t = this.data.pedido?.tipo;
      if ((t === 'CONFIRMACION' || t === 'APROBACION' || t === 'ELECCION') && !this.opcion) faltas.push('elegir su respuesta');
      if (this.opcion === 'NO' && !this.texto.trim()) faltas.push('explicar qué es lo correcto');
    }
    if (faltas.length) {
      this.error.set('Falta: ' + faltas.join('; ') + '.');
      return;
    }
    const a: AccionV2 = {
      fechaHecho: this.fechaHecho || null,
      tipoDocumento: this.tipo === 'CRUCE' ? null : this.tipoDocumento,
      numeroDocumento: this.numeroDocumento.trim() || null,
      texto: this.texto.trim() || null,
      idDecision: this.decision()?.codigo ?? null,
      adjuntos: this.adjuntos(),
      reparto: conReparto
        ? this.reparto().map((r) => ({
            idCuenta: r.cuenta!.codigo,
            valor: (Number(r.debe) || 0) > 0 ? Number(r.debe) : Number(r.haber),
            sentido: (Number(r.debe) || 0) > 0 ? ('D' as const) : ('H' as const),
            idPrestamo: r.conPrestamo ? r.prestamo?.codigo ?? null : null,
            idCuota: r.conPrestamo ? r.idCuota : null,
            idEntidad: r.conPrestamo && !r.prestamo ? r.participe?.codigo ?? null : null,
            glosa: r.glosa || null,
          }))
        : [],
    };
    this.trabajando.set(true);
    let llamada;
    if (this.data.modo === 'lineas') {
      a.tipo = this.tipo;
      a.idLineaCruce = this.tipo === 'CRUCE' ? this.idLineaCruce : null;
      a.lineas = this.lineas().map((l) => ({ idLinea: l.codigo, monto: this.lineas().length === 1 ? this.monto : l.saldo }));
      llamada = this.servicio.justificar(a);
    } else {
      a.opcion = this.opcion;
      a.monto = conReparto ? this.totalAJustificar() : null;
      a.filasDetalle = this.prestamosDetalle().filter((g) => g.marcado).flatMap((g) => g.ids);
      llamada = this.servicio.responder(this.data.pedido!.codigo, a);
    }
    llamada.subscribe({
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
