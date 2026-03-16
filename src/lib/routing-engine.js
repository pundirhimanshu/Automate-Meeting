/**
 * Logic Engine for Smart Meeting Routing
 * Evaluates rules against user answers and determines the final destination.
 */

export function evaluateRoutingRules(rules, answers) {
    // Sort rules by order
    const sortedRules = [...rules].sort((a, b) => a.order - b.order);

    for (const rule of sortedRules) {
        if (rule.isFallback) continue;

        const answer = answers[rule.questionId] !== undefined ? answers[rule.questionId] : answers[rule.question?.label];
        if (answer === undefined) continue;

        let isMatch = false;

        switch (rule.operator) {
            case 'is':
                isMatch = String(answer).toLowerCase() === String(rule.value).toLowerCase();
                break;
            case 'is_not':
                isMatch = String(answer).toLowerCase() !== String(rule.value).toLowerCase();
                break;
            case 'contains':
                isMatch = String(answer).toLowerCase().includes(String(rule.value).toLowerCase());
                break;
            case 'greater_than':
                isMatch = Number(answer) > Number(rule.value);
                break;
            default:
                isMatch = false;
        }

        if (isMatch) {
            return rule.destination;
        }
    }

    // If no rule matches, look for fallback
    const fallbackRule = rules.find(r => r.isFallback);
    return fallbackRule ? fallbackRule.destination : null;
}
