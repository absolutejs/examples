import { Component, Input } from "@angular/core";

@Component({
  host: {
    class: "voice-card voice-card-side",
  },
  selector: "article[voiceGuideCard]",
  standalone: true,
  template: `
    <h2>{{ guideTitle }}</h2>
    <ol class="voice-guide-list">
      @for (step of guideSteps; track step) {
        <li>{{ step }}</li>
      }
    </ol>
  `,
})
export class GuideCardComponent {
  @Input({ required: true }) guideSteps!: ReadonlyArray<string>;
  @Input({ required: true }) guideTitle!: string;
}
