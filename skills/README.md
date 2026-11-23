# Skills

Task recipes for Spenicle. Each directory is one skill: a `SKILL.md` with YAML
frontmatter (`name`, `description`) and a body an agent (or a new contributor) can
follow without reading the whole repository first.

| skill | use it when |
| --- | --- |
| [`release`](./release/SKILL.md) | cutting `vX.Y.Z`: patch, minor or major, then verifying the image |
| [`observability`](./observability/SKILL.md) | wiring a collector, reading traces, debugging why a span is missing |
| [`updates`](./updates/SKILL.md) | checking for Go, module, action or image updates |
| [`contribute`](./contribute/SKILL.md) | branch, commit, merge request and ticket conventions |
| [`ai-integration`](./ai-integration/SKILL.md) | pointing an agent or script at a running instance |

## How to load one

**PI-Desktop / Claude-style agents**: point the tool at the directory, or copy it
into the global skills folder and restart:

```bash
cp -r skills/release ~/.pi/agent/skills/spenicle-release
```

**Any other agent**: `SKILL.md` is plain markdown. Paste it into context, or add
`skills/` to the agent's instructions folder. `AGENTS.md` stays the map; skills are
the step-by-step for one job.

## How to add one

1. New directory under `skills/`, kebab-case, one job per skill.
2. Frontmatter: `name` equals the directory, `description` says when to use it —
   not what it contains.
3. Body: the commands, the checks, the failure modes, and a final "done means".
   Link the canonical doc instead of repeating it.
4. Add a row to the table above.
5. Keep it true: a skill that lies is worse than no skill. When a command changes,
   change the skill in the same commit.
