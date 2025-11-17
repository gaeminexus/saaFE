import { Injectable } from '@angular/core';
import { Router, NavigationEnd, Event as RouterEvent } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NavService {

  public appDrawer: any;
  public currentUrl = new BehaviorSubject<string>('');

  private muestraFondo = true;

  constructor(
    private router: Router
  ) {
    this.router.events
      .pipe(
        filter((event: RouterEvent): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.next(event.urlAfterRedirects);
      });
  }

  setMuestraFondo(valor: boolean): void {
    this.muestraFondo = valor;
  }

  getMuestraFondo(): boolean {
    return this.muestraFondo;
  }

  // tslint:disable-next-line: typedef
  public closeNav() {
    if (this.appDrawer) {
      this.appDrawer.close();
    }
  }

  // tslint:disable-next-line: typedef
  public openNav() {
    if (this.appDrawer) {
      this.appDrawer.open();
    }
  }

}
