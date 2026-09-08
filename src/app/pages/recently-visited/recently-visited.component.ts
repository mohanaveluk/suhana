import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { RecentlyVisitedProfileComponent } from '../../shared/components/recently-visited-profile/recently-visited-profile';

@Component({
  selector: 'app-recently-visited',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, MaterialModule, RecentlyVisitedProfileComponent],
  templateUrl: './recently-visited.component.html',
  styleUrl: './recently-visited.component.scss',
})
export class RecentlyVisitedComponent {}
