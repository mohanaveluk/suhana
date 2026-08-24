import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { HelpFaq } from '../../help-center.model';

@Component({
  selector: 'app-featured-faqs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './featured-faqs.component.html',
  styleUrl: './featured-faqs.component.scss',
})
export class FeaturedFaqsComponent {
  readonly faqs = input.required<HelpFaq[]>();
  readonly loading = input(false);
}
