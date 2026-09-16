#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ROOT = path.resolve(__dirname, '..');

const CONTRACT_FILES = [
  'skills/figma-to-code/SKILL.md',
  'skills/figma-to-code/references/figma-evidence-contract.md',
  'skills/image-to-code/SKILL.md',
  'skills/design-system/SKILL.md',
  'skills/design-system/reference/token-extraction-and-drift.md',
  'skills/visual-regression-testing/SKILL.md',
  'skills/visual-regression-testing/references/machine-visual-gate.md',
  'skills/web-page-design-to-code/SKILL.md',
  'skills/web-page-design-to-code/references/deliverables.md',
  'skills/website-redesign-to-code/SKILL.md',
  'skills/website-redesign-to-code/references/deliverables.md',
];

const MACHINE_RECEIPT_FIELDS = [
  'mode',
  'matrixCell',
  'referenceId',
  'baselineId',
  'verdict',
  'nextAction',
  'baselineAction',
];

const MACHINE_CONTRACT_FIELDS = {
  authority: ['mode', 'referenceId', 'baselineId', 'baselineApprover'],
  environment: ['matrixCell', 'browser', 'deviceScale', 'theme', 'locale', 'state', 'fixture'],
  policy: ['channels', 'thresholds', 'warnHandling', 'errorHandling', 'retention', 'cache', 'networkEgress'],
};

// Authorization is independent of visual/product scope and machine comparison mode.
// These invariants supplement canonical prose hashes; changing a gate's text must
// not silently change who can authorize implementation or external effects.
const GATE_AUTHORIZATION_POLICY = {
  modes: ['gated', 'delegated', 'already-approved'],
  defaultMode: 'gated',
  delegatedRequires: ['bounded-scope', 'direction-or-design-choice', 'implementation'],
  alreadyApprovedRequires: ['same-scope', 'versioned-design-authority', 'implementation'],
  explicitUserCheckpointBinding: true,
  existingAuthorizationSatisfiesGate: true,
  requiresInternalGateName: false,
  readOnlyOverridesModes: true,
  preservationAppliesToAllModes: true,
  evidenceRequiredInAllModes: true,
  isolatedSitePilotRequired: true,
  baselineOwnerApprovalRequired: true,
  productMigrationAuthorizationSeparate: true,
  externalActionAuthorizationSeparate: true,
  changedScopeRequiresReassessment: true,
  supportMayCloseGate: false,
};

const AUTHORIZATION_RECORD_FIELDS = [
  'mode', 'checkpoint', 'posture', 'scopeVersion', 'directionVersion', 'authorizationEvidence',
  'explicitUserCheckpoint', 'implementationAuthorized', 'requiredEvidence',
  'pilotEvidence', 'baselineOwner', 'baselineAction', 'baselineChangeApproval',
  'externalActionAuthorization', 'nextAction',
];

const EXPECTED_BLOCKS = [
  {
    file: 'skills/figma-to-code/SKILL.md',
    value: {
      id: 'figma-to-code.execution',
      part: 'execution',
      version: 1,
      type: 'source-workflow',
      section: 'Execution Ownership',
      parentWorkflows: ['web-page-design-to-code.orchestration', 'website-redesign-to-code.orchestration'],
      textParts: {
        ownership: {
          section: 'Execution Ownership',
          sha256: 'd12b777460dd4c269691bc99c7783634c7292d413e8087f036b791f92ff93b6e',
        },
        stop: {
          section: '3. Reconcile Design and Repository Authority',
          sha256: 'd7517f0ef84243b66b454a2f3c780d9fd4479c4b28b30beaa546ba8b7fe24c73',
        },
      },
      modes: {
        standalone: { ownsRouting: true, mayEditProduction: true },
        'parent-receipt': {
          defaultWhenParentGateOpen: true,
          mayEditProduction: false,
          mayApproveBaseline: false,
          mayCloseParentGate: false,
          mayReroute: false,
          mayExpandScope: false,
          returnsToParent: true,
          stopBeforeSection: '4. Implement in Verifiable Slices',
        },
      },
    },
  },
  {
    file: 'skills/image-to-code/SKILL.md',
    value: {
      id: 'image-to-code.execution',
      part: 'execution',
      version: 1,
      type: 'source-workflow',
      section: 'Execution Ownership',
      parentWorkflows: ['web-page-design-to-code.orchestration', 'website-redesign-to-code.orchestration'],
      textParts: {
        ownership: {
          section: 'Execution Ownership',
          sha256: '2e8f3ce9bab650e960e1197c30fa41203d5082b9e159378c1257f1442ad50122',
        },
        stop: {
          section: '4. Create the Implementation Contract',
          sha256: 'd131d7b546eecd11310e888ab293e1fbad99f3fd216d4a389640a6eff9f1f007',
        },
      },
      modes: {
        standalone: { ownsRouting: true, mayEditProduction: true },
        'parent-receipt': {
          defaultWhenParentGateOpen: true,
          mayEditProduction: false,
          mayApproveBaseline: false,
          mayCloseParentGate: false,
          mayReroute: false,
          mayExpandScope: false,
          returnsToParent: true,
          stopBeforeSection: '5. Implement in the Existing Stack',
        },
      },
    },
  },
  {
    file: 'skills/figma-to-code/references/figma-evidence-contract.md',
    value: {
      id: 'figma-to-code.fallback',
      part: 'matrix',
      version: 1,
      type: 'fallback-matrix',
      section: 'Fallback Matrix',
      rows: {
        structured_and_screenshot: {
          standaloneAction: 'full_workflow',
          parentAction: 'return_receipt',
        },
        structured_only: {
          standaloneAction: 'initial_implementation',
          parentAction: 'return_receipt',
        },
        screenshot_only: {
          standaloneAction: 'route_image_to_code',
          parentAction: 'recommend_fallback_and_stop',
        },
        unreadable_url: {
          standaloneAction: 'stop',
          parentAction: 'blocked_receipt',
        },
        partial_node: {
          standaloneAction: 'refetch_children',
          parentAction: 'refetch_authorized_children',
        },
      },
    },
  },
  {
    file: 'skills/design-system/SKILL.md',
    value: {
      id: 'design-system.execution',
      part: 'posture',
      version: 1,
      type: 'write-posture',
      section: 'Execution Posture',
      parentWorkflows: ['web-page-design-to-code.orchestration', 'website-redesign-to-code.orchestration'],
      textParts: {
        posture: {
          section: 'Execution Posture',
          sha256: '831196f4fcb7bcd326b13a7cf6b32531016325ef5a49a7f3b54bb59a8859c82c',
        },
      },
      postures: {
        'audit-dry-run': {
          mayWrite: false,
          requiresExplicitUserAuthorization: false,
          returnOwner: 'parent-or-owning-task',
        },
        'apply-generate': {
          mayWrite: true,
          requiresExplicitUserAuthorization: true,
          requiresParentGateWhenPresent: true,
        },
      },
      driftKinds: ['add', 'change', 'rename', 'alias', 'deprecate', 'delete'],
      completionReference: 'skills/design-system/reference/token-extraction-and-drift.md',
    },
  },
  {
    file: 'skills/design-system/reference/token-extraction-and-drift.md',
    value: {
      id: 'design-system.execution',
      part: 'completion',
      version: 1,
      type: 'write-posture-completion',
      section: 'Completion by Execution Posture',
      textParts: {
        completion: {
          section: 'Completion by Execution Posture',
          sha256: '8ed099c174631075fb799b14a36630cd81f347c6c49969d9a676f9e58f85049c',
        },
      },
      completion: {
        'audit-dry-run': {
          requiresDestructiveApproval: false,
          requiresGeneratedOutputs: false,
          requiresConsumerVerification: false,
        },
        'apply-generate': {
          requiresDestructiveApproval: true,
          requiresGeneratedOutputs: true,
          requiresConsumerVerification: true,
        },
      },
    },
  },
  {
    file: 'skills/visual-regression-testing/references/machine-visual-gate.md',
    value: {
      id: 'visual-regression-testing.machine-gate',
      part: 'schema',
      version: 1,
      type: 'machine-gate',
      section: 'Normalized Result',
      consumers: ['web-page-design-to-code.orchestration', 'website-redesign-to-code.orchestration'],
      resultFields: ['verdict', 'contract', 'issues', 'nextAction', 'baselineAction', 'artifacts', 'unverified'],
      contractFields: ['mode', 'matrixCell', 'referenceId', 'baselineId'],
      issueFields: ['severity', 'channel', 'location', 'evidence', 'confidence', 'remediation'],
      enumValues: {
        verdict: ['pass', 'warn', 'fail', 'error'],
        mode: ['regression', 'reference-fidelity'],
        issueSeverity: ['blocking', 'major', 'minor', 'info'],
        issueChannel: ['dom', 'contrast', 'ocr', 'console', 'network', 'pixel', 'semantic', 'temporal'],
        issueConfidence: ['high', 'medium', 'low'],
        nextAction: ['done', 'revise', 'review', 'rerun'],
        baselineAction: ['unchanged', 'candidate', 'approved', 'rejected'],
      },
      authorityByMode: {
        regression: { requiredNonEmpty: 'baselineId', mustBeNull: 'referenceId' },
        'reference-fidelity': { requiredNonEmpty: 'referenceId', mustBeNull: 'baselineId' },
      },
      missingAuthority: { verdict: 'error', nextAction: 'review' },
    },
  },
  {
    file: 'skills/visual-regression-testing/SKILL.md',
    value: {
      id: 'visual-regression-testing.machine-gate',
      part: 'handoff',
      version: 1,
      type: 'machine-gate-handoff',
      section: 'Machine Gate Contract',
      machineReceiptFields: MACHINE_RECEIPT_FIELDS,
    },
  },
  {
    file: 'skills/web-page-design-to-code/SKILL.md',
    value: {
      id: 'web-page-design-to-code.orchestration',
      part: 'orchestration',
      version: 2,
      type: 'approval-orchestrator',
      section: '4. Draft the Implementation Contract',
      owner: 'top-level',
      authorization: GATE_AUTHORIZATION_POLICY,
      supportMode: 'parent-receipt',
      supportMayEditProductionBeforeGate: false,
      supportMayCloseGate: false,
      supportMayExpandScope: false,
      supportContracts: [
        'figma-to-code.execution',
        'image-to-code.execution',
        'design-system.execution',
        'visual-regression-testing.machine-gate',
      ],
      textParts: {
        authorization: {
          section: 'Choose the Authorization Mode',
          sha256: '14da6f7945a59a2b14a41b809bd728627e56f244193198b6b9201dda2848f07b',
        },
        'source-boundary': {
          section: 'Route the Request',
          sha256: '184bf95606468e357f27e135087b094b18826296b2392f8e8057151dd067a616',
        },
        'machine-lock': {
          section: '4. Draft the Implementation Contract',
          sha256: '73a688b27ff9d79b7a9b92d2444641be9debb0c63460103eacdd56b2093563d8',
        },
        'implementation-authorization': {
          section: '5. Resolve the Implementation Approval Gate',
          sha256: '1007ab97bb45d10eee7312d5a2a47d6ab424eb4841f05def91f379a30ed7c4ed',
        },
      },
      machineContract: 'visual-regression-testing.machine-gate',
      phaseBoundaries: {
        lockMachineContract: '4. Draft the Implementation Contract',
        implementationGate: '5. Resolve the Implementation Approval Gate',
        consumeMachineResult: '7. Render, Compare, and Repair',
      },
    },
  },
  {
    file: 'skills/web-page-design-to-code/references/deliverables.md',
    value: {
      id: 'web-page-design-to-code.orchestration',
      part: 'deliverable',
      version: 2,
      type: 'machine-receipt-template',
      section: 'Visual QA Report',
      authorizationRecordFields: AUTHORIZATION_RECORD_FIELDS,
      machineReceiptFields: MACHINE_RECEIPT_FIELDS,
      machineContractFields: MACHINE_CONTRACT_FIELDS,
    },
  },
  {
    file: 'skills/website-redesign-to-code/SKILL.md',
    value: {
      id: 'website-redesign-to-code.orchestration',
      part: 'orchestration',
      version: 2,
      type: 'approval-orchestrator',
      section: 'Gate 3: Confirm Implementation Readiness',
      owner: 'top-level',
      authorization: GATE_AUTHORIZATION_POLICY,
      supportMode: 'parent-receipt',
      supportMayEditProductionBeforeGate: false,
      supportMayCloseGate: false,
      supportMayExpandScope: false,
      supportContracts: [
        'figma-to-code.execution',
        'image-to-code.execution',
        'design-system.execution',
        'visual-regression-testing.machine-gate',
      ],
      textParts: {
        authorization: {
          section: 'Choose the Authorization Mode',
          sha256: '14da6f7945a59a2b14a41b809bd728627e56f244193198b6b9201dda2848f07b',
        },
        'source-boundary': {
          section: 'Choose the Redesign Mode',
          sha256: '9bc057412790e5416ff23fd470a75d4ae715776ef0aedb25f924fe99d8dd5438',
        },
        'scope-authorization': {
          section: 'Gate 1: Freeze Scope',
          sha256: '39c4f88c6275e86ac7f1e3bf2fd266994a97681653d39aa759371769a26d69ef',
        },
        'direction-authorization': {
          section: 'Gate 2: Approve the Visual Direction',
          sha256: '82c06fe6659ebf2e04d0d060a2e524d58fad02ea093fff5bcaf47ab19a63b0b9',
        },
        gate3: {
          section: 'Gate 3: Confirm Implementation Readiness',
          sha256: '842586b442531636449f01f730c9763f6915ef0bcee9172538830f4f39d58e70',
        },
        'pilot-authorization': {
          section: 'Gate 4: Accept the Pilot',
          sha256: '24c87856f8cdc75f3ea8490c281ab4d6bdaef077b2acdf34fb7e4e6854dbe132',
        },
      },
      machineContract: 'visual-regression-testing.machine-gate',
      phaseBoundaries: {
        lockMachineContract: 'Gate 3: Confirm Implementation Readiness',
        implementationGate: '6. Implement in Verified Slices',
        consumeMachineResult: 'Gate 4: Accept the Pilot',
      },
    },
  },
  {
    file: 'skills/website-redesign-to-code/references/deliverables.md',
    value: {
      id: 'website-redesign-to-code.orchestration',
      part: 'deliverable',
      version: 2,
      type: 'machine-receipt-template',
      section: 'Rollout and Validation Matrix',
      authorizationRecordFields: AUTHORIZATION_RECORD_FIELDS,
      machineReceiptFields: MACHINE_RECEIPT_FIELDS,
      machineContractFields: MACHINE_CONTRACT_FIELDS,
    },
  },
];

const EXPECTED_CONTRACT_IDS = Array.from(new Set(EXPECTED_BLOCKS.map((entry) => entry.value.id))).sort();

function hasClosingBacktickRun(line, start, runLength) {
  for (let index = start; index < line.length;) {
    const next = line.indexOf('`', index);
    if (next === -1) return false;
    let length = 1;
    while (line[next + length] === '`') length += 1;
    if (length === runLength) return true;
    index = next + length;
  }
  return false;
}

function scanMarkdownTableRow(line) {
  const cells = [];
  let current = '';
  let delimiterCount = 0;
  let codeDelimiterLength = 0;

  for (let index = 0; index < line.length;) {
    if (codeDelimiterLength === 0 && line[index] === '\\' && index + 1 < line.length) {
      current += line.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (line[index] === '`') {
      let runLength = 1;
      while (line[index + runLength] === '`') runLength += 1;
      if (codeDelimiterLength === runLength) {
        codeDelimiterLength = 0;
      } else if (
        codeDelimiterLength === 0
        && hasClosingBacktickRun(line, index + runLength, runLength)
      ) {
        codeDelimiterLength = runLength;
      }
      current += line.slice(index, index + runLength);
      index += runLength;
      continue;
    }

    if (line[index] === '|' && codeDelimiterLength === 0) {
      cells.push(current.trim());
      current = '';
      delimiterCount += 1;
      index += 1;
      continue;
    }

    current += line[index];
    index += 1;
  }

  cells.push(current.trim());
  const trimmed = line.trim();
  if (trimmed.startsWith('|') && cells[0] === '') cells.shift();
  if (trimmed.endsWith('|') && cells[cells.length - 1] === '') cells.pop();
  return { cells, delimiterCount };
}

function splitMarkdownTableRow(line) {
  return scanMarkdownTableRow(line).cells;
}

function isMarkdownSeparatorRow(scan) {
  return scan.delimiterCount > 0
    && scan.cells.length > 0
    && scan.cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function buildFenceMask(lines, options = {}) {
  const allowMarkdownContent = options.allowMarkdownContent === true;
  const mask = new Array(lines.length).fill(false);
  let openFence = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (openFence) {
      const close = line.match(/^\s{0,3}(`+|~+)\s*$/);
      if (
        close
        && close[1][0] === openFence.character
        && close[1].length >= openFence.length
      ) {
        mask[index] = true;
        openFence = null;
      } else {
        mask[index] = !(allowMarkdownContent && openFence.isMarkdown);
      }
      continue;
    }

    const opening = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (!opening) continue;
    mask[index] = true;
    const info = opening[2].trim().split(/\s+/, 1)[0].toLowerCase();
    openFence = {
      character: opening[1][0],
      length: opening[1].length,
      isMarkdown: info === 'markdown' || info === 'md',
    };
  }
  return mask;
}

function parseMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const fenceMask = buildFenceMask(lines, { allowMarkdownContent: true });
  const tables = [];

  for (let index = 1; index < lines.length; index += 1) {
    if (fenceMask[index] || fenceMask[index - 1]) continue;
    const separator = scanMarkdownTableRow(lines[index]);
    if (!isMarkdownSeparatorRow(separator)) continue;

    const header = scanMarkdownTableRow(lines[index - 1]);
    const rows = [];
    let rowIndex = index + 1;
    while (rowIndex < lines.length && lines[rowIndex].trim() !== '') {
      if (fenceMask[rowIndex]) break;
      const row = scanMarkdownTableRow(lines[rowIndex]);
      if (row.delimiterCount === 0 || /^\s*#{1,6}\s+/.test(lines[rowIndex])) break;
      rows.push({ cells: row.cells, line: rowIndex + 1 });
      rowIndex += 1;
    }

    tables.push({
      headers: header.cells,
      separator: separator.cells,
      rows,
      line: index,
    });
  }

  return tables;
}

function validateMarkdownTables(text, label = 'document.md') {
  const errors = [];
  for (const table of parseMarkdownTables(text)) {
    if (table.headers.length !== table.separator.length) {
      errors.push(
        `${label}:${table.line + 1}: Markdown table header has ${table.headers.length} columns but separator has ${table.separator.length}`
      );
    }
    for (const row of table.rows) {
      if (row.cells.length !== table.headers.length) {
        errors.push(
          `${label}:${row.line}: Markdown table row has ${row.cells.length} columns but header has ${table.headers.length}`
        );
      }
    }
  }
  return errors;
}

function normalizeHeading(value) {
  return value.trim().replace(/\s+#+\s*$/, '').toLowerCase();
}

function scanMarkdownHeadings(text) {
  const lines = text.split(/\r?\n/);
  const fenceMask = buildFenceMask(lines);
  const offsets = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length;
    if (text.slice(offset, offset + 2) === '\r\n') offset += 2;
    else if (text[offset] === '\n' || text[offset] === '\r') offset += 1;
  }

  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (fenceMask[index]) continue;
    const match = lines[index].match(/^\s*(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    headings.push({
      title: match[2].trim().replace(/\s+#+\s*$/, ''),
      normalized: normalizeHeading(match[2]),
      level: match[1].length,
      line: index + 1,
      lineIndex: index,
      offset: offsets[index],
    });
  }
  return { headings, lines, offsets };
}

function findMarkdownSectionDetails(text, heading) {
  const scan = scanMarkdownHeadings(text);
  const expected = normalizeHeading(heading);
  const headingIndex = scan.headings.findIndex((candidate) => candidate.normalized === expected);
  if (headingIndex === -1) return null;

  const selected = scan.headings[headingIndex];
  const next = scan.headings.slice(headingIndex + 1).find((candidate) => candidate.level <= selected.level);
  const contentLineIndex = selected.lineIndex + 1;
  const contentStart = contentLineIndex < scan.offsets.length ? scan.offsets[contentLineIndex] : text.length;
  const end = next ? next.offset : text.length;
  return {
    heading: selected,
    contentStart,
    end,
    text: text.slice(contentStart, end).trim(),
  };
}

function findMarkdownSection(text, heading) {
  const details = findMarkdownSectionDetails(text, heading);
  return details ? details.text : null;
}

function extractContractBlocks(text, label = 'document.md') {
  const errors = [];
  const blocks = [];
  const fenceMask = buildFenceMask(text.split(/\r?\n/));
  const pattern = /<!--\s*CRAFTROSTER_CONTRACT\s*\r?\n([\s\S]*?)\r?\n\s*-->/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    if (fenceMask[line - 1]) continue;
    try {
      const value = JSON.parse(match[1]);
      blocks.push({ value, index: match.index, line, label });
    } catch (error) {
      errors.push(`${label}:${line}: CRAFTROSTER_CONTRACT JSON is invalid (${error.message})`);
    }
  }
  return { blocks, errors };
}

function normalizeCanonicalText(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function canonicalTextSha256(text) {
  return crypto.createHash('sha256').update(normalizeCanonicalText(text), 'utf8').digest('hex');
}

function extractContractTextBlocks(text, label = 'document.md') {
  const errors = [];
  const blocks = [];
  const fenceMask = buildFenceMask(text.split(/\r?\n/));
  const pattern = /<!--\s*CRAFTROSTER_CONTRACT_TEXT_START\s+([^\s]+)\s*-->\r?\n([\s\S]*?)\r?\n<!--\s*CRAFTROSTER_CONTRACT_TEXT_END\s+([^\s]+)\s*-->/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    if (fenceMask[line - 1]) {
      errors.push(`${label}:${line}: canonical contract text marker cannot be inside a fenced example`);
      continue;
    }
    if (match[1] !== match[3]) {
      errors.push(`${label}:${line}: canonical text marker starts with ${match[1]} but ends with ${match[3]}`);
      continue;
    }
    blocks.push({
      key: match[1],
      text: normalizeCanonicalText(match[2]),
      sha256: canonicalTextSha256(match[2]),
      index: match.index,
      endIndex: pattern.lastIndex,
      line,
      label,
    });
  }
  return { blocks, errors };
}

function compareExact(errors, label, actual, expected) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      errors.push(`${label} must be an array`);
      return;
    }
    if (actual.length !== expected.length) {
      errors.push(`${label} must contain ${expected.length} items; received ${actual.length}`);
    }
    const length = Math.min(actual.length, expected.length);
    for (let index = 0; index < length; index += 1) {
      compareExact(errors, `${label}[${index}]`, actual[index], expected[index]);
    }
    return;
  }

  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
      errors.push(`${label} must be an object`);
      return;
    }
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    for (const key of expectedKeys) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        errors.push(`${label}.${key} is missing`);
      } else {
        compareExact(errors, `${label}.${key}`, actual[key], expected[key]);
      }
    }
    for (const key of actualKeys) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        errors.push(`${label}.${key} is not part of the canonical contract`);
      }
    }
    return;
  }

  if (actual !== expected) {
    errors.push(`${label} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`);
  }
}

function contractKey(value) {
  return `${value.id || '<missing-id>'}#${value.part || '<missing-part>'}`;
}

function validateStructuredContracts(documents) {
  const errors = [];
  const found = [];
  const foundTextBlocks = [];

  for (const file of CONTRACT_FILES) {
    const text = documents[file];
    if (typeof text !== 'string') continue;
    const extracted = extractContractBlocks(text, file);
    errors.push(...extracted.errors);
    for (const block of extracted.blocks) found.push({ ...block, file });
    const extractedText = extractContractTextBlocks(text, file);
    errors.push(...extractedText.errors);
    for (const block of extractedText.blocks) foundTextBlocks.push({ ...block, file });
  }

  const seenParts = new Map();
  for (const block of found) {
    const key = contractKey(block.value);
    if (seenParts.has(key)) {
      errors.push(`${block.file}:${block.line}: duplicate CRAFTROSTER_CONTRACT part ${key}`);
    } else {
      seenParts.set(key, block);
    }
  }

  const expectedKeys = new Set(EXPECTED_BLOCKS.map((entry) => contractKey(entry.value)));
  for (const block of found) {
    const key = contractKey(block.value);
    if (!expectedKeys.has(key)) {
      errors.push(`${block.file}:${block.line}: unexpected CRAFTROSTER_CONTRACT part ${key}`);
    }
  }

  for (const expected of EXPECTED_BLOCKS) {
    const key = contractKey(expected.value);
    const block = seenParts.get(key);
    if (!block) {
      errors.push(`${expected.file}: missing CRAFTROSTER_CONTRACT part ${key}`);
      continue;
    }
    if (block.file !== expected.file) {
      errors.push(`${key} must be declared in ${expected.file}; found in ${block.file}`);
    }
    compareExact(errors, key, block.value, expected.value);

    const documentText = documents[expected.file];
    const section = findMarkdownSectionDetails(documentText, expected.value.section);
    if (!section) {
      errors.push(`${expected.file}: missing contract section ${expected.value.section}`);
    } else if (block.index < section.contentStart || block.index >= section.end) {
      errors.push(`${expected.file}:${block.line}: ${key} must be inside section ${expected.value.section}`);
    }
  }

  const expectedTextBlocks = [];
  for (const expected of EXPECTED_BLOCKS) {
    if (!expected.value.textParts) continue;
    for (const [name, specification] of Object.entries(expected.value.textParts)) {
      expectedTextBlocks.push({
        key: `${expected.value.id}#${name}`,
        file: expected.file,
        specification,
      });
    }
  }
  const expectedTextKeys = new Set(expectedTextBlocks.map((entry) => entry.key));
  const textByKey = new Map();
  for (const block of foundTextBlocks) {
    if (textByKey.has(block.key)) {
      errors.push(`${block.file}:${block.line}: duplicate canonical contract text block ${block.key}`);
    } else {
      textByKey.set(block.key, block);
    }
    if (!expectedTextKeys.has(block.key)) {
      errors.push(`${block.file}:${block.line}: unexpected canonical contract text block ${block.key}`);
    }
  }
  for (const expected of expectedTextBlocks) {
    const block = textByKey.get(expected.key);
    if (!block) {
      errors.push(`${expected.file}: missing canonical contract text block ${expected.key}`);
      continue;
    }
    if (block.file !== expected.file) {
      errors.push(`${expected.key} must be declared in ${expected.file}; found in ${block.file}`);
    }
    if (block.sha256 !== expected.specification.sha256) {
      errors.push(
        `${expected.key} canonical text SHA-256 must be ${expected.specification.sha256}; received ${block.sha256}`
      );
    }
    const section = findMarkdownSectionDetails(documents[expected.file], expected.specification.section);
    if (!section) {
      errors.push(`${expected.file}: missing canonical text section ${expected.specification.section}`);
    } else if (block.index < section.contentStart || block.endIndex > section.end) {
      errors.push(`${expected.file}:${block.line}: ${expected.key} must stay inside section ${expected.specification.section}`);
    }
  }

  const foundIds = Array.from(new Set(
    found
      .map((block) => block.value.id)
      .filter((id) => EXPECTED_CONTRACT_IDS.includes(id))
  )).sort();
  compareExact(errors, 'workflow contract IDs', foundIds, EXPECTED_CONTRACT_IDS);

  const relationshipBlocks = new Map();
  for (const block of found) {
    if (['source-workflow', 'write-posture', 'machine-gate', 'approval-orchestrator'].includes(block.value.type)) {
      relationshipBlocks.set(block.value.id, block.value);
    }
  }
  for (const [id, contract] of relationshipBlocks) {
    const parentIds = contract.parentWorkflows || contract.consumers;
    if (!Array.isArray(parentIds)) continue;
    for (const parentId of parentIds) {
      const parent = relationshipBlocks.get(parentId);
      if (!parent || parent.type !== 'approval-orchestrator') {
        errors.push(`${id}: unknown parent workflow ${parentId}`);
      } else if (!Array.isArray(parent.supportContracts) || !parent.supportContracts.includes(id)) {
        errors.push(`${id}: parent workflow ${parentId} does not declare the reverse support edge`);
      }
    }
  }
  for (const [id, contract] of relationshipBlocks) {
    if (contract.type !== 'approval-orchestrator' || !Array.isArray(contract.supportContracts)) continue;
    for (const supportId of contract.supportContracts) {
      const support = relationshipBlocks.get(supportId);
      if (!support) {
        errors.push(`${id}: unknown support contract ${supportId}`);
        continue;
      }
      const parents = support.parentWorkflows || support.consumers;
      if (!Array.isArray(parents) || !parents.includes(id)) {
        errors.push(`${id}: support contract ${supportId} does not declare the reverse parent edge`);
      }
    }
  }
  return errors;
}

function headingOffset(text, heading) {
  const details = findMarkdownSectionDetails(text, heading);
  return details ? details.heading.offset : -1;
}

function validateSourceWorkflowContract(skillName, text) {
  const errors = [];
  const expectedEntry = EXPECTED_BLOCKS.find((entry) => entry.value.id === `${skillName}.execution`);
  if (!expectedEntry) return [`${skillName}: no canonical source-workflow contract is registered`];
  const contract = expectedEntry.value;
  const ownershipOffset = headingOffset(text, contract.section);
  const stopOffset = headingOffset(text, contract.modes['parent-receipt'].stopBeforeSection);
  if (ownershipOffset === -1) errors.push(`${skillName}: missing ${contract.section} section`);
  if (stopOffset === -1) {
    errors.push(`${skillName}: missing stop boundary ${contract.modes['parent-receipt'].stopBeforeSection}`);
  } else if (ownershipOffset !== -1 && stopOffset <= ownershipOffset) {
    errors.push(`${skillName}: implementation boundary must follow ownership selection`);
  }
  return errors;
}

function leadingCodeValue(cell) {
  const match = cell.match(/^`([^`]+)`/);
  return match ? match[1] : null;
}

function validateFigmaFallbackContract(text) {
  const errors = [];
  const expected = EXPECTED_BLOCKS.find((entry) => entry.value.id === 'figma-to-code.fallback').value;
  const expectedHeaders = [
    'Available evidence',
    'Standalone action',
    'Parent-orchestrated receipt action',
    'Required disclosure',
  ];
  const table = parseMarkdownTables(text).find((candidate) => (
    candidate.headers.length === expectedHeaders.length
    && candidate.headers.every((header, index) => header === expectedHeaders[index])
  ));
  if (!table) return ['figma-to-code: missing canonical Fallback Matrix table'];

  const rows = new Map();
  for (const row of table.rows) {
    if (row.cells.length !== expectedHeaders.length) continue;
    const evidence = leadingCodeValue(row.cells[0]);
    const standaloneAction = leadingCodeValue(row.cells[1]);
    const parentAction = leadingCodeValue(row.cells[2]);
    if (!evidence || !standaloneAction || !parentAction) {
      errors.push(`figma-to-code:${row.line}: fallback rows must start with evidence and action enums`);
      continue;
    }
    if (rows.has(evidence)) errors.push(`figma-to-code:${row.line}: duplicate fallback evidence row ${evidence}`);
    rows.set(evidence, { standaloneAction, parentAction, line: row.line, parentCell: row.cells[2] });
  }

  const expectedNames = Object.keys(expected.rows);
  const actualNames = Array.from(rows.keys());
  compareExact(errors, 'figma-to-code fallback evidence rows', actualNames, expectedNames);
  for (const evidence of expectedNames) {
    const row = rows.get(evidence);
    if (!row) continue;
    compareExact(errors, `figma-to-code fallback ${evidence}.standaloneAction`, row.standaloneAction, expected.rows[evidence].standaloneAction);
    compareExact(errors, `figma-to-code fallback ${evidence}.parentAction`, row.parentAction, expected.rows[evidence].parentAction);
    if (/\b(?:implement|edit|invoke|deploy|route)(?:s|ed|ing)?\b/i.test(row.parentCell)) {
      errors.push(`figma-to-code:${row.line}: parent fallback description performs implementation, routing, or deployment`);
    }
  }
  return errors;
}

function validateDesignSystemContract(skillText, referenceText) {
  const errors = [];
  const posture = findMarkdownSectionDetails(skillText, 'Execution Posture');
  const completion = findMarkdownSectionDetails(referenceText, 'Completion by Execution Posture');
  if (!posture) errors.push('design-system: missing Execution Posture section');
  if (!completion) errors.push('design-system: missing Completion by Execution Posture section');
  return errors;
}

function parseNormalizedMachineResult(referenceText, errors) {
  const section = findMarkdownSection(referenceText, 'Normalized Result');
  if (!section) {
    errors.push('visual-regression-testing: missing Normalized Result section');
    return null;
  }
  const block = section.match(/```json\s*([\s\S]*?)```/i);
  if (!block) {
    errors.push('visual-regression-testing: Normalized Result is missing a JSON example');
    return null;
  }
  try {
    return JSON.parse(block[1]);
  } catch (error) {
    errors.push(`visual-regression-testing: Normalized Result JSON is invalid (${error.message})`);
    return null;
  }
}

function validateFieldSet(errors, label, actualFields, expectedFields) {
  const actual = new Set(actualFields);
  const expected = new Set(expectedFields);
  for (const field of expectedFields) {
    if (!actual.has(field)) errors.push(`${label} is missing ${field}`);
  }
  for (const field of actualFields) {
    if (!expected.has(field)) errors.push(`${label} has unexpected field ${field}`);
  }
}

function validateMachineResultShape(result, schema, label = 'machine result') {
  const errors = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) return [`${label} must be an object`];
  validateFieldSet(errors, `${label} fields`, Object.keys(result), schema.resultFields);
  if (!result.contract || typeof result.contract !== 'object' || Array.isArray(result.contract)) {
    errors.push(`${label}.contract must be an object`);
  } else {
    validateFieldSet(errors, `${label}.contract fields`, Object.keys(result.contract), schema.contractFields);
  }
  if (!Array.isArray(result.issues)) {
    errors.push(`${label}.issues must be an array`);
  } else {
    for (let index = 0; index < result.issues.length; index += 1) {
      const issue = result.issues[index];
      if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
        errors.push(`${label}.issues[${index}] must be an object`);
      } else {
        validateFieldSet(errors, `${label}.issues[${index}] fields`, Object.keys(issue), schema.issueFields);
      }
    }
  }
  if (!Array.isArray(result.artifacts)) errors.push(`${label}.artifacts must be an array`);
  if (!Array.isArray(result.unverified)) errors.push(`${label}.unverified must be an array`);
  return errors;
}

function validateEnumValue(errors, label, value, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    errors.push(`${label} must be one of ${allowed.join(', ')}`);
  }
}

function parseEnumPlaceholder(value) {
  if (typeof value !== 'string') return [];
  return value.split('|').map((item) => item.trim());
}

function validateMachineResultInstance(result, schema, label = 'machine result') {
  const errors = validateMachineResultShape(result, schema, label);
  if (!result || !result.contract || typeof result.contract !== 'object') return errors;
  validateEnumValue(errors, `${label}.verdict`, result.verdict, schema.enumValues.verdict);
  validateEnumValue(errors, `${label}.nextAction`, result.nextAction, schema.enumValues.nextAction);
  validateEnumValue(errors, `${label}.baselineAction`, result.baselineAction, schema.enumValues.baselineAction);
  if (typeof result.contract.matrixCell !== 'string' || result.contract.matrixCell.trim() === '') {
    errors.push(`${label}.contract.matrixCell must be a non-empty string`);
  }
  if (Array.isArray(result.issues)) {
    for (let index = 0; index < result.issues.length; index += 1) {
      const issue = result.issues[index];
      if (!issue || typeof issue !== 'object') continue;
      validateEnumValue(errors, `${label}.issues[${index}].severity`, issue.severity, schema.enumValues.issueSeverity);
      validateEnumValue(errors, `${label}.issues[${index}].channel`, issue.channel, schema.enumValues.issueChannel);
      validateEnumValue(errors, `${label}.issues[${index}].confidence`, issue.confidence, schema.enumValues.issueConfidence);
      for (const field of ['location', 'evidence', 'remediation']) {
        if (typeof issue[field] !== 'string' || issue[field].trim() === '') {
          errors.push(`${label}.issues[${index}].${field} must be a non-empty string`);
        }
      }
    }
  }
  const mode = result.contract.mode;
  const authority = schema.authorityByMode[mode];
  if (!authority) {
    errors.push(`${label}.contract.mode must be one of ${Object.keys(schema.authorityByMode).join(', ')}`);
    return errors;
  }
  const required = result.contract[authority.requiredNonEmpty];
  if (typeof required !== 'string' || required.trim() === '') {
    errors.push(`${label}.contract.${authority.requiredNonEmpty} must be a non-empty string in ${mode} mode`);
  }
  if (result.contract[authority.mustBeNull] !== null) {
    errors.push(`${label}.contract.${authority.mustBeNull} must be null in ${mode} mode`);
  }
  return errors;
}

function validateMachineGateContract(referenceText, skillText) {
  const errors = [];
  const schema = EXPECTED_BLOCKS.find((entry) => (
    entry.value.id === 'visual-regression-testing.machine-gate' && entry.value.part === 'schema'
  )).value;
  const result = parseNormalizedMachineResult(referenceText, errors);
  if (result) {
    errors.push(...validateMachineResultShape(result, schema, 'visual-regression-testing example'));
    const issue = Array.isArray(result.issues) ? result.issues[0] : null;
    const examples = [
      ['verdict', result.verdict, schema.enumValues.verdict],
      ['contract.mode', result.contract && result.contract.mode, schema.enumValues.mode],
      ['issues[0].severity', issue && issue.severity, schema.enumValues.issueSeverity],
      ['issues[0].channel', issue && issue.channel, schema.enumValues.issueChannel],
      ['issues[0].confidence', issue && issue.confidence, schema.enumValues.issueConfidence],
      ['nextAction', result.nextAction, schema.enumValues.nextAction],
      ['baselineAction', result.baselineAction, schema.enumValues.baselineAction],
    ];
    for (const [field, value, expectedValues] of examples) {
      compareExact(
        errors,
        `visual-regression-testing example ${field} enum`,
        parseEnumPlaceholder(value),
        expectedValues
      );
    }
  }

  const handoff = findMarkdownSection(skillText, 'Machine Gate Contract');
  if (!handoff) {
    errors.push('visual-regression-testing: missing Machine Gate Contract section');
  } else {
    const code = handoff.match(/```text\s*([\s\S]*?)```/i);
    if (!code) {
      errors.push('visual-regression-testing: Machine Gate Contract is missing its text handoff example');
    } else {
      for (const field of MACHINE_RECEIPT_FIELDS) {
        const fieldPattern = new RegExp(`^\\s*${field}:`, 'm');
        if (!fieldPattern.test(code[1])) {
          errors.push(`visual-regression-testing: handoff example is missing ${field}`);
        }
      }
    }
  }
  return errors;
}

function validateApprovalOrchestrator(skillName, text) {
  const errors = [];
  const expected = EXPECTED_BLOCKS.find((entry) => (
    entry.value.id === `${skillName}.orchestration` && entry.value.part === 'orchestration'
  ));
  if (!expected) return [`${skillName}: no canonical orchestration contract is registered`];
  const boundaries = expected.value.phaseBoundaries;
  const ordered = [
    boundaries.lockMachineContract,
    boundaries.implementationGate,
    boundaries.consumeMachineResult,
  ].map((heading) => ({ heading, offset: headingOffset(text, heading) }));
  for (const item of ordered) {
    if (item.offset === -1) errors.push(`${skillName}: missing phase boundary ${item.heading}`);
  }
  const present = ordered.filter((item) => item.offset !== -1);
  for (let index = 1; index < present.length; index += 1) {
    if (present[index].offset <= present[index - 1].offset) {
      errors.push(`${skillName}: phase boundary ${present[index].heading} is out of order`);
    }
  }
  return errors;
}

function validateDeliverableContract(skillName, text) {
  const errors = [];
  const expected = EXPECTED_BLOCKS.find((entry) => (
    entry.value.id === `${skillName}.orchestration` && entry.value.part === 'deliverable'
  ));
  if (!expected) return [`${skillName}: no canonical deliverable contract is registered`];
  const section = findMarkdownSection(text, expected.value.section);
  if (!section) errors.push(`${skillName}: missing deliverable section ${expected.value.section}`);
  const authorization = findMarkdownSection(text, 'Authorization Checkpoint Record');
  const example = authorization && authorization.match(/```json\s*([\s\S]*?)```/i);
  if (!example) {
    errors.push(`${skillName}: missing Authorization Checkpoint Record JSON example`);
  } else {
    try {
      const record = JSON.parse(example[1]);
      errors.push(...validateAuthorizationRecord(record, `${skillName} authorization record`));
    } catch {
      errors.push(`${skillName}: Authorization Checkpoint Record JSON is invalid`);
    }
  }
  return errors;
}

function validateAuthorizationRecord(record, label = 'authorization record') {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [`${label} must be an object`];
  validateFieldSet(errors, `${label} fields`, Object.keys(record), AUTHORIZATION_RECORD_FIELDS);
  for (const field of AUTHORIZATION_RECORD_FIELDS.filter((name) => name !== 'implementationAuthorized')) {
    if (typeof record[field] !== 'string' || !record[field].trim()) errors.push(`${label}.${field} must be a non-empty string`);
  }
  if (typeof record.implementationAuthorized !== 'boolean') errors.push(`${label}.implementationAuthorized must be boolean`);
  validateEnumValue(errors, `${label}.mode`, record.mode, GATE_AUTHORIZATION_POLICY.modes);
  validateEnumValue(errors, `${label}.checkpoint`, record.checkpoint, ['implementation', 'pilot-rollout']);
  validateEnumValue(errors, `${label}.posture`, record.posture, ['implementation', 'read-only', 'parent-receipt']);
  validateEnumValue(errors, `${label}.explicitUserCheckpoint`, record.explicitUserCheckpoint, ['pending', 'released', 'none']);
  validateEnumValue(errors, `${label}.requiredEvidence`, record.requiredEvidence, ['complete', 'missing', 'failed']);
  validateEnumValue(errors, `${label}.pilotEvidence`, record.pilotEvidence, ['not-applicable', 'pending', 'passed', 'failed']);
  validateEnumValue(errors, `${label}.baselineAction`, record.baselineAction, ['unchanged', 'propose-candidate', 'replace']);
  validateEnumValue(errors, `${label}.baselineChangeApproval`, record.baselineChangeApproval, ['not-requested', 'pending', 'approved']);
  validateEnumValue(errors, `${label}.externalActionAuthorization`, record.externalActionAuthorization, ['none', 'separately-authorized']);
  validateEnumValue(errors, `${label}.nextAction`, record.nextAction, ['wait', 'proceed', 'read-only', 'return-receipt']);
  if (record.nextAction === 'proceed' && (record.explicitUserCheckpoint === 'pending'
    || record.implementationAuthorized !== true || record.requiredEvidence !== 'complete'
    || record.posture !== 'implementation')) {
    errors.push(`${label}: proceed requires implementation authority, complete evidence, implementation posture, and no pending user checkpoint`);
  }
  if (record.nextAction === 'proceed' && record.checkpoint === 'pilot-rollout' && record.pilotEvidence !== 'passed') {
    errors.push(`${label}: pilot rollout requires passed pilot evidence`);
  }
  if (record.posture === 'read-only' && !['read-only', 'wait'].includes(record.nextAction)) {
    errors.push(`${label}: read-only posture requires read-only work or waiting`);
  }
  if (record.posture === 'parent-receipt' && !['return-receipt', 'wait'].includes(record.nextAction)) {
    errors.push(`${label}: parent-receipt posture must return evidence or wait, never close a parent gate`);
  }
  if (record.nextAction === 'return-receipt' && record.posture !== 'parent-receipt') {
    errors.push(`${label}: return-receipt requires parent-receipt posture`);
  }
  if (record.baselineAction === 'replace' && (record.baselineChangeApproval !== 'approved'
    || record.posture !== 'implementation' || record.nextAction !== 'proceed')) {
    errors.push(`${label}: baseline replacement requires its owner's approval and an authorized implementation action`);
  }
  return errors;
}

function collectMarkdownFiles(root) {
  const files = [];
  const addPath = (target) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (target.toLowerCase().endsWith('.md')) files.push(target);
      return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(target, entry.name);
      if (entry.isDirectory()) addPath(child);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(child);
    }
  };

  for (const relativePath of ['README.md', 'AGENTS.md', 'agents', 'skills', 'docs']) {
    addPath(path.join(root, relativePath));
  }
  return files;
}

function loadContractDocuments(root, errors) {
  const documents = {};
  for (const relativePath of CONTRACT_FILES) {
    const filePath = path.join(root, ...relativePath.split('/'));
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required Skill contract file: ${relativePath}`);
      continue;
    }
    documents[relativePath] = fs.readFileSync(filePath, 'utf8');
  }
  return documents;
}

function validateContractDocuments(documents) {
  const errors = validateStructuredContracts(documents);
  const get = (relativePath) => documents[relativePath] || '';
  errors.push(...validateSourceWorkflowContract('figma-to-code', get('skills/figma-to-code/SKILL.md')));
  errors.push(...validateSourceWorkflowContract('image-to-code', get('skills/image-to-code/SKILL.md')));
  errors.push(...validateFigmaFallbackContract(get('skills/figma-to-code/references/figma-evidence-contract.md')));
  errors.push(...validateDesignSystemContract(
    get('skills/design-system/SKILL.md'),
    get('skills/design-system/reference/token-extraction-and-drift.md')
  ));
  errors.push(...validateMachineGateContract(
    get('skills/visual-regression-testing/references/machine-visual-gate.md'),
    get('skills/visual-regression-testing/SKILL.md')
  ));
  errors.push(...validateApprovalOrchestrator('web-page-design-to-code', get('skills/web-page-design-to-code/SKILL.md')));
  errors.push(...validateApprovalOrchestrator('website-redesign-to-code', get('skills/website-redesign-to-code/SKILL.md')));
  errors.push(...validateDeliverableContract(
    'web-page-design-to-code',
    get('skills/web-page-design-to-code/references/deliverables.md')
  ));
  errors.push(...validateDeliverableContract(
    'website-redesign-to-code',
    get('skills/website-redesign-to-code/references/deliverables.md')
  ));
  return errors;
}

function validateRepository(root = DEFAULT_ROOT) {
  const errors = [];
  const markdownFiles = collectMarkdownFiles(root);
  for (const filePath of markdownFiles) {
    const relativePath = path.relative(root, filePath).split(path.sep).join('/');
    errors.push(...validateMarkdownTables(fs.readFileSync(filePath, 'utf8'), relativePath));
  }
  const documents = loadContractDocuments(root, errors);
  errors.push(...validateContractDocuments(documents));
  return {
    errors,
    markdownFileCount: markdownFiles.length,
    workflowContractCount: EXPECTED_CONTRACT_IDS.length,
  };
}

function main() {
  const result = validateRepository(DEFAULT_ROOT);
  if (result.errors.length > 0) {
    console.error('Skill contract validation failed:');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(
    `Skill contract validation passed: ${result.markdownFileCount} Markdown files, ${result.workflowContractCount} workflow contracts`
  );
}

if (require.main === module) main();

module.exports = {
  AUTHORIZATION_RECORD_FIELDS,
  GATE_AUTHORIZATION_POLICY,
  CONTRACT_FILES,
  EXPECTED_BLOCKS,
  canonicalTextSha256,
  extractContractBlocks,
  extractContractTextBlocks,
  findMarkdownSection,
  parseMarkdownTables,
  splitMarkdownTableRow,
  validateApprovalOrchestrator,
  validateAuthorizationRecord,
  validateContractDocuments,
  validateDesignSystemContract,
  validateFigmaFallbackContract,
  validateMachineGateContract,
  validateMachineResultInstance,
  validateMachineResultShape,
  validateMarkdownTables,
  validateRepository,
  validateSourceWorkflowContract,
};
