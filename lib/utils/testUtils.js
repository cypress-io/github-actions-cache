"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name) {
    return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
}
function setInput(name, value) {
    process.env[getInputName(name)] = value;
}
exports.setInput = setInput;
function setInputs(input) {
    setInput(constants_1.Inputs.Path, input.path);
    setInput(constants_1.Inputs.Key, input.key);
    input.restoreKeys &&
        setInput(constants_1.Inputs.RestoreKeys, input.restoreKeys.join("\n"));
}
exports.setInputs = setInputs;
function clearInputs() {
    delete process.env[getInputName(constants_1.Inputs.Path)];
    delete process.env[getInputName(constants_1.Inputs.Key)];
    delete process.env[getInputName(constants_1.Inputs.RestoreKeys)];
}
exports.clearInputs = clearInputs;
