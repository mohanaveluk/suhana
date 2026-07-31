import {
  Component, ChangeDetectionStrategy, Input, OnInit, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReviewsService } from '../../services/reviews.service';
import { ReviewReply } from '../../models/review.model';

@Component({
  selector: 'app-review-replies',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe, ReactiveFormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
  ],
  templateUrl: './review-replies.component.html',
  styleUrl:    './review-replies.component.scss',
})
export class ReviewRepliesComponent implements OnInit {
  @Input({ required: true }) reviewId!: string;
  @Input() isAuthenticated = false;
  @Input() showForm = false;

  private readonly svc = inject(ReviewsService);

  protected replies    = signal<ReviewReply[]>([]);
  protected loading    = signal(false);
  protected submitting = signal(false);
  protected replyCtrl  = new FormControl('', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]);

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.getReplies(this.reviewId).subscribe({
      next: list  => { this.replies.set(list); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  protected submit(): void {
    if (this.replyCtrl.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.svc.createReply(this.reviewId, { replyText: this.replyCtrl.value! }).subscribe({
      next: reply => {
        this.replies.update(r => [reply, ...r]);
        this.replyCtrl.reset();
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }

  get charCount(): number { return this.replyCtrl.value?.length ?? 0; }
}
