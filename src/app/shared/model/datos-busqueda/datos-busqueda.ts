import { TipoComandosBusqueda } from "./tipo-comandos-busqueda";

/**
 * Clase para configurar criterios de búsqueda avanzada en el backend.
 *
 * Permite construir consultas dinámicas con múltiples campos, operadores,
 * ordenamiento y agrupación mediante paréntesis.
 *
 * @example
 * // Búsqueda simple por nombre
 * const db = new DatosBusqueda();
 * db.asigna3(TipoDatos.STRING, 'nombre', 'Juan', TipoComandosBusqueda.LIKE);
 *
 * @example
 * // Búsqueda con rango de fechas (BETWEEN)
 * const db = new DatosBusqueda();
 * db.asignaUnCampoConBetween('fechaNacimiento', TipoDatos.DATE, '2000-01-01', TipoComandosBusqueda.BETWEEN, '2000-12-31');
 *
 * @example
 * // Búsqueda en campo padre (JOIN)
 * const db = new DatosBusqueda();
 * db.asignaValorConCampoPadre(TipoDatos.LONG, 'filial', 'id', '123', TipoComandosBusqueda.IGUAL);
 */
export class DatosBusqueda {

    /** Indica que el valor debe ser truncado en la búsqueda */
    public static readonly TRUNCADO = 1;

    /** No truncar el valor (comportamiento por defecto) */
    public static readonly NO_TRUNCADO = 0;

    /** Indica que se debe usar campo1 (campo adicional) */
    public static readonly SI_CAMPO1 = 1;

    /** No usar campo1 (comportamiento por defecto) */
    public static readonly NO_CAMPO1 = 0;

    /** Incluir ORDER BY con el campo principal */
    public static readonly CAMPO_ORDER_BY = 1;

    /** Solo configurar ORDER BY (sin incluir en WHERE) */
    public static readonly SOLO_CAMPO_ORDER_BY = 2;

    /** No incluir ORDER BY */
    public static readonly NO_CAMPO_ORDER_BY = 0;

    /** Usar paréntesis para agrupación lógica */
    public static readonly USA_PARENTESIS = 1;

    /** No usar paréntesis (comportamiento por defecto) */
    public static readonly NO_USA_PARENTESIS = 0;

    /** Ordenamiento ascendente (A-Z, 0-9) */
    public static readonly ORDER_ASC = 1;

    /** Ordenamiento descendente (Z-A, 9-0) */
    public static readonly ORDER_DESC = 2;

    private tipoDato = -1;
    private campo: string | undefined;
    private campo1: string | undefined;
    private valor: string | undefined;
    private valor1: string | undefined;
    private tipoComparacion!: number;
    private truncado: number = DatosBusqueda.NO_TRUNCADO;
    private tipoOperadorLogico: number = TipoComandosBusqueda.AND;
    private campoAdicional = DatosBusqueda.NO_CAMPO1;
    private campoOrderBy = DatosBusqueda.NO_CAMPO_ORDER_BY;
    private tipoOrden = 0;
    private parentesis = DatosBusqueda.NO_USA_PARENTESIS;
    private numeroCampoRepetido = 1;

    constructor(){}

    /**
     * Asigna todos los parámetros completos para configurar búsqueda avanzada.
     *
     * Este es el método más completo que permite configurar todos los aspectos
     * de un criterio de búsqueda incluyendo operadores lógicos, ordenamiento y paréntesis.
     *
     * @param tipoDato Tipo de dato del campo (usar constantes de TipoDatosBusqueda)
     * @param campo Nombre del campo principal a buscar
     * @param campo1 Nombre del campo adicional (para JOINs o campos compuestos)
     * @param valor Valor principal de búsqueda
     * @param valor1 Valor adicional (usado en BETWEEN u operadores con dos valores)
     * @param tipoComparacion Tipo de comparación (usar constantes de TipoComandosBusqueda)
     * @param truncado Si se debe truncar el valor (TRUNCADO o NO_TRUNCADO)
     * @param tipoOperadorLogico Operador lógico (TipoComandosBusqueda.AND o OR)
     * @param campoAdicional Si usa campo1 (SI_CAMPO1 o NO_CAMPO1)
     * @param campoOrderBy Configuración de ORDER BY (CAMPO_ORDER_BY, SOLO_CAMPO_ORDER_BY o NO_CAMPO_ORDER_BY)
     * @param tipoOrden Tipo de ordenamiento (ORDER_ASC o ORDER_DESC)
     * @param parentesis Si usa paréntesis (USA_PARENTESIS o NO_USA_PARENTESIS)
     * @param numeroCampoRepetido Número de repetición cuando el mismo campo aparece varias veces
     *
     * @example
     * db.asigna1(TipoDatos.STRING, 'nombre', '', 'Juan', '', TipoComandosBusqueda.LIKE,
     *           DatosBusqueda.NO_TRUNCADO, TipoComandosBusqueda.AND, DatosBusqueda.NO_CAMPO1,
     *           DatosBusqueda.CAMPO_ORDER_BY, DatosBusqueda.ORDER_ASC,
     *           DatosBusqueda.NO_USA_PARENTESIS, 1);
     */
    asigna1(tipoDato: number, campo: string, campo1: string,
            valor: string, valor1: string, tipoComparacion: number,
            truncado: number, tipoOperadorLogico: number, campoAdicional: number,
            campoOrderBy: number, tipoOrden: number,
            parentesis: number, numeroCampoRepetido: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.campo1 = campo1;
        this.valor = valor;
        this.valor1	= valor1;
        this.tipoComparacion = tipoComparacion;
        this.truncado = truncado;
        this.tipoOperadorLogico = tipoOperadorLogico;
        this.campoAdicional = campoAdicional;
        this.campoOrderBy = campoOrderBy;
        this.tipoOrden = tipoOrden;
        this.parentesis = parentesis;
        this.numeroCampoRepetido = numeroCampoRepetido;
    }

    /**
     * Asigna búsqueda con dos campos, dos valores y operador lógico.
     *
     * Útil para búsquedas complejas que involucran múltiples campos
     * o rangos de valores sin necesidad de configurar ordenamiento.
     *
     * @param tipoDato Tipo de dato del campo
     * @param campo Nombre del campo principal
     * @param campo1 Nombre del campo adicional
     * @param valor Valor principal de búsqueda
     * @param valor1 Valor adicional
     * @param tipoComparacion Tipo de comparación
     * @param truncado Si se debe truncar el valor
     * @param tipoOperadorLogico Operador lógico (AND/OR)
     * @param campoAdicional Si usa campo1
     *
     * @example
     * // Buscar entre dos campos con OR
     * db.asigna2(TipoDatos.STRING, 'correoPersonal', 'correoInstitucional',
     *           'juan@email.com', '', TipoComandosBusqueda.LIKE,
     *           DatosBusqueda.NO_TRUNCADO, TipoComandosBusqueda.OR, DatosBusqueda.SI_CAMPO1);
     */
    asigna2(tipoDato: number, campo: string, campo1: string,
            valor: string, valor1: string, tipoComparacion: number,
            truncado: number, tipoOperadorLogico: number, campoAdicional: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.campo1 = campo1;
        this.valor = valor;
        this.valor1	= valor1;
        this.tipoComparacion = tipoComparacion;
        this.truncado = truncado;
        this.tipoOperadorLogico = tipoOperadorLogico;
        this.campoAdicional = campoAdicional;
    }

    /**
     * Asigna búsqueda simple con campo, valor y tipo de comparación.
     *
     * Método más común para búsquedas básicas de un solo campo.
     * Usa valores por defecto para truncado, operador lógico, etc.
     *
     * @param tipoDato Tipo de dato del campo (STRING, INTEGER, LONG, DATE, etc.)
     * @param campo Nombre del campo a buscar
     * @param valor Valor a buscar
     * @param tipoComparacion Operador de comparación (IGUAL, LIKE, MAYOR, MENOR, etc.)
     *
     * @example
     * // Búsqueda exacta
     * db.asignaUnCampoSinTrunc(TipoDatos.STRING, 'numeroIdentificacion', '1234567890', TipoComandosBusqueda.IGUAL);
     *
     * @example
     * // Búsqueda con LIKE
     * db.asignaUnCampoSinTrunc(TipoDatos.STRING, 'razonSocial', 'Juan', TipoComandosBusqueda.LIKE);
     */
    asignaUnCampoSinTrunc(tipoDato: number, campo: string,
            valor: string, tipoComparacion: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
    }

    /**
     * Asigna búsqueda simple con opción de truncado.
     *
     * Similar a asigna3 pero permite especificar si se debe truncar el valor.
     *
     * @param tipoDato Tipo de dato del campo
     * @param campo Nombre del campo a buscar
     * @param valor Valor a buscar
     * @param tipoComparacion Operador de comparación
     * @param truncado Si se debe truncar el valor (TRUNCADO o NO_TRUNCADO)
     *
     * @example
     * db.asigna4(TipoDatos.STRING, 'descripcion', 'texto largo...',
     *           TipoComandosBusqueda.LIKE, DatosBusqueda.TRUNCADO);
     */
    asigna4(tipoDato: number, campo: string,
            valor: string, tipoComparacion: number,
            truncado: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.truncado = truncado;
    }

    /**
     * Asigna búsqueda con truncado y operador lógico.
     *
     * Permite especificar el operador lógico (AND/OR) para combinar
     * con otros criterios de búsqueda.
     *
     * @param tipoDato Tipo de dato del campo
     * @param campo Nombre del campo a buscar
     * @param valor Valor a buscar
     * @param tipoComparacion Operador de comparación
     * @param truncado Si se debe truncar el valor
     * @param tipoOperadorLogico Operador lógico (AND/OR)
     *
     * @example
     * // Primer criterio con AND
     * db1.asignaUnCampoSinTrunc(TipoDatos.STRING, 'nombre', 'Juan', TipoComandosBusqueda.LIKE);
     * // Segundo criterio con OR
     * db2.asigna5(TipoDatos.STRING, 'apellido', 'Pérez', TipoComandosBusqueda.LIKE,
     *            DatosBusqueda.NO_TRUNCADO, TipoComandosBusqueda.OR);
     */
    asigna5(tipoDato: number, campo: string, valor: string,
            tipoComparacion: number, truncado: number,
            tipoOperadorLogico: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.truncado = truncado;
        this.tipoOperadorLogico = tipoOperadorLogico;
    }

    /**
     * Asigna búsqueda con campo, valor y operador lógico.
     *
     * Variante que coloca el campo como primer parámetro y permite
     * especificar el operador lógico.
     *
     * @param campo Nombre del campo a buscar
     * @param tipoDato Tipo de dato del campo
     * @param valor Valor a buscar
     * @param tipoComparacion Operador de comparación
     * @param tipoOperadorLogico Operador lógico (AND/OR)
     *
     * @example
     * db.asigna6('email', TipoDatos.STRING, 'juan@email.com',
     *           TipoComandosBusqueda.LIKE, TipoComandosBusqueda.OR);
     */
    asigna6(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, tipoOperadorLogico: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.tipoOperadorLogico = tipoOperadorLogico;
    }

    /**
     * Asigna búsqueda con dos valores (rango BETWEEN u operadores duales).
     *
     * Ideal para búsquedas con rangos de fechas, números o búsquedas
     * que requieren dos valores de comparación.
     *
     * @param campo Nombre del campo a buscar
     * @param tipoDato Tipo de dato del campo
     * @param valor Valor inicial del rango
     * @param tipoComparacion Operador de comparación (típicamente BETWEEN)
     * @param valor1 Valor final del rango
     *
     * @example
     * // Búsqueda de fechas entre dos valores
     * db.asignaUnCampoConBetween('fechaNacimiento', TipoDatos.DATE, '2000-01-01',
     *           TipoComandosBusqueda.BETWEEN, '2000-12-31');
     *
     * @example
     * // Búsqueda de edad entre rangos
     * db.asignaUnCampoConBetween('edad', TipoDatos.INTEGER, '18',
     *           TipoComandosBusqueda.BETWEEN, '65');
     */
    asignaUnCampoConBetween(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, valor1: string): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.valor1 = valor1;
    }

    /**
     * Asigna búsqueda con dos valores y opción de truncado.
     *
     * Combina la funcionalidad de asignaUnCampoConBetween con la capacidad de truncar valores.
     *
     * @param campo Nombre del campo a buscar
     * @param tipoDato Tipo de dato del campo
     * @param valor Valor inicial del rango
     * @param tipoComparacion Operador de comparación
     * @param valor1 Valor final del rango
     * @param truncado Si se debe truncar los valores
     *
     * @example
     * db.asignaUnCampoTruncadoConBetween('monto', TipoDatos.DECIMAL, '100.00',
     *           TipoComandosBusqueda.BETWEEN, '500.00', DatosBusqueda.TRUNCADO);
     */
    asignaUnCampoTruncadoConBetween(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, valor1: string, truncado: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.valor1 = valor1;
        this.truncado = truncado;
    }

    /**
     * Asigna búsqueda en campo de entidad padre (relación JOIN).
     *
     * Permite buscar valores en campos de entidades relacionadas.
     * Útil para filtrar por propiedades de objetos anidados.
     *
     * @param tipoDato Tipo de dato del campo padre
     * @param campo Nombre del campo padre (nombre de la relación)
     * @param campo1 Nombre del campo específico en el objeto padre
     * @param valor Valor a buscar en el campo del padre
     * @param tipoComparacion Operador de comparación
     *
     * @example
     * // Buscar entidades por ID de filial
     * db.asignaValorConCampoPadre(TipoDatos.LONG, 'filial', 'id', '123', TipoComandosBusqueda.IGUAL);
     *
     * @example
     * // Buscar por código de tipo identificación
     * db.asignaValorConCampoPadre(TipoDatos.STRING, 'tipoIdentificacion', 'codigo',
     *                            'CED', TipoComandosBusqueda.IGUAL);
     */
    asignaValorConCampoPadre(tipoDato: number, campo: string, campo1: string,
                             valor: string, tipoComparacion: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.campo1 = campo1;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.campoAdicional = DatosBusqueda.SI_CAMPO1;
    }

    /**
     * Asigna un comando especial de búsqueda.
     *
     * Usado para comandos que no son búsquedas de valores sino
     * instrucciones estructurales como abrir/cerrar paréntesis.
     *
     * @param tipoComando Tipo de comando (ABRE_PARENTESIS o CIERRA_PARENTESIS)
     *
     * @remarks
     * Este método solo asigna el tipo de comparación. Para paréntesis,
     * también debe llamarse a usaParentesis().
     *
     * @example
     * // Abrir paréntesis
     * const dbOpen = new DatosBusqueda();
     * dbOpen.asignaComando(TipoComandosBusqueda.ABRE_PARENTESIS);
     * dbOpen.usaParentesis(true);
     *
     * @example
     * // Cerrar paréntesis
     * const dbClose = new DatosBusqueda();
     * dbClose.asignaComando(TipoComandosBusqueda.CIERRA_PARENTESIS);
     * dbClose.usaParentesis(true);
     */
    asignaComando(tipoComando: number): void {
        this.tipoComparacion = tipoComando;
    }

    /**
     * Configura ordenamiento por el campo especificado.
     *
     * Define el campo por el cual se ordenarán los resultados.
     * Debe usarse junto con setTipoOrden() para especificar ASC o DESC.
     *
     * @param campo Nombre del campo por el cual ordenar los resultados
     *
     * @remarks
     * Este método automáticamente configura `campoOrderBy` como SOLO_CAMPO_ORDER_BY,
     * lo que significa que el campo solo se usa para ordenar, no para filtrar.
     *
     * @example
     * // Ordenar por razón social
     * const dbOrderBy = new DatosBusqueda();
     * dbOrderBy.orderBy('razonSocial');
     * dbOrderBy.setTipoOrden(DatosBusqueda.ORDER_ASC);
     *
     * @example
     * // Ordenar por fecha descendente
     * const dbOrderBy = new DatosBusqueda();
     * dbOrderBy.orderBy('fechaCreacion');
     * dbOrderBy.setTipoOrden(DatosBusqueda.ORDER_DESC);
     */
    orderBy(campo: string): void
    {
        this.campo = campo;
        this.campoOrderBy = DatosBusqueda.SOLO_CAMPO_ORDER_BY;
    }

    /**
     * Configura el uso de paréntesis para agrupación lógica.
     *
     * Permite agrupar condiciones con paréntesis en consultas complejas.
     * Útil para crear expresiones como: (A OR B) AND (C OR D).
     *
     * @param tipo Tipo de comando (ABRE_PARENTESIS o CIERRA_PARENTESIS de TipoComandosBusqueda)
     *
     * @remarks
     * Automáticamente configura `parentesis` como USA_PARENTESIS y asigna
     * el tipo de operador lógico proporcionado.
     *
     * @example
     * // Crear búsqueda: (correoPersonal LIKE 'juan' OR correoInstitucional LIKE 'juan')
     * const dbOpen = new DatosBusqueda();
     * dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
     *
     * const db1 = new DatosBusqueda();
     * db1.asignaUnCampoSinTrunc(TipoDatos.STRING, 'correoPersonal', 'juan', TipoComandosBusqueda.LIKE);
     * db1.setNumeroCampoRepetido(1);
     *
     * const db2 = new DatosBusqueda();
     * db2.asignaUnCampoSinTrunc(TipoDatos.STRING, 'correoInstitucional', 'juan', TipoComandosBusqueda.LIKE);
     * db2.setTipoOperadorLogico(TipoComandosBusqueda.OR);
     * db2.setNumeroCampoRepetido(2);
     *
     * const dbClose = new DatosBusqueda();
     * dbClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
     */
    usaParentesis(tipo: number): void {
        this.tipoOperadorLogico = tipo;
        this.parentesis = DatosBusqueda.USA_PARENTESIS;
    }

    /**
     * Establece si el valor debe ser truncado.
     *
     * @param valor TRUNCADO (1) o NO_TRUNCADO (0)
     *
     * @example
     * db.setTruncado(DatosBusqueda.TRUNCADO);
     */
    setTruncado(valor: any): void {
        this.truncado = valor;
    }

    /**
     * Establece el número de repetición del campo.
     *
     * Usado cuando el mismo campo aparece múltiples veces en la consulta
     * con diferentes condiciones (ej: en grupos OR).
     *
     * @param valor Número de repetición (1, 2, 3, etc.)
     *
     * @example
     * // Primer uso del campo 'email'
     * db1.asignaUnCampoSinTrunc(TipoDatos.STRING, 'email', 'juan@personal.com', TipoComandosBusqueda.LIKE);
     * db1.setNumeroCampoRepetido(1);
     *
     * // Segundo uso del campo 'email' con OR
     * db2.asignaUnCampoSinTrunc(TipoDatos.STRING, 'email', 'juan@empresa.com', TipoComandosBusqueda.LIKE);
     * db2.setTipoOperadorLogico(TipoComandosBusqueda.OR);
     * db2.setNumeroCampoRepetido(2);
     */
    setNumeroCampoRepetido(valor: any): void {
        this.numeroCampoRepetido = valor;
    }

    /**
     * Establece el operador lógico para combinar con otros criterios.
     *
     * @param tipoOperadorLogico TipoComandosBusqueda.AND o TipoComandosBusqueda.OR
     *
     * @example
     * // Combinar criterios con OR
     * db.asignaUnCampoSinTrunc(TipoDatos.STRING, 'apellido', 'García', TipoComandosBusqueda.LIKE);
     * db.setTipoOperadorLogico(TipoComandosBusqueda.OR);
     */
    setTipoOperadorLogico(tipoOperadorLogico: number): void {
        this.tipoOperadorLogico = tipoOperadorLogico;
    }

    /**
     * Establece el tipo de ordenamiento de los resultados.
     *
     * @param tipoOrden ORDER_ASC (ascendente) o ORDER_DESC (descendente)
     *
     * @remarks
     * Debe usarse junto con orderBy() para especificar el campo de ordenamiento.
     *
     * @example
     * db.orderBy('fechaCreacion');
     * db.setTipoOrden(DatosBusqueda.ORDER_DESC);
     */
    setTipoOrden(tipoOrden: number): void {
        this.tipoOrden = tipoOrden;
    }

}
