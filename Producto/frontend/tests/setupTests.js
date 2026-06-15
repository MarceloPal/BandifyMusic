// Polyfill TextEncoder/TextDecoder requerido por react-router-dom v7 en jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

require('@testing-library/jest-dom');
