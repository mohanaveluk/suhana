import { Pipe, PipeTransform } from '@angular/core';
import { ReviewSentiment } from '../enums/testimonial.enum';

@Pipe({ name: 'sentimentIcon', standalone: true })
export class SentimentIconPipe implements PipeTransform {
  transform(sentiment: ReviewSentiment | null | undefined): string {
    switch (sentiment) {
      case ReviewSentiment.POSITIVE: return 'sentiment_very_satisfied';
      case ReviewSentiment.NEUTRAL:  return 'sentiment_neutral';
      case ReviewSentiment.NEGATIVE: return 'sentiment_very_dissatisfied';
      default:                       return 'sentiment_neutral';
    }
  }
}

@Pipe({ name: 'sentimentColor', standalone: true })
export class SentimentColorPipe implements PipeTransform {
  transform(sentiment: ReviewSentiment | null | undefined): string {
    switch (sentiment) {
      case ReviewSentiment.POSITIVE: return '#2e7d32';
      case ReviewSentiment.NEUTRAL:  return '#f57c00';
      case ReviewSentiment.NEGATIVE: return '#c62828';
      default:                       return '#666';
    }
  }
}
