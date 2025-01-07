const { expect } = require('chai');
const math = require('../src/math.js');

describe('Math Operations', () => {
    describe('add()', () => {
        it('should add two numbers correctly', () => {
            expect(math.add(2, 3)).to.equal(5);
            expect(math.add(-1, 1)).to.equal(0);
            expect(math.add(0, 0)).to.equal(0);
        });
    });

    describe('subtract()', () => {
        it('should subtract two numbers correctly', () => {
            expect(math.subtract(5, 3)).to.equal(2);
            expect(math.subtract(1, 1)).to.equal(0);
            expect(math.subtract(0, 5)).to.equal(-5);
        });
    });

    describe('multiply()', () => {
        it('should multiply two numbers correctly', () => {
            expect(math.multiply(2, 3)).to.equal(6);
            expect(math.multiply(-2, 3)).to.equal(-6);
            expect(math.multiply(0, 5)).to.equal(0);
        });
    });

    describe('divide()', () => {
        it('should divide two numbers correctly', () => {
            expect(math.divide(6, 2)).to.equal(3);
            expect(math.divide(5, 2)).to.equal(2.5);
            expect(math.divide(0, 5)).to.equal(0);
        });

        it('should throw an error when dividing by zero', () => {
            expect(() => math.divide(5, 0)).to.throw('Division by zero');
        });
    });
});
