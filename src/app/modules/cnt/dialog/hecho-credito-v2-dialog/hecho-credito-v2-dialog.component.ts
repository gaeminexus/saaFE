import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FileService } from '../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { PermisosService } from '../../../../shared/services/permisos.service';
import { Permisos } from '../../../../shared/model/permisos';
import {
  AdjuntoEntradaV2,
  CalculoHechoV2,
  CandidatosHechoV2,
  ComponentesHechoV2,
  CuotaV2,
  DecisionV2,
  LineaV2,
  NotaV2,
  OrigenCandidatoV2,
  ParticipeV2,
  PedidoV2,
  PrestamoV2,
  ResultadoAccionV2,
  TIPOS_DOCUMENTO_V2,
  TIPOS_CALCULADOS,
  TIPOS_HECHO,
  TipoHecho,
  TratamientoDiferencia,
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
  /** Respuesta escrita de ASOPREP que se convierte en este hecho. */
  nota?: NotaV2;
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
          {{ l.descripcion }} ·
          @if (l.saldo > 0.004) {
            falta {{ dinero(l.saldo) }}
          } @else {
            hoy resuelto por la regla D-125: si registra este hecho, el hecho la reemplaza ({{ dinero(l.valor) }})
          }
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
          <mat-select [(ngModel)]="tipo" (selectionChange)="recalcular()">
            @for (t of tiposHecho; track t.valor) {
              <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ ayudaTipo() }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="corto">
          <mat-label>{{ calculado() ? 'Fecha de la precancelación' : 'Fecha real' }}</mat-label>
          <input matInput type="date" [(ngModel)]="fechaHecho" (ngModelChange)="recalcular()" />
        </mat-form-field>
        @if (calculado()) {
          <mat-form-field appearance="outline" class="corto">
            <mat-label>{{ tipo === 'SERIE_PRECANCELACION' ? 'Cruce desde el mes' : 'Cuotas pendientes desde (opcional)' }}</mat-label>
            <input matInput type="month" [(ngModel)]="mesDesde" (ngModelChange)="recalcular()" />
          </mat-form-field>
          <div class="valor-calculado">
            Valor que calcula el SAA: <strong>{{ calculando() ? 'calculando…' : valor ? dinero(valor) : '—' }}</strong>
          </div>
        } @else if (tipo === 'PAGO_CUOTAS' && cuotasPago.length) {
          <div class="valor-calculado">
            Valor que calcula el SAA: <strong>{{ calculando() ? 'calculando…' : valor ? dinero(valor) : '—' }}</strong>
          </div>
        } @else {
          <mat-form-field appearance="outline" class="corto">
            <mat-label>Valor del hecho</mat-label>
            <input matInput type="number" step="0.01" min="0" [(ngModel)]="valor" />
          </mat-form-field>
        }
        @if (tipo === 'PAGO_CUOTAS' && cuotas().length) {
          <mat-form-field appearance="outline" class="medio">
            <mat-label>Cuotas que paga</mat-label>
            <mat-select multiple [(ngModel)]="cuotasPago" (selectionChange)="recalcularComponentes()">
              @for (c of cuotas(); track c.codigo) {
                <mat-option [value]="c.codigo">Cuota {{ c.numero }} · vence {{ fecha(c.vencimiento) }} · {{ c.estado }}</mat-option>
              }
            </mat-select>
            <mat-hint>El SAA calcula su valor y su mora a la fecha del hecho.</mat-hint>
          </mat-form-field>
        }
        @if (cuotas().length && tipo !== 'PAGO_CUOTAS') {
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

      @if (calculado() && calculo(); as c) {
        <div class="calculo">
          <div class="sub">Reparto por mes según la tabla del préstamo ({{ c.numeroCuotas }} cuota(s) por {{ dinero(c.totalCuotas) }} y saldo de capital {{ dinero(c.saldoCapital) }}):</div>
          <table class="tabla compacta">
            <thead><tr><th>Mes</th><th>Qué se registra</th><th class="num">Valor</th></tr></thead>
            <tbody>
              @for (x of c.filas; track $index) {
                <tr><td class="nowrap">{{ x.mes }}</td><td>{{ x.concepto }}</td><td class="num">{{ dinero(x.valor) }}</td></tr>
              }
              <tr class="total"><td></td><td>Total</td><td class="num">{{ dinero(c.valor) }}</td></tr>
            </tbody>
          </table>
          <div class="sub">{{ c.fuente }}.{{ c.simulador ? ' Simulador de precancelación (estado de hoy): ' + dinero(c.simulador) + '.' : '' }}</div>
        </div>
      }

      @if (tipo === 'PAGO_CUOTAS' && componentes(); as cp) {
        <div class="calculo">
          <div class="sub">Lo que se debía de cada cuota al {{ fecha(cp.fecha) }} (tabla del préstamo y mora a esa fecha):</div>
          <table class="tabla compacta">
            <thead><tr><th>Cuota</th><th>Vence</th><th class="num">Seguro</th><th class="num">Desgrav.</th><th class="num">Mora</th><th class="num">Interés</th><th class="num">Capital</th><th class="num">Total</th></tr></thead>
            <tbody>
              @for (x of cp.filas; track $index) {
                <tr><td>{{ x.numeroCuota }}</td><td class="nowrap">{{ fecha(x.vencimiento) }}</td><td class="num">{{ dinero(x.SEGURO) }}</td><td class="num">{{ dinero(x.DESGRAVAMEN) }}</td>
                  <td class="num">{{ dinero(x.MORA) }}</td><td class="num">{{ dinero(x.INTERES) }}</td><td class="num">{{ dinero(x.CAPITAL) }}</td><td class="num">{{ dinero(x.total) }}</td></tr>
              }
              <tr class="total"><td></td><td>Total</td><td class="num">{{ dinero(cp.totales['SEGURO']) }}</td><td class="num">{{ dinero(cp.totales['DESGRAVAMEN']) }}</td><td class="num">{{ dinero(cp.totales['MORA']) }}</td>
                <td class="num">{{ dinero(cp.totales['INTERES']) }}</td><td class="num">{{ dinero(cp.totales['CAPITAL']) }}</td><td class="num">{{ dinero(cp.total) }}</td></tr>
            </tbody>
          </table>
        </div>
      }

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
          <strong>{{ Math.abs(diferencia()) <= 0.004 ? 'cuadra' : diferencia() > 0 ? 'faltan ' + dinero(diferencia()) : 'sobran ' + dinero(-diferencia()) }}</strong>
        </span>
      </div>
      @if (origenes().length && Math.abs(diferencia()) > 0.004) {
        <div class="tratamiento">
          @if (diferencia() < 0) {
            <strong>Sobran {{ dinero(-diferencia()) }}. ¿Qué pasa con lo que sobra?</strong>
            <mat-radio-group [(ngModel)]="tratamiento" class="radios">
              <mat-radio-button value="NO_SE_DEBITA">No se debita: queda en la cuenta individual</mat-radio-button>
              <mat-radio-button value="SE_DEVUELVE">Se devuelve al partícipe</mat-radio-button>
            </mat-radio-group>
          } @else {
            <strong>Faltan {{ dinero(diferencia()) }}.</strong> Agregue el origen que falta o indique:
            <mat-radio-group [(ngModel)]="tratamiento" class="radios">
              <mat-radio-button value="CRUCE_APORTES">Se cruza con los aportes del partícipe</mat-radio-button>
              @if (puedeCondonar()) {
                <mat-radio-button value="CONDONACION">Se condona</mat-radio-button>
              }
              <mat-radio-button value="PARTICIPE_DEBE">El partícipe lo debe</mat-radio-button>
            </mat-radio-group>
            @if (tratamiento === 'CRUCE_APORTES') {
              <mat-form-field appearance="outline" class="medio tipo-aporte">
                <mat-label>¿Con qué aporte se cruza?</mat-label>
                <mat-select [(ngModel)]="tipoAporteDiferencia">
                  @for (a of candidatos()?.saldosAportes || []; track a.idTipoAporte) {
                    <mat-option [value]="a.idTipoAporte">{{ a.nombre }} · saldo hoy {{ dinero(a.saldo) }}</mat-option>
                  }
                </mat-select>
                <mat-hint>El próximo re-proceso debita los {{ dinero(diferencia()) }} de esa cuenta en la fecha del hecho.</mat-hint>
              </mat-form-field>
              @if (saldoAporteElegido() !== null && saldoAporteElegido()! < diferencia() - 0.004) {
                <div class="aviso-saldo">El saldo de hoy de ese aporte ({{ dinero(saldoAporteElegido()) }}) es menor que lo que falta: revise con Crédito.</div>
              }
              @if (!(candidatos()?.saldosAportes || []).length) {
                <div class="aviso-saldo">El partícipe no tiene saldo en su cuenta individual hoy.</div>
              }
            }
            @if (tratamiento === 'CONDONACION') {
              <div class="condonacion">
                <div class="sub">¿Qué se condona? Desgravamen y seguro no se condonan: el dinero los paga primero.</div>
                <div class="fila">
                  @for (k of conceptosCondonables; track k.valor) {
                    <mat-checkbox [checked]="conceptosCond().has(k.valor)" (change)="alternarConcepto(k.valor)">{{ k.etiqueta }}</mat-checkbox>
                  }
                </div>
                @if (!componentes()) {
                  <div class="aviso-saldo">Para condonar, indique qué cuotas paga (pago de cuotas) o use una precancelación o un cruce mensual con precancelación: el SAA calcula los conceptos de esas cuotas.</div>
                } @else if (repartoLocal(); as rl) {
                  @if (rl.faltaNoCondonable > 0.004) {
                    <div class="aviso-saldo">El dinero no alcanza para lo que no se condona: faltan {{ dinero(rl.faltaNoCondonable) }}. Marque más conceptos o use otra opción.</div>
                  } @else {
                    <table class="tabla compacta reparto-cond">
                      <thead><tr><th>Concepto</th><th class="num">Se debía</th><th class="num">Se paga</th><th class="num">Se condona</th></tr></thead>
                      <tbody>
                        @for (r of rl.porConcepto; track r.concepto) {
                          <tr><td>{{ r.etiqueta }}</td><td class="num">{{ dinero(r.adeudado) }}</td><td class="num">{{ dinero(r.pagado) }}</td><td class="num">{{ dinero(r.condonado) }}</td></tr>
                        }
                        <tr class="total"><td>Total</td><td class="num">{{ dinero(rl.adeudado) }}</td><td class="num">{{ dinero(rl.pagado) }}</td><td class="num">{{ dinero(rl.condonado) }}</td></tr>
                      </tbody>
                    </table>
                    <div class="sub">El gasto va a la cuenta de la parametrización de la condonación del SAA; si Contabilidad la cambia, el hecho la sigue.</div>
                  }
                }
                @if (decisionCond(); as d) {
                  <div class="decision-elegida">Autoriza: <strong>{{ d.titulo }}</strong> <span class="sub">({{ d.numero }})</span>
                    <button mat-button type="button" (click)="decisionCond.set(null)">Cambiar</button></div>
                } @else {
                  <mat-form-field appearance="outline" class="ancho">
                    <mat-label>Decisión de ASOPREP que autoriza la condonación (búsquela por lo que dice)</mat-label>
                    <input matInput [(ngModel)]="textoDecision" (ngModelChange)="buscarDecisiones()" />
                  </mat-form-field>
                  <div class="decisiones">
                    @for (d of decisiones(); track d.codigo) {
                      <button type="button" class="decision" (click)="decisionCond.set(d)"><strong>{{ d.titulo }}</strong> <span class="sub">({{ d.numero }})</span></button>
                    }
                  </div>
                  <div class="sub">Si la decisión todavía no existe, regístrela desde «Justificar» con su constancia.</div>
                }
                <div class="sub">Adjunte el acta o la autorización en el paso 4: es obligatorio.</div>
              </div>
            }
          }
        </div>
      }

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
          @for (p of pedidosCandidatos(); track p.codigo) {
            <div class="pedido-fila">
              <mat-form-field appearance="outline" class="modo">
                <mat-select [ngModel]="modoPedido(p.codigo)" (ngModelChange)="cambiarModoPedido(p.codigo, $event)">
                  <mat-option value="">No lo atiende</mat-option>
                  <mat-option value="COMPLETO">Lo atiende completo</mat-option>
                  <mat-option value="PARCIAL">Solo para esta operación</mat-option>
                </mat-select>
              </mat-form-field>
              <span><strong>{{ p.novedad }}</strong> · pedido {{ p.secuencia }} ({{ p.tipoNombre }}) · {{ p.descripcion }}</span>
            </div>
          }
          @if (!lineasCandidatas().length && !pedidosCandidatos().length) {
            <div class="sub">No hay otros movimientos ni pedidos abiertos de esta operación.</div>
          }
        </div>
        <div class="fila otra">
          <mat-form-field appearance="outline" class="corto">
            <mat-label>Otra novedad (código)</mat-label>
            <input matInput [(ngModel)]="codigoOtra" placeholder="2507-01" (keyup.enter)="agregarOtraNovedad()" />
          </mat-form-field>
          <button mat-button type="button" (click)="agregarOtraNovedad()"><mat-icon>add</mat-icon> Traer sus movimientos y pedidos</button>
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
      .valor-calculado { align-self: center; font-size: 13.5px; padding: 0 6px; }
      .calculo { border: 1px solid #d0d7e2; border-radius: 6px; padding: 6px 10px; background: #fbfcfe; margin: 4px 0 8px; }
      .calculo .tabla { max-width: 720px; }
      .tabla.compacta td, .tabla.compacta th { padding: 2px 6px; }
      .tabla tr.total td { font-weight: 600; border-top: 1px solid #d0d7e2; }
      .tratamiento { background: #fff7e0; border-left: 3px solid #e0a800; padding: 6px 10px; margin: 4px 0 8px; font-size: 13px; }
      .radios { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
      .pedido-fila { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .pedido-fila .modo { width: 210px; flex: 0 0 210px; }
      .tipo-aporte { margin-top: 6px; width: 420px; }
      .aviso-saldo { color: #7a5400; margin-top: 4px; }
      .condonacion { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
      .reparto-cond { max-width: 520px; }
      .decision-elegida { border-left: 3px solid #1f5fbf; background: #eef4ff; padding: 4px 10px; }
      .decisiones { max-height: 160px; overflow: auto; display: flex; flex-direction: column; gap: 3px; }
      .decision { text-align: left; border: 1px solid #d0d7e2; border-radius: 4px; background: #fff; padding: 4px 8px; cursor: pointer; font-size: 12.5px; }
      .decision:hover { background: #eef4ff; }
      .otra { align-items: center; margin-top: 4px; }
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
  /** Pedidos que el hecho atiende solo para esta operación (el pedido sigue pendiente para las demás). */
  pedidosParciales = signal<Set<number>>(new Set<number>());

  /** D-123: valor calculado por el SAA (precancelación y cruce mensual con precancelación). */
  mesDesde = '';
  calculo = signal<CalculoHechoV2 | null>(null);
  calculando = signal(false);
  tratamiento: TratamientoDiferencia | null = null;
  /** Tipo de aporte con que se cruza la diferencia que falta (CRUCE_APORTES). */
  tipoAporteDiferencia: number | null = null;

  /** C34d §10: cuotas que paga un hecho de pago de cuotas (el SAA calcula su valor y su mora a la fecha). */
  cuotasPago: number[] = [];
  componentes = signal<ComponentesHechoV2 | null>(null);
  /** Permiso 1488 (condonación de valores) para ver «Se condona». */
  puedeCondonar = signal(false);
  readonly conceptosCondonables = [
    { valor: 'MORA', etiqueta: 'Mora' },
    { valor: 'INTERES', etiqueta: 'Interés' },
    { valor: 'CAPITAL', etiqueta: 'Capital' },
  ];
  conceptosCond = signal<Set<string>>(new Set<string>(['MORA', 'INTERES']));
  decisionCond = signal<DecisionV2 | null>(null);
  textoDecision = '';
  decisiones = signal<DecisionV2[]>([]);
  private permisos = inject(PermisosService);

  saldoAporteElegido(): number | null {
    const a = (this.candidatos()?.saldosAportes || []).find((x) => x.idTipoAporte === this.tipoAporteDiferencia);
    return a ? a.saldo : null;
  }

  /** Movimientos y pedidos agregados de otras novedades por su código. */
  codigoOtra = '';
  extrasLineas = signal<(OrigenCandidatoV2 & { idNovedad: number })[]>([]);
  extrasPedidos = signal<{ codigo: number; idNovedad: number; novedad: string; secuencia: number; tipoNombre: string; descripcion: string }[]>([]);

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
    if (data.nota) this.texto = data.nota.texto;
    this.permisos.verificar(Permisos.CRD_CONDONACION_DE_VALORES).subscribe((r) => this.puedeCondonar.set(!!r.permitido));
  }

  calculado(): boolean {
    return TIPOS_CALCULADOS.includes(this.tipo);
  }

  /** Pide al SAA el valor y su reparto por mes (tabla del préstamo). */
  recalcular(): void {
    const p = this.prestamo();
    if (!this.calculado()) {
      this.calculo.set(null);
      if (this.tipo === 'PAGO_CUOTAS') this.recalcularComponentes();
      else this.componentes.set(null);
      return;
    }
    if (!p || !this.fechaHecho || (this.tipo === 'SERIE_PRECANCELACION' && !this.mesDesde)) {
      this.calculo.set(null);
      this.valor = null;
      return;
    }
    this.calculando.set(true);
    this.error.set(null);
    this.servicio.calcularHecho(p.codigo, this.tipo, this.mesDesde ? this.mesDesde + '-01' : null, this.fechaHecho).subscribe({
      next: (c) => {
        this.calculando.set(false);
        this.calculo.set(c);
        this.valor = c.valor;
        this.servicio.componentesHecho(p.codigo, this.tipo, null, this.mesDesde ? this.mesDesde + '-01' : null, this.fechaHecho).subscribe({
          next: (cp) => this.componentes.set(cp),
          error: () => this.componentes.set(null),
        });
      },
      error: (e) => {
        this.calculando.set(false);
        this.calculo.set(null);
        this.valor = null;
        this.error.set(String(e));
      },
    });
  }

  /** Pago de cuotas: el SAA calcula el valor y los conceptos de las cuotas elegidas a la fecha del hecho. */
  recalcularComponentes(): void {
    const p = this.prestamo();
    if (this.tipo !== 'PAGO_CUOTAS' || !p || !this.fechaHecho || !this.cuotasPago.length) {
      this.componentes.set(null);
      return;
    }
    this.calculando.set(true);
    this.servicio.componentesHecho(p.codigo, 'PAGO_CUOTAS', this.cuotasPago, null, this.fechaHecho).subscribe({
      next: (cp) => {
        this.calculando.set(false);
        this.componentes.set(cp);
        this.valor = cp.total;
      },
      error: (e) => {
        this.calculando.set(false);
        this.componentes.set(null);
        this.error.set(String(e));
      },
    });
  }

  alternarConcepto(k: string): void {
    const s = new Set(this.conceptosCond());
    s.has(k) ? s.delete(k) : s.add(k);
    this.conceptosCond.set(s);
  }

  buscarDecisiones(): void {
    const t = (this.textoDecision || '').trim();
    this.demorar('decisiones', () =>
      this.servicio.buscarDecisiones(this.data.idEmpresa, this.data.idNovedad, t).subscribe({ next: (d) => this.decisiones.set(d.slice(0, 15)) }),
    );
  }

  /**
   * Vista previa de la condonación (el servidor la recalcula al guardar): el dinero paga primero, cuota por cuota en el orden
   * del SAA, lo que no se condona; lo que queda de los conceptos marcados es lo condonado.
   */
  repartoLocal(): { faltaNoCondonable: number; porConcepto: { concepto: string; etiqueta: string; adeudado: number; pagado: number; condonado: number }[]; adeudado: number; pagado: number; condonado: number } | null {
    const cp = this.componentes();
    if (!cp) return null;
    const orden = ['SEGURO', 'DESGRAVAMEN', 'MORA', 'INTERES', 'CAPITAL'];
    const etiquetas: Record<string, string> = { SEGURO: 'Seguro', DESGRAVAMEN: 'Desgravamen', MORA: 'Mora', INTERES: 'Interés', CAPITAL: 'Capital' };
    const marcados = this.conceptosCond();
    const pagado: Record<string, number>[] = cp.filas.map(() => ({}));
    let resto = r2(this.sumaOrigenes());
    let faltaNoCondonable = 0;
    for (const pasada of [0, 1]) {
      cp.filas.forEach((f: any, i) => {
        for (const k of orden) {
          if ((pasada === 0) === marcados.has(k)) continue;
          const pago = r2(Math.min(resto, (f[k] || 0) - (pagado[i][k] || 0)));
          pagado[i][k] = r2((pagado[i][k] || 0) + pago);
          resto = r2(resto - pago);
        }
      });
      if (pasada === 0) {
        cp.filas.forEach((f: any, i) => {
          for (const k of orden) if (!marcados.has(k)) faltaNoCondonable += (f[k] || 0) - (pagado[i][k] || 0);
        });
      }
    }
    const porConcepto = orden.map((k) => {
      const adeudado = r2(cp.filas.reduce((s: number, f: any) => s + (f[k] || 0), 0));
      const pag = r2(pagado.reduce((s, p) => s + (p[k] || 0), 0));
      return { concepto: k, etiqueta: etiquetas[k], adeudado, pagado: pag, condonado: marcados.has(k) ? r2(adeudado - pag) : 0 };
    });
    return {
      faltaNoCondonable: r2(faltaNoCondonable),
      porConcepto,
      adeudado: r2(porConcepto.reduce((s, x) => s + x.adeudado, 0)),
      pagado: r2(porConcepto.reduce((s, x) => s + x.pagado, 0)),
      condonado: r2(porConcepto.reduce((s, x) => s + x.condonado, 0)),
    };
  }

  modoPedido(id: number): string {
    return this.pedidosParciales().has(id) ? 'PARCIAL' : this.pedidosMarcados().has(id) ? 'COMPLETO' : '';
  }

  cambiarModoPedido(id: number, modo: string): void {
    const c = new Set(this.pedidosMarcados());
    const pa = new Set(this.pedidosParciales());
    c.delete(id);
    pa.delete(id);
    if (modo === 'COMPLETO') c.add(id);
    if (modo === 'PARCIAL') pa.add(id);
    this.pedidosMarcados.set(c);
    this.pedidosParciales.set(pa);
  }

  pedidosCandidatos = computed(() => {
    const lista = [...(this.candidatos()?.pedidos || [])];
    for (const p of this.extrasPedidos()) if (!lista.some((x) => x.codigo === p.codigo)) lista.push(p);
    const dp = this.data.pedido;
    if (dp && !lista.some((x) => x.codigo === dp.codigo)) {
      lista.unshift({ codigo: dp.codigo, idNovedad: this.data.idNovedad, novedad: 'esta novedad', secuencia: dp.secuencia, tipoNombre: dp.tipoNombre, descripcion: dp.descripcion });
    }
    return lista;
  });

  /** Trae los movimientos y pedidos abiertos de otra novedad, por su código (p. ej. 2507-01). */
  agregarOtraNovedad(): void {
    const cod = (this.codigoOtra || '').trim();
    if (!cod) return;
    this.servicio.bandeja(this.data.idEmpresa, { texto: cod }).subscribe({
      next: (filas) => {
        const f = filas.find((x) => x.codigoNovedad === cod) || filas[0];
        if (!f) {
          this.error.set('No se encontró la novedad ' + cod + '.');
          return;
        }
        this.servicio.detalle(f.codigo).subscribe({
          next: (d) => {
            const ls = d.lineas.filter((l) => l.saldo > 0.004).map((l) => ({
              fuente: 'PENDIENTE' as const, fuenteNombre: '', id: l.codigo, clave: 'PENDIENTE:' + l.codigo, fecha: l.fechaBanco || l.fecha, valor: l.saldo,
              sentido: (l.sentido === 'D' ? 'Salida' : 'Entrada') as 'Entrada' | 'Salida', descripcion: l.descripcion || '', aplicadoHoy: '', idEntidad: null,
              entidad: null, relacion: null, usado: 0, disponible: l.saldo, novedad: f.codigoNovedad, secuencia: l.secuencia, idNovedad: f.codigo,
            }));
            this.extrasLineas.set([...this.extrasLineas().filter((x) => x.idNovedad !== f.codigo), ...ls]);
            const ps = d.pedidos.filter((p) => !p.atendido).map((p) => ({
              codigo: p.codigo, idNovedad: f.codigo, novedad: f.codigoNovedad, secuencia: p.secuencia, tipoNombre: p.tipoNombre, descripcion: p.descripcion,
            }));
            this.extrasPedidos.set([...this.extrasPedidos().filter((x) => x.idNovedad !== f.codigo), ...ps]);
            this.codigoOtra = '';
          },
          error: (e) => this.error.set(String(e)),
        });
      },
      error: (e) => this.error.set(String(e)),
    });
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
    this.recalcular();
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
    for (const x of this.extrasLineas()) if (!lista.some((y) => y.id === x.id)) lista.push(x);
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
    const dif = this.diferencia();
    if (this.calculado() && !this.calculo()) faltas.push('que el sistema calcule el valor (operación, fecha' + (this.tipo === 'SERIE_PRECANCELACION' ? ' y mes desde' : '') + ')');
    if (this.origenes().length && dif < -0.004 && this.tratamiento !== 'NO_SE_DEBITA' && this.tratamiento !== 'SE_DEVUELVE') faltas.push(`qué pasa con los ${dinero(-dif)} que sobran`);
    if (this.origenes().length && dif > 0.004 && this.tratamiento === 'CONDONACION') {
      const rl = this.repartoLocal();
      if (!this.conceptosCond().size) faltas.push('qué se condona (mora, interés o capital)');
      if (!rl) faltas.push('las cuotas del hecho, para que el SAA calcule lo que se condona');
      else if (rl.faltaNoCondonable > 0.004) faltas.push(`dinero para lo que no se condona (faltan ${dinero(rl.faltaNoCondonable)})`);
      if (!this.decisionCond()) faltas.push('la decisión de ASOPREP que autoriza la condonación');
      if (!this.adjuntos().length) faltas.push('el acta o la autorización de la condonación (adjunto)');
    }
    if (this.origenes().length && dif > 0.004 && this.tratamiento !== 'PARTICIPE_DEBE' && this.tratamiento !== 'CRUCE_APORTES' && this.tratamiento !== 'CONDONACION') faltas.push(`completar los orígenes o indicar qué pasa con los ${dinero(dif)} que faltan`);
    if (this.origenes().length && dif > 0.004 && this.tratamiento === 'CRUCE_APORTES' && !this.tipoAporteDiferencia) faltas.push('con qué aporte del partícipe se cruza lo que falta');
    const lineas = [...this.lineasMarcadas()].filter((id) => !this.esOrigen(id));
    const pedidos = [...this.pedidosMarcados()];
    const parciales = [...this.pedidosParciales()];
    if (!lineas.length && !pedidos.length && !parciales.length && !this.origenes().some((o) => o.fuente === 'PENDIENTE')) faltas.push('marcar qué resuelve el hecho');
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
        pedidosParciales: parciales,
        desde: this.mesDesde ? this.mesDesde + '-01' : null,
        tratamientoDiferencia: Math.abs(dif) > 0.004 ? this.tratamiento : null,
        tipoAporteDiferencia: Math.abs(dif) > 0.004 && this.tratamiento === 'CRUCE_APORTES' ? this.tipoAporteDiferencia : null,
        cuotas: this.tipo === 'PAGO_CUOTAS' ? this.cuotasPago : [],
        conceptosCondonados: Math.abs(dif) > 0.004 && this.tratamiento === 'CONDONACION' ? [...this.conceptosCond()] : [],
        idDecision: Math.abs(dif) > 0.004 && this.tratamiento === 'CONDONACION' ? this.decisionCond()?.codigo ?? null : null,
        idNota: this.data.nota?.codigo ?? null,
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
