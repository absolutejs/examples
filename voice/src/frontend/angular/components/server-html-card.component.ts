import { Component, Input } from "@angular/core";

@Component({
  host: {
    "[innerHTML]": "html",
  },
  selector: "[voiceServerHtmlCard]",
  standalone: true,
  template: "",
})
export class ServerHtmlCardComponent {
  @Input({ required: true }) html!: string;
}
