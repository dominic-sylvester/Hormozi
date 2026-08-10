# Company Profile Schema

```json
{
  "companyName": "string",
  "websiteUrl": "string",
  "offer": "string",
  "avatar": "string",
  "promise": "string",
  "pricePoint": "string",
  "channel": "string",
  "researchNotes": "string",
  "researchSources": [{ "url": "string", "title": "string" }],
  "metrics": {
    "leadsWeekly": "number | null",
    "adSpendWeekly": "number | null",
    "cpl": "number | null",
    "showRate": "number | null",
    "closeRate": "number | null",
    "churnRate": "number | null"
  },
  "goals": ["string"],
  "updatedAt": "ISO-8601 string | null"
}
```

Research fields are populated during URL onboarding. Persist them only after the user confirms the draft profile.
