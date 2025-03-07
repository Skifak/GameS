const { calculateDamage } = require("../damage");

describe("calculateDamage", () => {
    it("calculates damage correctly", () => {
        const attacker = { strength: 10 };
        const defender = { armor: 3 };
        expect(calculateDamage(attacker, defender)).toBe(7);
    });
});