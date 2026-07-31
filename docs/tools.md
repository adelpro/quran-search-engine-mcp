# Tools reference

Every tool exposed by `quran-search-engine-mcp`. All tools are read-only — no state
is mutated, no data is written, and no external services are contacted.

## Conventions

- Every tool returns `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }` on success.
- Errors return `{ isError: true, content: [{ type: 'text', text: JSON.stringify({ error }) }] }`.
- Empty lookups (e.g. `get_verse` for a non-existent gid) return a successful payload with
  `null` or empty array — they do **not** return `isError: true`.
- Dataset-not-loaded errors (server still warming up) return `isError: true`.
- `gid` (global id) is a 1-indexed sequential counter across all 114 surahs.
  For example, the first verse of Al-Fatihah is `gid: 1`, and `gid: 262` is
  Ayat al-Kursi (2:255).

## Tool annotations

All eight tools declare the same annotation values:

| Annotation | Value | Why |
| --- | --- | --- |
| `readOnlyHint` | `true` | No state changes. |
| `destructiveHint` | `false` | Nothing is deleted or altered. |
| `idempotentHint` | `true` | Repeated calls with the same inputs return the same payload. |
| `openWorldHint` | `false` | The server only reads its in-memory dataset; no external systems are touched. |

---

## `search`

Title: **Quran Search**

Search the Quran with Arabic normalization, lemma/root options, and highlights.

| Field | Value |
| --- | --- |
| Description | "Search the Quran with Arabic normalization, lemma/root options, and highlights." (82 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "query":  "string (min 1, required)",
  "lemma":  "boolean (default: true)",
  "root":   "boolean (default: true)",
  "page":   "integer ≥ 1 (default: 1)",
  "limit":  "integer 1–200 (default: 10)"
}
```

### Output

```json
{
  "results": [
    {
      "gid": 2,
      "sura_id": 1,
      "aya_id": 2,
      "aya_id_display": "٢",
      "uthmani": "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ",
      "standard": "الحمد لله رب العالمين",
      "matchScore": 3,
      "matchType": "exact",
      "matchedTokens": ["الحمد"],
      "highlights": [{ "start": 0, "end": 5, "token": "الحمد", "matchType": "exact" }]
    }
  ],
  "counts":    { "simple": 48, "lemma": 0, "root": 0, "fuzzy": 265, "total": 313 },
  "pagination":{ "totalResults": 313, "totalPages": 105, "currentPage": 1, "limit": 3 }
}
```

### Try it

```bash
curl -X POST https://mcp.quran.us.kg/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search","arguments":{"query":"الرحمن","limit":3}}}'
```

---

## `list_surahs`

Title: **List Surahs**

Return all 114 surahs with id, names (Arabic, English, romanization), verse count, juz list, and Mushaf page range.

| Field | Value |
| --- | --- |
| Description | "Return all 114 surahs with id, names (Arabic, English, romanization), verse count, juz list, and Mushaf page range." (123 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

None — the input schema is `{}`.

### Output

```json
{
  "surahs": [
    {
      "id": 1,
      "sura_name": "الفاتحة",
      "sura_name_en": "The Opening",
      "sura_name_romanization": "Al-Fatihah",
      "total_verses": 7,
      "juz_ids": [1],
      "page_start": 1,
      "page_end": 1
    }
  ]
}
```

Length is always 114.

---

## `get_sura_info`

Title: **Get Sura Info**

Look up one surah by numeric id (1–114), Arabic name, English name, or romanization. Returns the matching record or null.

| Field | Value |
| --- | --- |
| Description | "Look up one surah by numeric id (1–114), Arabic name, English name, or romanization. Returns the matching record or null." (132 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "identifier": "number (integer) | string (1–120 chars)"
}
```

### Output

```json
{ "sura": { "id": 2, "sura_name": "البقرة", "sura_name_en": "The Cow", "sura_name_romanization": "Al-Baqarah", "total_verses": 286, "juz_ids": [1, 2, 3], "page_start": 2, "page_end": 49 } }
```

If no sura matches, returns `{ "sura": null }` (not an error).

---

## `get_verse`

Title: **Get Verse**

Fetch a single verse by global id or by (suraId, ayaId). Returns the full verse record or null.

| Field | Value |
| --- | --- |
| Description | "Fetch a single verse by global id or by (suraId, ayaId). Returns the full verse record or null." (98 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "gid":    "integer ≥ 1 (optional)",
  "suraId": "integer 1–114 (optional)",
  "ayaId":  "integer 1–286 (optional)"
}
```

Provide **either** `gid`, **or both** `suraId` and `ayaId`. Returns
`isError: true` if neither combination is supplied.

### Output

```json
{ "verse": { "gid": 262, "sura_id": 2, "aya_id": 255, "uthmani": "…", "standard": "…", "page_id": 42, "juz_id": 3, "sura_name": "البقرة", "sura_name_en": "The Cow", "sura_name_romanization": "Al-Baqarah" } }
```

---

## `get_verses_by_range`

Title: **Get Verses By Range**

Fetch verses by Quran range syntax: `'2:255'` (single), `'1:1-7'` (range), or `'2:'` (whole sura).

| Field | Value |
| --- | --- |
| Description | "Fetch verses by Quran range syntax: '2:255' (single), '1:1-7' (range), or '2:' (whole sura)." (102 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{ "range": "string matching ^\\d{1,3}:(\\d{1,3})?(-\\d{1,3})?$" }
```

### Output

```json
{
  "range": { "sura": 2, "startAya": 255 },
  "verses": [ { "gid": 262, "sura_id": 2, "aya_id": 255, "uthmani": "…", "standard": "…" } ]
}
```

`endAya` is omitted from the parsed range when not given. If only `startAya` is
given, the result is the single verse at that aya. If neither aya is given
(e.g. `"2:"`), the result is the whole sura. `endAya` is silently clamped to
the sura's `total_verses`.

---

## `find_verses_by_root`

Title: **Find Verses By Root**

Find verses containing a normalized Arabic root via the inverted root index. Paginated.

| Field | Value |
| --- | --- |
| Description | "Find verses containing a normalized Arabic root via the inverted root index. Paginated." (95 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "root":  "string (min 1, required)",
  "page":  "integer ≥ 1 (default: 1)",
  "limit": "integer 1–200 (default: 20)"
}
```

### Output

```json
{
  "root": "حمد",
  "normalizedRoot": "حمد",
  "verses": [ { "gid": 2, "sura_id": 1, "aya_id": 2, "uthmani": "…", "standard": "…" } ],
  "pagination": { "totalResults": 124, "totalPages": 7, "currentPage": 1, "limit": 20 }
}
```

`normalizedRoot` is the form of `root` after `normalizeArabic()` — the form
actually used to key the inverted index. When the root is not in the index,
`verses` is `[]` and `pagination.totalResults` is `0`.

---

## `find_verses_by_lemma`

Title: **Find Verses By Lemma**

Find verses containing a normalized lemma via the inverted lemma index. Paginated.

| Field | Value |
| --- | --- |
| Description | "Find verses containing a normalized lemma via the inverted lemma index. Paginated." (94 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

```json
{
  "lemma": "string (min 1, required)",
  "page":  "integer ≥ 1 (default: 1)",
  "limit": "integer 1–200 (default: 20)"
}
```

### Output

```json
{
  "lemma": "حمد",
  "normalizedLemma": "حمد",
  "verses": [ { "gid": 2, "sura_id": 1, "aya_id": 2, "uthmani": "…", "standard": "…" } ],
  "pagination": { "totalResults": 124, "totalPages": 7, "currentPage": 1, "limit": 20 }
}
```

Same shape as `find_verses_by_root` but keyed on lemma. Empty results
(`{ verses: [], pagination: { totalResults: 0, … } }`) are returned when the
lemma is not in the index.

---

## `get_verse_morphology`

Title: **Get Verse Morphology**

Get the lemmas and roots for a single verse by gid or by (suraId, ayaId). Returns morphology or null.

| Field | Value |
| --- | --- |
| Description | "Get the lemmas and roots for a single verse by gid or by (suraId, ayaId). Returns morphology or null." (108 chars) |
| Annotations | `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false` |

### Input

Same as `get_verse` — `gid` or `(suraId, ayaId)`.

### Output

```json
{ "morphology": { "gid": 1, "lemmas": ["حمد", "له", "رب", "علم"], "roots": ["حمد", "اله", "ربب", "علم"] } }
```
