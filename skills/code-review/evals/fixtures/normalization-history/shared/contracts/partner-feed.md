# Supported partner rows

The importer receives an object with `item_code` (a string) and `units` (a positive safe integer). The current catalogue stores canonical ASCII uppercase SKU keys. Supported producers may spell an ASCII SKU in either case and may surround it with ASCII spaces, tabs, CR or LF. Those formatting differences do not change the referenced item. Internal separators and digits remain significant. Unknown items return status 404; malformed field types or quantities return status 400.

Successful imports return status 200 with a line containing the catalogue's canonical `sku`, `productId` and requested `quantity`. The old CSV producer remains supported and there is no upstream normalization layer between its parsed rows and `importPartnerRow`. No public contract or producer version changes are included in the current review.
