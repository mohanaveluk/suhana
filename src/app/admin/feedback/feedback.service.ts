import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Feedback, FeedbackFilter } from './feedback.model';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly api = inject(ApiService);

  getFeedbacks(filter: FeedbackFilter = {}): Observable<any> {
    return this.api.getAdminFeedbacks(filter);
  }

  approveFeedback(id: string): Observable<Feedback> {
    return this.api.approveAdminFeedback(id);
  }

  rejectFeedback(id: string): Observable<Feedback> {
    return this.api.rejectAdminFeedback(id);
  }

  resolveFeedback(id: string): Observable<Feedback> {
    return this.api.resolveAdminFeedback(id);
  }

  deleteFeedback(id: string): Observable<void> {
    return this.api.deleteAdminFeedback(id);
  }
}
