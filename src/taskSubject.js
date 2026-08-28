export function resolveTaskSubject(selectedSubject, customSubject = '') {
  return selectedSubject === 'Lainnya' ? customSubject.trim() : selectedSubject
}
