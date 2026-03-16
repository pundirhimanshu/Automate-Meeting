/**
 * Logic Engine for Smart Meeting Routing
 * Evaluates rules against user answers and determines the final destination.
 */

export function evaluateRoutingRules(rules, answers) {
    // Sort rules by order
    const sortedRules = [...rules].sort((a, b) => a.order - b.order);

    for (const rule of sortedRules) {
        if (rule.isFallback) continue;

        const conditions = rule.conditions || [];
        if (conditions.length === 0) {
            // Fallback for old rules that might still exist
            if (rule.questionId && rule.operator && rule.value) {
                conditions.push({ 
                    questionId: rule.questionId, 
                    operator: rule.operator, 
                    value: rule.value 
                });
            } else {
                continue;
            }
        }

        let isMatch = false;
        const conditionResults = conditions.map(cond => {
            const answer = answers[cond.questionId] !== undefined ? answers[cond.questionId] : answers[cond.label];
            if (answer === undefined) return false;

            switch (cond.operator) {
                case 'is':
                    return String(answer).toLowerCase() === String(cond.value).toLowerCase();
                case 'is_not':
                    return String(answer).toLowerCase() !== String(cond.value).toLowerCase();
                case 'contains':
                    return String(answer).toLowerCase().includes(String(cond.value).toLowerCase());
                case 'greater_than':
                    return Number(answer) > Number(cond.value);
                case 'in':
                    // Support multi-select value (comma separated)
                    const allowedValues = String(cond.value).split(',').map(v => v.trim().toLowerCase());
                    return allowedValues.includes(String(answer).toLowerCase());
                default:
                    return false;
            }
        });

        if (rule.logicType === 'OR') {
            isMatch = conditionResults.some(res => res === true);
        } else {
            // Default to AND
            isMatch = conditionResults.every(res => res === true);
        }

        if (isMatch) {
            return rule.destination;
        }
    }

    // If no rule matches, look for fallback
    const fallbackRule = rules.find(r => r.isFallback);
    return fallbackRule ? fallbackRule.destination : null;
}
