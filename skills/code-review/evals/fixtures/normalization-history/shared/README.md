# Partner catalogue import fixture

This dependency-free CommonJS package maps one partner CSV row, already parsed into an object, to an internal fulfilment line. `fixtures/partner-row.json` is a fictional export from an older supported producer. No parser, database, network connection or shipment operation runs here.

Run the ordinary suite with `node test/sku.test.js` and `node test/partner-import.test.js`. Both commands use only local source and Node's built-in assertions. The module returns a proposed line; it does not persist or send it.
