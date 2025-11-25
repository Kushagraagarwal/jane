// Evaluate condition expressions
export const evaluateCondition = (expression, context) => {
  try {
    // Simple expression evaluator
    // Supports: >, <, >=, <=, ===, !==, &&, ||
    // Replace customer. and order. with context values

    let evaluatedExpression = expression;

    // Replace context variables
    Object.keys(context).forEach(key => {
      const contextValue = context[key];
      if (typeof contextValue === 'object') {
        Object.keys(contextValue).forEach(subKey => {
          const regex = new RegExp(`${key}\\.${subKey}`, 'g');
          const value = typeof contextValue[subKey] === 'string'
            ? `'${contextValue[subKey]}'`
            : contextValue[subKey];
          evaluatedExpression = evaluatedExpression.replace(regex, value);
        });
      }
    });

    // Use Function constructor to evaluate (safer than eval)
    const func = new Function(`return ${evaluatedExpression}`);
    return func();
  } catch (error) {
    console.error('Condition evaluation error:', error);
    return false;
  }
};

// Get next node based on current node and answer
export const getNextNode = (currentNode, answer, context, allNodes) => {
  if (!currentNode) return null;

  // Handle condition nodes
  if (currentNode.type === 'condition') {
    const result = evaluateCondition(currentNode.expression, context);
    const nextNodeId = result ? currentNode.trueNextNodeId : currentNode.falseNextNodeId;
    return allNodes[nextNodeId];
  }

  // Handle question nodes
  if (currentNode.type === 'question') {
    // For single_choice, check if there's a specific mapping
    if (currentNode.nextNodeMap && currentNode.nextNodeMap[answer]) {
      return allNodes[currentNode.nextNodeMap[answer]];
    }

    // Use default next node
    if (currentNode.nextNodeId) {
      return allNodes[currentNode.nextNodeId];
    }
  }

  // Handle end node
  if (currentNode.type === 'end') {
    return null;
  }

  return null;
};

// Validate answer based on node validation rules
export const validateAnswer = (node, answer) => {
  const errors = [];

  if (!node.validation) return errors;

  const validation = node.validation;

  // Required validation
  if (validation.required) {
    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      errors.push('This field is required');
      return errors;
    }

    if (typeof answer === 'string' && answer.trim() === '') {
      errors.push('This field is required');
      return errors;
    }
  }

  // Skip other validations if not required and empty
  if (!answer) return errors;

  // String length validations
  if (typeof answer === 'string') {
    if (validation.minLength && answer.length < validation.minLength) {
      errors.push(`Minimum length is ${validation.minLength} characters`);
    }

    if (validation.maxLength && answer.length > validation.maxLength) {
      errors.push(`Maximum length is ${validation.maxLength} characters`);
    }
  }

  // Number validations
  if (typeof answer === 'number') {
    if (validation.min !== undefined && answer < validation.min) {
      errors.push(`Minimum value is ${validation.min}`);
    }

    if (validation.max !== undefined && answer > validation.max) {
      errors.push(`Maximum value is ${validation.max}`);
    }
  }

  // Array validations (for multiple choice or file uploads)
  if (Array.isArray(answer)) {
    if (validation.minItems && answer.length < validation.minItems) {
      errors.push(`Select at least ${validation.minItems} items`);
    }

    if (validation.maxItems && answer.length > validation.maxItems) {
      errors.push(`Select at most ${validation.maxItems} items`);
    }

    if (validation.maxFiles && answer.length > validation.maxFiles) {
      errors.push(`Maximum ${validation.maxFiles} files allowed`);
    }
  }

  return errors;
};

// Build journey path (list of nodes traversed)
export const buildJourneyPath = (journeyData, nodes) => {
  const path = [];
  const startNodeId = nodes.startNode;
  let currentNodeId = startNodeId;

  while (currentNodeId && nodes.nodes[currentNodeId]) {
    const node = nodes.nodes[currentNodeId];
    path.push(node);

    if (node.type === 'end') break;

    // Find answer for this node in journey data
    const answer = journeyData[node.id];

    if (!answer) break;

    // Get next node
    const nextNode = getNextNode(node, answer, {}, nodes.nodes);
    currentNodeId = nextNode ? nextNode.id : null;
  }

  return path;
};
