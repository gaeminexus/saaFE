import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { Titular } from '../../model/titular';
import { TitularService } from '../../service/titular.service';

@Component({
  selector: 'app-titulares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './titulares.component.html',
  styleUrls: ['./titulares.component.scss'],
})
export class TitularesComponent implements OnInit {
  // Signals para estado reactivo
  titulares = signal<Titular[]>([]);
  tiposTitular = signal<DetalleRubro[]>([]);
  tiposIdentificacion = signal<DetalleRubro[]>([]);
  rolesTitular = signal<DetalleRubro[]>([]);
  loading = signal<boolean>(false);
  editMode = signal<boolean>(false);
  selectedRow = signal<Titular | null>(null);
  errorMessage = signal<string>('');

  // DataSource para la tabla
  dataSource = new MatTableDataSource<Titular>([]);
  displayedColumns = [
    'tipoTitular',
    'tipoIdentificacion',
    'identificacion',
    'apellido',
    'nombre',
    'razonSocial',
    'estado',
  ];

  // Formulario de edición (objeto editable)
  titularEdit: Titular | null = null;
  backup: Titular | null = null;

  // Códigos de rubro según la base de datos
  private readonly RUBRO_TIPO_Titular = 35; // Tipo de Titular (Natural/Jurídica)
  private readonly RUBRO_TIPO_IDENTIFICACION = 36; // Tipo de documento (Cédula/RUC/Pasaporte)
  private readonly RUBRO_ROL_TITULAR = 55; // Rol del titular

  constructor(
    private titularService: TitularService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarRubros();
  }

  /**
   * Carga todas las titulares desde el backend
   * Intenta múltiples endpoints como fallback
   */
  cargarDatos(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.titularService.getAll().subscribe({
      next: (data: Titular[] | null) => {
        if (data) {
          this.titulares.set(data);
          this.dataSource.data = data;
          console.log('titulares cargadas exitosamente:', data.length);
        }
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error en getAll(), intentando selectByCriteria...', error);

        // Workaround: Intentar endpoint alternativo
        this.cargarDatosAlternativo();
      },
    });
  }

  /**
   * Método alternativo usando selectByCriteria cuando getAll falla
   * Útil cuando hay problemas de conversión de tipos en la BD
   */
  private cargarDatosAlternativo(): void {
    this.titularService.selectByCriteria({ estado: 1 }).subscribe({
      next: (data: Titular[] | null) => {
        if (data) {
          this.titulares.set(data);
          this.dataSource.data = data;
          console.log('titulares cargadas con método alternativo:', data.length);
          this.snackBar.open('⚠️ Datos cargados con método alternativo', 'Cerrar', {
            duration: 4000,
          });
        }
        this.loading.set(false);
      },
      error: (errorAlt: any) => {
        console.error('Error en selectByCriteria:', errorAlt);

        // Mensaje detallado del error
        const errorMsg =
          errorAlt?.error?.message || errorAlt?.message || 'Error de conexión con el backend';
        const fullMsg =
          `⚠️ ERROR EN BACKEND - ${errorMsg}\n\n` +
          '🔍 Revisar:\n' +
          '1. Tipos de columnas en BD (VARCHAR vs NUMBER)\n' +
          '2. Datos corruptos en PERSONA_NATURAL\n' +
          '3. Consultar titulares_DB_ERROR_DIAGNOSTICO.md';

        this.errorMessage.set(fullMsg);
        this.mostrarError('No se pudieron cargar las titulares. Ver consola para detalles.');

        // Dejar tabla vacía pero funcional
        this.titulares.set([]);
        this.dataSource.data = [];
        this.loading.set(false);
      },
    });
  }

  /**
   * Carga los rubros para combos de tipo Titular y tipo identificación
   */
  cargarRubros(): void {
    // Cargar tipos de Titular
    const tiposP = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_Titular);
    this.tiposTitular.set(tiposP);
    console.log('Tipos de Titular cargados:', tiposP.length);

    // Cargar tipos de identificación
    const tiposI = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    this.tiposIdentificacion.set(tiposI);
    console.log('Tipos de identificación cargados:', tiposI.length);

    // Cargar roles del titular
    const roles = this.detalleRubroService.getDetallesByParent(this.RUBRO_ROL_TITULAR);
    this.rolesTitular.set(roles);
    console.log('Roles de titular cargados:', roles.length);

    // Si no hay datos en caché, intentar cargar desde backend
    if (tiposP.length === 0 || tiposI.length === 0 || roles.length === 0) {
      console.warn('Rubros no encontrados en caché. Cargando desde backend...');
      this.detalleRubroService.inicializar().subscribe(() => {
        this.tiposTitular.set(
          this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_Titular),
        );
        this.tiposIdentificacion.set(
          this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION),
        );
        this.rolesTitular.set(this.detalleRubroService.getDetallesByParent(this.RUBRO_ROL_TITULAR));
      });
    }
  }

  /**
   * Inicia el modo de inserción
   */
  insertar(): void {
    if (this.editMode()) {
      this.mostrarError('Ya está en modo edición');
      return;
    }

    // Crear nueva Titular con valores mínimos requeridos
    // Solo incluir campos que el backend PersonaNatural acepta (9 campos)
    const nuevaTitular: Titular = {
      codigo: 0,
      estado: 1,
      // Los demás campos opcionales (nombres, apellidos, genero, estadoCivil,
      // filial, usuarioIngreso, fechaIngreso) se llenan en el formulario
    };

    this.titularEdit = nuevaTitular;
    this.selectedRow.set(nuevaTitular);
    this.editMode.set(true);
  }

  /**
   * Inicia el modo de modificación
   */
  modificar(): void {
    if (!this.selectedRow()) {
      this.mostrarError('Debe seleccionar una Titular');
      return;
    }

    if (this.editMode()) {
      this.mostrarError('Ya está en modo edición');
      return;
    }

    // Crear copia para edición
    this.backup = JSON.parse(JSON.stringify(this.selectedRow()));
    this.titularEdit = this.selectedRow();
    this.editMode.set(true);
  }

  /**
   * Elimina la Titular seleccionada (soft delete)
   */
  eliminar(): void {
    if (!this.selectedRow()) {
      this.mostrarError('Debe seleccionar una Titular');
      return;
    }

    if (this.editMode()) {
      this.mostrarError('No puede eliminar mientras está en modo edición');
      return;
    }

    const Titular = this.selectedRow()!;

    if (confirm(`¿Está seguro de inactivar a ${this.getNombreCompleto(Titular)}?`)) {
      Titular.estado = 0;

      this.titularService.update(Titular).subscribe({
        next: () => {
          this.mostrarExito('Titular inactivada correctamente');
          this.cargarDatos();
          this.limpiar();
        },
        error: (error: any) => {
          console.error('Error al eliminar Titular', error);
          this.mostrarError('Error al inactivar la Titular');
          Titular.estado = 1; // Revertir cambio
        },
      });
    }
  }

  /**
   * Acepta y guarda los cambios
   */
  aceptar(): void {
    if (!this.editMode() || !this.titularEdit) {
      return;
    }

    // Validaciones
    if (!this.validarFormulario()) {
      return;
    }

    // Sanitizar datos antes de enviar (convertir strings vacíos a null)
    const titularesanitized = this.sanitizeTitular(this.titularEdit);

    // Determinar si es INSERT o UPDATE usando el objeto original
    const isInsert = this.titularEdit.codigo === 0;

    if (isInsert) {
      // INSERT - No se envía 'codigo' en el JSON
      this.titularService.add(titularesanitized).subscribe({
        next: (response: Titular | null) => {
          if (response) {
            this.mostrarExito('Titular creada correctamente');
            this.cargarDatos();
            this.limpiar();
          }
        },
        error: (error: any) => {
          console.error('Error al crear Titular', error);
          this.mostrarError('Error al crear la Titular');
        },
      });
    } else {
      // UPDATE - Se envía 'codigo' en el JSON
      this.titularService.update(titularesanitized).subscribe({
        next: (response: Titular | null) => {
          if (response) {
            this.mostrarExito('Titular actualizada correctamente');
            this.cargarDatos();
            this.limpiar();
          }
        },
        error: (error: any) => {
          console.error('Error al actualizar Titular', error);
          this.mostrarError('Error al actualizar la Titular');
        },
      });
    }
  }

  /**
   * Cancela la edición y restaura valores
   */
  cancelar(): void {
    if (this.backup) {
      // Restaurar valores originales
      Object.assign(this.selectedRow()!, this.backup);
    }

    this.limpiar();
  }

  /**
   * Sanitiza el objeto Titular antes de enviar al backend.
   * SOLO envía campos reconocidos por com.saa.model.tsr.Titular.
   * Convierte strings vacíos a undefined para evitar errores de deserialización.
   */
  private sanitizeTitular(Titular: Titular): any {
    const titularBackend: any = {
      nombre: Titular.nombre || Titular.nombres,
      apellido: Titular.apellido || Titular.apellidos,
      estado: Titular.estado,
    };

    // En UPDATE se envía 'codigo'. En INSERT (codigo=0) no se envía.
    if (Titular.codigo && Titular.codigo > 0) {
      titularBackend.codigo = Titular.codigo;
    }

    if (Titular.identificacion && Titular.identificacion.trim() !== '') {
      titularBackend.identificacion = Titular.identificacion.trim();
    }

    if (Titular.razonSocial && Titular.razonSocial.trim() !== '') {
      titularBackend.razonSocial = Titular.razonSocial.trim();
    }

    if (Titular.rubroTipoPersonaP) {
      titularBackend.rubroTipoPersonaP = Titular.rubroTipoPersonaP;
    }

    if (Titular.rubroTipoPersonaH) {
      titularBackend.rubroTipoPersonaH = Titular.rubroTipoPersonaH;
    }

    if (Titular.rubroTipoIdentificacionP) {
      titularBackend.rubroTipoIdentificacionP = Titular.rubroTipoIdentificacionP;
    }

    if (Titular.rubroTipoIdentificacionH) {
      titularBackend.rubroTipoIdentificacionH = Titular.rubroTipoIdentificacionH;
    }

    if (Titular.tipoCliente !== undefined) {
      titularBackend.tipoCliente = Titular.tipoCliente;
    }

    if (Titular.tipoProveedor !== undefined) {
      titularBackend.tipoProveedor = Titular.tipoProveedor;
    }

    if (Titular.tipoBeneficiario !== undefined) {
      titularBackend.tipoBeneficiario = Titular.tipoBeneficiario;
    }

    if (Titular.tipoEmpleado !== undefined) {
      titularBackend.tipoEmpleado = Titular.tipoEmpleado;
    }

    if (Titular.tipoSocio !== undefined) {
      titularBackend.tipoSocio = Titular.tipoSocio;
    }

    if (Titular.aplicaIVA !== undefined) {
      titularBackend.aplicaIVA = Titular.aplicaIVA;
    }

    if (Titular.aplicaRetencion !== undefined) {
      titularBackend.aplicaRetencion = Titular.aplicaRetencion;
    }

    return titularBackend;
  }

  /**
   * Valida el formulario antes de guardar.
   * Solo valida campos requeridos por el backend Titular.
   */
  private validarFormulario(): boolean {
    const p = this.titularEdit!;

    // Validar nombres (requerido)
    const nombres = p.nombre || p.nombres;
    if (!nombres || nombres.trim() === '') {
      this.mostrarError('El nombre es requerido');
      return false;
    }

    // Validar apellidos (requerido)
    const apellidos = p.apellido || p.apellidos;
    if (!apellidos || apellidos.trim() === '') {
      this.mostrarError('El apellido es requerido');
      return false;
    }

    // Sincronizar campos nombre/nombres, apellido/apellidos
    if (p.nombres && !p.nombre) p.nombre = p.nombres;
    if (p.apellidos && !p.apellido) p.apellido = p.apellidos;

    // Validar duplicados por nombres + apellidos
    const duplicado = this.titulares().find(
      (per) =>
        (per.nombre || per.nombres) === nombres &&
        (per.apellido || per.apellidos) === apellidos &&
        per.codigo !== p.codigo,
    );

    if (duplicado) {
      this.mostrarError('Ya existe una Titular con ese nombre y apellido');
      return false;
    }

    return true;
  }

  /**
   * Limpia el formulario y desactiva modo edición
   */
  limpiar(): void {
    this.selectedRow.set(null);
    this.editMode.set(false);
    this.titularEdit = null;
    this.backup = null;
    this.errorMessage.set('');
  }

  /**
   * Maneja el click en una fila de la tabla
   */
  onRowClick(Titular: Titular): void {
    if (!this.editMode()) {
      this.selectedRow.set(Titular);
      this.titularEdit = Titular;
    }
  }

  /**
   * Obtiene el nombre completo de una Titular
   */
  getNombreCompleto(Titular: Titular): string {
    // Priorizar razón social para titulares jurídicas
    if (Titular.razonSocial && Titular.razonSocial.trim() !== '') {
      return Titular.razonSocial;
    }

    // Usar campos singulares (nombre/apellido) si existen
    if (Titular.apellido && Titular.nombre) {
      return `${Titular.apellido} ${Titular.nombre}`.trim();
    }

    // Fallback a campos plurales (backend PersonaNatural)
    if (Titular.apellidos && Titular.nombres) {
      return `${Titular.apellidos} ${Titular.nombres}`.trim();
    }

    return '';
  }

  /**
   * Obtiene la descripción del tipo de Titular
   */
  getTipoPersonaDesc(Titular: Titular): string {
    if (!Titular.rubroTipoPersonaH) return '';
    const tipo = this.tiposTitular().find((t) => t.codigo === Titular.rubroTipoPersonaH);
    return tipo?.descripcion || '';
  }

  /**
   * Obtiene la descripción del tipo de identificación
   */
  getTipoIdentificacionDesc(Titular: Titular): string {
    if (!Titular.rubroTipoIdentificacionH) return '';
    const tipo = this.tiposIdentificacion().find(
      (t) => t.codigo === Titular.rubroTipoIdentificacionH,
    );
    return tipo?.descripcion || '';
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoTexto(estado: number): string {
    return estado === 1 ? 'ACTIVO' : 'INACTIVO';
  }

  /**
   * Comparador para mat-select de rubros
   */
  compareRubro(r1: number, r2: number): boolean {
    return r1 === r2;
  }

  /**
   * Muestra un mensaje de error
   */
  private mostrarError(mensaje: string): void {
    this.errorMessage.set(mensaje);
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['error-snackbar'],
    });
  }

  /**
   * Muestra un mensaje de éxito
   */
  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 2000,
      panelClass: ['success-snackbar'],
    });
  }
}
