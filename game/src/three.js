// SOLMAR HEAT — three: the vendored three.js build is a classic (IIFE) script
// loaded by a <script src> in index.html, so it lives on window.THREE.
// This shim is the one place game modules get it from. If the vendored
// build failed to load, say so plainly instead of dying later on an
// obscure `THREE is undefined` inside the first module that uses it.
if (!window.THREE) throw new Error('three.js failed to load (game/vendor/three.min.js)');
export const THREE = window.THREE;
