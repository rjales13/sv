---
name: viking-design-trace-design-source-pin
generated-by: aidlc-runner-gen
description: >
  Run the viking-design-trace plugin `viking-design-trace-design-source-pin` stage (inception phase) in isolation, without
  advancing the main workflow. Packages `/aidlc --stage viking-design-trace-design-source-pin --single`:
  the engine emits one run-stage directive for viking-design-trace-design-source-pin and its gate, the
  conductor runs it, then the single-stage run commits a synthetic-id pair and
  stops. The main workflow's Current Stage is never touched.
argument-hint: ""
user-invocable: true
---

# AI-DLC Stage Runner — viking-design-trace-design-source-pin

Run the `viking-design-trace-design-source-pin` stage from the viking-design-trace plugin on its own. This is opt-in packaging over
`/aidlc --stage viking-design-trace-design-source-pin --single`; the same stage is always reachable via
that flag without this skill.

## Steps

1. Ask the engine for the single-stage directive:

   ```bash
   aidlc engine orchestrate next --stage viking-design-trace-design-source-pin --single
   ```

   The engine emits one `run-stage` directive for `viking-design-trace-design-source-pin` (carrying the
   lead agent, the resolved consumes/produces paths, the rules and sensors in
   context, and — on this first directive — the conductor persona). Run the stage
   exactly as the directive describes; do not load the conductor persona by hand,
   the engine delivers it.

2. Before acting on the directive, read
   `.claude/aidlc-common/protocols/stage-protocol.md`. Then read every
   `.claude/aidlc-common/protocols/stage-protocol-<module>.md` named by
   `directive.protocol_modules`. Load every listed module before reading the
   stage body or running its topology; skip only a module already loaded earlier
   in this session.

3. When the stage's work is done, commit the single-stage record:

   ```bash
   aidlc engine orchestrate report --single --stage viking-design-trace-design-source-pin --result completed
   ```

   This records a STAGE_STARTED / STAGE_COMPLETED pair under a synthetic workflow
   id and stops. It NEVER writes the main workflow's `Current Stage` — a
   single-stage run is isolated by design (the tool refuses to advance the main
   workflow).
