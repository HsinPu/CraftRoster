# Official documentation scope

Checked 2026-11-04. Source snapshots remain pinned separately in the upstream notice.

- [Blender 5.0 extension creation manual](https://docs.blender.org/manual/sl/5.0/advanced/extensions/getting_started.html): official indexed page checked for package structure, manifest, permission reasons, wheels and build/validation commands. The localized documentation shell contains English technical examples. This is a versioned documentation check, not proof of local extension operation.
- [Blender extension documentation index, 5.0](https://docs.blender.org/manual/en/5.0/advanced/extensions/index.html): official entry checked for extension format and distribution routing.
- [Blender API utilities](https://docs.blender.org/api/current/bpy.utils.html) and [Operator API](https://docs.blender.org/api/current/bpy.types.Operator.html): direct current-page retrieval failed (web 402, direct network 403). Treat exact current signatures as unresolved until inspected in the installed runtime/API documentation. The acquisition ledger and rollback strategy are original engineering guidance, not a quoted Blender guarantee.

The upstream snapshot claims specific 5.2 APIs and CI results. Those are source claims, not this package's runtime evidence. Discover current class/property/operator capabilities before implementation and record actual tested versions. Do not infer a minimum supported release from a source headline.
