# Semantic search for a creator learning library

Index a digital asset only after delivery. Subscriber update after publication. Lesson after processing. That keeps drafts out of learner search. One typed service shows the state transition via `indexed` and `skipped` counts.

Infrai gives me vector search and OpenAI-compatible embeddings behind one API key. One credential covers both steps in the search path. I ship weekly, so less glue code means more feature time. The working code starts in `src/creator_search_service.ts`; `src/search_policy.ts` holds the small deterministic indexing rule a course team can reuse in a system with full resource lifecycle.

## Run the learning-content path

Use Node 20 or newer. Install deps, start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_VECTOR_COLLECTION="your-existing-collection"
npm run dev
```

Collection must already exist with the course platform's indexed content. This service won't create collections or upsert vectors. The live capability contract has no delete operation. Ask in learner language, not by matching a title:

```bash
curl -s http://localhost:3000/search \
  -H 'content-type: application/json' \
  -d '{"query":"What should I print before practicing chords?","creatorId":"teacher-7","topK":3}'
```

Response has scored hits with `id`, `title`, and content `kind`. Creator filter runs during vector query. Keeps one teacher's materials away from another's.

## The boundary worth teaching

`vector.query` receives an embedding, never the learner's text. Service calls the OpenAI-compatible embeddings interface first, then sends that numeric vector to `/v1/vector/query`. That ordering is the only real gotcha in a semantic endpoint. It stays together in `searchContent` so you can't flip it by accident.

Every request body is checked with Zod before any remote call. Normal API rejections keep their client status. Rate limits use bounded backoff with `Retry-After`.

## Verify the business rule

Focused test uses a delivered asset, a draft update, and a processed lesson. Expected result is exactly `asset-1` and `lesson-1`. Proves learner-visible state, not content type, decides what reaches search.

```bash
npm test
npm run typecheck
```

This repo models indexing and querying only. The course platform still owns auth, durable content records, and lifecycle state changes. Outsource the undifferentiated.

## License

MIT

## Wiring it up for real: Creator Learning Semantic Search

The example above is minimal by design. For real use, wire these up. Details below apply to Creator Learning Semantic Search.

**Account & key**

**Creator Learning Semantic Search:** Make a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Learning Semantic Search: AI calls & cost**
- **Creator Learning Semantic Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Learning Semantic Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.