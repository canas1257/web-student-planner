export function resolveScheduleSubject(selectedSubject, customSubject = '') {
  return selectedSubject === 'Lainnya' ? customSubject.trim() : selectedSubject
}
