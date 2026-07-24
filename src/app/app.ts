import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';
import { HeartbeatService } from './services';
import { AiChatbotComponent } from './features/chatbot/chatbot.component';
import { IncomingCallDialogComponent } from './features/calling/incoming-call-dialog.component';
import { ActiveCallComponent } from './features/calling/active-call.component';
import { CallingService } from './services/calling.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, AiChatbotComponent],
  //imports: [RouterOutlet, HeaderComponent, FooterComponent, AiChatbotComponent, IncomingCallDialogComponent, ActiveCallComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Injecting here ensures each singleton is created on app boot and its
  // internal effect() starts watching auth state immediately.
  private readonly _heartbeat = inject(HeartbeatService);
  private readonly _calling = inject(CallingService);
}
