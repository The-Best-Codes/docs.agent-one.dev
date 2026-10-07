# Documentation refresh — October 7, 2026

The previous actual MDX update was August 3, 2026 at 14:59:06 CDT, commit `19d88d4fedcb8e6b7c3103c92399662b5a46e3bb` (update numbers). Later dependency and tooling updates did not refresh the product guides.

The audit covered the history since that timestamp: 355 desktop commits and 102 website commits. Every commit was reviewed by its message and changed-file summary, with current implementation and relevant changes inspected for documented behavior. The desktop source was checked through `a907f581216b34b924603918a2e7751ad2c5cb28`; the website through `fd8ec296646ad5a9c2f44a7c5fd54e0365989270`.

Native computer use inspected the production AgentOne 1.1.1 app, including chat controls, model selection/configuration, provider dialogs, appearance, chat preferences, tools/approvals, catalogs, extensions/advanced/custom setup, and scheduled-agent creation. Chrome was used to inspect the live download page and account dashboard, including Billing, Sessions, Settings, and Integrations. No app configuration, service data, subscriptions, or purchases were changed.

The rewrite replaces all previous MDX prose with 59 task-oriented pages. It covers scheduling, message steering, current provider configuration, separately downloaded catalogs, local extension configuration, speech providers, chat actions, sync boundaries, and recovery steps. Installation paths are retained; 58 other former document routes redirect to their replacement guides.

Sixteen new native captures are used with vector annotations and accessible numbered legends. Two Windows installer reference captures are retained and explicitly labeled as older references. Other old screenshot assets were removed. Raw captures remain unchanged; crop and callout coordinates live in the MDX figure props. Inspect both the capture and its rendered annotations when updating a figure.

Validation: production build, generated route/TypeScript checks, Markdown lint, spelling, local document and asset targets, redirects, and browser screenshot review. The repository's lychee command requires an executable not installed in this environment; direct local target and HTTP checks cover the rewritten internal links. External services may reject automated link probes.

For the next refresh, start from the revisions in `.last-update`, inspect current behavior, and update screenshots through the same read-only walkthrough. Beta marketing features should not be represented as universally available desktop features.
