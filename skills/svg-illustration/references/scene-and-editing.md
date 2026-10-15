# Scene intent and concrete SVG structure

Use a lightweight scene note when a composition has enough objects or iterations that identities would otherwise drift. This is CraftRoster working documentation, not an implementation of an upstream scene validator.

Before drawing, record intent: canvas proportions, background, focal object, important parts, and spatial constraints. Give objects durable names such as `astronaut-helmet` and `astronaut-visor`. Names identify editable parts; they do not predict Bézier commands or force every planned object into a path.

After drawing, bind those identities to the actual SVG. Record the element or group ID, tag, direct parent, and back-to-front ordering when useful. A plan describes intended relationships; a bound note describes existing elements. Keep these states distinguishable, and do not claim to have checked mappings before the elements exist. Reuse an established project schema instead of migrating it for a small edit.

For example, a note can begin as:

```text
Intent: 4:3 astronaut scene; dark background; visor remains readable at 96 px.
Parts: astronaut, astronaut-helmet, astronaut-visor, foreground-rock.
Constraint: foreground-rock overlaps the lower suit, never the visor.
```

Once authored, extend it with the actual structure:

```text
Bound: astronaut-helmet is a g under astronaut; astronaut-visor is a path
under astronaut-helmet; foreground-rock paints after astronaut.
```

Do not duplicate coordinates or full path strings in notes. The SVG owns geometry. Update only identities and relationships affected by the change, and save SVG/notes together when keeping revision candidates.

For local edits, inspect CSS selectors, animation targets, accessibility references, and paint-server references before renaming or moving IDs. Moving a group may change inherited styling or the coordinate space of its resources. If the user requests a larger head, change its relevant group and attachments rather than rebuilding the entire scene.

Use intentional overlap where a limb or stem joins a body to prevent accidental antialiased seams. Keep genuine small gaps visible at delivery size. Changing paint order can fix an occluded detail more cleanly than adding duplicate geometry.
