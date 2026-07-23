import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MaterialModule } from '../../shared/modules/material.module';
import { CallingService } from '../../services/calling.service';

@Component({
  selector: 'app-incoming-call-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialModule],
  templateUrl: './incoming-call-dialog.component.html',
  styleUrl: './incoming-call-dialog.component.scss',
})
export class IncomingCallDialogComponent {
  protected readonly callingService = inject(CallingService);

  protected accept(): void {
    void this.callingService.acceptIncomingCall();
  }

  protected decline(): void {
    this.callingService.declineIncomingCall();
  }
}
