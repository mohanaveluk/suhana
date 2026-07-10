import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';
import { HeartbeatService } from './services';
import { AiChatbotComponent } from './features/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, AiChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // Injecting here ensures the singleton is created on app boot and the
  // internal effect() starts watching auth state immediately.
  private readonly _heartbeat = inject(HeartbeatService);
}
