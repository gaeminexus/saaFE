import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-menucreditos',
  standalone: true,
  templateUrl: './menucreditos.component.html',
  styleUrls: ['./menucreditos.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatCardModule]
})
export class MenucreditosComponent { }
