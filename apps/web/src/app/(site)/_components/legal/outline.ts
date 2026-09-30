export type OutlineItem = { id: string; number: number; title: string };

/**
 * A document's numbered sections, in order. The contents list and each
 * section's heading both read from it, so a section can't be renumbered or
 * renamed in one place and not the other.
 */
export function outline<const Id extends string>(
  sections: readonly (readonly [Id, string])[],
) {
  const items = sections.map(([id, title], index) => ({
    id,
    number: index + 1,
    title,
  }));
  return {
    items,
    section: (id: Id) => items.find((item) => item.id === id)!,
  };
}
