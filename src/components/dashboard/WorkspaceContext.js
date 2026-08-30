"use client";

import { createContext, useContext } from "react";

const DashboardWorkspaceContext = createContext(null);

export function DashboardWorkspaceProvider({ children, workspace }) {
  return (
    <DashboardWorkspaceContext.Provider value={workspace || null}>
      {children}
    </DashboardWorkspaceContext.Provider>
  );
}

export function useDashboardWorkspace() {
  return useContext(DashboardWorkspaceContext);
}
