import React, { useState, useEffect } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { AccessTime, Warning, Error as ErrorIcon, CheckCircle } from '@mui/icons-material';
import { calculateSLAStatus, formatTimeRemaining } from '../../utils/slaCalculator';

const SLATimer = ({ deadline, metAt, label = 'SLA', variant = 'outlined' }) => {
  const [slaStatus, setSlaStatus] = useState(calculateSLAStatus(deadline, metAt));

  useEffect(() => {
    // Update every minute if not met
    if (!metAt) {
      const interval = setInterval(() => {
        setSlaStatus(calculateSLAStatus(deadline, metAt));
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [deadline, metAt]);

  const getIcon = () => {
    switch (slaStatus.status) {
      case 'met':
        return <CheckCircle />;
      case 'breached':
        return <ErrorIcon />;
      case 'critical':
        return <Warning />;
      case 'warning':
        return <AccessTime />;
      default:
        return <AccessTime />;
    }
  };

  const getLabel = () => {
    if (slaStatus.status === 'met') {
      return `${label}: Met`;
    }

    if (slaStatus.overdue) {
      return `${label}: Overdue by ${formatTimeRemaining(slaStatus.timeRemaining)}`;
    }

    return `${label}: ${formatTimeRemaining(slaStatus.timeRemaining)}`;
  };

  const getTooltip = () => {
    const deadlineDate = new Date(deadline).toLocaleString();

    if (slaStatus.status === 'met') {
      return `Met at ${new Date(metAt).toLocaleString()}`;
    }

    if (slaStatus.overdue) {
      return `Deadline was ${deadlineDate}`;
    }

    return `Deadline: ${deadlineDate}`;
  };

  return (
    <Tooltip title={getTooltip()}>
      <Chip
        icon={getIcon()}
        label={getLabel()}
        color={slaStatus.color}
        variant={variant}
        size="small"
      />
    </Tooltip>
  );
};

export default SLATimer;
