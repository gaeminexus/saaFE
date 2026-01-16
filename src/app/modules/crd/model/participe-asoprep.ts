export interface ParticipeAsoprep {
    id: number;          // Código
    cedula: String;          // Ciudad (FK)
    codigoCdgf: String;          // Nombre de la parroquia
    codigoCdga: String;  // Usuario de ingreso
    estadoParticipante: string;    // Fecha de ingreso (Timestamp)
    apellidos: String;   // Código externo
    fechaNacimiento: Date;          // Estado
    genero: String;
    estadoCivil: String;
    provincia: String;
    canton: String;
    ciudad: String;
    parroquia: String;
    direccion: String;
    telefonoFijo: String;
    telefonoCelular: String;
    correoElectronico: String;
    banco: String;
    tipoCuentaBancaria: String;
    cuentaBancaria: String;
    fechaCcs: Date;
    fechaJubilacion: Date;
    fechaCsn: Date;
    fechaCjc: Date;
    institucion: String;
    localidad: String;
    region: String;
    edad: String;
    regimen: String;
    telefonoTrabajo: String;
    cargo: String;
    codigoCdlg: String;


}
