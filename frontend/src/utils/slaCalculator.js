// Calculate SLA status and time remaining
export const calculateSLAStatus = (deadline, metAt = null) => {
  if (metAt) {
    return {
      status: 'met',
      color: 'success',
      timeRemaining: 0,
      percentage: 100
    };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const timeRemaining = Math.floor((deadlineDate - now) / 1000); // in seconds

  if (timeRemaining < 0) {
    return {
      status: 'breached',
      color: 'error',
      timeRemaining: Math.abs(timeRemaining),
      percentage: 0,
      overdue: true
    };
  }

  // Calculate percentage remaining (assuming 24 hours total)
  const totalTime = 24 * 60 * 60; // 24 hours in seconds
  const percentage = (timeRemaining / totalTime) * 100;

  let status = 'ok';
  let color = 'success';

  if (percentage < 20) {
    status = 'critical';
    color = 'error';
  } else if (percentage < 50) {
    status = 'warning';
    color = 'warning';
  }

  return {
    status,
    color,
    timeRemaining,
    percentage
  };
};

// Format time remaining in human-readable format
export const formatTimeRemaining = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
};

// Format resolution time
export const formatResolutionTime = (seconds) => {
  if (!seconds) return 'N/A';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return `${days}d ${remainingHours}h`;
};
