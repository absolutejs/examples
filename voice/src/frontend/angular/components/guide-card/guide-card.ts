import { Component, Input } from "@angular/core";

@Component({
  host: {
    class: "voice-card voice-card-side",
  },
  selector: "article[voiceGuideCard]",
  standalone: true,
  templateUrl: "./guide-card.html",
})
export class GuideCardComponent {
  @Input({ required: true }) guideSteps!: ReadonlyArray<string>;
  @Input({ required: true }) guideTitle!: string;
}
