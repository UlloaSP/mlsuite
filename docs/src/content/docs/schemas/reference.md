---
title: Schema reference
description: The JSON document a schema snapshot holds, field and report kinds, how fields map to model features, and where review questions go.
---

A snapshot's document is an [MLform](https://docs.mlform.eshkra.dev/schema/overview/) form schema
with two lists, `fields` and `reports`, in which every `mappedTo` names the model it feeds. This is
the document you edit in a [change](/schemas/changes/).

```json title="Loan approval (demo) · v2, abridged"
{
  "fields": [
    {
      "kind": "number",
      "label": "Age",
      "description": "Applicant age in years.",
      "step": 1,
      "required": true,
      "mappedTo": { "Demo Loan Tree": "age" }
    },
    {
      "kind": "onehot-category",
      "label": "Employment",
      "required": true,
      "options": [
        { "label": "Salaried", "value": "salaried", "mappedTo": { "Demo Loan Tree": "employment__salaried" } },
        { "label": "Self-employed", "value": "self_employed", "mappedTo": { "Demo Loan Tree": "employment__self_employed" } },
        { "label": "Unemployed", "value": "unemployed", "mappedTo": { "Demo Loan Tree": "employment__unemployed" } }
      ]
    }
  ],
  "reports": [
    {
      "kind": "classifier",
      "label": "Decision",
      "labels": ["approve", "decline"],
      "showClassProbabilities": true,
      "mappedTo": { "Demo Loan Tree": 0 },
      "feedbackQuestionnaire": { "steps": [] }
    }
  ]
}
```

## Mapping to models

`mappedTo` is an object keyed by the **model name** of each binding, so one field can feed several
models:

- On a field, the value is the model's feature name, or its position (`0`, `1`, …) for a model
  that takes features by position.
- On a `onehot-category` option, it is the one-hot column that option sets to `1`; the other
  options' columns are sent as `0`.
- On a report, it is the position of the model output the report shows.

The model's id also works as a key. A snapshot must keep a field for every feature its models
need; a model that misses a feature refuses the run.

## Field kinds

| Kind | Asks for |
| --- | --- |
| `number` | A number; `min`, `max`, `step`, `unit`. |
| `text`, `long-text` | Free text. |
| `boolean` | True or false; `trueLabel`, `falseLabel`. |
| `category` | One option from a list. |
| `single-choice`, `multi-choice` | One or several options shown at once. |
| `rating` | A score from `min` to `max`. |
| `date` | A date. |
| `onehot-category` | One option, sent as one 0/1 column per option. |
| `mapped-category` | One option that writes a preset of values into other fields. |
| `series` | A table of rows, sent as a list. |

Every field and report may have an `id`. An explicit id is used exactly as written and cannot
contain whitespace; without one, MLform derives it from the label in kebab case. Conditions refer
to fields by these ids.

Every field also takes the shared options: `label`, `description`, `required`, `defaultValue`,
and `hidden`, `disabled` and `readOnly`, each with a `…When` condition on other fields. The
[MLform field reference](https://docs.mlform.eshkra.dev/schema/fields/) documents every option and
[conditions](https://docs.mlform.eshkra.dev/schema/conditions/) the `…When` syntax.

Kinds added by the organization's [plugins](/plugins/) are accepted too.

## Report kinds

| Kind | Shows | Options |
| --- | --- | --- |
| `classifier` | The predicted class and, with `showClassProbabilities`, a bar per class. | `labels`: the display name of each class, in the model's class order. |
| `regressor` | The predicted value. | `unit` and the [MLform report options](https://docs.mlform.eshkra.dev/schema/reports/). |

Plugins can add report kinds. Classifier and regressor reports get an assessment step in reviews;
every report can carry review questions in `feedbackQuestionnaire`, described in
[Feedback questionnaires](/feedback/questionnaires/).

## What the bundle generates

Without edits, `v1` holds what the bundle's schema carried: a `number`, `boolean`, `text`, `date`,
`category`, `series` or `onehot-category` field per feature, labelled with the feature name, and
one report per model output, labelled "Predicted class" or "Predicted value". When a schema
combines several models, fields with the same label and kind are merged and each report is
labelled "&lt;report&gt; · &lt;model&gt;".
