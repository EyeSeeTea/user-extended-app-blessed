import { TextDecoder, TextEncoder } from "util";

global.console = {
    error: console.error,
    info: console.info,
    log: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

// Polyfill for encoding which isn't present globally in jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
