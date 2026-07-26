import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { switchMap } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Titular } from '../../../model/titular';
import { PersonaCuentaContableService } from '../../../service/persona-cuenta-contable.service';
import { PersonaRolService } from '../../../service/persona-rol.service';

@Component({
  selector: 'app-anticipos-clientes',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './anticipos-clientes.component.html',
  styleUrl: './anticipos-clientes.component.scss',
})
export class AnticiposClientesComponent {
  private dialog = inject(MatDialog);
  private personaRolS = inject(PersonaRolService);
  private cuentaContableS = inject(PersonaCuentaContableService);

  private readonly ROL_CLIENTE = 1;
  private readonly RUBRO_ROL_P = 55;
  private readonly TIPO_CUENTA_ANTICIPO = 2;

  titularSeleccionado = signal<Titular | null>(null);
  saldoAnticipos = signal<number>(0);
  cargandoSaldo = signal(false);

  abrirBusqueda(): void {
    const ref = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_CLIENTE, rolNombre: 'CLIENTE', titulo: 'Buscar Cliente' },
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

    // Paso 1: obtener PersonaRol del titular con rol CLIENTE
    const dbRolP = new DatosBusqueda();
    dbRolP.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaP',
      this.RUBRO_ROL_P.toString(), TipoComandosBusqueda.IGUAL
    );
    dbRolP.setNumeroCampoRepetido(0);

    const dbRolH = new DatosBusqueda();
    dbRolH.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'rubroRolPersonaH',
      this.ROL_CLIENTE.toString(), TipoComandosBusqueda.IGUAL
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
  }
}
