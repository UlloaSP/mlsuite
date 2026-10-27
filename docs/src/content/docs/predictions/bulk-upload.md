---
title: Bulk upload
description: Run up to 10,000 records from a CSV or XLSX file, the columns it needs, how values are read, and how errors are reported.
---

**Bulk upload** on a bookmark's run page runs every record of a CSV or XLSX file on the server, as
a job, and saves each record as a run in the bookmark's history. The file is read in your browser and
its records are sent once; the job then goes on if you close the tab or reload the page.

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

Choose **Bulk upload**, then **Upload a file**. The dialog lists the bookmark's uploads, newest
first, each with its progress ("1200 of 3000 saved", how many failed and how many are still to run),
who started it and when; the button counts the uploads still running. Uploads run 100 records at a
time through the same share of the runtime as your other runs, and wait their turn when it is busy.

A record is saved only when every model answered it. A record any model refused, or that could not
be saved (its name is already used, for example), fails and keeps the reasons: **Show failures**
lists them. **Cancel** stops an upload that is still running; the records already saved stay.
**Retry failed rows** runs a finished upload's failed records again. Each member may have 2 uploads
running at once, and an organization 4.

A problem with the file as a whole refuses it before anything runs:

| Message | Cause |
| --- | --- |
| Missing input columns: … | A model input has no column. |
| Unknown input columns: … | A column matches no model input. |
| Headers must be unique | Two columns share a name. |
| File exceeds maximum of 10000 records | Too many rows. |
| Unsupported file type | Not a CSV or XLSX file. |

A problem with one record skips that record and the others still run: a missing required value, a
number that is not finite, a boolean that is not one of the words above, or invalid JSON. One notice
reports how many lines were skipped and the reasons of the first ones, with their line numbers.
