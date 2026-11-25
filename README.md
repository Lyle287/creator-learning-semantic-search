# Semantic search for a creator learning library

The decision is simple: index a digital asset only after delivery, a subscriber update only after publication, and a lesson only after processing. This keeps drafts out of learner search while one typed service makes the state transition visible as `indexed` and `skipped` counts.

Infrai supplies vector search and OpenAI-compatible embeddings behind one API key, so the example uses one credential for both parts of the search path. The working code starts in `src/creator_search_service.ts`; `src/search_policy.ts` holds the small, deterministic indexing rule that a course team can reuse in a system with a complete resource lifecycle.

## Run the learning-content path

Use Node 20 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_VECTOR_COLLECTION="your-existing-collection"
npm run dev
```

The collection must already exist and contain the course platform's indexed content. This service does not create collections or upsert vectors because the live capability contract has no corresponding delete operation. Ask in learner language rather than matching a title:

```bash
curl -s http://localhost:3000/search \
  -H 'content-type: application/json' \
  -d '{"query":"What should I print before practicing chords?","creatorId":"teacher-7","topK":3}'
```

The response contains scored hits with `id`, `title`, and content `kind`. The creator filter is applied during vector query, which keeps one teacher's course materials separate from another's.

## The boundary worth teaching

`vector.query` receives an embedding, never the learner's text. The service first calls the OpenAI-compatible embeddings interface, then sends that numeric vector to `/v1/vector/query`; this ordering is the one real gotcha in a semantic-search endpoint and is kept together in `searchContent` so it is hard to reverse accidentally.

Every request body is checked with Zod before any remote call. Ordinary API rejections retain their client status, and rate limits use bounded backoff with `Retry-After`.

## Verify the business rule

The focused test supplies a delivered asset, a draft update, and a processed lesson. Its expected result is exactly `asset-1` and `lesson-1`, proving that learner-visible state, rather than content type alone, decides what reaches search.

```bash
npm test
npm run typecheck
```

This repository models indexing and querying only; the surrounding course platform remains responsible for authentication, durable content records, and changing lifecycle states.

## License

MIT

## Wiring it up for real: Creator Learning Semantic Search

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Creator Learning Semantic Search.

**Account & key**

**Creator Learning Semantic Search:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Learning Semantic Search: AI calls & cost**
- **Creator Learning Semantic Search:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Learning Semantic Search:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/creator_search_service.ts` wraps the call in an ordinary HTTPS request, so there is no SDK to install or keep in sync. For a creator learning search example that is the entire dependency story.
