import { TipoComandosBusqueda } from "./tipo-comandos-busqueda";

export class DatosBusqueda {

    public static readonly TRUNCADO = 1;
    public static readonly NO_TRUNCADO = 0;
    public static readonly SI_CAMPO1 = 1;
    public static readonly NO_CAMPO1 = 0;
    public static readonly CAMPO_ORDER_BY = 1;
    public static readonly SOLO_CAMPO_ORDER_BY = 2;
    public static readonly NO_CAMPO_ORDER_BY = 0;
    public static readonly USA_PARENTESIS = 1;
    public static readonly NO_USA_PARENTESIS = 0;
    public static readonly ORDER_ASC = 1;
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

    asigna3(tipoDato: number, campo: string,
            valor: string, tipoComparacion: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
    }

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

    asigna6(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, tipoOperadorLogico: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.tipoOperadorLogico = tipoOperadorLogico;
    }

    asigna7(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, valor1: string): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.valor1 = valor1;
    }

    asigna8(campo: string, tipoDato: number, valor: string,
            tipoComparacion: number, valor1: string, truncado: number): void
    {
        this.tipoDato = tipoDato;
        this.campo = campo;
        this.valor = valor;
        this.tipoComparacion = tipoComparacion;
        this.valor1 = valor1;
        this.truncado = truncado;
    }

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

    orderBy(campo: string): void
    {
        this.campo = campo;
        this.campoOrderBy = DatosBusqueda.SOLO_CAMPO_ORDER_BY;
    }

    usaParentesis(tipo: number): void {
        this.tipoOperadorLogico = tipo;
        this.parentesis = DatosBusqueda.USA_PARENTESIS;
    }

    setTruncado(valor: any): void {
        this.truncado = valor;
    }

    setNumeroCampoRepetido(valor: any): void {
        this.numeroCampoRepetido = valor;
    }

    setTipoOperadorLogico(tipoOperadorLogico: number): void {
        this.tipoOperadorLogico = tipoOperadorLogico;
    }

    setTipoOrden(tipoOrden: number): void {
        this.tipoOrden = tipoOrden;
    }

}