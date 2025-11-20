import { Component, HostBinding, Input, OnInit, forwardRef } from '@angular/core';
import { MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition, MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../../services/usuario.service';
import { NavItem } from '../../model/nav-item';
import { NavService } from '../../service/nav.service';
import { MaterialFormModule } from '../../../../modules/material-form.module';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-menu-list',
  imports: [
    MaterialFormModule,
    forwardRef(() => MenuListComponent), // Para recursión
  ],
  templateUrl: './menu-list.component.html',
  styleUrl: './menu-list.component.scss',
  animations: [
    trigger('indicatorRotate', [
      state('collapsed', style({transform: 'rotate(0deg)'})),
      state('expanded', style({transform: 'rotate(180deg)'})),
      transition('expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4,0.0,0.2,1)')
      ),
    ]),
  ],
})
export class MenuListComponent implements OnInit {

  expanded = false;
  @HostBinding('attr.aria-expanded') ariaExpanded = this.expanded;
  @Input()
  item!: NavItem;
  @Input() depth: number = 0; // Valor por defecto para evitar undefined

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    public navService: NavService,
    public router: Router,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
  ) {
    // La inicialización de @Input properties se hace en ngOnInit o ngOnChanges
    // No en el constructor
  }

  ngOnInit(): void {
    // Asegurar que depth tenga un valor válido
    if (this.depth === undefined || this.depth === null) {
      this.depth = 0;
    }

    this.navService.currentUrl.subscribe((url: string) => {
      if (this.item.route && url) {
        // Verificar si la URL coincide con la ruta del item padre
        const matchesParent = url.indexOf(`/${this.item.route}`) === 0;

        // Verificar si algún hijo tiene la URL activa
        const hasActiveChild = this.item.children?.some(child =>
          child.route && url.includes(child.route)
        ) ?? false;

        // Expandir si coincide el padre O tiene un hijo activo
        this.expanded = matchesParent || hasActiveChild;
        this.ariaExpanded = this.expanded;
      }
    });
  }

  onItemSelected(item: NavItem): void {
    /*if (!item.children || !item.children.length) {
      if (item.idPermiso) {
        this.usuarioService.verificaPermiso(
          this.usuarioService.getEmpresaLog().codigo,
          this.usuarioService.getUsuarioLog().codigo,
          item.idPermiso
        ).subscribe(result =>
          {
            if (result === 'OK') {
              this.router.navigate([item.route]);
              this.navService.closeNav();
            } else {
              this.openSnackBar(result.toUpperCase());
            }
          }
        );
      } else {
        this.router.navigate([item.route]);
        this.navService.closeNav();
      }
    }*/
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
      this.navService.setMuestraFondo(false);
      this.navService.closeNav();
    }
    if (item.children && item.children.length) {
      this.expanded = !this.expanded;
    }
  }

  openSnackBar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Aceptar', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  isRouteActive(route: string): boolean {
    if (!route) return false;
    // Usar router.url para comparar con la ruta actual
    return this.router.url.includes(route) || this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

}
