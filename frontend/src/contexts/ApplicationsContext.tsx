import {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';
import {
  useApplications,
  type UseApplicationsResult,
} from '../hooks/useApplications';

const ApplicationsContext = createContext<UseApplicationsResult | null>(null);

export function ApplicationsProvider({ children }: PropsWithChildren) {
  const applications = useApplications();

  return (
    <ApplicationsContext.Provider value={applications}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplicationsContext(): UseApplicationsResult {
  const context = useContext(ApplicationsContext);

  if (!context) {
    throw new Error(
      'useApplicationsContext must be used within an ApplicationsProvider.',
    );
  }

  return context;
}
