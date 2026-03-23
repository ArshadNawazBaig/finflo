import { useState, useEffect } from 'react';

const usePermissions = () => {
  const [permissions, setPermissions] = useState(() => {
    const user = (JSON.parse(localStorage.getItem('user') || '{}') || {});
    return user.permissions || [];
  });

  useEffect(() => {
    const handleUserUpdate = () => {
      const user = (JSON.parse(localStorage.getItem('user') || '{}') || {});
      setPermissions(user.permissions || []);
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  const hasPermission = (permission) => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };

  const hasAllPermissions = (requiredPermissions = []) => {
    if (permissions.includes('*')) return true;
    return requiredPermissions.every((perm) => permissions.includes(perm));
  };

  const hasAnyPermission = (requiredPermissions = []) => {
    if (permissions.includes('*')) return true;
    return requiredPermissions.some((perm) => permissions.includes(perm));
  };

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
  };
};

export default usePermissions;
