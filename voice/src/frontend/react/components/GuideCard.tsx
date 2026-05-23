import {
  VOICE_DEMO_GUIDE_STEPS,
  VOICE_DEMO_GUIDE_TITLE,
} from "../../../constants/demoCopy";

export const GuideCard = () => (
  <article className="voice-card voice-card-side">
    <h2>{VOICE_DEMO_GUIDE_TITLE}</h2>
    <ol className="voice-guide-list">
      {VOICE_DEMO_GUIDE_STEPS.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  </article>
);
