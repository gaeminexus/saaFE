import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
	selector: 'app-menucuentaxpagar',
	standalone: true,
	templateUrl: './menucuentasxpagar.component.html',
	styleUrls: ['./menucuentasxpagar.component.scss'],
	imports: [
		CommonModule,
		RouterModule,
		MatSidenavModule,
		MatListModule,
		MatIconModule,
		MatButtonModule,
		MatExpansionModule
	]
})
export class MenucuentaxpagarComponent {
	isCollapsed = false;
}
