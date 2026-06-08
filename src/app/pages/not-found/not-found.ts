import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';

@Component({
  selector: 'app-not-found',
  imports: [MaterialModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFoundComponent {
  protected readonly year = new Date().getFullYear();

  constructor(private readonly router: Router) {}

  goHome(): void { this.router.navigate(['/']); }
  goBack(): void { window.history.back(); }
}
