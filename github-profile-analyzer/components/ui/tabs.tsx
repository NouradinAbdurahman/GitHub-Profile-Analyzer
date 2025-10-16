import React from 'react';

export const Tabs = ({ children, defaultValue }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  const handleTabClick = (value) => {
    setActiveTab(value);
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsList) {
          return React.cloneElement(child, { activeTab, onTabClick: handleTabClick });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ children, activeTab, onTabClick }) => {
  return (
    <div className="tabs-list">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          return React.cloneElement(child, { isActive: child.props.value === activeTab, onClick: onTabClick });
        }
        return child;
      })}
    </div>
  );
};

export const TabsTrigger = ({ value, isActive, onClick, children }) => {
  return (
    <button
      className={`tab-trigger ${isActive ? 'active' : ''}`}
      onClick={() => onClick(value)}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children }) => {
  return (
    <div className="tabs-content">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.props.value === value) {
          return child;
        }
        return null;
      })}
    </div>
  );
};