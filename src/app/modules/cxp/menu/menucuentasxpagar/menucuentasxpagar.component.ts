import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

@Component({
	selector: 'app-menucuentaxpagar',
	standalone: true,
	templateUrl: './menucuentasxpagar.component.html',
	styleUrls: ['./menucuentasxpagar.component.scss'],
	imports: [
		RouterModule,
		MaterialFormModule
	]
})
export class MenucuentaxpagarComponent {
	isCollapsed = false;
}
