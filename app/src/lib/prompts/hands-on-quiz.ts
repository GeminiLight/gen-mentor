import { z } from "zod";
import { DocumentQuiz } from "@/lib/schemas/assessment";

/** Additive contract: legacy callers keep the original quiz prompt and its replay fixtures. */
export const handsOnQuizInstructions = `

**Hands-on extension**:
Extend the output with ordering_questions and configuration_questions using the schema below.
Keep the exact requested counts for the four existing question types.
Add at most ONE ordering task and at most ONE configuration task, only where the document
actually teaches an applicable procedure or configuration. Return an empty list for an
inapplicable type; never invent technical settings or turn unrelated prose into a JSON puzzle.
Use the document's language for all question text, steps and explanations.

Ordering tasks: prefer 3–4 distinct steps (at most 8) with ONE unambiguous dependency-based sequence taught in
the document. State the intended task and any dependencies needed to avoid alternate valid
orders. Present items in a scrambled order. correct_order is a zero-based permutation of
all item indices and must differ from the initial display order. Do not number the item
texts or reveal the correct order in the question. Each adjacent step must have a real
prerequisite relationship; do not grade interchangeable inspections as one exact order.
Do not mix optional optimizations with the main sequence. Check that a step described as
"before loading" is actually before loading in correct_order. If there is no uniquely
supported sequence, return an empty ordering_questions list. For example, running independent
inspection commands such as head(), info(), and describe() is NOT a dependency chain:
they may run in any order, so do not make an ordering task from them. Do not add an
arbitrary order merely to make an ordering task possible.

Configuration tasks: a small JSON object with 2–5 fields, grounded in an actual example,
setting or parameter selection taught in the document. Use only flat primitive-valued fields
(strings, numbers, booleans or null); never arrays or nested objects. Use real parameter
names AND their actual value types taught in the document, not invented API parameters.
Never convert a list-valued parameter into a comma-separated string to fit this format.
Instead choose other parameters that really accept primitive values, or omit the task.
For example read_csv sep, nrows, encoding can be scalar settings, whereas usecols and
parse_dates lists must NOT be encoded as strings. The correct JSON must be directly
usable as the documented configuration without undocumented conversions. State the scenario, every required
field and its type, and enough constraints to determine its value. Require exactly those
fields. Do not test undeclared defaults or unrelated JSON trivia. Supply a valid but
incorrect starter_configuration, plus 1–4 complete correct_configurations covering all
acceptable solutions. These fields are JSON-encoded strings containing objects, not nested
objects. Grading ignores whitespace and object key order, but preserves primitive types,
array order and extra fields. Never include credentials, execute code or claim execution.
Every task needs an explanation of the practical reasoning behind the solution.

The schema below replaces the earlier four-list-only output structure. In addition to this
schema, correct_order must contain each index exactly once, item texts must be unique,
and no correct configuration may equal the starter configuration. All configurations must
have the same 2–5 field names and only primitive values. Avoid open-ended tasks or multiple
equally valid encodings; if all valid answers cannot be listed, omit the configuration task.
${JSON.stringify(z.toJSONSchema(DocumentQuiz))}
`;
