/**
 * Pasos de la consola de pruebas de Security Data (diseño §2). Todo lo que depende del contrato del
 * backend (`sdpr/{paso}`, nombres de los campos del cuerpo) está AQUÍ y en ningún otro lado: los nombres
 * de campo siguen la API de Security Data (REFERENCIA-API-SECURITY-DATA-DATAGREE.md) y son provisionales
 * hasta que el BE publique API-PRUEBAS-SECURITY-DATA.md.
 */

export type TipoCampo = 'texto' | 'numero' | 'select' | 'check' | 'area';

/** Ids que un paso devuelve y los siguientes reutilizan (se buscan en cualquier parte de la respuesta). */
export type IdEncadenado = 'signatoryId' | 'processId' | 'pdfId' | 'referenceCode';

export interface CampoPaso {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  valor?: string | number | boolean;
  opciones?: { valor: string; texto: string }[];
  ayuda?: string;
  maxLength?: number;
  mayusculas?: boolean;
  /** Se llena solo con el id que devolvió un paso anterior (sigue siendo editable). */
  desde?: IdEncadenado;
  /** Solo se muestra (y solo se manda) cuando otro campo del mismo paso tiene este valor. */
  soloSi?: { clave: string; valor: string };
  /** Dato sensible: no se guarda en ningún lado y se limpia después de ejecutar. */
  sensible?: boolean;
}

export interface PasoPrueba {
  numero: number;
  /** Segmento de la ruta del backend: `sdpr/{ruta}`. */
  ruta: string;
  titulo: string;
  llamada: string;
  descripcion: string;
  campos: CampoPaso[];
  /** Carga de PDF desde la pantalla (multipart): paso 3 acepta varios, el 5 uno. */
  archivos?: { etiqueta: string; multiple: boolean };
  /** Si está, se pide confirmación antes de ejecutar. */
  confirmar?: string;
  /** Botón «Descargar PDF» (pasos 7 y 8). */
  descargaPdf?: boolean;
}

const TIPO_FIRMANTE = [
  { valor: 'TP_SIGNER_NORMAL', texto: 'Normal (recibe el enlace)' },
  { valor: 'TP_SIGNER_EMBEDDED', texto: 'Embebido (firma sola)' },
];

const METODO_NOTIFICACION = [
  { valor: 'ENVIO_OTPN_CORREO_WSS', texto: 'Correo y WhatsApp' },
  { valor: 'ENVIO_OTPN_CORREO', texto: 'Solo correo' },
  { valor: 'ENVIO_OTPN_WSS', texto: 'Solo WhatsApp' },
];

/** Posición de firma: página desde 1, puntos PDF con origen abajo a la izquierda (A4 = 595 × 842). */
function posicion(prefijo: string, quien: string, pagina: number, x: number, y: number): CampoPaso[] {
  return [
    { clave: `${prefijo}Pagina`, etiqueta: `${quien}: página`, tipo: 'numero', valor: pagina },
    { clave: `${prefijo}X`, etiqueta: `${quien}: posición X`, tipo: 'numero', valor: x },
    { clave: `${prefijo}Y`, etiqueta: `${quien}: posición Y`, tipo: 'numero', valor: y },
    { clave: `${prefijo}Ancho`, etiqueta: `${quien}: ancho`, tipo: 'numero', valor: 150 },
    { clave: `${prefijo}Alto`, etiqueta: `${quien}: alto`, tipo: 'numero', valor: 50 },
  ];
}

export const PASOS: PasoPrueba[] = [
  {
    numero: 0,
    ruta: 'configuracion',
    titulo: 'Configuración',
    llamada: '(local, sin llamar a Security Data)',
    descripcion: 'URL base, usuario API (sin clave), cédula del representante y si las pruebas están habilitadas.',
    campos: [],
  },
  {
    numero: 1,
    ruta: 'autenticar',
    titulo: 'Autenticar',
    llamada: 'POST /authenticateUser',
    descripcion: 'Pide el token. Se muestra éxito, tipo y vigencia; el token sale enmascarado (primeros 12 caracteres).',
    campos: [],
  },
  {
    numero: 2,
    ruta: 'validar-firmante',
    titulo: 'Validar firmante',
    llamada: 'POST /signersValidation',
    descripcion: 'Valida al socio. STY-0001 devuelve el signatoryId (vale 3 días).',
    campos: [
      { clave: 'tpSignature', etiqueta: 'Tipo de firma', tipo: 'texto', valor: 'SC_TP_F_AVANZADA_PN' },
      { clave: 'tpIdentification', etiqueta: 'Tipo de identificación', tipo: 'texto', valor: 'TIPO_IDENTIFICACION_CEDULA' },
      { clave: 'dni', etiqueta: 'Cédula', tipo: 'texto', maxLength: 13 },
      {
        clave: 'fingerprintCode', etiqueta: 'Código dactilar', tipo: 'texto', maxLength: 6, mayusculas: true, sensible: true,
        ayuda: '6 caracteres, del reverso de la cédula. No se guarda.',
      },
      { clave: 'email', etiqueta: 'Correo', tipo: 'texto' },
      { clave: 'countryCode', etiqueta: 'Código de país', tipo: 'texto', valor: '+593' },
      { clave: 'numPhone', etiqueta: 'Celular', tipo: 'texto', ayuda: 'Formato 09XXXXXXXX' },
      { clave: 'reuseSignature', etiqueta: 'Reutilizar firma', tipo: 'check', valor: false },
    ],
  },
  {
    numero: 3,
    ruta: 'completar-datos',
    titulo: 'Completar datos',
    llamada: 'POST /completeSignatoryData',
    descripcion: 'Solo si la validación respondió STY-0002 (faltan datos). Campos clave/valor y adjuntos PDF.',
    campos: [
      { clave: 'signatoryId', etiqueta: 'signatoryId', tipo: 'texto', desde: 'signatoryId' },
      {
        clave: 'campos', etiqueta: 'Campos (clave=valor, uno por línea)', tipo: 'area',
        ayuda: 'Ej.: CP_EMI_NOMBRES=JUAN',
      },
    ],
    archivos: { etiqueta: 'Adjuntos PDF ({NEMONICO}_{DNI}.pdf)', multiple: true },
  },
  {
    numero: 4,
    ruta: 'firma-representante',
    titulo: 'Firma del representante',
    llamada: 'POST /findSignatureReferences y /consultSDSignature',
    descripcion: 'Busca la firma delegada del representante legal. El referenceCode se usa en el paso 5.',
    campos: [
      {
        clave: 'accion', etiqueta: 'Acción', tipo: 'select', valor: 'BUSCAR',
        opciones: [
          { valor: 'BUSCAR', texto: 'Buscar referencias (findSignatureReferences)' },
          { valor: 'CONSULTAR', texto: 'Consultar firma (consultSDSignature)' },
        ],
      },
      { clave: 'dni', etiqueta: 'Cédula del representante', tipo: 'texto', maxLength: 13 },
      { clave: 'names', etiqueta: 'Nombres', tipo: 'texto', soloSi: { clave: 'accion', valor: 'BUSCAR' } },
      { clave: 'tpSignature', etiqueta: 'Tipo de firma', tipo: 'texto', valor: 'SC_TP_F_JURIDICA_RL', soloSi: { clave: 'accion', valor: 'CONSULTAR' } },
      { clave: 'ruc', etiqueta: 'RUC', tipo: 'texto', soloSi: { clave: 'accion', valor: 'CONSULTAR' } },
    ],
  },
  {
    numero: 5,
    ruta: 'crear-tarea',
    titulo: 'Crear tarea',
    llamada: 'POST /createTask (multipart)',
    descripcion: 'Envía el PDF y deja la tarea lista para que el socio firme. Notifica al socio de verdad.',
    campos: [
      {
        clave: 'idContrato', etiqueta: 'Usar el contrato N (opcional)', tipo: 'numero',
        ayuda: 'Si no sube un PDF, el backend genera el impreso de ese contrato (no se guarda).',
      },
      { clave: 'socioSignatoryId', etiqueta: 'Socio: signatoryId', tipo: 'texto', desde: 'signatoryId' },
      { clave: 'socioTipo', etiqueta: 'Socio: tipo', tipo: 'select', valor: 'TP_SIGNER_NORMAL', opciones: TIPO_FIRMANTE },
      ...posicion('socio', 'Socio', 1, 100, 100),
      { clave: 'representanteSignatoryId', etiqueta: 'Representante: referenceCode', tipo: 'texto', desde: 'referenceCode' },
      { clave: 'representanteTipo', etiqueta: 'Representante: tipo', tipo: 'select', valor: 'TP_SIGNER_EMBEDDED', opciones: TIPO_FIRMANTE },
      ...posicion('representante', 'Representante', 1, 350, 100),
      { clave: 'diasVigencia', etiqueta: 'Vigencia (días)', tipo: 'numero', valor: 7 },
      { clave: 'horasRenotificacion', etiqueta: 'Renotificar cada (horas)', tipo: 'numero', valor: 24 },
      { clave: 'typeNotification', etiqueta: 'Orden de firma', tipo: 'texto', valor: 'TIPO_ORDEN_CADENA_SECU_CONTRATO' },
      { clave: 'methodNotification', etiqueta: 'Método de notificación', tipo: 'select', valor: 'ENVIO_OTPN_CORREO_WSS', opciones: METODO_NOTIFICACION },
      { clave: 'nickname', etiqueta: 'Asunto (nickname)', tipo: 'texto', valor: 'Contrato de adhesión ASOPREP-FCPC' },
      { clave: 'showPdf', etiqueta: 'Mostrar el PDF al firmar', tipo: 'check', valor: true },
    ],
    archivos: { etiqueta: 'PDF a firmar', multiple: false },
    confirmar: 'Crear tarea envía correo y WhatsApp reales al firmante. ¿Continuar?',
  },
  {
    numero: 6,
    ruta: 'detalle-tarea',
    titulo: 'Detalle de tarea',
    llamada: 'GET /taskDetail/{processId}',
    descripcion: 'Estado, firmantes y evidencias. El pdfId solo aparece cuando la tarea está completada.',
    campos: [{ clave: 'processId', etiqueta: 'processId', tipo: 'texto', desde: 'processId' }],
  },
  {
    numero: 7,
    ruta: 'descargar-firmado',
    titulo: 'Descargar firmado',
    llamada: 'POST /base64?pdfId=',
    descripcion: 'Trae el PDF firmado.',
    campos: [{ clave: 'pdfId', etiqueta: 'pdfId', tipo: 'texto', desde: 'pdfId' }],
    descargaPdf: true,
  },
  {
    numero: 8,
    ruta: 'certificado-trazabilidad',
    titulo: 'Certificado de trazabilidad',
    llamada: 'GET /traceabilityCertificate/{processId}',
    descripcion: 'Certificado de trazabilidad (solo con la tarea completada).',
    campos: [{ clave: 'processId', etiqueta: 'processId', tipo: 'texto', desde: 'processId' }],
    descargaPdf: true,
  },
  {
    numero: 9,
    ruta: 'cancelar-tarea',
    titulo: 'Cancelar tarea',
    llamada: 'GET /cancelTask/{processId}',
    descripcion: 'Cancela la tarea (solo mientras está en proceso).',
    campos: [{ clave: 'processId', etiqueta: 'processId', tipo: 'texto', desde: 'processId' }],
    confirmar: 'Se cancelará la tarea en Security Data. ¿Continuar?',
  },
];
