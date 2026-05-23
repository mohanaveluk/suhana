import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/modules/material.module';
import { SearchService } from '../../services';
import { ProfileService } from '../../services';
import { UserProfile } from '../../models/user.model';

@Component({
  selector: 'app-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, MaterialModule,
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  protected readonly searchService = inject(SearchService);
  protected readonly genderFilter = signal<'bride' | 'groom' | 'all'>('all');

  protected readonly filteredResults = () => {
    const results = this.searchService.searchResults();
    const gender = this.genderFilter();
    if (gender === 'all') return results;
    return results.filter((p: UserProfile) => p.gender === gender);
  };

  async ngOnInit(): Promise<void> {
    await this.profileService.loadProfiles();
  }

  setGender(gender: 'bride' | 'groom' | 'all'): void {
    this.genderFilter.set(gender);
  }

  onSearchInput(event: Event): void {
    this.searchService.setSearchQuery((event.target as HTMLInputElement).value);
  }
}
