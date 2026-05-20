import {
  buildDemoReleasePanelState,
  demoReleaseWorkspaces,
  type DemoBackendMode,
  type DemoReleaseOpsResponse,
} from "../../../../frontend/demo-backends";
import { escapeHtml } from "./common";

export const renderHtmxReleasePanel = (
  releaseData: DemoReleaseOpsResponse,
  actionMessage?: string,
  mode: DemoBackendMode = "sqlite-native",
) => {
  const releasePanel = buildDemoReleasePanelState(releaseData);
  const activeWorkspace = releaseData.workspace?.id ?? "alpha";

  return [
    '<div id="release-panel" class="demo-results demo-release-card">',
    "<h3>Release Control</h3>",
    '<p class="demo-metadata">This panel exercises the same AbsoluteJS release-control surface that backs retrieval baselines, lane readiness, incidents, and remediation execution tracking.</p>',
    actionMessage
      ? `<p class="demo-banner">${escapeHtml(actionMessage)}</p>`
      : "",
    '<div class="demo-release-hero">',
    '<div class="demo-release-hero-copy">',
    '<p class="demo-release-kicker">AbsoluteJS release workflow</p>',
    `<p class="demo-release-banner">${escapeHtml(releasePanel.releaseHero)}</p>`,
    `<p class="demo-release-summary">${escapeHtml(releasePanel.releaseHeroSummary)}</p>`,
    `<p class="demo-metadata">${escapeHtml(releasePanel.releaseHeroMeta)}</p>`,
    `<p class="demo-metadata">${escapeHtml(releasePanel.releaseScopeNote)}</p>`,
    `<div class="demo-release-pills">${releasePanel.releaseHeroPills.map((pill) => (pill.targetCardId || pill.targetActivityId ? `<a class="demo-release-pill demo-release-pill-${escapeHtml(pill.tone)}" href="#${escapeHtml(pill.targetActivityId ?? pill.targetCardId ?? "")}" data-target-card="${escapeHtml(pill.targetCardId ?? "")}" onclick="const targetCard=this.dataset.targetCard; if(targetCard==='release-promotion-candidates-card'||targetCard==='release-stable-handoff-card'||targetCard==='release-remediation-history-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}"><span class="demo-release-pill-label">${escapeHtml(pill.label)}</span><span class="demo-release-pill-value">${escapeHtml(pill.value)}</span></a>` : `<span class="demo-release-pill demo-release-pill-${escapeHtml(pill.tone)}"><span class="demo-release-pill-label">${escapeHtml(pill.label)}</span><span class="demo-release-pill-value">${escapeHtml(pill.value)}</span></span>`)).join("")}</div>`,
    `<div class="demo-release-scenario-switcher">${demoReleaseWorkspaces.map((entry) => `<span class="demo-release-scenario-chip demo-release-workspace-chip${entry.id === activeWorkspace ? " demo-release-scenario-chip-active" : ""}"><button type="button" title="${escapeHtml(entry.description)}" hx-get="${escapeHtml(`/demo/release/${mode}/htmx?workspace=${entry.id}`)}" hx-target="#htmx-release" hx-swap="innerHTML" ${entry.id === activeWorkspace ? "disabled" : ""}>Workspace · ${escapeHtml(entry.label)}</button></span>`).join("")}${releasePanel.releaseScenarioActions.map((entry) => `<span class="demo-release-scenario-chip${entry.active ? " demo-release-scenario-chip-active" : ""}">${entry.action ? `<button type="button" title="${escapeHtml(entry.action.description)}" hx-post="${escapeHtml(entry.action.path)}" hx-vals='${escapeHtml(JSON.stringify(entry.action.payload))}' hx-target="#htmx-release" hx-swap="innerHTML">${escapeHtml(entry.label)}</button>` : `<span>${escapeHtml(entry.label)}</span>`}</span>`).join("")}</div>`,
    `<div class="demo-release-path">${releasePanel.releasePathSteps.map((step) => `<article class="demo-release-path-step demo-release-path-step-${escapeHtml(step.status)}"><div class="demo-release-path-step-header"><h4>${escapeHtml(step.label)}</h4><span class="demo-release-path-status demo-release-path-status-${escapeHtml(step.status)}">${escapeHtml(step.status)}</span></div><p>${escapeHtml(step.summary)}</p><p class="demo-release-path-detail">${escapeHtml(step.detail)}</p>${step.action ? `<button class="demo-release-path-action" type="button" title="${escapeHtml(step.action.description)}" hx-post="${escapeHtml(step.action.path)}" hx-vals='${escapeHtml(JSON.stringify(step.action.payload))}' hx-target="#htmx-release" hx-swap="innerHTML">${escapeHtml(step.action.label)}</button>` : ""}</article>`).join("")}</div>`,
    "</div>",
    '<div class="demo-release-action-rail">',
    '<span class="demo-release-action-label">Live actions</span>',
    `<div class="demo-release-action-state"><span class="demo-release-action-state-badge">Scenario · ${escapeHtml(releasePanel.scenario?.label ?? "Blocked stable lane")}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.releaseRailDeltaChip.tone)}">${escapeHtml(releasePanel.releaseRailDeltaChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railIncidentPostureChip.tone)}">Incident posture · ${escapeHtml(releasePanel.railIncidentPostureChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railGateChip.tone)}">Gate posture · ${escapeHtml(releasePanel.railGateChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railApprovalChip.tone)}">Approval posture · ${escapeHtml(releasePanel.railApprovalChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railRemediationChip.tone)}">Remediation posture · ${escapeHtml(releasePanel.railRemediationChip.label)}</span></div>`,
    `<div class="demo-release-rail-meta">${releasePanel.releaseRailUpdateSource.targetCardId || releasePanel.releaseRailUpdateSource.targetActivityId ? `<a class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(releasePanel.releaseRailUpdateSource.tone)}" href="#${escapeHtml(releasePanel.releaseRailUpdateSource.targetActivityId ?? releasePanel.releaseRailUpdateSource.targetCardId ?? "")}" data-target-card="${escapeHtml(releasePanel.releaseRailUpdateSource.targetCardId ?? "")}" onclick="const targetCard=this.dataset.targetCard; if(targetCard==='release-promotion-candidates-card'||targetCard==='release-stable-handoff-card'||targetCard==='release-remediation-history-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}">${escapeHtml(releasePanel.releaseRailUpdateSource.label)}</a>` : `<span class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(releasePanel.releaseRailUpdateSource.tone)}">${escapeHtml(releasePanel.releaseRailUpdateSource.label)}</span>`}<p class="demo-release-updated">${escapeHtml(releasePanel.releaseRailUpdatedLabel)}</p></div>`,
    releasePanel.latestReleaseAction
      ? `<details class="demo-collapsible demo-release-action-latest demo-release-action-latest-${escapeHtml(releasePanel.latestReleaseAction.tone)}"><summary>Latest action · ${escapeHtml(releasePanel.latestReleaseAction.title)}</summary>${releasePanel.latestReleaseAction.detail ? `<p>${escapeHtml(releasePanel.latestReleaseAction.detail)}</p>` : ""}<p class="demo-release-next-step">${escapeHtml(releasePanel.latestReleaseAction.nextStep)}</p></details>`
      : "",
    `<details class="demo-collapsible demo-release-rail-callout demo-release-rail-callout-${escapeHtml(releasePanel.releaseRailCallout.tone)}"><summary>${escapeHtml(releasePanel.releaseRailCallout.title)}</summary><p>${escapeHtml(releasePanel.releaseRailCallout.message)}</p>${releasePanel.releaseRailCallout.detail ? `<p>${escapeHtml(releasePanel.releaseRailCallout.detail)}</p>` : ""}<p class="demo-release-next-step">${escapeHtml(releasePanel.releaseRailCallout.nextStep)}</p></details>`,
    releasePanel.recentReleaseActivity.length
      ? `<div class="demo-release-activity-stack"><span class="demo-release-action-subtitle">Recent activity</span>${releasePanel.recentReleaseActivity.map((entry) => `<a id="${escapeHtml(entry.id)}" class="demo-release-activity demo-release-activity-${escapeHtml(entry.tone)}" href="#${escapeHtml(entry.targetCardId)}" onclick="if(this.getAttribute('href')==='#release-promotion-candidates-card'||this.getAttribute('href')==='#release-stable-handoff-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}"><span class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(entry.tone)}">${escapeHtml(entry.laneLabel)}</span><strong>${escapeHtml(entry.title)}</strong>${entry.detail ? ` · ${escapeHtml(entry.detail)}` : ""}</a>`).join("")}</div>`
      : "",
    `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Release</span><div class="demo-release-actions">${releasePanel.primaryReleaseActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" title="${escapeHtml(action.description)}" hx-post="${escapeHtml(action.path)}" hx-vals='${escapeHtml(JSON.stringify(action.payload))}' hx-target="#htmx-release" hx-swap="innerHTML">${escapeHtml(action.label)}</button>`).join("")}</div></div>`,
    releasePanel.secondaryReleaseActions.length > 0
      ? `<details class="demo-collapsible demo-release-more-actions"><summary>More actions</summary><div class="demo-release-actions">${releasePanel.secondaryReleaseActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" title="${escapeHtml(action.description)}" hx-post="${escapeHtml(action.path)}" hx-vals='${escapeHtml(JSON.stringify(action.payload))}' hx-target="#htmx-release" hx-swap="innerHTML">${escapeHtml(action.label)}</button>`).join("")}</div></details>`
      : "",
    releasePanel.handoffActions.length > 0
      ? `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Handoff</span><div class="demo-release-actions">${releasePanel.handoffActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" title="${escapeHtml(action.description)}" hx-post="${escapeHtml(action.path)}" hx-vals='${escapeHtml(JSON.stringify(action.payload))}' hx-target="#htmx-release" hx-swap="innerHTML">${escapeHtml(action.label)}</button>`).join("")}</div></div>`
      : "",
    `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Evidence drills</span><div class="demo-release-actions">${releasePanel.releaseEvidenceDrills.map((drill) => `<button class="demo-release-action demo-release-action-${escapeHtml(drill.active ? "primary" : "neutral")}" type="button" hx-post="/demo/message/${escapeHtml(mode)}/search" hx-vals='${escapeHtml(JSON.stringify({ query: drill.query ?? "", topK: drill.topK, retrievalPresetId: drill.retrievalPresetId || undefined }))}' hx-target="#search-results" hx-swap="innerHTML" hx-on::after-request="document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })">${escapeHtml(drill.label ?? "")}</button>`).join("")}</div>${releasePanel.releaseEvidenceDrills.map((drill) => `<p class="demo-metadata"><strong>${escapeHtml(drill.classificationLabel ?? "")}:</strong> ${escapeHtml(drill.summary ?? "")} Expected source · ${escapeHtml(drill.expectedSource ?? "")}</p><p class="demo-metadata">${escapeHtml(drill.traceExpectation ?? "")}</p>`).join("")}</div>`,
    "</div>",
    "</div>",
    '<div class="demo-stat-grid">',
    `<article class="demo-stat-card"><span class="demo-stat-label">Stable baseline</span><strong>${escapeHtml(releasePanel.stableBaseline?.label ?? "Not promoted")}</strong><p>${escapeHtml(releasePanel.stableBaseline ? `${releasePanel.stableBaseline.retrievalId} · v${releasePanel.stableBaseline.version}${releasePanel.stableBaseline.approvedBy ? ` · approved by ${releasePanel.stableBaseline.approvedBy}` : ""}` : "No stable baseline has been promoted yet.")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Canary baseline</span><strong>${escapeHtml(releasePanel.canaryBaseline?.label ?? "Not promoted")}</strong><p>${escapeHtml(releasePanel.canaryBaseline ? `${releasePanel.canaryBaseline.retrievalId} · v${releasePanel.canaryBaseline.version}${releasePanel.canaryBaseline.approvedAt ? ` · ${new Date(releasePanel.canaryBaseline.approvedAt).toLocaleString()}` : ""}` : "No canary baseline has been promoted yet.")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Stable readiness</span><strong>${escapeHtml(releasePanel.stableReadiness?.ready ? "Ready" : "Blocked")}</strong><p>${escapeHtml(releasePanel.stableReadinessStatSummary)}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Remediation guardrails</span><strong>${escapeHtml(releasePanel.remediationSummary ? `${releasePanel.remediationSummary.guardrailBlockedCount} blocked · ${releasePanel.remediationSummary.replayCount} replays` : "No remediation executions")}</strong><p>${escapeHtml(releasePanel.remediationGuardrailSummary)}</p></article>`,
    "</div>",
    '<div class="demo-result-grid">',
    `<article class="demo-result-item"><h4>Blocker comparison</h4><p class="demo-score-headline">${escapeHtml(releasePanel.scenarioClassificationLabel ? `Active blocker · ${releasePanel.scenarioClassificationLabel}` : "Compare both blocker classes")}</p><div class="demo-result-grid">${releasePanel.releaseBlockerComparisonCards.map((card) => `<article class="demo-result-item"><h4>${escapeHtml(card.label)}${card.active ? " · active" : ""}</h4>${card.detailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`).join("")}</div></article>`,
    `<article id="release-runtime-history-card" class="demo-result-item"><h4>Runtime planner history</h4><p class="demo-score-headline">${escapeHtml(releasePanel.runtimePlannerHistorySummary)}</p>${releasePanel.runtimePlannerHistoryLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-benchmark-snapshots-card" class="demo-result-item"><h4>Adaptive planner benchmark</h4><p class="demo-score-headline">${escapeHtml(releasePanel.benchmarkSnapshotSummary)}</p>${releasePanel.benchmarkSnapshotLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-active-deltas-card" class="demo-result-item"><h4>Active blocker deltas</h4><p class="demo-score-headline">${escapeHtml(releasePanel.activeBlockerDeltaSummary)}</p>${releasePanel.activeBlockerDeltaLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-lane-readiness-card" class="demo-result-item"><h4>Lane readiness</h4><div class="demo-key-value-grid">${
      releasePanel.laneReadinessEntries
        .map(
          (entry) =>
            `<div class="demo-key-value-row"><span>${escapeHtml(entry.targetRolloutLabel ?? "lane")}</span><strong>${escapeHtml(entry.ready ? "ready" : "blocked")}</strong></div>${entry.reasons
              .slice(0, 2)
              .map(
                (reason) =>
                  `<p class="demo-metadata">${escapeHtml(reason)}</p>`,
              )
              .join("")}`,
        )
        .join("") ||
      '<p class="demo-metadata">No lane readiness snapshots are available yet.</p>'
    }</div></article>`,
    `<article class="demo-result-item"><h4>Lane recommendations</h4><div class="demo-insight-stack">${releasePanel.releaseRecommendations.length > 0 ? releasePanel.releaseRecommendations.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.targetRolloutLabel ?? "lane")} · ${escapeHtml(entry.classificationLabel ?? "release recommendation")}:</strong> ${escapeHtml(entry.recommendedAction.replaceAll("_", " "))}${entry.reasons[0] ? ` · ${escapeHtml(entry.reasons[0])}` : ""}</p>`).join("") : '<p class="demo-insight-card">No lane recommendations are available yet.</p>'}</div></article>`,
    `<article id="release-open-incidents-card" class="demo-result-item"><h4>Open incidents</h4><p class="demo-score-headline">${escapeHtml(releasePanel.incidentSummaryLabel)}</p>${releasePanel.incidentClassificationDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-insight-stack">${
      releasePanel.recentIncidents
        .slice(0, 3)
        .map(
          (incident) =>
            `<p class="demo-insight-card"><strong>${escapeHtml(incident.targetRolloutLabel ?? "lane")} · ${escapeHtml(incident.kind)} · ${escapeHtml(incident.classificationLabel ?? "general regression")}</strong><br />${escapeHtml(incident.message)}</p>`,
        )
        .join("") || '<p class="demo-insight-card">No incidents recorded.</p>'
    }</div></article>`,
    `<article id="release-remediation-history-card" class="demo-result-item"><h4>Remediation execution history</h4>${releasePanel.remediationDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-key-value-grid">${
      releasePanel.recentIncidentRemediationExecutions
        .slice(0, 4)
        .map(
          (entry) =>
            `<div class="demo-key-value-row"><span>${escapeHtml(entry.action?.kind ?? "execution")}</span><strong>${escapeHtml(`${entry.code ?? "unknown"}${entry.idempotentReplay ? " · replay" : ""}${entry.blockedByGuardrail ? " · blocked" : ""}`)}</strong></div>`,
        )
        .join("") ||
      '<p class="demo-metadata">No remediation executions recorded yet.</p>'
    }</div></article>`,
    "</div>",
    `<details id="release-diagnostics" class="demo-collapsible demo-release-diagnostics"><summary>Advanced release diagnostics · ${escapeHtml(releasePanel.releaseDiagnosticsSummary)}</summary><p class="demo-release-updated">${escapeHtml(releasePanel.releaseDiagnosticsUpdatedLabel)}</p><p class="demo-release-card-state demo-release-card-state-${escapeHtml(releasePanel.releaseStateBadge.tone)}">State · ${escapeHtml(releasePanel.releaseStateBadge.label)}</p><div class="demo-result-grid">`,
    `<article id="release-promotion-candidates-card" class="demo-result-item"><h4>Promotion candidates</h4><div class="demo-key-value-grid">${
      releasePanel.releaseCandidates.length > 0
        ? releasePanel.releaseCandidates
            .slice(0, 3)
            .map(
              (candidate) =>
                `<div class="demo-key-value-row"><span>${escapeHtml(candidate.targetRolloutLabel ?? "lane")} · ${escapeHtml(candidate.candidateRetrievalId ?? "candidate")}</span><strong>${escapeHtml(candidate.reviewStatus)}</strong></div><p class="demo-metadata">${escapeHtml(candidate.reasons[0] ?? "No release reasons recorded.")}</p>`,
            )
            .join("")
        : '<p class="demo-metadata">No promotion candidates recorded yet.</p>'
    }</div></article>`,
    `<article class="demo-result-item"><h4>Release alerts</h4><div class="demo-insight-stack">${
      releasePanel.releaseAlerts.length > 0
        ? releasePanel.releaseAlerts
            .slice(0, 4)
            .map(
              (alert) =>
                `<p class="demo-insight-card"><strong>${escapeHtml(alert.targetRolloutLabel ?? "lane")} · ${escapeHtml(alert.kind)} · ${escapeHtml(alert.classificationLabel ?? "general regression")}</strong><br />${escapeHtml(alert.message ?? "No alert detail")}</p>`,
            )
            .join("")
        : '<p class="demo-insight-card">No release alerts are active.</p>'
    }</div></article>`,
    `<article id="release-policy-history-card" class="demo-result-item"><h4>Policy history</h4>${releasePanel.policyHistoryDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-insight-stack">${releasePanel.policyHistoryEntries.length > 0 ? releasePanel.policyHistoryEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("") : `<p class="demo-insight-card">${escapeHtml(releasePanel.policyHistorySummary)}</p>`}</div></article>`,
    `<article id="release-audit-surfaces-card" class="demo-result-item"><h4>Audit surfaces</h4><div class="demo-insight-stack">${releasePanel.auditSurfaceEntries.length > 0 ? releasePanel.auditSurfaceEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("") : `<p class="demo-insight-card">${escapeHtml(releasePanel.auditSurfaceSummary)}</p>`}</div></article>`,
    `<article id="release-polling-surfaces-card" class="demo-result-item"><h4>Polling surfaces</h4><div class="demo-insight-stack">${releasePanel.pollingSurfaceEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("")}</div></article>`,
    `<article id="release-handoff-incidents-card" class="demo-result-item"><h4>Handoff incidents</h4><p class="demo-score-headline">${escapeHtml(releasePanel.stableHandoffIncidentSummaryLabel)}</p><div class="demo-insight-stack">${
      releasePanel.handoffIncidents.length > 0
        ? releasePanel.handoffIncidents
            .slice(0, 2)
            .map(
              (incident) =>
                `<p class="demo-insight-card"><strong>${escapeHtml(incident.status ?? "incident")} · ${escapeHtml(incident.kind ?? "handoff_stale")}</strong><br />${escapeHtml(incident.message ?? "No handoff incident detail")}</p>`,
            )
            .join("")
        : `<p class="demo-insight-card">No handoff incidents recorded.</p>`
    }${releasePanel.handoffIncidentHistory
      .slice(0, 3)
      .map(
        (entry) =>
          `<p class="demo-insight-card"><strong>${escapeHtml(entry.action ?? "history")}</strong><br />${escapeHtml([entry.notes, entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : undefined].filter(Boolean).join(" · "))}</p>`,
      )
      .join("")}</div></article>`,
    `<article id="release-stable-handoff-card" class="demo-result-item"><h4>Stable handoff</h4><div class="demo-key-value-grid">${releasePanel.stableHandoff ? `<div class="demo-key-value-row"><span>${escapeHtml(releasePanel.stableHandoff.sourceRolloutLabel)} -&gt; ${escapeHtml(releasePanel.stableHandoff.targetRolloutLabel)}</span><strong>${escapeHtml(releasePanel.stableHandoff.readyForHandoff ? "ready" : "blocked")}</strong></div><p class="demo-metadata">${escapeHtml(releasePanel.stableHandoff.candidateRetrievalId ? `candidate ${releasePanel.stableHandoff.candidateRetrievalId}` : "No candidate retrieval is attached to the handoff yet.")}${releasePanel.stableHandoffDecision?.kind ? ` · ${escapeHtml(`latest ${releasePanel.stableHandoffDecision.kind}`)}` : ""}</p>${releasePanel.stableHandoffDisplayReasons.map((reason) => `<p class="demo-metadata">${escapeHtml(reason)}</p>`).join("")}${releasePanel.stableHandoffAutoCompleteLabel ? `<p class="demo-metadata">${escapeHtml(releasePanel.stableHandoffAutoCompleteLabel)}</p>` : ""}<div class="demo-key-value-row"><span>Drift events</span><strong>${escapeHtml(String(releasePanel.stableHandoffDrift?.totalCount ?? 0))}</strong></div>` : '<p class="demo-metadata">No stable handoff posture is available yet.</p>'}</div></article>`,
    "</div>",
    "</div>",
  ].join("");
};
