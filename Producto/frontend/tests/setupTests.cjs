// Polyfill TextEncoder/TextDecoder requerido por react-router-dom v7 en jsdom
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

require('@testing-library/jest-dom');
