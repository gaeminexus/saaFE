import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiciosShare } from './ws-share';
import { ServiciosCrd } from '../../modules/crd/service/ws-crd';
import { DetallePrestamo } from '../../modules/crd/model/detalle-prestamo';

// Interfaces para las respuestas del servidor
export interface FileResponse {
  success: boolean;
  message: string;
  filePath: string | null;
}

export interface FileListResponse {
  success: boolean;
  message: string;
  files: string[] | null;
}

export interface FileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface FileInfoResponse {
  success: boolean;
  message: string;
  fileInfo: FileInfo | null;
}

export interface FileValidationResponse {
  success: boolean;
  message: string;
  extensionValida: boolean;
  tamañoValido: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  // URL base del servicio de archivos
  private readonly baseUrl = ServiciosShare.RS_FILE;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  // Extensiones permitidas
  private readonly allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.jpg', '.jpeg', '.png', '.gif', '.txt'
  ];

  // Tamaño máximo de archivo en bytes (10 MB)
  private readonly maxFileSize = 10 * 1024 * 1024;

  constructor(private http: HttpClient) { }

  /**
   * Valida la extensión del archivo
   * @param fileName Nombre del archivo
   * @returns true si la extensión es válida
   */
  validateExtension(fileName: string): boolean {
    if (!fileName) return false;

    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return this.allowedExtensions.includes(extension);
  }

  /**
   * Valida el tamaño del archivo
   * @param fileSize Tamaño del archivo en bytes
   * @returns true si el tamaño es válido
   */
  validateFileSize(fileSize: number): boolean {
    return fileSize <= this.maxFileSize;
  }

  /**
   * Valida un archivo (extensión y tamaño)
   * @param file Archivo a validar
   * @returns Objeto con resultado de validación
   */
  validateFile(file: File): { valid: boolean; message: string } {
    if (!this.validateExtension(file.name)) {
      return {
        valid: false,
        message: `Extensión no permitida. Extensiones válidas: ${this.allowedExtensions.join(', ')}`
      };
    }

    if (!this.validateFileSize(file.size)) {
      return {
        valid: false,
        message: `El archivo excede el tamaño máximo permitido de ${this.maxFileSize / (1024 * 1024)} MB`
      };
    }

    return { valid: true, message: 'Archivo válido' };
  }

  /**
   * Sube un archivo al servidor (ruta por defecto)
   * @param file Archivo a subir
   * @returns Observable con la respuesta del servidor
   */
  uploadFile(file: File): Observable<FileResponse> {
    const url = `${this.baseUrl}/upload?fileName=${encodeURIComponent(file.name)}`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/octet-stream'
    });

    return this.http.post<FileResponse>(url, file, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Sube un archivo al servidor con ruta personalizada
   * @param file Archivo a subir
   * @param uploadPath Ruta personalizada para el upload
   * @returns Observable con la respuesta del servidor
   */
  uploadFileCustomPath(file: File, uploadPath: string): Observable<FileResponse> {
    const url = `${this.baseUrl}/upload/custom?fileName=${encodeURIComponent(file.name)}&uploadPath=${encodeURIComponent(uploadPath)}`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/octet-stream'
    });

    return this.http.post<FileResponse>(url, file, { headers })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Descarga un archivo del servidor
   * @param filePath Ruta del archivo en el servidor
   * @returns Observable con el Blob del archivo
   */
  downloadFile(filePath: string): Observable<Blob> {
    const url = `${this.baseUrl}/download?filePath=${encodeURIComponent(filePath)}`;

    return this.http.get(url, {
      responseType: 'blob',
      observe: 'response'
    }).pipe(
      map(response => {
        // Extraer el nombre del archivo del header Content-Disposition si existe
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = 'download';

        if (contentDisposition) {
          const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, '');
          }
        }

        // Retornar el blob
        return response.body as Blob;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Descarga un archivo y lo guarda automáticamente
   * @param filePath Ruta del archivo en el servidor
   * @param saveFileName Nombre con el que se guardará el archivo (opcional)
   */
  downloadAndSaveFile(filePath: string, saveFileName?: string): void {
    this.downloadFile(filePath).subscribe({
      next: (blob) => {
        // Crear un enlace temporal para descargar el archivo
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Usar el nombre proporcionado o extraer el nombre del filePath
        const fileName = saveFileName || filePath.substring(filePath.lastIndexOf('/') + 1);
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Liberar el objeto URL
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar archivo:', error);
      }
    });
  }

  /**
   * Elimina un archivo del servidor
   * @param filePath Ruta del archivo a eliminar
   * @returns Observable con la respuesta del servidor
   */
  deleteFile(filePath: string): Observable<FileResponse> {
    const url = `${this.baseUrl}/delete?filePath=${encodeURIComponent(filePath)}`;

    return this.http.delete<FileResponse>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Lista archivos en un directorio
   * @param directoryPath Ruta del directorio (opcional, usa 'uploads/' por defecto)
   * @returns Observable con la lista de archivos
   */
  listFiles(directoryPath?: string): Observable<FileListResponse> {
    let url = `${this.baseUrl}/list`;

    if (directoryPath) {
      url += `?directoryPath=${encodeURIComponent(directoryPath)}`;
    }

    return this.http.get<FileListResponse>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene información de un archivo
   * @param filePath Ruta del archivo
   * @returns Observable con la información del archivo
   */
  getFileInfo(filePath: string): Observable<FileInfoResponse> {
    const url = `${this.baseUrl}/info?filePath=${encodeURIComponent(filePath)}`;

    return this.http.get<FileInfoResponse>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Valida un archivo en el servidor (extensión y tamaño)
   * @param fileName Nombre del archivo
   * @param fileSize Tamaño del archivo en bytes
   * @returns Observable con el resultado de la validación
   */
  validateFileServer(fileName: string, fileSize?: number): Observable<FileValidationResponse> {
    let params = new HttpParams().set('fileName', fileName);

    if (fileSize !== undefined) {
      params = params.set('fileSize', fileSize.toString());
    }

    const url = `${this.baseUrl}/validate`;

    return this.http.get<FileValidationResponse>(url, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las extensiones permitidas
   * @returns Array de extensiones permitidas
   */
  getAllowedExtensions(): string[] {
    return [...this.allowedExtensions];
  }

  /**
   * Obtiene el tamaño máximo permitido en bytes
   * @returns Tamaño máximo en bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * Formatea el tamaño del archivo en formato legible
   * @param bytes Tamaño en bytes
   * @returns String formateado (ej: "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  selectByCriteria(datos: any): Observable<DetallePrestamo[] | null> {
      const wsEndpoint = '/selectByCriteria/';
      const url = `${this.baseUrl}${wsEndpoint}`;
      console.log('FileService - selectByCriteria - URL: ' + url);
      return this.http.post<any>(url, datos, this.httpOptions).pipe(
        catchError(this.handleError)
      );
    }

    getById(id: string): Observable<DetallePrestamo | null> {
    const wsGetById = '/getId/';
    const url = `${this.baseUrl}${wsGetById}${id}`;
    return this.http.get<DetallePrestamo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Manejo de errores HTTP
   * @param error Error de HTTP
   * @returns Observable con el error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.error && typeof error.error === 'object') {
        errorMessage = error.error.message || `Error ${error.status}: ${error.statusText}`;
      } else if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Error en FileService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
