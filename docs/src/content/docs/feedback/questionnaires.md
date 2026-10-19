---
title: Feedback questionnaires
description: Add review questions to a report with feedbackQuestionnaire, the question kinds you can use, and where the answers go.
---

Every classifier and regressor report gets an assessment step in reviews without any setup. To ask
reviewers more, give the report a `feedbackQuestionnaire` in a [schema change](/schemas/changes/)
and publish it. Reviews of inferences of the new snapshot then show those questions, and so does
the **Review this run** panel of its [public page](/publishing/public-pages/#review-a-run).

```json title="A report with review questions"
{
  "kind": "classifier",
  "label": "Decision",
  "labels": ["approve", "decline"],
  "mappedTo": { "Demo Loan Tree": 0 },
  "feedbackQuestionnaire": {
    "steps": [
      {
        "id": "assessment",
        "title": "Your assessment",
        "fields": [
          { "kind": "rating", "id": "confidence", "label": "How confident are you in this decision?", "min": 1, "max": 5 },
          { "kind": "single-choice", "id": "follow", "label": "Would you follow it?", "options": ["Yes", "No", "Unsure"] },
          { "kind": "long-text", "id": "comments", "label": "Comments", "required": false, "rows": 3 }
        ]
      }
    ]
  }
}
```

## Structure

`feedbackQuestionnaire.steps` is a list of steps, each with an `id`, a `title` and its `fields`.
Fields use the [field kinds](/schemas/reference/#field-kinds) of the form, for example `rating`
(`min`, `max`, `step`), `single-choice` and `multi-choice` (`options`, `layout`), `long-text`
(`placeholder`, `minLength`, `maxLength`, `rows`), `text`, `number`, `boolean` and `category`.
Plugin field kinds work too.

- Give each field an `id`; it names the answer in the export. Without one, MLsuite derives it from
  the step id and the label, as `<step id>-<label in kebab case>`.
- Step ids and field ids are used exactly as written. They cannot contain whitespace or be
  `__proto__`, `constructor` or `prototype`; such a questionnaire is reported as invalid.
- Every question is required unless it says `"required": false`.

In reviews, MLsuite shows the questions as one step titled "&lt;report label&gt; review". Reports added
by plugins get only these questions, without an assessment step.

An invalid questionnaire is reported in the editor ("Report N has an invalid feedback
questionnaire. Expected steps with id, title, and fields."), and reviews of that snapshot show it
as an error instead of the form.

## Where the answers go

- The inference's **Reviews** tab, per reviewer.
- The Inferences table, as one column per report, question and reviewer, usable in column
  conditions.
- The [CSV export](/predictions/export/#the-file), as `report.<report>.<question>.<reviewer>`.

Answers are stored per snapshot. A new questionnaire applies to runs of the snapshot that has it;
runs of earlier snapshots keep the questions they had.
