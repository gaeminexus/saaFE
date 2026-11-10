import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PosicionFirma, PosicionesContrato, PruebasSecurityDataService, ResultadoEjecucion } from '../../../service/pruebas-security-data.service';
import { CampoPaso, IdEncadenado, PASOS, PasoPrueba } from './pruebas-security-data.config';

const IDS_ENCADENADOS: IdEncadenado[] = ['signatoryId', 'processId', 'pdfId', 'referenceCode'];

/**
 * Consola de pruebas de Security Data (parametrización de créditos): cada paso de la API es una tarjeta con
 * su formulario, «Ejecutar» y, debajo, la petición enviada y la respuesta (ya enmascaradas por el backend).
 * El navegador nunca habla con Security Data: todo pasa por `sdpr/{paso}`. Los ids que devuelve un paso
 * (signatoryId, processId, pdfId, referenceCode) se copian solos a los pasos siguientes y siguen editables.
 * Nada de lo que se digita se guarda: ni localStorage ni estado persistente; el código dactilar se limpia
 * después de cada ejecución.
 */
@Component({
  selector: 'app-pruebas-security-data',
  standalone: true,
  imports: [MaterialFormModule, FormsModule],
  templateUrl: './pruebas-security-data.component.html',
  styleUrl: './pruebas-security-data.component.scss',
})
export class PruebasSecurityDataComponent {
  private servicio = inject(PruebasSecurityDataService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly pasos = PASOS;

  /** Valores de los formularios, por `paso.clave`. */
  valores = signal<Record<string, unknown>>(this.valoresIniciales());
  archivos = signal<Record<number, File[]>>({});
  resultados = signal<Record<number, ResultadoEjecucion>>({});
  ejecutando = signal<number | null>(null);
  llenando = signal(false);
  calculando = signal(false);
  /** Posiciones calculadas para el contrato (paso 5); si hay, reemplazan a la posición única. */
  posiciones = signal<PosicionesContrato | null>(null);
  /** Paneles desplegados, por `paso.pet` / `paso.res`. */
  abiertos = signal<Record<string, boolean>>({});

  // ══════════════════════ Formularios ══════════════════════

  private valoresIniciales(): Record<string, unknown> {
    const v: Record<string, unknown> = {};
    for (const p of PASOS) for (const c of p.campos) v[this.clave(p, c)] = c.valor ?? (c.tipo === 'check' ? false : '');
    return v;
  }

  clave(p: PasoPrueba, c: CampoPaso): string {
    return `${p.numero}.${c.clave}`;
  }

  valor(p: PasoPrueba, c: CampoPaso): any {
    return this.valores()[this.clave(p, c)];
  }

  poner(p: PasoPrueba, c: CampoPaso, v: unknown): void {
    const valor = c.mayusculas && typeof v === 'string' ? v.toUpperCase() : v;
    this.valores.update((x) => ({ ...x, [this.clave(p, c)]: valor }));
  }

  elegirArchivos(p: PasoPrueba, evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const lista = Array.from(input.files ?? []);
    this.archivos.update((a) => ({ ...a, [p.numero]: lista }));
  }

  nombresArchivos(p: PasoPrueba): string {
    return (this.archivos()[p.numero] ?? []).map((a) => `${a.name} (${Math.ceil(a.size / 1024)} KB)`).join(', ');
  }

  /** Paso 2: busca al socio por la cédula escrita (`sdpr/socio/{cedula}`) y copia cédula, correo y celular. */
  llenarDesdeSocio(p: PasoPrueba): void {
    const cedula = String(this.valores()[`${p.numero}.dni`] ?? '').trim();
    if (!cedula) {
      this.snackBar.open('Escriba primero la cédula del socio', 'Cerrar', { duration: 4000 });
      return;
    }
    this.llenando.set(true);
    this.servicio.socio(cedula).subscribe((s) => {
      this.llenando.set(false);
      if (!s.encontrado) {
        this.snackBar.open(s.error || 'No hay un socio con esa cédula', 'Cerrar', { duration: 4000 });
        return;
      }
      this.valores.update((x) => ({
        ...x,
        [`${p.numero}.email`]: s.correo || '',
        [`${p.numero}.numPhone`]: s.celular || '',
      }));
    });
  }

  /**
   * Paso 5, «calcular para el contrato»: pide al backend las posiciones reales de firma del PDF de ese contrato
   * (el socio firma en el contrato y en el Anexo I). Se mandan como `socioPosiciones` / `representantePosiciones`,
   * que reemplazan a la posición única de los campos.
   */
  calcularPosiciones(p: PasoPrueba): void {
    const idContrato = Number(this.valores()[`${p.numero}.idContrato`]);
    if (!idContrato) {
      this.snackBar.open('Escriba el número del contrato', 'Cerrar', { duration: 4000 });
      return;
    }
    this.calculando.set(true);
    this.servicio.posicionesContrato(idContrato).subscribe((r) => {
      this.calculando.set(false);
      if ('error' in r) {
        this.snackBar.open(r.error, 'Cerrar', { duration: 6000 });
        return;
      }
      this.posiciones.set(r);
    });
  }

  quitarPosiciones(): void {
    this.posiciones.set(null);
  }

  textoPosicion(x: PosicionFirma): string {
    return `pág. ${x.numPage}, x ${x.x}, y ${x.y}, ${x.width} × ${x.height}`;
  }

  // ══════════════════════ Ejecución ══════════════════════

  ejecutar(p: PasoPrueba): void {
    const faltante = this.validar(p);
    if (faltante) {
      this.snackBar.open(faltante, 'Cerrar', { duration: 5000 });
      return;
    }
    if (!p.confirmar) {
      this.correr(p);
      return;
    }
    const datos: ConfirmDialogData = {
      title: `Paso ${p.numero}: ${p.titulo}`,
      message: p.confirmar,
      confirmText: 'Ejecutar',
      cancelText: 'Cancelar',
      type: 'warning',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data: datos, width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.correr(p);
      });
  }

  /** El paso 5 necesita un PDF cargado o el número de un contrato. */
  private validar(p: PasoPrueba): string | null {
    if (p.numero === 5) {
      const hayPdf = (this.archivos()[5] ?? []).length > 0;
      const contrato = this.valores()['5.idContrato'];
      if (!hayPdf && !contrato) return 'Cargue un PDF o escriba el número de un contrato.';
    }
    return null;
  }

  /** Un campo con `soloSi` solo se muestra (y se manda) cuando el campo de control tiene ese valor. */
  visible(p: PasoPrueba, c: CampoPaso): boolean {
    if (!c.soloSi) return true;
    return this.valores()[`${p.numero}.${c.soloSi.clave}`] === c.soloSi.valor;
  }

  private cuerpo(p: PasoPrueba): Record<string, unknown> {
    const cuerpo: Record<string, unknown> = {};
    for (const c of p.campos) {
      if (!this.visible(p, c)) continue;
      const v = this.valor(p, c);
      if (v === '' || v === null || v === undefined) continue;
      cuerpo[c.clave] = c.tipo === 'numero' ? Number(v) : v;
    }
    // Paso 5: las posiciones calculadas para el contrato (contrato + Anexo I) reemplazan a la posición única.
    const calculadas = this.posiciones();
    if (p.numero === 5 && calculadas) {
      const aMi = (x: PosicionFirma) => ({ pagina: x.numPage, x: x.x, y: x.y, ancho: x.width, alto: x.height });
      cuerpo['socioPosiciones'] = calculadas.participe.map(aMi);
      cuerpo['representantePosiciones'] = calculadas.representante.map(aMi);
    }
    // Paso 3: «clave=valor» por línea → objeto.
    if (p.numero === 3 && typeof cuerpo['campos'] === 'string') {
      const mapa: Record<string, string> = {};
      for (const linea of (cuerpo['campos'] as string).split('\n')) {
        const i = linea.indexOf('=');
        if (i > 0) mapa[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
      }
      cuerpo['campos'] = mapa;
    }
    return cuerpo;
  }

  private correr(p: PasoPrueba): void {
    this.ejecutando.set(p.numero);
    this.servicio.ejecutar(p.ruta, this.cuerpo(p), this.archivos()[p.numero] ?? [], !!p.archivos).subscribe((res) => {
      this.ejecutando.set(null);
      this.resultados.update((r) => ({ ...r, [p.numero]: res }));
      this.abiertos.update((a) => ({ ...a, [`${p.numero}.pet`]: true, [`${p.numero}.res`]: true }));
      if (res.datos) this.encadenarIds(res.datos.respuesta);
      this.limpiarSensibles(p);
    });
  }

  /** El código dactilar no se conserva: se borra apenas se ejecuta el paso. */
  private limpiarSensibles(p: PasoPrueba): void {
    const sensibles = p.campos.filter((c) => c.sensible);
    if (sensibles.length === 0) return;
    this.valores.update((x) => {
      const copia = { ...x };
      for (const c of sensibles) copia[this.clave(p, c)] = '';
      return copia;
    });
  }

  // ══════════════════════ Ids encadenados ══════════════════════

  /** Busca cada id en cualquier parte de la respuesta y lo copia a los campos que lo piden. */
  private encadenarIds(respuesta: unknown): void {
    const hallados: Partial<Record<IdEncadenado, string>> = {};
    for (const id of IDS_ENCADENADOS) {
      const v = this.buscar(respuesta, id);
      if (v) hallados[id] = v;
    }
    if (Object.keys(hallados).length === 0) return;
    this.valores.update((x) => {
      const copia = { ...x };
      for (const p of PASOS) {
        for (const c of p.campos) {
          if (c.desde && hallados[c.desde]) copia[this.clave(p, c)] = hallados[c.desde];
        }
      }
      return copia;
    });
  }

  /** Primer valor de texto (o número) bajo la clave pedida, en cualquier nivel. */
  private buscar(nodo: unknown, clave: string): string | null {
    if (nodo === null || typeof nodo !== 'object') return null;
    if (Array.isArray(nodo)) {
      for (const e of nodo) {
        const r = this.buscar(e, clave);
        if (r) return r;
      }
      return null;
    }
    const obj = nodo as Record<string, unknown>;
    const directo = obj[clave];
    if ((typeof directo === 'string' && directo) || typeof directo === 'number') return String(directo);
    for (const k of Object.keys(obj)) {
      const r = this.buscar(obj[k], clave);
      if (r) return r;
    }
    return null;
  }

  // ══════════════════════ Presentación ══════════════════════

  json(valor: unknown): string {
    if (valor === undefined || valor === null) return '—';
    try {
      return JSON.stringify(valor, null, 2);
    } catch {
      return String(valor);
    }
  }

  alternar(p: PasoPrueba, panel: 'pet' | 'res'): void {
    const k = `${p.numero}.${panel}`;
    this.abiertos.update((a) => ({ ...a, [k]: !a[k] }));
  }

  abierto(p: PasoPrueba, panel: 'pet' | 'res'): boolean {
    return !!this.abiertos()[`${p.numero}.${panel}`];
  }

  /** Clase del chip HTTP: verde 2xx, ámbar 4xx, rojo el resto. */
  claseHttp(estado: number): string {
    if (estado >= 200 && estado < 300) return 'ok';
    if (estado >= 400 && estado < 500) return 'aviso';
    return 'error';
  }

  copiar(valor: unknown): void {
    navigator.clipboard.writeText(this.json(valor)).then(
      () => this.snackBar.open('Copiado', 'Cerrar', { duration: 1500 }),
      () => this.snackBar.open('No se pudo copiar', 'Cerrar', { duration: 3000 })
    );
  }

  puedeDescargar(p: PasoPrueba): boolean {
    return !!p.descargaPdf && !!this.resultados()[p.numero]?.datos?.pdfBase64;
  }

  descargarPdf(p: PasoPrueba): void {
    const datos = this.resultados()[p.numero]?.datos;
    if (!datos?.pdfBase64) return;
    const binario = atob(datos.pdfBase64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = datos.pdfNombre || `security-data-paso-${p.numero}.pdf`;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
