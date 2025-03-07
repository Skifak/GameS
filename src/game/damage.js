function calculateDamage(attacker, defender) {
    return attacker.strength - defender.armor;
}

module.exports = { calculateDamage };