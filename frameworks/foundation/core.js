// ==========================================================================
// Project:   LocalStorage - A Local Storage Framework for SproutCore
// Copyright: ©2010 Strobe Inc., Peter Wagenet, and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

window.SCLocalStorage = window.SCLocalStorage || SC.Object.create();
window.SCLS = window.SCLS || window.SCLocalStorage ;

SCLocalStorage.mixin({
  EMPTY:            0x0100, // 256
  READY:            0x0200, // 512
});
