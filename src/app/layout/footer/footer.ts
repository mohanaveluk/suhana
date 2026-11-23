import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { LANDING_PAGES } from '../../features/seo-pages/landing-pages.registry';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialModule],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  /** Crawlable links to every public landing page, so none of them is an orphan. */
  protected readonly featurePages = LANDING_PAGES.filter(p => p.kind === 'feature');
  protected readonly audiencePages = LANDING_PAGES.filter(p => p.kind === 'audience');
}
