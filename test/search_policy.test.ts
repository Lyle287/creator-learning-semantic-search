import assert from "node:assert/strict";
import test from "node:test";
import { selectSearchableContent, type CreatorContent } from "../src/search_policy.js";

test("indexes only content that has reached its learner-visible state", () => {
  const items: CreatorContent[] = [
    { id: "asset-1", creatorId: "teacher-7", kind: "digital_asset", title: "Workbook", text: "Practice prompts", state: "delivered" },
    { id: "update-1", creatorId: "teacher-7", kind: "subscriber_update", title: "Office hours", text: "Thursday at four", state: "draft" },
    { id: "lesson-1", creatorId: "teacher-7", kind: "lesson", title: "Fractions", text: "Equivalent fractions", state: "processed" }
  ];

  assert.deepEqual(selectSearchableContent(items).map((item) => item.id), ["asset-1", "lesson-1"]);
});
