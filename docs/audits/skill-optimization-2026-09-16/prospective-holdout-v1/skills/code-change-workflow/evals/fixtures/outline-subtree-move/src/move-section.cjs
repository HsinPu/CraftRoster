'use strict';

function moveSection(nodes, sectionId, beforeId) {
  const from = nodes.findIndex(node => node.id === sectionId);
  const before = beforeId === null ? nodes.length : nodes.findIndex(node => node.id === beforeId);
  if (from < 0 || nodes[from].depth !== 0 ||
      before < 0 || (before < nodes.length && nodes[before].depth !== 0)) {
    throw new RangeError('Section ids must name roots');
  }
  const output = nodes.slice();
  if (sectionId === beforeId) return output;
  const [section] = output.splice(from, 1);
  const destination = beforeId === null ? output.length : output.findIndex(node => node.id === beforeId);
  output.splice(destination, 0, section);
  return output;
}

module.exports = { moveSection };
