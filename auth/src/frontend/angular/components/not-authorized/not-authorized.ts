import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  imports: [RouterLink],
  selector: "auth-not-authorized",
  standalone: true,
  templateUrl: "./not-authorized.html",
})
export class NotAuthorizedComponent {}
