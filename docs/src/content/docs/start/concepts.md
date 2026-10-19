---
title: Concepts
description: The words MLsuite uses, what each one is, and how a model becomes a reviewed, exportable prediction.
---

MLsuite has a small vocabulary. Each term below names something the application stores and
shows, and each one keeps a link to the others so that any result can be traced back to the exact
model and form that produced it.

## The objects

**Organization**
: The workspace that owns models, schemas, bookmarks, inferences, reviews, plugins, API clients and
  members. Everything in the app belongs to the organization chosen in the switcher. Every account
  gets a personal organization when it is created.

**Model**
: A trained model uploaded as an `.mlbundle` file. MLsuite stores the file, its SHA-256 and what the
  bundle declares: library, estimator, features, outputs, parameters and training environment.

**Schema**
: The contract between people and one or more models: which fields the form asks for, how each
  field maps to a model feature, and which reports show the results. A schema is a named
  repository of snapshots.

**Snapshot**
: An immutable, numbered version of a schema (`v1`, `v2`, …). It holds the form JSON and its
  **bindings**, the models it runs. Snapshots are never edited; changing a schema publishes a new
  one.

**Change**
: Editable work on a schema, based on one snapshot. Publishing a change creates the next snapshot.

**Bookmark**
: A named pointer to one snapshot, such as `production`. You run bookmarks, not schemas. A bookmark
  can be moved to a newer snapshot, published as a public page and given to API clients.

**Inference**
: One saved run of a bookmark: the inputs, every bound model's result, the snapshot it ran on, who
  ran it and from where (the workspace, a public page or the API). The API calls it a prediction run.

**Review**
: A request for organization members to give feedback on a set of inferences of one snapshot,
  before a date. Each reviewer answers each inference.

**Feedback**
: A reviewer's answers about a result: the class or value they consider right for each built-in
  output, and the questions of the report's feedback questionnaire.

**Plugin**
: A TypeScript file that adds a field kind or report kind to the organization's forms.

**API client**
: A piece of outside software that runs the bookmarks it was given, with its own keys.

## The loop

1. Upload a model. Its bundle carries the fields and reports that a schema starts from.
2. Create a schema from one or more models. Its first snapshot, `v1`, is published immediately.
3. Bookmark a snapshot. The bookmark appears under **Predict**.
4. Run the bookmark and save the runs you want to keep. Each saved run is an inference.
5. Ask reviewers to give feedback on a selection of inferences.
6. Filter the inferences, look at the answers in the table, and export them as CSV.

Improving the form means publishing a new snapshot and moving the bookmark to it. Earlier
inferences keep pointing at the snapshot they ran on, so their inputs, outputs and feedback
always keep their original meaning.

## Who can do what

What a member sees depends on the permissions of their role in the organization: for example,
**View models** shows Models, Schemas, Predict and Inferences, **Run predictions** lets them save
runs, and **Review** opens the Review inbox. The built-in roles and every permission are listed in
[Roles and permissions](/organizations/roles/).

A **superadmin** is a platform-wide account that can act in every organization and opens the
[administration pages](/admin/users/).
