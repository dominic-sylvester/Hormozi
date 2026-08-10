# Company Profile Schema

```json
{
  "companyName": "string",
  "websiteUrl": "string",
  "brandPromise": "string",
  "researchNotes": "string",
  "researchSources": [{ "url": "string", "title": "string" }],
  "metrics": { "leadsWeekly": "number|null", "...": "..." },
  "goals": ["string"],
  "offers": [{
    "id": "string",
    "name": "string",
    "description": "string",
    "promise": "string",
    "pricePoint": "string",
    "channel": "string",
    "status": "draft|active|archived",
    "targetAvatarIds": ["string"],
    "metrics": { "...": "..." },
    "updatedAt": "ISO-8601"
  }],
  "avatars": [{
    "id": "string",
    "name": "string",
    "description": "string",
    "pains": ["string"],
    "desires": ["string"],
    "status": "draft|active|archived",
    "updatedAt": "ISO-8601"
  }],
  "active": {
    "offerId": "string|null",
    "avatarId": "string|null"
  },
  "updatedAt": "ISO-8601|null"
}
```

Legacy flat fields (`offer`, `avatar`, `promise`, `pricePoint`, `channel`) migrate automatically into `primary-offer` and `primary-avatar` on load.
