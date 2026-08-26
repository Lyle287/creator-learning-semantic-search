export type CreatorContent = {
  id: string;
  creatorId: string;
  kind: "digital_asset" | "subscriber_update" | "lesson";
  title: string;
  text: string;
  state: "delivered" | "published" | "processed" | "draft";
};

export type SearchHit = {
  id: string;
  score: number;
  title: string;
  kind: CreatorContent["kind"];
};

const searchableState: Record<CreatorContent["kind"], CreatorContent["state"]> = {
  digital_asset: "delivered",
  subscriber_update: "published",
  lesson: "processed"
};

export function selectSearchableContent(items: CreatorContent[]): CreatorContent[] {
  return items.filter((item) => item.state === searchableState[item.kind]);
}

export function shapeSearchHits(
  matches: Array<{ id: string; score: number; metadata?: unknown }>
): SearchHit[] {
  return matches.flatMap((match) => {
    const metadata = match.metadata;
    if (!metadata || typeof metadata !== "object") return [];
    const title = Reflect.get(metadata, "title");
    const kind = Reflect.get(metadata, "kind");
    if (
      typeof title !== "string" ||
      (kind !== "digital_asset" && kind !== "subscriber_update" && kind !== "lesson")
    ) return [];
    return [{ id: match.id, score: match.score, title, kind }];
  });
}
