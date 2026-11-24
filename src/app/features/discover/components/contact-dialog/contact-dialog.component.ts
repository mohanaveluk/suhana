import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../../../shared/modules/material.module';
import { ProviderContact } from '../../models/discover.model';

export interface ContactDialogData {
  name: string;
  contact: ProviderContact;
}

/** Shows only the channels the listing actually has; each one is a working link. */
@Component({
  selector: 'app-discover-contact-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  template: `
    <h2 mat-dialog-title>Contact {{ data.name }}</h2>
    <mat-dialog-content>
      @if (data.contact.phone || data.contact.email || data.contact.website) {
        <mat-nav-list class="cd__list">
          @if (data.contact.phone) {
            <a mat-list-item [href]="'tel:' + tel(data.contact.phone)">
              <mat-icon matListItemIcon>call</mat-icon>
              <span matListItemTitle>{{ data.contact.phone }}</span>
              <span matListItemLine>Call</span>
            </a>
          }
          @if (data.contact.email) {
            <a mat-list-item [href]="'mailto:' + data.contact.email">
              <mat-icon matListItemIcon>mail</mat-icon>
              <span matListItemTitle>{{ data.contact.email }}</span>
              <span matListItemLine>Email</span>
            </a>
          }
          @if (data.contact.website) {
            <a mat-list-item [href]="data.contact.website" target="_blank" rel="noopener noreferrer">
              <mat-icon matListItemIcon>language</mat-icon>
              <span matListItemTitle>{{ data.contact.website }}</span>
              <span matListItemLine>Website (opens in a new tab)</span>
            </a>
          }
        </mat-nav-list>
        <p class="cd__note">
          Aurora lists this service to help you find it; arrangements and payments are directly between you and the provider.
          Never share OTPs or pay in advance to anyone you haven't verified.
        </p>
      } @else {
        <p>This listing has no contact details yet.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .cd__list { padding-top: 0; }
    .cd__note { font-size: 13px; color: var(--suhana-text-secondary); margin: 12px 0 0; line-height: 1.5; }
  `],
})
export class ContactDialogComponent {
  protected readonly data = inject<ContactDialogData>(MAT_DIALOG_DATA);
  protected tel(v: string): string {
    return v.replace(/[^\d+]/g, '');
  }
}
