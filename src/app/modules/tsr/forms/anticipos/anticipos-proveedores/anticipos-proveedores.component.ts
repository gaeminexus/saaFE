import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { switchMap } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Titular } from '../../../model/titular';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { PersonaCuentaContableService } from '../../../service/persona-cuenta-contable.service';
import { PersonaRolService } from '../../../service/persona-rol.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { AnticipoService } from '../../../service/anticipo.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

@Component({
  selector: 'app-anticipos-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './anticipos-proveedores.component.html',
  styleUrl: './anticipos-proveedores.component.scss',
})
export class AnticiposProveedoresComponent {
  private dialog = inject(MatDialog);
  private personaRolS = inject(PersonaRolService);
  private cuentaContableS = inject(PersonaCuentaContableService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private anticipoS = inject(AnticipoService);
  private jasperReportes = inject(JasperReportesService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  private readonly ROL_PROVEEDOR = 2;
  private readonly RUBRO_ROL_P = 55;
  private readonly TIPO_CUENTA_ANTICIPO = 2;

  titularSeleccionado = signal<Titular | null>(null);
  saldoAnticipos = signal<number>(0);
  cargandoSaldo = signal(false);

  // Formulario de nuevo anticipo
  mostrarFormulario = signal(false);
  procesando = signal(false);
  imprimiendo = signal(false);
  ultimoAnticipoId = signal<number | null>(null);
  errorProceso = signal<string>('');
  exitoProceso = signal<string>('');
  cuentasBancarias = signal<CuentaBancaria[]>([]);

  // Lista de anticipos
  listaAnticipos = signal<any[]>([]);
  cargandoLista = signal(false);
  mostrandoLista = signal(false);

  formValor = '';
  formCuentaBancaria: CuentaBancaria | null = null;
  formFecha: Date | null = new Date();
  formNumeroDoc = '';
  formObservacion = '';

  abrirBusqueda(): void {
    const ref = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    ref.afterClosed().subscribe((t: Titular | null) => {
      if (t) {
        this.titularSeleccionado.set(t);
        this.cargarSaldo(t);
      }
    });
  }

  private cargarSaldo(titular: Titular): void {
    this.cargandoSaldo.set(true);
    this.saldoAnticipos.set(0);

    const empresaCodigo = sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa');

    // Paso 1: obtener PersonaRol del titular con rol PROVEEDOR
    const dbRolP = new DatosBusqueda();
    dbRolP.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaP',
      this.RUBRO_ROL_P.toString(), TipoComandosBusqueda.IGUAL
    );
    dbRolP.setNumeroCampoRepetido(0);

    const dbRolH = new DatosBusqueda();
    dbRolH.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaH',
      this.ROL_PROVEEDOR.toString(), TipoComandosBusqueda.IGUAL
    );
    dbRolH.setNumeroCampoRepetido(0);

    const dbTitular = new DatosBusqueda();
    dbTitular.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo',
      titular.codigo.toString(), TipoComandosBusqueda.IGUAL
    );
    dbTitular.setNumeroCampoRepetido(0);

    const criteriosRol: DatosBusqueda[] = [dbRolP, dbRolH, dbTitular];

    if (empresaCodigo) {
      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaValorConCampoPadre(
        TipoDatos.LONG, 'empresa', 'codigo',
        empresaCodigo.toString(), TipoComandosBusqueda.IGUAL
      );
      dbEmpresa.setNumeroCampoRepetido(0);
      criteriosRol.push(dbEmpresa);
    }

    this.personaRolS.selectByCriteria(criteriosRol).pipe(
      switchMap((roles) => {
        const personaRolCodigo = (roles || [])[0]?.codigo;
        if (!personaRolCodigo) {
          return [null];
        }
        // Paso 2: buscar PersonaCuentaContable por personaRol.codigo + tipoCuenta=2
        // No filtrar por tipoPersona: puede ser null en la BD
        const dbPR = new DatosBusqueda();
        dbPR.asignaValorConCampoPadre(
          TipoDatos.LONG, 'personaRol', 'codigo',
          personaRolCodigo.toString(), TipoComandosBusqueda.IGUAL
        );
        dbPR.setNumeroCampoRepetido(0);
        const dbTC = new DatosBusqueda();
        dbTC.asignaUnCampoSinTrunc(
          TipoDatos.LONG, 'tipoCuenta',
          this.TIPO_CUENTA_ANTICIPO.toString(), TipoComandosBusqueda.IGUAL
        );
        dbTC.setNumeroCampoRepetido(0);
        return this.cuentaContableS.selectByCriteria([dbPR, dbTC]);
      })
    ).subscribe({
      next: (rows) => {
        if (!rows) {
          this.saldoAnticipos.set(0);
        } else {
          const saldo = Number((rows as any[])[0]?.saldoInicial ?? 0);
          this.saldoAnticipos.set(Number.isFinite(saldo) ? saldo : 0);
        }
        this.cargandoSaldo.set(false);
      },
      error: () => {
        this.saldoAnticipos.set(0);
        this.cargandoSaldo.set(false);
      },
    });
  }

  limpiar(): void {
    this.titularSeleccionado.set(null);
    this.saldoAnticipos.set(0);
    this.listaAnticipos.set([]);
    this.mostrandoLista.set(false);
    this.cerrarFormulario();
  }

  abrirFormulario(): void {
    this.errorProceso.set('');
    this.exitoProceso.set('');
    this.formValor = '';
    this.formCuentaBancaria = null;
    this.formFecha = new Date();
    this.formNumeroDoc = '';
    this.formObservacion = '';
    this.mostrarFormulario.set(true);
    this.cargarCuentasBancarias();
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.errorProceso.set('');
    this.exitoProceso.set('');
    this.ultimoAnticipoId.set(null);
  }

  verAnticipos(mostrar = true): void {
    const titular = this.titularSeleccionado();
    if (!titular) return;
    this.cargandoLista.set(true);
    if (mostrar) this.mostrandoLista.set(true);

    const dbTitular = new DatosBusqueda();
    dbTitular.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo',
      titular.codigo.toString(), TipoComandosBusqueda.IGUAL
    );
    dbTitular.setNumeroCampoRepetido(0);

    const dbOrden = new DatosBusqueda();
    dbOrden.orderBy('id');
    dbOrden.setTipoOrden(DatosBusqueda.ORDER_DESC);

    this.anticipoS.selectByCriteriaProveedor([dbTitular, dbOrden]).subscribe({
      next: (data) => {
        this.listaAnticipos.set(data ?? []);
        this.cargandoLista.set(false);
        if (!this.ultimoAnticipoId() && (data ?? []).length > 0) {
          const primero = (data as any[])[0];
          const id = primero?.['id'] ?? primero?.['antpCodigo'] ?? null;
          if (id) this.ultimoAnticipoId.set(Number(id));
        }
      },
      error: () => {
        this.cargandoLista.set(false);
        this.snackBar.open('No se pudo cargar el historial de anticipos.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private cargarCuentasBancarias(): void {
    if (this.cuentasBancarias().length > 0) return;
    const idEmpresa = +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter((c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa);
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => {},
    });
  }

  procesarAnticipo(): void {
    const titular = this.titularSeleccionado();
    if (!titular || !this.formValor || !this.formCuentaBancaria || !this.formFecha) {
      this.errorProceso.set('Complete todos los campos obligatorios.');
      return;
    }
    const valor = parseFloat(String(this.formValor));
    if (isNaN(valor) || valor <= 0) {
      this.errorProceso.set('El valor debe ser un número mayor a cero.');
      return;
    }

    const idEmpresa = +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
    const idUsuario = +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
    const fecha = this.formFecha instanceof Date
      ? this.formFecha.toISOString().substring(0, 10)
      : String(this.formFecha);

    const payload = {
      idTitular: titular.codigo,
      valor,
      idCuentaBancaria: this.formCuentaBancaria.codigo,
      idEmpresa,
      idUsuario,
      fechaAnticipo: fecha,
      numeroDoc: this.formNumeroDoc.trim(),
      observacion: this.formObservacion.trim(),
    };

    this.procesando.set(true);
    this.errorProceso.set('');
    this.exitoProceso.set('');

    this.anticipoS.procesarProveedor(payload).subscribe({
      next: (resp) => {
        console.log('[AnticipoProveedor] Respuesta del backend:', resp);
        const id = resp?.['id'] ?? resp?.['codigo'] ?? resp?.['antpCodigo'] ?? resp?.['idAnticipo'] ?? null;
        this.exitoProceso.set('Anticipo registrado correctamente.');
        this.procesando.set(false);
        this.cargarSaldo(titular);
        this.verAnticipos(false);
        if (id) this.ultimoAnticipoId.set(Number(id));
      },
      error: (err: Error) => {
        this.errorProceso.set(err.message);
        this.procesando.set(false);
      },
    });
  }

  imprimirAnticipo(): void {
    let id = this.ultimoAnticipoId();
    if (!id && this.listaAnticipos().length > 0) {
      const primero = this.listaAnticipos()[0] as any;
      const raw = primero?.['id'] ?? primero?.['antpCodigo'] ?? null;
      if (raw) id = Number(raw);
    }
    if (!id) {
      this.snackBar.open('No hay anticipo para imprimir.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.imprimiendo.set(true);
    this.snackBar.open('Generando comprobante...', '', { duration: 2000 });

    const parametros = {
      P_ANTICIPO_ID: id,
      P_REPORTE: 'COMPROBANTE DE ENTREGA DE ANTICIPO A PROVEEDOR',
      P_PATH: 'Tesorería > Anticipos > Proveedor',
      P_IMAGEN: null,
    };

    this.jasperReportes.generar('tsr', 'RPRT_ANTP_PRVD', parametros, 'PDF').subscribe({
      next: (blob) => {
        this.imprimiendo.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anticipo-proveedor-${id}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.snackBar.open('✅ Comprobante generado exitosamente', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.imprimiendo.set(false);
        this.snackBar.open('❌ No se pudo generar el comprobante', 'Cerrar', { duration: 4000 });
      },
    });
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
