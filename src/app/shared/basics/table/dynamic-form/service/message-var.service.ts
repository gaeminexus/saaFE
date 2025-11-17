import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MessageVarService {

  infoPadre: any;

  private padre = new Subject<any>();
  padre$ = this.padre.asObservable();

  constructor() { }

  getParent(): any{
    return this.infoPadre;
  }

  setParent(parent: any): void {
    this.infoPadre = parent;
  }

  reload(parent: any): void {
    this.padre.next(parent);
  }

}
