import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// A bounded author replay, never a network client. Document IDs are map keys,
// never filesystem paths or URLs supplied by the caller.
export function retrieveOfficialDocs(id) {
  const evidence = JSON.parse(readFileSync(new URL('./documents.json', import.meta.url), 'utf8'));
  if (typeof id !== 'string' || !Object.hasOwn(evidence.documents, id)) {
    return { ok: false, error: 'unknown_document' };
  }
  return { ok: true, retrieval_mode: 'offline_author_replay', document_id: id,
    sdk_package: evidence.sdk_package, sdk_version: evidence.sdk_version,
    provenance: evidence.provenance, ...evidence.documents[id] };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = process.argv.length === 3 ? retrieveOfficialDocs(process.argv[2]) : { ok: false, error: 'expected_one_document_id' };
  process.stdout.write(JSON.stringify(result) + '\n');
  if (!result.ok) process.exitCode = 2;
}
