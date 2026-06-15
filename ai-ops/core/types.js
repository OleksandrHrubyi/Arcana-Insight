export const AI_OPS_TYPES_VERSION = 1

/**
 * @typedef {object} Issue
 * @property {string} id
 * @property {string} source
 * @property {'info' | 'warning' | 'blocker'} severity
 * @property {string} category
 * @property {string} title
 * @property {string} details
 * @property {string | null} file
 * @property {number | null} line
 * @property {string} ruleId
 * @property {string} suggestedAction
 * @property {Record<string, unknown>} meta
 */

/**
 * @typedef {object} CheckSummary
 * @property {number} totalIssues
 * @property {number} blockers
 * @property {number} warnings
 * @property {number} infos
 */

/**
 * @typedef {object} CheckResult
 * @property {string} check
 * @property {number} version
 * @property {'ok' | 'warning' | 'failed'} status
 * @property {string} startedAt
 * @property {string} finishedAt
 * @property {number} durationMs
 * @property {CheckSummary} summary
 * @property {Issue[]} issues
 * @property {Record<string, unknown>} meta
 */

/**
 * @typedef {object} ManifestCheck
 * @property {'ok' | 'warning' | 'failed'} status
 * @property {string} path
 * @property {number} blockers
 * @property {number} warnings
 * @property {number} infos
 * @property {number} totalIssues
 */

/**
 * @typedef {object} Manifest
 * @property {string} generatedAt
 * @property {Record<string, ManifestCheck>} checks
 * @property {string[]} topIssues
 */

