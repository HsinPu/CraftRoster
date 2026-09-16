'use strict';
function releaseRoute(route, scene) {
  scene.remove(route.group);
}
module.exports = { releaseRoute };

