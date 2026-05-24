import { Component } from "@angular/core";

@Component({
  host: {
    class: "voice-demo-page",
  },
  selector: "div[voiceDemoChrome]",
  standalone: true,
  templateUrl: "./demo-chrome.html",
})
export class DemoChromeComponent {}
