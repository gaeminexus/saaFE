import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosRrh {
  public static RS_EMPL = `${API_URL}/empl`;
  // Agregar más endpoints de RRHH acá según necesidades
}
