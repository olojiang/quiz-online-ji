/**
 * Product feature flags. Flip a flag back to `true` to restore the feature —
 * the database columns (qoj_events.groups, qoj_questions.group_name,
 * qoj_participants.group_name, qoj_responses.answer->group) are kept intact.
 */
/** 组别 (group/department): guest join field, filters, per-group stats & export columns. Hidden for now. */
export const FEATURE_GROUPS = false;
