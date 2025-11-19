import React from 'react';
import './SkeletonCard.css';

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-info">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line text"></div>
      </div>
    </div>
  );
}

export default SkeletonCard;