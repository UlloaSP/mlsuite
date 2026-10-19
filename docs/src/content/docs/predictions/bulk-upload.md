---
title: Bulk upload
description: Run up to 10,000 records from a CSV or XLSX file, the columns it needs, how values are read, and how errors are reported.
---

**Bulk upload** on a bookmark's run page runs every record of a CSV or XLSX file through the form,
one at a time, and adds each result to the [session](/predictions/run/#the-session). Nothing is
saved until you save the entries, so you can check them first.

## The file

- A `.csv` file, or an `.xlsx` file whose first sheet holds the records.
- One header row, then up to **10,000** records.
- An optional first column `name` with the name of each run. Without it, runs are named
  `bulk-upload-<id>-1`, `-2`, and so on.
- One column per **model input**, named after the feature the field maps to. A `onehot-category`
  field takes one column per option, holding `1` for the chosen option and `0` for the others. For a
  model that takes features by position, the field's label also works.

Every model input must be present, headers must be unique, and no other columns are allowed.

```csv title="loan-batch.csv"
name,age,income,has_guarantor,employment__salaried,employment__self_employed,employment__unemployed
batch-applicant-01,52,61000,false,1,0,0
batch-applicant-02,24,18500,true,0,1,0
```

## How values are read

| Field kind | Write |
| --- | --- |
| `number`, `rating` | A finite number. |
| `boolean` | `true`, `1`, `yes` or `si`; `false`, `0` or `no`. |
| `multi-choice` | Values separated by `;`. |
| `series` | A JSON array. |
| Other kinds | The text value, or JSON. |

## Run and check

Choose **Bulk upload** and pick the file. The button shows the progress ("Bulk 12/40") and turns
into **Stop** while it runs; when it ends it summarizes the outcome, for example "38 uploaded,
1 failed, 1 skipped". Then save the session entries you want to keep.

A problem with the file as a whole refuses it before anything runs:

| Message | Cause |
| --- | --- |
| Missing input columns: … | A model input has no column. |
| Unknown input columns: … | A column matches no model input. |
| Headers must be unique | Two columns share a name. |
| File exceeds maximum of 10000 records | Too many rows. |
| Unsupported file type | Not a CSV or XLSX file. |

A problem with one record skips that record and the others still run: a missing required value, a
number that is not finite, a boolean that is not one of the words above, or invalid JSON. The first
five skipped lines are reported by line number.
