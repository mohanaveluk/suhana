import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { MatchService } from '../../services';
import { MatchResult } from '../../models/user.model';

@Component({
  selector: 'app-shortlist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, MaterialModule,
  ],
  templateUrl: './shortlist.html',
  styleUrl: './shortlist.scss',
})
export class ShortlistComponent implements OnInit {
  protected readonly matchService = inject(MatchService);
  protected readonly shortlistedMatches = signal<MatchResult[]>([]);
  protected readonly interestedMatches = signal<MatchResult[]>([]);
  protected readonly connectedMatches = signal<MatchResult[]>([]);

  async ngOnInit(): Promise<void> {
    // Load matches from API first, fallback to local generation
    await this.matchService.loadMatchesFromApi();
    if (this.matchService.matches().length === 0) {
      this.matchService.generateMatches('bride', 4);
    }
    const allMatches = this.matchService.matches();
    // Shortlist first 2 for demo
    // if (allMatches.length >= 2) {
    //   this.matchService.shortlist(allMatches[0].id);
    //   this.matchService.shortlist(allMatches[1].id);
    // }
    // if (allMatches.length >= 3) {
    //   this.matchService.expressInterest(allMatches[2].id);
    // }

    this.refreshLists();
  }

  refreshLists(): void {
    const all = this.matchService.matches();
    this.shortlistedMatches.set(all.filter(m => m.status === 'shortlisted'));
    this.interestedMatches.set(all.filter(m => m.status === 'interested'));
    this.connectedMatches.set(all.filter(m => m.status === 'connected'));
  }

  removeShortlist(matchId: string): void {
    this.matchService.removeShortlist(matchId);
    this.refreshLists();
  }

  expressInterest(matchId: string): void {
    this.matchService.expressInterest(matchId);
    this.refreshLists();
  }

  connect(matchId: string): void {
    this.matchService.connect(matchId);
    this.refreshLists();
  }
}
