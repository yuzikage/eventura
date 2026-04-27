import { createContext, useContext, useState } from "react";

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [selections, setSelections] = useState({
    eventType:        null,
    venue:            null,
    theme:            null,
    guestCount:       50,
    package:          null,
    photography:      null,
    catering:         null,
    eventDate:        null,
    meetingDate:      null,
    meetingTime:      null,
    meetingNotes:     "",
    confirmedBooking: null,
  });

  const update = (key, value) =>
    setSelections((prev) => ({ ...prev, [key]: value }));

  // Set multiple keys at once — used when applying an AI recommendation
  // so all selections update in a single render rather than triggering
  // multiple re-renders.
  const bulkUpdate = (updates) =>
    setSelections((prev) => ({ ...prev, ...updates }));

  const setMeeting = ({ eventDate, date, time, notes }) =>
    setSelections((prev) => ({
      ...prev,
      eventDate:    eventDate,
      meetingDate:  date,
      meetingTime:  time,
      meetingNotes: notes,
    }));

  return (
    <WizardContext.Provider value={{ selections, update, bulkUpdate, setMeeting }}>
      {children}
    </WizardContext.Provider>
  );
}

export const useWizard = () => useContext(WizardContext);
