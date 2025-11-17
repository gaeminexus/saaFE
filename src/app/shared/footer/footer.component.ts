import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {

  footerText: string = '';

  constructor() { }

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.footerText = `Powered by GaemiNexus @ ${currentYear}`;
  }

  openGaemiNexusWebsite(): void {
    window.open('https://www.gaeminexus.com', '_blank', 'noopener,noreferrer');
  }

}
