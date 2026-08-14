import {
  Component, ChangeDetectionStrategy, OnInit, computed, inject, signal, ViewChild,
} from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';

import { MaterialModule } from '../../../shared/modules/material.module';
import { AdminSearchAnalyticsService } from '../../../services/admin-search-analytics.service';
import {
  DAY_RANGES, FacetCount, FailedSearch, TREND_FACETS, TraitView, TrendFacet, traitWeight,
} from '../../../models/admin-search-analytics.model';
import {
  FailedSearchDetailDialogComponent, FailedSearchDetailData,
} from './failed-search-detail-dialog/failed-search-detail-dialog.component';
import { ExportSheet, exportCsv, exportExcel, exportPdf } from './analytics-export';
import { AdminLayoutComponent } from '../layout/admin-layout.component';

Chart.register(...registerables);

// Suhana palette, ordered so adjacent slices stay distinguishable.
const PALETTE = [
  '#800020', '#b76e79', '#c9a84c', '#5e35b1', '#2e7d32',
  '#0277bd', '#ef6c00', '#ad1457', '#00838f', '#6d4c41',
];

@Component({
  selector: 'app-admin-ai-search-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MaterialModule, MatTableModule, MatSortModule, MatPaginatorModule,
    BaseChartDirective, DecimalPipe, TitleCasePipe, AdminLayoutComponent,
  ],
  templateUrl: './admin-ai-search-analytics.component.html',
  styleUrl: './admin-ai-search-analytics.component.scss',
})
export class AdminAiSearchAnalyticsComponent implements OnInit {
  protected readonly analytics = inject(AdminSearchAnalyticsService);
  private readonly dialog = inject(MatDialog);

  protected readonly dayRanges = DAY_RANGES;
  protected readonly facets = TREND_FACETS;
  protected readonly traitWeight = traitWeight;

  protected readonly traitView = signal<TraitView>('cloud');
  protected readonly trendFilter = signal('');
  protected readonly failedFilter = signal('');

  // ── Trends table ────────────────────────────────────────────────────────────
  protected readonly trendColumns = ['value', 'count', 'share'] as const;
  protected readonly trendRows = computed<FacetCount[]>(() => {
    const q = this.trendFilter().trim().toLowerCase();
    const rows = this.analytics.trends();
    return q ? rows.filter(r => r.value?.toLowerCase().includes(q)) : rows;
  });

  // ── Failed searches table ───────────────────────────────────────────────────
  protected readonly failedColumns = ['query', 'searchCount', 'averageResults', 'actions'] as const;
  protected readonly failedDataSource = new MatTableDataSource<FailedSearch>([]);

  @ViewChild(MatSort) set sort(s: MatSort) { if (s) this.failedDataSource.sort = s; }
  @ViewChild(MatPaginator) set paginator(p: MatPaginator) { if (p) this.failedDataSource.paginator = p; }

  protected readonly trendTotal = computed(() =>
    this.analytics.trends().reduce((sum, t) => sum + (t.count ?? 0), 0));

  // ── Charts ──────────────────────────────────────────────────────────────────
  protected readonly fallbackChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: ['AI Success', 'Fallback'],
    datasets: [{
      data: [this.analytics.successCount(), this.analytics.fallbackCount()],
      backgroundColor: ['#b76e79', '#800020'],
      hoverBackgroundColor: ['#c98d95', '#a40029'],
      borderWidth: 0,
    }],
  }));

  protected readonly fallbackChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 12 } } },
    },
  };

  /** Religion reads better as a share-of-whole; the rest are ranked bars. */
  protected readonly isPieFacet = computed(() => this.analytics.selectedFacet() === 'religion');

  protected readonly trendBarData = computed<ChartData<'bar'>>(() => {
    const rows = this.analytics.trends();
    return {
      labels: rows.map(r => r.value),
      datasets: [{
        label: 'Searches',
        data: rows.map(r => r.count),
        backgroundColor: '#b76e79',
        hoverBackgroundColor: '#800020',
        borderRadius: 6,
        barThickness: 'flex',
        maxBarThickness: 26,
      }],
    };
  });

  protected readonly trendBarOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { grid: { display: false } },
    },
  };

  protected readonly trendPieData = computed<ChartData<'pie'>>(() => {
    const rows = this.analytics.trends();
    return {
      labels: rows.map(r => r.value),
      datasets: [{
        data: rows.map(r => r.count),
        backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 0,
      }],
    };
  });

  protected readonly trendPieOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } },
  };

  protected readonly traitBarData = computed<ChartData<'bar'>>(() => {
    const rows = this.analytics.popularTraits();
    return {
      labels: rows.map(r => r.value),
      datasets: [{
        label: 'Requests',
        data: rows.map(r => r.count),
        backgroundColor: '#c9a84c',
        hoverBackgroundColor: '#a8862f',
        borderRadius: 6,
        maxBarThickness: 24,
      }],
    };
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    await this.analytics.loadAll();
    this.syncFailedTable();
  }

  private syncFailedTable(): void {
    this.failedDataSource.data = this.analytics.failedSearches();
    this.failedDataSource.filter = this.failedFilter().trim().toLowerCase();
  }

  // ── Interactions ────────────────────────────────────────────────────────────

  protected async onDaysChange(days: number): Promise<void> {
    await this.analytics.setDays(days);
    this.syncFailedTable();
  }

  protected async onTabChange(index: number): Promise<void> {
    const facet: TrendFacet = this.facets[index]?.key ?? 'profession';
    this.trendFilter.set('');
    await this.analytics.setFacet(facet);
  }

  protected async refresh(): Promise<void> {
    await this.analytics.refresh();
    this.syncFailedTable();
  }

  protected onFailedFilter(value: string): void {
    this.failedFilter.set(value);
    this.failedDataSource.filter = value.trim().toLowerCase();
    this.failedDataSource.paginator?.firstPage();
  }

  protected openFailedDetail(item: FailedSearch): void {
    this.dialog.open(FailedSearchDetailDialogComponent, {
      data: { item, days: this.analytics.selectedDays() } satisfies FailedSearchDetailData,
      width: '560px',
      maxWidth: '94vw',
      autoFocus: false,
    });
  }

  protected sharePct(count: number): number {
    const total = this.trendTotal();
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  protected barWidth(count: number, max: number): string {
    return max > 0 ? `${Math.max(2, Math.round((count / max) * 100))}%` : '0%';
  }

  protected trackByValue = (_: number, item: FacetCount): string => item.value;
  protected trackByQuery = (_: number, item: FailedSearch): string => item.query;

  // ── Export ──────────────────────────────────────────────────────────────────

  private buildSheets(): ExportSheet[] {
    const facetLabel = this.facets.find(f => f.key === this.analytics.selectedFacet())?.label ?? 'Trend';
    return [
      {
        title: 'AI Fallback Summary',
        columns: ['Metric', 'Value'],
        rows: [
          ['Total Searches', this.analytics.totalSearches()],
          ['AI Success Searches', this.analytics.successCount()],
          ['Fallback Searches', this.analytics.fallbackCount()],
          ['Fallback %', `${this.analytics.fallbackRatio()}%`],
        ],
      },
      {
        title: `Search Trends — ${facetLabel}`,
        columns: [facetLabel, 'Searches', 'Share %'],
        rows: this.analytics.trends().map(t => [t.value, t.count, `${this.sharePct(t.count)}%`]),
      },
      {
        title: 'Popular Personality Traits',
        columns: ['Trait', 'Requests'],
        rows: this.analytics.popularTraits().map(t => [t.value, t.count]),
      },
      {
        title: 'Failed Searches',
        columns: ['Query', 'Search Count', 'Avg Results'],
        rows: this.analytics.failedSearches().map(f => [f.query, f.searchCount, f.averageResults]),
      },
    ];
  }

  private get exportName(): string {
    const stamp = new Date().toISOString().slice(0, 10);
    return `suhana-search-analytics-${this.analytics.selectedDays()}d-${stamp}`;
  }

  protected exportCsv(): void { exportCsv(this.buildSheets(), this.exportName); }
  protected exportExcel(): void { exportExcel(this.buildSheets(), this.exportName); }
  protected exportPdf(): void {
    const label = this.dayRanges.find(d => d.value === this.analytics.selectedDays())?.label ?? '';
    exportPdf(this.buildSheets(), this.exportName, `${label} · generated ${new Date().toLocaleString()}`);
  }
}
