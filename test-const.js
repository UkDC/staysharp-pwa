const testVar = 1;
window = global;
window.testVar = 2;
console.log(testVar, window.testVar);
