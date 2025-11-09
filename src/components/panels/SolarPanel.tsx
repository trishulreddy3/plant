import React, { memo } from 'react';
import './SolarPanel.css';

interface SolarPanelProps {
  panel: {
    id: string;
    isFaulty: boolean;
    healthPercentage: number;
    isFaultPanel: boolean;
    isAffectedBySeriesBreak: boolean;
    needsCleaning: boolean;
    isAffectedByCleaning: boolean;
    wasFaultPanel: boolean;
    wasCleaningPanel: boolean;
    isBeingRepaired: boolean;
    repairProgress: number;
    repairStage: string;
  };
  userRole: string;
  seriesNumber?: number;
  onPanelClick?: () => void;
  canEdit?: boolean;
}

const SolarPanel = memo<SolarPanelProps>(({ panel, userRole, seriesNumber, onPanelClick, canEdit }) => {
  const { 
    id, 
    isFaulty, 
    healthPercentage, 
    isFaultPanel, 
    isAffectedBySeriesBreak, 
    needsCleaning, 
    isAffectedByCleaning, 
    wasFaultPanel, 
    wasCleaningPanel, 
    isBeingRepaired, 
    repairProgress, 
    repairStage 
  } = panel;

  const getPanelImage = () => {
    // Priority: Health first (so 100% shows image1), then repairing/moderate, then fault
    if (healthPercentage >= 90) return '/images/panels/image1.png';
    if (isBeingRepaired) return '/images/panels/image2.png';
    if (healthPercentage >= 60) return '/images/panels/image2.png';
    return '/images/panels/image3.png';
  };

  const getFallbackColor = () => {
    // Mirror the same priority as images
    if (healthPercentage >= 90) return '#27ae60';
    if (isBeingRepaired) return '#f39c12';
    if (healthPercentage >= 60) return '#f39c12';
    return '#e74c3c';
  };

  // Different styling for fault panel vs cleaning panel vs series break affected panels
  const getPanelStyle = () => {
    const baseStyle = {
      backgroundImage: `url(${getPanelImage()})`,
      backgroundColor: getFallbackColor(), // Fallback color if image fails to load
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      border: 'none'
    };

    if (isBeingRepaired && (wasFaultPanel || wasCleaningPanel)) {
      // Only culprit panels (P15 and P12) glow during repair
      let glowColor;
      if (repairStage === 'red_stage') {
        glowColor = 'rgba(231, 76, 60, 1)'; // Red glow
      } else if (repairStage === 'orange_stage') {
        glowColor = 'rgba(243, 156, 18, 1)'; // Orange glow
      } else if (repairStage === 'orange_to_blue') {
        glowColor = 'rgba(243, 156, 18, 1)'; // Orange glow
      } else if (repairStage === 'blue_stage') {
        glowColor = 'rgba(39, 174, 96, 1)'; // Green glow
      }
      
      return {
        ...baseStyle,
        transform: 'scale(1.1)',
        zIndex: 10,
        boxShadow: `0 0 10px ${glowColor}`,
        animation: 'faultPanelPulse 1.5s infinite'
      };
    } else if (isFaultPanel) {
      // Electrical fault panel glows and blinks
      return {
        ...baseStyle,
        transform: 'scale(1.3)',
        zIndex: 20,
        boxShadow: '0 0 15px rgba(231, 76, 60, 1)',
        animation: 'faultPanelPulse 1s infinite'
      };
    } else if (needsCleaning) {
      // Cleaning panel (causes series break) also glows and blinks
      return {
        ...baseStyle,
        transform: 'scale(1.2)',
        zIndex: 15,
        boxShadow: '0 0 12px rgba(243, 156, 18, 1)',
        animation: 'faultPanelPulse 1.2s infinite'
      };
    } else {
      // All other panels - just change image, no special effects
      return {
        ...baseStyle,
        transform: 'scale(1)',
        zIndex: 1,
        boxShadow: 'none',
        animation: 'none'
      };
    }
  };

  const panelStyle = getPanelStyle();

  const displayTitle = seriesNumber ? `P${seriesNumber} - ${healthPercentage}% Health` : `${id} - ${healthPercentage}% Health`;
  const clickHandler = canEdit && onPanelClick ? onPanelClick : undefined;

  return (
    <div 
      className={`panel ${canEdit ? 'editable' : ''}`}
      style={panelStyle}
      title={displayTitle}
      onClick={clickHandler}
    >
    </div>
  );
});

SolarPanel.displayName = 'SolarPanel';

export default SolarPanel;
