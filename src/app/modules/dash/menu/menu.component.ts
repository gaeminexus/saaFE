import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../shared/services/usuario.service';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  usuarioNombre: string = '';

  constructor(private router: Router, private usuarioService: UsuarioService) {
    try {
      const usuario = this.usuarioService.getUsuarioLog();
      this.usuarioNombre = usuario?.nombre || '';
    } catch {
      this.usuarioNombre = '';
    }
  }

  ngOnInit() {
  // Debug para identificar el problema
  console.log('Menu component initialized');

  // Verificar si hay listeners problemáticos
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type: string, listener: any, options: any) {
    if (type === 'resize') {
      console.warn('Resize listener agregado desde:', new Error().stack);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}

  onSalir() {
    this.router.navigate(['/login']);
  }

  navigate(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }
}
