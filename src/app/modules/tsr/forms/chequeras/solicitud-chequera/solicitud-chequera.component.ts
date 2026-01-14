import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { Banco } from '../../../model/banco';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

@Component({
  selector: 'app-solicitud-chequera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './solicitud-chequera.component.html',
  styleUrls: ['./solicitud-chequera.component.scss'],
})
export class SolicitudChequeraComponent implements OnInit {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);
  cuentasFiltradas = signal<CuentaBancaria[]>([]);

  bancoSel: Banco | null = null;
  cuentaSel: CuentaBancaria | null = null;
  fechaSolicitud = '';
  numeroCheques: number | null = null;

  constructor(
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private chequeraService: ChequeraService
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarCuentas();
  }

  cargarBancos(): void {
    const criterios: DatosBusqueda[] = [];
    const order = new DatosBusqueda();
    order.orderBy('codigo');
    criterios.push(order);
    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => this.bancos.set(Array.isArray(data) ? data : []),
      error: () =>
        this.bancoService.getAll().subscribe({
          next: (d2) => this.bancos.set(Array.isArray(d2) ? d2 : []),
          error: () => this.errorMsg.set('Error al cargar bancos'),
        }),
    });
  }

  cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.cuentas.set(items);
        this.filtrarCuentas();
      },
      error: () => this.errorMsg.set('Error al cargar cuentas bancarias'),
    });
  }

  onBancoChange(b: Banco | null): void {
    this.bancoSel = b;
    this.cuentaSel = null;
    this.filtrarCuentas();
  }

  filtrarCuentas(): void {
    const b = this.bancoSel;
    const filtered = b
      ? this.cuentas().filter((c) => (c as any).banco?.codigo === (b as any).codigo)
      : [];
    this.cuentasFiltradas.set(filtered);
  }

  formValido(): boolean {
    return (
      !!this.bancoSel &&
      !!this.cuentaSel &&
      !!this.fechaSolicitud &&
      !!this.numeroCheques &&
      this.numeroCheques! > 0
    );
  }

  solicitar(): void {
    if (!this.formValido()) return;
    const payload: any = {
      fechaSolicitud: this.fechaSolicitud,
      numeroCheques: this.numeroCheques,
      cuentaBancaria: { codigo: (this.cuentaSel as any).codigo },
    };
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.chequeraService.add(payload).subscribe({
      next: () => {
        this.successMsg.set('Solicitud registrada');
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo registrar la solicitud');
        this.loading.set(false);
      },
    });
  }
}
