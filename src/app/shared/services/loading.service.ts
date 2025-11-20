import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();
  private requestCount = 0;

  constructor(private ngZone: NgZone) {}

  show(): void {
    // Ejecutar dentro de la zona de Angular para asegurar detección de cambios
    this.ngZone.run(() => {
      this.requestCount++;
      if (this.requestCount === 1) {
        this.loadingSubject.next(true);
      }
    });
  }

  hide(): void {
    this.ngZone.run(() => {
      this.requestCount--;
      if (this.requestCount <= 0) {
        this.requestCount = 0;
        this.loadingSubject.next(false);
      }
    });
  }

  get isLoading(): boolean {
    return this.loadingSubject.value;
  }
}
